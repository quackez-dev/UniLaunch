mod commands;
mod config;
mod favicon;
mod icons;
mod launcher;
mod window;

use commands::AppState;
use tauri::Manager;

/// Dossier de la configuration : `%APPDATA%\UniLaunch`.
const CONFIG_DIR: &str = "UniLaunch";
const CONFIG_FILE: &str = "config.json";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // `UNILAUNCH_DATA_DIR` (développement et tests) : tout est rangé dans ce dossier,
            // sans toucher à la vraie configuration.
            let (config_path, icon_cache_dir) = match std::env::var_os("UNILAUNCH_DATA_DIR") {
                Some(dir) => {
                    let dir = std::path::PathBuf::from(dir);
                    (dir.join(CONFIG_FILE), dir.join("cache").join("icons"))
                }
                None => (
                    app.path().config_dir()?.join(CONFIG_DIR).join(CONFIG_FILE),
                    app.path().local_data_dir()?.join(CONFIG_DIR).join("icons"),
                ),
            };
            let state = AppState::load(config_path, icon_cache_dir);
            let scale = state
                .config
                .lock()
                .expect("config lock")
                .settings
                .window_scale;
            app.manage(state);

            if let Some(main) = app.get_webview_window("main") {
                window::fit_to_monitor(&main, scale)?;
                main.show()?;
                main.set_focus()?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::save_config,
            commands::take_startup_warning,
            commands::launch_tile,
            commands::reveal_tile,
            commands::tile_icon,
            commands::import_custom_icon,
            commands::missing_tiles,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
