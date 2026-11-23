// Monogrammes : icône de secours (deux lettres sur une couleur) quand aucune image n'existe.

/** Couleurs assez foncées pour un texte blanc lisible (contraste ≥ 4,5:1). */
export const MONOGRAM_COLORS = [
  "#2F6FE4",
  "#0F6CBD",
  "#5B5FC7",
  "#1D7044",
  "#314CB6",
  "#4E7F23",
  "#168D45",
  "#C4500A",
  "#B4235A",
  "#0F766E",
  "#6B5B45",
  "#57606A",
] as const;

/** Couleurs des icônes de dossier, une paire (devant, derrière) par groupe. */
export const FOLDER_COLORS = [
  { front: "#4C8DF6", back: "#2F62C4" },
  { front: "#2BB3A3", back: "#1C7F73" },
  { front: "#E9A23B", back: "#B5781E" },
  { front: "#E86A8F", back: "#B54A6B" },
  { front: "#8B7CF6", back: "#6552D0" },
  { front: "#7CB342", back: "#558B2F" },
] as const;

export const MISSING_FOLDER_COLORS = { front: "#5A606C", back: "#3A3F49" } as const;

/** Deux lettres : initiales des deux premiers mots, sinon les deux premières lettres du nom. */
export function monogram(name: string): string {
  const words = name
    .normalize("NFC")
    .split(/[\s\-_.]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const chars = Array.from(words[0]);
    return (chars[0].toUpperCase() + (chars[1] ?? "").toLowerCase()).trim();
  }
  return (Array.from(words[0])[0] + Array.from(words[1])[0]).toUpperCase();
}

/** Couleur stable dérivée d'un texte (le même nom donne toujours la même couleur). */
export function monogramColor(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return MONOGRAM_COLORS[(h >>> 0) % MONOGRAM_COLORS.length];
}

export function folderColors(groupIndex: number) {
  return FOLDER_COLORS[((groupIndex % FOLDER_COLORS.length) + FOLDER_COLORS.length) % FOLDER_COLORS.length];
}
