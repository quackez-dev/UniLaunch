import type { SectionKind } from "../lib/types";
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
  const groups = useStore((s) => s.config?.sections[kind].groups ?? []);
  const editing = useStore((s) => s.editing);

  const count = groups.reduce((n, g) => n + g.tiles.length, 0);
  // Hors du mode édition, un groupe vide n'a rien à lancer : on le masque.
  const visible = editing ? groups : groups.filter((g) => g.tiles.length > 0);

  return (
    <section className="column" style={{ flex: `${flex} 1 0px` }} aria-label={t(`section.${kind}`)}>
      <header className="column__header">
        <SectionIcon kind={kind} />
        <h2 className="column__title">{t(`section.${kind}`)}</h2>
        <span className="column__count">{count}</span>
      </header>
      <div className="column__body">
        {visible.length === 0 && (
          <p className="column__empty">
            {t(`section.empty.${kind}`)}
            <br />
            {t("section.empty.hint")}
          </p>
        )}
        {visible.map((group) => (
          <GroupView key={group.id} section={kind} group={group} index={groups.indexOf(group)} />
        ))}
      </div>
    </section>
  );
}
