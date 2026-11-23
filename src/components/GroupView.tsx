import { useEditStore, deleteGroup, commitDrag, renameGroupTo } from "../editing";
import { boxOf, groupInsertIndex } from "../lib/dragTarget";
import { TILE_SIZES } from "../lib/layout";
import { folderColors } from "../lib/monogram";
import type { Group, SectionKind } from "../lib/types";
import { usePointerDrag } from "../lib/usePointerDrag";
import { useStore, useT } from "../store";
import { TileButton } from "./TileButton";
import "./GroupView.css";

type Props = {
  section: SectionKind;
  group: Group;
  /** Position du groupe enregistrée dans sa section (couleur des dossiers). */
  index: number;
};

/** Un groupe : en-tête repliable puis la grille de tuiles. */
export function GroupView({ section, group, index }: Props) {
  const t = useT();
  const update = useStore((s) => s.update);
  const settings = useStore((s) => s.config!.settings);
  const missing = useStore((s) => s.missing);
  const editing = useStore((s) => s.editing);
  const renaming = useEditStore((s) => s.renaming === group.id);
  const dragging = useEditStore((s) => s.drag?.kind === "group" && s.drag.id === group.id);
  const openDialog = useEditStore((s) => s.openDialog);

  const metrics = TILE_SIZES[settings.tileSize] ?? TILE_SIZES.M;
  const open = !group.collapsed;
  const colors = folderColors(Math.max(index, 0));

  const toggle = () =>
    update((c) => {
      const g = c.sections[section].groups.find((x) => x.id === group.id);
      if (g) g.collapsed = !g.collapsed;
    });

  // Déplacer le groupe en le tirant par sa poignée.
  const groupDrag = usePointerDrag(editing, {
    onStart: (x, y) =>
      useEditStore.getState().setDrag({ kind: "group", section, id: group.id, name: group.name, x, y, target: null }),
    onMove: (x, y) => {
      const drag = useEditStore.getState().drag;
      if (!drag || drag.kind !== "group") return;
      const body = document.querySelector(`[data-section="${section}"] .column__body`);
      const rows = Array.from(body?.querySelectorAll<HTMLElement>("[data-group-row]") ?? []).filter(
        (el) => el.dataset.groupRow !== group.id,
      );
      useEditStore.getState().setDrag({ ...drag, x, y, target: { index: groupInsertIndex(rows.map(boxOf), y) } });
    },
    onEnd: (cancelled) => {
      const drag = useEditStore.getState().drag;
      if (drag && !cancelled) commitDrag(drag);
      useEditStore.getState().setDrag(null);
    },
  });

  return (
    <div
      className={`group${dragging ? " group--dragging" : ""}`}
      data-group-row={group.id}
      data-drop-group={group.id}
      data-section={section}
      data-collapsed={group.collapsed ? "1" : undefined}
      data-count={group.tiles.length}
    >
      <div className="group__header">
        {editing && (
          <span
            className="group__grip"
            title={t("group.drag", { name: group.name })}
            aria-hidden="true"
            onPointerDown={groupDrag.onPointerDown}
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
              <circle cx="3" cy="3" r="1.3" />
              <circle cx="7" cy="3" r="1.3" />
              <circle cx="3" cy="7" r="1.3" />
              <circle cx="7" cy="7" r="1.3" />
              <circle cx="3" cy="11" r="1.3" />
              <circle cx="7" cy="11" r="1.3" />
            </svg>
          </span>
        )}
        {renaming ? (
          <input
            className="group__rename"
            aria-label={t("group.renameField")}
            defaultValue={group.name}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => renameGroupTo(section, group.id, e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") useEditStore.getState().setRenaming(null);
            }}
          />
        ) : (
          <button
            type="button"
            className="group__toggle"
            aria-expanded={open}
            aria-label={t("group.collapse", { name: group.name })}
            onClick={toggle}
            onDoubleClick={() => editing && useEditStore.getState().setRenaming(group.id)}
          >
            <svg
              className="group__chevron"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: open ? "none" : "rotate(-90deg)" }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            <span className="group__name">{group.name}</span>
          </button>
        )}
        <span className="group__count">{group.tiles.length}</span>
        <span className="group__rule" />
        {editing && !renaming && (
          <>
            <button
              type="button"
              className="group__action"
              aria-label={t("group.rename", { name: group.name })}
              title={t("group.rename", { name: group.name })}
              onClick={() => useEditStore.getState().setRenaming(group.id)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
              </svg>
            </button>
            <button
              type="button"
              className="group__action group__action--danger"
              aria-label={t("group.delete", { name: group.name })}
              title={t("group.delete", { name: group.name })}
              onClick={() => deleteGroup(section, group)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </>
        )}
      </div>

      {open && group.tiles.length > 0 && (
        <div
          className={`group__tiles${settings.showLabels === "hover" ? " group__tiles--hover-labels" : ""}`}
          style={{ gap: metrics.gap }}
        >
          {group.tiles.map((tile) => (
            <TileButton
              key={tile.id}
              section={section}
              tile={tile}
              metrics={metrics}
              folder={colors}
              missing={missing.has(tile.id)}
            />
          ))}
          {editing && (
            <button
              type="button"
              className="group__add-tile"
              aria-label={t("column.addTo", { action: t(`column.add.${section}`), group: group.name })}
              title={t("column.addTo", { action: t(`column.add.${section}`), group: group.name })}
              style={{ width: metrics.tile, height: metrics.tile, borderRadius: metrics.radius }}
              onClick={() => openDialog({ section, groupId: group.id })}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
        </div>
      )}

      {open && editing && group.tiles.length === 0 && (
        <button
          type="button"
          className="group__dropzone"
          style={{ minHeight: metrics.tile, borderRadius: metrics.radius }}
          onClick={() => openDialog({ section, groupId: group.id })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11m-4-4 4 4 4-4M5 20h14" />
          </svg>
          <span className="group__dropzone-text">{t(`group.empty.${section}`)}</span>
          <span className="group__dropzone-active">{t("group.dropHere", { name: group.name })}</span>
        </button>
      )}
    </div>
  );
}
