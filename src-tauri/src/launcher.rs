//! Lancement des tuiles : applications, dossiers et sites web.
//!
//! [`plan`] décide quoi exécuter (fonction pure, testée sans Windows) ;
//! [`execute`] fait l'appel à `ShellExecuteExW`.

use crate::config::{SectionKind, Tile};
use serde::Serialize;
use std::path::Path;

/// Commande à passer au shell Windows.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShellCommand {
    /// `open`, `runas` (administrateur)…
    pub verb: &'static str,
    pub file: String,
    pub params: String,
    pub dir: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, thiserror::Error)]
#[serde(tag = "kind", content = "detail", rename_all = "camelCase")]
pub enum LaunchError {
    #[error("introuvable : {0}")]
    NotFound(String),
    #[error("adresse web invalide : {0}")]
    InvalidUrl(String),
    #[error("cible vide")]
    EmptyTarget,
    #[error("lancement annulé")]
    Cancelled,
    #[error("échec du lancement : {0}")]
    Failed(String),
}

/// État d'un chemin sur le disque (injectable pour les tests).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathState {
    File,
    Dir,
    Missing,
}

pub fn disk_state(path: &Path) -> PathState {
    match std::fs::metadata(path) {
        Ok(m) if m.is_dir() => PathState::Dir,
        Ok(_) => PathState::File,
        Err(_) => PathState::Missing,
    }
}

/// Vrai pour une cible `shell:` (ex. `shell:AppsFolder\<AUMID>` pour les apps du Microsoft Store).
pub fn is_shell_target(target: &str) -> bool {
    target.len() > 6
        && target
            .get(..6)
            .is_some_and(|p| p.eq_ignore_ascii_case("shell:"))
}

/// Vrai pour une adresse web `http://` ou `https://`.
pub fn is_web_url(target: &str) -> bool {
    let lower = target.trim().to_ascii_lowercase();
    let rest = lower
        .strip_prefix("https://")
        .or_else(|| lower.strip_prefix("http://"));
    matches!(rest, Some(host) if !host.is_empty() && !host.starts_with('/'))
}

/// Décide comment lancer une tuile.
pub fn plan(
    kind: SectionKind,
    tile: &Tile,
    force_admin: bool,
    state: impl Fn(&Path) -> PathState,
) -> Result<ShellCommand, LaunchError> {
    let target = tile.target.trim();
    if target.is_empty() {
        return Err(LaunchError::EmptyTarget);
    }

    match kind {
        SectionKind::Websites => {
            if !is_web_url(target) {
                return Err(LaunchError::InvalidUrl(target.into()));
            }
            Ok(ShellCommand {
                verb: "open",
                file: target.into(),
                params: String::new(),
                dir: None,
            })
        }
        SectionKind::Folders => match state(Path::new(target)) {
            PathState::Dir => Ok(ShellCommand {
                verb: "open",
                file: target.into(),
                params: String::new(),
                dir: None,
            }),
            _ => Err(LaunchError::NotFound(target.into())),
        },
        SectionKind::Apps => {
            if is_shell_target(target) {
                // Les apps du Store se lancent via l'Explorateur ; l'élévation ne s'applique pas.
                return Ok(ShellCommand {
                    verb: "open",
                    file: "explorer.exe".into(),
                    params: target.into(),
                    dir: None,
                });
            }
            let path = Path::new(target);
            if state(path) != PathState::File {
                return Err(LaunchError::NotFound(target.into()));
            }
            let dir = if tile.working_dir.trim().is_empty() {
                path.parent()
                    .map(|p| p.to_string_lossy().into_owned())
                    .filter(|p| !p.is_empty())
            } else {
                Some(tile.working_dir.trim().to_string())
            };
            Ok(ShellCommand {
                verb: if force_admin || tile.run_as_admin {
                    "runas"
                } else {
                    "open"
                },
                file: target.into(),
                params: tile.args.trim().into(),
                dir,
            })
        }
    }
}

/// Exécute la commande avec `ShellExecuteExW`.
#[cfg(windows)]
pub fn execute(cmd: &ShellCommand) -> Result<(), LaunchError> {
    use windows::Win32::Foundation::ERROR_CANCELLED;
    use windows::Win32::System::Com::{
        COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE, CoInitializeEx,
    };
    use windows::Win32::UI::Shell::{
        SEE_MASK_FLAG_NO_UI, SEE_MASK_NOASYNC, SHELLEXECUTEINFOW, ShellExecuteExW,
    };
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    use windows::core::{HSTRING, PCWSTR};

    // ShellExecuteEx peut passer par des extensions COM : le fil doit être initialisé.
    // SAFETY : appel sans pointeur ; un fil déjà initialisé renvoie S_FALSE, sans effet.
    let _ = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE) };

    let verb = HSTRING::from(cmd.verb);
    let file = HSTRING::from(cmd.file.as_str());
    let params = HSTRING::from(cmd.params.as_str());
    let dir = cmd.dir.as_deref().map(HSTRING::from);

    let mut info = SHELLEXECUTEINFOW {
        cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
        fMask: SEE_MASK_NOASYNC | SEE_MASK_FLAG_NO_UI,
        lpVerb: PCWSTR(verb.as_ptr()),
        lpFile: PCWSTR(file.as_ptr()),
        lpParameters: if cmd.params.is_empty() {
            PCWSTR::null()
        } else {
            PCWSTR(params.as_ptr())
        },
        lpDirectory: dir.as_ref().map_or(PCWSTR::null(), |d| PCWSTR(d.as_ptr())),
        nShow: SW_SHOWNORMAL.0,
        ..Default::default()
    };

    // SAFETY : `info` et les chaînes HSTRING qu'il référence vivent jusqu'à la fin de l'appel.
    match unsafe { ShellExecuteExW(&mut info) } {
        Ok(()) => Ok(()),
        Err(e) if e.code() == ERROR_CANCELLED.to_hresult() => Err(LaunchError::Cancelled),
        Err(e) => Err(LaunchError::Failed(e.message().to_string())),
    }
}

