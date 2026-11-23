import { hotkeyKeys } from "../lib/hotkey";
import { useStore, useT } from "../store";
import "./StatusBar.css";

/** Barre du bas : indication contextuelle et raccourci global. */
export function StatusBar({ hint }: { hint?: string }) {
  const t = useT();
  const hotkey = useStore((s) => s.config?.settings.hotkey ?? "");
  const lang = useStore((s) => s.config?.settings.language ?? "fr");
  const editing = useStore((s) => s.editing);

  const keys = hotkeyKeys(hotkey, lang);

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
