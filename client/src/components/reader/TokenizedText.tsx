import { memo, useMemo } from "react";
import { tokenize, normalizeWord } from "shared";
import type { Word } from "shared";
import WordToken from "./WordToken";

interface TokenizedTextProps {
  text: string;
  getWord: (term: string) => Word | undefined;
  wordVersion: number;
  onWordClick: (term: string, element: HTMLElement) => void;
}

function TokenizedTextInner({
  text,
  getWord,
  wordVersion: _wordVersion,
  onWordClick,
}: TokenizedTextProps) {
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <div className="text-lg leading-relaxed whitespace-pre-wrap">
      {tokens.map((token, i) => {
        if (!token.isWord) {
          return (
            <span key={i} data-token-idx={i}>
              {token.text}
            </span>
          );
        }

        const normalized = normalizeWord(token.text);
        const word = getWord(normalized);

        return (
          <WordToken
            key={i}
            tokenIdx={i}
            text={token.text}
            status={word?.status}
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
