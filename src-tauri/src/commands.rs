//! Commandes Tauri appelées par l'interface (`invoke`).

use crate::config::{self, Config, SectionKind, Tile};
use crate::icons;
use crate::integration;
use crate::launcher::{self, LaunchError};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, State};

/// État partagé du backend.
pub struct AppState {
    pub config_path: PathBuf,
    pub config: Mutex<Config>,
    /// Avertissement du chargement (configuration corrompue…), remis une seule fois à l'interface.
    pub startup_warning: Mutex<Option<String>>,
    /// Cache des icônes extraites et des favicons (`%LOCALAPPDATA%\UniLaunch\icons`).
    pub icon_cache_dir: PathBuf,
    /// Icônes choisies par l'utilisateur (`%APPDATA%\UniLaunch\icons`), à garder.
    pub custom_icon_dir: PathBuf,
    /// Mode édition actif dans l'interface (la fenêtre ne se cache pas sur perte de focus).
    pub editing: AtomicBool,
}

impl AppState {
    pub fn load(config_path: PathBuf, icon_cache_dir: PathBuf) -> Self {
        let loaded = config::load(&config_path);
        let custom_icon_dir = config_path
            .parent()
            .map_or_else(|| PathBuf::from("icons"), |p| p.join("icons"));
        Self {
            config_path,
            config: Mutex::new(loaded.config),
            startup_warning: Mutex::new(loaded.warning),
            icon_cache_dir,
            custom_icon_dir,
            editing: AtomicBool::new(false),
        }
    }
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Config {
    state.config.lock().expect("config lock").clone()
}

/// Enregistre la configuration et applique ce qui touche Windows (raccourci, mode, démarrage).
/// Renvoie les avertissements (raccourci déjà pris…) ; l'enregistrement, lui, a réussi.
#[tauri::command]
pub fn save_config(
    app: AppHandle,
    state: State<'_, AppState>,
    config: Config,
) -> Result<Vec<String>, String> {
    config::save(&state.config_path, &config).map_err(|e| e.to_string())?;
    let old = {
        let mut current = state.config.lock().expect("config lock");
        std::mem::replace(&mut *current, config.clone()).settings
    };
    Ok(integration::apply_settings(
        &app,
        Some(&old),
        &config.settings,
    ))
}

/// L'interface signale le mode édition (pas de masquage sur perte de focus pendant l'édition).
#[tauri::command]
pub fn set_editing(state: State<'_, AppState>, editing: bool) {
    state.editing.store(editing, Ordering::Relaxed);
}

/// Après un lancement réussi : cache ou réduit la fenêtre selon les réglages.
#[tauri::command]
pub fn after_launch(app: AppHandle) {
    integration::after_launch(&app);
}

/// Cache la fenêtre (Échap en mode barre système).
#[tauri::command]
pub fn hide_window(app: AppHandle) {
    integration::hide_main(&app);
}

#[tauri::command]
pub fn take_startup_warning(state: State<'_, AppState>) -> Option<String> {
    state.startup_warning.lock().expect("warning lock").take()
}

/// Lance une tuile. La cible est relue dans la configuration du backend :
/// l'interface ne transmet qu'un identifiant, jamais une commande à exécuter.
#[tauri::command]
pub async fn launch_tile(
    state: State<'_, AppState>,
    section: SectionKind,
    tile_id: String,
    as_admin: bool,
) -> Result<(), LaunchError> {
    let tile = {
        let cfg = state.config.lock().expect("config lock");
        cfg.sections
            .find_tile(section, &tile_id)
            .cloned()
            .ok_or_else(|| LaunchError::NotFound(tile_id.clone()))?
    };
    let cmd = launcher::plan(section, &tile, as_admin, launcher::disk_state)?;
    // L'invite UAC peut bloquer : on lance hors du fil principal.
    tauri::async_runtime::spawn_blocking(move || launcher::execute(&cmd))
        .await
        .map_err(|e| LaunchError::Failed(e.to_string()))?
}

/// Ouvre l'Explorateur sur l'emplacement d'une tuile (élément sélectionné).
#[tauri::command]
pub async fn reveal_tile(
    state: State<'_, AppState>,
    section: SectionKind,
    tile_id: String,
) -> Result<(), LaunchError> {
    let tile = {
        let cfg = state.config.lock().expect("config lock");
        cfg.sections
            .find_tile(section, &tile_id)
            .cloned()
            .ok_or_else(|| LaunchError::NotFound(tile_id.clone()))?
    };
    let cmd = launcher::plan_reveal(section, &tile, launcher::disk_state)?;
    tauri::async_runtime::spawn_blocking(move || launcher::execute(&cmd))
        .await
        .map_err(|e| LaunchError::Failed(e.to_string()))?
}

/// Icône d'une tuile (URL `data:`), ou `null` si l'interface la dessine elle-même.
/// Reçoit la tuile entière pour servir aussi à l'aperçu du formulaire, avant l'enregistrement.
#[tauri::command]
pub async fn tile_icon(
    state: State<'_, AppState>,
    section: SectionKind,
    tile: Tile,
) -> Result<Option<String>, String> {
    let dir = state.icon_cache_dir.clone();
    // Extraction COM et requêtes réseau : hors du fil principal.
    tauri::async_runtime::spawn_blocking(move || icons::resolve(&dir, section, &tile))
        .await
        .map_err(|e| e.to_string())
}

/// Copie une image choisie par l'utilisateur et renvoie le chemin à enregistrer.
#[tauri::command]
pub fn import_custom_icon(state: State<'_, AppState>, source: String) -> Result<String, String> {
    icons::import_custom(&state.custom_icon_dir, Path::new(&source))
        .map(|p| p.to_string_lossy().into_owned())
}

/// Identifiants des tuiles dont le fichier ou le dossier n'existe plus.
#[tauri::command]
pub fn missing_tiles(state: State<'_, AppState>) -> Vec<String> {
    let cfg = state.config.lock().expect("config lock").clone();
    let mut missing = Vec::new();
    for kind in [SectionKind::Apps, SectionKind::Folders] {
        for tile in cfg.sections.get(kind).groups.iter().flat_map(|g| &g.tiles) {
            if let Err(LaunchError::NotFound(_)) =
                launcher::plan(kind, tile, false, launcher::disk_state)
            {
                missing.push(tile.id.clone());
            }
        }
    }
    missing
}

/// Analyse des chemins déposés ou collés : colonne, nom et cible de chaque élément.
#[tauri::command]
pub fn classify_paths(paths: Vec<String>) -> Vec<crate::quickadd::Dropped> {
    paths
        .iter()
        .map(|p| {
            crate::quickadd::classify(p, launcher::disk_state, |path| {
                std::fs::read_to_string(path).ok()
            })
        })
        .collect()
}

/// Applications du menu Démarrer et du Microsoft Store.
#[tauri::command]
pub async fn installed_apps() -> Result<Vec<crate::quickadd::InstalledApp>, String> {
    tauri::async_runtime::spawn_blocking(crate::quickadd::installed_apps)
        .await
        .map_err(|e| e.to_string())?
}
