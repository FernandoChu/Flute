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
    return (
      <span style={{ color: "var(--ink-ghost)", marginLeft: 4 }}>{"↕"}</span>
    );
  return (
    <span style={{ marginLeft: 4, color: "var(--ink)" }}>
      {sortDir === "asc" ? "▲" : "▼"}
    </span>
  );
}

const GRID = "36px 200px 1fr 120px 140px 1fr 120px 80px";

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
    <div
      style={{
        border: "1px solid var(--rule)",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--paper-deep)",
      }}
    >
      <div
        className="mono"
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          padding: "12px 18px",
          borderBottom: "1px solid var(--rule)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            style={{ accentColor: "var(--accent)" }}
          />
        </div>
        <button
          onClick={() => onSort("term")}
          className="mono"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "inherit",
            fontSize: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            textAlign: "left",
            padding: 0,
          }}
        >
          Term <SortIndicator field="term" sortBy={sortBy} sortDir={sortDir} />
        </button>
        <span>Translation</span>
        <button
          onClick={() => onSort("status")}
          className="mono"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "inherit",
            fontSize: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            textAlign: "left",
            padding: 0,
          }}
        >
          Status{" "}
          <SortIndicator field="status" sortBy={sortBy} sortDir={sortDir} />
        </button>
        <span>Language</span>
        <span>Notes</span>
        <button
          onClick={() => onSort("createdAt")}
          className="mono"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "inherit",
            fontSize: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
            textAlign: "left",
            padding: 0,
          }}
        >
          Added{" "}
          <SortIndicator field="createdAt" sortBy={sortBy} sortDir={sortDir} />
        </button>
        <span />
      </div>

      {words.length === 0 ? (
        <div
          className="mono"
          style={{
            padding: "60px 18px",
            textAlign: "center",
            color: "var(--ink-faint)",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          No words found.
        </div>
      ) : (
        words.map((word, i) => (
          <div
            key={word.id}
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              padding: "14px 18px",
              borderBottom:
                i < words.length - 1 ? "1px solid var(--rule-soft)" : 0,
              fontSize: 14,
              alignItems: "center",
              gap: 14,
              background: selectedIds.has(word.id)
                ? "var(--accent-wash)"
                : "transparent",
            }}
          >
            <div>
              <input
                type="checkbox"
                checked={selectedIds.has(word.id)}
                onChange={() => onToggleSelect(word.id)}
                style={{ accentColor: "var(--accent)" }}
              />
            </div>
            <div
              className="display"
              style={{
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: "-0.005em",
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {word.term}
            </div>
            <div
              style={{
                color: "var(--ink-soft)",
                fontStyle: "italic",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: editingId === word.id ? "normal" : "nowrap",
              }}
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
                  className="input"
                  style={{ fontSize: 13, padding: "6px 10px" }}
                />
              ) : (
                word.translation || "—"
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge status={word.status} />
              <select
                value={word.status}
                onChange={(e) => updateStatus(word.id, Number(e.target.value))}
                className="mono"
                style={{
                  fontSize: 10,
                  padding: "3px 4px",
                  background: "transparent",
                  border: "1px solid var(--rule)",
                  borderRadius: 4,
                  color: "var(--ink-soft)",
                }}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-faint)" }}
            >
              {word.language.name}
            </div>
            <div
              style={{
                color: "var(--ink-faint)",
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: editingId === word.id ? "normal" : "nowrap",
              }}
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
                  className="input"
                  style={{ fontSize: 12, padding: "6px 10px", resize: "none" }}
                />
              ) : (
                word.notes || ""
              )}
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--ink-faint)" }}
            >
              {new Date(word.createdAt).toLocaleDateString()}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "flex-end",
              }}
            >
              {editingId === word.id ? (
                <>
                  <button
                    onClick={() => saveEdit(word.id)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      color: "var(--accent)",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      color: "var(--ink-faint)",
                    }}
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  onClick={() => startEdit(word)}
                  className="btn btn-ghost"
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    color: "var(--ink-faint)",
                  }}
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
