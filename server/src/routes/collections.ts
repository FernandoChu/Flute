import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../index.js";
import { requireAuth } from "../middleware/auth.js";
import { assertOwnership, NotFoundError, ForbiddenError } from "../services/authorization.js";

const router = Router();
router.use(requireAuth);

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

// GET /api/collections
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await prisma.collection.findMany({
      where: { userId: req.user.id },
      include: {
        sourceLanguage: true,
        targetLanguage: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ data: collections });
  } catch (err) {
    next(err);
  }
});

// POST /api/collections
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const { title, sourceLanguageId, targetLanguageId } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: { message: "Title is required" } });
    return;
  }
  if (!sourceLanguageId || !targetLanguageId) {
    res.status(400).json({ error: { message: "Source and target languages are required" } });
    return;
  }

  try {
    const collection = await prisma.collection.create({
      data: {
        userId: req.user.id,
        title: title.trim(),
        sourceLanguageId: Number(sourceLanguageId),
        targetLanguageId: Number(targetLanguageId),
      },
      include: {
        sourceLanguage: true,
        targetLanguage: true,
        _count: { select: { lessons: true } },
      },
    });
    res.status(201).json({ data: collection });
  } catch (err) {
    next(err);
  }
});

// PUT /api/collections/:id
router.put("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    await assertOwnership(req.user.id, "collection", id);

    const { title, sourceLanguageId, targetLanguageId } = req.body;
    const collection = await prisma.collection.update({
      where: { id },
      data: {
        ...(title?.trim() && { title: title.trim() }),
        ...(sourceLanguageId && { sourceLanguageId: Number(sourceLanguageId) }),
        ...(targetLanguageId && { targetLanguageId: Number(targetLanguageId) }),
      },
      include: {
        sourceLanguage: true,
        targetLanguage: true,
        _count: { select: { lessons: true } },
      },
    });
    res.json({ data: collection });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// DELETE /api/collections/:id
router.delete("/:id", async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    await assertOwnership(req.user.id, "collection", id);
    await prisma.collection.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

export default router;
