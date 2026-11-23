import { describe, expect, it } from "vitest";
import { blankTile } from "./edit";
import { matchScore, searchTiles } from "./search";
import type { Config } from "./types";

describe("matchScore", () => {
  it("classe début de nom, début de mot, inclusion", () => {
    expect(matchScore("Confluence", "co")).toBe(3);
    expect(matchScore("Visual Studio Code", "co")).toBe(2);
    expect(matchScore("Discord", "co")).toBe(1);
    expect(matchScore("Outlook", "co")).toBe(0);
  });

  it("ignore accents et casse, et accepte plusieurs mots", () => {
    expect(matchScore("Téléchargements", "telech")).toBe(3);
    expect(matchScore("MétéoMédia", "METEO")).toBe(3);
    expect(matchScore("Visual Studio Code", "vis code")).toBe(2);
    expect(matchScore("Visual Studio Code", "code python")).toBe(0);
    expect(matchScore("Peu importe", "   ")).toBe(0);
  });
});

describe("searchTiles", () => {
  const tile = (name: string) => blankTile({ id: name, name });
  const config: Config = {
    schemaVersion: 1,
    settings: {} as Config["settings"],
    sections: {
      apps: { groups: [{ id: "a", name: "A", collapsed: false, tiles: [tile("Discord"), tile("Visual Studio Code")] }] },
      folders: { groups: [{ id: "f", name: "F", collapsed: true, tiles: [tile("Documents"), tile("Projets")] }] },
      websites: { groups: [{ id: "w", name: "W", collapsed: false, tiles: [tile("Confluence")] }] },
    },
  };

  it("trie par pertinence puis par ordre d'affichage", () => {
    expect(searchTiles(config, "co").map((r) => r.tile.name)).toEqual(["Confluence", "Visual Studio Code", "Discord"]);
    expect(searchTiles(config, "d").map((r) => r.tile.name)).toEqual(["Discord", "Documents", "Visual Studio Code"]);
  });

  it("cherche aussi dans les groupes repliés et renvoie la section", () => {
    expect(searchTiles(config, "proj")).toMatchObject([{ section: "folders", groupId: "f" }]);
  });

  it("ne renvoie rien pour une requête vide", () => {
    expect(searchTiles(config, "")).toEqual([]);
  });
});
