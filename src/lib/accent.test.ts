import { describe, expect, it } from "vitest";
import { accentVars, parseHex } from "./accent";

describe("parseHex", () => {
  it("lit les formes courte et longue", () => {
    expect(parseHex("#6D4AFF")).toEqual([109, 74, 255]);
    expect(parseHex("fff")).toEqual([255, 255, 255]);
    expect(parseHex("rouge")).toBeNull();
  });
});

describe("accentVars", () => {
  it("met du texte blanc sur un accent foncé et sombre sur un accent clair", () => {
    expect(accentVars("#6D4AFF")["--ul-on-accent"]).toBe("#ffffff");
    expect(accentVars("#F59E0B")["--ul-on-accent"]).toBe("#0e0f13");
    expect(accentVars("#84CC16")["--ul-on-accent"]).toBe("#0e0f13");
  });

  it("retombe sur l'accent par défaut si la couleur est invalide", () => {
    expect(accentVars("n'importe quoi")["--ul-accent"]).toBe("rgb(109, 74, 255)");
  });
});
