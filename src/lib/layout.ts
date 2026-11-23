// Dimensions des tuiles et calcul des largeurs de colonnes.

import type { Settings } from "./types";

export type TileMetrics = {
  tile: number;
  icon: number;
  font: number;
  radius: number;
  gap: number;
};

/** Tailles pensées pour une colonne d'environ 300 px (4 tuiles moyennes par ligne). */
export const TILE_SIZES: Record<Settings["tileSize"], TileMetrics> = {
  S: { tile: 56, icon: 26, font: 10, radius: 10, gap: 6 },
  M: { tile: 68, icon: 32, font: 11, radius: 11, gap: 6 },
  L: { tile: 88, icon: 44, font: 12, radius: 13, gap: 8 },
};

/** Largeur minimale d'une colonne, en pixels. */
export const MIN_COLUMN = 200;

/**
 * Déplace le séparateur entre les colonnes `index - 1` et `index` de `dx` pixels.
 * Les largeurs sont des proportions ; `total` est la largeur disponible en pixels.
 */
export function resizeColumns(
  widths: readonly number[],
  index: number,
  dx: number,
  total: number,
  min = MIN_COLUMN,
): number[] {
  const next = [...widths];
  if (index <= 0 || index >= widths.length || total <= 0) return next;
  const sum = widths.reduce((a, b) => a + b, 0);
  const minFr = (min / total) * sum;
  const left = widths[index - 1];
  const right = widths[index];
  // Pas assez de place pour deux colonnes minimales : on ne bouge pas.
  if (left + right < 2 * minFr) return next;
  const d = Math.max(minFr - left, Math.min(right - minFr, (dx / total) * sum));
  next[index - 1] = left + d;
  next[index] = right - d;
  return next;
}

/** Remet des proportions valides (3 nombres positifs). */
export function normalizeColumns(widths: readonly number[] | undefined): [number, number, number] {
  const w = (widths ?? []).slice(0, 3).map((x) => (Number.isFinite(x) && x > 0 ? x : 1));
  while (w.length < 3) w.push(1);
  return [w[0], w[1], w[2]];
}
