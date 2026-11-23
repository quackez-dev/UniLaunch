# UniLaunch

Lanceur pour Windows 11 : les applications, les dossiers et les sites web utilisés souvent, réunis dans une seule fenêtre. Un clic sur une tuile lance l'application, ouvre le dossier dans l'Explorateur ou ouvre le site dans le navigateur par défaut.

- **Trois colonnes** côte à côte (Applications, Dossiers, Sites web), chacune avec ses groupes repliables. Les colonnes se redimensionnent en glissant leurs séparateurs.
- **Une fenêtre compacte**, environ la moitié de l'écran, toujours centrée sur l'écran principal.
- **Rien ne bouge par accident** : on n'ajoute, ne modifie, ne déplace et ne supprime des tuiles qu'en **mode édition**.
- **Recherche rapide** : tapez n'importe où, Entrée lance le premier résultat.
- **Barre système et raccourci global** pour afficher ou cacher UniLaunch de partout.

## Utilisation

| Action | Comment |
|---|---|
| Lancer une tuile | Clic, ou taper son nom, choisir avec les flèches puis Entrée |
| Plus d'options | Clic droit sur une tuile : administrateur, emplacement, copier le chemin… |
| Afficher / cacher | Raccourci global (réglable dans les paramètres), clic sur l'icône de la zone de notification, Échap pour cacher |
| Ajouter des tuiles | **Modifier**, puis : **Ajouter** dans une colonne, **+** dans un groupe, **Installées** (apps du menu Démarrer et du Store), glisser des fichiers ou dossiers depuis l'Explorateur, ou coller une URL (Ctrl+V) |
| Réorganiser | En mode édition : glisser les tuiles (aussi d'un groupe à l'autre) et les groupes (poignée ⠿) |
| Supprimer | En mode édition : **×** sur la tuile (ou touche Suppr), avec **Annuler** pendant quelques secondes |
| Paramètres | Engrenage : taille de la fenêtre, mode fenêtre ou barre système, raccourci, apparence, langue, import / export |

La configuration est enregistrée dans `%APPDATA%\UniLaunch\config.json` (avec une copie `.bak` de la version précédente). Les icônes en cache sont dans `%LOCALAPPDATA%\UniLaunch\icons`.

## Développement

Prérequis :

- [Node.js](https://nodejs.org/) 24 ou plus récent
- [Rust](https://rustup.rs/) stable (cible `x86_64-pc-windows-msvc`)
- Visual Studio 2022 Build Tools (charge de travail « Développement Desktop en C++ »)
- WebView2 (déjà présent sur Windows 11)

```powershell
npm install
npm run tauri dev      # lance l'application en mode développement
npm run tauri build    # produit les installateurs (NSIS et MSI) dans src-tauri\target\release\bundle
```

Pour essayer sans toucher à sa vraie configuration, définir `UNILAUNCH_DATA_DIR` : la configuration et le cache des icônes sont alors rangés dans ce dossier.

```powershell
$env:UNILAUNCH_DATA_DIR = "$env:TEMP\unilaunch-essai"
npm run tauri dev
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
cargo test -- --ignored   # test réseau : récupération d'un vrai favicon
```

Les tests manuels à faire avant une version sont dans [docs/tests-manuels.md](docs/tests-manuels.md).

## Structure

| Emplacement | Contenu |
|---|---|
| `src/App.tsx` | Assemblage de la fenêtre, raccourcis clavier |
| `src/store.ts` | État global (configuration, enregistrement automatique, lancement, notifications) |
| `src/editing.ts` | Mode édition (formulaire, glisser-déposer, suppression avec annulation, ajout rapide) |
| `src/search.ts` | État de la recherche rapide |
| `src/components/` | Composants d'interface |
| `src/lib/` | Fonctions pures testées (édition, recherche, mise en page, raccourcis…) et appels au backend |
| `src/i18n/` | Textes en français et en anglais |
| `src-tauri/src/config.rs` | Modèle de configuration, lecture et écriture sûres, migrations |
| `src-tauri/src/launcher.rs` | Lancement (`ShellExecuteExW`) : apps, administrateur, dossiers, sites, apps du Store |
| `src-tauri/src/icons.rs`, `favicon.rs` | Icônes Windows, favicons, images personnalisées, cache |
| `src-tauri/src/quickadd.rs` | Fichiers déposés, raccourcis Internet, applications installées |
| `src-tauri/src/integration.rs` | Zone de notification, raccourci global, modes de fenêtre, démarrage avec Windows |
| `src-tauri/src/transfer.rs` | Import et export de la configuration |
| `src-tauri/src/window.rs` | Taille et position de la fenêtre (fraction de l'écran, centrée) |
