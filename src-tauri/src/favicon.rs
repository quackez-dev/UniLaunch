//! Récupération du favicon d'un site web.
//!
//! On lit la page d'accueil, on repère les `<link rel="icon">` (et apparentés),
//! puis on essaie les candidats du meilleur au moins bon, avec `/favicon.ico` en dernier.
//! Les icônes SVG sont ignorées : elles ne peuvent pas être converties en PNG ici.

use std::io::Read;
use std::time::Duration;
use url::Url;

/// Taille maximale téléchargée (page ou image).
const MAX_BYTES: u64 = 2 * 1024 * 1024;
const TIMEOUT: Duration = Duration::from_secs(6);
const USER_AGENT: &str = concat!("UniLaunch/", env!("CARGO_PKG_VERSION"));

/// Une icône candidate trouvée dans la page.
#[derive(Debug, Clone, PartialEq)]
pub struct Candidate {
    pub url: Url,
    /// Plus c'est grand, mieux c'est.
    pub score: u32,
}

/// Extrait les icônes déclarées dans le HTML, triées de la meilleure à la moins bonne.
pub fn parse_icon_links(html: &str, base: &Url) -> Vec<Candidate> {
    let lower = html.to_ascii_lowercase();
    let mut out = Vec::new();
    let mut pos = 0;
    while let Some(start) = lower[pos..].find("<link") {
        let start = pos + start;
        let Some(end) = lower[start..].find('>') else {
            break;
        };
        let end = start + end;
        // Les indices sont communs : `to_ascii_lowercase` garde les mêmes octets.
        let tag = &html[start..end];
        pos = end;

        let rel = attr(tag, "rel").unwrap_or_default().to_ascii_lowercase();
        let rels: Vec<&str> = rel.split_whitespace().collect();
        let is_icon = rels.contains(&"icon")
            || rels.contains(&"apple-touch-icon")
            || rels.contains(&"apple-touch-icon-precomposed");
        if !is_icon {
            continue;
        }
        let Some(href) = attr(tag, "href").filter(|h| !h.trim().is_empty()) else {
            continue;
        };
        let kind = attr(tag, "type").unwrap_or_default().to_ascii_lowercase();
        if kind.contains("svg")
            || href
                .to_ascii_lowercase()
                .split('?')
                .next()
                .unwrap_or("")
                .ends_with(".svg")
        {
            continue;
        }
        let Ok(url) = base.join(href.trim()) else {
            continue;
        };
        if !matches!(url.scheme(), "http" | "https" | "data") {
            continue;
        }

        let size = attr(tag, "sizes")
            .and_then(|s| largest_size(&s))
            .unwrap_or(0);
        let mut score = if size > 0 { size.min(512) } else { 32 };
        if rels.iter().any(|r| r.starts_with("apple-touch-icon")) {
            // Généralement 180 px et opaque : un bon choix pour une tuile.
            score = score.max(180);
        }
        out.push(Candidate { url, score });
    }
    out.sort_by(|a, b| b.score.cmp(&a.score));
    out.dedup_by(|a, b| a.url == b.url);
    out
}

/// Valeur d'un attribut dans une balise (guillemets simples, doubles ou sans guillemets).
fn attr(tag: &str, name: &str) -> Option<String> {
    let lower = tag.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    let mut search = 0;
    while let Some(found) = lower[search..].find(name) {
        let i = search + found;
        search = i + name.len();
        // Le nom doit être précédé d'un espace et suivi de `=` (espaces permis).
        if i == 0 || !bytes[i - 1].is_ascii_whitespace() {
            continue;
        }
        let rest = &tag[i + name.len()..];
        let rest_trim = rest.trim_start();
        let Some(after_eq) = rest_trim.strip_prefix('=') else {
            continue;
        };
        let value = after_eq.trim_start();
        return Some(match value.chars().next() {
            Some(q @ ('"' | '\'')) => value[1..].split(q).next().unwrap_or("").to_string(),
            _ => value.split_whitespace().next().unwrap_or("").to_string(),
        });
    }
    None
}

/// Plus grande taille dans un attribut `sizes` (« 16x16 32x32 », « any »).
fn largest_size(sizes: &str) -> Option<u32> {
    sizes
        .split_whitespace()
        .filter_map(|s| {
            let s = s.to_ascii_lowercase();
            let (w, _) = s.split_once('x')?;
            w.parse::<u32>().ok()
        })
        .max()
}

fn agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .timeout(TIMEOUT)
        .user_agent(USER_AGENT)
        .redirects(5)
        .build()
}

