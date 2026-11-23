import { describe, expect, it } from "vitest";
import { hotkeyFromEvent, hotkeyKeys, type KeyInfo } from "./hotkey";

const ev = (code: string, mods: Partial<KeyInfo> = {}): KeyInfo => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe("hotkeyFromEvent", () => {
  it("construit le raccourci dans un ordre fixe", () => {
    expect(hotkeyFromEvent(ev("Space", { ctrlKey: true, altKey: true }))).toBe("Ctrl+Alt+Space");
    expect(hotkeyFromEvent(ev("KeyU", { altKey: true, ctrlKey: true, shiftKey: true }))).toBe("Ctrl+Alt+Shift+U");
    expect(hotkeyFromEvent(ev("Digit1", { metaKey: true }))).toBe("Super+1");
    expect(hotkeyFromEvent(ev("F12", { ctrlKey: true }))).toBe("Ctrl+F12");
  });

  it("se rabat sur la touche quand le code physique manque", () => {
    expect(hotkeyFromEvent(ev("", { key: "k", ctrlKey: true, shiftKey: true }))).toBe("Ctrl+Shift+K");
    expect(hotkeyFromEvent(ev("Unidentified", { key: "7", altKey: true }))).toBe("Alt+7");
    expect(hotkeyFromEvent(ev("", { key: "é", ctrlKey: true }))).toBeNull();
  });

  it("refuse les combinaisons inutilisables", () => {
    expect(hotkeyFromEvent(ev("KeyA"))).toBeNull();
    expect(hotkeyFromEvent(ev("KeyA", { shiftKey: true }))).toBeNull();
    expect(hotkeyFromEvent(ev("ControlLeft", { ctrlKey: true }))).toBeNull();
    expect(hotkeyFromEvent(ev("Numpad5", { ctrlKey: true }))).toBeNull();
  });
});

describe("hotkeyKeys", () => {
  it("traduit les noms de touches", () => {
    expect(hotkeyKeys("Ctrl+Alt+Space", "fr")).toEqual(["Ctrl", "Alt", "Espace"]);
    expect(hotkeyKeys("Ctrl+Shift+Super+U", "fr")).toEqual(["Ctrl", "Maj", "Win", "U"]);
    expect(hotkeyKeys("Ctrl+Alt+Space", "en")).toEqual(["Ctrl", "Alt", "Space"]);
    expect(hotkeyKeys("", "fr")).toEqual([]);
  });
});
