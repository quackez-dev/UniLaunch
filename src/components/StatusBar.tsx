import { useStore, useT } from "../store";
import "./StatusBar.css";

const KEY_NAMES_FR: Record<string, string> = { Space: "Espace", Shift: "Maj" };

/** Barre du bas : indication contextuelle et raccourci global. */
export function StatusBar({ hint }: { hint?: string }) {
  const t = useT();
  const hotkey = useStore((s) => s.config?.settings.hotkey ?? "");
  const lang = useStore((s) => s.config?.settings.language ?? "fr");
  const editing = useStore((s) => s.editing);

  const keys = hotkey
    .split("+")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => (lang === "fr" ? (KEY_NAMES_FR[k] ?? k) : k));

  return (
    <footer className={`statusbar${editing ? " statusbar--editing" : ""}`}>
      <span className="statusbar__hint">{hint ?? t("status.hint")}</span>
      {keys.length > 0 && (
        <span className="statusbar__keys">
          {keys.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
          <span>{t("status.toggle")}</span>
        </span>
      )}
    </footer>
  );
}
