mod commands;
mod config;
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
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config_path = app.path().config_dir()?.join(CONFIG_DIR).join(CONFIG_FILE);
            let state = AppState::load(config_path);
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
