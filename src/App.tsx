import { useEffect } from "react";
import { Columns } from "./components/Columns";
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
    <div className="app">
      <TitleBar />
      {config ? <Columns /> : <main className="app__loading">{t("status.loading")}</main>}
      <StatusBar />
      <ContextMenu />
      <ToastView />
    </div>
  );
}

export default App;
