import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AppsPicker } from "./components/AppsPicker";
import { Columns } from "./components/Columns";
import { ContextMenu } from "./components/ContextMenu";
import { DragGhost } from "./components/DragGhost";
import { EditToggle } from "./components/EditToggle";
import { SearchBox } from "./components/SearchBox";
import { SettingsDialog } from "./components/SettingsDialog";
import { StatusBar } from "./components/StatusBar";
import { TileDialog } from "./components/TileDialog";
import { TitleBar } from "./components/TitleBar";
import { ToastView } from "./components/ToastView";
import { useEditStore } from "./editing";
import { accentVars } from "./lib/accent";
import { hideWindow } from "./lib/api";
import { useExternalAdd } from "./lib/useExternalAdd";
import { useSearch, useSearchResults } from "./search";
import { useStore, useT } from "./store";
import "./App.css";

function App() {
  const t = useT();
  const config = useStore((s) => s.config);
  const init = useStore((s) => s.init);
  const accent = config?.settings.accentColor;
  const lang = config?.settings.language ?? "fr";
  const editing = useStore((s) => s.editing);
  const dialog = useEditStore((s) => s.dialog);
  const picker = useEditStore((s) => s.picker);
  const drag = useEditStore((s) => s.drag);
  const query = useSearch((s) => s.query);
  const results = useSearchResults();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useExternalAdd();

  useEffect(() => {
    void init();
  }, [init]);

  // Couleur d'accent : variables CSS sur la racine.
  useEffect(() => {
    if (!accent) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(accentVars(accent))) root.style.setProperty(name, value);
  }, [accent]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Pas de menu contextuel du navigateur (Actualiser, Inspecter…), sauf dans les champs de texte.
  useEffect(() => {
    const block = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("input, textarea")) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  // Échap, quand rien d'autre ne l'a pris (menu, dialogue, recherche) : cache la fenêtre
  // en mode barre système.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const edit = useEditStore.getState();
      if (edit.dialog || edit.picker || edit.drag || edit.renaming || useStore.getState().menu) return;
      if (useSearch.getState().query) {
        useSearch.getState().clear();
        return;
      }
      if (useStore.getState().config?.settings.windowMode === "tray") void hideWindow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Raccourcis du navigateur intégré sans objet dans une app : recharger, imprimer,
  // chercher dans la page… Ctrl+F donne plutôt le focus à la recherche d'UniLaunch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && key === "f") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>(".search__input")?.focus();
        return;
      }
      const blocked =
        e.key === "F5" ||
        e.key === "F7" ||
        (ctrl && ["r", "p", "g", "j", "u", "s", "o", "n"].includes(key)) ||
        (ctrl && e.shiftKey && ["i", "c"].includes(key) && !import.meta.env.DEV);
      if (blocked) e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Fenêtre cachée (perte de focus en mode barre système) : on repart d'un état propre.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        if (focused) return;
        const s = useStore.getState().config?.settings;
        if (s?.windowMode === "tray" && s.hideOnBlur && !useStore.getState().editing) {
          useSearch.getState().clear();
          useStore.getState().closeMenu();
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  let hint: string | undefined;
  if (query.trim()) {
    hint =
      results.length === 0
        ? t("status.searchNone")
        : results.length === 1
          ? t("status.searchOne")
          : t("status.searchMany", { count: results.length });
  } else if (editing) {
    hint = t("status.editHint");
  }

  return (
    <div className={`app${drag ? " app--dragging" : ""}`}>
      <TitleBar
        center={config ? <SearchBox /> : undefined}
        actions={
          <>
            <EditToggle />
            <button
              type="button"
              className="titlebar__winbtn"
              aria-label={t("settings.open")}
              title={t("settings.open")}
              onClick={() => setSettingsOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>
          </>
        }
      />
      {config ? <Columns /> : <main className="app__loading">{t("status.loading")}</main>}
      <StatusBar hint={hint} />
      <ContextMenu />
      {dialog && config && <TileDialog key={dialog.tile?.id ?? "new"} state={dialog} />}
      {picker && config && <AppsPicker />}
      {settingsOpen && config && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
      <DragGhost />
      <ToastView />
    </div>
  );
}

export default App;
