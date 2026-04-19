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

const selectStyle: React.CSSProperties = {
  width: 140,
  padding: "8px 10px",
  fontSize: 12,
  background: "var(--paper-sunk)",
  border: "1px solid var(--rule)",
  borderRadius: 6,
  color: "var(--ink)",
  fontFamily: "var(--font-sans)",
};

export default function DictionarySettings() {
  const queryClient = useQueryClient();

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  const { data: dictionaries } = useQuery({
    queryKey: ["dictionaries"],
    queryFn: () =>
      apiFetch<{ data: DictionaryEntry[] }>("/settings/dictionaries"),
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
      {
        languageId: languages?.data[0]?.id ?? 1,
        label: "",
        urlTemplate: "",
      },
    ]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (
    index: number,
    field: keyof DictionaryEntry,
    value: string | number,
  ) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  };

  const handleSave = () => {
    const valid = entries.filter(
      (e) => e.label.trim() && e.urlTemplate.trim(),
    );
    saveMutation.mutate({ entries: valid });
  };

  return (
    <div>
      {entries.length === 0 && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          No dictionaries configured.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {entries.map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <select
              value={entry.languageId}
              onChange={(e) =>
                updateEntry(i, "languageId", Number(e.target.value))
              }
              style={selectStyle}
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
              className="input"
              style={{ width: 160, fontSize: 12, padding: "8px 10px" }}
            />
            <input
              type="text"
              value={entry.urlTemplate}
              onChange={(e) => updateEntry(i, "urlTemplate", e.target.value)}
              placeholder="https://....[FLUTE]..."
              className="input"
              style={{ flex: 1, fontSize: 12, padding: "8px 10px" }}
            />
            <button
              onClick={() => removeEntry(i)}
              className="btn btn-ghost"
              style={{
                fontSize: 14,
                padding: "4px 8px",
                color: "var(--accent)",
              }}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={addEntry} className="btn sans" style={{ fontSize: 12 }}>
          + Add dictionary
        </button>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="btn btn-primary sans"
          style={{ fontSize: 12 }}
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </button>
        {saveMutation.isSuccess && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "oklch(0.4 0.12 150)",
              letterSpacing: "0.04em",
            }}
          >
            Saved.
          </span>
        )}
        {saveMutation.isError && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--accent)",
              letterSpacing: "0.04em",
            }}
          >
            {(saveMutation.error as Error).message}
          </span>
        )}
      </div>

      <p
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          marginTop: 12,
          fontStyle: "italic",
        }}
      >
        Use{" "}
        <code
          style={{
            background: "var(--paper-sunk)",
            padding: "1px 4px",
            borderRadius: 3,
            fontFamily: "var(--font-mono)",
            fontStyle: "normal",
          }}
        >
          [FLUTE]
        </code>{" "}
        as the word placeholder.
      </p>
    </div>
  );
}
