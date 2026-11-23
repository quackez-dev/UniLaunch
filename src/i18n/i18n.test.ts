import { describe, expect, it } from "vitest";
import { translate } from ".";
import { en } from "./en";
import { fr } from "./fr";

describe("translate", () => {
  it("remplace les paramètres", () => {
    expect(translate("fr", "toast.launching", { name: "VS Code" })).toBe("Lancement de VS Code…");
    expect(translate("en", "toast.launching", { name: "VS Code" })).toBe("Launching VS Code…");
  });

  it("laisse un paramètre inconnu tel quel", () => {
    expect(translate("fr", "toast.launching")).toBe("Lancement de {name}…");
  });

  it("garde les mêmes paramètres dans les deux langues", () => {
    const params = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(params(en[key]), key).toBe(params(fr[key]));
    }
  });
});
