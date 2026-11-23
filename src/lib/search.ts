// Recherche rapide dans les trois colonnes. Insensible à la casse et aux accents.

import type { Config, SectionKind, Tile } from "./types";

export type SearchResult = {
  section: SectionKind;
  groupId: string;
  tile: Tile;
  score: number;
};

const SECTIONS: SectionKind[] = ["apps", "folders", "websites"];

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Score d'un nom pour une requête (0 = pas de correspondance).
 * Chaque mot de la requête doit apparaître ; un nom qui commence par la requête
 * passe avant un mot qui commence par elle, qui passe avant une simple inclusion.
 */
export function matchScore(name: string, query: string): number {
  const n = normalize(name);
  const q = normalize(query);
  if (!q) return 0;
  const tokens = q.split(/\s+/);
  if (!tokens.every((tok) => n.includes(tok))) return 0;
  if (n.startsWith(q)) return 3;
  const words = n.split(/[\s\-_.]+/);
  if (tokens.every((tok) => words.some((w) => w.startsWith(tok)))) return 2;
  return 1;
}

/** Tuiles correspondantes, de la meilleure à la moins bonne (puis dans l'ordre d'affichage). */
export function searchTiles(config: Config, query: string): SearchResult[] {
  if (!normalize(query)) return [];
  const results: SearchResult[] = [];
  for (const section of SECTIONS) {
    for (const group of config.sections[section].groups) {
      for (const tile of group.tiles) {
        const score = matchScore(tile.name, query);
        if (score > 0) results.push({ section, groupId: group.id, tile, score });
      }
    }
  }
  // Tri stable : à score égal, l'ordre d'affichage est conservé.
  return results.sort((a, b) => b.score - a.score);
}
