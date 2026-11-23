import { Fragment, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { normalizeColumns, resizeColumns } from "../lib/layout";
import type { SectionKind } from "../lib/types";
import { useStore, useT } from "../store";
import { Column } from "./Column";
import "./Columns.css";

export const SECTIONS: SectionKind[] = ["apps", "folders", "websites"];

type Drag = { index: number; x: number; base: number[]; total: number };

/** Les trois colonnes côte à côte, séparées par des poignées redimensionnables. */
export function Columns() {
  const t = useT();
  const saved = useStore((s) => s.config?.settings.columnWidths);
  const update = useStore((s) => s.update);
  const [live, setLive] = useState<number[] | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const widths = live ?? normalizeColumns(saved);
  const total = () => ref.current?.getBoundingClientRect().width ?? 960;

  const commit = (next: number[]) => {
    update((c) => {
      c.settings.columnWidths = normalizeColumns(next);
    });
  };

  const onDown = (index: number) => (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { index, x: e.clientX, base: widths, total: total() };
    setActive(index);
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    setLive(resizeColumns(d.base, d.index, e.clientX - d.x, d.total));
  };
  const onUp = () => {
    if (live) commit(live);
    drag.current = null;
    setLive(null);
    setActive(null);
  };
  const onKey = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    commit(resizeColumns(widths, index, e.key === "ArrowLeft" ? -24 : 24, total()));
  };
  const reset = () => commit([1, 1, 1]);

  return (
    <div className="columns" ref={ref}>
      {SECTIONS.map((kind, i) => (
        <Fragment key={kind}>
          {i > 0 && (
            <button
              type="button"
              className={`splitter${active === i ? " splitter--active" : ""}`}
              aria-label={t("columns.resize", {
                left: t(`section.${SECTIONS[i - 1]}`),
                right: t(`section.${kind}`),
              })}
              title={t("columns.resizeHint")}
              onPointerDown={onDown(i)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onDoubleClick={reset}
              onKeyDown={onKey(i)}
            >
              <span className="splitter__line" aria-hidden="true" />
              <span className="splitter__grip" aria-hidden="true" />
            </button>
          )}
          <Column kind={kind} flex={widths[i]} />
        </Fragment>
      ))}
    </div>
  );
}
