import axios from "axios";
import type {
  TranslationProvider,
  TranslationResult,
} from "./translation.provider.js";

export class GoogleTranslateProvider implements TranslationProvider {
  name = "google";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
      "https://translation.googleapis.com/language/translate/v2",
      null,
      {
        params: {
          q: text,
          source: sourceLang,
          target: targetLang,
          key: this.apiKey,
          format: "text",
        },
      },
    );

    const translation =
      res.data?.data?.translations?.[0]?.translatedText ?? "";
    return { translation };
  }
}
