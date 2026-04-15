export interface TtsOptions {
  model?: string;
  voice?: string;
}

export interface TtsResult {
  audioContent: Buffer;
}

export interface TtsProvider {
  name: string;
  synthesize(text: string, languageCode: string, options?: TtsOptions): Promise<TtsResult>;
}
