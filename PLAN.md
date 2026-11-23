# UniLaunch — Plan de l'application

Launcher pour Windows 11 qui regroupe en un seul endroit les applications, les dossiers et les sites web utilisés souvent. Chaque élément est une tuile avec son icône. Un clic lance l'application, ouvre le dossier dans l'Explorateur ou ouvre le site dans le navigateur par défaut.

---

## 1. Décisions prises

| Sujet | Décision |
|---|---|
| Technologie | **Tauri 2** (backend Rust, interface web) |
| Interface | **React + TypeScript + Vite** |
| Organisation | **Tout sur une seule page, en 3 colonnes** (Applications, Dossiers, Sites web), chacune avec ses propres groupes. Pas d'onglets. |
| Fenêtre | **Environ la moitié de l'écran, centrée** (960×600 sur un écran 1920×1080). Mise en page compacte pensée pour cette taille. Deux modes au choix : fenêtre classique, ou dans la barre système et rappelée par un raccourci clavier global. |
| Édition | Les boutons « Ajouter » et « Apps installées » sont **visibles seulement en mode édition**. |
| Ajout de tuiles | Glisser-déposer, formulaire avec « Parcourir », liste des applications installées, mode édition |
| Style | Design propriétaire **sombre et épuré, avec une couleur d'accent** (dans l'esprit de Raycast ou Arc) |
| Extras v1 | Recherche rapide, options avancées pour les apps, import / export de la configuration |
| Langue | **Français et anglais**, au choix dans les paramètres |
| Tuiles | **Taille réglable** (S / M / L) ; le nom s'affiche sous l'icône ou seulement au survol |

---

## 2. Fonctionnalités

### 2.1 Affichage et lancement
- Une seule page en **trois colonnes côte à côte** : **Applications**, **Dossiers**, **Sites web**. Tout est visible d'un coup d'œil, sans changer d'onglet.
- Chaque colonne contient ses groupes (ex. « Professionnel », « Personnel »), que l'on peut replier. Si une colonne déborde, elle défile seule.
- **Colonnes redimensionnables** : un séparateur entre deux colonnes se glisse à la souris (ou avec les flèches du clavier quand il a le focus). Chaque colonne garde au moins 200 px, un double-clic égalise les trois colonnes, et les largeurs sont sauvegardées dans la configuration.
- Les tuiles sont compactes (68 px en taille moyenne), pour en mettre 4 par ligne dans une colonne d'environ 300 px.
- Chaque tuile montre l'icône de l'élément, et son nom selon le réglage.
- **Un clic lance l'élément** :
  - Application : exécutable (`.exe`), raccourci (`.lnk`) ou application du Microsoft Store.
  - Dossier : ouvert dans l'Explorateur Windows.
  - Site web : ouvert dans le navigateur par défaut.
- **Hors du mode édition, rien n'est modifiable** : pas d'ajout, de suppression, de glisser-déposer ni de Ctrl+V. Un fichier ou une URL déposé sur la fenêtre est ignoré, avec une notification discrète : « Passez en mode édition pour ajouter des tuiles ». Les groupes vides sont masqués.
- Clic droit sur une tuile : Ouvrir, Ouvrir l'emplacement du fichier, Exécuter en tant qu'administrateur (apps), Copier le chemin ou l'URL. « Modifier… » et « Supprimer » s'ajoutent seulement en mode édition.
- Une tuile dont le fichier ou le dossier n'existe plus s'affiche en état d'erreur (icône atténuée et petit avertissement).

### 2.2 Recherche rapide
- Taper n'importe où filtre les tuiles **directement dans les trois colonnes** (recherche approximative sur le nom). Les groupes sans résultat sont masqués, et le premier résultat est mis en évidence.
- Flèches pour naviguer, **Entrée** pour lancer, **Échap** pour effacer la recherche ou cacher la fenêtre.

