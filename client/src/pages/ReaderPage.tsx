import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { normalizeWord } from "shared";
import { apiFetch } from "../lib/api";
import { useWordStatuses } from "../hooks/useWordStatuses";
import TokenizedText from "../components/reader/TokenizedText";
import WordPopup from "../components/reader/WordPopup";
import PhrasePopup from "../components/reader/PhrasePopup";
import AudioPlayer from "../components/reader/AudioPlayer";

interface LessonDetail {
  id: string;
  title: string;
  textContent: string;
  audioUrl: string | null;
  collection: {
    id: string;
    title: string;
    sourceLanguageId: number;
    targetLanguageId: number;
    sourceLanguage?: { code: string };
    targetLanguage?: { code: string };
  };
}

export default function ReaderPage({ lessonId }: { lessonId: string }) {
  const [popup, setPopup] = useState<{
    term: string;
    element: HTMLElement;
  } | null>(null);
  const [phrasePopup, setPhrasePopup] = useState<{
    phrase: string;
    rect: DOMRect;
  } | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<{ data: LessonDetail }>(`/lessons/${lessonId}`),
  });

  const languageId = lesson?.data.collection.sourceLanguageId ?? null;
  const { getWord, updateWord, version: wordVersion } = useWordStatuses(languageId);

  // -- Custom whole-word selection via mousedown/mousemove/mouseup --
  const dragStartIdx = useRef<number | null>(null);
  const isDragging = useRef(false);

  function getTokenElements(): HTMLElement[] {
    if (!textContainerRef.current) return [];
    return Array.from(
      textContainerRef.current.querySelectorAll<HTMLElement>("[data-token-idx]"),
    );
  }

  function tokenIdxFromEvent(e: MouseEvent): number | null {
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-token-idx]",
    );
    if (!el) return null;
    return Number(el.dataset.tokenIdx);
  }

  function applyHighlight(startIdx: number, endIdx: number) {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    for (const el of getTokenElements()) {
      const idx = Number(el.dataset.tokenIdx);
      const inRange = idx >= lo && idx <= hi;
      el.classList.toggle("phrase-selected", inRange);
      el.classList.toggle("phrase-selected-start", inRange && idx === lo);
      el.classList.toggle("phrase-selected-end", inRange && idx === hi);
    }
  }

  function clearHighlight() {
    for (const el of getTokenElements()) {
      el.classList.remove(
        "phrase-selected",
        "phrase-selected-start",
        "phrase-selected-end",
      );
    }
  }

  function finalizeSelection() {
    const highlighted = getTokenElements().filter((el) =>
      el.classList.contains("phrase-selected"),
    );
    if (highlighted.length < 2) {
      clearHighlight();
      return;
    }

    // Only accept if there's more than one *word* token selected
    const wordTokens = highlighted.filter((el) => el.hasAttribute("data-word-token"));
    if (wordTokens.length < 2) {
      clearHighlight();
      return;
    }

    const phrase = highlighted.map((el) => el.textContent ?? "").join("");
    const trimmed = phrase.trim();
    if (!trimmed) {
      clearHighlight();
      return;
    }

    // Build a rect spanning all highlighted tokens
    const first = highlighted[0].getBoundingClientRect();
    const last = highlighted[highlighted.length - 1].getBoundingClientRect();
    const rect = new DOMRect(
      first.left,
      first.top,
      last.right - first.left,
      last.bottom - first.top,
    );

    setPopup(null);
    setPhrasePopup({ phrase: trimmed, rect });
  }

  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      const idx = tokenIdxFromEvent(e);
      if (idx === null) return;

      // Clear any existing phrase highlight from a previous selection
      clearHighlight();

      // Begin tracking — we don't know yet if this is a click or drag
      dragStartIdx.current = idx;
      isDragging.current = false;
    }

    function onMouseMove(e: MouseEvent) {
      if (dragStartIdx.current === null) return;

      const idx = tokenIdxFromEvent(e);
      if (idx === null) return;

      // Start dragging once the cursor moves to a different token
      if (idx !== dragStartIdx.current) {
        isDragging.current = true;
      }

      if (isDragging.current) {
        // Prevent native selection while dragging
        window.getSelection()?.removeAllRanges();
        applyHighlight(dragStartIdx.current, idx);
      }
    }

    function onMouseUp(_e: MouseEvent) {
      if (isDragging.current) {
        finalizeSelection();
      }
      dragStartIdx.current = null;
      isDragging.current = false;
    }

    container.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  });

  const closePhrasePopup = useCallback(() => {
    clearHighlight();
    setPhrasePopup(null);
  }, []);

  const handleWordClick = useCallback(
    (term: string, element: HTMLElement) => {
      closePhrasePopup();
      setPopup((prev) => {
        // Toggle off if clicking the same word
        if (prev && normalizeWord(prev.term) === normalizeWord(term)) {
          return null;
        }
        return { term, element };
      });
    },
    [closePhrasePopup],
  );

  const handleUpdateWord = useCallback(
    async (data: {
      translation?: string;
      status?: number;
      notes?: string;
    }) => {
      if (!popup) return;
      await updateWord(popup.term, data);
    },
    [popup, updateWord],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Lesson not found</p>
      </div>
    );
  }

  const { data: lessonData } = lesson;
  const currentWord = popup
    ? getWord(normalizeWord(popup.term))
    : undefined;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; {lessonData.collection.title}
        </Link>
        <h1 className="text-2xl font-bold mt-2">{lessonData.title}</h1>
      </div>

      {lessonData.audioUrl && <AudioPlayer src={lessonData.audioUrl} />}

      <div
        ref={textContainerRef}
        className="bg-white rounded-lg border border-gray-200 p-6 select-none"
      >
        <TokenizedText
          text={lessonData.textContent}
          getWord={getWord}
          wordVersion={wordVersion}
          onWordClick={handleWordClick}
        />
      </div>

      {popup && (
        <WordPopup
          term={popup.term}
          word={currentWord}
          anchorEl={popup.element}
          sourceLang={lessonData.collection.sourceLanguage?.code}
          targetLang={lessonData.collection.targetLanguage?.code}
          onUpdateWord={handleUpdateWord}
          onClose={() => setPopup(null)}
        />
      )}

      {phrasePopup && (
        <PhrasePopup
          phrase={phrasePopup.phrase}
          anchorRect={phrasePopup.rect}
          sourceLang={lessonData.collection.sourceLanguage?.code}
          targetLang={lessonData.collection.targetLanguage?.code}
          onClose={closePhrasePopup}
        />
      )}
    </div>
  );
}
