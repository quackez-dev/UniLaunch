import { describe, expect, it } from "vitest";
import { navigate, type NavItem } from "./spatialNav";

// Tuiles de 60 px avec 10 px d'écart. Colonnes : apps à x=0, folders à x=300, websites à x=600.
const tile = (column: string, x: number, y: number): NavItem => ({
  column,
  box: { left: x, top: y, width: 60, height: 60 },
});

//  apps                    folders      websites
//  [0 A1] [1 A2] [2 A3]    [5 F1]       [7 W1]
//  [3 A4] [4 A5]           [6 F2]
const items: NavItem[] = [
  tile("apps", 0, 0),
  tile("apps", 70, 0),
  tile("apps", 140, 0),
  tile("apps", 0, 70),
  tile("apps", 70, 70),
  tile("folders", 300, 0),
  tile("folders", 300, 140), // un en-tête de groupe le sépare de F1
  tile("websites", 600, 70),
];

describe("navigate", () => {
  it("gauche / droite passent à la tuile voisine sur la même ligne", () => {
    expect(navigate(items, 0, "right")).toBe(1);
    expect(navigate(items, 1, "right")).toBe(2);
    expect(navigate(items, 2, "left")).toBe(1);
    expect(navigate(items, 4, "left")).toBe(3);
  });

  it("au bout de la ligne, droite passe à la colonne voisine, à la hauteur la plus proche", () => {
    expect(navigate(items, 2, "right")).toBe(5);
    expect(navigate(items, 4, "right")).toBe(5);
    expect(navigate(items, 6, "right")).toBe(7);
    expect(navigate(items, 5, "left")).toBe(2);
    expect(navigate(items, 6, "left")).toBe(4);
  });

  it("saute une colonne sans résultat", () => {
    const sparse = [tile("apps", 0, 0), tile("websites", 600, 0)];
    expect(navigate(sparse, 0, "right")).toBe(1);
    expect(navigate(sparse, 1, "left")).toBe(0);
  });

  it("ne passe pas à la ligne suivante avec gauche / droite", () => {
    // A5 est en bout de ligne : droite va vers les dossiers, pas vers A3 sur la ligne du dessus.
    expect(navigate(items, 4, "right")).not.toBe(2);
    expect(navigate(items, 3, "left")).toBe(3);
  });

  it("haut / bas restent dans la colonne et visent la tuile la plus proche horizontalement", () => {
    expect(navigate(items, 0, "down")).toBe(3);
    expect(navigate(items, 1, "down")).toBe(4);
    expect(navigate(items, 2, "down")).toBe(4);
    expect(navigate(items, 4, "up")).toBe(1);
    expect(navigate(items, 5, "down")).toBe(6);
    expect(navigate(items, 6, "up")).toBe(5);
  });

  it("reste sur place au bord", () => {
    expect(navigate(items, 3, "down")).toBe(3);
    expect(navigate(items, 0, "up")).toBe(0);
    expect(navigate(items, 7, "right")).toBe(7);
    expect(navigate(items, 7, "down")).toBe(7);
  });

  it("gère une sélection absente", () => {
    expect(navigate([], 0, "right")).toBe(0);
  });
});
