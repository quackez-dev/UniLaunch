import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SectionKind, Tile } from "../lib/types";
import { launchErrorText, t as tr, useStore, useT } from "../store";
import type { MessageKey } from "../i18n";
import "./ContextMenu.css";

type Item =
  | { kind: "item"; label: MessageKey; shortcut?: MessageKey; danger?: boolean; run: () => void }
  | { kind: "separator" };

const MENU_WIDTH = 236;

function isShellTarget(target: string) {
  return /^shell:/i.test(target.trim());
}

/** Menu du clic droit sur une tuile. */
export function ContextMenu() {
  const t = useT();
  const menu = useStore((s) => s.menu);
  const closeMenu = useStore((s) => s.closeMenu);
  const config = useStore((s) => s.config);
  const editing = useStore((s) => s.editing);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const tile = menu ? config?.sections[menu.section].groups.flatMap((g) => g.tiles).find((x) => x.id === menu.tileId) : undefined;

  // Garde le menu dans la fenêtre, puis donne le focus au premier élément.
  useLayoutEffect(() => {
    if (!menu || !ref.current) {
      setPos(null);
      return;
    }
    const h = ref.current.offsetHeight;
    setPos({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - MENU_WIDTH - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)),
    });
    ref.current.querySelector<HTMLButtonElement>("button")?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const close = () => closeMenu();
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
    };
  }, [menu, closeMenu]);

  if (!menu || !tile) return null;

  const items = buildItems(menu.section, tile, editing);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  };

  return (
    <>
      <button type="button" className="menu-backdrop" aria-label={t("menu.close")} onClick={closeMenu} onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} />
      <div
        ref={ref}
        role="menu"
        aria-label={t("menu.label", { name: tile.name })}
        className="menu"
        style={{ left: pos?.x ?? menu.x, top: pos?.y ?? menu.y, width: MENU_WIDTH, visibility: pos ? "visible" : "hidden" }}
        onKeyDown={onKeyDown}
      >
        {items.map((item, i) =>
          item.kind === "separator" ? (
            <div key={i} className="menu__separator" role="separator" />
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={`menu__item${item.danger ? " menu__item--danger" : ""}`}
              onClick={() => {
                closeMenu();
                item.run();
              }}
            >
              <span>{t(item.label)}</span>
              {item.shortcut && <span className="menu__shortcut">{t(item.shortcut)}</span>}
            </button>
          ),
        )}
      </div>
    </>
  );
}

function buildItems(section: SectionKind, tile: Tile, editing: boolean): Item[] {
  const store = useStore.getState();
  const reveal = () =>
    invoke("reveal_tile", { section, tileId: tile.id }).catch((e) =>
      store.showToast(launchErrorText(e), { tone: "error" }),
    );
  const copy = () =>
    navigator.clipboard
      .writeText(tile.target)
      .then(() => store.showToast(tr("toast.copied")))
      .catch((e) => store.showToast(String(e), { tone: "error" }));

  const items: Item[] = [{ kind: "item", label: "menu.open", shortcut: "menu.openKey", run: () => void store.launch(section, tile) }];
  if (section === "apps" && !isShellTarget(tile.target)) {
    items.push(
      { kind: "item", label: "menu.runAsAdmin", run: () => void store.launch(section, tile, true) },
      { kind: "item", label: "menu.revealFile", run: reveal },
      { kind: "item", label: "menu.copyPath", run: copy },
    );
  }
  if (section === "folders") {
    items.push(
      { kind: "item", label: "menu.revealFolder", run: reveal },
      { kind: "item", label: "menu.copyPath", run: copy },
    );
  }
  if (section === "websites") {
    items.push({ kind: "item", label: "menu.copyUrl", run: copy });
  }
  void editing; // Les actions « Modifier » et « Supprimer » arrivent avec le mode édition.
  return items;
}
