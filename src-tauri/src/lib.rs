mod commands;
mod config;
mod favicon;
mod icons;
mod integration;
mod launcher;
mod quickadd;
mod transfer;
mod window;

use commands::AppState;
use config::WindowMode;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

/// Dossier de la configuration : `%APPDATA%\UniLaunch`.
const CONFIG_DIR: &str = "UniLaunch";
const CONFIG_FILE: &str = "config.json";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // En premier : un second lancement ramène la fenêtre existante.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            integration::show_main(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![integration::AUTOSTART_ARG]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| integration::on_shortcut(app, event.state()))
                .build(),
        )
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
            let settings = state.config.lock().expect("config lock").settings.clone();
            app.manage(state);

            let handle = app.handle();
            integration::build_tray(handle, settings.language)?;
            let warnings = integration::apply_settings(handle, None, &settings);
            if !warnings.is_empty() {
                let state = app.state::<AppState>();
                let mut slot = state.startup_warning.lock().expect("warning lock");
                let mut all: Vec<String> = slot.take().into_iter().collect();
                all.extend(warnings);
                *slot = Some(all.join("\n"));
            }

            // Lancé avec Windows en mode barre système : on reste discret.
            let autostarted = std::env::args().any(|a| a == integration::AUTOSTART_ARG);
            if let Some(main) = app.get_webview_window("main") {
                window::fit_to_monitor(&main, settings.window_scale)?;
                if !(autostarted && settings.window_mode == WindowMode::Tray) {
                    main.show()?;
                    main.set_focus()?;
                }
            }
            Ok(())
        })
        .on_window_event(integration::on_window_event)
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::save_config,
            commands::take_startup_warning,
            commands::launch_tile,
            commands::reveal_tile,
            commands::tile_icon,
            commands::import_custom_icon,
            commands::missing_tiles,
            commands::classify_paths,
            commands::installed_apps,
            commands::set_editing,
            commands::after_launch,
            commands::hide_window,
            commands::export_config,
            commands::import_config,
            commands::version_info,
            commands::config_location,
            commands::reveal_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
