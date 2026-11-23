// Raccourci global : capture depuis un événement clavier et affichage.
// Format enregistré (compris par le backend) : « Ctrl+Alt+Shift+Super+Touche ».

export type KeyInfo = {
  code: string;
  /** Caractère produit ; sert de repli quand `code` est vide (saisie simulée, bureau à distance). */
  key?: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
};

const NAMED: Record<string, string> = {
  Space: "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Insert: "Insert",
  Delete: "Delete",
  Backspace: "Backspace",
};

function keyName(code: string): string | null {
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^Digit([0-9])$/.exec(code);
  if (m) return m[1];
  m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code);
  if (m) return code;
  return NAMED[code] ?? null;
}

/**
 * Raccourci correspondant à l'événement, ou `null` s'il n'est pas utilisable :
 * touche de modification seule, aucune touche Ctrl/Alt/Win, ou touche non prise en charge.
 */
export function hotkeyFromEvent(e: KeyInfo): string | null {
  let key = keyName(e.code);
  if (!key && (!e.code || e.code === "Unidentified") && e.key && /^[a-z0-9]$/i.test(e.key)) {
    key = e.key.toUpperCase();
  }
  if (!key) return null;
  // Maj seule ne suffit pas : on bloquerait la saisie de majuscules partout.
  if (!e.ctrlKey && !e.altKey && !e.metaKey) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super");
  parts.push(key);
  return parts.join("+");
}

const LABELS: Record<"fr" | "en", Record<string, string>> = {
  fr: { Space: "Espace", Shift: "Maj", Super: "Win", Up: "↑", Down: "↓", Left: "←", Right: "→", Delete: "Suppr", Insert: "Inser" },
  en: { Super: "Win", Up: "↑", Down: "↓", Left: "←", Right: "→", Delete: "Del", Insert: "Ins" },
};

/** Touches à afficher (keycaps) pour un raccourci enregistré. */
export function hotkeyKeys(hotkey: string, lang: "fr" | "en"): string[] {
  return hotkey
    .split("+")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => LABELS[lang][k] ?? k);
}
