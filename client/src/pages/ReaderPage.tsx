import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { normalizeWord, tokenize, WordStatus } from "shared";
import { apiFetch } from "../lib/api";
import { useWordStatuses } from "../hooks/useWordStatuses";
import { useTextSelection } from "../hooks/useTextSelection";
import { useReaderNavigation } from "../hooks/useReaderNavigation";
import TokenizedText from "../components/reader/TokenizedText";
import WordPopup from "../components/reader/WordPopup";
import InlineTranslation from "../components/reader/InlineTranslation";
import AudioPlayer from "../components/reader/AudioPlayer";
import ReaderSettingsPanel from "../components/reader/ReaderSettingsPanel";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useReaderPagination } from "../hooks/useReaderPagination";

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
  const [wordPopupTarget, setWordPopupTarget] = useState<{
    term: string;
    element: HTMLElement;
  } | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // Persistent translations: tokenIdx → translation text
  const [persistedTranslations, setPersistedTranslations] = useState<
    Map<number, string>
  >(new Map());
  const [showTranslations, setShowTranslations] = useState(true);
  const { settings: readerSettings } = useReaderSettings();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<{ data: LessonDetail }>(`/lessons/${lessonId}`),
  });

  const fullText = lesson?.data.textContent ?? "";
  const { page, currentPage, totalPages, goNext, goPrev, perPage, setPerPage } = useReaderPagination(fullText);

  const languageId = lesson?.data.collection.sourceLanguageId ?? null;
  const { getWord, updateWord, version: wordVersion } =
    useWordStatuses(languageId);

  // Wrap setPopup for navigation: also clears WordPopup
  const handleSetPopup = useCallback(
    (p: { term: string; element: HTMLElement } | null) => {
      setPopup(p);
      setWordPopupTarget(null);
    },
    [],
  );

  const { phrasePopup, closePhrasePopup, hoveredTokenIdxRef } =
    useTextSelection(textContainerRef, () => {
      setPopup(null);
      setWordPopupTarget(null);
    });

  const handleExpandPopup = useCallback(() => {
    if (popup) setWordPopupTarget(popup);
  }, [popup]);

  const handleToggleTranslations = useCallback(() => {
    setShowTranslations((prev) => !prev);
  }, []);

  const handlePrevPage = useCallback(() => {
    setPopup(null);
    setWordPopupTarget(null);
    closePhrasePopup();
    goPrev();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goPrev, closePhrasePopup]);

  const handleNextPage = useCallback(() => {
    // Mark all New words on the current page as Known
    const tokens = tokenize(page.text);
    const seen = new Set<string>();
    for (const token of tokens) {
      if (!token.isWord) continue;
      const term = normalizeWord(token.text);
      if (seen.has(term)) continue;
      seen.add(term);
      const word = getWord(term);
      if (!word || word.status === WordStatus.New) {
        updateWord(token.text, { status: WordStatus.Known });
      }
    }

    setPopup(null);
    setWordPopupTarget(null);
    closePhrasePopup();
    goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goNext, closePhrasePopup, page.text, getWord, updateWord]);

  const { syncSelectedIdx } = useReaderNavigation(textContainerRef, {
    popup,
    setPopup: handleSetPopup,
    closePhrasePopup,
    hoveredTokenIdxRef,
    getWord,
    updateWord,
    onExpandPopup: handleExpandPopup,
    onToggleTranslations: handleToggleTranslations,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
  });

  // Fetch translation when a word is clicked
  const persistedTranslationsRef = useRef(persistedTranslations);
  persistedTranslationsRef.current = persistedTranslations;

  useEffect(() => {
    if (!popup || !lesson?.data) return;
    const idx = Number(popup.element.dataset.tokenIdx);
    if (persistedTranslationsRef.current.has(idx)) return;

    const word = getWord(normalizeWord(popup.term));
    if (word?.translation) {
      setPersistedTranslations((prev) => new Map(prev).set(idx, word.translation!));
      return;
    }

    const sourceLang = lesson.data.collection.sourceLanguage?.code;
    const targetLang = lesson.data.collection.targetLanguage?.code;
    if (!sourceLang || !targetLang) return;

    // Show green pill with placeholder immediately
    setPersistedTranslations((prev) => new Map(prev).set(idx, "\u2026"));

    let cancelled = false;
    apiFetch<{ data: { translation: string } }>("/translate/word", {
      method: "POST",
      body: JSON.stringify({ term: popup.term, sourceLang, targetLang }),
    })
      .then((res) => {
        if (!cancelled) {
          setPersistedTranslations((prev) =>
            new Map(prev).set(idx, res.data.translation),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPersistedTranslations((prev) => {
            const next = new Map(prev);
            next.delete(idx);
            return next;
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [popup, getWord, lesson]);

  // Right-click opens WordPopup (no dep array — must re-run when container mounts after loading)
  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    function handleContextMenu(e: MouseEvent) {
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-word-token]",
      );
      if (!el) return;
      e.preventDefault();
      const term = el.dataset.wordText ?? el.textContent ?? "";
      syncSelectedIdx(el);
      closePhrasePopup();
      setPopup({ term, element: el });
      setWordPopupTarget({ term, element: el });
    }

    container.addEventListener("contextmenu", handleContextMenu);
    return () => container.removeEventListener("contextmenu", handleContextMenu);
  });

  // Persist a phrase translation (anchored to first word token)
  const handlePhraseTranslated = useCallback(
    (translation: string) => {
      if (!phrasePopup) return;
      setPersistedTranslations((prev) =>
        new Map(prev).set(phrasePopup.anchorWordIdx, translation),
      );
    },
    [phrasePopup],
  );

  const handleWordClick = useCallback(
    (term: string, element: HTMLElement) => {
      closePhrasePopup();
      syncSelectedIdx(element);
      setWordPopupTarget(null);
      setShowTranslations(true);
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
      if (!wordPopupTarget) return;
      await updateWord(wordPopupTarget.term, data);
    },
    [wordPopupTarget, updateWord],
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
  const currentWordForPopup = wordPopupTarget
    ? getWord(normalizeWord(wordPopupTarget.term))
    : undefined;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <ReaderSettingsPanel perPage={perPage} onPerPageChange={setPerPage} />
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
        style={{
          fontSize: `${readerSettings.fontSize}px`,
          fontFamily: readerSettings.fontFamily,
          textAlign: readerSettings.textAlign,
          lineHeight: readerSettings.lineHeight,
        }}
      >
        <TokenizedText
          text={page.text}
          getWord={getWord}
          wordVersion={wordVersion}
          onWordClick={handleWordClick}
          persistedTranslations={showTranslations ? persistedTranslations : undefined}
          tokenOffset={page.tokenOffset}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &larr; Previous
          </button>
          <span className="text-sm text-gray-500">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages - 1}
            className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next &rarr;
          </button>
        </div>
      )}

      {wordPopupTarget && (
        <WordPopup
          term={wordPopupTarget.term}
          word={currentWordForPopup}
          anchorEl={wordPopupTarget.element}
          sourceLang={lessonData.collection.sourceLanguage?.code}
          targetLang={lessonData.collection.targetLanguage?.code}
          onUpdateWord={handleUpdateWord}
          onClose={() => setWordPopupTarget(null)}
        />
      )}

      {phrasePopup && (
        <InlineTranslation
          text={phrasePopup.phrase}
          type="phrase"
          sourceLang={lessonData.collection.sourceLanguage?.code}
          targetLang={lessonData.collection.targetLanguage?.code}
          anchorRect={phrasePopup.rect}
          onTranslated={handlePhraseTranslated}
        />
      )}
    </div>
  );
}
