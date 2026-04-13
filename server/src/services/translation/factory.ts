import type { TranslationProvider } from "./translation.provider.js";
import { GoogleTranslateProvider } from "./google.provider.js";
import { DeepLProvider } from "./deepl.provider.js";

export function getProvider(
  providerName: string,
  apiKey: string,
): TranslationProvider {
  switch (providerName) {
    case "google":
      return new GoogleTranslateProvider(apiKey);
    case "deepl":
      return new DeepLProvider(apiKey);
    default:
      throw new Error(`Unknown translation provider: ${providerName}`);
  }
}
