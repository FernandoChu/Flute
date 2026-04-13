import { Router, Request, Response } from "express";
import { prisma } from "../index.js";

const router = Router();

// GET /api/languages (public)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ data: languages });
  } catch (err) {
    res.status(500).json({ error: { message: "Failed to fetch languages" } });
  }
});

export default router;
