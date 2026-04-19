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
    <div className="flex gap-0.5 rounded-md border border-rule bg-paper-sunk p-0.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`sans flex-1 cursor-pointer rounded border-0 px-2 py-[5px] text-[11px] ${
              active
                ? "bg-paper font-semibold text-ink shadow-[var(--shadow-sm)]"
                : "bg-transparent font-normal text-ink-soft shadow-none"
            }`}
          >
            {o.label}
          </button>
        );
      })}
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
    <div className="mb-4">
      <div className="mono mb-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-faint">
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
  const { settings, update } = useReaderSettings();
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
    <div ref={ref} className="fixed bottom-5 right-5 z-[60]">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="sans flex cursor-pointer items-center gap-2 rounded-full border border-rule bg-paper-deep px-3.5 py-2.5 text-[12px] font-medium text-ink shadow-[var(--shadow-md)]"
          title="Reader settings"
        >
          <span className="h-2 w-2 rounded-full bg-accent" />
          Tweaks
        </button>
      )}

      {open && (
        <div className="w-[300px] overflow-hidden rounded-xl border border-rule bg-paper-deep shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <div className="display text-[16px] font-medium text-ink">
              Tweaks
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn btn-ghost px-1.5 py-0.5 text-sm leading-none"
            >
              ×
            </button>
          </div>

          <div
            className="nice-scroll max-h-[70vh] overflow-y-auto px-4 py-3.5"
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
                className="w-full accent-accent"
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
                className="w-full accent-accent"
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
                className="w-full accent-accent"
              />
            </Group>

            <div className="mt-1 border-t border-rule-soft pt-3.5">
              <Group label="Audio">
                <button
                  onClick={() => setShowAudioConfirm(true)}
                  disabled={isGenerating}
                  className="btn sans w-full px-2.5 py-2 text-[12px]"
                >
                  {isGenerating
                    ? "Generating…"
                    : hasAudio
                      ? "Regenerate audio (TTS)"
                      : "Generate audio (TTS)"}
                </button>
                {generateError && (
                  <p className="mono mt-1.5 text-[10px] text-accent">
                    {generateError.message}
                  </p>
                )}
              </Group>
            </div>
          </div>
        </div>
      )}

      {showAudioConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[oklch(0_0_0_/_0.4)]">
          <div className="mx-4 max-w-[380px] rounded-[10px] border border-rule bg-paper p-6 shadow-[var(--shadow-lg)]">
            <div className="display mb-2 text-[20px] font-medium text-ink">
              Generate audio?
            </div>
            <p className="mb-4 text-[13px] leading-[1.5] text-ink-soft">
              This will use your TTS API to generate audio for the entire
              lesson text. Depending on the length of the lesson and your
              provider, this can be expensive.
            </p>
            <div className="flex justify-end gap-2">
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
