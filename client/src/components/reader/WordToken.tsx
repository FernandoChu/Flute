import { memo } from "react";
import { WordStatus } from "shared";

interface WordTokenProps {
  tokenIdx: number;
  text: string;
  status: number | undefined;
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

function WordTokenInner({ tokenIdx, text, status, onClick }: WordTokenProps) {
  // Undefined status = new (never seen)
  const effectiveStatus = status ?? WordStatus.New;
  const className = STATUS_CLASSES[effectiveStatus] ?? "";

  return (
    <span
      data-token-idx={tokenIdx}
      data-word-token
      onClick={onClick}
      className={`cursor-pointer rounded-sm px-[1px] ${className}`}
    >
      {text}
    </span>
  );
}

export default memo(WordTokenInner, (prev, next) => {
  return prev.tokenIdx === next.tokenIdx && prev.text === next.text && prev.status === next.status;
});
