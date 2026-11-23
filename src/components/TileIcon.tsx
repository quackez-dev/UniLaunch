import { useTileIcon } from "../lib/icons";
import { MISSING_FOLDER_COLORS, monogram, monogramColor } from "../lib/monogram";
import type { SectionKind, Tile } from "../lib/types";
import "./TileIcon.css";

type Props = {
  section: SectionKind;
  tile: Tile;
  /** Côté de l'icône, en pixels. */
  size: number;
  /** Couleurs du dossier (section Dossiers seulement). */
  folder?: { front: string; back: string };
  missing?: boolean;
};

/** Icône d'une tuile : image (Windows, favicon, personnalisée), dossier coloré ou monogramme. */
export function TileIcon({ section, tile, size, folder, missing }: Props) {
  const url = useTileIcon(section, tile);
  const round = section === "websites";

  if (url) {
    return (
      <img
        className="tile-icon tile-icon--img"
        src={url}
        width={size}
        height={size}
        alt=""
        draggable={false}
        style={{ borderRadius: round ? "50%" : Math.round(size * 0.22) }}
      />
    );
  }

  if (section === "folders" && tile.icon.kind !== "monogram" && url !== undefined) {
    const c = missing ? MISSING_FOLDER_COLORS : (folder ?? MISSING_FOLDER_COLORS);
    return (
      <svg className="tile-icon" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M5 12a4 4 0 0 1 4-4h10a4 4 0 0 1 3 1.3L25 12h14a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill={c.back} />
        <path d="M5 19a4 4 0 0 1 4-4h30a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill={c.front} />
      </svg>
    );
  }

  if (url === undefined) {
    // Chargement : un emplacement neutre de la même taille, sans clignotement de monogramme.
    return (
      <span
        className="tile-icon tile-icon--loading"
        style={{ width: size, height: size, borderRadius: round ? "50%" : Math.round(size * 0.22) }}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className="tile-icon tile-icon--mono"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: round ? "50%" : Math.round(size * 0.24),
        background: monogramColor(tile.name || tile.target),
        fontSize: Math.round(size * 0.38),
      }}
    >
      {monogram(tile.name || tile.target)}
    </span>
  );
}
