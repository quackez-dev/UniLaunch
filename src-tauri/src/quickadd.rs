//! Ajout rapide : reconnaissance des fichiers déposés et liste des applications installées.

use crate::config::SectionKind;
use crate::launcher::{PathState, is_web_url};
use serde::Serialize;
use std::path::Path;

/// Extensions lancées comme des applications.
const APP_EXTENSIONS: &[&str] = &["exe", "lnk", "bat", "cmd", "msc", "appref-ms", "com"];

/// Résultat de l'analyse d'un chemin déposé ou collé.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dropped {
    /// Colonne où ranger la tuile ; `None` si le fichier n'est pas pris en charge.
    pub section: Option<SectionKind>,
    pub name: String,
    pub target: String,
    pub source: String,
}

/// Lit l'adresse d'un raccourci Internet (`.url`, format INI : `URL=https://…`).
pub fn parse_url_file(text: &str) -> Option<String> {
    text.lines()
        .map(str::trim)
        .find_map(|line| {
            let (key, value) = line.split_once('=')?;
            key.trim()
                .eq_ignore_ascii_case("url")
                .then(|| value.trim().to_string())
        })
        .filter(|url| is_web_url(url))
}

fn stem(path: &Path) -> String {
    path.file_stem()
        .or_else(|| path.file_name())
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned())
}

/// Range un chemin dans la bonne colonne.
pub fn classify(
    raw: &str,
    state: impl Fn(&Path) -> PathState,
    read: impl Fn(&Path) -> Option<String>,
) -> Dropped {
    let source = raw.trim().trim_matches('"').to_string();
    let path = Path::new(&source);
    let unsupported = |name: String| Dropped {
        section: None,
        name,
        target: source.clone(),
        source: source.clone(),
    };

    if is_web_url(&source) {
        return Dropped {
            section: Some(SectionKind::Websites),
            name: String::new(),
            target: source.clone(),
            source: source.clone(),
        };
    }

    match state(path) {
        PathState::Dir => {
            // Un lecteur (« D:\ ») n'a pas de nom de fichier : on garde le chemin.
            let name = path
                .file_name()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_else(|| source.trim_end_matches('\\').to_string());
            Dropped {
                section: Some(SectionKind::Folders),
                name,
                target: source.clone(),
                source: source.clone(),
            }
        }
        PathState::File => {
            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_ascii_lowercase())
                .unwrap_or_default();
            if ext == "url" {
                return match read(path).as_deref().and_then(parse_url_file) {
                    Some(url) => Dropped {
                        section: Some(SectionKind::Websites),
                        name: stem(path),
                        target: url,
                        source: source.clone(),
                    },
                    None => unsupported(stem(path)),
                };
            }
            if APP_EXTENSIONS.contains(&ext.as_str()) {
                return Dropped {
                    section: Some(SectionKind::Apps),
                    name: stem(path),
                    target: source.clone(),
                    source: source.clone(),
                };
            }
            unsupported(stem(path))
        }
        PathState::Missing => unsupported(stem(path)),
    }
}

/// Une application du menu Démarrer ou du Microsoft Store.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub name: String,
    /// Chemin de l'exécutable si on le connaît, sinon `shell:AppsFolder\<identifiant>`.
    pub target: String,
    /// `desktop` ou `store`.
    pub source: &'static str,
}

