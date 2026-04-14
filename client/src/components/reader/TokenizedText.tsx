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
        elements.push(
          <WordToken
            key={globalIdx}
            tokenIdx={globalIdx}
            text={token.text}
            status={word?.status}
            translation={translation}
            onClick={(e) =>
              onWordClick(token.text, e.currentTarget as HTMLElement)
            }
          />,
        );
      }
      i++;
      continue;
    }

    // Start of a phrase group — collect all tokens in the range
    const wordIndices = phraseGroups!.get(anchorIdx)!;
    const maxIdx = Math.max(...wordIndices);
    const translation = persistedTranslations?.get(anchorIdx);

    const phraseChildren: React.ReactNode[] = [];
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
      i++;
    }

    elements.push(
      <span
        key={`phrase-${anchorIdx}`}
        className="inline-block leading-none"
      >
        {translation && (
          <>
            <span
              className="block text-base italic text-center pointer-events-none text-pill"
            >
              {translation}
            </span>
            <span
              className="block mx-auto pointer-events-none"
              style={{
                width: 0,
                height: 0,
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderBottom: "7px solid var(--color-pill)",
              }}
            />
          </>
        )}
        <span
          className="rounded px-1.5 py-0.5 leading-normal border-2 border-pill"
        >
          {phraseChildren}
        </span>
      </span>,
    );
  }

  return <div className="whitespace-pre-wrap">{elements}</div>;
}

export default memo(TokenizedTextInner);
