// Chargement des icônes de tuiles, avec un cache en mémoire partagé par toute l'interface.

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SectionKind, Tile } from "./types";

const cache = new Map<string, Promise<string | null>>();

function keyOf(section: SectionKind, tile: Pick<Tile, "target" | "icon">): string {
  return `${section}|${tile.target}|${JSON.stringify(tile.icon)}`;
}

/** Icône d'une tuile en URL `data:`, ou `null` (dossier dessiné, monogramme). */
export function loadTileIcon(section: SectionKind, tile: Tile): Promise<string | null> {
  const key = keyOf(section, tile);
  let pending = cache.get(key);
  if (!pending) {
    pending = invoke<string | null>("tile_icon", { section, tile }).catch(() => null);
    cache.set(key, pending);
  }
  return pending;
}

/** Oublie une icône (après la modification d'une tuile, par exemple). */
export function forgetTileIcon(section: SectionKind, tile: Pick<Tile, "target" | "icon">) {
  cache.delete(keyOf(section, tile));
}

type IconState = { key: string; url: string | null };

/** Renvoie `undefined` pendant le chargement, puis l'URL ou `null`. */
export function useTileIcon(section: SectionKind, tile: Tile): string | null | undefined {
  const key = keyOf(section, tile);
  const [state, setState] = useState<IconState | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadTileIcon(section, tile).then((url) => {
      if (alive) setState({ key, url });
    });
    return () => {
      alive = false;
    };
    // La clé résume la tuile : inutile de relancer pour d'autres champs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state?.key === key ? state.url : undefined;
}
