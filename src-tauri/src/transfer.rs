//! Import et export de la configuration, avec les icônes personnalisées embarquées.

use crate::config::{self, Config, IconSpec};
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

const FORMAT: &str = "unilaunch-export";
const FORMAT_VERSION: u32 = 1;

/// Fichier d'export : la configuration et le contenu des icônes personnalisées.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFile {
    pub format: String,
    pub format_version: u32,
    pub config: serde_json::Value,
    /// Nom de fichier de l'icône → contenu en base64.
    #[serde(default)]
    pub icons: BTreeMap<String, String>,
}

fn custom_icons(config: &Config) -> impl Iterator<Item = &String> {
    [
        &config.sections.apps,
        &config.sections.folders,
        &config.sections.websites,
    ]
    .into_iter()
    .flat_map(|s| s.groups.iter())
    .flat_map(|g| g.tiles.iter())
    .filter_map(|t| match &t.icon {
        IconSpec::Custom { path } => Some(path),
        _ => None,
    })
}

fn file_name(path: &str) -> Option<String> {
    Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
}

/// Construit le contenu d'un export.
pub fn build_export(config: &Config) -> Result<String, String> {
    let b64 = base64::engine::general_purpose::STANDARD;
    let mut icons = BTreeMap::new();
    for path in custom_icons(config) {
        if let (Some(name), Ok(bytes)) = (file_name(path), fs::read(path)) {
            icons.insert(name, b64.encode(bytes));
        }
    }
    let file = ExportFile {
        format: FORMAT.into(),
        format_version: FORMAT_VERSION,
        config: serde_json::to_value(config).map_err(|e| e.to_string())?,
        icons,
    };
    serde_json::to_string_pretty(&file).map_err(|e| e.to_string())
}

