import { memo } from "react";
import { WordStatus } from "shared";

interface WordTokenProps {
  tokenIdx: number;
  text: string;
  status: number | undefined;
  inPhrase?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const STATUS_CLASSES: Record<number, string> = {
  [WordStatus.New]: "bg-status-new hover:brightness-90",
  [WordStatus.Learning1]: "bg-status-learning1 hover:brightness-90",
  [WordStatus.Learning2]: "bg-status-learning2 hover:brightness-90",
  [WordStatus.Learning3]: "bg-status-learning3 hover:brightness-90",
  [WordStatus.Learning4]: "bg-status-learning4 hover:brightness-90",
  [WordStatus.Known]: "",
  [WordStatus.Ignored]: "",
};

const STATUS_BG: Record<number, string> = {
  [WordStatus.New]: "var(--color-status-new)",
  [WordStatus.Learning1]: "var(--color-status-learning1)",
  [WordStatus.Learning2]: "var(--color-status-learning2)",
  [WordStatus.Learning3]: "var(--color-status-learning3)",
  [WordStatus.Learning4]: "var(--color-status-learning4)",
};

function WordTokenInner({ tokenIdx, text, status, inPhrase, onClick }: WordTokenProps) {
  // Undefined status = new (never seen)
  const effectiveStatus = status ?? WordStatus.New;
  const className = STATUS_CLASSES[effectiveStatus] ?? "";

  if (inPhrase) {
    const bgColor = STATUS_BG[effectiveStatus];
    return (
      <span
        data-token-idx={tokenIdx}
        data-word-token
        data-word-text={text}
        onClick={onClick}
        className="cursor-pointer rounded-sm px-[1px]"
        style={bgColor ? { backgroundColor: bgColor, color: "#1f2937" } : undefined}
      >
        {text}
      </span>
    );
  }

  return (
    <span
      data-token-idx={tokenIdx}
      data-word-token
      data-word-text={text}
      onClick={onClick}
      className={`cursor-pointer rounded-sm px-[1px] ${className}`}
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
