import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

interface Language {
  id: number;
  code: string;
  name: string;
}

interface VocabularyFiltersProps {
  languageId: string;
  status: string;
  search: string;
  onLanguageChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSearchChange: (v: string) => void;
}

const STATUS_CHIPS = [
  { value: "", label: "All" },
  { value: "0", label: "New" },
  { value: "1", label: "Lv 1" },
  { value: "2", label: "Lv 2" },
  { value: "3", label: "Lv 3" },
  { value: "4", label: "Lv 4" },
  { value: "5", label: "Known" },
  { value: "6", label: "Ignored" },
];

const selectStyle: React.CSSProperties = {
  padding: "7px 10px",
  fontSize: 12,
  background: "var(--paper-sunk)",
  border: "1px solid var(--rule)",
  borderRadius: 6,
  color: "var(--ink)",
  fontFamily: "var(--font-sans)",
};

export default function VocabularyFilters({
  languageId,
  status,
  search,
  onLanguageChange,
  onStatusChange,
  onSearchChange,
}: VocabularyFiltersProps) {
  const [searchInput, setSearchInput] = useState(search);

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  const currentChip = status;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "0 0 260px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          className="mono"
          style={{
            position: "absolute",
            left: 12,
            fontSize: 12,
            color: "var(--ink-faint)",
          }}
        >
          ⌕
        </span>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search terms or translations…"
          className="input"
          style={{ padding: "8px 12px 8px 30px", fontSize: 13 }}
        />
      </div>

      <select
        value={languageId}
        onChange={(e) => onLanguageChange(e.target.value)}
        style={selectStyle}
      >
        <option value="">All languages</option>
        {languages?.data.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.name}
          </option>
        ))}
      </select>

      {STATUS_CHIPS.map((chip) => {
        const active = currentChip === chip.value;
        return (
          <button
            key={chip.value}
            onClick={() => onStatusChange(chip.value)}
            className="sans"
            style={{
              padding: "6px 12px",
              fontSize: 12,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--paper)" : "var(--ink-soft)",
              border: "1px solid " + (active ? "var(--ink)" : "var(--rule)"),
              borderRadius: 999,
              cursor: "pointer",
              fontWeight: active ? 500 : 400,
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
