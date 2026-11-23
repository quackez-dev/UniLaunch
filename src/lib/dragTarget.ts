// Calcul de la position d'insertion pendant un glisser-déposer interne (tuiles et groupes).
// Fonctions pures sur des rectangles : faciles à tester, sans dépendre du DOM.

export type Box = { left: number; top: number; width: number; height: number };

/**
 * Index d'insertion d'une tuile dans une grille qui se lit ligne par ligne.
 * `boxes` : les tuiles du groupe, **sans** la tuile déplacée, dans l'ordre.
 */
export function tileInsertIndex(boxes: Box[], x: number, y: number): number {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (y < b.top) return i; // le pointeur est au-dessus de la ligne de cette tuile
    if (y <= b.top + b.height && x < b.left + b.width / 2) return i;
  }
  return boxes.length;
}

/** Index d'insertion d'un groupe dans une liste verticale (`boxes` sans le groupe déplacé). */
export function groupInsertIndex(boxes: Box[], y: number): number {
  const i = boxes.findIndex((b) => y < b.top + b.height / 2);
  return i < 0 ? boxes.length : i;
}

export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}
