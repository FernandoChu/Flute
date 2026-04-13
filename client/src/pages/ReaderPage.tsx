import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { normalizeWord } from "shared";
import { apiFetch } from "../lib/api";
import { useWordStatuses } from "../hooks/useWordStatuses";
import { useTextSelection } from "../hooks/useTextSelection";
import { useReaderNavigation } from "../hooks/useReaderNavigation";
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
  const textContainerRef = useRef<HTMLDivElement>(null);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<{ data: LessonDetail }>(`/lessons/${lessonId}`),
  });

  const languageId = lesson?.data.collection.sourceLanguageId ?? null;
  const { getWord, updateWord, version: wordVersion } = useWordStatuses(languageId);

  const { phrasePopup, closePhrasePopup, hoveredTokenIdxRef } = useTextSelection(
    textContainerRef,
    () => setPopup(null),
  );

  const { syncSelectedIdx } = useReaderNavigation(textContainerRef, {
    popup,
    setPopup,
    closePhrasePopup,
    hoveredTokenIdxRef,
    getWord,
    updateWord,
  });

  const handleWordClick = useCallback(
    (term: string, element: HTMLElement) => {
      closePhrasePopup();
      syncSelectedIdx(element);
      setPopup((prev) => {
        if (prev && normalizeWord(prev.term) === normalizeWord(term)) {
          return null;
        }
        return { term, element };
      });
    },
    [closePhrasePopup, syncSelectedIdx],
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
