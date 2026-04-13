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
  { value: WordStatus.Learning1, label: "1" },
  { value: WordStatus.Learning2, label: "2" },
  { value: WordStatus.Learning3, label: "3" },
  { value: WordStatus.Learning4, label: "4" },
  { value: WordStatus.Known, label: "K" },
  { value: WordStatus.Ignored, label: "X" },
];

function SortIndicator({ field, sortBy, sortDir }: { field: string; sortBy: string; sortDir: string }) {
  if (field !== sortBy) return <span className="text-gray-300 ml-1">{"\u2195"}</span>;
  return <span className="ml-1">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
}

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

  const allSelected = words.length > 0 && words.every((w) => selectedIds.has(w.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-3 px-3 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="rounded"
              />
            </th>
            <th
              className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none"
              onClick={() => onSort("term")}
            >
              Term <SortIndicator field="term" sortBy={sortBy} sortDir={sortDir} />
            </th>
            <th className="py-3 px-3">Translation</th>
            <th
              className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none"
              onClick={() => onSort("status")}
            >
              Status <SortIndicator field="status" sortBy={sortBy} sortDir={sortDir} />
            </th>
            <th className="py-3 px-3">Language</th>
            <th className="py-3 px-3">Notes</th>
            <th
              className="py-3 px-3 cursor-pointer hover:text-blue-600 select-none"
              onClick={() => onSort("createdAt")}
            >
              Added <SortIndicator field="createdAt" sortBy={sortBy} sortDir={sortDir} />
            </th>
            <th className="py-3 px-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {words.map((word) => (
            <tr
              key={word.id}
              className={`border-b border-gray-100 hover:bg-gray-50 ${
                selectedIds.has(word.id) ? "bg-blue-50" : ""
              }`}
            >
              <td className="py-2.5 px-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(word.id)}
                  onChange={() => onToggleSelect(word.id)}
                  className="rounded"
                />
              </td>
              <td className="py-2.5 px-3 font-medium">{word.term}</td>
              <td className="py-2.5 px-3">
                {editingId === word.id ? (
                  <input
                    type="text"
                    value={editTranslation}
                    onChange={(e) => setEditTranslation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(word.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span className="text-gray-600">{word.translation || "—"}</span>
                )}
              </td>
              <td className="py-2.5 px-3">
                <select
                  value={word.status}
                  onChange={(e) => updateStatus(word.id, Number(e.target.value))}
                  className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="ml-2">
                  <StatusBadge status={word.status} />
                </span>
              </td>
              <td className="py-2.5 px-3 text-gray-500">{word.language.name}</td>
              <td className="py-2.5 px-3">
                {editingId === word.id ? (
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(word.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="text-gray-500 text-xs">{word.notes || ""}</span>
                )}
              </td>
              <td className="py-2.5 px-3 text-gray-400 text-xs">
                {new Date(word.createdAt).toLocaleDateString()}
              </td>
              <td className="py-2.5 px-3">
                {editingId === word.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => saveEdit(word.id)}
                      className="text-xs text-green-600 hover:text-green-800"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(word)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
          {words.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-500">
                No words found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
