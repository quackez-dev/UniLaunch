//! Dimensionnement de la fenêtre principale : une fraction de l'écran actif, centrée.

use tauri::{PhysicalPosition, PhysicalSize, WebviewWindow};

/// Taille minimale de la fenêtre, en pixels logiques.
pub const MIN_WIDTH: f64 = 720.0;
pub const MIN_HEIGHT: f64 = 480.0;

/// Rectangle en pixels physiques.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Calcule la position et la taille de la fenêtre dans la zone de travail d'un écran.
///
/// - `area` : zone de travail de l'écran (sans la barre des tâches), en pixels physiques.
/// - `scale` : proportion de l'écran (0.4, 0.5, 0.6…), bornée entre 0.3 et 0.9.
/// - `dpi` : facteur d'échelle de l'écran, pour appliquer la taille minimale en pixels logiques.
///
/// La fenêtre ne dépasse jamais la zone de travail.
pub fn centered_rect(area: Rect, scale: f64, dpi: f64) -> Rect {
    let scale = scale.clamp(0.3, 0.9);
    let dpi = if dpi > 0.0 { dpi } else { 1.0 };

    let min_w = (MIN_WIDTH * dpi).round() as u32;
    let min_h = (MIN_HEIGHT * dpi).round() as u32;

    let width = ((area.width as f64 * scale).round() as u32)
        .max(min_w)
        .min(area.width);
    let height = ((area.height as f64 * scale).round() as u32)
        .max(min_h)
        .min(area.height);

    let x = area.x + ((area.width - width) / 2) as i32;
    let y = area.y + ((area.height - height) / 2) as i32;

    Rect {
        x,
        y,
        width,
        height,
    }
}

/// Place la fenêtre au centre de l'écran où elle se trouve (ou de l'écran principal).
pub fn fit_to_monitor(window: &WebviewWindow, scale: f64) -> tauri::Result<()> {
    let monitor = match window.current_monitor()? {
        Some(m) => Some(m),
        None => window.primary_monitor()?,
    };
    let Some(monitor) = monitor else {
        return Ok(());
    };

    let work = monitor.work_area();
    let area = Rect {
        x: work.position.x,
        y: work.position.y,
        width: work.size.width,
        height: work.size.height,
    };
    let rect = centered_rect(area, scale, monitor.scale_factor());

    window.set_size(PhysicalSize::new(rect.width, rect.height))?;
    window.set_position(PhysicalPosition::new(rect.x, rect.y))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FULL_HD: Rect = Rect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1032,
    };

    #[test]
    fn half_of_full_hd_is_centered() {
        let r = centered_rect(FULL_HD, 0.5, 1.0);
        assert_eq!(
            r,
            Rect {
                x: 480,
                y: 258,
                width: 960,
                height: 516
            }
        );
    }

    #[test]
    fn min_size_applies_on_small_screens() {
        let small = Rect {
            x: 0,
            y: 0,
            width: 1280,
            height: 720,
        };
        let r = centered_rect(small, 0.4, 1.0);
        assert_eq!(r.width, 720);
        assert_eq!(r.height, 480);
        assert_eq!(r.x, 280);
        assert_eq!(r.y, 120);
    }

    #[test]
    fn min_size_scales_with_dpi() {
        let r = centered_rect(
            Rect {
                x: 0,
                y: 0,
                width: 2560,
                height: 1400,
            },
            0.3,
            2.0,
        );
        assert_eq!(r.width, 1440);
        assert_eq!(r.height, 960);
    }

    #[test]
    fn never_larger_than_work_area() {
        let tiny = Rect {
            x: 0,
            y: 0,
            width: 640,
            height: 400,
        };
        let r = centered_rect(tiny, 0.5, 1.0);
        assert_eq!(
            r,
            Rect {
                x: 0,
                y: 0,
                width: 640,
                height: 400
            }
        );
    }

    #[test]
    fn respects_monitor_offset() {
        let second = Rect {
            x: 1920,
            y: -200,
            width: 2560,
            height: 1400,
        };
        let r = centered_rect(second, 0.5, 1.0);
        assert_eq!(
            r,
            Rect {
                x: 1920 + 640,
                y: -200 + 350,
                width: 1280,
                height: 700
            }
        );
    }

    #[test]
    fn scale_is_clamped() {
        let r = centered_rect(FULL_HD, 5.0, 1.0);
        assert_eq!(r.width, (1920.0_f64 * 0.9).round() as u32);
    }
}
