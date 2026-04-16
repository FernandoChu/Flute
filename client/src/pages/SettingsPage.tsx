import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TRANSLATION_PROVIDERS, TTS_PROVIDERS } from "shared";
import { apiFetch } from "../lib/api";
import KeybindingsSettings from "../components/settings/KeybindingsSettings";
import DictionarySettings from "../components/settings/DictionarySettings";

interface ApiKeyInfo {
  id: string;
  provider: string;
  hasKey: boolean;
  createdAt: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
}

interface LanguagePrefs {
  nativeLanguageId: number | null;
  studyLanguageId: number | null;
}

interface TtsModel {
  id: string;
  label: string;
}

interface TtsVoice {
  name: string;
  ssmlGender: string;
  naturalSampleRateHertz: number;
}

interface TtsSettingsData {
  ttsModel: string | null;
  ttsVoice: string | null;
}

function TtsSettings({
  isLoading,
  ttsKeys,
  deleteMutation,
  existingProviders,
  selectedTtsProvider,
  setSelectedTtsProvider,
  ttsApiKey,
  setTtsApiKey,
  ttsTestResult,
  setTtsTestResult,
  ttsTesting,
  handleTtsTest,
  handleTtsSave,
  saveMutation,
  hasTtsKey,
  studyLangCode,
}: {
  isLoading: boolean;
  ttsKeys: ApiKeyInfo[] | undefined;
  deleteMutation: any;
  existingProviders: Set<string>;
  selectedTtsProvider: string;
  setSelectedTtsProvider: (v: string) => void;
  ttsApiKey: string;
  setTtsApiKey: (v: string) => void;
  ttsTestResult: { valid: boolean; error?: string } | null;
  setTtsTestResult: (v: { valid: boolean; error?: string } | null) => void;
  ttsTesting: boolean;
  handleTtsTest: () => void;
  handleTtsSave: () => void;
  saveMutation: any;
  hasTtsKey: boolean;
  studyLangCode?: string;
}) {
  const queryClient = useQueryClient();

  const { data: ttsSettings } = useQuery({
    queryKey: ["tts-settings"],
    queryFn: () => apiFetch<{ data: TtsSettingsData }>("/tts/settings"),
  });

  const { data: models } = useQuery({
    queryKey: ["tts-models"],
    queryFn: () => apiFetch<{ data: TtsModel[] }>("/tts/models"),
  });

  const { data: voices } = useQuery({
    queryKey: ["tts-voices", studyLangCode],
    queryFn: () => apiFetch<{ data: TtsVoice[] }>(`/tts/voices?lang=${studyLangCode}`),
    enabled: hasTtsKey && !!studyLangCode,
  });

  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");

  useEffect(() => {
    if (ttsSettings?.data) {
      setSelectedModel(ttsSettings.data.ttsModel ?? "");
      setSelectedVoice(ttsSettings.data.ttsVoice ?? "");
    }
  }, [ttsSettings]);

  // Filter voices by selected model prefix
  const filteredVoices = voices?.data?.filter((v) => {
    if (!selectedModel) return true;
    // Google voice names follow the pattern: langCode-ModelType-Letter (e.g. en-US-Wavenet-A)
    return v.name.toLowerCase().includes(selectedModel.toLowerCase());
  });

  const saveVoiceMutation = useMutation({
    mutationFn: (data: { ttsModel: string | null; ttsVoice: string | null }) =>
      apiFetch("/tts/settings", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tts-settings"] });
    },
  });

  const handleSaveVoice = () => {
    saveVoiceMutation.mutate({
      ttsModel: selectedModel || null,
      ttsVoice: selectedVoice || null,
    });
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <h2 className="text-lg font-semibold mb-4">Text-to-Speech</h2>
      <p className="text-sm text-gray-600 mb-4">
        Add your Google Cloud Text-to-Speech API key and choose a voice to
        generate audio for lessons.
      </p>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <>
          {ttsKeys && ttsKeys.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Configured providers
              </h3>
              <div className="space-y-2">
                {ttsKeys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between bg-gray-50 rounded px-4 py-2"
                  >
                    <div>
                      <span className="font-medium">Google Cloud TTS</span>
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
                value={selectedTtsProvider}
                onChange={(e) => {
                  setSelectedTtsProvider(e.target.value);
                  setTtsTestResult(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TTS_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    Google Cloud TTS
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
                value={ttsApiKey}
                onChange={(e) => {
                  setTtsApiKey(e.target.value);
                  setTtsTestResult(null);
                }}
                placeholder="Enter your Google Cloud TTS API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {ttsTestResult && (
              <div
                className={`text-sm px-3 py-2 rounded ${
                  ttsTestResult.valid
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {ttsTestResult.valid
                  ? "Key is valid!"
                  : `Invalid key: ${ttsTestResult.error}`}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleTtsTest}
                disabled={!ttsApiKey.trim() || ttsTesting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {ttsTesting ? "Testing..." : "Test key"}
              </button>
              <button
                onClick={handleTtsSave}
                disabled={!ttsApiKey.trim() || saveMutation.isPending}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : "Save key"}
              </button>
            </div>
          </div>

          {hasTtsKey && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Voice Settings
              </h3>
              {!studyLangCode && (
                <p className="text-sm text-amber-600">
                  Set your study language above to see available voices.
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setSelectedVoice("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Default</option>
                  {models?.data.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {studyLangCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voice
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Default</option>
                    {filteredVoices?.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} ({v.ssmlGender})
                      </option>
                    ))}
                  </select>
                  {voices?.data && filteredVoices?.length === 0 && selectedModel && (
                    <p className="text-xs text-gray-500 mt-1">
                      No {selectedModel} voices available for this language. Try a different model.
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveVoice}
                  disabled={saveVoiceMutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saveVoiceMutation.isPending ? "Saving..." : "Save voice"}
                </button>
                {saveVoiceMutation.isSuccess && (
                  <p className="text-sm text-green-600">Saved.</p>
                )}
                {saveVoiceMutation.isError && (
                  <p className="text-sm text-red-600">
                    {(saveVoiceMutation.error as Error).message}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
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

  const [selectedTtsProvider, setSelectedTtsProvider] = useState<string>(
    TTS_PROVIDERS[0],
  );
  const [ttsApiKey, setTtsApiKey] = useState("");
  const [ttsTestResult, setTtsTestResult] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [ttsTesting, setTtsTesting] = useState(false);

  const [nativeLangId, setNativeLangId] = useState("");
  const [studyLangId, setStudyLangId] = useState("");

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  const { data: langPrefs } = useQuery({
    queryKey: ["language-prefs"],
    queryFn: () => apiFetch<{ data: LanguagePrefs }>("/settings/languages"),
  });

  useEffect(() => {
    if (langPrefs?.data) {
      setNativeLangId(langPrefs.data.nativeLanguageId?.toString() ?? "");
      setStudyLangId(langPrefs.data.studyLanguageId?.toString() ?? "");
    }
  }, [langPrefs]);

  const saveLangMutation = useMutation({
    mutationFn: (data: { nativeLanguageId: number | null; studyLanguageId: number | null }) =>
      apiFetch("/settings/languages", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["language-prefs"] });
    },
  });

  const handleSaveLanguages = () => {
    saveLangMutation.mutate({
      nativeLanguageId: nativeLangId ? Number(nativeLangId) : null,
      studyLanguageId: studyLangId ? Number(studyLangId) : null,
    });
  };

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

  const handleTtsTest = async () => {
    if (!ttsApiKey.trim()) return;
    setTtsTesting(true);
    setTtsTestResult(null);
    try {
      const res = await apiFetch<{
        data: { valid: boolean; error?: string };
      }>("/settings/api-keys/test", {
        method: "POST",
        body: JSON.stringify({ provider: selectedTtsProvider, apiKey: ttsApiKey }),
      });
      setTtsTestResult(res.data);
    } catch {
      setTtsTestResult({ valid: false, error: "Test request failed" });
    } finally {
      setTtsTesting(false);
    }
  };

  const handleTtsSave = () => {
    if (!ttsApiKey.trim()) return;
    saveMutation.mutate(
      { provider: selectedTtsProvider, apiKey: ttsApiKey },
      { onSuccess: () => { setTtsApiKey(""); setTtsTestResult(null); } },
    );
  };

  const existingProviders = new Set(keys?.data?.map((k) => k.provider) ?? []);
  const translationKeys = keys?.data?.filter((k) =>
    (TRANSLATION_PROVIDERS as readonly string[]).includes(k.provider),
  );
  const ttsKeys = keys?.data?.filter((k) =>
    (TTS_PROVIDERS as readonly string[]).includes(k.provider),
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Language Preferences</h2>
        <p className="text-sm text-gray-600 mb-4">
          Set your native and study languages. These will be used as defaults
          when creating new collections.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Native language
            </label>
            <select
              value={nativeLangId}
              onChange={(e) => setNativeLangId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select language</option>
              {languages?.data.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currently learning
            </label>
            <select
              value={studyLangId}
              onChange={(e) => setStudyLangId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select language</option>
              {languages?.data.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveLanguages}
              disabled={saveLangMutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saveLangMutation.isPending ? "Saving..." : "Save"}
            </button>
            {saveLangMutation.isSuccess && (
              <p className="text-sm text-green-600">Saved.</p>
            )}
            {saveLangMutation.isError && (
              <p className="text-sm text-red-600">
                {(saveLangMutation.error as Error).message}
              </p>
            )}
          </div>
        </div>
      </section>

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
            {translationKeys && translationKeys.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Configured providers
                </h3>
                <div className="space-y-2">
                  {translationKeys.map((k) => (
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

      <TtsSettings
        isLoading={isLoading}
        ttsKeys={ttsKeys}
        deleteMutation={deleteMutation}
        existingProviders={existingProviders}
        selectedTtsProvider={selectedTtsProvider}
        setSelectedTtsProvider={setSelectedTtsProvider}
        ttsApiKey={ttsApiKey}
        setTtsApiKey={setTtsApiKey}
        ttsTestResult={ttsTestResult}
        setTtsTestResult={setTtsTestResult}
        ttsTesting={ttsTesting}
        handleTtsTest={handleTtsTest}
        handleTtsSave={handleTtsSave}
        saveMutation={saveMutation}
        hasTtsKey={existingProviders.has("google-tts")}
        studyLangCode={languages?.data.find((l) => l.id === Number(studyLangId))?.code}
      />

      <DictionarySettings />

      <KeybindingsSettings />
    </div>
  );
}
