import { Fragment, useState } from "react";
import { useKeybindings, type KeyBinding } from "../../hooks/useKeybindings";

const GROUPS: { key: KeyBinding["group"]; label: string }[] = [
  { key: "navigation", label: "Navigation" },
  { key: "status", label: "Update status" },
  { key: "copy", label: "Copy" },
  { key: "audio", label: "Audio" },
];

export default function KeybindingsSettings() {
  const { bindings, updateBinding, resetDefaults } = useKeybindings();
  const [capturing, setCapturing] = useState<string | null>(null);

  const handleKeyCapture = (action: string, e: React.KeyboardEvent) => {
    e.preventDefault();
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Meta");
    parts.push(e.key);
    updateBinding(action, { key: parts.join("+") });
    setCapturing(null);
  };

  const clearKey = (action: string) => {
    updateBinding(action, { key: "", enabled: false });
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 10,
        }}
      >
        <button
          onClick={resetDefaults}
          className="btn btn-ghost sans"
          style={{ fontSize: 11, color: "var(--ink-faint)" }}
        >
          Reset to defaults
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 180px 60px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          paddingBottom: 8,
          borderBottom: "1px solid var(--rule)",
          gap: 14,
        }}
      >
        <div>Action</div>
        <div>Shortcut</div>
        <div style={{ textAlign: "center" }}>On</div>
      </div>

      {GROUPS.map((group) => {
        const groupBindings = bindings.filter((b) => b.group === group.key);
        if (groupBindings.length === 0) return null;
        return (
          <Fragment key={group.key}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                padding: "16px 0 4px",
              }}
            >
              {group.label}
            </div>
            {groupBindings.map((binding) => (
              <div
                key={binding.action}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px 60px",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--rule-soft)",
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 13, color: "var(--ink)" }}>
                  {binding.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    readOnly
                    value={
                      capturing === binding.action
                        ? "Press a key…"
                        : binding.key || ""
                    }
                    onFocus={() => setCapturing(binding.action)}
                    onBlur={() => setCapturing(null)}
                    onKeyDown={(e) => handleKeyCapture(binding.action, e)}
                    placeholder="None"
                    className="mono"
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      fontSize: 11,
                      background:
                        capturing === binding.action
                          ? "var(--accent-wash)"
                          : "var(--paper-sunk)",
                      border:
                        "1px solid " +
                        (capturing === binding.action
                          ? "var(--accent)"
                          : "var(--rule)"),
                      borderRadius: 5,
                      color: "var(--ink)",
                    }}
                  />
                  {binding.key && (
                    <button
                      onClick={() => clearKey(binding.action)}
                      className="btn btn-ghost"
                      style={{
                        fontSize: 14,
                        padding: "2px 6px",
                        color: "var(--ink-faint)",
                      }}
                      title="Clear shortcut"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={binding.enabled}
                    onChange={(e) =>
                      updateBinding(binding.action, {
                        enabled: e.target.checked,
                      })
                    }
                    disabled={!binding.key}
                    style={{ accentColor: "var(--accent)" }}
                  />
                </div>
              </div>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