/// Lit un export (ou un `config.json` brut) et réécrit les icônes dans `icon_dir`.
pub fn read_import(text: &str, icon_dir: &Path) -> Result<Config, String> {
    let value: serde_json::Value =
        serde_json::from_str(text.strip_prefix('\u{feff}').unwrap_or(text))
            .map_err(|e| format!("fichier illisible : {e}"))?;

    // Un export UniLaunch, ou directement un fichier de configuration.
    let (config_value, icons) = if value.get("format").and_then(|f| f.as_str()) == Some(FORMAT) {
        let file: ExportFile =
            serde_json::from_value(value).map_err(|e| format!("export invalide : {e}"))?;
        if file.format_version > FORMAT_VERSION {
            return Err(format!(
                "export d'une version plus récente d'UniLaunch (format {})",
                file.format_version
            ));
        }
        (file.config, file.icons)
    } else if value.get("sections").is_some() {
        (value, BTreeMap::new())
    } else {
        return Err("ce fichier n'est pas une configuration UniLaunch".into());
    };

    let mut config = config::parse(&config_value.to_string()).map_err(|e| e.to_string())?;

    let b64 = base64::engine::general_purpose::STANDARD;
    if !icons.is_empty() {
        fs::create_dir_all(icon_dir).map_err(|e| e.to_string())?;
    }
    for section in [
        &mut config.sections.apps,
        &mut config.sections.folders,
        &mut config.sections.websites,
    ] {
        for tile in section.groups.iter_mut().flat_map(|g| g.tiles.iter_mut()) {
            let IconSpec::Custom { path } = &tile.icon else {
                continue;
            };
            let restored = file_name(path)
                // Nom de fichier seulement : pas de chemin relatif qui sortirait du dossier.
                .filter(|n| !n.contains(['/', '\\']) && n != ".." && n != ".")
                .and_then(|name| {
                    let data = b64.decode(icons.get(&name)?).ok()?;
                    let dest = icon_dir.join(&name);
                    fs::write(&dest, data).ok()?;
                    Some(dest.to_string_lossy().into_owned())
                });
            tile.icon = match restored {
                Some(path) => IconSpec::Custom { path },
                // Icône absente de l'export : on revient à l'icône automatique.
                None if !Path::new(path).exists() => IconSpec::Auto,
                None => tile.icon.clone(),
            };
        }
    }
    Ok(config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{Group, Tile};

    fn config_with_icon(path: &str) -> Config {
        let mut c = Config::default();
        c.sections.apps.groups.push(Group {
            id: "g".into(),
            name: "G".into(),
            collapsed: false,
            tiles: vec![
                Tile {
                    id: "a".into(),
                    name: "A".into(),
                    target: r"C:\a.exe".into(),
                    icon: IconSpec::Custom { path: path.into() },
                    ..Tile::default()
                },
                Tile {
                    id: "b".into(),
                    name: "B".into(),
                    target: r"C:\b.exe".into(),
                    ..Tile::default()
                },
            ],
        });
        c
    }

    #[test]
    fn round_trip_with_embedded_icon() {
        let src = tempfile::tempdir().unwrap();
        let icon = src.path().join("custom-1.png");
        fs::write(&icon, [1u8, 2, 3]).unwrap();
        let original = config_with_icon(&icon.to_string_lossy());

        let text = build_export(&original).unwrap();
        assert!(text.contains("\"format\": \"unilaunch-export\""));

        let dest = tempfile::tempdir().unwrap();
        let imported = read_import(&text, dest.path()).unwrap();
        let tile = &imported.sections.apps.groups[0].tiles[0];
        let IconSpec::Custom { path } = &tile.icon else {
            panic!("icône personnalisée attendue")
        };
        assert!(path.starts_with(&*dest.path().to_string_lossy()));
        assert_eq!(fs::read(path).unwrap(), vec![1, 2, 3]);
        assert_eq!(imported.sections.apps.groups[0].tiles[1].name, "B");
    }

    #[test]
    fn plain_config_file_is_accepted() {
        let dest = tempfile::tempdir().unwrap();
        let text = serde_json::to_string(&Config::starter()).unwrap();
        assert_eq!(read_import(&text, dest.path()).unwrap(), Config::starter());
    }

    #[test]
    fn missing_icon_falls_back_to_auto() {
        let dest = tempfile::tempdir().unwrap();
        let mut file: serde_json::Value =
            serde_json::from_str(&build_export(&config_with_icon(r"Z:\gone\x.png")).unwrap())
                .unwrap();
        file["icons"] = serde_json::json!({});
        let imported = read_import(&file.to_string(), dest.path()).unwrap();
        assert_eq!(
            imported.sections.apps.groups[0].tiles[0].icon,
            IconSpec::Auto
        );
    }

    #[test]
    fn rejects_unrelated_or_newer_files() {
        let dest = tempfile::tempdir().unwrap();
        assert!(read_import("{\"hello\": 1}", dest.path()).is_err());
        assert!(read_import("pas du json", dest.path()).is_err());
        let newer = r#"{"format":"unilaunch-export","formatVersion":99,"config":{}}"#;
        assert!(
            read_import(newer, dest.path())
                .unwrap_err()
                .contains("plus récente")
        );
    }

    #[test]
    fn icon_names_cannot_escape_the_folder() {
        let dest = tempfile::tempdir().unwrap();
        let mut file: serde_json::Value =
            serde_json::from_str(&build_export(&config_with_icon(r"..\..\evil.png")).unwrap())
                .unwrap();
        file["icons"] = serde_json::json!({ "evil.png": "AQID" });
        let imported = read_import(&file.to_string(), dest.path()).unwrap();
        let IconSpec::Custom { path } = &imported.sections.apps.groups[0].tiles[0].icon else {
            panic!("icône personnalisée attendue")
        };
        // Le nom est réduit à « evil.png » et écrit dans le dossier prévu.
        assert_eq!(Path::new(path).parent().unwrap(), dest.path());
    }
}
