import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";
import { assertOwnership, NotFoundError, ForbiddenError } from "../services/authorization.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_BASE = path.join(__dirname, "../../../uploads/audio");

const router = Router();

// Ensure uploads directory exists
fs.mkdirSync(UPLOADS_BASE, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.user?.id ?? "unknown";
    const lessonId = req.params.id as string;
    const dir = path.join(UPLOADS_BASE, userId, lessonId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `audio${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".mp3", ".wav", ".ogg", ".m4a"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${ext}. Allowed: ${allowed.join(", ")}`));
    }
  },
});

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

// POST /api/lessons/:id/audio — upload audio
router.post(
  "/lessons/:id/audio",
  requireAuth,
  (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    // Need to verify ownership before multer writes the file
    assertOwnership(req.user.id, "lesson", req.params.id)
      .then(() => {
        upload.single("audio")(req, res, async (err) => {
          if (err) {
            if (err instanceof multer.MulterError) {
              res.status(400).json({ error: { message: err.message } });
              return;
            }
            res.status(400).json({ error: { message: err.message } });
            return;
          }

          if (!req.file) {
            res.status(400).json({ error: { message: "No audio file uploaded" } });
            return;
          }

          try {
            // Build the relative URL for streaming
            const audioUrl = `/api/audio/${req.user.id}/${req.params.id}/${req.file.filename}`;

            await prisma.lesson.update({
              where: { id: req.params.id },
              data: { audioUrl },
            });

            res.json({ data: { audioUrl } });
          } catch (err) {
            next(err);
          }
        });
      })
      .catch((err) => handleServiceError(err, res, next));
  },
);

// DELETE /api/lessons/:id/audio — delete audio
router.delete(
  "/lessons/:id/audio",
  requireAuth,
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await assertOwnership(req.user.id, "lesson", req.params.id);

      const lesson = await prisma.lesson.findUnique({
        where: { id: req.params.id },
        select: { audioUrl: true },
      });

      if (!lesson?.audioUrl) {
        res.status(404).json({ error: { message: "No audio to delete" } });
        return;
      }

      // Delete the file from disk
      const audioDir = path.join(UPLOADS_BASE, req.user.id, req.params.id);
      if (fs.existsSync(audioDir)) {
        fs.rmSync(audioDir, { recursive: true });
      }

      // Clear the URL in the database
      await prisma.lesson.update({
        where: { id: req.params.id },
        data: { audioUrl: null },
      });

      res.json({ data: { success: true } });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// GET /api/audio/:userId/:lessonId/:filename — stream audio
// No auth middleware: <audio> elements can't set custom headers.
// Security: paths are UUID-based and unpredictable; acceptable for self-hosted use.
router.get(
  "/audio/:userId/:lessonId/:filename",
  async (req: Request<{ userId: string; lessonId: string; filename: string }>, res: Response, next: NextFunction) => {
    try {
      const { userId, lessonId, filename } = req.params;

      const filePath = path.join(UPLOADS_BASE, userId, lessonId, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { message: "Audio file not found" } });
        return;
      }

      const stat = fs.statSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
      };
      const contentType = mimeTypes[ext] || "application/octet-stream";

      // Support range requests for seeking
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType,
        });

        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": stat.size,
          "Content-Type": contentType,
        });

        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

export default router;