#[cfg(not(windows))]
pub fn execute(_cmd: &ShellCommand) -> Result<(), LaunchError> {
    Err(LaunchError::Failed(
        "UniLaunch ne fonctionne que sous Windows".into(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tile(target: &str) -> Tile {
        Tile {
            id: "t".into(),
            name: "Test".into(),
            target: target.into(),
            ..Tile::default()
        }
    }

    fn files(_: &Path) -> PathState {
        PathState::File
    }
    fn dirs(_: &Path) -> PathState {
        PathState::Dir
    }
    fn missing(_: &Path) -> PathState {
        PathState::Missing
    }

    #[test]
    fn website_opens_in_default_browser() {
        let cmd = plan(
            SectionKind::Websites,
            &tile("https://github.com"),
            false,
            missing,
        )
        .unwrap();
        assert_eq!(cmd.verb, "open");
        assert_eq!(cmd.file, "https://github.com");
    }

    #[test]
    fn website_rejects_non_web_targets() {
        for bad in [
            "C:\\Windows\\System32\\cmd.exe",
            "file:///C:/x",
            "javascript:alert(1)",
            "https://",
            "ftp://x",
        ] {
            assert!(
                matches!(
                    plan(SectionKind::Websites, &tile(bad), false, files),
                    Err(LaunchError::InvalidUrl(_))
                ),
                "{bad} devrait être refusé"
            );
        }
    }

    #[test]
    fn folder_must_exist() {
        let t = tile(r"D:\Projets\Projet 1");
        assert_eq!(
            plan(SectionKind::Folders, &t, false, dirs).unwrap().file,
            r"D:\Projets\Projet 1"
        );
        assert_eq!(
            plan(SectionKind::Folders, &t, false, missing),
            Err(LaunchError::NotFound(r"D:\Projets\Projet 1".into()))
        );
        // Un fichier n'est pas un dossier.
        assert!(plan(SectionKind::Folders, &t, false, files).is_err());
    }

    #[test]
    fn app_uses_args_and_defaults_to_its_folder() {
        let mut t = tile(r"C:\Apps\Code\Code.exe");
        t.args = "  --new-window ".into();
        let cmd = plan(SectionKind::Apps, &t, false, files).unwrap();
        assert_eq!(cmd.verb, "open");
        assert_eq!(cmd.params, "--new-window");
        assert_eq!(cmd.dir.as_deref(), Some(r"C:\Apps\Code"));
    }

    #[test]
    fn app_working_dir_overrides_default() {
        let mut t = tile(r"C:\Apps\tool.exe");
        t.working_dir = r"D:\Work".into();
        assert_eq!(
            plan(SectionKind::Apps, &t, false, files)
                .unwrap()
                .dir
                .as_deref(),
            Some(r"D:\Work")
        );
    }

    #[test]
    fn admin_uses_runas() {
        let mut t = tile(r"C:\Apps\tool.exe");
        assert_eq!(
            plan(SectionKind::Apps, &t, true, files).unwrap().verb,
            "runas"
        );
        t.run_as_admin = true;
        assert_eq!(
            plan(SectionKind::Apps, &t, false, files).unwrap().verb,
            "runas"
        );
    }

    #[test]
    fn store_app_goes_through_explorer() {
        let t = tile(r"shell:AppsFolder\Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");
        let cmd = plan(SectionKind::Apps, &t, true, missing).unwrap();
        assert_eq!(cmd.file, "explorer.exe");
        assert_eq!(cmd.params, t.target);
        assert_eq!(cmd.verb, "open");
    }

    #[test]
    fn missing_app_is_reported() {
        assert!(matches!(
            plan(SectionKind::Apps, &tile(r"C:\nope.exe"), false, missing),
            Err(LaunchError::NotFound(_))
        ));
        assert_eq!(
            plan(SectionKind::Apps, &tile("   "), false, files),
            Err(LaunchError::EmptyTarget)
        );
    }

    #[test]
    fn url_detection() {
        assert!(is_web_url("https://example.com/path"));
        assert!(is_web_url("HTTP://Example.com"));
        assert!(!is_web_url("https:///x"));
        assert!(!is_web_url("example.com"));
        assert!(is_shell_target("shell:AppsFolder\\X"));
        assert!(!is_shell_target("shell:"));
        assert!(!is_shell_target("C:\\Usé\\app.exe"));
    }
}
