import type { ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useT } from "../store";
import { Logo } from "./Logo";
import "./TitleBar.css";

/** Barre de titre personnalisée (la fenêtre n'a pas de cadre Windows). */
export function TitleBar({ center, actions }: { center?: ReactNode; actions?: ReactNode }) {
  const t = useT();
  const appWindow = getCurrentWindow();

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar__brand" data-tauri-drag-region>
        <Logo />
        <span className="titlebar__name" data-tauri-drag-region>
          {t("app.name")}
        </span>
      </div>
      <div className="titlebar__center" data-tauri-drag-region>
        {center}
      </div>
      <div className="titlebar__actions">
        {actions}
        {actions && <span className="titlebar__sep" aria-hidden="true" />}
        <button
          type="button"
          className="titlebar__winbtn"
          aria-label={t("window.minimize")}
          onClick={() => void appWindow.minimize()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar__winbtn titlebar__winbtn--close"
          aria-label={t("window.close")}
          onClick={() => void appWindow.close()}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
