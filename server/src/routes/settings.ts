import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../index.js";
import { encrypt, decrypt } from "../services/encryption.js";
import { getProvider } from "../services/translation/factory.js";
import { TRANSLATION_PROVIDERS } from "shared";

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

      if (!TRANSLATION_PROVIDERS.includes(provider)) {
        res.status(400).json({
          error: { message: `Invalid provider. Must be one of: ${TRANSLATION_PROVIDERS.join(", ")}` },
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

      const translationProvider = getProvider(provider, apiKey);
      await translationProvider.translateWord("hello", "en", "es");

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

export default router;
