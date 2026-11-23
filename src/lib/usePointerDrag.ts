// Glisser à la souris (Pointer Events) : un simple clic reste un clic,
// le glisser ne démarre qu'après quelques pixels de mouvement.

import { useRef, type PointerEvent as ReactPointerEvent } from "react";

const THRESHOLD = 5;

type Handlers = {
  /** Appelé une fois le seuil dépassé. */
  onStart(x: number, y: number): void;
  onMove(x: number, y: number): void;
  onEnd(cancelled: boolean): void;
};

/**
 * Renvoie le gestionnaire `onPointerDown` à poser sur l'élément à glisser, et une fonction
 * qui indique si le dernier geste était un glisser (pour ignorer le clic qui suit).
 */
export function usePointerDrag(enabled: boolean, handlers: Handlers) {
  const dragged = useRef(false);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || e.button !== 0) return;
    // Les gestionnaires du rendu courant servent pour tout le geste
    // (ils lisent l'état à jour via le store).
    const latest = { current: handlers };
    const startX = e.clientX;
    const startY = e.clientY;
    let active = false;
    dragged.current = false;

    const move = (ev: PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < THRESHOLD) return;
        active = true;
        dragged.current = true;
        latest.current.onStart(ev.clientX, ev.clientY);
      }
      latest.current.onMove(ev.clientX, ev.clientY);
    };
    const finish = (cancelled: boolean) => () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      if (active) latest.current.onEnd(cancelled);
    };
    const up = finish(false);
    const cancel = finish(true);
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") cancel();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
  };

  /** Vrai si le geste qui vient de finir était un glisser (puis remet à zéro). */
  const consumeDragged = () => {
    const was = dragged.current;
    dragged.current = false;
    return was;
  };

  return { onPointerDown, consumeDragged };
}
