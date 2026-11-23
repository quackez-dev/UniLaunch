import type { KeyboardEvent, MouseEvent } from "react";
import { commitDrag, deleteTile, useEditStore } from "../editing";
import { boxOf, tileInsertIndex } from "../lib/dragTarget";
import type { TileMetrics } from "../lib/layout";
import type { SectionKind, Tile } from "../lib/types";
import { usePointerDrag } from "../lib/usePointerDrag";
import { useStore, useT } from "../store";
import { TileIcon } from "./TileIcon";
import "./TileButton.css";

type Props = {
  section: SectionKind;
  tile: Tile;
  metrics: TileMetrics;
  folder: { front: string; back: string };
  missing: boolean;
  /** Résultat de recherche retenu : mis en évidence, lancé par Entrée. */
  selected?: boolean;
};

/** Groupe et position d'insertion sous le pointeur, pour une tuile glissée. */
function tileTargetAt(section: SectionKind, tileId: string, x: number, y: number) {
  const group = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-group]");
  if (!group || group.dataset.section !== section || !group.dataset.dropGroup) return undefined;
  if (group.dataset.collapsed) {
    return { groupId: group.dataset.dropGroup, index: Number(group.dataset.count ?? 0) };
  }
  const boxes = Array.from(group.querySelectorAll<HTMLElement>("[data-tile-id]"))
    .filter((el) => el.dataset.tileId !== tileId)
    .map(boxOf);
  return { groupId: group.dataset.dropGroup, index: tileInsertIndex(boxes, x, y) };
}

/** Une tuile : un clic lance l'élément (ou l'ouvre en modification), un clic droit ouvre le menu. */
export function TileButton({ section, tile, metrics, folder, missing, selected = false }: Props) {
  const t = useT();
  const launch = useStore((s) => s.launch);
  const openMenu = useStore((s) => s.openMenu);
  const editing = useStore((s) => s.editing);
  const menuOpen = useStore((s) => s.menu?.tileId === tile.id);
  const dragging = useEditStore((s) => s.drag?.kind === "tile" && s.drag.id === tile.id);

  const drag = usePointerDrag(editing, {
    onStart: (x, y) => useEditStore.getState().setDrag({ kind: "tile", section, id: tile.id, tile, x, y, target: null }),
    onMove: (x, y) => {
      const current = useEditStore.getState().drag;
      if (!current || current.kind !== "tile") return;
      const target = tileTargetAt(section, tile.id, x, y) ?? current.target;
      useEditStore.getState().setDrag({ ...current, x, y, target });
    },
    onEnd: (cancelled) => {
      const current = useEditStore.getState().drag;
      if (current && !cancelled) commitDrag(current);
      useEditStore.getState().setDrag(null);
    },
  });

  const onClick = () => {
    if (drag.consumeDragged()) return;
    if (editing) useEditStore.getState().openDialog({ section, tile });
    else void launch(section, tile);
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    openMenu({ section, tileId: tile.id, x: e.clientX, y: e.clientY });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (editing && e.key === "Delete") {
      e.preventDefault();
      deleteTile(section, tile);
    }
  };

  const title = missing
    ? t("tile.missingTitle", { name: tile.name, target: tile.target })
    : `${tile.name}\n${tile.target}`;

  const classes = [
    "tile",
    missing && "tile--missing",
    menuOpen && "tile--menu",
    editing && "tile--editing",
    dragging && "tile--dragging",
    selected && "tile--selected",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="tile-wrap" data-tile-id={tile.id}>
      <button
        type="button"
        className={classes}
        title={title}
        style={{ width: metrics.tile, height: metrics.tile, borderRadius: metrics.radius }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        onPointerDown={drag.onPointerDown}
      >
        <TileIcon section={section} tile={tile} size={metrics.icon} folder={folder} missing={missing} />
        <span className="tile__label" style={{ fontSize: metrics.font }}>
          {tile.name}
        </span>
      </button>
      {selected && !editing && (
        <span className="tile__enter" aria-hidden="true">
          ↵
        </span>
      )}
      {missing && !editing && !selected && (
        <svg className="tile__badge" role="img" aria-label={t("tile.missing")} width="16" height="16" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#3B2C0E" stroke="var(--ul-warning)" strokeWidth="1.4" />
          <path d="M12 7v6.5M12 16.8v.2" stroke="var(--ul-warning)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
      )}
      {editing && !dragging && (
        <button
          type="button"
          className="tile__remove"
          aria-label={t("tile.delete", { name: tile.name })}
          title={t("tile.delete", { name: tile.name })}
          onClick={(e) => {
            e.stopPropagation();
            deleteTile(section, tile);
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
