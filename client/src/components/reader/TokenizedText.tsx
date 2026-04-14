import { memo, useMemo } from "react";
import { tokenize, normalizeWord } from "shared";
import type { Word } from "shared";
import WordToken from "./WordToken";

interface TokenizedTextProps {
  text: string;
  getWord: (term: string) => Word | undefined;
  wordVersion: number;
  onWordClick: (term: string, element: HTMLElement) => void;
  persistedTranslations?: Map<number, string>;
  tokenOffset?: number;
}

function TokenizedTextInner({
  text,
  getWord,
  wordVersion: _wordVersion,
  onWordClick,
  persistedTranslations,
  tokenOffset = 0,
}: TokenizedTextProps) {
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <div className="whitespace-pre-wrap">
      {tokens.map((token, i) => {
        const globalIdx = tokenOffset + i;

        if (!token.isWord) {
          return (
            <span key={globalIdx} data-token-idx={globalIdx}>
              {token.text}
            </span>
          );
        }

        const normalized = normalizeWord(token.text);
        const word = getWord(normalized);
        const translation = persistedTranslations?.get(globalIdx);

        return (
          <WordToken
            key={globalIdx}
            tokenIdx={globalIdx}
            text={token.text}
            status={word?.status}
            translation={translation}
            onClick={(e) =>
              onWordClick(token.text, e.currentTarget as HTMLElement)
            }
          />
        );
      })}
    </div>
  );
}

export default memo(TokenizedTextInner);
