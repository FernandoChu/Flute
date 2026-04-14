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
  phraseGroups?: Map<number, number[]>;
  tokenOffset?: number;
}

function TokenizedTextInner({
  text,
  getWord,
  wordVersion: _wordVersion,
  onWordClick,
  persistedTranslations,
  phraseGroups,
  tokenOffset = 0,
}: TokenizedTextProps) {
  const tokens = useMemo(() => tokenize(text), [text]);

  // Build a lookup: globalIdx → anchorIdx if this token is inside a phrase range
  const phraseMap = useMemo(() => {
    if (!phraseGroups || phraseGroups.size === 0) return null;
    const map = new Map<number, number>(); // tokenIdx → anchorIdx
    for (const [anchorIdx, wordIndices] of phraseGroups) {
      if (wordIndices.length === 0) continue;
      const minIdx = Math.min(...wordIndices);
      const maxIdx = Math.max(...wordIndices);
      // Include all tokens in the range (words, spaces, punctuation)
      for (let idx = minIdx; idx <= maxIdx; idx++) {
        map.set(idx, anchorIdx);
      }
    }
    return map;
  }, [phraseGroups]);

  // Render tokens, grouping phrase ranges into wrapper spans
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < tokens.length) {
    const globalIdx = tokenOffset + i;
    const anchorIdx = phraseMap?.get(globalIdx);

    // Not part of a phrase — render normally
    if (anchorIdx == null) {
      const token = tokens[i];
      if (!token.isWord) {
        elements.push(
          <span key={globalIdx} data-token-idx={globalIdx}>
            {token.text}
          </span>,
        );
      } else {
        const normalized = normalizeWord(token.text);
        const word = getWord(normalized);
        const translation = persistedTranslations?.get(globalIdx);
        if (translation) {
          elements.push(
            <span key={globalIdx} className="word-slot border-b-2 border-pill">
              <span className="word-slot-annotation text-pill">
                {translation}
              </span>
              <WordToken
                tokenIdx={globalIdx}
                text={token.text}
                status={word?.status}
                onClick={(e) =>
                  onWordClick(token.text, e.currentTarget as HTMLElement)
                }
              />
            </span>,
          );
        } else {
          elements.push(
            <WordToken
              key={globalIdx}
              tokenIdx={globalIdx}
              text={token.text}
              status={word?.status}
              onClick={(e) =>
                onWordClick(token.text, e.currentTarget as HTMLElement)
              }
            />,
          );
        }
      }
      i++;
      continue;
    }

    // Start of a phrase group — collect all tokens in the range
    const wordIndices = phraseGroups!.get(anchorIdx)!;
    const maxIdx = Math.max(...wordIndices);
    const translation = persistedTranslations?.get(anchorIdx);

    const phraseChildren: React.ReactNode[] = [];
    let firstWordInPhrase = true;
    while (i < tokens.length && tokenOffset + i <= maxIdx) {
      const gIdx = tokenOffset + i;
      const token = tokens[i];
      if (!token.isWord) {
        phraseChildren.push(
          <span key={gIdx} data-token-idx={gIdx}>
            {token.text}
          </span>,
        );
      } else {
        const normalized = normalizeWord(token.text);
        const word = getWord(normalized);
        if (firstWordInPhrase && translation) {
          phraseChildren.push(
            <span key={gIdx} className="word-slot">
              <span className="word-slot-annotation text-pill">
                {translation}
              </span>
              <WordToken
                tokenIdx={gIdx}
                text={token.text}
                status={word?.status}
                inPhrase
                onClick={(e) =>
                  onWordClick(token.text, e.currentTarget as HTMLElement)
                }
              />
            </span>,
          );
        } else {
          phraseChildren.push(
            <WordToken
              key={gIdx}
              tokenIdx={gIdx}
              text={token.text}
              status={word?.status}
              inPhrase
              onClick={(e) =>
                onWordClick(token.text, e.currentTarget as HTMLElement)
              }
            />,
          );
        }
        firstWordInPhrase = false;
      }
      i++;
    }

    elements.push(
      <span key={`phrase-${anchorIdx}`} className="border-b-2 border-pill">
        {phraseChildren}
      </span>,
    );
  }

  return <div className="whitespace-pre-wrap">{elements}</div>;
}

export default memo(TokenizedTextInner);
