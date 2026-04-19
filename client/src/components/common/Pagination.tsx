interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

const pillClass = (active: boolean, disabled = false): string => {
  const base =
    "sans min-w-8 rounded-[5px] border px-2.5 py-1 text-[12px]";
  const state = active
    ? "border-ink bg-ink text-paper"
    : `border-rule bg-transparent ${disabled ? "text-ink-ghost" : "text-ink-soft"}`;
  const behavior = disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer";
  return `${base} ${state} ${behavior}`;
};

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
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={pillClass(false, page <= 1)}
      >
        ‹
      </button>

      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className={pillClass(false)}>
            1
          </button>
          {start > 2 && (
            <span className="mono px-1 text-ink-faint">…</span>
          )}
        </>
      )}

      {range.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={pillClass(p === page)}
        >
          {p}
        </button>
      ))}

      {end < pages && (
        <>
          {end < pages - 1 && (
            <span className="mono px-1 text-ink-faint">…</span>
          )}
          <button
            onClick={() => onPageChange(pages)}
            className={pillClass(false)}
          >
            {pages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        className={pillClass(false, page >= pages)}
      >
        ›
      </button>
    </div>
  );
}
