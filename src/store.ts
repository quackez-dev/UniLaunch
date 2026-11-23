// État global de l'interface (Zustand) : configuration, mode édition, menu, notifications.

import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { afterLaunch, getConfig, launchTile, saveConfig, setEditingFlag, takeStartupWarning } from "./lib/api";
import { translate, type Language, type MessageKey, type Params } from "./i18n";
import type { Config, LaunchError, SectionKind, Tile } from "./lib/types";

export type Toast = {
  id: number;
  text: string;
  tone: "info" | "error";
  undo?: () => void;
};

export type Menu = {
  section: SectionKind;
  tileId: string;
  x: number;
  y: number;
};

type State = {
  config: Config | null;
  /** Identifiants des tuiles dont la cible n'existe plus. */
  missing: Set<string>;
  editing: boolean;
  toast: Toast | null;
  menu: Menu | null;

  init(): Promise<void>;
  /** Modifie la configuration (copie profonde) et l'enregistre peu après. */
  update(mutator: (draft: Config) => void): void;
  setEditing(editing: boolean): void;
  showToast(text: string, options?: { tone?: Toast["tone"]; undo?: () => void }): void;
  hideToast(): void;
  openMenu(menu: Menu): void;
  closeMenu(): void;
  launch(section: SectionKind, tile: Tile, asAdmin?: boolean): Promise<void>;
  refreshMissing(): Promise<void>;
};

const SAVE_DELAY = 300;
const TOAST_DELAY = 2600;
const UNDO_DELAY = 5000;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastId = 0;

export const useStore = create<State>((set, get) => ({
  config: null,
  missing: new Set(),
  editing: false,
  toast: null,
  menu: null,

  async init() {
    const config = await getConfig();
    set({ config });
    await get().refreshMissing();
    const warning = await takeStartupWarning();
    if (warning) get().showToast(warning, { tone: "error" });
  },

  update(mutator) {
    const current = get().config;
    if (!current) return;
    const next = structuredClone(current);
    mutator(next);
    set({ config: next });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const latest = get().config;
      if (!latest) return;
      saveConfig(latest)
        .then((warnings) => {
          if (warnings.length > 0) get().showToast(warnings.join(" · "), { tone: "error" });
          return get().refreshMissing();
        })
        .catch((error) => get().showToast(t("toast.saveFailed", { error: String(error) }), { tone: "error" }));
    }, SAVE_DELAY);
  },

  setEditing(editing) {
    set({ editing, menu: null });
    void setEditingFlag(editing).catch(() => {});
  },

  showToast(text, options = {}) {
    clearTimeout(toastTimer);
    const toast: Toast = { id: ++toastId, text, tone: options.tone ?? "info", undo: options.undo };
    set({ toast });
    toastTimer = setTimeout(() => {
      if (get().toast?.id === toast.id) set({ toast: null });
    }, options.undo || toast.tone === "error" ? UNDO_DELAY : TOAST_DELAY);
  },

  hideToast() {
    clearTimeout(toastTimer);
    set({ toast: null });
  },

  openMenu(menu) {
    set({ menu });
  },

  closeMenu() {
    set({ menu: null });
  },

  async launch(section, tile, asAdmin = false) {
    set({ menu: null });
    const key: MessageKey =
      section === "folders" ? "toast.openingFolder" : section === "websites" ? "toast.openingSite" : "toast.launching";
    try {
      await launchTile(section, tile.id, asAdmin);
      get().showToast(t(key, { name: tile.name }));
      void afterLaunch().catch(() => {});
    } catch (error) {
      get().showToast(launchErrorText(error), { tone: "error" });
      if ((error as LaunchError)?.kind === "notFound") void get().refreshMissing();
    }
  },

  async refreshMissing() {
    try {
      const ids = await invoke<string[]>("missing_tiles");
      set({ missing: new Set(ids) });
    } catch {
      // Sans importance : l'indicateur « introuvable » est seulement informatif.
    }
  },
}));

/** Langue courante (hors React). */
export function currentLanguage(): Language {
  return useStore.getState().config?.settings.language ?? "fr";
}

/** Traduction hors React (store, gestionnaires d'événements). */
export function t(key: MessageKey, params?: Params): string {
  return translate(currentLanguage(), key, params);
}

/** Traduction dans les composants : se met à jour quand la langue change. */
export function useT() {
  const lang = useStore((s) => s.config?.settings.language ?? "fr");
  return (key: MessageKey, params?: Params) => translate(lang, key, params);
}

export function launchErrorText(error: unknown): string {
  const e = error as LaunchError | undefined;
  switch (e?.kind) {
    case "notFound":
      return t("error.notFound", { detail: e.detail });
    case "invalidUrl":
      return t("error.invalidUrl", { detail: e.detail });
    case "emptyTarget":
      return t("error.emptyTarget");
    case "cancelled":
      return t("error.cancelled");
    case "failed":
      return t("error.failed", { detail: e.detail });
    default:
      return t("error.failed", { detail: String(error) });
  }
}
