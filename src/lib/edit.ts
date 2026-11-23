// Opérations d'édition sur la configuration. Elles modifient le brouillon reçu
// (voir `useStore().update`) et sont testées sans interface.

import type { Config, Group, SectionKind, Tile } from "./types";

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function blankTile(partial: Partial<Tile> = {}): Tile {
  return {
    id: newId("tile"),
    name: "",
    target: "",
    icon: { kind: "auto" },
    args: "",
    workingDir: "",
    runAsAdmin: false,
    ...partial,
  };
}

export type TileLocation = { groupId: string; index: number };

export function findTile(config: Config, section: SectionKind, tileId: string) {
  for (const group of config.sections[section].groups) {
    const index = group.tiles.findIndex((t) => t.id === tileId);
    if (index >= 0) return { group, index, tile: group.tiles[index] };
  }
  return undefined;
}

export function findGroup(config: Config, section: SectionKind, groupId: string): Group | undefined {
  return config.sections[section].groups.find((g) => g.id === groupId);
}

/** Ajoute une tuile à la fin d'un groupe (ou à une position donnée). */
export function addTile(config: Config, section: SectionKind, groupId: string, tile: Tile, index?: number) {
  const group = findGroup(config, section, groupId);
  if (!group) return false;
  const at = index === undefined ? group.tiles.length : clamp(index, 0, group.tiles.length);
  group.tiles.splice(at, 0, tile);
  return true;
}

/** Remplace une tuile ; la déplace à la fin de `groupId` si le groupe change. */
export function updateTile(config: Config, section: SectionKind, tile: Tile, groupId?: string) {
  const found = findTile(config, section, tile.id);
  if (!found) return false;
  if (!groupId || groupId === found.group.id) {
    found.group.tiles[found.index] = tile;
    return true;
  }
  const target = findGroup(config, section, groupId);
  if (!target) return false;
  found.group.tiles.splice(found.index, 1);
  target.tiles.push(tile);
  return true;
}

/** Retire une tuile et renvoie de quoi l'annuler. */
export function removeTile(config: Config, section: SectionKind, tileId: string) {
  const found = findTile(config, section, tileId);
  if (!found) return undefined;
  found.group.tiles.splice(found.index, 1);
  return { tile: found.tile, groupId: found.group.id, index: found.index };
}

/**
 * Déplace une tuile vers `toGroupId` à la position `toIndex`, calculée dans la liste
 * du groupe d'arrivée **sans** la tuile déplacée.
 */
export function moveTile(config: Config, section: SectionKind, tileId: string, toGroupId: string, toIndex: number) {
  const target = findGroup(config, section, toGroupId);
  const found = findTile(config, section, tileId);
  if (!target || !found) return false;
  found.group.tiles.splice(found.index, 1);
  target.tiles.splice(clamp(toIndex, 0, target.tiles.length), 0, found.tile);
  return true;
}

export function addGroup(config: Config, section: SectionKind, name: string): Group {
  const group: Group = { id: newId("group"), name, collapsed: false, tiles: [] };
  config.sections[section].groups.push(group);
  return group;
}

export function renameGroup(config: Config, section: SectionKind, groupId: string, name: string) {
  const group = findGroup(config, section, groupId);
  const clean = name.trim();
  if (!group || !clean) return false;
  group.name = clean;
  return true;
}

export function removeGroup(config: Config, section: SectionKind, groupId: string) {
  const groups = config.sections[section].groups;
  const index = groups.findIndex((g) => g.id === groupId);
  if (index < 0) return undefined;
  const [group] = groups.splice(index, 1);
  return { group, index };
}

export function insertGroup(config: Config, section: SectionKind, group: Group, index: number) {
  const groups = config.sections[section].groups;
  groups.splice(clamp(index, 0, groups.length), 0, group);
}

/** Déplace un groupe à `toIndex` (position dans la liste sans le groupe déplacé). */
export function moveGroup(config: Config, section: SectionKind, groupId: string, toIndex: number) {
  const removed = removeGroup(config, section, groupId);
  if (!removed) return false;
  insertGroup(config, section, removed.group, toIndex);
  return true;
}

/** Ajoute `https://` à une adresse sans protocole ; `null` si ce n'est pas une adresse web. */
export function normalizeUrl(input: string): string | null {
  let text = input.trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || !url.hostname.includes(".") && url.hostname !== "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Nom proposé pour une cible : nom de fichier sans extension, nom de dossier ou domaine. */
export function suggestName(section: SectionKind, target: string): string {
  const text = target.trim();
  if (!text) return "";
  if (section === "websites") {
    const url = normalizeUrl(text);
    if (!url) return "";
    // Le nom de domaine sans sous-domaine ni extension : fr.wikipedia.org → Wikipedia.
    const labels = new URL(url).hostname.split(".");
    const base = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }
  const parts = text.replace(/[\\/]+$/, "").split(/[\\/]/);
  const last = parts[parts.length - 1] ?? "";
  if (section === "folders") return last || text;
  if (/^shell:/i.test(text)) return last.split("!")[0].split("_")[0].split(".").pop() ?? last;
  return last.replace(/\.(exe|lnk|bat|cmd|com|msc|appref-ms|url)$/i, "");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
