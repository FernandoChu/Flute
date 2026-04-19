import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { WordStatus } from "shared";
import { apiFetch } from "../lib/api";
import CreateCollectionModal from "../components/CreateCollectionModal";
import CreateLessonModal from "../components/CreateLessonModal";
import EditLessonModal from "../components/EditLessonModal";

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
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_WIDTH = 220;
  const MENU_GAP = 4;

  const computePosition = () => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Horizontal: align to the chosen edge of the trigger, clamp to viewport
    let left =
      align === "right"
        ? rect.right + scrollX - MENU_WIDTH
        : rect.left + scrollX;
    const minLeft = scrollX + 8;
    const maxLeft = scrollX + window.innerWidth - MENU_WIDTH - 8;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;

    // Vertical: below by default; flip up if there isn't room
    let top = rect.bottom + scrollY + MENU_GAP;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (menuHeight > 0 && spaceBelow < menuHeight + MENU_GAP + 8) {
      top = rect.top + scrollY - menuHeight - MENU_GAP;
    }

    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    const onResize = () => computePosition();
    const onScroll = () => computePosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !menuRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div
      style={{ position: "relative" }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <button
        ref={triggerRef}
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
      {open &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{
              position: "absolute",
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: MENU_WIDTH,
              zIndex: 200,
              background: "var(--paper-deep)",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              boxShadow: "var(--shadow-md)",
              padding: 4,
              visibility: position ? "visible" : "hidden",
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
          </div>,
          document.body,
        )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Continue-reading banner

interface RecentProgress {
  currentPage: number;
  openedAt: string;
  lesson: {
    id: string;
    title: string;
    position: number;
    audioUrl: string | null;
    preview: string;
    collection: {
      id: string;
      title: string;
      sourceLanguage: { id: number; code: string; name: string };
      targetLanguage: { id: number; code: string; name: string };
    };
  };
}

function ContinueBanner({
  recent,
  composition,
  onOpenCollection,
}: {
  recent: RecentProgress;
  composition: Composition;
  onOpenCollection: () => void;
}) {
  const { lesson, currentPage } = recent;
  const collection = lesson.collection;
  const knownPct = compKnownPct(composition);
  const total = compTotal(composition);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr auto",
        gap: 28,
        alignItems: "center",
        background: "var(--paper-deep)",
        border: "1px solid var(--rule)",
        borderRadius: 10,
        padding: "20px 24px",
        marginBottom: 48,
      }}
    >
      <Link
        href={`/collection/${collection.id}`}
        style={{ cursor: "pointer", textDecoration: "none" }}
      >
        <CoverArt
          id={collection.id}
          title={collection.title}
          langCode={collection.sourceLanguage.code}
        />
      </Link>
      <div style={{ minWidth: 0 }}>
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
          Continue reading · {collection.title}
        </div>
        <div
          className="display"
          style={{
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            marginBottom: 4,
            lineHeight: 1.15,
          }}
        >
          {lesson.title}
        </div>
        {lesson.preview && (
          <div
            style={{
              color: "var(--ink-soft)",
              fontSize: 14,
              marginBottom: 14,
              fontStyle: "italic",
              lineHeight: 1.4,
            }}
          >
            “{lesson.preview}”
          </div>
        )}
        <div
          className="mono"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontSize: 12,
            color: "var(--ink-faint)",
            letterSpacing: "0.04em",
          }}
        >
          <span>Paused on page {currentPage + 1}</span>
          {total > 0 && (
            <>
              <span>·</span>
              <span>{knownPct}% known</span>
              <span>·</span>
              <span>{total.toLocaleString()} words</span>
            </>
          )}
          {lesson.audioUrl && (
            <>
              <span>·</span>
              <span>audio</span>
            </>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "stretch",
        }}
      >
        <Link
          href={`/reader/${lesson.id}`}
          className="btn btn-primary sans"
          style={{
            padding: "10px 20px",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Resume reading →
        </Link>
        <button
          onClick={onOpenCollection}
          className="sans"
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: "var(--ink-faint)",
            fontSize: 12,
            padding: "4px 0",
          }}
        >
          Open collection
        </button>
      </div>
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
  const [showChangeLanguages, setShowChangeLanguages] = useState(false);
  const [renameCollectionOpen, setRenameCollectionOpen] = useState(false);
  const [editLesson, setEditLesson] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioLessonIdRef = useRef<string | null>(null);

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

  const renameCollection = useMutation({
    mutationFn: (title: string) =>
      apiFetch(`/collections/${collection.id}`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const duplicateLesson = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch<{
        data: { title: string; textContent: string };
      }>(`/lessons/${id}`);
      return apiFetch(`/collections/${collection.id}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: `${res.data.title} (copy)`,
          textContent: res.data.textContent,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", collection.id] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const uploadAudio = useMutation({
    mutationFn: async (vars: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("audio", vars.file);
      const username = localStorage.getItem("username");
      const res = await fetch(`/api/lessons/${vars.id}/audio`, {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", collection.id] });
    },
  });

  const handleAudioPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lessonId = audioLessonIdRef.current;
    e.target.value = "";
    if (!file || !lessonId) return;
    uploadAudio.mutate({ id: lessonId, file });
  };

  const triggerAudioPick = (lessonId: string) => {
    audioLessonIdRef.current = lessonId;
    audioInputRef.current?.click();
  };

  const handleRenameCollectionSave = (next: string) => {
    renameCollection.mutate(next);
    setRenameCollectionOpen(false);
  };

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
        padding: "28px 48px 48px",
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
              {
                label: "Rename",
                onClick: () => setRenameCollectionOpen(true),
              },
              {
                label: "Change languages",
                onClick: () => setShowChangeLanguages(true),
              },
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
        }}
      >
        Lessons
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
                <KebabMenu
                  items={[
                    {
                      label: "Edit",
                      onClick: () =>
                        setEditLesson({ id: l.id, title: l.title }),
                    },
                    {
                      label: l.audioUrl ? "Replace audio" : "Attach audio",
                      onClick: () => triggerAudioPick(l.id),
                    },
                    {
                      label: "Duplicate",
                      onClick: () => duplicateLesson.mutate(l.id),
                    },
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

      <input
        ref={audioInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.m4a,audio/*"
        onChange={handleAudioPicked}
        style={{ display: "none" }}
      />

      {renameCollectionOpen && (
        <RenameModal
          kind="collection"
          current={collection.title}
          pending={renameCollection.isPending}
          onCancel={() => setRenameCollectionOpen(false)}
          onSave={handleRenameCollectionSave}
        />
      )}

      {editLesson && (
        <EditLessonLoader
          lessonId={editLesson.id}
          fallbackTitle={editLesson.title}
          onClose={() => setEditLesson(null)}
        />
      )}

      {showChangeLanguages && (
        <ChangeLanguagesModal
          collection={collection}
          onClose={() => setShowChangeLanguages(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            setShowChangeLanguages(false);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Edit-lesson loader — fetches textContent then mounts the existing modal

function EditLessonLoader({
  lessonId,
  fallbackTitle,
  onClose,
}: {
  lessonId: string;
  fallbackTitle: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () =>
      apiFetch<{ data: { title: string; textContent: string } }>(
        `/lessons/${lessonId}`,
      ),
  });

  if (isLoading || isError || !data) {
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
          className="mono"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
            padding: "24px 32px",
            fontSize: 12,
            color: isError ? "var(--accent)" : "var(--ink-faint)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {isError
            ? `Couldn't load "${fallbackTitle}"`
            : `Loading "${fallbackTitle}"…`}
        </div>
      </div>
    );
  }

  return (
    <EditLessonModal
      lessonId={lessonId}
      initialTitle={data.data.title}
      initialTextContent={data.data.textContent}
      onClose={onClose}
    />
  );
}

