import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";
import {
  getUserWords,
  createWord,
  updateWord,
  batchUpdateStatus,
} from "../services/word.service.js";

const router = Router();
router.use(requireAuth);

// GET /api/words?languageId=X
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languageId = Number(req.query.languageId);
    if (!languageId) {
      res.status(400).json({ error: { message: "languageId is required" } });
      return;
    }

    const words = await getUserWords(req.user.id, languageId);
    res.json({ data: words });
  } catch (err) {
    next(err);
  }
});

// POST /api/words
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { languageId, term, translation, status, notes } = req.body;

    if (!languageId || !term?.trim()) {
      res
        .status(400)
        .json({ error: { message: "languageId and term are required" } });
      return;
    }

    const word = await createWord({
      userId: req.user.id,
      languageId: Number(languageId),
      term: term.trim().toLowerCase(),
      translation,
      status: status !== undefined ? Number(status) : undefined,
      notes,
    });

    res.status(201).json({ data: word });
  } catch (err) {
    next(err);
  }
});

// PUT /api/words/:id
router.put(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;

      // Verify ownership
      const existing = await prisma.word.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existing) {
        res.status(404).json({ error: { message: "Word not found" } });
        return;
      }
      if (existing.userId !== req.user.id) {
        res.status(403).json({ error: { message: "Forbidden" } });
        return;
      }

      const { translation, status, notes } = req.body;
      const word = await updateWord(id, {
        translation,
        status: status !== undefined ? Number(status) : undefined,
        notes,
      });

      res.json({ data: word });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/words/batch-status
router.patch(
  "/batch-status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { wordIds, status } = req.body;

      if (!Array.isArray(wordIds) || wordIds.length === 0) {
        res
          .status(400)
          .json({ error: { message: "wordIds array is required" } });
        return;
      }
      if (status === undefined) {
        res.status(400).json({ error: { message: "status is required" } });
        return;
      }

      const result = await batchUpdateStatus(
        req.user.id,
        wordIds,
        Number(status),
      );
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/words/batch
router.delete(
  "/batch",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { wordIds } = req.body;

      if (!Array.isArray(wordIds) || wordIds.length === 0) {
        res
          .status(400)
          .json({ error: { message: "wordIds array is required" } });
        return;
      }

      await prisma.word.deleteMany({
        where: { id: { in: wordIds }, userId: req.user.id },
      });

      res.json({ data: { deleted: wordIds.length } });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/words/:id
router.delete(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;

      const existing = await prisma.word.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!existing) {
        res.status(404).json({ error: { message: "Word not found" } });
        return;
      }
      if (existing.userId !== req.user.id) {
        res.status(403).json({ error: { message: "Forbidden" } });
        return;
      }

      await prisma.word.delete({ where: { id } });
      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
