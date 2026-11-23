import { useEffect, useRef, type KeyboardEvent } from "react";
import { boxOf } from "../lib/dragTarget";
import type { SearchResult } from "../lib/search";
import { navigate, type Direction, type NavItem } from "../lib/spatialNav";
import { useSearch, useSearchResults } from "../search";
import { useStore, useT } from "../store";
import "./SearchBox.css";

const ARROWS: Record<string, Direction | undefined> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/** Résultat atteint avec une flèche, d'après la position des tuiles affichées. */
function navigateResults(results: SearchResult[], selected: number, dir: Direction): number {
  const items: NavItem[] = [];
  const indexes: number[] = [];
  results.forEach((r, i) => {
    const el = document.querySelector(`[data-section="${r.section}"] [data-tile-id="${CSS.escape(r.tile.id)}"]`);
    if (!el) return;
    items.push({ column: r.section, box: boxOf(el) });
    indexes.push(i);
  });
  const from = indexes.indexOf(selected);
  if (from < 0) return items.length > 0 ? indexes[0] : selected;
  return indexes[navigate(items, from, dir)];
}

/** Champ de recherche de la barre de titre. Taper n'importe où dans la fenêtre y écrit. */
export function SearchBox() {
  const t = useT();
  const query = useSearch((s) => s.query);
  const setQuery = useSearch((s) => s.setQuery);
  const clear = useSearch((s) => s.clear);
  const select = useSearch((s) => s.select);
  const results = useSearchResults();
  const launch = useStore((s) => s.launch);
  const editing = useStore((s) => s.editing);
  const ref = useRef<HTMLInputElement>(null);

  // Taper une lettre n'importe où (hors champ, dialogue ou menu) donne le focus à la recherche.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [role='dialog'], [role='menu']")) return;
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const dir = ARROWS[e.key];
    if (dir) {
      // Sans résultat, les flèches gardent leur rôle habituel dans le champ (déplacer le curseur).
      if (results.length === 0) return;
      e.preventDefault();
      select(navigateResults(results, useSearch.getState().selected, dir));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[useSearch.getState().selected];
      if (!pick) return;
      if (editing) return; // En mode édition, Entrée ne lance rien.
      clear();
      ref.current?.blur();
      void launch(pick.section, pick.tile);
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      e.stopPropagation();
      clear();
    }
  };

  return (
    <div className={`search${query ? " search--active" : ""}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={ref}
        className="search__input"
        type="text"
        aria-label={t("search.label")}
        placeholder={t("search.placeholder")}
        value={query}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button
          type="button"
          className="search__clear"
          aria-label={t("search.clear")}
          onClick={() => {
            clear();
            ref.current?.focus();
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
