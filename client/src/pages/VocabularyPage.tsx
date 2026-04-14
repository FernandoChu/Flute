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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vocabulary</h1>
        <button
          onClick={handleDeleteAll}
          disabled={!stats || stats.total === 0}
          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Delete All
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="New" value={stats.new} color="text-blue-600" />
          <StatCard label="Learning" value={stats.learning} color="text-yellow-600" />
          <StatCard label="Known" value={stats.known} color="text-green-600" />
          <StatCard label="Ignored" value={stats.ignored} color="text-gray-400" />
          <StatCard label="Due reviews" value={stats.dueReviews} color="text-red-600" />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <VocabularyFilters
            languageId={languageId}
            status={status}
            search={search}
            onLanguageChange={handleLanguageChange}
            onStatusChange={handleStatusChange}
            onSearchChange={handleSearchChange}
          />

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkStatusChange(Number(e.target.value));
                  e.target.value = "";
                }}
                defaultValue=""
                className="px-2 py-1.5 text-sm border border-gray-300 rounded"
              >
                <option value="" disabled>
                  Set status...
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
                className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
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

            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {vocabData?.data.total ?? 0} word(s) total
              </p>
              <Pagination
                page={vocabData?.data.page ?? 1}
                pages={vocabData?.data.pages ?? 1}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
      <p className={`text-2xl font-bold ${color ?? "text-gray-800"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
