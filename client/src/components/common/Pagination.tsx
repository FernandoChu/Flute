interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

const pillStyle = (active: boolean, disabled = false): React.CSSProperties => ({
  minWidth: 32,
  padding: "4px 10px",
  fontSize: 12,
  background: active ? "var(--ink)" : "transparent",
  color: active
    ? "var(--paper)"
    : disabled
      ? "var(--ink-ghost)"
      : "var(--ink-soft)",
  border: "1px solid " + (active ? "var(--ink)" : "var(--rule)"),
  borderRadius: 5,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: "var(--font-sans)",
  opacity: disabled ? 0.5 : 1,
});

export default function Pagination({
  page,
  pages,
  onPageChange,
}: PaginationProps) {
  if (pages <= 1) return null;

  const range: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) range.push(i);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        style={pillStyle(false, page <= 1)}
      >
        ‹
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} style={pillStyle(false)}>
            1
          </button>
          {start > 2 && (
            <span
              style={{ padding: "0 4px", color: "var(--ink-faint)" }}
              className="mono"
            >
              …
            </span>
          )}
        </>
      )}

      {range.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={pillStyle(p === page)}
        >
          {p}
        </button>
      ))}

      {end < pages && (
        <>
          {end < pages - 1 && (
            <span
              style={{ padding: "0 4px", color: "var(--ink-faint)" }}
              className="mono"
            >
              …
            </span>
          )}
          <button onClick={() => onPageChange(pages)} style={pillStyle(false)}>
            {pages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        style={pillStyle(false, page >= pages)}
      >
        ›
      </button>
    </div>
  );
}
