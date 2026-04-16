import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";

interface Language {
  id: number;
  code: string;
  name: string;
}

interface DictionaryEntry {
  languageId: number;
  label: string;
  urlTemplate: string;
}

export default function DictionarySettings() {
  const queryClient = useQueryClient();

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  const { data: dictionaries } = useQuery({
    queryKey: ["dictionaries"],
    queryFn: () => apiFetch<{ data: DictionaryEntry[] }>("/settings/dictionaries"),
  });

  const [entries, setEntries] = useState<DictionaryEntry[]>([]);

  useEffect(() => {
    if (dictionaries?.data) {
      setEntries(dictionaries.data.map((d) => ({ ...d })));
    }
  }, [dictionaries]);

  const saveMutation = useMutation({
    mutationFn: (data: { entries: DictionaryEntry[] }) =>
      apiFetch("/settings/dictionaries", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dictionaries"] });
    },
  });

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { languageId: languages?.data[0]?.id ?? 1, label: "", urlTemplate: "" },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof DictionaryEntry, value: string | number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  };

  const handleSave = () => {
    const valid = entries.filter((e) => e.label.trim() && e.urlTemplate.trim());
    saveMutation.mutate({ entries: valid });
  };

  // Group entries by language for display
  const usedLanguageIds = [...new Set(entries.map((e) => e.languageId))];

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4">Dictionary Links</h2>
      <p className="text-sm text-gray-600 mb-4">
        Add dictionary URLs per language. Use <code className="bg-gray-100 px-1 rounded text-xs">[FLUTE]</code> as a
        placeholder for the word. When you right-click a word in the reader,
        you can open it in any configured dictionary.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">No dictionaries configured.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {entries.map((entry, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                value={entry.languageId}
                onChange={(e) => updateEntry(i, "languageId", Number(e.target.value))}
                className="w-36 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languages?.data.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={entry.label}
                onChange={(e) => updateEntry(i, "label", e.target.value)}
                placeholder="Label (e.g. Van Dale)"
                className="w-36 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={entry.urlTemplate}
                onChange={(e) => updateEntry(i, "urlTemplate", e.target.value)}
                placeholder="https://....[FLUTE]..."
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => removeEntry(i)}
                className="px-2 py-1.5 text-red-500 hover:text-red-700 text-sm"
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={addEntry}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Add dictionary
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>
        {saveMutation.isSuccess && (
          <p className="text-sm text-green-600">Saved.</p>
        )}
        {saveMutation.isError && (
          <p className="text-sm text-red-600">
            {(saveMutation.error as Error).message}
          </p>
        )}
      </div>
    </section>
  );
}
