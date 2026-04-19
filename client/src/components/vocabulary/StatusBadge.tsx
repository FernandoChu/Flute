import { WordStatus } from "shared";

const STATUS_CONFIG: Record<
  number,
  { label: string; short: string; color: string }
> = {
  [WordStatus.New]: { label: "New", short: "N", color: "var(--st-new)" },
  [WordStatus.Learning1]: { label: "Lv 1", short: "1", color: "var(--st-l1)" },
  [WordStatus.Learning2]: { label: "Lv 2", short: "2", color: "var(--st-l2)" },
  [WordStatus.Learning3]: { label: "Lv 3", short: "3", color: "var(--st-l3)" },
  [WordStatus.Learning4]: { label: "Lv 4", short: "4", color: "var(--st-l4)" },
  [WordStatus.Known]: { label: "Known", short: "K", color: "var(--ink-soft)" },
  [WordStatus.Ignored]: {
    label: "Ignored",
    short: "×",
    color: "var(--st-ignored)",
  },
};

export default function StatusBadge({ status }: { status: number }) {
  const config = STATUS_CONFIG[status] ?? {
    label: "?",
    short: "?",
    color: "var(--ink-faint)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--ink-soft)",
        letterSpacing: "0.04em",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: status === WordStatus.Known ? "transparent" : config.color,
          border:
            status === WordStatus.Known ? "1px solid var(--rule)" : "none",
        }}
      />
      {config.label}
    </span>
  );
}
