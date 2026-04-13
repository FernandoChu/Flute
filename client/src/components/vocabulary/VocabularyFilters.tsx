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

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "0", label: "New" },
  { value: "1", label: "Learning 1" },
  { value: "2", label: "Learning 2" },
  { value: "3", label: "Learning 3" },
  { value: "4", label: "Learning 4" },
  { value: "5", label: "Known" },
  { value: "6", label: "Ignored" },
];

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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange]);

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={languageId}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All languages</option>
        {languages?.data.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.name}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Search words..."
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
      />
    </div>
  );
}
