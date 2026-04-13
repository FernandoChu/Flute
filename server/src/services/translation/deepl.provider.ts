import axios from "axios";
import type {
  TranslationProvider,
  TranslationResult,
} from "./translation.provider.js";

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
      },
    );

    const translation = res.data?.translations?.[0]?.text ?? "";
    return { translation };
  }
}
