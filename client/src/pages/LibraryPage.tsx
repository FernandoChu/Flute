import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { WordStatus } from "shared";
import { apiFetch } from "../lib/api";
import CreateCollectionModal from "../components/CreateCollectionModal";
import CreateLessonModal from "../components/CreateLessonModal";

// ----------------------------------------------------------------------------
// Types

interface CollectionWithMeta {
  id: string;
  title: string;
  sourceLanguage: { id: number; code: string; name: string };
  targetLanguage: { id: number; code: string; name: string };
  _count: { lessons: number };
  createdAt: string;
  updatedAt: string;
}

interface LessonSummary {
  id: string;
  title: string;
  position: number;
  audioUrl: string | null;
  statusCounts: Record<number, number>;
}

interface DashboardStats {
  total: number;
  new: number;
  learning: number;
  known: number;
  ignored: number;
  dueReviews: number;
}

interface Composition {
  new: number;
  l1: number;
  l2: number;
  l3: number;
  l4: number;
  known: number;
  ignored: number;
}

// ----------------------------------------------------------------------------
// Palettes

const COVER_PALETTES = [
  {
    bg: "oklch(0.94 0.03 80)",
    ink: "oklch(0.32 0.04 60)",
    accent: "oklch(0.52 0.12 28)",
  },
  {
    bg: "oklch(0.88 0.03 240)",
    ink: "oklch(0.28 0.05 250)",
    accent: "oklch(0.55 0.1 40)",
  },
  {
    bg: "oklch(0.91 0.04 70)",
    ink: "oklch(0.32 0.05 55)",
    accent: "oklch(0.45 0.1 35)",
  },
  {
    bg: "oklch(0.82 0.06 45)",
    ink: "oklch(0.26 0.05 30)",
    accent: "oklch(0.94 0.03 80)",
  },
  {
    bg: "oklch(0.86 0.04 140)",
    ink: "oklch(0.28 0.05 150)",
    accent: "oklch(0.55 0.12 28)",
  },
];

function paletteForId(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_PALETTES[h % COVER_PALETTES.length];
}

function emptyComposition(): Composition {
  return { new: 0, l1: 0, l2: 0, l3: 0, l4: 0, known: 0, ignored: 0 };
}

function compFromStatusCounts(counts?: Record<number, number>): Composition {
  const c = emptyComposition();
  if (!counts) return c;
  c.new = counts[WordStatus.New] ?? 0;
  c.l1 = counts[WordStatus.Learning1] ?? 0;
  c.l2 = counts[WordStatus.Learning2] ?? 0;
  c.l3 = counts[WordStatus.Learning3] ?? 0;
  c.l4 = counts[WordStatus.Learning4] ?? 0;
  c.known = counts[WordStatus.Known] ?? 0;
  c.ignored = counts[WordStatus.Ignored] ?? 0;
  return c;
}

function sumComp(a: Composition, b: Composition): Composition {
  return {
    new: a.new + b.new,
    l1: a.l1 + b.l1,
    l2: a.l2 + b.l2,
    l3: a.l3 + b.l3,
    l4: a.l4 + b.l4,
    known: a.known + b.known,
    ignored: a.ignored + b.ignored,
  };
}

function compTotal(c: Composition): number {
  return c.new + c.l1 + c.l2 + c.l3 + c.l4 + c.known + c.ignored;
}

function compKnownPct(c: Composition): number {
  const total = compTotal(c);
  if (total === 0) return 0;
  return Math.round((c.known / total) * 100);
}

// ----------------------------------------------------------------------------
// Cover art