/// Transforme le nom d'analyse d'un élément d'AppsFolder en cible lançable.
/// `{GUID}\reste` est résolu avec `known_folder(GUID)` ; un identifiant d'app du Store
/// (`Paquet_hash!App`) reste une cible `shell:AppsFolder`.
pub fn app_target(
    parsing: &str,
    known_folder: impl Fn(&str) -> Option<String>,
    exists: impl Fn(&Path) -> bool,
) -> (String, &'static str) {
    let shell = format!(r"shell:AppsFolder\{parsing}");
    let is_store = parsing.contains('!') && !parsing.contains('\\');
    if is_store {
        return (shell, "store");
    }
    let resolved = if let Some(rest) = parsing.strip_prefix('{') {
        rest.split_once("}\\").and_then(|(guid, tail)| {
            known_folder(&format!("{{{guid}}}")).map(|base| format!(r"{base}\{tail}"))
        })
    } else if parsing.len() > 2 && parsing.as_bytes()[1] == b':' {
        Some(parsing.to_string())
    } else {
        None
    };
    match resolved {
        Some(path) if exists(Path::new(&path)) => (path, "desktop"),
        _ => (shell, "desktop"),
    }
}

/// Énumère les applications installées (dossier virtuel « Applications » de Windows).
#[cfg(windows)]
pub fn installed_apps() -> Result<Vec<InstalledApp>, String> {
    use windows::Win32::System::Com::{COINIT_APARTMENTTHREADED, CoInitializeEx, CoTaskMemFree};
    use windows::Win32::UI::Shell::{
        BHID_EnumItems, FOLDERID_AppsFolder, IEnumShellItems, IShellItem, KF_FLAG_DEFAULT,
        SHGetKnownFolderItem, SHGetKnownFolderPath, SIGDN_DESKTOPABSOLUTEPARSING,
        SIGDN_NORMALDISPLAY,
    };
    use windows::core::GUID;

    fn known_folder(guid: &str) -> Option<String> {
        let id = GUID::try_from(guid.trim_matches(|c| c == '{' || c == '}')).ok()?;
        // SAFETY : le pointeur renvoyé est libéré avec CoTaskMemFree après copie.
        unsafe {
            let p = SHGetKnownFolderPath(&id, KF_FLAG_DEFAULT, None).ok()?;
            let s = p.to_string().ok();
            CoTaskMemFree(Some(p.0 as *const _));
            s
        }
    }

    // SAFETY : appels COM classiques ; les chaînes renvoyées par GetDisplayName sont
    // copiées puis libérées avec CoTaskMemFree.
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let folder: IShellItem = SHGetKnownFolderItem(&FOLDERID_AppsFolder, KF_FLAG_DEFAULT, None)
            .map_err(|e| e.message().to_string())?;
        let items: IEnumShellItems = folder
            .BindToHandler(None, &BHID_EnumItems)
            .map_err(|e| e.message().to_string())?;

        let name_of = |item: &IShellItem, kind| -> Option<String> {
            let p = item.GetDisplayName(kind).ok()?;
            let s = p.to_string().ok();
            CoTaskMemFree(Some(p.0 as *const _));
            s
        };

        let mut apps = Vec::new();
        loop {
            let mut fetched = [None];
            if items.Next(&mut fetched, None).is_err() {
                break;
            }
            let Some(item) = fetched[0].take() else {
                break;
            };
            let (Some(name), Some(parsing)) = (
                name_of(&item, SIGDN_NORMALDISPLAY),
                name_of(&item, SIGDN_DESKTOPABSOLUTEPARSING),
            ) else {
                continue;
            };
            // Les URL et documents épinglés au menu Démarrer ne sont pas des applications.
            if parsing.starts_with("http") || parsing.trim().is_empty() {
                continue;
            }
            let (target, source) = app_target(&parsing, known_folder, |p| p.is_file());
            apps.push(InstalledApp {
                name,
                target,
                source,
            });
        }
        apps.sort_by_key(|a| a.name.to_lowercase());
        apps.dedup_by(|a, b| a.name == b.name && a.target == b.target);
        Ok(apps)
    }
}

