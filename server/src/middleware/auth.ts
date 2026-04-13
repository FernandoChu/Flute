import { Request, Response, NextFunction } from "express";
import { prisma } from "../index.js";

declare global {
  namespace Express {
    interface Request {
      user: { id: string; username: string };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const username = req.headers["x-username"] as string | undefined;

  if (!username) {
    res.status(401).json({ error: { message: "Missing x-username header" } });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      res.status(401).json({ error: { message: "User not found" } });
      return;
    }

    req.user = { id: user.id, username: user.username };
    next();
  } catch (err) {
    next(err);
  }
}