### 2.3 Gestion des tuiles et des groupes
- **Mode édition** (bouton « Modifier », qui devient « Terminé ») :
  - Hors du mode édition, l'interface ne montre que les tuiles. Les boutons d'ajout n'apparaissent qu'en mode édition : « Ajouter » dans l'en-tête de chaque colonne, « Installées » dans la colonne Applications, une tuile « + » à la fin de chaque groupe et « Nouveau groupe » en bas de chaque colonne.
  - Un bouton « × » sur chaque tuile la supprime, avec une notification « Annuler » de quelques secondes.
  - On réordonne les tuiles par glisser, aussi d'un groupe à l'autre dans le même type.
  - On crée, renomme, réordonne et supprime des groupes.
  - Un clic sur une tuile ouvre son formulaire d'édition au lieu de la lancer.
- **Formulaire d'ajout ou d'édition** :
  - Type (déterminé par l'onglet courant), chemin ou URL avec un bouton « Parcourir… », nom (rempli automatiquement), groupe.
  - Icône : automatique, ou image personnalisée (PNG, ICO, SVG).
  - **Options avancées (apps)** : arguments de ligne de commande, dossier de travail, « Toujours exécuter en tant qu'administrateur ».
- **Glisser-déposer** depuis l'Explorateur (mode édition seulement) : un `.exe`, un `.lnk` ou un dossier déposé sur un groupe crée la tuile. Le type est détecté automatiquement, et la tuile est rangée dans la bonne colonne. Un groupe vide affiche une zone de dépôt en pointillé.
- **Applications installées** : une liste avec recherche des applications du menu Démarrer, y compris celles du Microsoft Store. Cocher pour ajouter plusieurs apps d'un coup.
- **Coller une URL** (Ctrl+V, mode édition seulement) crée une tuile dans la colonne Sites web.

### 2.4 Fenêtre et intégration Windows
- **Taille et position** : environ **50 % de l'écran actif** (40, 50 ou 60 % au choix), toujours **centrée**. Pas de plein écran. Barre de titre personnalisée, avec seulement les boutons Réduire et Fermer.
- **Mode fenêtre** : une application normale, avec son icône dans la barre des tâches.
- **Mode barre système** :
  - L'application tourne en arrière-plan, avec une icône dans la zone de notification.
  - Un **raccourci clavier global** configurable (par défaut `Ctrl+Alt+Espace`) affiche ou cache la fenêtre, centrée sur l'écran actif.
  - La fenêtre se cache après un lancement, ou quand elle perd le focus (désactivable).
- **Démarrage avec Windows** (optionnel).
- **Une seule instance** : relancer l'application ramène la fenêtre existante.

### 2.5 Paramètres
- Langue : FR / EN.
- Couleur d'accent : quelques couleurs prédéfinies, ou une couleur libre.
- Taille des tuiles (S / M / L) et affichage du nom (toujours ou au survol).
- Taille de la fenêtre (40 / 50 / 60 % de l'écran), mode de fenêtre, raccourci global, cacher après un lancement, démarrer avec Windows.
- **Importer / exporter** la configuration en JSON (icônes personnalisées incluses, encodées en base64).
- **À propos** (en bas des paramètres) : logo, nom, numéro de version et un bouton « Copier les infos de version » (version de l'app, de Windows et de WebView2, utiles pour signaler un problème). La version est lue au démarrage avec `getVersion()` de Tauri, qui reprend celle de `tauri.conf.json`. Il n'y a donc qu'un seul endroit où la changer.

---

## 3. Architecture technique

```
┌────────────────────────────── Tauri 2 ──────────────────────────────┐
│  Interface (React + TS)            │  Backend (Rust)                │
│  ─ Onglets / Groupes / Tuiles      │  ─ config : lecture/écriture   │
│  ─ Mode édition (dnd-kit)          │    JSON, migrations            │
│  ─ Formulaires, Paramètres         │  ─ launcher : ShellExecuteExW  │
│  ─ Recherche (fuse.js)             │  ─ icons : extraction + cache  │
│  ─ i18n (i18next)                  │  ─ installed_apps : AppsFolder │
│  ─ État : Zustand                  │  ─ favicon : téléchargement    │
│                                    │  ─ tray, hotkey, autostart     │
└──────────── commandes Tauri (invoke) + événements ──────────────────┘
```

### 3.1 Plugins Tauri
- `tauri-plugin-global-shortcut` : raccourci global
- `tauri-plugin-autostart` : démarrage avec Windows
- `tauri-plugin-single-instance` : une seule instance
- `tauri-plugin-dialog` : sélecteurs de fichiers et de dossiers
- `tauri-plugin-opener` : ouverture des URL et des dossiers
- Barre système : API `tray-icon` intégrée à Tauri 2

### 3.2 Modules Rust
| Module | Rôle |
|---|---|
| `config` | Charge et sauvegarde `%APPDATA%\UniLaunch\config.json`. Écriture atomique (fichier temporaire puis renommage), sauvegarde `.bak`, champ `schemaVersion` pour les migrations. |
| `launcher` | `ShellExecuteExW` (crate `windows`) : apps avec arguments, dossier de travail et verbe `runas` pour l'admin ; dossiers avec `explorer.exe` ; URL vers le navigateur par défaut ; apps du Store avec `shell:AppsFolder\<AUMID>`. |
| `icons` | Extrait les icônes en haute résolution (`IShellItemImageFactory`, 256 px) des `.exe`, des `.lnk` et des dossiers, puis les convertit en PNG dans un cache `%APPDATA%\UniLaunch\icons\<hash>.png`. |
| `installed_apps` | Énumère `FOLDERID_AppsFolder` : nom, identifiant de lancement (chemin ou AUMID), icône. Couvre les apps Win32 et celles du Store. |
| `favicon` | Télécharge le favicon d'un site : `<link rel="icon">` dans la page, sinon `/favicon.ico`. En cas d'échec, l'interface affiche un monogramme (première lettre sur la couleur d'accent). |

### 3.3 Modèle de données (`config.json`)
```jsonc
{
  "schemaVersion": 1,
  "settings": {
    "language": "fr",
    "accentColor": "#6D4AFF",
    "tileSize": "M",            // S | M | L
    "showLabels": "always",     // always | hover
    "windowMode": "tray",       // window | tray
    "windowScale": 0.5,         // 0.4 | 0.5 | 0.6 de l'écran actif, fenêtre centrée
    "columnWidths": [1, 1, 1],  // proportions des colonnes Applications / Dossiers / Sites web
    "hotkey": "Ctrl+Alt+Space",
    "hideAfterLaunch": true,
    "hideOnBlur": true,
    "startWithWindows": false
  },
  "sections": {
    "apps":     { "groups": [ /* Group */ ] },
    "folders":  { "groups": [ /* Group */ ] },
    "websites": { "groups": [ /* Group */ ] }
  }
}

// Group
{ "id": "uuid", "name": "Professionnel", "collapsed": false, "tiles": [ /* Tile */ ] }

// Tile
{
  "id": "uuid",
  "name": "Visual Studio Code",
  "target": "C:\\...\\Code.exe",   // chemin, URL ou shell:AppsFolder\AUMID
  "icon": { "kind": "auto" },      // auto | custom (chemin dans le cache) | monogram
  "args": "",                      // apps seulement
  "workingDir": "",                // apps seulement
  "runAsAdmin": false              // apps seulement
}
```

### 3.4 Commandes Tauri (interface vers Rust)
`get_config`, `save_config`, `launch_tile(id, asAdmin?)`, `resolve_target(path)` (nom, type et icône à partir d'un fichier déposé), `get_icon(target)`, `list_installed_apps`, `fetch_favicon(url)`, `export_config(path)`, `import_config(path)`, `set_window_mode`, `register_hotkey`, `set_autostart`.

---

## 4. Étapes de réalisation

| # | Étape | Livrable |
|---|---|---|
| **0** | **Design** avec Claude Design : écran principal, mode édition, formulaire d'ajout, liste des apps installées, paramètres, états vides et d'erreur | Maquettes **approuvées par toi** ✅ (point d'arrêt) |
| 1 | Squelette : projet Tauri 2, React, TS, Vite, lint, structure des dossiers, CI de build | L'application démarre et affiche une fenêtre vide |
| 2 | Backend : `config` (lecture/écriture, migrations) et `launcher` (apps, dossiers, URL, admin) | Tests unitaires Rust |
| 3 | Icônes : extraction, cache PNG, favicons, monogrammes | Les icônes s'affichent correctement |
| 4 | Interface principale : 3 colonnes, groupes repliables, grille de tuiles compacte, lancement au clic, menu contextuel, fenêtre centrée à 50 % de l'écran, design system (tokens, thème sombre, accent) | Usage quotidien possible |
| 5 | Mode édition : formulaire d'ajout et d'édition, options avancées, suppression avec annulation, réordonnancement (dnd-kit), gestion des groupes | CRUD complet |
| 6 | Ajout rapide : glisser-déposer depuis l'Explorateur, liste des apps installées, coller une URL | Les 4 méthodes d'ajout |
| 7 | Intégration Windows : barre système, raccourci global, cacher au lancement et à la perte de focus, démarrage avec Windows, instance unique | Mode barre système complet |
| 8 | Recherche rapide et navigation au clavier | |
| 9 | Paramètres, i18n FR/EN, import / export | |
| 10 | Finition : animations, accessibilité, tests manuels sur Windows 11, installateur (NSIS / MSI) | Version 1.0 |

Le développement démarre seulement **après l'approbation du design** (étape 0).

---

## 5. Risques et points à valider tôt

| Risque | Mitigation |
|---|---|
| **Glisser une URL depuis le navigateur** : le gestionnaire de glisser-déposer natif de Tauri fournit les chemins de fichiers, pas toujours les URL. | Prototype à l'étape 6. En solution de repli, Ctrl+V pour coller une URL et le formulaire. |
| Icônes des apps du Store (UWP), parfois petites ou sur fond transparent | Passer par `IShellItemImageFactory` sur l'élément AppsFolder. Prévoir l'icône personnalisée. |
| Exécution en administrateur : invite UAC à chaque lancement | Comportement normal de Windows, à documenter dans l'interface. |
| Raccourci global déjà pris par une autre app | Message d'erreur clair et choix d'un autre raccourci dans les paramètres. |
| Installateur non signé : avertissement SmartScreen | Acceptable pour un usage personnel. Signature de code possible plus tard. |

---

## 6. Hors périmètre v1 (idées pour plus tard)
- Lancer tout un groupe d'un coup.
- Synchronisation dans le nuage entre plusieurs PC (l'import / export couvre le besoin pour l'instant).
- Thème clair.
- Tuiles « commande » (scripts PowerShell, commandes personnalisées).
- Statistiques d'usage (tri par fréquence).

---

## 7. Avancement (2026-11-23)

Les étapes 1 à 10 sont réalisées, chacune sur sa branche `feature/NN-…` fusionnée dans `develop`. Ensuite, `feature/11-ecran-principal-fleches` : la fenêtre s'ouvre toujours sur l'écran principal, et la recherche se parcourt avec les quatre flèches (navigation spatiale).

**Version 0.1.0** : première release, fusionnée dans `master` avec le tag `v0.1.0` (voir [CHANGELOG.md](CHANGELOG.md)). Les tests manuels ([docs/tests-manuels.md](docs/tests-manuels.md)) restent à passer en entier avant la version 1.0.0.

Écarts et points ouverts :

- **Glisser une URL depuis le navigateur** : non vérifié (le glisser-déposer de Tauri ne fournit que des chemins de fichiers). Ctrl+V en mode édition couvre le besoin.
- **Raccourci par défaut `Ctrl+Alt+Espace`** : déjà pris par une autre application sur le poste de développement. UniLaunch affiche alors un avertissement ; le raccourci se change dans les paramètres.
- **Extraction des icônes** : faite sur un seul fil dédié (STA). En parallèle sur les fils partagés, certaines extractions échouaient au hasard.
- **Version** : `0.1.0` dans `package.json`, `tauri.conf.json` et `Cargo.toml`, à passer à `1.0.0` une fois les tests manuels validés.