// ----------------------------------------------------------------------------
// Rename modal

function RenameModal({
  kind,
  current,
  pending,
  onCancel,
  onSave,
}: {
  kind: "collection" | "lesson";
  current: string;
  pending: boolean;
  onCancel: () => void;
  onSave: (next: string) => void;
}) {
  const [value, setValue] = useState(current);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== current && !pending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave(trimmed);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onCancel]);

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
      onClick={onCancel}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--rule)",
          borderRadius: 10,
          boxShadow: "var(--shadow-lg)",
          padding: 28,
          width: "100%",
          maxWidth: 460,
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
          Rename {kind}
        </div>
        <h2
          className="display"
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          {current}
        </h2>

        <label
          className="mono"
          style={{
            display: "block",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Title
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 18,
          }}
        >
          <button type="button" onClick={onCancel} className="btn sans">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="btn btn-primary sans"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Change-languages modal

function ChangeLanguagesModal({
  collection,
  onClose,
  onSaved,
}: {
  collection: CollectionWithMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sourceLangId, setSourceLangId] = useState(
    String(collection.sourceLanguage.id),
  );
  const [targetLangId, setTargetLangId] = useState(
    String(collection.targetLanguage.id),
  );
  const [error, setError] = useState("");

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () =>
      apiFetch<{ data: { id: number; code: string; name: string }[] }>(
        "/languages",
      ),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/collections/${collection.id}`, {
        method: "PUT",
        body: JSON.stringify({
          sourceLanguageId: Number(sourceLangId),
          targetLanguageId: Number(targetLangId),
        }),
      }),
    onSuccess: () => onSaved(),
    onError: (err: Error) => setError(err.message),
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: "0.1em",
    color: "var(--ink-faint)",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    fontSize: 13,
    background: "var(--paper-sunk)",
    border: "1px solid var(--rule)",
    borderRadius: 6,
    color: "var(--ink)",
    fontFamily: "var(--font-sans)",
  };

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
          maxWidth: 460,
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
          Change languages
        </div>
        <h2
          className="display"
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          {collection.title}
        </h2>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>I'm learning</label>
          <select
            value={sourceLangId}
            onChange={(e) => setSourceLangId(e.target.value)}
            style={selectStyle}
          >
            {languages?.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Translate to</label>
          <select
            value={targetLangId}
            onChange={(e) => setTargetLangId(e.target.value)}
            style={selectStyle}
          >
            {languages?.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
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
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onClose} className="btn sans">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn btn-primary sans"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Library page

export default function LibraryPage() {
  const [, navigate] = useLocation();
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => apiFetch<{ data: CollectionWithMeta[] }>("/collections"),
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

  const { data: recentProgress } = useQuery({
    queryKey: ["progress-recent"],
    queryFn: () =>
      apiFetch<{ data: RecentProgress | null }>("/progress/recent"),
  });

  const resumeLessonComposition = (() => {
    const recent = recentProgress?.data;
    if (!recent || !allLessonsData) return emptyComposition();
    const row = allLessonsData.find(
      (r) => r.id === recent.lesson.collection.id,
    );
    const lesson = row?.lessons.find((l) => l.id === recent.lesson.id);
    return lesson ? compFromStatusCounts(lesson.statusCounts) : emptyComposition();
  })();

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

  const collectionList = collections?.data ?? [];

  // Grid view
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "36px 48px 48px",
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

      {recentProgress?.data && (
        <ContinueBanner
          recent={recentProgress.data}
          composition={resumeLessonComposition}
          onOpenCollection={() =>
            navigate(`/collection/${recentProgress.data!.lesson.collection.id}`)
          }
        />
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
              onClick={() => navigate(`/collection/${col.id}`)}
            />
          ))}
        </div>
      )}

      {showCreateCollection && (
        <CreateCollectionModal
          onClose={() => setShowCreateCollection(false)}
        />
      )}

    </div>
  );
}

// ----------------------------------------------------------------------------
// Collection page (route: /collection/:collectionId)

export function CollectionPage({ collectionId }: { collectionId: string }) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [lessonModalOpen, setLessonModalOpen] = useState(false);

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => apiFetch<{ data: CollectionWithMeta[] }>("/collections"),
  });

  const deleteCollection = useMutation({
    mutationFn: () =>
      apiFetch(`/collections/${collectionId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate("/");
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
        Loading collection…
      </div>
    );
  }

  const collection = collections?.data.find((c) => c.id === collectionId);

  if (!collection) {
    return (
      <div
        style={{
          padding: "80px 48px",
          textAlign: "center",
          color: "var(--ink-faint)",
        }}
      >
        <div
          className="display"
          style={{ fontSize: 22, marginBottom: 8, color: "var(--ink)" }}
        >
          Collection not found.
        </div>
        <button
          onClick={() => navigate("/")}
          className="btn sans"
          style={{ marginTop: 12 }}
        >
          ← Library
        </button>
      </div>
    );
  }

  return (
    <>
      <CollectionDetail
        collection={collection}
        onBack={() => navigate("/")}
        onAddLesson={() => setLessonModalOpen(true)}
        onDeleteCollection={() => {
          if (
            confirm(
              "Delete this collection and all its lessons? This cannot be undone.",
            )
          ) {
            deleteCollection.mutate();
          }
        }}
      />
      {lessonModalOpen && (
        <CreateLessonModal
          collectionId={collection.id}
          onClose={() => setLessonModalOpen(false)}
        />
      )}
    </>
  );
}
