import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import EditLessonModal from "../components/EditLessonModal";
import {
  useReaderSettings,
  FONT_FAMILY_FOR_BODY_FONT,
  COL_WIDTH_VAR,
} from "../hooks/useReaderSettings";
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
  readingMinutes,
  wordCount,
  pageFraction,
  onGoToPage,
}: {
  currentPage: number;
  totalPages: number;
  readingMinutes: number;
  wordCount: number;
  pageFraction: number;
  onGoToPage: (n: number) => void;
}) {
  if (totalPages <= 1) {
    return (
      <div
        style={{
          margin: "24px 0 0",
          display: "flex",
          alignItems: "center",
          gap: 12,
          color: "var(--rule)",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
        <div
          className="display"
          style={{
            fontSize: 16,
            color: "var(--ink-faint)",
            letterSpacing: "0.3em",
          }}
        >
          ❧
        </div>
        <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
      </div>
    );
  }

  const totalMinutes = Math.max(1, Math.round(wordCount / 180));
  const pagesRemaining = totalPages - currentPage - 1;
  const minRemaining = Math.max(
    1,
    Math.round(readingMinutes + (pagesRemaining * totalMinutes) / totalPages),
  );
  const overallFraction =
    totalPages === 0
      ? 0
      : (currentPage + Math.min(Math.max(pageFraction, 0), 1)) / totalPages;
  const pct = Math.round(overallFraction * 100);

  return (
    <div style={{ margin: "26px 0 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
          }}
        >
          Page {currentPage + 1} of {totalPages} · ~{minRemaining} min remaining
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            letterSpacing: "0.08em",
          }}
        >
          {pct}% through
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, height: 4 }}>
        {Array.from({ length: totalPages }).map((_, i) => {
          const read = i < currentPage;
          const current = i === currentPage;
          const fillPct = Math.round(
            Math.min(Math.max(pageFraction, 0), 1) * 100,
          );
          return (
            <button
              key={i}
              onClick={() => onGoToPage(i)}
              title={`Page ${i + 1}`}
              style={{
                flex: 1,
                height: "100%",
                background: read ? "var(--ink)" : "var(--rule-soft)",
                border: 0,
                padding: 0,
                borderRadius: 1,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              {current && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${fillPct}%`,
                    background: "var(--accent)",
                    borderRadius: 1,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
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

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => {
          if (lessons.length > 1) setOpen((v) => !v);
        }}
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          background: "transparent",
          border: 0,
          cursor: lessons.length > 1 ? "pointer" : "default",
          padding: 0,
        }}
      >
        Lesson {currentIndex + 1} of {lessons.length}
        {lessons.length > 1 && (
          <span style={{ marginLeft: 6, opacity: 0.6 }}>▾</span>
        )}
      </button>
      {open && (
        <div
          className="nice-scroll"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            minWidth: 280,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            zIndex: 50,
            padding: 4,
          }}
        >
          {lessons.map((lesson, i) => (
            <button
              key={lesson.id}
              onClick={() => {
                setOpen(false);
                if (lesson.id !== currentLessonId) navigate(`/reader/${lesson.id}`);
              }}
              className="sans"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                background:
                  lesson.id === currentLessonId ? "var(--paper-sunk)" : "transparent",
                color:
                  lesson.id === currentLessonId ? "var(--ink)" : "var(--ink-soft)",
                fontWeight: lesson.id === currentLessonId ? 600 : 400,
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              <span
                className="mono"
                style={{
                  color: "var(--ink-faint)",
                  marginRight: 8,
                  fontSize: 11,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {lesson.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function useGenerateTts(lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ data: { audioUrl: string } }>(`/tts/generate/${lessonId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    },
  });
}

export default function ReaderPage({ lessonId }: { lessonId: string }) {
  const [popup, setPopup] = useState<{
    term: string;
    element: HTMLElement;
  } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [wordPopupTarget, setWordPopupTarget] = useState<{
    term: string;
    element: HTMLElement;
  } | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const [persistedTranslations, setPersistedTranslations] = useState<
    Map<number, string>
  >(new Map());
  const [showTranslations, setShowTranslations] = useState(true);
  const [phraseGroups, setPhraseGroups] = useState<Map<number, number[]>>(
    new Map(),
  );
  const { settings: readerSettings } = useReaderSettings();
  const generateTts = useGenerateTts(lessonId);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<{ data: LessonDetail }>(`/lessons/${lessonId}`),
  });

  const fullText = lesson?.data.textContent ?? "";
  const {
    page,
    currentPage,
    totalPages,
    goNext,
    goPrev,
    goToPage,
    perPage,
    setPerPage,
  } = useReaderPagination(fullText);

  const languageId = lesson?.data.collection.sourceLanguageId ?? null;

  const { data: dictionaryData } = useQuery({
    queryKey: ["dictionaries"],
    queryFn: () =>
      apiFetch<{
        data: { languageId: number; label: string; urlTemplate: string }[];
      }>("/settings/dictionaries"),
  });
  const dictionaryLinks = useMemo(
    () =>
      dictionaryData?.data.filter((d) => d.languageId === languageId) ?? [],
    [dictionaryData, languageId],
  );
  const { getWord, updateWord, version: wordVersion } = useWordStatuses(languageId);

  const handleSetPopup = useCallback(
    (p: { term: string; element: HTMLElement } | null) => {
      setPopup(p);
      setWordPopupTarget(null);
    },
    [],
  );

  const { phrasePopup, closePhrasePopup, hoveredTokenIdxRef } = useTextSelection(
    textContainerRef,
    () => {
      setPopup(null);
      setWordPopupTarget(null);
    },
  );

  const handleExpandPopup = useCallback(() => {
    if (popup) setWordPopupTarget(popup);
  }, [popup]);

  const handleToggleTranslations = useCallback(() => {
    setShowTranslations((prev) => !prev);
  }, []);

  const handleClearTranslations = useCallback(() => {
    setPersistedTranslations(new Map());
    setPhraseGroups(new Map());
  }, []);

  const ttsAudioCache = useRef(new Map<string, string>());
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPhraseRef = useRef<string | null>(null);

  const handlePlayTts = useCallback(async () => {
    const text = lastPhraseRef.current;
    const lang = lesson?.data.collection.sourceLanguage?.code;
    if (!text || !lang) return;

    const cacheKey = `${lang}|${text}`;

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
  }, [lesson]);

  const handlePrevPage = useCallback(() => {
    setPopup(null);
    setWordPopupTarget(null);
    closePhrasePopup();
    goPrev();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goPrev, closePhrasePopup]);

  const handleNextPage = useCallback(() => {
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
        updateWord(token.text, {
          status: WordStatus.Known,
          contextSentence,
        });
      }
    }

    setPopup(null);
    setWordPopupTarget(null);
    closePhrasePopup();
    goNext();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [goNext, closePhrasePopup, page.text, getWord, updateWord]);

  const handleDone = useCallback(() => {
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
        updateWord(token.text, {
          status: WordStatus.Known,
          contextSentence,
        });
      }
    }
  }, [page.text, getWord, updateWord]);

  const { syncSelectedIdx } = useReaderNavigation(textContainerRef, {
    popup,
    setPopup: handleSetPopup,
    closePhrasePopup,
    hoveredTokenIdxRef,
    getWord,
    updateWord,
    onExpandPopup: handleExpandPopup,
    onToggleTranslations: handleToggleTranslations,
    onClearTranslations: handleClearTranslations,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onPlayTts: handlePlayTts,
  });

  const persistedTranslationsRef = useRef(persistedTranslations);
  persistedTranslationsRef.current = persistedTranslations;

  useEffect(() => {
    if (!popup || !lesson?.data) return;
    const idx = Number(popup.element.dataset.tokenIdx);
    if (persistedTranslationsRef.current.has(idx)) return;

    const word = getWord(normalizeWord(popup.term));
    if (word?.translation) {
      setPersistedTranslations((prev) =>
        new Map(prev).set(idx, word.translation!),
      );
      return;
    }

    const sourceLang = lesson.data.collection.sourceLanguage?.code;
    const targetLang = lesson.data.collection.targetLanguage?.code;
    if (!sourceLang || !targetLang) return;

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
          updateWord(term, {
            translation: res.data.translation,
            contextSentence,
          });
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
    return () =>
      container.removeEventListener("contextmenu", handleContextMenu);
  });

  const phrasePopupRef = useRef(phrasePopup);
  useEffect(() => {
    if (!phrasePopup || !lesson?.data) return;
    if (phrasePopup === phrasePopupRef.current) return;
    phrasePopupRef.current = phrasePopup;

    const { anchorWordIdx, allTokenIndices, phrase } = phrasePopup;
    lastPhraseRef.current = phrase;
    const sourceLang = lesson.data.collection.sourceLanguage?.code;
    const targetLang = lesson.data.collection.targetLanguage?.code;

    setPhraseGroups((prev) =>
      new Map(prev).set(anchorWordIdx, allTokenIndices),
    );
    setPersistedTranslations((prev) =>
      new Map(prev).set(anchorWordIdx, "\u2026"),
    );
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

  const wordCount = useMemo(() => {
    if (!page?.text) return 0;
    let n = 0;
    for (const t of tokenize(page.text)) if (t.isWord) n++;
    return n;
  }, [page?.text]);

  if (isLoading) {
    return (
      <div
        className="mono"
        style={{
          padding: "80px 48px",
          textAlign: "center",
          color: "var(--ink-faint)",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Loading lesson…
      </div>
    );
  }

  if (!lesson?.data) {
    return (
      <div
        className="mono"
        style={{
          padding: "80px 48px",
          textAlign: "center",
          color: "var(--ink-faint)",
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Lesson not found
      </div>
    );
  }

  const { data: lessonData } = lesson;
  const currentWordForPopup = wordPopupTarget
    ? getWord(normalizeWord(wordPopupTarget.term))
    : undefined;

  const lessons = lessonData.collection.lessons;
  const currentIdx = lessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;

  const bodyFont = FONT_FAMILY_FOR_BODY_FONT[readerSettings.bodyFont];
  const colMax = COL_WIDTH_VAR[readerSettings.colWidth];

  const readingMinutes = Math.max(1, Math.round(wordCount / 180));

  return (
    <div
      style={{
        minHeight: "calc(100vh - 58px)",
        position: "relative",
        zIndex: 1,
      }}
      data-status-viz={readerSettings.statusViz}
    >
      <ReaderSettingsPanel
        perPage={perPage}
        onPerPageChange={setPerPage}
        hasAudio={!!lessonData.audioUrl}
        isGenerating={generateTts.isPending}
        generateError={generateTts.isError ? (generateTts.error as Error) : null}
        onGenerateAudio={() => generateTts.mutate()}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Breadcrumb / lesson header */}
        <div
          style={{
            padding: "28px 48px 0",
            maxWidth: 1100,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{ color: "var(--ink-faint)", textDecoration: "none" }}
            >
              Library
            </Link>
            <span>·</span>
            <span>{lessonData.collection.title}</span>
            <span>·</span>
            <LessonSelector
              lessons={lessons}
              currentLessonId={lessonId}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 18,
              flexWrap: "wrap",
              rowGap: 6,
            }}
          >
            <h1
              className="display"
              style={{
                margin: 0,
                fontSize: 40,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
              }}
            >
              {lessonData.title}
            </h1>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.06em",
              }}
            >
              {wordCount.toLocaleString()} words · ~{readingMinutes} min
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setShowEditModal(true)}
              title="Edit lesson"
              className="btn btn-ghost"
              style={{ padding: "6px 10px", color: "var(--ink-faint)" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                style={{ width: 16, height: 16 }}
              >
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343z" />
              </svg>
            </button>
          </div>

          <PageProgressBar
            currentPage={currentPage}
            totalPages={totalPages}
            readingMinutes={readingMinutes}
            wordCount={wordCount}
            pageFraction={0.5}
            onGoToPage={goToPage}
          />
        </div>

        {lessonData.audioUrl && (
          <div
            style={{
              maxWidth: 1100,
              width: "100%",
              margin: "0 auto",
              padding: "20px 48px 0",
            }}
          >
            <AudioPlayer src={lessonData.audioUrl} />
          </div>
        )}

        {/* Reader body */}
        <div
          style={{
            padding: "36px 48px 120px",
            maxWidth: colMax,
            width: "100%",
            margin: "0 auto",
            fontFamily: bodyFont,
            fontSize: `${readerSettings.fontSize}px`,
            lineHeight: readerSettings.lineHeight,
            color: "var(--ink)",
            position: "relative",
          }}
        >
          <div
            ref={textContainerRef}
            className={currentPage === 0 ? "dropcap" : ""}
            style={{
              textAlign: readerSettings.textAlign,
              hyphens: "auto",
              WebkitHyphens: "auto",
              userSelect: "text",
            }}
          >
            <TokenizedText
              text={page.text}
              getWord={getWord}
              wordVersion={wordVersion}
              onWordClick={handleWordClick}
              persistedTranslations={persistedTranslations}
              onRemoveTranslation={(idx) => {
                setPersistedTranslations((prev) => {
                  const next = new Map(prev);
                  next.delete(idx);
                  return next;
                });
                setPhraseGroups((prev) => {
                  if (!prev.has(idx)) return prev;
                  const next = new Map(prev);
                  next.delete(idx);
                  return next;
                });
              }}
              phraseGroups={phraseGroups}
              hideTranslations={!showTranslations}
              tokenOffset={page.tokenOffset}
            />
          </div>

          {/* Footer ornament */}
          <div
            style={{
              marginTop: 48,
              display: "flex",
              alignItems: "center",
              gap: 16,
              color: "var(--ink-faint)",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
            <div
              className="mono"
              style={{ fontSize: 10, letterSpacing: "0.2em" }}
            >
              § {currentPage + 1} / {totalPages} ·{" "}
              {currentPage === totalPages - 1 ? "END" : "CONTINUES"}
            </div>
            <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
          </div>

          {/* Previous/Next */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 28,
              gap: 12,
              alignItems: "center",
            }}
          >
            {currentPage > 0 ? (
              <button
                onClick={handlePrevPage}
                className="btn btn-ghost sans"
                style={{ color: "var(--ink-faint)" }}
              >
                ← Previous page
              </button>
            ) : prevLesson ? (
              <Link
                href={`/reader/${prevLesson.id}`}
                className="btn btn-ghost sans"
                style={{
                  color: "var(--ink-faint)",
                  textDecoration: "none",
                }}
              >
                ← {prevLesson.title}
              </Link>
            ) : (
              <span />
            )}

            {currentPage < totalPages - 1 ? (
              <button onClick={handleNextPage} className="btn sans">
                Next page →
              </button>
            ) : nextLesson ? (
              <Link
                href={`/reader/${nextLesson.id}`}
                onClick={handleDone}
                className="btn btn-primary sans"
                style={{ textDecoration: "none" }}
              >
                Next lesson →
              </Link>
            ) : (
              <button
                onClick={handleDone}
                className="btn btn-primary sans"
              >
                Done ✓
              </button>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditLessonModal
          lessonId={lessonId}
          initialTitle={lessonData.title}
          initialTextContent={lessonData.textContent}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {wordPopupTarget && (
        <WordPopup
          term={wordPopupTarget.term}
          word={currentWordForPopup}
          anchorEl={wordPopupTarget.element}
          dictionaryLinks={dictionaryLinks}
          onUpdateWord={handleUpdateWord}
          onClose={() => setWordPopupTarget(null)}
        />
      )}
    </div>
  );
}