#[cfg(not(windows))]
pub fn installed_apps() -> Result<Vec<InstalledApp>, String> {
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fs(state: PathState) -> impl Fn(&Path) -> PathState {
        move |_| state
    }
    fn no_read(_: &Path) -> Option<String> {
        None
    }

    #[test]
    fn folders_and_drives() {
        let d = classify(r"D:\Projets\Projet 1", fs(PathState::Dir), no_read);
        assert_eq!(d.section, Some(SectionKind::Folders));
        assert_eq!(d.name, "Projet 1");
        let drive = classify(r"D:\", fs(PathState::Dir), no_read);
        assert_eq!(drive.name, "D:");
    }

    #[test]
    fn apps_and_shortcuts() {
        let exe = classify(r"C:\Apps\Code.exe", fs(PathState::File), no_read);
        assert_eq!(exe.section, Some(SectionKind::Apps));
        assert_eq!(exe.name, "Code");
        let lnk = classify(
            r#""C:\Users\Moi\Desktop\Visual Studio Code.lnk""#,
            fs(PathState::File),
            no_read,
        );
        assert_eq!(lnk.section, Some(SectionKind::Apps));
        assert_eq!(lnk.name, "Visual Studio Code");
        assert_eq!(lnk.target, r"C:\Users\Moi\Desktop\Visual Studio Code.lnk");
    }

    #[test]
    fn internet_shortcuts_become_websites() {
        let read = |_: &Path| {
            Some("[InternetShortcut]\r\nURL=https://github.com/\r\nIconIndex=0".to_string())
        };
        let d = classify(
            r"C:\Users\Moi\Desktop\GitHub.url",
            fs(PathState::File),
            read,
        );
        assert_eq!(d.section, Some(SectionKind::Websites));
        assert_eq!(d.name, "GitHub");
        assert_eq!(d.target, "https://github.com/");

        let bad = |_: &Path| Some("[InternetShortcut]\nURL=file:///C:/x".to_string());
        assert_eq!(
            classify(r"C:\x.url", fs(PathState::File), bad).section,
            None
        );
    }

    #[test]
    fn urls_and_unsupported_files() {
        assert_eq!(
            classify("https://tauri.app", fs(PathState::Missing), no_read).section,
            Some(SectionKind::Websites)
        );
        assert_eq!(
            classify(r"C:\doc.pdf", fs(PathState::File), no_read).section,
            None
        );
        assert_eq!(
            classify(r"C:\absent.exe", fs(PathState::Missing), no_read).section,
            None
        );
    }

    #[test]
    fn apps_folder_targets() {
        let kf = |g: &str| {
            (g == "{6D809377-6AF0-444B-8957-A3773F02200E}").then(|| r"C:\Program Files".to_string())
        };
        assert_eq!(
            app_target("Microsoft.WindowsCalculator_8wekyb3d8bbwe!App", kf, |_| {
                true
            }),
            (
                r"shell:AppsFolder\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App".to_string(),
                "store"
            )
        );
        assert_eq!(
            app_target(
                r"{6D809377-6AF0-444B-8957-A3773F02200E}\Blender\blender.exe",
                kf,
                |_| true
            ),
            (
                r"C:\Program Files\Blender\blender.exe".to_string(),
                "desktop"
            )
        );
        // Chemin introuvable : on garde la cible AppsFolder, qui reste lançable.
        assert_eq!(
            app_target(
                r"{6D809377-6AF0-444B-8957-A3773F02200E}\Gone\x.exe",
                kf,
                |_| false
            )
            .0,
            r"shell:AppsFolder\{6D809377-6AF0-444B-8957-A3773F02200E}\Gone\x.exe"
        );
        assert_eq!(
            app_target(r"C:\Tools\tool.exe", kf, |_| true),
            (r"C:\Tools\tool.exe".to_string(), "desktop")
        );
        assert_eq!(
            app_target("Chrome", kf, |_| true).0,
            r"shell:AppsFolder\Chrome"
        );
    }

    #[cfg(windows)]
    #[test]
    fn lists_real_installed_apps() {
        let apps = installed_apps().expect("énumération d'AppsFolder");
        assert!(!apps.is_empty());
        assert!(
            apps.iter()
                .all(|a| !a.name.is_empty() && !a.target.is_empty())
        );
    }
}
