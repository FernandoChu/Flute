import { useEffect, useRef, useState } from "react";
import {
  useReaderSettings,
  type Theme,
  type StatusViz,
  type BodyFont,
  type ColWidth,
} from "../../hooks/useReaderSettings";

interface Props {
  perPage: number;
  onPerPageChange: (n: number) => void;
  hasAudio: boolean;
  isGenerating: boolean;
  generateError: Error | null;
  onGenerateAudio: () => void;
}

interface SegOpt<T extends string> {
  value: T;
  label: string;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOpt<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--paper-sunk)",
        border: "1px solid var(--rule)",
        borderRadius: 6,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="sans"
          style={{
            flex: 1,
            padding: "5px 8px",
            fontSize: 11,
            background: value === o.value ? "var(--paper)" : "transparent",
            border: 0,
            borderRadius: 4,
            color: value === o.value ? "var(--ink)" : "var(--ink-soft)",
            fontWeight: value === o.value ? 600 : 400,
            cursor: "pointer",
            boxShadow: value === o.value ? "var(--shadow-sm)" : "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export default function ReaderSettingsPanel({
  perPage,
  onPerPageChange,
  hasAudio,
  isGenerating,
  generateError,
  onGenerateAudio,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showAudioConfirm, setShowAudioConfirm] = useState(false);
  const { settings, update, reset } = useReaderSettings();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", bottom: 20, right: 20, zIndex: 60 }}
    >
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="sans"
          style={{
            padding: "10px 14px",
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            borderRadius: 999,
            boxShadow: "var(--shadow-md)",
            fontSize: 12,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: "var(--ink)",
          }}
          title="Reader settings"
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--accent)",
            }}
          />
          Tweaks
        </button>
      )}

      {open && (
        <div
          style={{
            width: 300,
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            borderRadius: 12,
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--rule)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              className="display"
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              Tweaks
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={reset}
                className="btn btn-ghost"
                style={{ padding: "2px 8px", fontSize: 11 }}
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                className="btn btn-ghost"
                style={{ padding: "2px 6px", fontSize: 14, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          </div>

          <div
            className="nice-scroll"
            style={{
              padding: "14px 16px",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <Group label="Theme">
              <Segmented<Theme>
                options={[
                  { value: "paper", label: "Paper" },
                  { value: "sepia", label: "Sepia" },
                  { value: "dark", label: "Dark" },
                ]}
                value={settings.theme}
                onChange={(v) => update("theme", v)}
              />
            </Group>

            <Group label="Word status · viz">
              <Segmented<StatusViz>
                options={[
                  { value: "underline", label: "Underline" },
                  { value: "highlight", label: "Highlight" },
                  { value: "dot", label: "Dot" },
                ]}
                value={settings.statusViz}
                onChange={(v) => update("statusViz", v)}
              />
            </Group>

            <Group label="Reader · body font">
              <Segmented<BodyFont>
                options={[
                  { value: "serif", label: "Serif" },
                  { value: "sans", label: "Sans" },
                  { value: "mono", label: "Mono" },
                ]}
                value={settings.bodyFont}
                onChange={(v) => update("bodyFont", v)}
              />
            </Group>

            <Group label={`Reader · font size · ${settings.fontSize}px`}>
              <input
                type="range"
                min={14}
                max={26}
                step={1}
                value={settings.fontSize}
                onChange={(e) => update("fontSize", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
            </Group>

            <Group
              label={`Reader · line height · ${settings.lineHeight.toFixed(2)}`}
            >
              <input
                type="range"
                min={1.4}
                max={2.0}
                step={0.05}
                value={settings.lineHeight}
                onChange={(e) => update("lineHeight", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
            </Group>

            <Group label="Reader · column width">
              <Segmented<ColWidth>
                options={[
                  { value: "narrow", label: "Narrow" },
                  { value: "medium", label: "Medium" },
                  { value: "wide", label: "Wide" },
                ]}
                value={settings.colWidth}
                onChange={(v) => update("colWidth", v)}
              />
            </Group>

            <Group label="Reader · alignment">
              <Segmented<"left" | "justify">
                options={[
                  { value: "left", label: "Left" },
                  { value: "justify", label: "Justify" },
                ]}
                value={settings.textAlign}
                onChange={(v) => update("textAlign", v)}
              />
            </Group>

            <Group label={`Paragraphs per page · ${perPage}`}>
              <input
                type="range"
                min={2}
                max={30}
                step={1}
                value={perPage}
                onChange={(e) => onPerPageChange(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
            </Group>

            <div
              style={{
                borderTop: "1px solid var(--rule-soft)",
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <Group label="Audio">
                <button
                  onClick={() => setShowAudioConfirm(true)}
                  disabled={isGenerating}
                  className="btn sans"
                  style={{
                    width: "100%",
                    fontSize: 12,
                    padding: "8px 10px",
                  }}
                >
                  {isGenerating
                    ? "Generating…"
                    : hasAudio
                      ? "Regenerate audio (TTS)"
                      : "Generate audio (TTS)"}
                </button>
                {generateError && (
                  <p
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--accent)",
                      marginTop: 6,
                    }}
                  >
                    {generateError.message}
                  </p>
                )}
              </Group>
            </div>
          </div>
        </div>
      )}

      {showAudioConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "oklch(0 0 0 / 0.4)",
          }}
        >
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              borderRadius: 10,
              boxShadow: "var(--shadow-lg)",
              padding: 24,
              maxWidth: 380,
              margin: "0 16px",
            }}
          >
            <div
              className="display"
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "var(--ink)",
                marginBottom: 8,
              }}
            >
              Generate audio?
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--ink-soft)",
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              This will use your TTS API to generate audio for the entire
              lesson text. Depending on the length of the lesson and your
              provider, this can be expensive.
            </p>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setShowAudioConfirm(false)}
                className="btn sans"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAudioConfirm(false);
                  onGenerateAudio();
                }}
                className="btn btn-primary sans"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
