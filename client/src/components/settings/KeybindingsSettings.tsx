import { Fragment, useState } from "react";
import { useKeybindings, type KeyBinding } from "../../hooks/useKeybindings";

const GROUPS: { key: KeyBinding["group"]; label: string }[] = [
  { key: "navigation", label: "Navigation" },
  { key: "status", label: "Update status" },
  { key: "copy", label: "Copy" },
];

export default function KeybindingsSettings() {
  const { bindings, updateBinding, resetDefaults } = useKeybindings();
  const [capturing, setCapturing] = useState<string | null>(null);

  const handleKeyCapture = (action: string, e: React.KeyboardEvent) => {
    e.preventDefault();
    // Ignore modifier-only presses
    if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
    updateBinding(action, { key: e.key });
    setCapturing(null);
  };

  const clearKey = (action: string) => {
    updateBinding(action, { key: "", enabled: false });
  };

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Reader Keybindings</h2>
        <button
          onClick={resetDefaults}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Reset to defaults
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Configure keyboard shortcuts for the reader. Click a shortcut field and
        press a key to rebind it.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-2 font-medium">Setting</th>
            <th className="pb-2 font-medium w-44">Shortcut</th>
            <th className="pb-2 font-medium w-16 text-center">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => {
            const groupBindings = bindings.filter((b) => b.group === group.key);
            return (
              <Fragment key={group.key}>
                <tr>
                  <td colSpan={3} className="pt-4 pb-1 font-semibold text-gray-800">
                    {group.label}
                  </td>
                </tr>
                {groupBindings.map((binding) => (
                  <tr key={binding.action} className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">{binding.label}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <input
                          readOnly
                          value={
                            capturing === binding.action
                              ? "Press a key..."
                              : binding.key || ""
                          }
                          onFocus={() => setCapturing(binding.action)}
                          onBlur={() => setCapturing(null)}
                          onKeyDown={(e) => handleKeyCapture(binding.action, e)}
                          placeholder="None"
                          className={`w-32 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 ${
                            capturing === binding.action
                              ? "border-blue-400 bg-blue-50"
                              : "border-gray-300"
                          }`}
                        />
                        {binding.key && (
                          <button
                            onClick={() => clearKey(binding.action)}
                            className="text-gray-400 hover:text-gray-600 text-xs px-1"
                            title="Clear shortcut"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="checkbox"
                        checked={binding.enabled}
                        onChange={(e) =>
                          updateBinding(binding.action, { enabled: e.target.checked })
                        }
                        disabled={!binding.key}
                        className="accent-blue-600"
                      />
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

