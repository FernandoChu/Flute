import type { TtsProvider } from "./tts.provider.js";
import { GoogleTtsProvider } from "./google-tts.provider.js";

export function getTtsProvider(
  providerName: string,
  apiKey: string,
): TtsProvider {
  switch (providerName) {
    case "google-tts":
      return new GoogleTtsProvider(apiKey);
    default:
      throw new Error(`Unknown TTS provider: ${providerName}`);
  }
}
