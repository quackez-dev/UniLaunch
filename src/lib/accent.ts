// Couleur d'accent : dérive les variantes (texte, fond doux, ligne) et la couleur lisible dessus.

export const ACCENT_SWATCHES = [
  { color: "#6D4AFF", name: "violet" },
  { color: "#2F6FE4", name: "blue" },
  { color: "#14B8A6", name: "teal" },
  { color: "#F59E0B", name: "amber" },
  { color: "#F43F5E", name: "rose" },
  { color: "#84CC16", name: "lime" },
] as const;

export const DEFAULT_ACCENT = "#6D4AFF";

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminance relative WCAG. */
export function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Variables CSS de l'accent, à poser sur `:root`. */
export function accentVars(hex: string): Record<string, string> {
  const rgb = parseHex(hex) ?? (parseHex(DEFAULT_ACCENT) as [number, number, number]);
  const L = luminance(rgb);
  const whiteContrast = 1.05 / (L + 0.05);
  const darkContrast = (L + 0.05) / 0.055;
  const mix = (t: number) => rgb.map((c) => Math.round(c + (255 - c) * t)).join(", ");
  const list = rgb.join(", ");
  return {
    "--ul-accent": `rgb(${list})`,
    "--ul-on-accent": whiteContrast >= darkContrast ? "#ffffff" : "#0e0f13",
    "--ul-accent-text": `rgb(${mix(0.42)})`,
    "--ul-accent-soft": `rgba(${list}, 0.14)`,
    "--ul-accent-line": `rgba(${list}, 0.45)`,
  };
}