function CoverArt({
  id,
  title,
  langCode,
}: {
  id: string;
  title: string;
  langCode: string;
}) {
  const p = paletteForId(id);
  return (
    <div
      style={{
        aspectRatio: "3 / 4",
        background: p.bg,
        borderRadius: 3,
        border: "1px solid oklch(0 0 0 / 0.08)",
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "0 1px 2px oklch(0 0 0 / 0.06), 0 6px 14px -8px oklch(0 0 0 / 0.2)",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        color: p.ink,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: 20, height: 2, background: p.ink }} />
        <div
          className="mono"
          style={{ fontSize: 8, letterSpacing: "0.2em", opacity: 0.6 }}
        >
          FLUTE · {langCode.toUpperCase()}
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>

      <div>
        <div
          style={{
            width: 14,
            height: 14,
            background: p.accent,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            height: 1,
            background: p.ink,
            opacity: 0.3,
            marginBottom: 4,
          }}
        />
        <div style={{ height: 1, background: p.ink, opacity: 0.3, width: "60%" }} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Composition bar

function CompositionBar({
  comp,
  height = 6,
  showLegend = false,
}: {
  comp: Composition;
  height?: number;
  showLegend?: boolean;
}) {
  const segs = [
    { key: "known", label: "Known", value: comp.known, color: "var(--ink-soft)" },
    { key: "l4", label: "Lv 4", value: comp.l4, color: "var(--st-l4)" },
    { key: "l3", label: "Lv 3", value: comp.l3, color: "var(--st-l3)" },
    { key: "l2", label: "Lv 2", value: comp.l2, color: "var(--st-l2)" },
    { key: "l1", label: "Lv 1", value: comp.l1, color: "var(--st-l1)" },
    { key: "new", label: "New", value: comp.new, color: "var(--st-new)" },
  ];
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div>
      <div
        style={{
          display: "flex",
          height,
          borderRadius: height / 2,
          overflow: "hidden",
          background: "var(--paper-ridge)",
        }}
      >
        {segs.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.key}
                title={`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}
                style={{
                  width: `${(s.value / total) * 100}%`,
                  background: s.color,
                }}
              />
            ),
        )}
      </div>
      {showLegend && (
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 10,
            flexWrap: "wrap",
          }}
        >
          {segs.map((s) => (
            <div
              key={s.key}
              className="mono"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                color: "var(--ink-soft)",
                letterSpacing: "0.04em",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: s.color,
                  borderRadius: 2,
                }}
              />
              {s.label}{" "}
              <span style={{ color: "var(--ink-faint)" }}>
                {Math.round((s.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Kebab menu

type MenuItem =
  | "sep"
  | {
      label: string;
      shortcut?: string;
      danger?: boolean;
      onClick?: () => void;
      disabled?: boolean;
    };

function KebabMenu({
  items,
  align = "right",
}: {
  items: MenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "relative" }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: open ? "var(--paper-sunk)" : "transparent",
          border: "1px solid " + (open ? "var(--rule)" : "transparent"),
          color: "var(--ink-soft)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            [align]: 0,
            minWidth: 200,
            zIndex: 30,
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            padding: 4,
          }}
        >
          {items.map((it, i) =>
            it === "sep" ? (
              <div
                key={i}
                style={{
                  height: 1,
                  background: "var(--rule-soft)",
                  margin: "4px 0",
                }}
              />
            ) : (
              <button
                key={i}
                disabled={it.disabled}
                onClick={() => {
                  it.onClick?.();
                  setOpen(false);
                }}
                className="sans"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "7px 10px",
                  fontSize: 13,
                  background: "transparent",
                  border: 0,
                  borderRadius: 5,
                  textAlign: "left",
                  color: it.danger ? "var(--accent)" : "var(--ink)",
                  cursor: it.disabled ? "not-allowed" : "pointer",
                  opacity: it.disabled ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!it.disabled)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "var(--paper-sunk)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                <span>{it.label}</span>
                {it.shortcut && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--ink-faint)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {it.shortcut}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Library card

function LibraryCard({
  collection,
  composition,
  onClick,
}: {
  collection: CollectionWithMeta;
  composition: Composition;
  onClick: () => void;
}) {
  const knownPct = compKnownPct(composition);
  const total = compTotal(composition);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "pointer",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        const img = (e.currentTarget as HTMLElement).querySelector(
          ".cover",
        ) as HTMLElement | null;
        if (img) img.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        const img = (e.currentTarget as HTMLElement).querySelector(
          ".cover",
        ) as HTMLElement | null;
        if (img) img.style.transform = "translateY(0)";
      }}
    >
      <div className="cover" style={{ transition: "transform 180ms ease" }}>
        <CoverArt
          id={collection.id}
          title={collection.title}
          langCode={collection.sourceLanguage.code}
        />
      </div>
      <div>
        <div
          className="display"
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {collection.title}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span>
            {collection._count.lessons} lesson
            {collection._count.lessons !== 1 && "s"}
          </span>
          <span>·</span>
          <span>
            {collection.sourceLanguage.code.toUpperCase()} →{" "}
            {collection.targetLanguage.code.toUpperCase()}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <CompositionBar comp={composition} height={4} />
        </div>
        {total > 0 && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--ink-faint)",
            }}
          >
            <span>{knownPct}% known</span>
            <span className="mono">{total.toLocaleString()} words</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Collection detail (inline view)

function CollectionDetail({
  collection,
  onBack,
  onAddLesson,
  onDeleteCollection,
}: {
  collection: CollectionWithMeta;
  onBack: () => void;
  onAddLesson: () => void;
  onDeleteCollection: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: lessonsData, isLoading } = useQuery({
    queryKey: ["lessons", collection.id],
    queryFn: () =>
      apiFetch<{ data: LessonSummary[] }>(
        `/collections/${collection.id}/lessons`,
      ),
  });

  const deleteLesson = useMutation({
    mutationFn: (id: string) => apiFetch(`/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", collection.id] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const lessons = lessonsData?.data ?? [];
  const collectionComp = lessons.reduce(
    (acc, l) => sumComp(acc, compFromStatusCounts(l.statusCounts)),
    emptyComposition(),
  );
  const totalWords = compTotal(collectionComp);

  // First lesson that's not 100% known = "Continue"
  const continueLesson =
    lessons.find((l) => {
      const comp = compFromStatusCounts(l.statusCounts);
      return compKnownPct(comp) < 100;
    }) ?? lessons[0];

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "28px 48px 120px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <button
        onClick={onBack}
        className="sans"
        style={{
          background: "transparent",
          border: 0,
          cursor: "pointer",
          color: "var(--ink-faint)",
          fontSize: 13,
          padding: 0,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ← Library
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr auto",
          gap: 36,
          alignItems: "flex-start",
          marginBottom: 36,
          paddingBottom: 28,
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div>
          <CoverArt
            id={collection.id}
            title={collection.title}
            langCode={collection.sourceLanguage.code}
          />
        </div>
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
            Collection · {collection.sourceLanguage.name} →{" "}
            {collection.targetLanguage.name}
          </div>
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
            {collection.title}
          </h1>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.06em",
              marginTop: 10,
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <span>
              {collection._count.lessons} lesson
              {collection._count.lessons !== 1 && "s"}
            </span>
            <span>·</span>
            <span>{totalWords.toLocaleString()} words</span>
          </div>

          {totalWords > 0 && (
            <div style={{ marginTop: 20, maxWidth: 560 }}>
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
                Word composition
              </div>
              <CompositionBar comp={collectionComp} height={10} showLegend />
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "flex-end",
          }}
        >
          {continueLesson ? (
            <Link
              href={`/reader/${continueLesson.id}`}
              className="btn btn-primary sans"
              style={{ padding: "10px 18px", textDecoration: "none" }}
            >
              Resume →
            </Link>
          ) : (
            <button
              onClick={onAddLesson}
              className="btn btn-primary sans"
              style={{ padding: "10px 18px" }}
            >
              + Add lesson
            </button>
          )}
          <KebabMenu
            items={[
              { label: "Add lesson…", onClick: onAddLesson },
              { label: "Rename" },
              { label: "Change cover" },
              { label: "Change languages" },
              "sep",
              { label: "Export as .epub" },
              { label: "Archive" },
              "sep",
              {
                label: "Delete collection",
                danger: true,
                onClick: onDeleteCollection,
              },
            ]}
          />
        </div>
      </div>

      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Lessons</span>
        <span>Sort: position</span>
      </div>

      {isLoading ? (
        <div
          className="mono"
          style={{
            padding: "40px 18px",
            textAlign: "center",
            color: "var(--ink-faint)",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Loading lessons…
        </div>
      ) : lessons.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--rule)",
            borderRadius: 10,
            background: "var(--paper-deep)",
            padding: "40px 18px",
            textAlign: "center",
          }}
        >
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            No lessons yet
          </p>
          <button onClick={onAddLesson} className="btn btn-primary sans">
            + Add lesson
          </button>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--rule)",
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--paper-deep)",
          }}
        >
          <div
            className="mono"
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 110px 260px 36px 24px",
              gap: 16,
              padding: "10px 24px",
              borderBottom: "1px solid var(--rule)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              alignItems: "center",
            }}
          >
            <span>#</span>
            <span>Title</span>
            <span>Words</span>
            <span>Composition</span>
            <span />
            <span />
          </div>

          {lessons.map((l, i) => {
            const comp = compFromStatusCounts(l.statusCounts);
            const words = compTotal(comp);
            const isContinue = continueLesson?.id === l.id && words > 0;
            return (
              <Link
                key={l.id}
                href={`/reader/${l.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 110px 260px 36px 24px",
                  gap: 16,
                  alignItems: "center",
                  padding: "16px 24px",
                  borderBottom:
                    i < lessons.length - 1
                      ? "1px solid var(--rule-soft)"
                      : 0,
                  background: isContinue
                    ? "var(--accent-wash)"
                    : "transparent",
                  borderLeft: isContinue
                    ? "3px solid var(--accent)"
                    : "3px solid transparent",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
                onMouseEnter={(e) => {
                  if (!isContinue)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--paper-sunk)";
                }}
                onMouseLeave={(e) => {
                  if (!isContinue)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {String(l.position).padStart(2, "0")}
                </div>
                <div>
                  <div
                    className="display"
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      color: "var(--ink)",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {l.title}
                  </div>
                  {isContinue && (
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--accent)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        marginTop: 2,
                      }}
                    >
                      Continue
                      {l.audioUrl ? " · audio" : ""}
                    </div>
                  )}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                  }}
                >
                  {words.toLocaleString()}
                </div>
                <div>
                  <CompositionBar comp={comp} height={6} />
                  {words > 0 && (
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--ink-faint)",
                        letterSpacing: "0.04em",
                        marginTop: 4,
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <span>{compKnownPct(comp)}% known</span>
                      <span>·</span>
                      <span>
                        {Math.round((comp.new / words) * 100)}% new
                      </span>
                    </div>
                  )}
                </div>
                <div onClick={(e) => e.preventDefault()}>
                  <KebabMenu
                    items={[
                      { label: "Rename" },
                      { label: "Attach audio" },
                      { label: "Reset progress" },
                      "sep",
                      { label: "Move to…" },
                      { label: "Duplicate" },
                      "sep",
                      {
                        label: "Delete lesson",
                        danger: true,
                        onClick: () => {
                          if (confirm("Delete this lesson?"))
                            deleteLesson.mutate(l.id);
                        },
                      },
                    ]}
                  />
                </div>
                <div
                  style={{
                    color: "var(--ink-faint)",
                    fontSize: 18,
                    textAlign: "right",
                  }}
                >
                  ›
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button onClick={onAddLesson} className="btn sans">
          + Add lesson
        </button>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.04em",
          }}
        >
          {lessons.length} of {collection._count.lessons} shown
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Library page

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [lessonModalCollectionId, setLessonModalCollectionId] = useState<
    string | null
  >(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    null,
  );

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => apiFetch<{ data: CollectionWithMeta[] }>("/collections"),
  });

  const { data: statsData } = useQuery({
    queryKey: ["vocabulary-stats"],
    queryFn: () => apiFetch<{ data: DashboardStats }>("/vocabulary/stats"),
  });

  // Pre-fetch lesson composition for each collection so cards show the bar
  const collectionIds = (collections?.data ?? []).map((c) => c.id);
  const { data: allLessonsData } = useQuery({
    queryKey: ["collection-lesson-comps", collectionIds.join("|")],
    queryFn: async () => {
      const results = await Promise.all(
        collectionIds.map((id) =>
          apiFetch<{ data: LessonSummary[] }>(
            `/collections/${id}/lessons`,
          ).then((r) => ({ id, lessons: r.data })),
        ),
      );
      return results;
    },
    enabled: collectionIds.length > 0,
  });

  const compositionForCollection = (id: string): Composition => {
    const row = allLessonsData?.find((r) => r.id === id);
    if (!row) return emptyComposition();
    return row.lessons.reduce(
      (acc, l) => sumComp(acc, compFromStatusCounts(l.statusCounts)),
      emptyComposition(),
    );
  };

  const deleteCollection = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setSelectedCollectionId(null);
    },
  });

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
        Loading library…
      </div>
    );
  }

  const stats = statsData?.data;
  const collectionList = collections?.data ?? [];
  const selectedCollection = collectionList.find(
    (c) => c.id === selectedCollectionId,
  );

  // Detail view
  if (selectedCollection) {
    return (
      <>
        <CollectionDetail
          collection={selectedCollection}
          onBack={() => setSelectedCollectionId(null)}
          onAddLesson={() =>
            setLessonModalCollectionId(selectedCollection.id)
          }
          onDeleteCollection={() => {
            if (
              confirm(
                "Delete this collection and all its lessons? This cannot be undone.",
              )
            ) {
              deleteCollection.mutate(selectedCollection.id);
            }
          }}
        />
        {lessonModalCollectionId && (
          <CreateLessonModal
            collectionId={lessonModalCollectionId}
            onClose={() => setLessonModalCollectionId(null)}
          />
        )}
      </>
    );
  }

  // Grid view
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "36px 48px 120px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
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
            Your library
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
            Texts to live in.
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary sans"
            onClick={() => setShowCreateCollection(true)}
          >
            + New collection
          </button>
        </div>
      </div>

      {stats && stats.total > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 36,
            background: "var(--paper-deep)",
          }}
        >
          {[
            { label: "Total", value: stats.total },
            { label: "New", value: stats.new },
            { label: "Learning", value: stats.learning },
            { label: "Known", value: stats.known },
            {
              label: "Due reviews",
              value: stats.dueReviews,
              accent: true,
            },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                padding: "18px 22px",
                borderRight: i < 4 ? "1px solid var(--rule)" : 0,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
              <div
                className="display"
                style={{
                  fontSize: 32,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  color: s.accent ? "var(--accent)" : "var(--ink)",
                  marginTop: 4,
                }}
              >
                {s.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {collectionList.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 0",
            color: "var(--ink-faint)",
          }}
        >
          <div className="display" style={{ fontSize: 22, marginBottom: 8 }}>
            No collections yet.
          </div>
          <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>
            Create a collection to start importing content.
          </p>
          <button
            className="btn btn-primary sans"
            onClick={() => setShowCreateCollection(true)}
          >
            + New collection
          </button>
        </div>
      )}

      {collectionList.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "48px 36px",
          }}
        >
          {collectionList.map((col) => (
            <LibraryCard
              key={col.id}
              collection={col}
              composition={compositionForCollection(col.id)}
              onClick={() => setSelectedCollectionId(col.id)}
            />
          ))}
        </div>
      )}

      {showCreateCollection && (
        <CreateCollectionModal
          onClose={() => setShowCreateCollection(false)}
        />
      )}

      {lessonModalCollectionId && (
        <CreateLessonModal
          collectionId={lessonModalCollectionId}
          onClose={() => setLessonModalCollectionId(null)}
        />
      )}
    </div>
  );
}
