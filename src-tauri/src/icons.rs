//! Icônes des tuiles : extraction depuis Windows, favicons, images personnalisées et cache disque.
//!
//! Les icônes sont renvoyées à l'interface sous forme d'URL `data:` (PNG ou SVG).
//! Le cache vit dans `%LOCALAPPDATA%\UniLaunch\icons`. Un échec est mémorisé
//! (fichier `.none`) pour ne pas refaire une requête réseau à chaque affichage.

use crate::config::{IconSpec, SectionKind, Tile};
use crate::launcher::is_shell_target;
use base64::Engine;
use image::DynamicImage;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

/// Côté du PNG mis en cache, en pixels (les tuiles affichent 26 à 44 px logiques).
pub const ICON_SIZE: u32 = 96;

/// Délai avant de réessayer un favicon introuvable.
const RETRY_AFTER: Duration = Duration::from_secs(7 * 24 * 3600);

/// Hachage FNV-1a 64 bits : stable d'une version de Rust à l'autre (clé de cache).
pub fn cache_key(parts: &[&str]) -> String {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for part in parts {
        for b in part.bytes().chain(std::iter::once(0)) {
            h ^= u64::from(b);
            h = h.wrapping_mul(0x0100_0000_01b3);
        }
    }
    format!("{h:016x}")
}

/// Réduit l'image à `ICON_SIZE` au plus et l'encode en PNG.
pub fn to_png(img: &DynamicImage) -> Option<Vec<u8>> {
    let img = if img.width() > ICON_SIZE || img.height() > ICON_SIZE {
        img.resize(ICON_SIZE, ICON_SIZE, image::imageops::FilterType::Lanczos3)
    } else {
        img.clone()
    };
    let mut out = Vec::new();
    img.write_to(&mut Cursor::new(&mut out), image::ImageFormat::Png)
        .ok()?;
    Some(out)
}

pub fn data_url(mime: &str, bytes: &[u8]) -> String {
    format!(
        "data:{mime};base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )
}

/// Icône d'une tuile, ou `None` si l'interface doit dessiner elle-même
/// (dossier aux couleurs du groupe, monogramme).
pub fn resolve(cache_dir: &Path, kind: SectionKind, tile: &Tile) -> Option<String> {
    match &tile.icon {
        IconSpec::Monogram => None,
        IconSpec::Custom { path } => load_custom(Path::new(path)),
        IconSpec::Auto => match kind {
            SectionKind::Folders => None,
            SectionKind::Apps => {
                let target = tile.target.trim();
                let stamp = modified_secs(Path::new(target)).to_string();
                let key = cache_key(&["app", target, &stamp]);
                cached(cache_dir, &key, || shell_icon(target, ICON_SIZE))
            }
            SectionKind::Websites => {
                let url = url::Url::parse(tile.target.trim()).ok()?;
                let origin = url.origin().ascii_serialization();
                let key = cache_key(&["web", &origin]);
                cached(cache_dir, &key, || crate::favicon::fetch(&origin))
            }
        },
    }
}

/// Image personnalisée choisie par l'utilisateur (PNG, ICO, JPEG, SVG…).
pub fn load_custom(path: &Path) -> Option<String> {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if ext == "svg" {
        let bytes = fs::read(path).ok()?;
        return Some(data_url("image/svg+xml", &bytes));
    }
    let img = image::open(path).ok()?;
    Some(data_url("image/png", &to_png(&img)?))
}

fn modified_secs(path: &Path) -> u64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map_or(0, |d| d.as_secs())
}

fn cached(dir: &Path, key: &str, produce: impl FnOnce() -> Option<DynamicImage>) -> Option<String> {
    let png_path = dir.join(format!("{key}.png"));
    let none_path = dir.join(format!("{key}.none"));

    if let Ok(bytes) = fs::read(&png_path) {
        return Some(data_url("image/png", &bytes));
    }
    let recent_failure = fs::metadata(&none_path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.elapsed().ok())
        .is_some_and(|age| age < RETRY_AFTER);
    if recent_failure {
        return None;
    }

    let _ = fs::create_dir_all(dir);
    match produce().and_then(|img| to_png(&img)) {
        Some(bytes) => {
            let _ = fs::write(&png_path, &bytes);
            let _ = fs::remove_file(&none_path);
            Some(data_url("image/png", &bytes))
        }
        None => {
            let _ = fs::write(&none_path, b"");
            None
        }
    }
}

