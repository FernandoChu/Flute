import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TRANSLATION_PROVIDERS } from "shared";
import { apiFetch } from "../lib/api";
import KeybindingsSettings from "../components/settings/KeybindingsSettings";

interface ApiKeyInfo {
  id: string;
  provider: string;
  hasKey: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>(
    TRANSLATION_PROVIDERS[0],
  );
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiFetch<{ data: ApiKeyInfo[] }>("/settings/api-keys"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: { provider: string; apiKey: string }) =>
      apiFetch("/settings/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setApiKey("");
      setTestResult(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) =>
      apiFetch(`/settings/api-keys/${provider}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch<{
        data: { valid: boolean; error?: string };
      }>("/settings/api-keys/test", {
        method: "POST",
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });
      setTestResult(res.data);
    } catch {
      setTestResult({ valid: false, error: "Test request failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    saveMutation.mutate({ provider: selectedProvider, apiKey });
  };

  const existingProviders = new Set(keys?.data?.map((k) => k.provider) ?? []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Translation API Keys</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add your own API keys to enable word and sentence translation in the
          reader. Keys are encrypted before storage.
        </p>

        {isLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : (
          <>
            {keys?.data && keys.data.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Configured providers
                </h3>
                <div className="space-y-2">
                  {keys.data.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between bg-gray-50 rounded px-4 py-2"
                    >
                      <div>
                        <span className="font-medium capitalize">
                          {k.provider}
                        </span>
                        <span className="text-xs text-green-600 ml-2">
                          Configured
                        </span>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(k.provider)}
                        disabled={deleteMutation.isPending}
                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TRANSLATION_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p === "google" ? "Google Translate" : "DeepL"}
                      {existingProviders.has(p) ? " (update)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={`Enter your ${selectedProvider === "google" ? "Google Translate" : "DeepL"} API key`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {testResult && (
                <div
                  className={`text-sm px-3 py-2 rounded ${
                    testResult.valid
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {testResult.valid
                    ? "Key is valid!"
                    : `Invalid key: ${testResult.error}`}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={!apiKey.trim() || testing}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {testing ? "Testing..." : "Test key"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || saveMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : "Save key"}
                </button>
              </div>

              {saveMutation.isError && (
                <p className="text-sm text-red-600">
                  {(saveMutation.error as Error).message}
                </p>
              )}
              {saveMutation.isSuccess && (
                <p className="text-sm text-green-600">Key saved successfully.</p>
              )}
            </div>
          </>
        )}
      </section>

      <KeybindingsSettings />
    </div>
  );
}
