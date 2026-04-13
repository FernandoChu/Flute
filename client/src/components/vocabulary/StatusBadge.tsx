import { WordStatus } from "shared";

const STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  [WordStatus.New]: { label: "New", className: "bg-blue-100 text-blue-700" },
  [WordStatus.Learning1]: { label: "Learning 1", className: "bg-yellow-100 text-yellow-700" },
  [WordStatus.Learning2]: { label: "Learning 2", className: "bg-yellow-200 text-yellow-800" },
  [WordStatus.Learning3]: { label: "Learning 3", className: "bg-yellow-300 text-yellow-800" },
  [WordStatus.Learning4]: { label: "Learning 4", className: "bg-yellow-400 text-yellow-900" },
  [WordStatus.Known]: { label: "Known", className: "bg-green-100 text-green-700" },
  [WordStatus.Ignored]: { label: "Ignored", className: "bg-gray-100 text-gray-500" },
};

export default function StatusBadge({ status }: { status: number }) {
  const config = STATUS_CONFIG[status] ?? { label: "?", className: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
