import { WordStatus } from "shared";

const STATUS_CONFIG: Record<number, { label: string; className: string }> = {
  [WordStatus.New]: { label: "New", className: "bg-status-new-light text-status-new-text" },
  [WordStatus.Learning1]: { label: "Learning 1", className: "bg-status-learning1-light text-status-learning1-text" },
  [WordStatus.Learning2]: { label: "Learning 2", className: "bg-status-learning2-light text-status-learning2-text" },
  [WordStatus.Learning3]: { label: "Learning 3", className: "bg-status-learning3-light text-status-learning3-text" },
  [WordStatus.Learning4]: { label: "Learning 4", className: "bg-status-learning4-light text-status-learning4-text" },
  [WordStatus.Known]: { label: "Known", className: "bg-status-known-light text-status-known-text" },
  [WordStatus.Ignored]: { label: "Ignored", className: "bg-status-ignored-light text-status-ignored-text" },
};

export default function StatusBadge({ status }: { status: number }) {
  const config = STATUS_CONFIG[status] ?? { label: "?", className: "bg-status-ignored-light text-status-ignored-text" };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
