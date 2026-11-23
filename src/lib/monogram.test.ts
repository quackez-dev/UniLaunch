import { describe, expect, it } from "vitest";
import { folderColors, monogram, monogramColor, MONOGRAM_COLORS } from "./monogram";

describe("monogram", () => {
  it("prend les initiales des deux premiers mots", () => {
    expect(monogram("Visual Studio Code")).toBe("VS");
    expect(monogram("la presse")).toBe("LP");
    expect(monogram("obs-studio")).toBe("OS");
  });

  it("prend les deux premières lettres d'un mot seul", () => {
    expect(monogram("GitHub")).toBe("Gi");
    expect(monogram("éclair")).toBe("Éc");
    expect(monogram("X")).toBe("X");
  });

  it("ignore la ponctuation et gère le vide", () => {
    expect(monogram("Notepad++")).toBe("No");
    expect(monogram("  ")).toBe("?");
    expect(monogram("!!!")).toBe("?");
  });
});

describe("monogramColor", () => {
  it("est stable et fait partie de la palette", () => {
    expect(monogramColor("GitHub")).toBe(monogramColor("GitHub"));
    expect(MONOGRAM_COLORS).toContain(monogramColor("Wikipédia"));
  });
});

describe("folderColors", () => {
  it("boucle sur la palette", () => {
    expect(folderColors(0)).toEqual(folderColors(6));
    expect(folderColors(-1)).toEqual(folderColors(5));
  });
});
