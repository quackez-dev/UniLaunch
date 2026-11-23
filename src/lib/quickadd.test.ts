import { describe, expect, it } from "vitest";
import { blankTile } from "./edit";
import { pastedCandidates, quickAdd, type Dropped } from "./quickadd";
import type { Config } from "./types";

function config(): Config {
  return {
    schemaVersion: 1,
    settings: {} as Config["settings"],
    sections: {
      apps: { groups: [{ id: "a1", name: "Pro", collapsed: false, tiles: [blankTile({ id: "x", target: "C:\\Apps\\code.exe" })] }] },
      folders: { groups: [{ id: "f1", name: "Projets", collapsed: false, tiles: [] }, { id: "f2", name: "Autres", collapsed: false, tiles: [] }] },
      websites: { groups: [] },
    },
  };
}

const item = (section: Dropped["section"], target: string, name = ""): Dropped => ({ section, target, name, source: target });

describe("quickAdd", () => {
  it("range chaque élément dans sa colonne", () => {
    const c = config();
    const r = quickAdd(c, [item("apps", "C:\\Tools\\tool.exe", "tool"), item("folders", "D:\\P1", "P1")], null, "Nouveau");
    expect(r.added.map((a) => a.section)).toEqual(["apps", "folders"]);
    expect(c.sections.apps.groups[0].tiles.map((t) => t.name)).toEqual(["", "tool"]);
    expect(c.sections.folders.groups[0].tiles[0].target).toBe("D:\\P1");
  });

  it("utilise le groupe survolé s'il est dans la bonne colonne", () => {
    const c = config();
    quickAdd(c, [item("folders", "D:\\P2", "P2")], { section: "folders", groupId: "f2" }, "Nouveau");
    expect(c.sections.folders.groups[1].tiles).toHaveLength(1);
    // Groupe survolé d'une autre colonne : premier groupe de la bonne colonne.
    quickAdd(c, [item("folders", "D:\\P3", "P3")], { section: "apps", groupId: "a1" }, "Nouveau");
    expect(c.sections.folders.groups[0].tiles).toHaveLength(1);
  });

  it("crée un groupe si la colonne n'en a pas, et normalise les adresses", () => {
    const c = config();
    const r = quickAdd(c, [item("websites", "github.com")], null, "Nouveau groupe");
    expect(c.sections.websites.groups[0].name).toBe("Nouveau groupe");
    expect(r.added[0].tile.target).toBe("https://github.com/");
    expect(r.added[0].tile.name).toBe("Github");
  });

  it("signale les doublons et les types non pris en charge", () => {
    const c = config();
    const r = quickAdd(c, [item("apps", "c:\\apps\\CODE.EXE", "Code"), item(null, "C:\\doc.pdf", "doc")], null, "N");
    expect(r.added).toHaveLength(0);
    expect(r.duplicates).toEqual(["Code"]);
    expect(r.unsupported).toEqual(["doc"]);
  });
});

describe("pastedCandidates", () => {
  it("découpe les lignes et complète les adresses", () => {
    expect(pastedCandidates('github.com\n  \n"C:\\Program Files\\App\\app.exe"\r\nhttps://x.org/a')).toEqual([
      "https://github.com/",
      "C:\\Program Files\\App\\app.exe",
      "https://x.org/a",
    ]);
  });
});
