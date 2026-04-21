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
import { decrypt } from "../services/encryption.js";
import { getProvider } from "../services/translation/factory.js";

const router = Router();
router.use(requireAuth);

// GET /api/reviews/due?languageId&wordStatus&limit=20
router.get("/due", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
    const wordStatus = req.query.wordStatus !== undefined && req.query.wordStatus !== "" ? Number(req.query.wordStatus) : undefined;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const where: any = {
      word: { userId: req.user.id },
      due: { lte: new Date() },
    };
    if (languageId) where.word.languageId = languageId;
    if (wordStatus !== undefined) where.word.status = wordStatus;

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
            contextSentenceTranslation: true,
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
    const wordStatus = req.query.wordStatus !== undefined && req.query.wordStatus !== "" ? Number(req.query.wordStatus) : undefined;

    const where: any = {
      word: { userId: req.user.id },
      due: { lte: new Date() },
    };
    if (languageId) where.word.languageId = languageId;
    if (wordStatus !== undefined) where.word.status = wordStatus;

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

// POST /api/reviews/:wordId/translate-context — translate word.contextSentence into user's native language, persist, and return it
router.post(
  "/:wordId/translate-context",
  async (req: Request<{ wordId: string }>, res: Response, next: NextFunction) => {
    try {
      const { wordId } = req.params;

      const word = await prisma.word.findUnique({
        where: { id: wordId },
        include: { language: { select: { code: true } } },
      });

      if (!word) {
        res.status(404).json({ error: { message: "Word not found" } });
        return;
      }
      if (word.userId !== req.user.id) {
        res.status(403).json({ error: { message: "Forbidden" } });
        return;
      }
      if (!word.contextSentence) {
        res.status(400).json({ error: { message: "Word has no context sentence" } });
        return;
      }

      if (word.contextSentenceTranslation) {
        res.json({ data: { translation: word.contextSentenceTranslation } });
        return;
      }

      if (!req.user.nativeLanguageId) {
        res.status(400).json({
          error: { message: "Native language not set. Configure it in Settings." },
        });
        return;
      }

      const nativeLang = await prisma.language.findUnique({
        where: { id: req.user.nativeLanguageId },
        select: { code: true },
      });
      if (!nativeLang) {
        res.status(400).json({ error: { message: "Native language not found" } });
        return;
      }

      const key = await prisma.apiKey.findFirst({ where: { userId: req.user.id } });
      if (!key) {
        res.status(400).json({
          error: { message: "No translation API key configured. Add one in Settings." },
        });
        return;
      }

      const provider = getProvider(key.provider, decrypt(key.apiKeyEncrypted));
      const result = await provider.translateSentence(
        word.contextSentence,
        word.language.code,
        nativeLang.code,
      );

      const updated = await prisma.word.update({
        where: { id: wordId },
        data: { contextSentenceTranslation: result.translation },
        select: { contextSentenceTranslation: true },
      });

      res.json({ data: { translation: updated.contextSentenceTranslation } });
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        res.status(400).json({
          error: { message: "Translation API key is invalid or expired. Update it in Settings." },
        });
        return;
      }
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
