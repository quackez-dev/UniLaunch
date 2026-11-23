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

/// Exporte la configuration (icônes personnalisées comprises) dans un fichier JSON.
#[tauri::command]
pub fn export_config(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let config = state.config.lock().expect("config lock").clone();
    let text = crate::transfer::build_export(&config)?;
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

/// Lit un export ; renvoie la configuration à appliquer (l'interface l'enregistre,
/// ce qui permet d'annuler).
#[tauri::command]
pub fn import_config(state: State<'_, AppState>, path: String) -> Result<Config, String> {
    let text = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    crate::transfer::read_import(&text, &state.custom_icon_dir)
}

/// Versions utiles pour signaler un problème.
#[derive(serde::Serialize)]
pub struct VersionInfo {
    app: String,
    windows: String,
    webview: String,
}

#[tauri::command]
pub fn version_info(app: AppHandle) -> VersionInfo {
    VersionInfo {
        app: app.package_info().version.to_string(),
        windows: windows_version(),
        webview: tauri::webview_version().unwrap_or_else(|_| "?".into()),
    }
}

/// Ex. « Windows 11 24H2 (build 26100.2605) », lu dans le registre.
#[cfg(windows)]
fn windows_version() -> String {
    use windows::Win32::System::Registry::{
        HKEY_LOCAL_MACHINE, RRF_RT_REG_DWORD, RRF_RT_REG_SZ, RegGetValueW,
    };
    use windows::core::{HSTRING, PCWSTR};

    const KEY: &str = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion";
    let read_string = |name: &str| -> Option<String> {
        let mut buf = [0u16; 128];
        let mut size = (buf.len() * 2) as u32;
        // SAFETY : tampon local de taille connue, passée dans `size`.
        unsafe {
            RegGetValueW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(HSTRING::from(KEY).as_ptr()),
                PCWSTR(HSTRING::from(name).as_ptr()),
                RRF_RT_REG_SZ,
                None,
                Some(buf.as_mut_ptr() as *mut _),
                Some(&mut size),
            )
            .ok()
            .ok()?;
        }
        let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
        Some(String::from_utf16_lossy(&buf[..len]))
    };
    let read_dword = |name: &str| -> Option<u32> {
        let mut value = 0u32;
        let mut size = 4u32;
        // SAFETY : un DWORD local, taille 4 octets.
        unsafe {
            RegGetValueW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(HSTRING::from(KEY).as_ptr()),
                PCWSTR(HSTRING::from(name).as_ptr()),
                RRF_RT_REG_DWORD,
                None,
                Some(&mut value as *mut u32 as *mut _),
                Some(&mut size),
            )
            .ok()
            .ok()?;
        }
        Some(value)
    };

    let build = read_string("CurrentBuild").unwrap_or_default();
    let ubr = read_dword("UBR")
        .map(|u| format!(".{u}"))
        .unwrap_or_default();
    // Le registre dit encore « Windows 10 » sur Windows 11 : on se fie au numéro de build.
    let name = match build.parse::<u32>() {
        Ok(b) if b >= 22000 => "Windows 11",
        Ok(_) => "Windows 10",
        Err(_) => "Windows",
    };
    let display = read_string("DisplayVersion")
        .map(|d| format!(" {d}"))
        .unwrap_or_default();
    format!("{name}{display} (build {build}{ubr})")
}

#[cfg(not(windows))]
fn windows_version() -> String {
    std::env::consts::OS.into()
}

/// Chemin du fichier de configuration (affiché dans les paramètres).
#[tauri::command]
pub fn config_location(state: State<'_, AppState>) -> String {
    state.config_path.to_string_lossy().into_owned()
}

/// Ouvre l'Explorateur sur le fichier de configuration.
#[tauri::command]
pub async fn reveal_config(state: State<'_, AppState>) -> Result<(), LaunchError> {
    let path = state.config_path.clone();
    let cmd = if path.exists() {
        launcher::ShellCommand {
            verb: "open",
            file: "explorer.exe".into(),
            params: format!("/select,\"{}\"", path.display()),
            dir: None,
        }
    } else {
        let dir = path.parent().map(Path::to_path_buf).unwrap_or_default();
        std::fs::create_dir_all(&dir).map_err(|e| LaunchError::Failed(e.to_string()))?;
        launcher::ShellCommand {
            verb: "open",
            file: dir.to_string_lossy().into_owned(),
            params: String::new(),
            dir: None,
        }
    };
    tauri::async_runtime::spawn_blocking(move || launcher::execute(&cmd))
        .await
        .map_err(|e| LaunchError::Failed(e.to_string()))?
}
