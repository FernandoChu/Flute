import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { normalizeWord, tokenize, extractSentence, WordStatus } from "shared";
import { apiFetch } from "../lib/api";
import { useWordStatuses } from "../hooks/useWordStatuses";
import { useTextSelection } from "../hooks/useTextSelection";
import { useReaderNavigation } from "../hooks/useReaderNavigation";
import TokenizedText from "../components/reader/TokenizedText";
import WordPopup from "../components/reader/WordPopup";
import AudioPlayer from "../components/reader/AudioPlayer";
import ReaderSettingsPanel from "../components/reader/ReaderSettingsPanel";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useReaderPagination } from "../hooks/useReaderPagination";

interface SiblingLesson {
  id: string;
  title: string;
  position: number;
}

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
    lessons: SiblingLesson[];
  };
}

function PageProgressBar({
  currentPage,
  totalPages,
  onGoToPage,
}: {
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1 mt-4">
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onGoToPage(i)}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i === currentPage
              ? "bg-blue-600"
              : i < currentPage
                ? "bg-blue-300"
                : "bg-gray-200"
          } hover:opacity-70`}
          title={`Page ${i + 1}`}
        />
      ))}
    </div>
  );
}

function LessonSelector({
  lessons,
  currentLessonId,
}: {
  lessons: SiblingLesson[];
  currentLessonId: string;
}) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentIndex = lessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = lessons[currentIndex];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative mt-2">
      <button
        onClick={() => { if (lessons.length > 1) setOpen((v) => !v); }}
        className={`text-left text-2xl font-bold flex items-start gap-2 ${lessons.length > 1 ? "cursor-pointer" : ""}`}
      >
        <span>{currentLesson?.title}</span>
        {lessons.length > 1 && (
          <span className="shrink-0 mt-1.5 flex items-center gap-1.5 text-sm font-normal text-gray-400">
            {currentIndex + 1}/{lessons.length}
            <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="currentColor"><path d="M3 5l3 3 3-3" /></svg>
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {lessons.map((lesson, i) => (
            <button
              key={lesson.id}
              onClick={() => {
                setOpen(false);
                if (lesson.id !== currentLessonId) navigate(`/reader/${lesson.id}`);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                lesson.id === currentLessonId ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
              }`}
            >
              <span className="text-gray-400 mr-2">{i + 1}.</span>
              {lesson.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonAudio({ lessonId, audioUrl }: { lessonId: string; audioUrl: string | null }) {
  const queryClient = useQueryClient();
  const generateTts = useMutation({
    mutationFn: () =>
      apiFetch<{ data: { audioUrl: string } }>(`/tts/generate/${lessonId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });

  if (audioUrl) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <AudioPlayer src={audioUrl} />
        </div>
        <button
          onClick={() => generateTts.mutate()}
          disabled={generateTts.isPending}
          title="Regenerate audio"
          className="shrink-0 px-2 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {generateTts.isPending ? "..." : "Regen"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => generateTts.mutate()}
        disabled={generateTts.isPending}
        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {generateTts.isPending ? "Generating audio..." : "Generate Audio (TTS)"}
      </button>
      {generateTts.isError && (
        <p className="text-sm text-red-600 mt-2">
          {(generateTts.error as Error).message}
        </p>
      )}
    </div>
  );
}

export default function ReaderPage({ lessonId }: { lessonId: string }) {
  const queryClient = useQueryClient();
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
  // Maps anchor token index → all word token indices in the phrase
  const [phraseGroups, setPhraseGroups] = useState<Map<number, number[]>>(new Map());
  const { settings: readerSettings } = useReaderSettings();

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<{ data: LessonDetail }>(`/lessons/${lessonId}`),
  });

  const fullText = lesson?.data.textContent ?? "";
  const { page, currentPage, totalPages, goNext, goPrev, goToPage, perPage, setPerPage } = useReaderPagination(fullText);

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

  // TTS playback with client-side audio cache
  const ttsAudioCache = useRef(new Map<string, string>());
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPhraseRef = useRef<string | null>(null);

  const handlePlayTts = useCallback(
    async () => {
      const text = lastPhraseRef.current;
      const lang = lesson?.data.collection.sourceLanguage?.code;
      if (!text || !lang) return;

      const cacheKey = `${lang}|${text}`;

      // Stop any currently playing TTS audio
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }

      let blobUrl = ttsAudioCache.current.get(cacheKey);
      if (!blobUrl) {
        try {
          const username = localStorage.getItem("username");
          const res = await fetch("/api/tts/speak", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(username ? { "x-username": username } : {}),
            },
            body: JSON.stringify({ text, lang }),
          });
          if (!res.ok) return;
          const blob = await res.blob();
          blobUrl = URL.createObjectURL(blob);
          ttsAudioCache.current.set(cacheKey, blobUrl);
        } catch {
          return;
        }
      }

      const audio = new Audio(blobUrl);
      ttsAudioRef.current = audio;
      audio.play();
    },
    [lesson],
  );

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
        const contextSentence = extractSentence(page.text, term) ?? undefined;
        updateWord(token.text, { status: WordStatus.Known, contextSentence });
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
    onPlayTts: handlePlayTts,
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

    const term = popup.term;
    let cancelled = false;
    apiFetch<{ data: { translation: string } }>("/translate/word", {
      method: "POST",
      body: JSON.stringify({ term, sourceLang, targetLang }),
    })
      .then((res) => {
        if (!cancelled) {
          setPersistedTranslations((prev) =>
            new Map(prev).set(idx, res.data.translation),
          );
          const existing = getWord(term);
          const contextSentence = !existing?.contextSentence
            ? extractSentence(page.text, term) ?? undefined
            : undefined;
          updateWord(term, { translation: res.data.translation, contextSentence });
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
  }, [popup, getWord, updateWord, lesson, page.text]);

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

  // Fetch phrase translation (mirrors single-word flow: placeholder → real translation)
  const phrasePopupRef = useRef(phrasePopup);
  useEffect(() => {
    if (!phrasePopup || !lesson?.data) return;
    // Avoid re-processing the same selection (closePhrasePopup nulls phrasePopup,
    // triggering a re-run that early-returns, but guard against edge cases)
    if (phrasePopup === phrasePopupRef.current) return;
    phrasePopupRef.current = phrasePopup;

    const { anchorWordIdx, allTokenIndices, phrase } = phrasePopup;
    lastPhraseRef.current = phrase;
    const sourceLang = lesson.data.collection.sourceLanguage?.code;
    const targetLang = lesson.data.collection.targetLanguage?.code;

    // Immediately persist phrase group with placeholder so in-flow space is created
    setPhraseGroups((prev) => new Map(prev).set(anchorWordIdx, allTokenIndices));
    setPersistedTranslations((prev) => new Map(prev).set(anchorWordIdx, "\u2026"));
    closePhrasePopup();

    if (!sourceLang || !targetLang) return;

    apiFetch<{ data: { translation: string } }>("/translate/sentence", {
      method: "POST",
      body: JSON.stringify({ sentence: phrase, sourceLang, targetLang }),
    })
      .then((res) => {
        setPersistedTranslations((prev) =>
          new Map(prev).set(anchorWordIdx, res.data.translation),
        );
      })
      .catch(() => {
        setPersistedTranslations((prev) => {
          const next = new Map(prev);
          next.delete(anchorWordIdx);
          return next;
        });
        setPhraseGroups((prev) => {
          const next = new Map(prev);
          next.delete(anchorWordIdx);
          return next;
        });
      });
  }, [phrasePopup, lesson, closePhrasePopup]);

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
        lastPhraseRef.current = term;
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
      const existing = getWord(wordPopupTarget.term);
      const contextSentence = !existing?.contextSentence
        ? extractSentence(page.text, wordPopupTarget.term) ?? undefined
        : undefined;
      await updateWord(wordPopupTarget.term, { ...data, contextSentence });
    },
    [wordPopupTarget, updateWord, page.text, getWord],
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
        <LessonSelector
          lessons={lessonData.collection.lessons}
          currentLessonId={lessonId}
        />
      </div>

      <LessonAudio lessonId={lessonId} audioUrl={lessonData.audioUrl} />

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
          onRemoveTranslation={(idx) => {
            setPersistedTranslations((prev) => {
              const next = new Map(prev);
              next.delete(idx);
              return next;
            });
          }}
          phraseGroups={showTranslations ? phraseGroups : undefined}
          tokenOffset={page.tokenOffset}
        />
      </div>

      {totalPages > 1 && (
        <>
          <PageProgressBar
            currentPage={currentPage}
            totalPages={totalPages}
            onGoToPage={goToPage}
          />
          <div className="flex items-center justify-between mt-2">
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
        </>
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

    </div>
  );
}
