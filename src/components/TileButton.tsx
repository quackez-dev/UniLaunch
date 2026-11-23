import type { MouseEvent } from "react";
import type { TileMetrics } from "../lib/layout";
import type { SectionKind, Tile } from "../lib/types";
import { useStore, useT } from "../store";
import { TileIcon } from "./TileIcon";
import "./TileButton.css";

type Props = {
  section: SectionKind;
  tile: Tile;
  metrics: TileMetrics;
  folder: { front: string; back: string };
  missing: boolean;
};

/** Une tuile : un clic lance l'élément, un clic droit ouvre le menu. */
export function TileButton({ section, tile, metrics, folder, missing }: Props) {
  const t = useT();
  const launch = useStore((s) => s.launch);
  const openMenu = useStore((s) => s.openMenu);
  const menuOpen = useStore((s) => s.menu?.tileId === tile.id);

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    openMenu({ section, tileId: tile.id, x: e.clientX, y: e.clientY });
  };

  const title = missing
    ? t("tile.missingTitle", { name: tile.name, target: tile.target })
    : `${tile.name}\n${tile.target}`;

  return (
    <div className="tile-wrap">
      <button
        type="button"
        className={`tile${missing ? " tile--missing" : ""}${menuOpen ? " tile--menu" : ""}`}
        data-tile-id={tile.id}
        title={title}
        style={{ width: metrics.tile, height: metrics.tile, borderRadius: metrics.radius }}
        onClick={() => void launch(section, tile)}
        onContextMenu={onContextMenu}
      >
        <TileIcon section={section} tile={tile} size={metrics.icon} folder={folder} missing={missing} />
        <span className="tile__label" style={{ fontSize: metrics.font }}>
          {tile.name}
        </span>
      </button>
      {missing && (
        <svg className="tile__badge" role="img" aria-label={t("tile.missing")} width="16" height="16" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#3B2C0E" stroke="var(--ul-warning)" strokeWidth="1.4" />
          <path d="M12 7v6.5M12 16.8v.2" stroke="var(--ul-warning)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
      )}
    </div>
  );
}
