import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";

const router = Router();
router.use(requireAuth);

// GET /api/vocabulary?languageId&status&search&sortBy&sortDir&page&limit
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;
    const status = req.query.status !== undefined && req.query.status !== "" ? Number(req.query.status) : undefined;
    const search = (req.query.search as string) || undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = (req.query.sortDir as string) === "asc" ? "asc" as const : "desc" as const;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { userId: req.user.id };
    if (languageId) where.languageId = languageId;
    if (status !== undefined) where.status = status;
    if (search) {
      where.OR = [
        { term: { contains: search, mode: "insensitive" } },
        { translation: { contains: search, mode: "insensitive" } },
      ];
    }

    const allowedSortFields = ["term", "status", "createdAt", "updatedAt"];
    const orderBy = allowedSortFields.includes(sortBy)
      ? { [sortBy]: sortDir }
      : { createdAt: sortDir };

    const [words, total] = await Promise.all([
      prisma.word.findMany({
        where,
        include: { language: { select: { code: true, name: true } }, review: true },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.word.count({ where }),
    ]);

    res.json({
      data: {
        words,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/vocabulary/stats?languageId
router.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const languageId = req.query.languageId ? Number(req.query.languageId) : undefined;

    const where: any = { userId: req.user.id };
    if (languageId) where.languageId = languageId;

    const [total, newCount, learningCount, knownCount, ignoredCount, dueReviews] =
      await Promise.all([
        prisma.word.count({ where }),
        prisma.word.count({ where: { ...where, status: 0 } }),
        prisma.word.count({ where: { ...where, status: { in: [1, 2, 3, 4] } } }),
        prisma.word.count({ where: { ...where, status: 5 } }),
        prisma.word.count({ where: { ...where, status: 6 } }),
        prisma.wordReview.count({
          where: {
            word: { ...where },
            due: { lte: new Date() },
          },
        }),
      ]);

    res.json({
      data: {
        total,
        new: newCount,
        learning: learningCount,
        known: knownCount,
        ignored: ignoredCount,
        dueReviews,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
