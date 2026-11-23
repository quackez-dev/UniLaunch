// Navigation au clavier entre les résultats de recherche, selon leur position à l'écran.
// Fonction pure sur des rectangles : facile à tester, sans dépendre du DOM.

import type { Box } from "./dragTarget";

export type Direction = "left" | "right" | "up" | "down";

/** Une tuile affichée : sa colonne (section) et son rectangle à l'écran. */
export type NavItem = { column: string; box: Box };

/** Écart (px) en dessous duquel deux tuiles sont considérées sur la même ligne. */
const ROW_TOLERANCE = 4;

const centerX = (b: Box) => b.left + b.width / 2;
const sameRow = (a: Box, b: Box) => Math.abs(a.top - b.top) <= ROW_TOLERANCE;

/**
 * Parmi `candidates`, garde la ligne la plus proche de `from` (en hauteur),
 * puis la tuile la plus proche horizontalement dans cette ligne.
 */
function closestInNearestRow(items: NavItem[], candidates: number[], from: Box): number | undefined {
  if (candidates.length === 0) return undefined;
  const rowGap = Math.min(...candidates.map((i) => Math.abs(items[i].box.top - from.top)));
  const row = candidates.filter((i) => Math.abs(items[i].box.top - from.top) - rowGap <= ROW_TOLERANCE);
  return row.reduce((best, i) =>
    Math.abs(centerX(items[i].box) - centerX(from)) < Math.abs(centerX(items[best].box) - centerX(from)) ? i : best,
  );
}

/**
 * Index de la tuile atteinte depuis `from` dans la direction donnée (`from` s'il n'y en a aucune).
 *
 * - Haut / bas : on reste dans la même colonne ; ligne la plus proche, puis tuile la plus proche horizontalement.
 * - Gauche / droite : tuile voisine sur la même ligne ; au bout de la ligne, colonne voisine
 *   (la plus proche qui a des résultats), à la hauteur la plus proche.
 */
export function navigate(items: NavItem[], from: number, dir: Direction): number {
  const cur = items[from];
  if (!cur) return from;
  const others = items.map((_, i) => i).filter((i) => i !== from);

  if (dir === "up" || dir === "down") {
    const sign = dir === "down" ? 1 : -1;
    const candidates = others.filter(
      (i) => items[i].column === cur.column && (items[i].box.top - cur.box.top) * sign > ROW_TOLERANCE,
    );
    return closestInNearestRow(items, candidates, cur.box) ?? from;
  }

  const sign = dir === "right" ? 1 : -1;
  const ahead = (i: number) => (centerX(items[i].box) - centerX(cur.box)) * sign > 0;

  // Tuile voisine sur la même ligne, dans la même colonne.
  const inRow = others.filter((i) => items[i].column === cur.column && sameRow(items[i].box, cur.box) && ahead(i));
  if (inRow.length > 0) {
    return inRow.reduce((best, i) =>
      Math.abs(centerX(items[i].box) - centerX(cur.box)) < Math.abs(centerX(items[best].box) - centerX(cur.box))
        ? i
        : best,
    );
  }

  // Sinon, colonne voisine : celle de la tuile la plus proche horizontalement.
  const outside = others.filter((i) => items[i].column !== cur.column && ahead(i));
  if (outside.length === 0) return from;
  const nearest = outside.reduce((best, i) =>
    Math.abs(centerX(items[i].box) - centerX(cur.box)) < Math.abs(centerX(items[best].box) - centerX(cur.box))
      ? i
      : best,
  );
  const column = items[nearest].column;
  return closestInNearestRow(items, outside.filter((i) => items[i].column === column), cur.box) ?? from;
}
