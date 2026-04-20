import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "../lib/api";
import FlashcardReview from "../components/review/FlashcardReview";
import MultipleChoiceReview from "../components/review/MultipleChoiceReview";
import ReviewProgress from "../components/review/ReviewProgress";
import ReviewSummary from "../components/review/ReviewSummary";

interface Language {
  id: number;
  code: string;
  name: string;
}

type ReviewMode = "flashcard" | "multiple-choice";

interface ReviewItem {
  id: string;
  wordId: string;
  word: {
    id: string;
    term: string;
    translation: string | null;
    status: number;
    notes: string | null;
    contextSentence: string | null;
    languageId: number;
    language: { code: string; name: string };
  };
}

const FILTERS_STORAGE_KEY = "reviewFilters";

function loadFilters(): { languageId: string; wordStatus: string } {
  try {
    const v = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!v) return { languageId: "", wordStatus: "" };
    const parsed = JSON.parse(v);
    return {
      languageId:
        typeof parsed.languageId === "string" ? parsed.languageId : "",
      wordStatus:
        typeof parsed.wordStatus === "string" ? parsed.wordStatus : "",
    };
  } catch {
    return { languageId: "", wordStatus: "" };
  }
}

const selectStyle: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 13,
  background: "var(--paper-sunk)",
  border: "1px solid var(--rule)",
  borderRadius: 6,
  color: "var(--ink)",
  width: "100%",
  fontFamily: "var(--font-sans)",
};

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const initialFilters = loadFilters();
  const [languageId, setLanguageId] = useState(initialFilters.languageId);
  const [wordStatus, setWordStatus] = useState(initialFilters.wordStatus);

  useEffect(() => {
    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ languageId, wordStatus }),
    );
  }, [languageId, wordStatus]);
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  const langParam = languageId ? `&languageId=${languageId}` : "";
  const statusParam = wordStatus !== "" ? `&wordStatus=${wordStatus}` : "";
  const filterParams = `${langParam}${statusParam}`;

  const { data: countData } = useQuery({
    queryKey: ["review-count", languageId, wordStatus],
    queryFn: () =>
      apiFetch<{ data: { count: number } }>(
        `/reviews/due/count?${filterParams}`,
      ),
  });

  const { data: reviewData, refetch } = useQuery({
    queryKey: ["review-items", languageId, wordStatus],
    queryFn: () =>
      apiFetch<{ data: ReviewItem[] }>(
        `/reviews/due?limit=20${filterParams}`,
      ),
    enabled: started,
  });

  const items = reviewData?.data ?? [];
  const currentItem = items[currentIdx] ?? null;
  const dueCount = countData?.data.count ?? 0;

  const handleUpdate = useCallback(
    async (edits: {
      translation?: string | null;
      status?: number;
      notes?: string | null;
      contextSentence?: string | null;
    }) => {
      if (!currentItem) return;
      const wordId = currentItem.word.id;

      const res = await apiFetch<{ data: ReviewItem["word"] }>(
        `/words/${wordId}`,
        {
          method: "PUT",
          body: JSON.stringify(edits),
        },
      );

      queryClient.setQueryData<{ data: ReviewItem[] }>(
        ["review-items", languageId, wordStatus],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((it) =>
              it.word.id === wordId
                ? { ...it, word: { ...it.word, ...res.data } }
                : it,
            ),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
    [currentItem, languageId, wordStatus, queryClient],
  );

  const handleRate = useCallback(
    async (rating: number) => {
      if (!currentItem) return;

      await apiFetch(`/reviews/${currentItem.word.id}`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });

      setStats((prev) => {
        const key =
          rating === 1
            ? "again"
            : rating === 2
              ? "hard"
              : rating === 3
                ? "good"
                : "easy";
        return { ...prev, [key]: prev[key as keyof typeof prev] + 1 };
      });

      if (currentIdx + 1 < items.length) {
        setCurrentIdx((i) => i + 1);
      } else {
        setFinished(true);
        queryClient.invalidateQueries({ queryKey: ["review-count"] });
        queryClient.invalidateQueries({ queryKey: ["vocabulary-stats"] });
      }
    },
    [currentItem, currentIdx, items.length, queryClient],
  );

  const handleStart = () => {
    setStarted(true);
    setCurrentIdx(0);
    setFinished(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
  };

  const handleRestart = async () => {
    setStarted(false);
    setFinished(false);
    setCurrentIdx(0);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    await queryClient.invalidateQueries({ queryKey: ["review-items"] });
    await queryClient.invalidateQueries({ queryKey: ["review-count"] });
    setTimeout(() => {
      setStarted(true);
      refetch();
    }, 100);
  };

  // Setup screen
  if (!started) {
    return (
      <div
        style={{
          maxWidth: 540,
          margin: "0 auto",
          padding: "36px 48px 48px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ marginBottom: 36 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Review session · FSRS
          </div>
          <h1
            className="display"
            style={{
              margin: 0,
              fontSize: 44,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Today's cards.
          </h1>
        </div>

        <div
          style={{
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
            padding: 28,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Language
            </div>
            <select
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
              style={selectStyle}
            >
              <option value="">All languages</option>
              {languages?.data.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Word status
            </div>
            <select
              value={wordStatus}
              onChange={(e) => setWordStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="">All statuses</option>
              <option value="1">Learning 1</option>
              <option value="2">Learning 2</option>
              <option value="3">Learning 3</option>
              <option value="4">Learning 4</option>
              <option value="5">Known</option>
            </select>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Mode
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  { key: "flashcard", label: "Flashcard" },
                  { key: "multiple-choice", label: "Multiple choice" },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className="sans"
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    fontSize: 13,
                    background:
                      mode === m.key
                        ? "var(--paper)"
                        : "transparent",
                    border:
                      "1px solid " +
                      (mode === m.key ? "var(--ink)" : "var(--rule)"),
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: mode === m.key ? 600 : 400,
                    color:
                      mode === m.key ? "var(--ink)" : "var(--ink-soft)",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {dueCount} card{dueCount !== 1 ? "s" : ""} due for review
          </div>

          <button
            onClick={handleStart}
            disabled={dueCount === 0}
            className="btn btn-primary sans"
            style={{
              width: "100%",
              padding: "10px 20px",
              fontSize: 14,
            }}
          >
            {dueCount === 0 ? "No cards to review" : "Start review"}
          </button>

          <Link
            href="/"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: 16,
              fontSize: 12,
              color: "var(--ink-faint)",
              textDecoration: "none",
            }}
            className="mono"
          >
            ← Back to Library
          </Link>
        </div>
      </div>
    );
  }

  // Summary screen
  if (finished) {
    return (
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "36px 48px 48px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <ReviewSummary
          stats={stats}
          onRestart={handleRestart}
          onClose={() => {
            setStarted(false);
            setFinished(false);
          }}
        />
      </div>
    );
  }

  if (!currentItem) {
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
        Loading reviews…
      </div>
    );
  }

  const total = items.length;
  const reviewed = currentIdx;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "36px 48px 48px",
        minHeight: "calc(100vh - 58px)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 28,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Review session · FSRS
          </div>
          <h1
            className="display"
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Card {reviewed + 1} of {total}
          </h1>
        </div>
        <div
          style={{ display: "flex", gap: 16, alignItems: "center" }}
        >
          <div className="mono" style={{ fontSize: 11 }}>
            <div
              style={{
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontSize: 10,
              }}
            >
              Again · Hard · Good · Easy
            </div>
            <div
              style={{
                color: "var(--ink)",
                marginTop: 2,
                fontSize: 12,
              }}
            >
              {stats.again} · {stats.hard} · {stats.good} · {stats.easy}
            </div>
          </div>
          <button
            className="btn sans"
            onClick={() => {
              setStarted(false);
              setFinished(false);
            }}
            style={{ color: "var(--ink-faint)", fontSize: 12 }}
          >
            End session
          </button>
        </div>
      </div>

      <ReviewProgress current={reviewed} total={total} />

      {mode === "flashcard" ? (
        <FlashcardReview
          item={currentItem}
          onRate={handleRate}
          onUpdate={handleUpdate}
        />
      ) : (
        <MultipleChoiceReview item={currentItem} onRate={handleRate} />
      )}
    </div>
  );
}
