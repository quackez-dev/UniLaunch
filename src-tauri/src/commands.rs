//! Commandes Tauri appelées par l'interface (`invoke`).

use crate::config::{self, Config, SectionKind};
use crate::launcher::{self, LaunchError};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

/// État partagé du backend.
pub struct AppState {
    pub config_path: PathBuf,
    pub config: Mutex<Config>,
    /// Avertissement du chargement (configuration corrompue…), remis une seule fois à l'interface.
    pub startup_warning: Mutex<Option<String>>,
}

impl AppState {
    pub fn load(config_path: PathBuf) -> Self {
        let loaded = config::load(&config_path);
        Self {
            config_path,
            config: Mutex::new(loaded.config),
            startup_warning: Mutex::new(loaded.warning),
        }
    }
}

#[tauri::command]
pub fn get_config(state: State<'_, AppState>) -> Config {
    state.config.lock().expect("config lock").clone()
}

#[tauri::command]
pub fn save_config(state: State<'_, AppState>, config: Config) -> Result<(), String> {
    config::save(&state.config_path, &config).map_err(|e| e.to_string())?;
    *state.config.lock().expect("config lock") = config;
    Ok(())
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
