import { createGroup, previewGroups, useEditStore } from "../editing";
import type { Group, SectionKind } from "../lib/types";
import { useSearch, useSearchResults, useSelectedTileId } from "../search";
import { useStore, useT } from "../store";
import { GroupView } from "./GroupView";
import { SectionIcon } from "./SectionIcon";
import "./Column.css";

type Props = {
  kind: SectionKind;
  /** Proportion de la largeur (flex-grow). */
  flex: number;
};

/** Une colonne : en-tête (type et nombre de tuiles) puis ses groupes. */
export function Column({ kind, flex }: Props) {
  const t = useT();
  const config = useStore((s) => s.config);
  const editing = useStore((s) => s.editing);
  const drag = useEditStore((s) => s.drag);
  const openDialog = useEditStore((s) => s.openDialog);
  const query = useSearch((s) => s.query);
  const results = useSearchResults();
  const selectedId = useSelectedTileId();

  if (!config) return null;
  const saved = config.sections[kind].groups;
  const groups = previewGroups(config, kind, drag);
  const count = saved.reduce((n, g) => n + g.tiles.length, 0);
  const searching = query.trim() !== "";

  let visible: Group[];
  if (searching) {
    // Recherche : seulement les tuiles trouvées, groupes repliés compris.
    const found = new Set(results.filter((r) => r.section === kind).map((r) => r.tile.id));
    visible = groups
      .map((g) => ({ ...g, collapsed: false, tiles: g.tiles.filter((x) => found.has(x.id)) }))
      .filter((g) => g.tiles.length > 0);
  } else {
    // Hors du mode édition, un groupe vide n'a rien à lancer : on le masque.
    visible = editing ? groups : groups.filter((g) => g.tiles.length > 0);
  }

  return (
    <section className="column" style={{ flex: `${flex} 1 0px` }} aria-label={t(`section.${kind}`)} data-section={kind}>
      <header className="column__header">
        <SectionIcon kind={kind} />
        <h2 className="column__title">{t(`section.${kind}`)}</h2>
        <span className="column__count">{count}</span>
        <span className="column__spacer" />
        {editing && kind === "apps" && (
          <button
            type="button"
            className="column__add column__add--secondary"
            title={t("column.installedTitle")}
            onClick={() => useEditStore.setState({ picker: true })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1.5" />
              <rect x="13" y="4" width="7" height="7" rx="1.5" />
              <rect x="4" y="13" width="7" height="7" rx="1.5" />
              <path d="M16.5 13v7M13 16.5h7" strokeLinecap="round" />
            </svg>
            {t("column.installed")}
          </button>
        )}
        {editing && (
          <button
            type="button"
            className="column__add"
            aria-label={t(`column.add.${kind}`)}
            title={t(`column.add.${kind}`)}
            onClick={() => openDialog({ section: kind })}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("column.add")}
          </button>
        )}
      </header>
      <div className="column__body">
        {searching && visible.length === 0 && <p className="column__empty">{t("search.noResult")}</p>}
        {!searching && visible.length === 0 && !editing && (
          <p className="column__empty">
            {t(`section.empty.${kind}`)}
            <br />
            {t("section.empty.hint")}
          </p>
        )}
        {visible.map((group) => (
          <GroupView
            key={group.id}
            section={kind}
            group={group}
            index={saved.findIndex((g) => g.id === group.id)}
            selectedId={selectedId}
          />
        ))}
        {editing && !searching && (
          <button type="button" className="column__new-group" onClick={() => createGroup(kind)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {t("group.new")}
          </button>
        )}
      </div>
    </section>
  );
}