/// Copie une image choisie par l'utilisateur dans le dossier des icônes personnalisées.
/// Renvoie le chemin de la copie, à enregistrer dans la configuration.
pub fn import_custom(custom_dir: &Path, source: &Path) -> Result<PathBuf, String> {
    let ext = source
        .extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if !matches!(
        ext.as_str(),
        "png" | "ico" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "svg"
    ) {
        return Err(format!("format d'image non pris en charge : .{ext}"));
    }
    let bytes = fs::read(source).map_err(|e| e.to_string())?;
    if ext != "svg" {
        image::load_from_memory(&bytes).map_err(|e| format!("image illisible : {e}"))?;
    }
    fs::create_dir_all(custom_dir).map_err(|e| e.to_string())?;
    let name = format!(
        "custom-{}.{ext}",
        cache_key(&[&base64::engine::general_purpose::STANDARD.encode(&bytes)])
    );
    let dest = custom_dir.join(name);
    fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
    Ok(dest)
}

/// Icône Windows d'un fichier, d'un raccourci ou d'une app du Store (`shell:AppsFolder\…`).
#[cfg(windows)]
pub fn shell_icon(target: &str, size: u32) -> Option<DynamicImage> {
    use windows::Win32::Foundation::SIZE;
    use windows::Win32::Graphics::Gdi::{
        BI_RGB, BITMAP, BITMAPINFO, BITMAPINFOHEADER, CreateCompatibleDC, DIB_RGB_COLORS, DeleteDC,
        DeleteObject, GetDIBits, GetObjectW, HGDIOBJ,
    };
    use windows::Win32::System::Com::{COINIT_APARTMENTTHREADED, CoInitializeEx};
    use windows::Win32::UI::Shell::{
        IShellItemImageFactory, SHCreateItemFromParsingName, SIIGBF_BIGGERSIZEOK, SIIGBF_ICONONLY,
    };
    use windows::core::HSTRING;

    if target.is_empty() || (!is_shell_target(target) && !Path::new(target).exists()) {
        return None;
    }

    // SAFETY : appels COM/GDI classiques ; chaque objet créé est libéré avant de sortir,
    // et le tampon passé à GetDIBits a exactement la taille demandée (largeur × hauteur × 4).
    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let factory: IShellItemImageFactory =
            SHCreateItemFromParsingName(&HSTRING::from(target), None).ok()?;
        let side = size as i32;
        let hbmp = factory
            .GetImage(
                SIZE { cx: side, cy: side },
                SIIGBF_ICONONLY | SIIGBF_BIGGERSIZEOK,
            )
            .ok()?;
        let obj: HGDIOBJ = hbmp.into();

        let mut bm = BITMAP::default();
        let got = GetObjectW(
            obj,
            std::mem::size_of::<BITMAP>() as i32,
            Some(&mut bm as *mut BITMAP as *mut _),
        );
        if got == 0 || bm.bmWidth <= 0 || bm.bmHeight <= 0 {
            let _ = DeleteObject(obj);
            return None;
        }
        let (w, h) = (bm.bmWidth as u32, bm.bmHeight as u32);

        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: w as i32,
                biHeight: -(h as i32), // de haut en bas
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                ..Default::default()
            },
            ..Default::default()
        };
        let mut buf = vec![0u8; (w * h * 4) as usize];
        let hdc = CreateCompatibleDC(None);
        let lines = GetDIBits(
            hdc,
            hbmp,
            0,
            h,
            Some(buf.as_mut_ptr() as *mut _),
            &mut info,
            DIB_RGB_COLORS,
        );
        let _ = DeleteDC(hdc);
        let _ = DeleteObject(obj);
        if lines == 0 {
            return None;
        }

        bgra_premultiplied_to_rgba(&mut buf);
        image::RgbaImage::from_raw(w, h, buf).map(DynamicImage::ImageRgba8)
    }
}

#[cfg(not(windows))]
pub fn shell_icon(_target: &str, _size: u32) -> Option<DynamicImage> {
    None
}

