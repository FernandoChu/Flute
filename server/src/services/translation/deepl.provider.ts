import axios from "axios";
import https from "https";
import type {
  TranslationProvider,
  TranslationResult,
} from "./translation.provider.js";

const httpsAgent = new https.Agent({ keepAlive: false });

export class DeepLProvider implements TranslationProvider {
  name = "deepl";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Free keys end with ":fx"
    this.baseUrl = apiKey.endsWith(":fx")
      ? "https://api-free.deepl.com/v2"
      : "https://api.deepl.com/v2";
  }

  async translateWord(
    term: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    return this.translate(term, sourceLang, targetLang);
  }

  async translateSentence(
    sentence: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    return this.translate(sentence, sourceLang, targetLang);
  }

  private async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResult> {
    const maxAttempts = 3;
    const backoffsMs = [500, 1500];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await axios.post(
          `${this.baseUrl}/translate`,
          {
            text: [text],
            source_lang: sourceLang.toUpperCase(),
            target_lang: targetLang.toUpperCase(),
          },
          {
            headers: {
              Authorization: `DeepL-Auth-Key ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 10000,
            httpsAgent,
          },
        );

        const translation = res.data?.translations?.[0]?.text ?? "";
        return { translation };
      } catch (err: any) {
        if (attempt === maxAttempts || !isTransient(err)) throw err;
        await sleep(backoffsMs[attempt - 1]);
      }
    }

    throw new Error("unreachable");
  }
}

function isTransient(err: any): boolean {
  const transientCodes = new Set([
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNABORTED",
    "EAI_AGAIN",
    "EPIPE",
  ]);
  if (err?.code && transientCodes.has(err.code)) return true;
  const status = err?.response?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
