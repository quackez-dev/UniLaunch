// Ajout rapide : transforme des éléments reconnus (fichiers déposés, texte collé,
// apps installées) en tuiles, rangées dans la bonne colonne. Fonctions pures, testées.

import { addGroup, blankTile, normalizeUrl, suggestName } from "./edit";
import type { Config, SectionKind, Tile } from "./types";

/** Élément reconnu par le backend (`classify_paths`). */
export type Dropped = {
  section: SectionKind | null;
  name: string;
  target: string;
  source: string;
};

export type QuickAddResult = {
  added: { tile: Tile; section: SectionKind; groupId: string; groupName: string }[];
  duplicates: string[];
  unsupported: string[];
};

function sameTarget(a: string, b: string) {
  return a.trim().replace(/[\\/]+$/, "").toLowerCase() === b.trim().replace(/[\\/]+$/, "").toLowerCase();
}

/**
 * Ajoute les éléments à la configuration (brouillon modifié sur place).
 * `preferred` : groupe sous le pointeur, utilisé quand il est dans la bonne colonne.
 * `newGroupName` : nom du groupe créé si une colonne n'en a aucun.
 */
export function quickAdd(
  config: Config,
  items: Dropped[],
  preferred: { section: SectionKind; groupId: string } | null,
  newGroupName: string,
): QuickAddResult {
  const result: QuickAddResult = { added: [], duplicates: [], unsupported: [] };

  for (const item of items) {
    const section = item.section;
    if (!section) {
      result.unsupported.push(item.name || item.source);
      continue;
    }
    const target = section === "websites" ? normalizeUrl(item.target) : item.target.trim();
    if (!target) {
      result.unsupported.push(item.name || item.source);
      continue;
    }
    const all = config.sections[section].groups.flatMap((g) => g.tiles);
    const name = item.name.trim() || suggestName(section, target) || target;
    if (all.some((t) => sameTarget(t.target, target))) {
      result.duplicates.push(name);
      continue;
    }

    const groups = config.sections[section].groups;
    let group =
      preferred && preferred.section === section ? groups.find((g) => g.id === preferred.groupId) : undefined;
    group ??= groups[0] ?? addGroup(config, section, newGroupName);

    const tile = blankTile({ name, target });
    group.tiles.push(tile);
    result.added.push({ tile, section, groupId: group.id, groupName: group.name });
  }
  return result;
}

/** Lignes non vides d'un texte collé ; une adresse sans protocole reçoit `https://`. */
export function pastedCandidates(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean)
    .slice(0, 50)
    .map((line) => {
      if (/^[a-z]:[\\/]/i.test(line) || line.startsWith("\\\\")) return line; // chemin Windows
      return normalizeUrl(line) ?? line;
    });
}
