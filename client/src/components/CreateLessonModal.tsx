import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type Mode = "paste" | "upload";

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
      throw new Error(body?.error?.message || `Audio upload failed: ${res.status}`);
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
      // Upload audio to the first created lesson if provided
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
    if (mode === "paste") {
      createPaste.mutate();
    } else {
      uploadFile.mutate();
    }
  };

  const isPending = createPaste.isPending || uploadFile.isPending;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Add Lesson</h2>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={`px-3 py-1 rounded text-sm ${mode === "paste" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} transition-colors`}
          >
            Paste Text
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-3 py-1 rounded text-sm ${mode === "upload" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} transition-colors`}
          >
            Upload File
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "paste" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Content
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  required
                />
              </div>
            </>
          )}

          {mode === "upload" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File (.txt, .epub, .srt)
              </label>
              <input
                type="file"
                accept=".txt,.epub,.srt"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full"
                required
              />
              {file && (
                <p className="text-sm text-gray-500 mt-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audio (optional)
            </label>
            <input
              type="file"
              accept=".mp3,.wav,.ogg,.m4a"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="w-full"
            />
            {audioFile && (
              <p className="text-sm text-gray-500 mt-1">
                {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)} MB)
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? mode === "upload"
                  ? "Uploading..."
                  : "Creating..."
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
