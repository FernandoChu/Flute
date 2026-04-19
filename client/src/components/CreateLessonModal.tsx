import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type Mode = "paste" | "upload";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  marginBottom: 6,
};

export default function CreateLessonModal({
  collectionId,
  onClose,
}: {
  collectionId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("paste");
  const [title, setTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function uploadAudio(lessonId: string) {
    if (!audioFile) return;
    const formData = new FormData();
    formData.append("audio", audioFile);
    const username = localStorage.getItem("username");
    const res = await fetch(`/api/lessons/${lessonId}/audio`, {
      method: "POST",
      headers: username ? { "x-username": username } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        body?.error?.message || `Audio upload failed: ${res.status}`,
      );
    }
  }

  const createPaste = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ data: { id: string } }>(
        `/collections/${collectionId}/lessons`,
        {
          method: "POST",
          body: JSON.stringify({ title, textContent }),
        },
      );
      await uploadAudio(res.data.id);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const uploadFile = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", file);
      const username = localStorage.getItem("username");
      const res = await fetch(
        `/api/collections/${collectionId}/lessons/upload`,
        {
          method: "POST",
          headers: username ? { "x-username": username } : {},
          body: formData,
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message || `Upload failed: ${res.status}`);
      }
      const data = await res.json();
      if (audioFile && data.data?.[0]?.id) {
        await uploadAudio(data.data[0].id);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "paste") createPaste.mutate();
    else uploadFile.mutate();
  };

  const isPending = createPaste.isPending || uploadFile.isPending;

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
          maxWidth: 560,
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
          Add lesson
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
          A new chapter.
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {(
            [
              { key: "paste", label: "Paste text" },
              { key: "upload", label: "Upload file" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className="sans"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                background: mode === m.key ? "var(--ink)" : "transparent",
                color: mode === m.key ? "var(--paper)" : "var(--ink-soft)",
                border:
                  "1px solid " +
                  (mode === m.key ? "var(--ink)" : "var(--rule)"),
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: mode === m.key ? 500 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "paste" ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Text content</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={10}
                  className="input"
                  style={{ resize: "vertical", lineHeight: 1.5 }}
                  required
                />
              </div>
            </>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>File (.txt, .epub, .srt)</label>
              <input
                type="file"
                accept=".txt,.epub,.srt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sans"
                style={{
                  width: "100%",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                }}
                required
              />
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
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Audio (optional)</label>
            <input
              type="file"
              accept=".mp3,.wav,.ogg,.m4a"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="sans"
              style={{
                width: "100%",
                fontSize: 12,
                color: "var(--ink-soft)",
              }}
            />
            {audioFile && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--ink-soft)",
                  marginTop: 4,
                }}
              >
                {audioFile.name} (
                {(audioFile.size / (1024 * 1024)).toFixed(1)} MB)
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
            <button type="button" onClick={onClose} className="btn sans">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary sans"
            >
              {isPending
                ? mode === "upload"
                  ? "Uploading…"
                  : "Creating…"
                : mode === "upload"
                  ? "Upload"
                  : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
