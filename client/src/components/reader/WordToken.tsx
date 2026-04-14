import { memo } from "react";
import { WordStatus } from "shared";

interface WordTokenProps {
  tokenIdx: number;
  text: string;
  status: number | undefined;
  translation?: string;
  onClick: (e: React.MouseEvent) => void;
}

const STATUS_CLASSES: Record<number, string> = {
  [WordStatus.New]: "bg-blue-200 hover:bg-blue-300",
  [WordStatus.Learning1]: "bg-yellow-300 hover:bg-yellow-400",
  [WordStatus.Learning2]: "bg-yellow-200 hover:bg-yellow-300",
  [WordStatus.Learning3]: "bg-yellow-100 hover:bg-yellow-200",
  [WordStatus.Learning4]: "bg-yellow-50 hover:bg-yellow-100",
  [WordStatus.Known]: "",
  [WordStatus.Ignored]: "text-gray-400",
};

function WordTokenInner({ tokenIdx, text, status, translation, onClick }: WordTokenProps) {
  // Undefined status = new (never seen)
  const effectiveStatus = status ?? WordStatus.New;
  const className = STATUS_CLASSES[effectiveStatus] ?? "";

  if (translation) {
    return (
      <span
        data-token-idx={tokenIdx}
        data-word-token
        data-word-text={text}
        onClick={onClick}
        className="inline-block text-center cursor-pointer"
      >
        <span
          className="block text-base italic whitespace-nowrap pointer-events-none"
          style={{ color: "rgb(16 185 129)" }}
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
            borderBottom: "7px solid rgb(16 185 129)",
          }}
        />
        <span className="rounded px-2 py-1 text-white" style={{ backgroundColor: "rgb(16 185 129)" }}>
          {text}
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
    prev.translation === next.translation
  );
});
