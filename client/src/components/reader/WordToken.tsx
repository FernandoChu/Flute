import { memo } from "react";
import { WordStatus } from "shared";

interface WordTokenProps {
  text: string;
  status: number | undefined;
  onClick: (e: React.MouseEvent) => void;
}

const STATUS_CLASSES: Record<number, string> = {
  [WordStatus.New]: "bg-blue-200 hover:bg-blue-300",
  [WordStatus.Learning1]: "bg-yellow-100 hover:bg-yellow-200",
  [WordStatus.Learning2]: "bg-yellow-200 hover:bg-yellow-300",
  [WordStatus.Learning3]: "bg-yellow-300 hover:bg-yellow-400",
  [WordStatus.Learning4]: "bg-yellow-400 hover:bg-yellow-500",
  [WordStatus.Known]: "",
  [WordStatus.Ignored]: "opacity-50",
};

function WordTokenInner({ text, status, onClick }: WordTokenProps) {
  // Undefined status = new (never seen)
  const effectiveStatus = status ?? WordStatus.New;
  const className = STATUS_CLASSES[effectiveStatus] ?? "";

  return (
    <span
      onClick={onClick}
      className={`cursor-pointer rounded-sm px-[1px] transition-colors ${className}`}
    >
      {text}
    </span>
  );
}

export default memo(WordTokenInner, (prev, next) => {
  return prev.text === next.text && prev.status === next.status;
});
