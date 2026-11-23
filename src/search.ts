// État de la recherche rapide : texte tapé et résultat sélectionné (Entrée le lance).

import { useMemo } from "react";
import { create } from "zustand";
import { searchTiles, type SearchResult } from "./lib/search";
import { useStore } from "./store";

type SearchState = {
  query: string;
  selected: number;
  setQuery(query: string): void;
  clear(): void;
  move(delta: number, count: number): void;
};

export const useSearch = create<SearchState>((set) => ({
  query: "",
  selected: 0,
  setQuery: (query) => set({ query, selected: 0 }),
  clear: () => set({ query: "", selected: 0 }),
  move: (delta, count) =>
    set((s) => ({ selected: count === 0 ? 0 : (s.selected + delta + count) % count })),
}));

/** Résultats de la recherche courante (vide si aucune recherche). */
export function useSearchResults(): SearchResult[] {
  const config = useStore((s) => s.config);
  const query = useSearch((s) => s.query);
  return useMemo(() => (config ? searchTiles(config, query) : []), [config, query]);
}

/** Identifiant de la tuile sélectionnée, s'il y en a une. */
export function useSelectedTileId(): string | undefined {
  const results = useSearchResults();
  const selected = useSearch((s) => s.selected);
  return results[selected]?.tile.id;
}
