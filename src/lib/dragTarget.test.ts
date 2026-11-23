import { describe, expect, it } from "vitest";
import { groupInsertIndex, tileInsertIndex, type Box } from "./dragTarget";

// Grille de 3 tuiles par ligne, 60 px, espacées de 10 px : deux lignes (3 + 2).
const grid: Box[] = [
  { left: 0, top: 0, width: 60, height: 60 },
  { left: 70, top: 0, width: 60, height: 60 },
  { left: 140, top: 0, width: 60, height: 60 },
  { left: 0, top: 70, width: 60, height: 60 },
  { left: 70, top: 70, width: 60, height: 60 },
];

describe("tileInsertIndex", () => {
  it("place avant ou après selon la moitié de la tuile", () => {
    expect(tileInsertIndex(grid, 10, 30)).toBe(0);
    expect(tileInsertIndex(grid, 40, 30)).toBe(1);
    expect(tileInsertIndex(grid, 190, 30)).toBe(3);
    expect(tileInsertIndex(grid, 80, 100)).toBe(4);
  });

  it("va à la fin après la dernière tuile ou dans un groupe vide", () => {
    expect(tileInsertIndex(grid, 180, 100)).toBe(5);
    expect(tileInsertIndex(grid, 0, 500)).toBe(5);
    expect(tileInsertIndex([], 10, 10)).toBe(0);
  });

  it("dans l'espace entre deux lignes, va au début de la ligne suivante", () => {
    expect(tileInsertIndex(grid, 300, 65)).toBe(3);
  });
});

describe("groupInsertIndex", () => {
  const groups: Box[] = [
    { left: 0, top: 0, width: 300, height: 100 },
    { left: 0, top: 110, width: 300, height: 40 },
  ];
  it("compare au milieu de chaque groupe", () => {
    expect(groupInsertIndex(groups, 20)).toBe(0);
    expect(groupInsertIndex(groups, 60)).toBe(1);
    expect(groupInsertIndex(groups, 140)).toBe(2);
  });
});
