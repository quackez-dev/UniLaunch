// Mode édition : formulaire, renommage, glisser-déposer interne, et actions avec « Annuler ».

import { create } from "zustand";
import {
  addGroup,
  addTile,
  findGroup,
  insertGroup,
  moveGroup,
  moveTile,
  removeGroup,
  removeTile,
  updateTile,
} from "./lib/edit";
import { forgetTileIcon } from "./lib/icons";
import type { Config, Group, SectionKind, Tile } from "./lib/types";
import { t, useStore } from "./store";

export type TileDialogState = {
  section: SectionKind;
  /** Tuile existante (modification) ; absente pour un ajout. */
  tile?: Tile;
  /** Groupe proposé par défaut. */
  groupId?: string;
};

export type DragState =
  | {
      kind: "tile";
      section: SectionKind;
      id: string;
      tile: Tile;
      x: number;
      y: number;
      target: { groupId: string; index: number } | null;
    }
  | {
      kind: "group";
      section: SectionKind;
      id: string;
      name: string;
      x: number;
      y: number;
      target: { index: number } | null;
    };

type EditState = {
  dialog: TileDialogState | null;
  renaming: string | null;
  drag: DragState | null;
  openDialog(dialog: TileDialogState): void;
  closeDialog(): void;
  setRenaming(groupId: string | null): void;
  setDrag(drag: DragState | null): void;
};

export const useEditStore = create<EditState>((set) => ({
  dialog: null,
  renaming: null,
  drag: null,
  openDialog: (dialog) => {
    useStore.getState().closeMenu();
    set({ dialog });
  },
  closeDialog: () => set({ dialog: null }),
  setRenaming: (renaming) => set({ renaming }),
  setDrag: (drag) => set({ drag }),
}));

/** Quitte le mode édition et referme ce qui en dépend. */
export function setEditing(editing: boolean) {
  useStore.getState().setEditing(editing);
  if (!editing) useEditStore.setState({ dialog: null, renaming: null, drag: null });
}

export function deleteTile(section: SectionKind, tile: Tile) {
  const store = useStore.getState();
  let removed: ReturnType<typeof removeTile>;
  store.update((c) => {
    removed = removeTile(c, section, tile.id);
  });
  store.showToast(t("toast.tileDeleted", { name: tile.name }), {
    undo: () => {
      if (!removed) return;
      const r = removed;
      useStore.getState().update((c) => {
        addTile(c, section, r.groupId, r.tile, r.index);
      });
    },
  });
}

export function deleteGroup(section: SectionKind, group: Group) {
  const store = useStore.getState();
  let removed: ReturnType<typeof removeGroup>;
  store.update((c) => {
    removed = removeGroup(c, section, group.id);
  });
  store.showToast(t("toast.groupDeleted", { name: group.name }), {
    undo: () => {
      if (!removed) return;
      const r = removed;
      useStore.getState().update((c) => insertGroup(c, section, r.group, r.index));
    },
  });
}

/** Crée un groupe à la fin de la colonne et passe directement en renommage. */
export function createGroup(section: SectionKind) {
  let id = "";
  useStore.getState().update((c) => {
    id = addGroup(c, section, t("group.newName")).id;
  });
  useEditStore.getState().setRenaming(id);
}

export function renameGroupTo(section: SectionKind, groupId: string, name: string) {
  const clean = name.trim();
  if (clean) {
    useStore.getState().update((c) => {
      const g = findGroup(c, section, groupId);
      if (g) g.name = clean;
    });
  }
  useEditStore.getState().setRenaming(null);
}

/** Enregistre la tuile du formulaire (ajout ou modification). */
export function saveTile(section: SectionKind, tile: Tile, groupId: string, isNew: boolean) {
  const store = useStore.getState();
  const before = store.config?.sections[section].groups.flatMap((g) => g.tiles).find((x) => x.id === tile.id);
  if (before) forgetTileIcon(section, before);
  forgetTileIcon(section, tile);

  let groupName = "";
  store.update((c: Config) => {
    groupName = findGroup(c, section, groupId)?.name ?? "";
    if (isNew) addTile(c, section, groupId, tile);
    else updateTile(c, section, tile, groupId);
  });
  store.showToast(
    isNew ? t("toast.tileAdded", { name: tile.name, group: groupName }) : t("toast.tileUpdated", { name: tile.name }),
  );
}

/** Applique le glisser-déposer en cours (appelé au relâchement). */
export function commitDrag(drag: DragState) {
  if (!drag.target) return;
  const target = drag.target;
  useStore.getState().update((c) => {
    if (drag.kind === "tile" && "groupId" in target) moveTile(c, drag.section, drag.id, target.groupId, target.index);
    if (drag.kind === "group") moveGroup(c, drag.section, drag.id, target.index);
  });
}

/** Groupes d'une section tels qu'ils seront si l'on relâche maintenant (aperçu du glisser). */
export function previewGroups(config: Config, section: SectionKind, drag: DragState | null): Group[] {
  const groups = config.sections[section].groups;
  if (!drag || drag.section !== section || !drag.target) return groups;
  const draft = structuredClone(config);
  const target = drag.target;
  if (drag.kind === "tile" && "groupId" in target) moveTile(draft, section, drag.id, target.groupId, target.index);
  if (drag.kind === "group") moveGroup(draft, section, drag.id, target.index);
  return draft.sections[section].groups;
}
