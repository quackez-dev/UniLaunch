import { useEffect } from "react";
import { AppsPicker } from "./components/AppsPicker";
import { Columns } from "./components/Columns";
import { ContextMenu } from "./components/ContextMenu";
import { DragGhost } from "./components/DragGhost";
import { EditToggle } from "./components/EditToggle";
import { SearchBox } from "./components/SearchBox";
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
      <TitleBar center={config ? <SearchBox /> : undefined} actions={<EditToggle />} />
      {config ? <Columns /> : <main className="app__loading">{t("status.loading")}</main>}
      <StatusBar hint={hint} />
      <ContextMenu />
      {dialog && config && <TileDialog key={dialog.tile?.id ?? "new"} state={dialog} />}
      {picker && config && <AppsPicker />}
      <DragGhost />
      <ToastView />
    </div>
  );
}

export default App;
