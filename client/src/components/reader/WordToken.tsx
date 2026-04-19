import { memo } from "react";
import { WordStatus } from "shared";

interface WordTokenProps {
  tokenIdx: number;
  text: string;
  status: number | undefined;
  inPhrase?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

function WordTokenInner({
  tokenIdx,
  text,
  status,
  inPhrase,
  onClick,
}: WordTokenProps) {
  const effectiveStatus = status ?? WordStatus.New;

  return (
    <span
      data-token-idx={tokenIdx}
      data-word-token
      data-word-text={text}
      data-word-status={effectiveStatus}
      data-in-phrase={inPhrase ? "true" : undefined}
      onClick={onClick}
    >
      {text}
    </span>
  );
}

export default memo(WordTokenInner, (prev, next) => {
  return (
    prev.tokenIdx === next.tokenIdx &&
    prev.text === next.text &&
    prev.status === next.status &&
    prev.inPhrase === next.inPhrase
  );
});
