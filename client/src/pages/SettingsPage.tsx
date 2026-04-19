import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TRANSLATION_PROVIDERS, TTS_PROVIDERS } from "shared";
import { apiFetch } from "../lib/api";
import KeybindingsSettings from "../components/settings/KeybindingsSettings";
import DictionarySettings from "../components/settings/DictionarySettings";
import { useReaderSettings } from "../hooks/useReaderSettings";

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

const sectionStyle: React.CSSProperties = {
  background: "var(--paper-deep)",
  border: "1px solid var(--rule)",
  borderRadius: 10,
  padding: 28,
  marginBottom: 24,
};

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

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        gap: 40,
        padding: "22px 0",
        borderTop: "1px solid var(--rule-soft)",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-faint)",
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function LangSection({
  languages,
  nativeLangId,
  studyLangId,
  setNativeLangId,
  setStudyLangId,
  saveLanguages,
  savePending,
  saveSuccess,
  saveError,
}: any) {
  return (
    <Row
      label="Study languages"
      sub="Native language and the language you're studying."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--ink-faint)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Studying
          </div>
          <select
            value={studyLangId}
            onChange={(e: any) => setStudyLangId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select language</option>
            {languages?.data.map((lang: Language) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ color: "var(--ink-faint)", fontSize: 18 }}>→</div>
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--ink-faint)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Translating to
          </div>
          <select
            value={nativeLangId}
            onChange={(e: any) => setNativeLangId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select language</option>
            {languages?.data.map((lang: Language) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={saveLanguages}
          disabled={savePending}
          className="btn btn-primary sans"
        >
          {savePending ? "Saving…" : "Save"}
        </button>
        {saveSuccess && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "oklch(0.4 0.12 150)",
              letterSpacing: "0.04em",
            }}
          >
            Saved.
          </span>
        )}
        {saveError && (
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--accent)",
              letterSpacing: "0.04em",
            }}
          >
            {(saveError as Error).message}
          </span>
        )}
      </div>
    </Row>
  );
}

