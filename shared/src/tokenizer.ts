export interface Token {
  text: string;
  isWord: boolean;
}

// CJK Unicode ranges
const CJK_RANGES = [
  [0x4e00, 0x9fff], // CJK Unified Ideographs
  [0x3400, 0x4dbf], // CJK Unified Ideographs Extension A
  [0x20000, 0x2a6df], // CJK Unified Ideographs Extension B
  [0xf900, 0xfaff], // CJK Compatibility Ideographs
  [0x3040, 0x309f], // Hiragana
  [0x30a0, 0x30ff], // Katakana
  [0xac00, 0xd7af], // Hangul Syllables
] as const;

function isCJK(char: string): boolean {
  const code = char.codePointAt(0)!;
  return CJK_RANGES.some(([start, end]) => code >= start && code <= end);
}

function hasCJK(text: string): boolean {
  for (const char of text) {
    if (isCJK(char)) return true;
  }
  return false;
}

/**
 * Tokenize text that contains CJK characters.
 * Each CJK character becomes its own word token.
 * Non-CJK runs are tokenized normally.
 */
function tokenizeCJK(text: string): Token[] {
  const tokens: Token[] = [];
  let buffer = "";
  let bufferIsWord = false;

  function flushBuffer() {
    if (buffer) {
      tokens.push({ text: buffer, isWord: bufferIsWord });
      buffer = "";
    }
  }

  for (const char of text) {
    if (isCJK(char)) {
      flushBuffer();
      tokens.push({ text: char, isWord: true });
    } else if (/\s/.test(char)) {
      if (bufferIsWord || buffer === "") {
        flushBuffer();
        bufferIsWord = false;
      }
      buffer += char;
    } else if (/[\p{L}\p{M}\p{N}'-]/u.test(char)) {
      if (!bufferIsWord) {
        flushBuffer();
        bufferIsWord = true;
      }
      buffer += char;
    } else {
      // Punctuation
      flushBuffer();
      tokens.push({ text: char, isWord: false });
    }
  }
  flushBuffer();

  return tokens;
}

/**
 * Tokenize text into word and non-word tokens.
 * Words are sequences of letters, numbers, apostrophes, and hyphens.
 * Everything else (whitespace, punctuation) is non-word.
 */
export function tokenize(text: string): Token[] {
  if (hasCJK(text)) {
    return tokenizeCJK(text);
  }

  const tokens: Token[] = [];
  // Match word characters (including unicode letters, accented chars, apostrophes, hyphens)
  // or non-word sequences
  const regex = /[\p{L}\p{M}\p{N}'-]+|[^\p{L}\p{M}\p{N}'-]+/gu;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const segment = match[0];
    const isWord = /[\p{L}\p{N}]/u.test(segment);
    tokens.push({ text: segment, isWord });
  }

  return tokens;
}

/** Normalize a word for lookup: lowercase, trim */
export function normalizeWord(word: string): string {
  return word.toLowerCase().trim();
}