/// Convertit des pixels BGRA à alpha prémultiplié (format GDI) en RGBA classique.
/// Une image sans aucune transparence (alpha toujours 0) est considérée opaque.
pub fn bgra_premultiplied_to_rgba(buf: &mut [u8]) {
    let has_alpha = buf.chunks_exact(4).any(|p| p[3] != 0);
    for p in buf.chunks_exact_mut(4) {
        p.swap(0, 2);
        if !has_alpha {
            p[3] = 255;
            continue;
        }
        let a = u32::from(p[3]);
        if a > 0 && a < 255 {
            for c in &mut p[..3] {
                *c = ((u32::from(*c) * 255 + a / 2) / a).min(255) as u8;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_key_is_stable_and_separates_parts() {
        assert_eq!(cache_key(&["app", "x"]), cache_key(&["app", "x"]));
        assert_ne!(cache_key(&["ab", "c"]), cache_key(&["a", "bc"]));
        assert_eq!(cache_key(&[""]).len(), 16);
    }

    #[test]
    fn pixel_conversion() {
        // Bleu opaque, puis rouge semi-transparent prémultiplié.
        let mut px = vec![255, 0, 0, 255, 0, 0, 64, 128];
        bgra_premultiplied_to_rgba(&mut px);
        assert_eq!(px, vec![0, 0, 255, 255, 128, 0, 0, 128]);

        // Sans canal alpha : opaque.
        let mut px = vec![10, 20, 30, 0];
        bgra_premultiplied_to_rgba(&mut px);
        assert_eq!(px, vec![30, 20, 10, 255]);
    }

    #[test]
    fn large_images_are_resized() {
        let img = DynamicImage::new_rgba8(512, 256);
        let png = to_png(&img).unwrap();
        let back = image::load_from_memory(&png).unwrap();
        assert_eq!((back.width(), back.height()), (96, 48));
    }

    #[test]
    fn monogram_and_folders_have_no_image() {
        let dir = tempfile::tempdir().unwrap();
        let tile = Tile {
            icon: IconSpec::Monogram,
            target: "https://example.com".into(),
            ..Tile::default()
        };
        assert!(resolve(dir.path(), SectionKind::Websites, &tile).is_none());
        let folder = Tile {
            target: "C:\\".into(),
            ..Tile::default()
        };
        assert!(resolve(dir.path(), SectionKind::Folders, &folder).is_none());
    }

    #[test]
    fn cache_reuses_png_and_remembers_failures() {
        let dir = tempfile::tempdir().unwrap();
        let mut calls = 0;
        let first = cached(dir.path(), "k", || {
            calls += 1;
            Some(DynamicImage::new_rgba8(8, 8))
        });
        assert!(first.unwrap().starts_with("data:image/png;base64,"));
        let second = cached(dir.path(), "k", || panic!("ne doit pas être rappelé"));
        assert!(second.is_some());
        assert_eq!(calls, 1);

        assert!(cached(dir.path(), "missing", || None).is_none());
        assert!(dir.path().join("missing.none").exists());
        assert!(cached(dir.path(), "missing", || panic!("échec mémorisé")).is_none());
    }

    #[test]
    fn custom_icons_are_validated_and_copied() {
        let dir = tempfile::tempdir().unwrap();
        let src = dir.path().join("logo.png");
        DynamicImage::new_rgba8(4, 4).save(&src).unwrap();
        let dest = import_custom(&dir.path().join("custom"), &src).unwrap();
        assert!(dest.exists());
        assert!(load_custom(&dest).unwrap().starts_with("data:image/png"));

        let bad = dir.path().join("notes.txt");
        fs::write(&bad, "x").unwrap();
        assert!(import_custom(dir.path(), &bad).is_err());

        let fake = dir.path().join("fake.png");
        fs::write(&fake, "pas une image").unwrap();
        assert!(import_custom(dir.path(), &fake).is_err());
    }

    #[cfg(windows)]
    #[test]
    fn extracts_a_real_windows_icon() {
        let notepad = r"C:\Windows\System32\notepad.exe";
        if Path::new(notepad).exists() {
            let img = shell_icon(notepad, 64).expect("icône du Bloc-notes");
            assert!(img.width() >= 32);
        }
    }
}
