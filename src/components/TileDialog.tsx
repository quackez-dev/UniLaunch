import { useEffect, useMemo, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { saveTile, useEditStore, type TileDialogState } from "../editing";
import { addGroup, blankTile, findTile, normalizeUrl, suggestName } from "../lib/edit";
import { folderColors } from "../lib/monogram";
import type { IconSpec, Tile } from "../lib/types";
import { useStore, useT } from "../store";
import { Dialog } from "./Dialog";
import { TileIcon } from "./TileIcon";
import "./TileDialog.css";

const APP_EXTENSIONS = ["exe", "lnk", "bat", "cmd", "msc", "appref-ms"];
const IMAGE_EXTENSIONS = ["png", "ico", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];

/** Formulaire d'ajout ou de modification d'une tuile. */
export function TileDialog({ state }: { state: TileDialogState }) {
  const t = useT();
  const closeDialog = useEditStore((s) => s.closeDialog);
  const config = useStore((s) => s.config)!;
  const showToast = useStore((s) => s.showToast);
  const { section } = state;
  const groups = config.sections[section].groups;
  const isNew = !state.tile;

  const initialGroup = useMemo(() => {
    if (state.tile) return findTile(config, section, state.tile.id)?.group.id ?? groups[0]?.id ?? "";
    return state.groupId ?? groups[0]?.id ?? "";
    // Calculé une seule fois à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draft, setDraft] = useState<Tile>(() => state.tile ?? blankTile());
  const [groupId, setGroupId] = useState(initialGroup);
  const [nameTouched, setNameTouched] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  // L'aperçu de l'icône suit la cible avec un délai, pour ne pas interroger un site à chaque touche.
  const [previewTarget, setPreviewTarget] = useState(draft.target);

  useEffect(() => {
    const id = setTimeout(() => setPreviewTarget(draft.target), 600);
    return () => clearTimeout(id);
  }, [draft.target]);

  const set = (patch: Partial<Tile>) => setDraft((d) => ({ ...d, ...patch }));

  const setTarget = (target: string) => {
    setError(null);
    setDraft((d) => ({ ...d, target, name: nameTouched ? d.name : suggestName(section, target) }));
  };

  const browseTarget = async () => {
    const picked = await open(
      section === "folders"
        ? { directory: true, title: t("field.path.folders") }
        : { multiple: false, filters: [{ name: t("dialog.filter.apps"), extensions: APP_EXTENSIONS }] },
    );
    if (typeof picked === "string") {
      setTarget(picked);
      setPreviewTarget(picked);
    }
  };

  const browseWorkingDir = async () => {
    const picked = await open({ directory: true, title: t("field.workingDir") });
    if (typeof picked === "string") set({ workingDir: picked });
  };

  const chooseIcon = async (kind: IconSpec["kind"]) => {
    if (kind !== "custom") {
      set({ icon: kind === "auto" ? { kind: "auto" } : { kind: "monogram" } });
      return;
    }
    const picked = await open({ multiple: false, filters: [{ name: t("dialog.filter.images"), extensions: IMAGE_EXTENSIONS }] });
    if (typeof picked !== "string") return;
    try {
      const path = await invoke<string>("import_custom_icon", { source: picked });
      set({ icon: { kind: "custom", path } });
    } catch (e) {
      showToast(String(e), { tone: "error" });
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let target = draft.target.trim();
    if (!target) {
      setError(t("dialog.error.required"));
      return;
    }
    if (section === "websites") {
      const url = normalizeUrl(target);
      if (!url) {
        setError(t("dialog.error.url"));
        return;
      }
      target = url;
    }
    const tile: Tile = {
      ...draft,
      target,
      name: draft.name.trim() || suggestName(section, target) || target,
      args: section === "apps" ? draft.args.trim() : "",
      workingDir: section === "apps" ? draft.workingDir.trim() : "",
      runAsAdmin: section === "apps" && draft.runAsAdmin,
    };

    let destination = groupId;
    if (!destination) {
      // Aucun groupe dans la colonne : on en crée un.
      useStore.getState().update((c) => {
        destination = addGroup(c, section, t("group.newName")).id;
      });
    }
    saveTile(section, tile, destination, isNew);
    closeDialog();
  };

  const groupIndex = Math.max(0, groups.findIndex((g) => g.id === groupId));
  const previewTile: Tile = {
    ...draft,
    target: section === "websites" ? (normalizeUrl(previewTarget) ?? previewTarget) : previewTarget,
  };
  const iconNote =
    draft.icon.kind === "custom"
      ? t("icon.note.custom")
      : draft.icon.kind === "monogram"
        ? t("icon.note.monogram")
        : t(`icon.note.${section}`);

  return (
    <Dialog
      title={isNew ? t(`dialog.title.${section}`) : t("dialog.title.edit")}
      onClose={closeDialog}
      footer={
        <>
          <span className="dialog__tip">{t(`dialog.tip.${section}`)}</span>
          <button type="button" className="btn" onClick={closeDialog}>
            {t("dialog.cancel")}
          </button>
          <button type="submit" form="tile-form" className="btn btn--primary">
            {isNew ? t("dialog.add") : t("dialog.save")}
          </button>
        </>
      }
    >
      <form id="tile-form" className="tile-form" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="tile-target">
            {t(`field.path.${section}`)}
          </label>
          <div className="field__row">
            <input
              id="tile-target"
              data-autofocus
              className={`input${error ? " input--invalid" : ""}`}
              value={draft.target}
              placeholder={t(`field.path.placeholder.${section}`)}
              spellCheck={false}
              onChange={(e) => setTarget(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "tile-target-error" : undefined}
            />
            {section !== "websites" && (
              <button type="button" className="btn" onClick={() => void browseTarget()}>
                {t("dialog.browse")}
              </button>
            )}
          </div>
          {error && (
            <span id="tile-target-error" className="field__error" role="alert">
              {error}
            </span>
          )}
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field__label" htmlFor="tile-name">
              {t("field.name")}
            </label>
            <input
              id="tile-name"
              className="input"
              value={draft.name}
              onChange={(e) => {
                setNameTouched(true);
                set({ name: e.target.value });
              }}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tile-group">
              {t("field.group")}
            </label>
            <select id="tile-group" className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.length === 0 && <option value="">{t("group.newName")}</option>}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="panel tile-form__icon">
          <div className="tile-form__preview">
            <TileIcon section={section} tile={previewTile} size={38} folder={folderColors(groupIndex)} />
          </div>
          <div className="tile-form__icon-choices">
            <span className="field__label">{t("field.icon")}</span>
            <div className="seg" role="group" aria-label={t("field.icon")}>
              {(["auto", "custom", "monogram"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className="seg__btn"
                  aria-pressed={draft.icon.kind === kind}
                  onClick={() => void chooseIcon(kind)}
                >
                  {t(`icon.${kind}`)}
                </button>
              ))}
            </div>
            <span className="check__note">{iconNote}</span>
          </div>
        </div>

        {section === "apps" && (
          <details className="panel tile-form__advanced" open={!!(draft.args || draft.workingDir || draft.runAsAdmin)}>
            <summary>{t("dialog.advanced")}</summary>
            <div className="tile-form__advanced-body">
              <div className="field-grid">
                <div className="field">
                  <label className="field__label" htmlFor="tile-args">
                    {t("field.args")}
                  </label>
                  <input
                    id="tile-args"
                    className="input"
                    value={draft.args}
                    placeholder={t("field.args.placeholder")}
                    spellCheck={false}
                    onChange={(e) => set({ args: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="tile-wd">
                    {t("field.workingDir")}
                  </label>
                  <div className="field__row">
                    <input
                      id="tile-wd"
                      className="input"
                      value={draft.workingDir}
                      placeholder={t("field.workingDir.placeholder")}
                      spellCheck={false}
                      onChange={(e) => set({ workingDir: e.target.value })}
                    />
                    <button type="button" className="btn" aria-label={t("dialog.browse")} onClick={() => void browseWorkingDir()}>
                      …
                    </button>
                  </div>
                </div>
              </div>
              <label className="check">
                <input type="checkbox" checked={draft.runAsAdmin} onChange={(e) => set({ runAsAdmin: e.target.checked })} />
                <span>
                  {t("field.admin")}
                  <span className="check__note">{t("field.admin.note")}</span>
                </span>
              </label>
            </div>
          </details>
        )}
      </form>
    </Dialog>
  );
}
