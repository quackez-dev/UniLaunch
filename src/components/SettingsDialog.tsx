import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ACCENT_SWATCHES } from "../lib/accent";
import { hotkeyFromEvent, hotkeyKeys } from "../lib/hotkey";
import type { Config, Settings } from "../lib/types";
import { useStore, useT } from "../store";
import type { MessageKey } from "../i18n";
import { Dialog } from "./Dialog";
import { Logo } from "./Logo";
import "./SettingsDialog.css";

type VersionInfo = { app: string; windows: string; webview: string };

function Row({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div className="settings__row">
      <div className="settings__text">
        <span className="settings__label">{label}</span>
        {help && <span className="settings__help">{help}</span>}
      </div>
      <div className="settings__control">{children}</div>
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(value: T): void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="seg__btn" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange(v: boolean): void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span className="switch__knob" />
    </button>
  );
}

/** Fenêtre des paramètres : fenêtre, apparence, données, à propos. */
export function SettingsDialog({ onClose }: { onClose(): void }) {
  const t = useT();
  const settings = useStore((s) => s.config!.settings);
  const update = useStore((s) => s.update);
  const showToast = useStore((s) => s.showToast);
  const [capturing, setCapturing] = useState(false);
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [location, setLocation] = useState("");

  useEffect(() => {
    invoke<VersionInfo>("version_info").then(setInfo).catch(() => {});
    invoke<string>("config_location").then(setLocation).catch(() => {});
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update((c) => {
      c.settings[key] = value;
    });

  const onCaptureKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!capturing) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      setCapturing(false);
      return;
    }
    const hotkey = hotkeyFromEvent(e);
    if (hotkey) {
      set("hotkey", hotkey);
      setCapturing(false);
    }
  };

  const doExport = async () => {
    const path = await save({
      defaultPath: "unilaunch-config.json",
      filters: [{ name: t("settings.fileFilter"), extensions: ["json"] }],
    });
    if (!path) return;
    try {
      await invoke("export_config", { path });
      showToast(t("toast.exported"));
    } catch (e) {
      showToast(String(e), { tone: "error" });
    }
  };

  const doImport = async () => {
    const path = await open({ multiple: false, filters: [{ name: t("settings.fileFilter"), extensions: ["json"] }] });
    if (typeof path !== "string") return;
    try {
      const imported = await invoke<Config>("import_config", { path });
      const previous = structuredClone(useStore.getState().config!);
      const replace = (src: Config) =>
        useStore.getState().update((c) => {
          c.schemaVersion = src.schemaVersion;
          c.settings = src.settings;
          c.sections = src.sections;
        });
      replace(imported);
      showToast(t("toast.imported"), { undo: () => replace(previous) });
    } catch (e) {
      showToast(String(e), { tone: "error" });
    }
  };

  const copyInfo = () => {
    if (!info) return;
    const text = `UniLaunch ${info.app}\n${info.windows}\nWebView2 ${info.webview}`;
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(t("toast.infoCopied")))
      .catch((e) => showToast(String(e), { tone: "error" }));
  };

  const lang = settings.language;
  const keys = hotkeyKeys(settings.hotkey, lang);

  return (
    <Dialog title={t("settings.title")} onClose={onClose} width={620}>
      <div className="settings">
        <h3 className="settings__section">{t("settings.window")}</h3>
        <Row label={t("settings.scale")} help={t("settings.scale.help")}>
          <Segmented
            label={t("settings.scale")}
            value={Math.round(settings.windowScale * 100)}
            options={[40, 50, 60].map((v) => ({ value: v, label: `${v} %` }))}
            onChange={(v) => set("windowScale", v / 100)}
          />
        </Row>
        <Row label={t("settings.mode")} help={t(settings.windowMode === "tray" ? "settings.mode.help.tray" : "settings.mode.help.window")}>
          <Segmented
            label={t("settings.mode")}
            value={settings.windowMode}
            options={[
              { value: "window", label: t("settings.mode.window") },
              { value: "tray", label: t("settings.mode.tray") },
            ]}
            onChange={(v) => set("windowMode", v)}
          />
        </Row>
        <Row label={t("settings.hotkey")} help={t("settings.hotkey.help")}>
          <div className="settings__hotkey">
            {capturing ? (
              <span className="settings__capture" aria-live="polite">
                {t("settings.hotkey.capture")}
              </span>
            ) : keys.length > 0 ? (
              keys.map((k) => <kbd key={k}>{k}</kbd>)
            ) : (
              <span className="settings__help">{t("settings.hotkey.none")}</span>
            )}
            <button
              type="button"
              className={`btn${capturing ? " btn--primary" : ""}`}
              onClick={() => setCapturing((c) => !c)}
              onKeyDown={onCaptureKey}
              onBlur={() => setCapturing(false)}
            >
              {capturing ? t("settings.hotkey.cancel") : t("settings.hotkey.change")}
            </button>
          </div>
        </Row>
        <Row label={t("settings.hideAfterLaunch")} help={t("settings.hideAfterLaunch.help")}>
          <Switch label={t("settings.hideAfterLaunch")} checked={settings.hideAfterLaunch} onChange={(v) => set("hideAfterLaunch", v)} />
        </Row>
        <Row label={t("settings.hideOnBlur")} help={t("settings.hideOnBlur.help")}>
          <Switch label={t("settings.hideOnBlur")} checked={settings.hideOnBlur} onChange={(v) => set("hideOnBlur", v)} />
        </Row>
        <Row label={t("settings.autostart")} help={t("settings.autostart.help")}>
          <Switch label={t("settings.autostart")} checked={settings.startWithWindows} onChange={(v) => set("startWithWindows", v)} />
        </Row>

        <h3 className="settings__section">{t("settings.appearance")}</h3>
        <Row label={t("settings.accent")} help={t("settings.accent.help")}>
          <div className="settings__swatches">
            {ACCENT_SWATCHES.map((s) => (
              <button
                key={s.color}
                type="button"
                className="swatch"
                aria-label={t(`settings.accent.${s.name}` as MessageKey)}
                title={t(`settings.accent.${s.name}` as MessageKey)}
                aria-pressed={settings.accentColor.toLowerCase() === s.color.toLowerCase()}
                style={{ background: s.color, color: s.color }}
                onClick={() => set("accentColor", s.color)}
              />
            ))}
          </div>
        </Row>
        <Row label={t("settings.tileSize")} help={t("settings.tileSize.help")}>
          <Segmented
            label={t("settings.tileSize")}
            value={settings.tileSize}
            options={(["S", "M", "L"] as const).map((v) => ({ value: v, label: t(`settings.tileSize.${v}`) }))}
            onChange={(v) => set("tileSize", v)}
          />
        </Row>
        <Row label={t("settings.labels")} help={t("settings.labels.help")}>
          <Segmented
            label={t("settings.labels")}
            value={settings.showLabels}
            options={(["always", "hover"] as const).map((v) => ({ value: v, label: t(`settings.labels.${v}`) }))}
            onChange={(v) => set("showLabels", v)}
          />
        </Row>
        <Row label={t("settings.language")} help={t("settings.language.help")}>
          <Segmented
            label={t("settings.language")}
            value={settings.language}
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
            onChange={(v) => set("language", v)}
          />
        </Row>

        <h3 className="settings__section">{t("settings.data")}</h3>
        <Row label={t("settings.config")} help={location}>
          <div className="settings__buttons">
            <button type="button" className="btn" onClick={() => void doImport()}>
              {t("settings.import")}
            </button>
            <button type="button" className="btn" onClick={() => void doExport()}>
              {t("settings.export")}
            </button>
            <button type="button" className="btn" onClick={() => void invoke("reveal_config").catch(() => {})}>
              {t("settings.openFolder")}
            </button>
          </div>
        </Row>

        <h3 className="settings__section">{t("settings.about")}</h3>
        <div className="settings__about panel">
          <div className="settings__logo">
            <Logo size={28} />
          </div>
          <div className="settings__about-text">
            <span className="settings__app">UniLaunch</span>
            <span className="settings__version">{t("settings.version", { version: info?.app ?? "…" })}</span>
            <span className="settings__help">{t("settings.tagline")}</span>
          </div>
          <button type="button" className="btn" onClick={copyInfo} disabled={!info}>
            {t("settings.copyInfo")}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
