import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { applyQuickAdd, useEditStore } from "../editing";
import { blankTile } from "../lib/edit";
import type { Dropped } from "../lib/quickadd";
import { useStore, useT } from "../store";
import { Dialog } from "./Dialog";
import { TileIcon } from "./TileIcon";
import "./AppsPicker.css";

type InstalledApp = { name: string; target: string; source: "desktop" | "store" };

// La liste change rarement : on la garde pour la session.
let cached: Promise<InstalledApp[]> | null = null;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Affiche son contenu seulement une fois visible (évite d'extraire 200 icônes d'un coup). */
function Lazy({ children, size }: { children: React.ReactNode; size: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <span ref={ref} className="picker__icon" style={{ width: size, height: size }}>
      {visible && children}
    </span>
  );
}

/** Liste des applications installées, à cocher pour les ajouter d'un coup. */
export function AppsPicker() {
  const t = useT();
  const groups = useStore((s) => s.config?.sections.apps.groups ?? []);
  const close = () => useEditStore.setState({ picker: false });

  const [apps, setApps] = useState<InstalledApp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  useEffect(() => {
    cached ??= invoke<InstalledApp[]>("installed_apps");
    cached.then(setApps).catch((e) => {
      cached = null;
      setError(String(e));
    });
  }, []);

  const existing = useMemo(
    () => new Set(groups.flatMap((g) => g.tiles.map((x) => x.target.toLowerCase()))),
    [groups],
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return (apps ?? []).filter((a) => !q || normalize(a.name).includes(q));
  }, [apps, query]);

  const toggle = (target: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(target)) next.delete(target);
      else next.add(target);
      return next;
    });

  const submit = () => {
    const items: Dropped[] = (apps ?? [])
      .filter((a) => picked.has(a.target))
      .map((a) => ({ section: "apps", name: a.name, target: a.target, source: a.target }));
    applyQuickAdd(items, groupId ? { section: "apps", groupId } : null);
    close();
  };

  const count = picked.size;

  return (
    <Dialog
      title={t("picker.title")}
      subtitle={t("picker.subtitle")}
      onClose={close}
      width={560}
      footer={
        <>
          <label className="field__label" htmlFor="picker-group">
            {t("picker.addTo")}
          </label>
          <select id="picker-group" className="input picker__group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.length === 0 && <option value="">{t("group.newName")}</option>}
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span className="picker__spacer" />
          <button type="button" className="btn" onClick={close}>
            {t("dialog.cancel")}
          </button>
          <button type="button" className="btn btn--primary" disabled={count === 0} onClick={submit}>
            {count === 0 ? t("picker.add") : count === 1 ? t("picker.addOne") : t("picker.addMany", { count })}
          </button>
        </>
      }
    >
      <input
        className="input"
        data-autofocus
        placeholder={t("picker.filter")}
        aria-label={t("picker.filter")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="picker__list" role="list">
        {error && <p className="picker__message">{t("picker.error", { error })}</p>}
        {!error && apps === null && <p className="picker__message">{t("picker.loading")}</p>}
        {apps !== null && visible.length === 0 && <p className="picker__message">{t("picker.empty")}</p>}
        {visible.map((app) => {
          const added = existing.has(app.target.toLowerCase());
          const checked = added || picked.has(app.target);
          return (
            <label key={app.target} className={`picker__row${checked && !added ? " picker__row--on" : ""}${added ? " picker__row--added" : ""}`} role="listitem">
              <input type="checkbox" checked={checked} disabled={added} onChange={() => toggle(app.target)} />
              <Lazy size={28}>
                <TileIcon section="apps" tile={blankTile({ id: app.target, name: app.name, target: app.target })} size={28} />
              </Lazy>
              <span className="picker__text">
                <span className="picker__name">{app.name}</span>
                <span className="picker__detail">{app.target.replace(/^shell:AppsFolder\\/i, "")}</span>
              </span>
              <span className={`picker__badge${app.source === "store" && !added ? " picker__badge--store" : ""}`}>
                {added ? t("picker.added") : app.source === "store" ? t("picker.store") : t("picker.desktop")}
              </span>
            </label>
          );
        })}
      </div>
    </Dialog>
  );
}
