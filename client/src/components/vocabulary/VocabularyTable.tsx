import { useState } from "react";
import { WordStatus } from "shared";
import { apiFetch } from "../../lib/api";
import StatusBadge from "./StatusBadge";

interface WordRow {
  id: string;
  term: string;
  translation: string | null;
  status: number;
  notes: string | null;
  language: { code: string; name: string };
  createdAt: string;
}

interface VocabularyTableProps {
  words: WordRow[];
  sortBy: string;
  sortDir: string;
  selectedIds: Set<string>;
  onSort: (field: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onWordUpdated: () => void;
}

const STATUS_OPTIONS = [
  { value: WordStatus.New, label: "New" },
  { value: WordStatus.Learning1, label: "Lv 1" },
  { value: WordStatus.Learning2, label: "Lv 2" },
  { value: WordStatus.Learning3, label: "Lv 3" },
  { value: WordStatus.Learning4, label: "Lv 4" },
  { value: WordStatus.Known, label: "Known" },
  { value: WordStatus.Ignored, label: "Ignored" },
];

function SortIndicator({
  field,
  sortBy,
  sortDir,
}: {
  field: string;
  sortBy: string;
  sortDir: string;
}) {
  if (field !== sortBy)
    return <span className="ml-1 text-ink-ghost">{"↕"}</span>;
  return (
    <span className="ml-1 text-ink">{sortDir === "asc" ? "▲" : "▼"}</span>
  );
}

const GRID_COLS =
  "grid-cols-[36px_200px_1fr_120px_140px_1fr_120px_80px]";
const SORT_BTN =
  "mono cursor-pointer border-0 bg-transparent p-0 text-left text-inherit";

export default function VocabularyTable({
  words,
  sortBy,
  sortDir,
  selectedIds,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onWordUpdated,
}: VocabularyTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTranslation, setEditTranslation] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const startEdit = (word: WordRow) => {
    setEditingId(word.id);
    setEditTranslation(word.translation ?? "");
    setEditNotes(word.notes ?? "");
  };

  const saveEdit = async (wordId: string) => {
    await apiFetch(`/words/${wordId}`, {
      method: "PUT",
      body: JSON.stringify({
        translation: editTranslation || undefined,
        notes: editNotes || undefined,
      }),
    });
    setEditingId(null);
    onWordUpdated();
  };

  const updateStatus = async (wordId: string, status: number) => {
    await apiFetch(`/words/${wordId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    onWordUpdated();
  };

  const allSelected =
    words.length > 0 && words.every((w) => selectedIds.has(w.id));

  return (
    <div className="overflow-hidden rounded-[10px] border border-rule bg-paper-deep">
      <div
        className={`mono grid ${GRID_COLS} items-center gap-3.5 border-b border-rule px-[18px] py-3 text-[10px] uppercase tracking-[0.12em] text-ink-faint`}
      >
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="accent-accent"
          />
        </div>
        <button onClick={() => onSort("term")} className={SORT_BTN}>
          Term <SortIndicator field="term" sortBy={sortBy} sortDir={sortDir} />
        </button>
        <span>Translation</span>
        <button onClick={() => onSort("status")} className={SORT_BTN}>
          Status{" "}
          <SortIndicator field="status" sortBy={sortBy} sortDir={sortDir} />
        </button>
        <span>Language</span>
        <span>Notes</span>
        <button onClick={() => onSort("createdAt")} className={SORT_BTN}>
          Added{" "}
          <SortIndicator field="createdAt" sortBy={sortBy} sortDir={sortDir} />
        </button>
        <span />
      </div>

      {words.length === 0 ? (
        <div className="mono px-[18px] py-[60px] text-center text-[12px] uppercase tracking-[0.12em] text-ink-faint">
          No words found.
        </div>
      ) : (
        words.map((word, i) => (
          <div
            key={word.id}
            className={`grid ${GRID_COLS} items-center gap-3.5 px-[18px] py-3.5 text-sm ${
              i < words.length - 1 ? "border-b border-rule-soft" : ""
            } ${selectedIds.has(word.id) ? "bg-accent-wash" : "bg-transparent"}`}
          >
            <div>
              <input
                type="checkbox"
                checked={selectedIds.has(word.id)}
                onChange={() => onToggleSelect(word.id)}
                className="accent-accent"
              />
            </div>
            <div className="display overflow-hidden text-ellipsis whitespace-nowrap text-[17px] font-medium tracking-[-0.005em] text-ink">
              {word.term}
            </div>
            <div
              className={`overflow-hidden text-ellipsis italic text-ink-soft ${
                editingId === word.id ? "whitespace-normal" : "whitespace-nowrap"
              }`}
            >
              {editingId === word.id ? (
                <input
                  type="text"
                  value={editTranslation}
                  onChange={(e) => setEditTranslation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(word.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="input px-2.5 py-1.5 text-[13px]"
                />
              ) : (
                word.translation || "—"
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={word.status} />
              <select
                value={word.status}
                onChange={(e) => updateStatus(word.id, Number(e.target.value))}
                className="mono rounded border border-rule bg-transparent px-1 py-[3px] text-[10px] text-ink-soft"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mono text-[11px] text-ink-faint">
              {word.language.name}
            </div>
            <div
              className={`overflow-hidden text-ellipsis text-[12px] text-ink-faint ${
                editingId === word.id ? "whitespace-normal" : "whitespace-nowrap"
              }`}
            >
              {editingId === word.id ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      saveEdit(word.id);
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  rows={2}
                  className="input resize-none px-2.5 py-1.5 text-[12px]"
                />
              ) : (
                word.notes || ""
              )}
            </div>
            <div className="mono text-[11px] text-ink-faint">
              {new Date(word.createdAt).toLocaleDateString()}
            </div>
            <div className="flex justify-end gap-1.5">
              {editingId === word.id ? (
                <>
                  <button
                    onClick={() => saveEdit(word.id)}
                    className="btn btn-ghost px-2 py-1 text-[11px] text-accent"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn btn-ghost px-2 py-1 text-[11px] text-ink-faint"
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEdit(word)}
                  className="btn btn-ghost px-2 py-1 text-[11px] text-ink-faint"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