function TranslationProviderSection({
  keys,
  isLoading,
  selectedProvider,
  setSelectedProvider,
  apiKey,
  setApiKey,
  testResult,
  setTestResult,
  testing,
  handleTest,
  handleSave,
  saveMutation,
  deleteMutation,
  existingProviders,
}: any) {
  const translationKeys = keys?.data?.filter((k: ApiKeyInfo) =>
    (TRANSLATION_PROVIDERS as readonly string[]).includes(k.provider),
  );
  return (
    <Row
      label="Translation provider"
      sub="Bring your own key. Keys are encrypted at rest (AES-256-GCM)."
    >
      {translationKeys && translationKeys.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {translationKeys.map((k: ApiKeyInfo) => (
            <div
              key={k.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--paper-sunk)",
                border: "1px solid var(--rule)",
                borderRadius: 6,
                padding: "10px 14px",
                marginBottom: 6,
              }}
            >
              <div>
                <span
                  style={{
                    textTransform: "capitalize",
                    fontWeight: 500,
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {k.provider}
                </span>
                <span
                  className="mono"
                  style={{
                    marginLeft: 10,
                    fontSize: 10,
                    color: "oklch(0.4 0.12 150)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Configured
                </span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(k.provider)}
                disabled={deleteMutation.isPending}
                className="btn btn-ghost sans"
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  padding: "4px 10px",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {TRANSLATION_PROVIDERS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setSelectedProvider(p);
              setTestResult(null);
            }}
            className="sans"
            style={{
              padding: "10px 16px",
              fontSize: 13,
              background:
                selectedProvider === p ? "var(--paper)" : "transparent",
              border:
                "1px solid " +
                (selectedProvider === p ? "var(--ink)" : "var(--rule)"),
              borderRadius: 8,
              cursor: "pointer",
              color:
                selectedProvider === p
                  ? "var(--ink)"
                  : "var(--ink-soft)",
              fontWeight: selectedProvider === p ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {p}
            {existingProviders.has(p) && (
              <span
                className="mono"
                style={{
                  marginLeft: 8,
                  fontSize: 9,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                ACTIVE
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: 14,
          background: "var(--paper-sunk)",
          border: "1px solid var(--rule)",
          borderRadius: 6,
        }}
      >
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
          {selectedProvider === "google" ? "Google Translate" : "DeepL"} API Key
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setTestResult(null);
          }}
          placeholder="Enter your API key"
          className="input"
        />

        {testResult && (
          <div
            className="mono"
            style={{
              fontSize: 11,
              padding: "8px 12px",
              borderRadius: 5,
              marginTop: 10,
              background: testResult.valid
                ? "oklch(0.94 0.06 150)"
                : "var(--accent-wash)",
              color: testResult.valid
                ? "oklch(0.3 0.1 150)"
                : "var(--accent)",
            }}
          >
            {testResult.valid
              ? "✓ Key is valid."
              : `Invalid key: ${testResult.error}`}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={handleTest}
            disabled={!apiKey.trim() || testing}
            className="btn sans"
          >
            {testing ? "Testing…" : "Test"}
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saveMutation.isPending}
            className="btn btn-primary sans"
          >
            {saveMutation.isPending ? "Saving…" : "Save key"}
          </button>
        </div>
      </div>
    </Row>
  );
}

function TtsSection({
  keys,
  studyLangCode,
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
  deleteMutation,
  existingProviders,
}: any) {
  const queryClient = useQueryClient();

  const hasTtsKey = existingProviders.has("google-tts");

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
    queryFn: () =>
      apiFetch<{ data: TtsVoice[] }>(`/tts/voices?lang=${studyLangCode}`),
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

  const filteredVoices = voices?.data?.filter((v) => {
    if (!selectedModel) return true;
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

  const ttsKeys = keys?.data?.filter((k: ApiKeyInfo) =>
    (TTS_PROVIDERS as readonly string[]).includes(k.provider),
  );

  return (
    <Row
      label="Text-to-Speech"
      sub="Google Cloud TTS key. Generates lesson audio."
    >
      {ttsKeys && ttsKeys.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {ttsKeys.map((k: ApiKeyInfo) => (
            <div
              key={k.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--paper-sunk)",
                border: "1px solid var(--rule)",
                borderRadius: 6,
                padding: "10px 14px",
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 500,
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Google Cloud TTS
                </span>
                <span
                  className="mono"
                  style={{
                    marginLeft: 10,
                    fontSize: 10,
                    color: "oklch(0.4 0.12 150)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Configured
                </span>
              </div>
              <button
                onClick={() => deleteMutation.mutate(k.provider)}
                disabled={deleteMutation.isPending}
                className="btn btn-ghost sans"
                style={{
                  fontSize: 12,
                  color: "var(--accent)",
                  padding: "4px 10px",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          padding: 14,
          background: "var(--paper-sunk)",
          border: "1px solid var(--rule)",
          borderRadius: 6,
          marginBottom: 18,
        }}
      >
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
          API Key
        </div>
        <input
          type="password"
          value={ttsApiKey}
          onChange={(e: any) => {
            setTtsApiKey(e.target.value);
            setTtsTestResult(null);
          }}
          placeholder="Enter your Google Cloud TTS API key"
          className="input"
        />
        {ttsTestResult && (
          <div
            className="mono"
            style={{
              fontSize: 11,
              padding: "8px 12px",
              borderRadius: 5,
              marginTop: 10,
              background: ttsTestResult.valid
                ? "oklch(0.94 0.06 150)"
                : "var(--accent-wash)",
              color: ttsTestResult.valid
                ? "oklch(0.3 0.1 150)"
                : "var(--accent)",
            }}
          >
            {ttsTestResult.valid
              ? "✓ Key is valid."
              : `Invalid key: ${ttsTestResult.error}`}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={handleTtsTest}
            disabled={!ttsApiKey.trim() || ttsTesting}
            className="btn sans"
          >
            {ttsTesting ? "Testing…" : "Test"}
          </button>
          <button
            onClick={handleTtsSave}
            disabled={!ttsApiKey.trim() || saveMutation.isPending}
            className="btn btn-primary sans"
          >
            {saveMutation.isPending ? "Saving…" : "Save key"}
          </button>
        </div>
      </div>

      {hasTtsKey && (
        <div
          style={{
            borderTop: "1px solid var(--rule-soft)",
            paddingTop: 18,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Voice settings
          </div>
          {!studyLangCode && (
            <p
              style={{
                fontSize: 12,
                color: "var(--accent)",
                marginBottom: 10,
              }}
            >
              Set your study language above to see available voices.
            </p>
          )}

          <div style={{ marginBottom: 10 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Model
            </div>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setSelectedVoice("");
              }}
              style={selectStyle}
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
            <div style={{ marginBottom: 12 }}>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Voice
              </div>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                style={selectStyle}
              >
                <option value="">Default</option>
                {filteredVoices?.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.ssmlGender})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <button
              onClick={handleSaveVoice}
              disabled={saveVoiceMutation.isPending}
              className="btn btn-primary sans"
            >
              {saveVoiceMutation.isPending ? "Saving…" : "Save voice"}
            </button>
            {saveVoiceMutation.isSuccess && (
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: "oklch(0.4 0.12 150)",
                  letterSpacing: "0.04em",
                }}
              >
                Saved.
              </span>
            )}
            {saveVoiceMutation.isError && (
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--accent)",
                  letterSpacing: "0.04em",
                }}
              >
                {(saveVoiceMutation.error as Error).message}
              </span>
            )}
          </div>
        </div>
      )}
    </Row>
  );
}

type TabKey =
  | "dictionaries"
  | "languages"
  | "appearance"
  | "keybindings";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dictionaries", label: "Dictionaries" },
  { key: "languages", label: "Languages" },
  { key: "appearance", label: "Appearance" },
  { key: "keybindings", label: "Keybindings" },
];

const THEME_SWATCHES: {
  key: "paper" | "sepia" | "dark";
  label: string;
  swatchBg: string;
  swatchInk: string;
}[] = [
  {
    key: "paper",
    label: "Paper",
    swatchBg: "oklch(0.982 0.008 85)",
    swatchInk: "oklch(0.22 0.01 60)",
  },
  {
    key: "sepia",
    label: "Sepia",
    swatchBg: "oklch(0.955 0.025 75)",
    swatchInk: "oklch(0.28 0.03 45)",
  },
  {
    key: "dark",
    label: "Dark",
    swatchBg: "oklch(0.19 0.008 60)",
    swatchInk: "oklch(0.92 0.008 75)",
  },
];

function AppearanceSection() {
  const { settings, update } = useReaderSettings();
  return (
    <>
      <Row
        label="Theme"
        sub="Applies across the whole app. Sepia warms the page; Dark is low-contrast study mode."
      >
        <div style={{ display: "flex", gap: 10 }}>
          {THEME_SWATCHES.map((t) => {
            const active = settings.theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => update("theme", t.key)}
                className="sans"
                style={{
                  padding: 0,
                  background: "transparent",
                  border:
                    "1px solid " + (active ? "var(--ink)" : "var(--rule)"),
                  borderRadius: 10,
                  cursor: "pointer",
                  overflow: "hidden",
                  textAlign: "left",
                  width: 150,
                  boxShadow: active
                    ? "0 0 0 2px var(--paper), 0 0 0 3px var(--ink)"
                    : "none",
                }}
              >
                <div
                  style={{
                    height: 64,
                    background: t.swatchBg,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "0 14px",
                    gap: 4,
                    borderBottom: "1px solid var(--rule)",
                  }}
                >
                  <div
                    style={{
                      height: 3,
                      width: "70%",
                      background: t.swatchInk,
                      borderRadius: 1,
                      opacity: 0.85,
                    }}
                  />
                  <div
                    style={{
                      height: 3,
                      width: "90%",
                      background: t.swatchInk,
                      borderRadius: 1,
                      opacity: 0.5,
                    }}
                  />
                  <div
                    style={{
                      height: 3,
                      width: "55%",
                      background: t.swatchInk,
                      borderRadius: 1,
                      opacity: 0.5,
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    color: "var(--ink)",
                  }}
                >
                  {t.label}
                  {active && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--accent)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Row>

      <Row
        label="Accent color"
        sub="Reading underlines, selection highlights, and due-review markers."
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--accent)",
              border: "2px solid var(--ink)",
            }}
          />
          <div
            className="mono"
            style={{ fontSize: 12, color: "var(--ink-soft)" }}
          >
            Ink-red · oklch(0.52 0.14 28)
          </div>
        </div>
      </Row>
    </>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("dictionaries");

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
    mutationFn: (data: {
      nativeLanguageId: number | null;
      studyLanguageId: number | null;
    }) =>
      apiFetch("/settings/languages", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["language-prefs"] });
    },
  });

  const saveLanguages = () => {
    saveLangMutation.mutate({
      nativeLanguageId: nativeLangId ? Number(nativeLangId) : null,
      studyLanguageId: studyLangId ? Number(studyLangId) : null,
    });
  };

  const { data: keys } = useQuery({
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
        body: JSON.stringify({
          provider: selectedTtsProvider,
          apiKey: ttsApiKey,
        }),
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
      {
        onSuccess: () => {
          setTtsApiKey("");
          setTtsTestResult(null);
        },
      },
    );
  };

  const existingProviders = new Set(keys?.data?.map((k) => k.provider) ?? []);
  const studyLangCode = languages?.data.find(
    (l) => l.id === Number(studyLangId),
  )?.code;

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "36px 48px 120px",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
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
          Settings
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
          The instrument.
        </h1>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--rule)",
          marginBottom: 8,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="sans"
            style={{
              position: "relative",
              padding: "10px 16px",
              background: "transparent",
              border: 0,
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 450,
              color: tab === t.key ? "var(--ink)" : "var(--ink-soft)",
              cursor: "pointer",
            }}
          >
            {t.label}
            {tab === t.key && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: -1,
                  height: 2,
                  background: "var(--ink)",
                  borderRadius: 1,
                }}
              />
            )}
          </button>
        ))}
      </div>

      <div style={sectionStyle}>
        {tab === "appearance" && <AppearanceSection />}

        {tab === "dictionaries" && (
          <>
            <TranslationProviderSection
              keys={keys}
              isLoading={false}
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              apiKey={apiKey}
              setApiKey={setApiKey}
              testResult={testResult}
              setTestResult={setTestResult}
              testing={testing}
              handleTest={handleTest}
              handleSave={handleSave}
              saveMutation={saveMutation}
              deleteMutation={deleteMutation}
              existingProviders={existingProviders}
            />
            <TtsSection
              keys={keys}
              studyLangCode={studyLangCode}
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
              deleteMutation={deleteMutation}
              existingProviders={existingProviders}
            />
            <Row
              label="Dictionary links"
              sub="Open any word in your favorite external dictionary. Use [FLUTE] as the word placeholder."
            >
              <DictionarySettings />
            </Row>
          </>
        )}

        {tab === "languages" && (
          <LangSection
            languages={languages}
            nativeLangId={nativeLangId}
            studyLangId={studyLangId}
            setNativeLangId={setNativeLangId}
            setStudyLangId={setStudyLangId}
            saveLanguages={saveLanguages}
            savePending={saveLangMutation.isPending}
            saveSuccess={saveLangMutation.isSuccess}
            saveError={
              saveLangMutation.isError ? saveLangMutation.error : null
            }
          />
        )}

        {tab === "keybindings" && (
          <Row
            label="Reader keybindings"
            sub="Click a shortcut field and press a key to rebind."
          >
            <KeybindingsSettings />
          </Row>
        )}

      </div>
    </div>
  );
}
