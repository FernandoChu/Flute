export interface TranslationResult {
  translation: string;
}

export interface TranslationProvider {
  name: string;
  translateWord(
    term: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResult>;
  translateSentence(
    sentence: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<TranslationResult>;
}
