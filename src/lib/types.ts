// Types de la configuration — miroir de `src-tauri/src/config.rs` (JSON en camelCase).

export type SectionKind = "apps" | "folders" | "websites";

export type IconSpec =
  | { kind: "auto" }
  | { kind: "custom"; path: string }
  | { kind: "monogram" };

export interface Tile {
  id: string;
  name: string;
  /** Chemin, URL ou `shell:AppsFolder\<AUMID>`. */
  target: string;
  icon: IconSpec;
  args: string;
  workingDir: string;
  runAsAdmin: boolean;
}

export interface Group {
  id: string;
  name: string;
  collapsed: boolean;
  tiles: Tile[];
}

export interface Section {
  groups: Group[];
}

export interface Settings {
  language: "fr" | "en";
  accentColor: string;
  tileSize: "S" | "M" | "L";
  showLabels: "always" | "hover";
  windowMode: "window" | "tray";
  windowScale: number;
  columnWidths: [number, number, number];
  hotkey: string;
  hideAfterLaunch: boolean;
  hideOnBlur: boolean;
  startWithWindows: boolean;
}

export interface Config {
  schemaVersion: number;
  settings: Settings;
  sections: Record<SectionKind, Section>;
}

export type LaunchError =
  | { kind: "notFound"; detail: string }
  | { kind: "invalidUrl"; detail: string }
  | { kind: "emptyTarget" }
  | { kind: "cancelled" }
  | { kind: "failed"; detail: string };
