import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import VocabularyFilters from "../components/vocabulary/VocabularyFilters";
import VocabularyTable from "../components/vocabulary/VocabularyTable";
import Pagination from "../components/common/Pagination";

interface VocabularyResponse {
  data: {
    words: any[];
    total: number;
    page: number;
    pages: number;
  };
}

interface StatsResponse {
  data: {
    total: number;
    new: number;
    learning: number;
    known: number;
    ignored: number;
    dueReviews: number;
  };
}

export default function VocabularyPage() {
  const queryClient = useQueryClient();
  const [languageId, setLanguageId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryParams = new URLSearchParams({
    ...(languageId && { languageId }),
    ...(status && { status }),
    ...(search && { search }),
    sortBy,
    sortDir,
    page: String(page),
    limit: "20",
  }).toString();

  const { data: vocabData, isLoading } = useQuery({
    queryKey: ["vocabulary", queryParams],
    queryFn: () => apiFetch<VocabularyResponse>(`/vocabulary?${queryParams}`),
  });

  const { data: statsData } = useQuery({
    queryKey: ["vocabulary-stats", languageId],
    queryFn: () => {
      const params = languageId ? `?languageId=${languageId}` : "";
      return apiFetch<StatsResponse>(`/vocabulary/stats${params}`);
    },
  });

  const stats = statsData?.data;

  const handleSort = useCallback(
    (field: string) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  const handleLanguageChange = useCallback((value: string) => {
    setLanguageId(value);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    queryClient.invalidateQueries({ queryKey: ["vocabulary-stats"] });
  }, [queryClient]);

  const invalidateAndClearSelection = useCallback(() => {
    invalidate();
    setSelectedIds(new Set());
  }, [invalidate]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    const words = vocabData?.data.words ?? [];
    setSelectedIds((prev) => {
      const allSelected = words.every((w: any) => prev.has(w.id));
      if (allSelected) return new Set();
      return new Set(words.map((w: any) => w.id));
    });
  }, [vocabData]);

  const handleBulkStatusChange = async (newStatus: number) => {
    if (selectedIds.size === 0) return;
    await apiFetch("/words/batch-status", {
      method: "PATCH",
      body: JSON.stringify({ wordIds: [...selectedIds], status: newStatus }),
    });
    invalidateAndClearSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} word(s)?`)) return;
    await apiFetch("/words/batch", {
      method: "DELETE",
      body: JSON.stringify({ wordIds: [...selectedIds] }),
    });
    invalidateAndClearSelection();
  };

  const handleDeleteAll = async () => {
    if (!stats || stats.total === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ALL ${stats.total} words? This action cannot be undone.`,
      )
    )
      return;
    await apiFetch("/words/all", { method: "DELETE" });
    invalidateAndClearSelection();
  };

  const statCards = stats
    ? [
        { label: "Total", value: stats.total.toLocaleString() },
        { label: "New", value: stats.new.toLocaleString() },
        { label: "Learning", value: stats.learning.toLocaleString() },
        { label: "Known", value: stats.known.toLocaleString() },
        {
          label: "Due reviews",
          value: stats.dueReviews.toLocaleString(),
          accent: true,
        },
      ]
    : [];

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
            Vocabulary
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
            Everything you've marked.
          </h1>
        </div>
        <button
          onClick={handleDeleteAll}
          disabled={!stats || stats.total === 0}
          className="btn btn-danger sans"
        >
          Delete all
        </button>
      </div>

      {stats && stats.total > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            border: "1px solid var(--rule)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 28,
            background: "var(--paper-deep)",
          }}
        >
          {statCards.map((s, i) => (
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
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <VocabularyFilters
          languageId={languageId}
          status={status}
          search={search}
          onLanguageChange={handleLanguageChange}
          onStatusChange={handleStatusChange}
          onSearchChange={handleSearchChange}
        />

        <div style={{ flex: 1, minWidth: 0 }} />

        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              className="mono"
              style={{ fontSize: 11, color: "var(--accent)" }}
            >
              {selectedIds.size} selected
            </span>
            <select
              onChange={(e) => {
                if (e.target.value)
                  handleBulkStatusChange(Number(e.target.value));
                e.target.value = "";
              }}
              defaultValue=""
              className="sans"
              style={{
                padding: "7px 10px",
                fontSize: 12,
                background: "var(--paper-sunk)",
                border: "1px solid var(--rule)",
                borderRadius: 6,
                color: "var(--ink)",
              }}
            >
              <option value="" disabled>
                Set status…
              </option>
              <option value="1">Learning 1</option>
              <option value="2">Learning 2</option>
              <option value="3">Learning 3</option>
              <option value="4">Learning 4</option>
              <option value="5">Known</option>
              <option value="6">Ignored</option>
            </select>
            <button
              onClick={handleBulkDelete}
              className="btn btn-danger sans"
              style={{ fontSize: 12 }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div
          className="mono"
          style={{
            padding: "60px 18px",
            textAlign: "center",
            color: "var(--ink-faint)",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Loading…
        </div>
      ) : (
        <>
          <VocabularyTable
            words={vocabData?.data.words ?? []}
            sortBy={sortBy}
            sortDir={sortDir}
            selectedIds={selectedIds}
            onSort={handleSort}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onWordUpdated={invalidate}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 18,
              fontSize: 12,
            }}
          >
            <span className="mono" style={{ color: "var(--ink-faint)" }}>
              {vocabData?.data.total ?? 0} word
              {(vocabData?.data.total ?? 0) !== 1 ? "s" : ""} total
            </span>
            <Pagination
              page={vocabData?.data.page ?? 1}
              pages={vocabData?.data.pages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
