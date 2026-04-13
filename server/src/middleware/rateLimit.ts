import { Request, Response, NextFunction } from "express";

const windowMs = 60_000; // 1 minute
const maxRequests = 60;

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 5 * 60_000);

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id ?? "anonymous";
  const now = Date.now();

  let entry = buckets.get(userId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(userId, entry);
  }

  entry.count++;

  if (entry.count > maxRequests) {
    res.status(429).json({
      error: { message: "Too many requests. Please try again later." },
    });
    return;
  }

  next();
}
