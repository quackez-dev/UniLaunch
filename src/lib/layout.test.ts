import { describe, expect, it } from "vitest";
import { normalizeColumns, resizeColumns } from "./layout";

describe("resizeColumns", () => {
  it("agrandit une colonne au détriment de sa voisine", () => {
    const w = resizeColumns([1, 1, 1], 1, 90, 900);
    expect(w[0]).toBeCloseTo(1.3);
    expect(w[1]).toBeCloseTo(0.7);
    expect(w[2]).toBe(1);
  });

  it("respecte la largeur minimale", () => {
    // 900 px, minimum 200 px = 0,667 en proportion.
    const w = resizeColumns([1, 1, 1], 1, 500, 900);
    expect(w[1]).toBeCloseTo(2 / 3);
    expect(w[0]).toBeCloseTo(4 / 3);
  });

  it("ignore un index invalide", () => {
    expect(resizeColumns([1, 1, 1], 0, 50, 900)).toEqual([1, 1, 1]);
    expect(resizeColumns([1, 1, 1], 3, 50, 900)).toEqual([1, 1, 1]);
  });
});

describe("normalizeColumns", () => {
  it("corrige les valeurs absentes ou invalides", () => {
    expect(normalizeColumns(undefined)).toEqual([1, 1, 1]);
    expect(normalizeColumns([2, -1, NaN])).toEqual([2, 1, 1]);
    expect(normalizeColumns([1, 2])).toEqual([1, 2, 1]);
  });
});
