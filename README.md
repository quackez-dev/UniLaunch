# UniLaunch

Lanceur pour Windows 11 : les applications, les dossiers et les sites web utilisés souvent, réunis dans une seule fenêtre. Un clic sur une tuile lance l'application, ouvre le dossier dans l'Explorateur ou ouvre le site dans le navigateur par défaut.

> Projet en cours de développement. Le plan complet est dans [PLAN.md](PLAN.md).

## Développement

Prérequis :

- [Node.js](https://nodejs.org/) 24 ou plus récent
- [Rust](https://rustup.rs/) stable (cible `x86_64-pc-windows-msvc`)
- Visual Studio 2022 Build Tools (charge de travail « Développement Desktop en C++ »)
- WebView2 (déjà présent sur Windows 11)

```powershell
npm install
npm run tauri dev      # lance l'application en mode développement
npm run tauri build    # produit l'installateur (NSIS et MSI)
```

Vérifications (les mêmes qu'en CI) :

```powershell
npm run lint
npm run typecheck
npm test
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## Structure

| Dossier | Contenu |
|---|---|
| `src/` | Interface React + TypeScript |
| `src/styles/` | Jetons de design (couleurs, typo) et styles globaux |
| `src/components/` | Composants d'interface |
| `src-tauri/` | Backend Rust (Tauri 2) |
| `src-tauri/src/window.rs` | Taille et position de la fenêtre (fraction de l'écran, centrée) |
