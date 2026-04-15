import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";
import { encrypt, decrypt } from "../services/encryption.js";
import { getProvider } from "../services/translation/factory.js";
import { getTtsProvider } from "../services/tts/factory.js";
import { TRANSLATION_PROVIDERS, TTS_PROVIDERS } from "shared";

const router = Router();
router.use(requireAuth);

// GET /api/settings/api-keys — list which providers the user has keys for
router.get(
  "/api-keys",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keys = await prisma.apiKey.findMany({
        where: { userId: req.user.id },
        select: { id: true, provider: true, createdAt: true },
      });

      const data = keys.map((k) => ({
        id: k.id,
        provider: k.provider,
        hasKey: true,
        createdAt: k.createdAt,
      }));

      res.json({ data });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/settings/api-keys — save or update an API key
router.post(
  "/api-keys",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        res.status(400).json({
          error: { message: "provider and apiKey are required" },
        });
        return;
      }

      const ALL_PROVIDERS = [...TRANSLATION_PROVIDERS, ...TTS_PROVIDERS];
      if (!ALL_PROVIDERS.includes(provider)) {
        res.status(400).json({
          error: { message: `Invalid provider. Must be one of: ${ALL_PROVIDERS.join(", ")}` },
        });
        return;
      }

      const apiKeyEncrypted = encrypt(apiKey);

      const key = await prisma.apiKey.upsert({
        where: {
          userId_provider: {
            userId: req.user.id,
            provider,
          },
        },
        create: {
          userId: req.user.id,
          provider,
          apiKeyEncrypted,
        },
        update: {
          apiKeyEncrypted,
        },
        select: { id: true, provider: true, createdAt: true },
      });

      res.status(201).json({
        data: { id: key.id, provider: key.provider, hasKey: true, createdAt: key.createdAt },
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/settings/api-keys/:provider
router.delete(
  "/api-keys/:provider",
  async (req: Request<{ provider: string }>, res: Response, next: NextFunction) => {
    try {
      const { provider } = req.params;

      await prisma.apiKey.deleteMany({
        where: { userId: req.user.id, provider },
      });

      res.json({ data: { success: true } });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/settings/api-keys/test — validate that a key works
router.post(
  "/api-keys/test",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        res.status(400).json({
          error: { message: "provider and apiKey are required" },
        });
        return;
      }

      if ((TTS_PROVIDERS as readonly string[]).includes(provider)) {
        const ttsProvider = getTtsProvider(provider, apiKey);
        await ttsProvider.synthesize("hello", "en-US");
      } else {
        const translationProvider = getProvider(provider, apiKey);
        await translationProvider.translateWord("hello", "en", "es");
      }

      res.json({ data: { valid: true } });
    } catch (err: any) {
      res.json({
        data: {
          valid: false,
          error: err.response?.data?.error?.message || err.message || "Key validation failed",
        },
      });
    }
  },
);

// GET /api/settings/languages — get user's language preferences
router.get(
  "/languages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({
        data: {
          nativeLanguageId: req.user.nativeLanguageId,
          studyLanguageId: req.user.studyLanguageId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/settings/languages — update user's language preferences
router.put(
  "/languages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { nativeLanguageId, studyLanguageId } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          nativeLanguageId: nativeLanguageId ?? null,
          studyLanguageId: studyLanguageId ?? null,
        },
      });

      res.json({
        data: {
          nativeLanguageId: user.nativeLanguageId,
          studyLanguageId: user.studyLanguageId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
