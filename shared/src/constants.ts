export const TRANSLATION_PROVIDERS = ["google", "deepl"] as const;
export type TranslationProvider = (typeof TRANSLATION_PROVIDERS)[number];

export const TTS_PROVIDERS = ["google-tts"] as const;
export type TtsProvider = (typeof TTS_PROVIDERS)[number];

export const SUPPORTED_FILE_TYPES = [".txt", ".epub", ".srt"] as const;
export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

export const SUPPORTED_AUDIO_TYPES = [".mp3", ".wav", ".ogg", ".m4a"] as const;
export type SupportedAudioType = (typeof SUPPORTED_AUDIO_TYPES)[number];
