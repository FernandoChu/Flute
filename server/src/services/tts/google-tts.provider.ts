import axios from "axios";
import type { TtsProvider, TtsResult, TtsOptions } from "./tts.provider.js";

const MAX_BYTES = 5000;

// Google Cloud TTS model identifiers
export const GOOGLE_TTS_MODELS = [
  { id: "standard", label: "Standard" },
  { id: "wavenet", label: "WaveNet" },
  { id: "neural2", label: "Neural2" },
  { id: "studio", label: "Studio" },
  { id: "chirp", label: "Chirp HD" },
] as const;

export class GoogleTtsProvider implements TtsProvider {
  name = "google-tts";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(text: string, languageCode: string, options?: TtsOptions): Promise<TtsResult> {
    const chunks = splitText(text, MAX_BYTES);
    const buffers: Buffer[] = [];

    // Build voice config — if a specific voice name is provided, use it directly
    // and derive the languageCode from the voice name (e.g. "nl-NL-Wavenet-A" → "nl-NL")
    // to avoid mismatches between bare codes like "nl" and voice locales like "nl-NL".
    const voice: Record<string, string> = { languageCode };
    if (options?.voice) {
      voice.name = options.voice;
      const match = options.voice.match(/^([a-z]{2,3}-[A-Z]{2})/i);
      if (match) voice.languageCode = match[1];
    } else {
      voice.ssmlGender = "NEUTRAL";
    }

    for (const chunk of chunks) {
      const res = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          input: { text: chunk },
          voice,
          audioConfig: { audioEncoding: "MP3" },
        },
      );
      buffers.push(Buffer.from(res.data.audioContent, "base64"));
    }

    return { audioContent: Buffer.concat(buffers) };
  }

  /** List available voices for a language from Google Cloud TTS. */
  async listVoices(languageCode: string): Promise<GoogleTtsVoice[]> {
    const res = await axios.get(
      `https://texttospeech.googleapis.com/v1/voices?key=${this.apiKey}&languageCode=${languageCode}`,
    );
    const voices: GoogleTtsVoice[] = (res.data.voices ?? []).map((v: any) => ({
      name: v.name,
      ssmlGender: v.ssmlGender,
      naturalSampleRateHertz: v.naturalSampleRateHertz,
    }));
    voices.sort((a, b) => a.name.localeCompare(b.name));
    return voices;
  }
}

export interface GoogleTtsVoice {
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

/** Split text into chunks that fit within the byte limit, breaking on sentence boundaries. */
function splitText(text: string, maxBytes: number): string[] {
  const encoded = Buffer.from(text, "utf-8");
  if (encoded.length <= maxBytes) return [text];

  const sentences = text.split(/(?<=[.!?。！？\n])\s*/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? current + " " + sentence : sentence;
    if (Buffer.byteLength(candidate, "utf-8") > maxBytes) {
      if (current) chunks.push(current);
      // If a single sentence exceeds the limit, split it by words
      if (Buffer.byteLength(sentence, "utf-8") > maxBytes) {
        chunks.push(...splitByWords(sentence, maxBytes));
      } else {
        current = sentence;
      }
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitByWords(text: string, maxBytes: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (Buffer.byteLength(candidate, "utf-8") > maxBytes) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
