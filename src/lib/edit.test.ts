import { beforeEach, describe, expect, it } from "vitest";
import {
  addGroup,
  addTile,
  blankTile,
  findTile,
  insertGroup,
  moveGroup,
  moveTile,
  normalizeUrl,
  removeGroup,
  removeTile,
  renameGroup,
  suggestName,
  updateTile,
} from "./edit";
import type { Config } from "./types";

function config(): Config {
  const tile = (id: string) => blankTile({ id, name: id, target: `C:\\${id}.exe` });
  return {
    schemaVersion: 1,
    settings: {} as Config["settings"],
    sections: {
      apps: {
        groups: [
          { id: "g1", name: "Pro", collapsed: false, tiles: [tile("a"), tile("b"), tile("c")] },
          { id: "g2", name: "Perso", collapsed: false, tiles: [tile("d")] },
        ],
      },
      folders: { groups: [] },
      websites: { groups: [] },
    },
  };
}

const ids = (c: Config, g: number) => c.sections.apps.groups[g].tiles.map((t) => t.id);

let c: Config;
beforeEach(() => {
  c = config();
});

describe("tuiles", () => {
  it("ajoute à la fin ou à une position", () => {
    addTile(c, "apps", "g2", blankTile({ id: "e" }));
    addTile(c, "apps", "g2", blankTile({ id: "f" }), 0);
    expect(ids(c, 1)).toEqual(["f", "d", "e"]);
    expect(addTile(c, "apps", "inconnu", blankTile())).toBe(false);
  });

  it("modifie sur place ou change de groupe", () => {
    updateTile(c, "apps", { ...findTile(c, "apps", "b")!.tile, name: "B" });
    expect(c.sections.apps.groups[0].tiles[1].name).toBe("B");
    updateTile(c, "apps", findTile(c, "apps", "a")!.tile, "g2");
    expect(ids(c, 0)).toEqual(["b", "c"]);
    expect(ids(c, 1)).toEqual(["d", "a"]);
  });

  it("supprime puis restaure à la même place", () => {
    const removed = removeTile(c, "apps", "b")!;
    expect(ids(c, 0)).toEqual(["a", "c"]);
    addTile(c, "apps", removed.groupId, removed.tile, removed.index);
    expect(ids(c, 0)).toEqual(["a", "b", "c"]);
  });

  it("déplace dans un groupe et entre groupes", () => {
    moveTile(c, "apps", "a", "g1", 2);
    expect(ids(c, 0)).toEqual(["b", "c", "a"]);
    moveTile(c, "apps", "c", "g2", 0);
    expect(ids(c, 0)).toEqual(["b", "a"]);
    expect(ids(c, 1)).toEqual(["c", "d"]);
    moveTile(c, "apps", "b", "g2", 99);
    expect(ids(c, 1)).toEqual(["c", "d", "b"]);
  });
});

describe("groupes", () => {
  it("crée, renomme, supprime, restaure et déplace", () => {
    const g = addGroup(c, "apps", "Nouveau");
    expect(c.sections.apps.groups.map((x) => x.name)).toEqual(["Pro", "Perso", "Nouveau"]);
    expect(renameGroup(c, "apps", g.id, "  Outils ")).toBe(true);
    expect(renameGroup(c, "apps", g.id, "   ")).toBe(false);
    expect(c.sections.apps.groups[2].name).toBe("Outils");

    const removed = removeGroup(c, "apps", "g1")!;
    expect(c.sections.apps.groups.map((x) => x.id)).toEqual(["g2", g.id]);
    insertGroup(c, "apps", removed.group, removed.index);
    expect(c.sections.apps.groups.map((x) => x.id)).toEqual(["g1", "g2", g.id]);

    moveGroup(c, "apps", g.id, 0);
    expect(c.sections.apps.groups.map((x) => x.id)).toEqual([g.id, "g1", "g2"]);
  });
});

describe("normalizeUrl", () => {
  it("ajoute https:// et refuse ce qui n'est pas une adresse web", () => {
    expect(normalizeUrl("github.com")).toBe("https://github.com/");
    expect(normalizeUrl("http://localhost:3000/x")).toBe("http://localhost:3000/x");
    expect(normalizeUrl("https://fr.wikipedia.org/wiki/Montréal")).toBe("https://fr.wikipedia.org/wiki/Montr%C3%A9al");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("file:///C:/x")).toBeNull();
    expect(normalizeUrl("pas une adresse")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});

describe("suggestName", () => {
  it("propose un nom lisible", () => {
    expect(suggestName("apps", "C:\\Program Files\\Blender\\blender.exe")).toBe("blender");
    expect(suggestName("apps", "C:\\Users\\Moi\\Desktop\\Visual Studio Code.lnk")).toBe("Visual Studio Code");
    expect(suggestName("folders", "D:\\Projets\\Projet 1\\")).toBe("Projet 1");
    expect(suggestName("folders", "D:\\")).toBe("D:");
    expect(suggestName("websites", "https://www.github.com/x")).toBe("Github");
    expect(suggestName("websites", "fr.wikipedia.org")).toBe("Wikipedia");
    expect(suggestName("websites", "http://localhost:3000")).toBe("Localhost");
    expect(suggestName("apps", "shell:AppsFolder\\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App")).toBe("WindowsCalculator");
  });
});
