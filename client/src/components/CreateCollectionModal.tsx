import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { extractEpubTitle } from "../lib/epub-metadata";

interface Language {
  id: number;
  code: string;
  name: string;
}

interface LanguagePrefs {
  nativeLanguageId: number | null;
  studyLanguageId: number | null;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 13,
  background: "var(--paper-sunk)",
  border: "1px solid var(--rule)",
  borderRadius: 6,
  color: "var(--ink)",
  fontFamily: "var(--font-sans)",
};

export default function CreateCollectionModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [sourceLanguageId, setSourceLanguageId] = useState("");
  const [targetLanguageId, setTargetLanguageId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  const { data: langPrefs } = useQuery({
    queryKey: ["language-prefs"],
    queryFn: () => apiFetch<{ data: LanguagePrefs }>("/settings/languages"),
  });

  useEffect(() => {
    if (langPrefs?.data) {
      if (langPrefs.data.studyLanguageId && !sourceLanguageId) {
        setSourceLanguageId(langPrefs.data.studyLanguageId.toString());
      }
      if (langPrefs.data.nativeLanguageId && !targetLanguageId) {
        setTargetLanguageId(langPrefs.data.nativeLanguageId.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langPrefs]);

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ data: { id: string } }>("/collections", {
        method: "POST",
        body: JSON.stringify({
          title,
          sourceLanguageId: Number(sourceLanguageId),
          targetLanguageId: Number(targetLanguageId),
        }),
      });

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const username = localStorage.getItem("username");
        const uploadRes = await fetch(
          `/api/collections/${res.data.id}/lessons/upload`,
          {
            method: "POST",
            headers: username ? { "x-username": username } : {},
            body: formData,
          },
        );
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => null);
          throw new Error(
            body?.error?.message || `File upload failed: ${uploadRes.status}`,
          );
        }
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    create.mutate();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--rule)",
          borderRadius: 10,
          boxShadow: "var(--shadow-lg)",
          padding: 28,
          width: "100%",
          maxWidth: 460,
          margin: "0 16px",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          New collection
        </div>
        <h2
          className="display"
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          Start a library shelf.
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              required
              autoFocus
              placeholder="e.g. Borges — Ficciones"
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>I'm learning</label>
            <select
              value={sourceLanguageId}
              onChange={(e) => setSourceLanguageId(e.target.value)}
              style={selectStyle}
              required
            >
              <option value="">Select language</option>
              {languages?.data.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Translate to</label>
            <select
              value={targetLanguageId}
              onChange={(e) => setTargetLanguageId(e.target.value)}
              style={selectStyle}
              required
            >
              <option value="">Select language</option>
              {languages?.data.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Import file (optional)</label>
            <input
              type="file"
              accept=".txt,.epub,.srt"
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && /\.epub$/i.test(f.name) && !title.trim()) {
                  try {
                    const extracted = await extractEpubTitle(f);
                    if (extracted) {
                      setTitle((prev) => (prev.trim() ? prev : extracted));
                    }
                  } catch {
                    // fall through — user can type a title manually
                  }
                }
              }}
              className="sans"
              style={{
                width: "100%",
                fontSize: 12,
                color: "var(--ink-soft)",
              }}
            />
            <p
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                letterSpacing: "0.04em",
                marginTop: 6,
              }}
            >
              .txt, .epub, or .srt — lessons created automatically
            </p>
            {file && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  marginTop: 4,
                }}
              >
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {error && (
            <p
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--accent)",
                letterSpacing: "0.04em",
                marginBottom: 12,
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="btn btn-primary sans"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
