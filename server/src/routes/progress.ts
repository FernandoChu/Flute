import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../index.js";
import { requireAuth } from "../middleware/auth.js";
import {
  assertOwnership,
  NotFoundError,
  ForbiddenError,
} from "../services/authorization.js";

const router = Router();
router.use(requireAuth);

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof NotFoundError || err instanceof ForbiddenError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  next(err);
}

// PUT /api/lessons/:id/progress — upsert reading progress for current user
router.put(
  "/lessons/:id/progress",
  async (
    req: Request<{ id: string }, unknown, { currentPage?: number }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const lessonId = req.params.id;
      await assertOwnership(req.user.id, "lesson", lessonId);

      const raw = req.body?.currentPage;
      const currentPage =
        typeof raw === "number" && Number.isFinite(raw) && raw >= 0
          ? Math.floor(raw)
          : 0;

      const progress = await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: { userId: req.user.id, lessonId },
        },
        update: { currentPage },
        create: { userId: req.user.id, lessonId, currentPage },
      });

      res.json({ data: progress });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// GET /api/lessons/:id/progress — current user's progress for a lesson
router.get(
  "/lessons/:id/progress",
  async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const lessonId = req.params.id;
      await assertOwnership(req.user.id, "lesson", lessonId);

      const progress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: { userId: req.user.id, lessonId },
        },
      });

      res.json({ data: progress });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// GET /api/progress/recent — most recently opened lesson with collection
router.get(
  "/progress/recent",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recent = await prisma.lessonProgress.findFirst({
        where: { userId: req.user.id },
        orderBy: { openedAt: "desc" },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              position: true,
              audioUrl: true,
              textContent: true,
              collection: {
                select: {
                  id: true,
                  title: true,
                  sourceLanguage: {
                    select: { id: true, code: true, name: true },
                  },
                  targetLanguage: {
                    select: { id: true, code: true, name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!recent) {
        res.json({ data: null });
        return;
      }

      // Build a short preview from the lesson text (collapsed whitespace)
      const PREVIEW_LIMIT = 180;
      const collapsed = recent.lesson.textContent.replace(/\s+/g, " ").trim();
      const preview =
        collapsed.length > PREVIEW_LIMIT
          ? collapsed.slice(0, PREVIEW_LIMIT).trimEnd() + "…"
          : collapsed;

      res.json({
        data: {
          currentPage: recent.currentPage,
          openedAt: recent.openedAt,
          lesson: {
            id: recent.lesson.id,
            title: recent.lesson.title,
            position: recent.lesson.position,
            audioUrl: recent.lesson.audioUrl,
            preview,
            collection: recent.lesson.collection,
          },
        },
      });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

export default router;
