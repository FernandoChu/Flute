import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { prisma } from "../index.js";
import { requireAuth } from "../middleware/auth.js";
import { assertOwnership, NotFoundError, ForbiddenError } from "../services/authorization.js";
import { parseFile } from "../services/file-parser.js";
import { tokenize, normalizeWord } from "shared";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".txt", ".epub", ".srt"];
    const ext = "." + file.originalname.toLowerCase().split(".").pop();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof NotFoundError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  if (err instanceof ForbiddenError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  next(err);
}

// GET /api/collections/:collectionId/lessons
router.get(
  "/collections/:collectionId/lessons",
  async (req: Request<{ collectionId: string }>, res: Response, next: NextFunction) => {
    try {
      const collectionId = req.params.collectionId;
      await assertOwnership(req.user.id, "collection", collectionId);

      const collection = await prisma.collection.findUniqueOrThrow({
        where: { id: collectionId },
        select: { sourceLanguageId: true },
      });

      const lessons = await prisma.lesson.findMany({
        where: { collectionId },
        select: {
          id: true,
          title: true,
          position: true,
          audioUrl: true,
          textContent: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { position: "asc" },
      });

      // Collect all unique normalized terms across all lessons
      const allTerms = new Set<string>();
      const lessonTerms = lessons.map((lesson) => {
        const tokens = tokenize(lesson.textContent);
        const terms = new Set<string>();
        for (const t of tokens) {
          if (t.isWord) {
            const norm = normalizeWord(t.text);
            terms.add(norm);
            allTerms.add(norm);
          }
        }
        return terms;
      });

      // Batch-fetch all word statuses for these terms
      const wordStatusMap = new Map<string, number>();
      if (allTerms.size > 0) {
        const words = await prisma.word.findMany({
          where: {
            userId: req.user.id,
            languageId: collection.sourceLanguageId,
            term: { in: [...allTerms] },
          },
          select: { term: true, status: true },
        });
        for (const w of words) {
          wordStatusMap.set(w.term, w.status);
        }
      }

      // Build response with status counts (excluding textContent)
      const data = lessons.map((lesson, i) => {
        const terms = lessonTerms[i];
        const statusCounts: Record<number, number> = {
          0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
        };
        for (const term of terms) {
          const status = wordStatusMap.get(term) ?? 0; // unknown = New
          statusCounts[status]++;
        }
        const { textContent: _, ...rest } = lesson;
        return { ...rest, statusCounts };
      });

      res.json({ data });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// POST /api/collections/:collectionId/lessons
router.post(
  "/collections/:collectionId/lessons",
  async (req: Request<{ collectionId: string }>, res: Response, next: NextFunction) => {
    try {
      const collectionId = req.params.collectionId;
      await assertOwnership(req.user.id, "collection", collectionId);

      const { title, textContent } = req.body;

      if (!title?.trim()) {
        res.status(400).json({ error: { message: "Title is required" } });
        return;
      }
      if (!textContent?.trim()) {
        res.status(400).json({ error: { message: "Text content is required" } });
        return;
      }

      const maxPos = await prisma.lesson.aggregate({
        where: { collectionId },
        _max: { position: true },
      });

      const lesson = await prisma.lesson.create({
        data: {
          collectionId,
          title: title.trim(),
          textContent: textContent.trim(),
          position: (maxPos._max?.position ?? -1) + 1,
        },
      });
      res.status(201).json({ data: lesson });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// POST /api/collections/:collectionId/lessons/upload
router.post(
  "/collections/:collectionId/lessons/upload",
  upload.single("file"),
  async (req: Request<{ collectionId: string }>, res: Response, next: NextFunction) => {
    try {
      const collectionId = req.params.collectionId;
      await assertOwnership(req.user.id, "collection", collectionId);

      if (!req.file) {
        res.status(400).json({ error: { message: "No file uploaded" } });
        return;
      }

      const parsed = await parseFile(req.file.buffer, req.file.originalname);

      const maxPos = await prisma.lesson.aggregate({
        where: { collectionId },
        _max: { position: true },
      });
      let position = (maxPos._max?.position ?? -1) + 1;

      const lessons = await prisma.$transaction(
        parsed.map((p) =>
          prisma.lesson.create({
            data: {
              collectionId,
              title: p.title,
              textContent: p.textContent,
              position: position++,
            },
          }),
        ),
      );

      res.status(201).json({ data: lessons });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// GET /api/lessons/:id
router.get(
  "/lessons/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      await assertOwnership(req.user.id, "lesson", id);

      const lesson = await prisma.lesson.findUnique({
        where: { id },
        include: {
          collection: {
            select: {
              id: true,
              title: true,
              sourceLanguageId: true,
              targetLanguageId: true,
              sourceLanguage: { select: { code: true } },
              targetLanguage: { select: { code: true } },
              lessons: {
                select: { id: true, title: true, position: true },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });
      res.json({ data: lesson });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// PUT /api/lessons/:id
router.put(
  "/lessons/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      await assertOwnership(req.user.id, "lesson", id);

      const { title, textContent, position } = req.body;
      const lesson = await prisma.lesson.update({
        where: { id },
        data: {
          ...(title?.trim() && { title: title.trim() }),
          ...(textContent?.trim() && { textContent: textContent.trim() }),
          ...(position !== undefined && { position: Number(position) }),
        },
      });
      res.json({ data: lesson });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// DELETE /api/lessons/:id
router.delete(
  "/lessons/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      await assertOwnership(req.user.id, "lesson", id);
      await prisma.lesson.delete({ where: { id } });
      res.json({ data: { success: true } });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

export default router;
