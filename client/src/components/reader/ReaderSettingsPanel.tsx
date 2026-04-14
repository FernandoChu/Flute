import { useReaderSettings } from "../../hooks/useReaderSettings";
import { useState } from "react";

const FONT_OPTIONS = [
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
];

export default function ReaderSettingsPanel() {
  const [open, setOpen] = useState(false);
  const { settings, update, reset } = useReaderSettings();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-white border border-gray-300 rounded-lg p-2 shadow-sm hover:bg-gray-50 transition-colors"
        title="Reader settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5 text-gray-600"
        >
          <path
            fillRule="evenodd"
            d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962a1 1 0 0 1 .125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.473.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.962.962a1 1 0 0 1-1.262.125l-1.25-.834a6.953 6.953 0 0 1-1.416.587l-.295 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.957 6.957 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-.962-.962a1 1 0 0 1-.125-1.262l.834-1.25a6.957 6.957 0 0 1-.587-1.416l-1.473-.295A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.962-.962A1 1 0 0 1 5.38 3.23l1.25.834a6.957 6.957 0 0 1 1.416-.587l.295-1.473ZM13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-12 right-0 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-700">Reader Settings</h3>
            <button
              onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Reset
            </button>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min={12}
              max={32}
              step={1}
              value={settings.fontSize}
              onChange={(e) => update("fontSize", Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Line Height */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Line Height: {settings.lineHeight.toFixed(2)}
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.25}
              value={settings.lineHeight}
              onChange={(e) => update("lineHeight", Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Font</label>
            <div className="flex gap-1">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => update("fontFamily", f.value)}
                  className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                    settings.fontFamily === f.value
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Align */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Alignment</label>
            <div className="flex gap-1">
              {(["left", "justify"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => update("textAlign", a)}
                  className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                    settings.textAlign === a
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {a === "left" ? "Left" : "Justify"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
