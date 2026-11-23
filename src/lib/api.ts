// Appels aux commandes Rust (voir `src-tauri/src/commands.rs`).

import { invoke } from "@tauri-apps/api/core";
import type { Config, SectionKind } from "./types";

export function getConfig(): Promise<Config> {
  return invoke<Config>("get_config");
}

export function saveConfig(config: Config): Promise<void> {
  return invoke("save_config", { config });
}

/** Avertissement du démarrage (configuration corrompue…), remis une seule fois. */
export function takeStartupWarning(): Promise<string | null> {
  return invoke<string | null>("take_startup_warning");
}

/** Lance une tuile. Rejette avec un `LaunchError` en cas d'échec. */
export function launchTile(section: SectionKind, tileId: string, asAdmin = false): Promise<void> {
  return invoke("launch_tile", { section, tileId, asAdmin });
}
