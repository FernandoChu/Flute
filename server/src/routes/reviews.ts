import { Router, Request, Response, NextFunction } from "express";
import type { Grade } from "ts-fsrs";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";
import {
  Rating,
  dbToCard,
  cardToDb,
  scheduleReview,
  previewRatings,
  formatInterval,
} from "../services/srs.service.js";

const router = Router();
router.use(requireAuth);

// GET /api/reviews/due?languageId&limit=20
router.get("/due", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where: any = {
      word: { userId: req.user.id },
      due: { lte: new Date() },
    };
    if (languageId) where.word.languageId = languageId;

    const reviews = await prisma.wordReview.findMany({
      where,
      include: {
        word: {
          select: {
            id: true,
            term: true,
            translation: true,
            status: true,
            notes: true,
            contextSentence: true,
            languageId: true,
            language: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { due: "asc" },
      take: limit,
    });

    res.json({ data: reviews });
  } catch (err) {
    next(err);
  }
});

// GET /api/reviews/due/count
router.get("/due/count", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;

    const where: any = {
      word: { userId: req.user.id },
      due: { lte: new Date() },
    };
    if (languageId) where.word.languageId = languageId;

    const count = await prisma.wordReview.count({ where });
    res.json({ data: { count } });
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews/:wordId — { rating: 1|2|3|4 }
router.post(
  "/:wordId",
  async (req: Request<{ wordId: string }>, res: Response, next: NextFunction) => {
    try {
      const { wordId } = req.params;
      const { rating } = req.body;

      if (!rating || ![1, 2, 3, 4].includes(Number(rating))) {
        res.status(400).json({
          error: { message: "rating is required (1=Again, 2=Hard, 3=Good, 4=Easy)" },
        });
        return;
      }

      // Verify ownership
      const review = await prisma.wordReview.findUnique({
        where: { wordId },
        include: { word: { select: { userId: true } } },
      });

      if (!review) {
        res.status(404).json({ error: { message: "Review not found" } });
        return;
      }
      if (review.word.userId !== req.user.id) {
        res.status(403).json({ error: { message: "Forbidden" } });
        return;
      }

      const card = dbToCard(review);
      const result = scheduleReview(card, Number(rating) as Grade);
      const dbData = cardToDb(result.card);

      const updated = await prisma.wordReview.update({
        where: { wordId },
        data: dbData,
        include: {
          word: {
            select: {
              id: true,
              term: true,
              translation: true,
              status: true,
            },
          },
        },
      });

      res.json({
        data: {
          review: updated,
          nextDue: result.card.due,
          interval: formatInterval(result.card.due),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reviews/preview/:wordId
router.get(
  "/preview/:wordId",
  async (req: Request<{ wordId: string }>, res: Response, next: NextFunction) => {
    try {
      const { wordId } = req.params;

      const review = await prisma.wordReview.findUnique({
        where: { wordId },
        include: { word: { select: { userId: true } } },
      });

      if (!review) {
        res.status(404).json({ error: { message: "Review not found" } });
        return;
      }
      if (review.word.userId !== req.user.id) {
        res.status(403).json({ error: { message: "Forbidden" } });
        return;
      }

      const card = dbToCard(review);
      const results = previewRatings(card);

      const preview = {
        [Rating.Again]: formatInterval(results[Rating.Again].card.due),
        [Rating.Hard]: formatInterval(results[Rating.Hard].card.due),
        [Rating.Good]: formatInterval(results[Rating.Good].card.due),
        [Rating.Easy]: formatInterval(results[Rating.Easy].card.due),
      };

      res.json({ data: preview });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reviews/distractors?wordId&count=3
router.get(
  "/distractors",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wordId = req.query.wordId as string;
      const count = Math.min(10, Math.max(1, Number(req.query.count) || 3));

      if (!wordId) {
        res.status(400).json({ error: { message: "wordId is required" } });
        return;
      }

      const word = await prisma.word.findUnique({
        where: { id: wordId },
        select: { userId: true, languageId: true, translation: true },
      });

      if (!word || word.userId !== req.user.id) {
        res.status(404).json({ error: { message: "Word not found" } });
        return;
      }

      // Get random translations from the same language, excluding the correct one
      const distractors = await prisma.word.findMany({
        where: {
          userId: req.user.id,
          languageId: word.languageId,
          id: { not: wordId },
          translation: { not: null },
        },
        select: { id: true, translation: true },
        take: count * 3, // Fetch extra to allow shuffling
      });

      // Shuffle and take `count`
      const shuffled = distractors.sort(() => Math.random() - 0.5).slice(0, count);

      res.json({ data: shuffled });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
