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
  const isKnown = status === WordStatus.Known;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.04em] text-ink-soft">
      <span
        className={`h-2 w-2 rounded-full ${
          isKnown ? "border border-rule" : "border-0"
        }`}
        style={{ background: isKnown ? "transparent" : config.color }}
      />
      {config.label}
    </span>
  );
}
