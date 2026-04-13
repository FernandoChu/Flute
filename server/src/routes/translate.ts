import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { prisma } from "../index.js";
import { decrypt } from "../services/encryption.js";
import { getProvider } from "../services/translation/factory.js";

const router = Router();
router.use(requireAuth);
router.use(rateLimit);

async function getUserProvider(userId: string, preferredProvider?: string) {
  // If preferred provider specified, try that first
  if (preferredProvider) {
    const key = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId, provider: preferredProvider } },
    });
    if (key) {
      return getProvider(preferredProvider, decrypt(key.apiKeyEncrypted));
    }
  }

  // Otherwise, use the first available key
  const key = await prisma.apiKey.findFirst({
    where: { userId },
  });

  if (!key) {
    return null;
  }

  return getProvider(key.provider, decrypt(key.apiKeyEncrypted));
}

// POST /api/translate/word
router.post(
  "/word",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { term, sourceLang, targetLang, provider: preferredProvider } = req.body;

      if (!term || !sourceLang || !targetLang) {
        res.status(400).json({
          error: { message: "term, sourceLang, and targetLang are required" },
        });
        return;
      }

      // Check cache first
      const cached = await prisma.translationCache.findFirst({
        where: {
          sourceLang,
          targetLang,
          term: term.toLowerCase(),
        },
      });

      if (cached) {
        res.json({ data: { translation: cached.translation, cached: true } });
        return;
      }

      const translationProvider = await getUserProvider(req.user.id, preferredProvider);
      if (!translationProvider) {
        res.status(400).json({
          error: { message: "No translation API key configured. Add one in Settings." },
        });
        return;
      }

      const result = await translationProvider.translateWord(term, sourceLang, targetLang);

      // Cache the result
      await prisma.translationCache.upsert({
        where: {
          sourceLang_targetLang_term_provider: {
            sourceLang,
            targetLang,
            term: term.toLowerCase(),
            provider: translationProvider.name,
          },
        },
        create: {
          sourceLang,
          targetLang,
          term: term.toLowerCase(),
          provider: translationProvider.name,
          translation: result.translation,
        },
        update: {
          translation: result.translation,
        },
      });

      res.json({ data: { translation: result.translation, cached: false } });
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        res.status(400).json({
          error: { message: "Translation API key is invalid or expired. Update it in Settings." },
        });
        return;
      }
      next(err);
    }
  },
);

// POST /api/translate/sentence
router.post(
  "/sentence",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sentence, sourceLang, targetLang, provider: preferredProvider } = req.body;

      if (!sentence || !sourceLang || !targetLang) {
        res.status(400).json({
          error: { message: "sentence, sourceLang, and targetLang are required" },
        });
        return;
      }

      const translationProvider = await getUserProvider(req.user.id, preferredProvider);
      if (!translationProvider) {
        res.status(400).json({
          error: { message: "No translation API key configured. Add one in Settings." },
        });
        return;
      }

      const result = await translationProvider.translateSentence(
        sentence,
        sourceLang,
        targetLang,
      );

      res.json({ data: { translation: result.translation } });
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        res.status(400).json({
          error: { message: "Translation API key is invalid or expired. Update it in Settings." },
        });
        return;
      }
      next(err);
    }
  },
);

export default router;
