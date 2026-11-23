import { useEffect } from "react";
import { Columns } from "./components/Columns";
import { DragGhost } from "./components/DragGhost";
import { EditToggle } from "./components/EditToggle";
import { TileDialog } from "./components/TileDialog";
import { useEditStore } from "./editing";
import { ContextMenu } from "./components/ContextMenu";
import { StatusBar } from "./components/StatusBar";
import { TitleBar } from "./components/TitleBar";
import { ToastView } from "./components/ToastView";
import { accentVars } from "./lib/accent";
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
  const drag = useEditStore((s) => s.drag);

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

  return (
    <div className={`app${drag ? " app--dragging" : ""}`}>
      <TitleBar actions={<EditToggle />} />
      {config ? <Columns /> : <main className="app__loading">{t("status.loading")}</main>}
      <StatusBar hint={editing ? t("status.editHint") : undefined} />
      <ContextMenu />
      {dialog && config && <TileDialog key={dialog.tile?.id ?? "new"} state={dialog} />}
      <DragGhost />
      <ToastView />
    </div>
  );
}

export default App;
