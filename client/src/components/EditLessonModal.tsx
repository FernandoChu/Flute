import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  letterSpacing: "0.1em",
  color: "var(--ink-faint)",
  textTransform: "uppercase",
  marginBottom: 6,
};

export default function EditLessonModal({
  lessonId,
  initialTitle,
  initialTextContent,
  onClose,
}: {
  lessonId: string;
  initialTitle: string;
  initialTextContent: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [textContent, setTextContent] = useState(initialTextContent);
  const [error, setError] = useState("");

  const updateLesson = useMutation({
    mutationFn: () =>
      apiFetch<{ data: { id: string } }>(`/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify({ title, textContent }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    updateLesson.mutate();
  };

  const hasChanges =
    title !== initialTitle || textContent !== initialTextContent;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.4)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "90px 16px 32px",
        zIndex: 100,
        overflowY: "auto",
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
          padding: 24,
          width: "100%",
          maxWidth: 560,
          maxHeight: "calc(100vh - 120px)",
          display: "flex",
          flexDirection: "column",
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
          Edit lesson
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
          Revise the text.
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flex: 1,
          }}
        >
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
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              flex: 1,
            }}
          >
            <label style={labelStyle}>Text content</label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={10}
              className="input"
              style={{
                flex: 1,
                minHeight: 160,
                resize: "vertical",
                lineHeight: 1.5,
                fontFamily: "var(--font-body)",
              }}
              required
            />
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
              disabled={updateLesson.isPending || !hasChanges}
              className="btn btn-primary sans"
            >
              {updateLesson.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
