import { memo } from "react";
import { WordStatus } from "shared";

interface WordTokenProps {
  tokenIdx: number;
  text: string;
  status: number | undefined;
  translation?: string;
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
  [WordStatus.Ignored]: "text-gray-400",
};

const STATUS_VIVID: Record<number, string> = {
  [WordStatus.New]: "var(--color-status-new-vivid)",
  [WordStatus.Learning1]: "var(--color-status-learning1-vivid)",
  [WordStatus.Learning2]: "var(--color-status-learning2-vivid)",
  [WordStatus.Learning3]: "var(--color-status-learning3-vivid)",
  [WordStatus.Learning4]: "var(--color-status-learning4-vivid)",
};

const STATUS_BG: Record<number, string> = {
  [WordStatus.New]: "var(--color-status-new)",
  [WordStatus.Learning1]: "var(--color-status-learning1)",
  [WordStatus.Learning2]: "var(--color-status-learning2)",
  [WordStatus.Learning3]: "var(--color-status-learning3)",
  [WordStatus.Learning4]: "var(--color-status-learning4)",
};

function WordTokenInner({ tokenIdx, text, status, translation, inPhrase, onClick }: WordTokenProps) {
  // Undefined status = new (never seen)
  const effectiveStatus = status ?? WordStatus.New;
  const className = STATUS_CLASSES[effectiveStatus] ?? "";

  if (inPhrase && !translation) {
    const bgColor = STATUS_BG[effectiveStatus];
    return (
      <span
        data-token-idx={tokenIdx}
        data-word-token
        data-word-text={text}
        onClick={onClick}
        className="cursor-pointer rounded-sm px-[1px]"
        style={bgColor ? { backgroundColor: bgColor, color: "#1f2937" } : { color: "white" }}
      >
        {text}
      </span>
    );
  }

  if (translation) {
    const dotColor = STATUS_VIVID[effectiveStatus];
    return (
      <span
        data-token-idx={tokenIdx}
        data-word-token
        data-word-text={text}
        onClick={onClick}
        className="inline-block text-center cursor-pointer leading-none"
      >
        <span
          className="block text-base italic whitespace-nowrap pointer-events-none text-pill"
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
        <span className="relative rounded px-2 py-1 text-white leading-normal bg-pill">
          {text}
          {dotColor && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white pointer-events-none"
              style={{ backgroundColor: dotColor }}
            />
          )}
        </span>
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
    prev.translation === next.translation &&
    prev.inPhrase === next.inPhrase
  );
});
