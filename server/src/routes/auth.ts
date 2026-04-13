import { Router, Request, Response } from "express";
import { prisma } from "../index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/login — upsert user by username
router.post("/login", async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    res
      .status(400)
      .json({ error: { message: "Username is required" } });
    return;
  }

  const trimmed = username.trim().toLowerCase();

  if (trimmed.length < 2 || trimmed.length > 30) {
    res
      .status(400)
      .json({ error: { message: "Username must be 2-30 characters" } });
    return;
  }

  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    res.status(400).json({
      error: {
        message: "Username can only contain letters, numbers, hyphens, and underscores",
      },
    });
    return;
  }

  try {
    const user = await prisma.user.upsert({
      where: { username: trimmed },
      update: {},
      create: { username: trimmed },
    });

    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ error: { message: "Failed to login" } });
  }
});

// GET /api/auth/me — return current user from header
router.get("/me", requireAuth, (req: Request, res: Response) => {
  res.json({ data: req.user });
});

// GET /api/auth/users — list all usernames for the picker
router.get("/users", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ error: { message: "Failed to fetch users" } });
  }
});

export default router;