fn get_bytes(agent: &ureq::Agent, url: &Url) -> Option<Vec<u8>> {
    let resp = agent.get(url.as_str()).call().ok()?;
    let mut buf = Vec::new();
    resp.into_reader()
        .take(MAX_BYTES)
        .read_to_end(&mut buf)
        .ok()?;
    Some(buf)
}

/// Télécharge le favicon d'un site et renvoie l'image décodée.
pub fn fetch(site: &str) -> Option<image::DynamicImage> {
    let base = Url::parse(site).ok()?;
    if !matches!(base.scheme(), "http" | "https") {
        return None;
    }
    let agent = agent();

    let mut candidates = get_bytes(&agent, &base)
        .map(|page| parse_icon_links(&String::from_utf8_lossy(&page), &base))
        .unwrap_or_default();
    if let Ok(ico) = base.join("/favicon.ico") {
        candidates.push(Candidate { url: ico, score: 0 });
    }

    candidates.iter().find_map(|c| {
        let bytes = if c.url.scheme() == "data" {
            decode_data_url(c.url.as_str())?
        } else {
            get_bytes(&agent, &c.url)?
        };
        image::load_from_memory(&bytes).ok()
    })
}

/// Décode une URL `data:image/...;base64,...`.
fn decode_data_url(url: &str) -> Option<Vec<u8>> {
    use base64::Engine;
    let (meta, data) = url.strip_prefix("data:")?.split_once(',')?;
    if !meta.ends_with(";base64") {
        return None;
    }
    base64::engine::general_purpose::STANDARD
        .decode(data.trim())
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base() -> Url {
        Url::parse("https://example.com/blog/").unwrap()
    }

    #[test]
    fn finds_and_ranks_icons() {
        let html = r#"
            <html><head>
            <link rel="stylesheet" href="/style.css">
            <LINK REL="icon" type="image/png" sizes="16x16" href="/fav-16.png">
            <link rel="icon" sizes="32x32 64x64" href='fav-64.png'>
            <link rel="apple-touch-icon" href="https://cdn.example.com/touch.png" />
            <link rel="shortcut icon" href=/legacy.ico>
            </head></html>"#;
        let urls: Vec<String> = parse_icon_links(html, &base())
            .into_iter()
            .map(|c| c.url.to_string())
            .collect();
        assert_eq!(
            urls,
            vec![
                "https://cdn.example.com/touch.png",
                "https://example.com/blog/fav-64.png",
                "https://example.com/legacy.ico",
                "https://example.com/fav-16.png",
            ]
        );
    }

    #[test]
    fn skips_svg_and_empty_hrefs() {
        let html = r#"<link rel="icon" type="image/svg+xml" href="/i.svg">
                      <link rel="icon" href="/logo.svg?v=2">
                      <link rel="icon" href="">"#;
        assert!(parse_icon_links(html, &base()).is_empty());
    }

    #[test]
    fn ignores_non_web_schemes() {
        let html = r#"<link rel="icon" href="javascript:alert(1)"><link rel="icon" href="file:///C:/x.png">"#;
        assert!(parse_icon_links(html, &base()).is_empty());
    }

    #[test]
    fn attribute_parsing() {
        assert_eq!(
            attr(r#"<link rel="icon" href="/a.png""#, "href").as_deref(),
            Some("/a.png")
        );
        assert_eq!(
            attr("<link rel=icon href=/a.png", "href").as_deref(),
            Some("/a.png")
        );
        assert_eq!(
            attr("<link data-href='x' href='/b.png'", "href").as_deref(),
            Some("/b.png")
        );
        assert_eq!(attr("<link rel = 'icon'", "rel").as_deref(), Some("icon"));
        assert_eq!(attr("<link rel='icon'", "href"), None);
    }

    #[test]
    fn size_parsing() {
        assert_eq!(largest_size("16x16 32x32 192x192"), Some(192));
        assert_eq!(largest_size("any"), None);
    }

    #[test]
    fn data_urls() {
        assert_eq!(
            decode_data_url("data:image/png;base64,AAEC"),
            Some(vec![0, 1, 2])
        );
        assert_eq!(decode_data_url("data:image/png,raw"), None);
    }
}

#[cfg(test)]
mod network_tests {
    /// Test réseau, lancé à la main : `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn fetches_a_real_favicon() {
        let img = super::fetch("https://www.rust-lang.org").expect("favicon de rust-lang.org");
        assert!(img.width() >= 16);
    }
}
