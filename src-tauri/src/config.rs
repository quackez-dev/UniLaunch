//! Configuration d'UniLaunch : modèle de données, lecture et écriture sur disque.
//!
//! Le fichier vit dans `%APPDATA%\UniLaunch\config.json`. L'écriture est atomique
//! (fichier temporaire puis renommage) et la version précédente est gardée en `.bak`.
//! Un fichier illisible est mis de côté (`.corrupt`) au lieu d'être écrasé en silence.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Version actuelle du schéma de configuration.
pub const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub schema_version: u32,
    pub settings: Settings,
    pub sections: Sections,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            schema_version: SCHEMA_VERSION,
            settings: Settings::default(),
            sections: Sections::default(),
        }
    }
}

impl Config {
    /// Configuration du premier lancement : des groupes vides, prêts à recevoir des tuiles.
    pub fn starter() -> Self {
        let group = |id: &str, name: &str| Group {
            id: id.into(),
            name: name.into(),
            ..Group::default()
        };
        let mut c = Self::default();
        c.sections.apps.groups = vec![
            group("apps-pro", "Professionnel"),
            group("apps-perso", "Personnel"),
        ];
        c.sections.folders.groups = vec![
            group("folders-projects", "Projets"),
            group("folders-other", "Autres"),
        ];
        c.sections.websites.groups = vec![
            group("web-work", "Travail"),
            group("web-perso", "Personnel"),
        ];
        c
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub language: Language,
    pub accent_color: String,
    pub tile_size: TileSize,
    pub show_labels: LabelMode,
    pub window_mode: WindowMode,
    pub window_scale: f64,
    pub column_widths: [f64; 3],
    pub hotkey: String,
    pub hide_after_launch: bool,
    pub hide_on_blur: bool,
    pub start_with_windows: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: Language::Fr,
            accent_color: "#6D4AFF".into(),
            tile_size: TileSize::M,
            show_labels: LabelMode::Always,
            window_mode: WindowMode::Tray,
            window_scale: 0.5,
            column_widths: [1.0, 1.0, 1.0],
            hotkey: "Ctrl+Alt+Space".into(),
            hide_after_launch: true,
            hide_on_blur: true,
            start_with_windows: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    #[default]
    Fr,
    En,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum TileSize {
    S,
    #[default]
    M,
    L,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum LabelMode {
    #[default]
    Always,
    Hover,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum WindowMode {
    Window,
    #[default]
    Tray,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Sections {
    pub apps: Section,
    pub folders: Section,
    pub websites: Section,
}

/// Les trois colonnes de l'interface.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SectionKind {
    Apps,
    Folders,
    Websites,
}

impl Sections {
    pub fn get(&self, kind: SectionKind) -> &Section {
        match kind {
            SectionKind::Apps => &self.apps,
            SectionKind::Folders => &self.folders,
            SectionKind::Websites => &self.websites,
        }
    }

    /// Cherche une tuile par identifiant dans une section.
    pub fn find_tile(&self, kind: SectionKind, tile_id: &str) -> Option<&Tile> {
        self.get(kind)
            .groups
            .iter()
            .flat_map(|g| g.tiles.iter())
            .find(|t| t.id == tile_id)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(default)]
pub struct Section {
    pub groups: Vec<Group>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub collapsed: bool,
    pub tiles: Vec<Tile>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Tile {
    pub id: String,
    pub name: String,
    /// Chemin, URL ou `shell:AppsFolder\<AUMID>`.
    pub target: String,
    pub icon: IconSpec,
    /// Applications seulement.
    pub args: String,
    /// Applications seulement.
    pub working_dir: String,
    /// Applications seulement.
    pub run_as_admin: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum IconSpec {
    #[default]
    Auto,
    Custom {
        path: String,
    },
    Monogram,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("erreur d'entrée/sortie : {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON invalide : {0}")]
    Json(#[from] serde_json::Error),
    #[error("version de configuration non prise en charge : {0} (max {SCHEMA_VERSION})")]
    UnsupportedVersion(u32),
}

/// Résultat d'un chargement : la configuration, et un avertissement éventuel pour l'utilisateur.
#[derive(Debug)]
pub struct Loaded {
    pub config: Config,
    pub warning: Option<String>,
}

/// Chemin de la copie de secours.
pub fn backup_path(path: &Path) -> PathBuf {
    with_suffix(path, "bak")
}

fn with_suffix(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.file_name().unwrap_or_default().to_os_string();
    name.push(".");
    name.push(suffix);
    path.with_file_name(name)
}

/// Lit et migre une configuration depuis du JSON.
/// Un BOM UTF-8 en tête (ajouté par certains éditeurs Windows) est accepté.
pub fn parse(text: &str) -> Result<Config, ConfigError> {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let value: Value = serde_json::from_str(text)?;
    let value = migrate(value)?;
    Ok(serde_json::from_value(value)?)
}

/// Fait passer un JSON d'une ancienne version du schéma à la version actuelle.
pub fn migrate(mut value: Value) -> Result<Value, ConfigError> {
    let version = value
        .get("schemaVersion")
        .and_then(Value::as_u64)
        .unwrap_or(1) as u32;
    if version > SCHEMA_VERSION {
        return Err(ConfigError::UnsupportedVersion(version));
    }
    // Aucune migration pour l'instant : la v1 est la première version.
    // Les futures étapes s'ajouteront ici : `if version < 2 { … }`.
    if let Some(obj) = value.as_object_mut() {
        obj.insert("schemaVersion".into(), Value::from(SCHEMA_VERSION));
    }
    Ok(value)
}

/// Charge la configuration. N'échoue jamais : en cas de problème, retombe sur la
/// copie de secours, puis sur la configuration par défaut, avec un avertissement.
pub fn load(path: &Path) -> Loaded {
    match fs::read_to_string(path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Loaded {
            config: Config::starter(),
            warning: None,
        },
        Err(e) => Loaded {
            config: Config::default(),
            warning: Some(format!("Impossible de lire la configuration : {e}")),
        },
        Ok(text) => match parse(&text) {
            Ok(config) => Loaded {
                config,
                warning: None,
            },
            Err(err) => {
                let corrupt = with_suffix(path, "corrupt");
                let _ = fs::rename(path, &corrupt);
                let backup = fs::read_to_string(backup_path(path))
                    .ok()
                    .and_then(|t| parse(&t).ok());
                let (config, source) = match backup {
                    Some(c) => (c, "la copie de secours a été restaurée"),
                    None => (Config::default(), "une configuration vide a été créée"),
                };
                Loaded {
                    config,
                    warning: Some(format!(
                        "Configuration illisible ({err}) ; {source}. Le fichier d'origine a été gardé : {}",
                        corrupt.display()
                    )),
                }
            }
        },
    }
}

/// Enregistre la configuration de façon atomique et garde la version précédente en `.bak`.
pub fn save(path: &Path, config: &Config) -> Result<(), ConfigError> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let json = serde_json::to_string_pretty(config)?;

    let tmp = with_suffix(path, "tmp");
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(json.as_bytes())?;
        f.sync_all()?;
    }
    if path.exists() {
        fs::copy(path, backup_path(path))?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Config {
        let mut c = Config::default();
        c.sections.apps.groups.push(Group {
            id: "g1".into(),
            name: "Professionnel".into(),
            collapsed: false,
            tiles: vec![Tile {
                id: "t1".into(),
                name: "VS Code".into(),
                target: r"C:\Program Files\Microsoft VS Code\Code.exe".into(),
                args: "--new-window".into(),
                run_as_admin: true,
                ..Tile::default()
            }],
        });
        c
    }

    #[test]
    fn json_uses_camel_case_and_round_trips() {
        let c = sample();
        let json = serde_json::to_string(&c).unwrap();
        assert!(json.contains("\"schemaVersion\":1"));
        assert!(json.contains("\"runAsAdmin\":true"));
        assert!(json.contains("\"icon\":{\"kind\":\"auto\"}"));
        assert!(json.contains("\"windowMode\":\"tray\""));
        assert_eq!(parse(&json).unwrap(), c);
    }

    #[test]
    fn missing_fields_take_defaults() {
        let c = parse(r#"{ "settings": { "tileSize": "L" } }"#).unwrap();
        assert_eq!(c.settings.tile_size, TileSize::L);
        assert_eq!(c.settings.accent_color, "#6D4AFF");
        assert_eq!(c.schema_version, SCHEMA_VERSION);
        assert!(c.sections.websites.groups.is_empty());
    }

    #[test]
    fn utf8_bom_is_accepted() {
        let c = parse("\u{feff}{ \"settings\": { \"tileSize\": \"S\" } }").unwrap();
        assert_eq!(c.settings.tile_size, TileSize::S);
    }

    #[test]
    fn newer_schema_is_rejected() {
        let err = parse(r#"{ "schemaVersion": 99 }"#).unwrap_err();
        assert!(matches!(err, ConfigError::UnsupportedVersion(99)));
    }

    #[test]
    fn find_tile_by_id() {
        let c = sample();
        assert_eq!(
            c.sections
                .find_tile(SectionKind::Apps, "t1")
                .map(|t| t.name.as_str()),
            Some("VS Code")
        );
        assert!(c.sections.find_tile(SectionKind::Folders, "t1").is_none());
    }

    #[test]
    fn first_run_gives_starter_groups_without_warning() {
        let dir = tempfile::tempdir().unwrap();
        let loaded = load(&dir.path().join("config.json"));
        assert_eq!(loaded.config, Config::starter());
        assert!(loaded.warning.is_none());
        for kind in [
            SectionKind::Apps,
            SectionKind::Folders,
            SectionKind::Websites,
        ] {
            let groups = &loaded.config.sections.get(kind).groups;
            assert!(!groups.is_empty());
            assert!(groups.iter().all(|g| g.tiles.is_empty()));
        }
    }

    #[test]
    fn save_then_load_and_keep_backup() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("sub").join("config.json");

        save(&path, &Config::default()).unwrap();
        assert!(!backup_path(&path).exists());

        let c = sample();
        save(&path, &c).unwrap();
        assert!(backup_path(&path).exists());
        assert!(!with_suffix(&path, "tmp").exists());

        let loaded = load(&path);
        assert_eq!(loaded.config, c);
        assert!(loaded.warning.is_none());
        // La copie de secours contient la version précédente.
        let bak = parse(&fs::read_to_string(backup_path(&path)).unwrap()).unwrap();
        assert_eq!(bak, Config::default());
    }

    #[test]
    fn corrupt_file_falls_back_to_backup_and_is_kept() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        let c = sample();
        save(&path, &c).unwrap();
        save(&path, &c).unwrap(); // crée le .bak
        fs::write(&path, "{ pas du json").unwrap();

        let loaded = load(&path);
        assert_eq!(loaded.config, c);
        assert!(loaded.warning.unwrap().contains("copie de secours"));
        assert!(with_suffix(&path, "corrupt").exists());
    }

    #[test]
    fn corrupt_file_without_backup_gives_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.json");
        fs::write(&path, "\"pas une configuration\"").unwrap();

        let loaded = load(&path);
        assert_eq!(loaded.config, Config::default());
        assert!(loaded.warning.is_some());
    }
}
