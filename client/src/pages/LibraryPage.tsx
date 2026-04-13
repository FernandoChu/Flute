import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "../lib/api";
import CreateCollectionModal from "../components/CreateCollectionModal";
import CreateLessonModal from "../components/CreateLessonModal";

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
}

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [lessonModalCollectionId, setLessonModalCollectionId] = useState<
    string | null
  >(null);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(
    null,
  );

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () =>
      apiFetch<{ data: CollectionWithMeta[] }>("/collections"),
  });

  const { data: lessons } = useQuery({
    queryKey: ["lessons", expandedCollection],
    queryFn: () =>
      apiFetch<{ data: LessonSummary[] }>(
        `/collections/${expandedCollection}/lessons`,
      ),
    enabled: !!expandedCollection,
  });

  const deleteCollection = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections"] }),
  });

  const deleteLesson = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", expandedCollection] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Library</h1>
        <button
          onClick={() => setShowCreateCollection(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Collection
        </button>
      </div>

      {collections?.data.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No collections yet</p>
          <p>Create a collection to start importing content.</p>
        </div>
      )}

      <div className="space-y-4">
        {collections?.data.map((col) => (
          <div key={col.id} className="bg-white rounded-lg border border-gray-200">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedCollection(
                  expandedCollection === col.id ? null : col.id,
                )
              }
            >
              <div>
                <h2 className="text-lg font-semibold">{col.title}</h2>
                <p className="text-sm text-gray-500">
                  {col.sourceLanguage.name} → {col.targetLanguage.name}
                  {" · "}
                  {col._count.lessons} lesson{col._count.lessons !== 1 && "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLessonModalCollectionId(col.id);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Add Lesson
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this collection and all its lessons?")) {
                      deleteCollection.mutate(col.id);
                    }
                  }}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
                <span className="text-gray-400 ml-2">
                  {expandedCollection === col.id ? "▲" : "▼"}
                </span>
              </div>
            </div>

            {expandedCollection === col.id && (
              <div className="border-t border-gray-200 p-4">
                {!lessons?.data || lessons.data.length === 0 ? (
                  <p className="text-sm text-gray-500">No lessons yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {lessons.data.map((lesson) => (
                      <li
                        key={lesson.id}
                        className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
                      >
                        <Link
                          href={`/reader/${lesson.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {lesson.title}
                        </Link>
                        <button
                          onClick={() => {
                            if (confirm("Delete this lesson?")) {
                              deleteLesson.mutate(lesson.id);
                            }
                          }}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

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
