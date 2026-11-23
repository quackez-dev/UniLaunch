//! Intégration à Windows : fenêtre affichée/cachée, icône de la zone de notification,
//! raccourci clavier global, démarrage avec Windows.

use crate::commands::AppState;
use crate::config::{Language, Settings, WindowMode};
use crate::window;
use std::sync::atomic::Ordering;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime, WebviewWindow, WindowEvent};
use tauri_plugin_autostart::ManagerExt as _;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Argument passé par le démarrage automatique : on reste caché dans la zone de notification.
pub const AUTOSTART_ARG: &str = "--autostart";

const TRAY_ID: &str = "main";

/// Éléments du menu de l'icône, gardés pour les traduire quand la langue change.
pub struct TrayItems<R: Runtime> {
    show: MenuItem<R>,
    quit: MenuItem<R>,
}

fn labels(lang: Language) -> (&'static str, &'static str) {
    match lang {
        Language::Fr => ("Afficher UniLaunch", "Quitter"),
        Language::En => ("Show UniLaunch", "Quit"),
    }
}

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window("main")
}

fn settings<R: Runtime>(app: &AppHandle<R>) -> Settings {
    app.state::<AppState>()
        .config
        .lock()
        .expect("config lock")
        .settings
        .clone()
}

/// Affiche la fenêtre au centre de l'écran principal (celui du menu Démarrer), au premier plan,
/// quel que soit l'écran où se trouvent la souris ou la fenêtre active.
pub fn show_main<R: Runtime>(app: &AppHandle<R>) {
    let Some(win) = main_window(app) else {
        return;
    };
    let scale = settings(app).window_scale;
    match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let _ = window::fit_to(&win, &monitor, scale);
        }
        _ => {
            let _ = window::fit_to_monitor(&win, scale);
        }
    }
    let _ = win.unminimize();
    let _ = win.show();
    let _ = win.set_focus();
}

pub fn hide_main<R: Runtime>(app: &AppHandle<R>) {
    if let Some(win) = main_window(app) {
        let _ = win.hide();
    }
}

/// Affiche la fenêtre si elle est cachée (ou en arrière-plan), la cache sinon.
pub fn toggle_main<R: Runtime>(app: &AppHandle<R>) {
    let Some(win) = main_window(app) else {
        return;
    };
    let visible = win.is_visible().unwrap_or(false) && !win.is_minimized().unwrap_or(false);
    let focused = win.is_focused().unwrap_or(false);
    if visible && focused {
        hide_main(app);
    } else {
        show_main(app);
    }
}

/// Après un lancement : cache (mode barre système) ou réduit (mode fenêtre).
pub fn after_launch<R: Runtime>(app: &AppHandle<R>) {
    let s = settings(app);
    if !s.hide_after_launch {
        return;
    }
    let Some(win) = main_window(app) else {
        return;
    };
    match s.window_mode {
        WindowMode::Tray => {
            let _ = win.hide();
        }
        WindowMode::Window => {
            let _ = win.minimize();
        }
    }
}

/// Mode barre système : pas d'icône dans la barre des tâches.
pub fn apply_window_mode<R: Runtime>(app: &AppHandle<R>, mode: WindowMode) {
    if let Some(win) = main_window(app) {
        let _ = win.set_skip_taskbar(mode == WindowMode::Tray);
    }
}

/// (Ré)enregistre le raccourci global. Une chaîne vide désactive le raccourci.
pub fn register_hotkey<R: Runtime>(app: &AppHandle<R>, hotkey: &str) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let hotkey = hotkey.trim();
    if hotkey.is_empty() {
        return Ok(());
    }
    let shortcut: Shortcut = hotkey
        .parse()
        .map_err(|e| format!("raccourci invalide « {hotkey} » : {e}"))?;
    let result = gs
        .register(shortcut)
        .map_err(|e| format!("raccourci « {hotkey} » indisponible (déjà utilisé ?) : {e}"));
    #[cfg(debug_assertions)]
    eprintln!("[unilaunch] raccourci global « {hotkey} » : {result:?}");
    result
}

pub fn apply_autostart<R: Runtime>(app: &AppHandle<R>, enabled: bool) -> Result<(), String> {
    let launcher = app.autolaunch();
    let current = launcher.is_enabled().unwrap_or(false);
    if current == enabled {
        return Ok(());
    }
    if enabled {
        launcher.enable()
    } else {
        launcher.disable()
    }
    .map_err(|e| format!("démarrage avec Windows : {e}"))
}

/// Applique les réglages qui touchent Windows ; renvoie les avertissements éventuels.
pub fn apply_settings<R: Runtime>(
    app: &AppHandle<R>,
    old: Option<&Settings>,
    new: &Settings,
) -> Vec<String> {
    let mut warnings = Vec::new();
    if old.is_none_or(|o| o.hotkey != new.hotkey)
        && let Err(e) = register_hotkey(app, &new.hotkey)
    {
        warnings.push(e);
    }
    if old.is_none_or(|o| o.window_mode != new.window_mode) {
        apply_window_mode(app, new.window_mode);
    }
    // Nouvelle taille de fenêtre : appliquée tout de suite (au démarrage, `setup` s'en charge).
    if let Some(o) = old
        && (o.window_scale - new.window_scale).abs() > f64::EPSILON
        && let Some(win) = main_window(app)
    {
        let _ = window::fit_to_monitor(&win, new.window_scale);
    }
    if old.is_none_or(|o| o.start_with_windows != new.start_with_windows)
        && let Err(e) = apply_autostart(app, new.start_with_windows)
    {
        warnings.push(e);
    }
    if old.is_none_or(|o| o.language != new.language)
        && let Some(items) = app.try_state::<TrayItems<R>>()
    {
        let (show, quit) = labels(new.language);
        let _ = items.show.set_text(show);
        let _ = items.quit.set_text(quit);
    }
    warnings
}

/// Crée l'icône de la zone de notification et son menu.
pub fn build_tray<R: Runtime>(app: &AppHandle<R>, lang: Language) -> tauri::Result<()> {
    let (show_label, quit_label) = labels(lang);
    let show = MenuItem::with_id(app, "show", show_label, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", quit_label, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("UniLaunch")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    app.manage(TrayItems { show, quit });
    Ok(())
}

/// Gestionnaire du raccourci global (déclaré avec le plugin).
pub fn on_shortcut<R: Runtime>(app: &AppHandle<R>, state: ShortcutState) {
    #[cfg(debug_assertions)]
    eprintln!("[unilaunch] raccourci global : {state:?}");
    if state == ShortcutState::Pressed {
        toggle_main(app);
    }
}

/// Fermer et perte du focus, selon le mode d'affichage.
pub fn on_window_event<R: Runtime>(win: &tauri::Window<R>, event: &WindowEvent) {
    if win.label() != "main" {
        return;
    }
    let app = win.app_handle();
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            // En mode barre système, « Fermer » cache seulement la fenêtre.
            if settings(app).window_mode == WindowMode::Tray {
                api.prevent_close();
                let _ = win.hide();
            }
        }
        WindowEvent::Focused(false) => {
            let s = settings(app);
            let editing = app.state::<AppState>().editing.load(Ordering::Relaxed);
            // Pas en mode édition : un sélecteur de fichier ferait disparaître la fenêtre.
            if s.window_mode == WindowMode::Tray && s.hide_on_blur && !editing {
                let _ = win.hide();
            }
        }
        _ => {}
    }
}
