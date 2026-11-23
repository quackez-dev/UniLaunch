// Appels aux commandes Rust (voir `src-tauri/src/commands.rs`).

import { invoke } from "@tauri-apps/api/core";
import type { Config, SectionKind } from "./types";

export function getConfig(): Promise<Config> {
  return invoke<Config>("get_config");
}

/** Enregistre ; renvoie les avertissements (raccourci global indisponible…). */
export function saveConfig(config: Config): Promise<string[]> {
  return invoke<string[]>("save_config", { config });
}

/** Indique au backend si le mode édition est actif. */
export function setEditingFlag(editing: boolean): Promise<void> {
  return invoke("set_editing", { editing });
}

/** Cache ou réduit la fenêtre après un lancement, selon les réglages. */
export function afterLaunch(): Promise<void> {
  return invoke("after_launch");
}

export function hideWindow(): Promise<void> {
  return invoke("hide_window");
}

/** Avertissement du démarrage (configuration corrompue…), remis une seule fois. */
export function takeStartupWarning(): Promise<string | null> {
  return invoke<string | null>("take_startup_warning");
}

/** Lance une tuile. Rejette avec un `LaunchError` en cas d'échec. */
export function launchTile(section: SectionKind, tileId: string, asAdmin = false): Promise<void> {
  return invoke("launch_tile", { section, tileId, asAdmin });
}
