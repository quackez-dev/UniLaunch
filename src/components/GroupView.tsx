import { TILE_SIZES } from "../lib/layout";
import { folderColors } from "../lib/monogram";
import type { Group, SectionKind } from "../lib/types";
import { useStore, useT } from "../store";
import { TileButton } from "./TileButton";
import "./GroupView.css";

type Props = {
  section: SectionKind;
  group: Group;
  /** Position du groupe dans sa section (couleur des dossiers). */
  index: number;
};

/** Un groupe : en-tête repliable puis la grille de tuiles. */
export function GroupView({ section, group, index }: Props) {
  const t = useT();
  const update = useStore((s) => s.update);
  const settings = useStore((s) => s.config!.settings);
  const missing = useStore((s) => s.missing);

  const metrics = TILE_SIZES[settings.tileSize] ?? TILE_SIZES.M;
  const open = !group.collapsed;

  const toggle = () =>
    update((c) => {
      const g = c.sections[section].groups.find((x) => x.id === group.id);
      if (g) g.collapsed = !g.collapsed;
    });

  return (
    <div className="group">
      <div className="group__header">
        <button
          type="button"
          className="group__toggle"
          aria-expanded={open}
          aria-label={t("group.collapse", { name: group.name })}
          onClick={toggle}
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
        <span className="group__count">{group.tiles.length}</span>
        <span className="group__rule" />
      </div>

      {open && (
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
              folder={folderColors(index)}
              missing={missing.has(tile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
