import { Router, Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";
import { decrypt } from "../services/encryption.js";
import { getTtsProvider } from "../services/tts/factory.js";
import { GoogleTtsProvider, GOOGLE_TTS_MODELS } from "../services/tts/google-tts.provider.js";
import { assertOwnership, NotFoundError, ForbiddenError } from "../services/authorization.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_BASE = path.join(__dirname, "../../../uploads/audio");

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
  if (typeof err === "object" && err !== null && "response" in err) {
    const axiosErr = err as any;
    if (axiosErr.response?.data?.error?.message) {
      res.status(axiosErr.response.status || 500).json({
        error: { message: axiosErr.response.data.error.message },
      });
      return;
    }
  }
  next(err);
}

/** Resolve the user's decrypted TTS API key, or send 400 and return null. */
async function resolveApiKey(userId: string, res: Response): Promise<string | null> {
  const keyRecord = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider: "google-tts" } },
  });
  if (!keyRecord) {
    res.status(400).json({
      error: { message: "No TTS API key configured. Add one in Settings." },
    });
    return null;
  }
  return decrypt(keyRecord.apiKeyEncrypted);
}

// GET /api/tts/models — list available TTS models
router.get(
  "/models",
  async (_req: Request, res: Response) => {
    res.json({ data: GOOGLE_TTS_MODELS });
  },
);

// GET /api/tts/voices?lang=xx — list available voices for a language
router.get(
  "/voices",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lang = req.query.lang as string;
      if (!lang) {
        res.status(400).json({ error: { message: "lang query parameter is required" } });
        return;
      }

      const apiKey = await resolveApiKey(req.user.id, res);
      if (!apiKey) return;

      const provider = new GoogleTtsProvider(apiKey);
      const voices = await provider.listVoices(lang);

      res.json({ data: voices });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// GET /api/tts/settings — get user's TTS preferences
router.get(
  "/settings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { ttsModel: true, ttsVoice: true },
      });
      res.json({ data: { ttsModel: user?.ttsModel ?? null, ttsVoice: user?.ttsVoice ?? null } });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/tts/settings — update user's TTS preferences
router.put(
  "/settings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ttsModel, ttsVoice } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ttsModel: ttsModel ?? null,
          ttsVoice: ttsVoice ?? null,
        },
      });
      res.json({ data: { ttsModel: user.ttsModel, ttsVoice: user.ttsVoice } });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/tts/generate/:lessonId — generate TTS audio for a lesson
router.post(
  "/generate/:lessonId",
  async (req: Request<{ lessonId: string }>, res: Response, next: NextFunction) => {
    try {
      await assertOwnership(req.user.id, "lesson", req.params.lessonId);

      const apiKey = await resolveApiKey(req.user.id, res);
      if (!apiKey) return;

      // Fetch lesson with language info
      const lesson = await prisma.lesson.findUnique({
        where: { id: req.params.lessonId },
        include: {
          collection: {
            include: { sourceLanguage: true },
          },
        },
      });

      if (!lesson) {
        res.status(404).json({ error: { message: "Lesson not found" } });
        return;
      }

      const languageCode = lesson.collection.sourceLanguage?.code;
      if (!languageCode) {
        res.status(400).json({
          error: { message: "Lesson's collection has no source language configured" },
        });
        return;
      }

      // Get user's TTS preferences
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { ttsVoice: true },
      });

      const provider = getTtsProvider("google-tts", apiKey);
      const result = await provider.synthesize(lesson.textContent, languageCode, {
        voice: user?.ttsVoice ?? undefined,
      });

      // Write audio to disk
      const dir = path.join(UPLOADS_BASE, req.user.id, lesson.id);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, "audio.mp3");
      fs.writeFileSync(filePath, result.audioContent);

      // Update lesson with audio URL
      const audioUrl = `/api/audio/${req.user.id}/${lesson.id}/audio.mp3`;
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { audioUrl },
      });

      res.json({ data: { audioUrl } });
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// POST /api/tts/speak — synthesize a short phrase and return audio (with disk cache)
router.post(
  "/speak",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, lang } = req.body as { text?: string; lang?: string };
      if (!text || !lang) {
        res.status(400).json({ error: { message: "text and lang are required" } });
        return;
      }

      const apiKey = await resolveApiKey(req.user.id, res);
      if (!apiKey) return;

      // Get user's TTS voice preference
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { ttsVoice: true },
      });
      const voice = user?.ttsVoice ?? undefined;

      // Build a cache key from text + lang + voice
      const { createHash } = await import("node:crypto");
      const hash = createHash("sha256")
        .update(`${lang}|${voice ?? ""}|${text}`)
        .digest("hex");

      const cacheDir = path.join(UPLOADS_BASE, req.user.id, "tts-cache");
      const cachePath = path.join(cacheDir, `${hash}.mp3`);

      // Serve from cache if available
      if (fs.existsSync(cachePath)) {
        res.setHeader("Content-Type", "audio/mpeg");
        fs.createReadStream(cachePath).pipe(res);
        return;
      }

      const provider = getTtsProvider("google-tts", apiKey);
      const result = await provider.synthesize(text, lang, { voice });

      // Write to cache
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cachePath, result.audioContent);

      res.setHeader("Content-Type", "audio/mpeg");
      res.send(result.audioContent);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

export default router;
