// Ajouts venant de l'extérieur : fichiers déposés depuis l'Explorateur et texte collé (Ctrl+V).
// Les deux ne fonctionnent qu'en mode édition.

import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { applyQuickAdd, groupAt, useEditStore } from "../editing";
import { t, useStore } from "../store";
import { pastedCandidates, type Dropped } from "./quickadd";
import type { SectionKind } from "./types";

function classify(paths: string[]): Promise<Dropped[]> {
  return invoke<Dropped[]>("classify_paths", { paths });
}

export function useExternalAdd() {
  // --- Glisser-déposer de fichiers -------------------------------------------------
  useEffect(() => {
    let sections = new Set<SectionKind>();
    let pending: Promise<Dropped[]> = Promise.resolve([]);
    let unlisten: (() => void) | undefined;
    let disposed = false;

    const toLogical = (p: { x: number; y: number }) => ({
      x: p.x / window.devicePixelRatio,
      y: p.y / window.devicePixelRatio,
    });

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const editing = useStore.getState().editing;
        const payload = event.payload;

        if (payload.type === "enter") {
          pending = classify(payload.paths);
          void pending.then((items) => {
            sections = new Set(items.map((i) => i.section).filter((s): s is SectionKind => !!s));
          });
        }
        if (payload.type === "enter" || payload.type === "over") {
          if (!editing) return;
          const { x, y } = toLogical(payload.position);
          const over = groupAt(x, y);
          const fileOver = over && sections.has(over.section) ? over.groupId : null;
          if (useEditStore.getState().fileOver !== fileOver) useEditStore.setState({ fileOver });
        }
        if (payload.type === "leave") {
          useEditStore.setState({ fileOver: null });
        }
        if (payload.type === "drop") {
          useEditStore.setState({ fileOver: null });
          if (!editing) {
            useStore.getState().showToast(t("toast.editToAdd"));
            return;
          }
          const { x, y } = toLogical(payload.position);
          const over = groupAt(x, y);
          void pending.then((items) => applyQuickAdd(items, over));
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  // --- Coller une adresse ou un chemin ----------------------------------------------
  useEffect(() => {
    let pointer = { x: -1, y: -1 };
    const track = (e: PointerEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
    };
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (useEditStore.getState().dialog) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const candidates = pastedCandidates(text);
      if (candidates.length === 0) return;
      e.preventDefault();
      if (!useStore.getState().editing) {
        useStore.getState().showToast(t("toast.editToAdd"));
        return;
      }
      const over = groupAt(pointer.x, pointer.y);
      void classify(candidates).then((items) => applyQuickAdd(items, over));
    };
    window.addEventListener("pointermove", track);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("pointermove", track);
      document.removeEventListener("paste", onPaste);
    };
  }, []);
}
