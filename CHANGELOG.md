# Historique des versions

## [0.1.0] - 2026-11-23

Première version.

### Fenêtre et intégration à Windows

- Trois colonnes côte à côte (Applications, Dossiers, Sites web), avec des groupes repliables. Les séparateurs se glissent à la souris ou se déplacent avec les flèches ; un double-clic égalise les colonnes.
- Fenêtre compacte (40, 50 ou 60 % de l'écran), toujours centrée sur l'écran principal, celui du menu Démarrer.
- Deux modes : fenêtre classique, ou icône dans la zone de notification avec un raccourci clavier global pour afficher ou cacher UniLaunch (`Ctrl+Alt+Espace` par défaut).
- Cacher après un lancement, cacher à la perte du focus, démarrage avec Windows, instance unique.

### Lancement

- Un clic lance l'application, ouvre le dossier dans l'Explorateur ou ouvre le site dans le navigateur par défaut.
- Menu contextuel : lancer en administrateur, ouvrir l'emplacement, copier le chemin.
- Apps du Microsoft Store prises en charge.

### Mode édition

- Ajouter, modifier, déplacer et supprimer des tuiles et des groupes uniquement en mode édition.
- Glisser-déposer pour réorganiser les tuiles (aussi d'un groupe à l'autre) et les groupes.
- Suppression avec **Annuler** pendant quelques secondes.
- Ajout rapide : glisser des fichiers ou dossiers depuis l'Explorateur, coller une URL (Ctrl+V), choisir parmi les applications installées (menu Démarrer et Store).

### Icônes

- Icônes Windows des applications et dossiers, favicons des sites, images personnalisées, monogrammes de repli.
- Cache des icônes dans `%LOCALAPPDATA%\UniLaunch\icons`.

### Recherche rapide

- Taper n'importe où pour chercher dans les trois colonnes, sans tenir compte des accents ni de la casse.
- Navigation spatiale avec les flèches : gauche et droite passent à la tuile voisine puis à la colonne d'à côté, haut et bas changent de ligne dans la colonne.
- Entrée lance le résultat choisi, Échap efface la recherche.

### Paramètres

- Taille de la fenêtre, mode d'affichage, raccourci global, couleur d'accent, taille des tuiles, affichage des noms, langue (français et anglais).
- Import et export de la configuration (icônes personnalisées comprises).
- Configuration dans `%APPDATA%\UniLaunch\config.json`, avec une copie `.bak` de la version précédente.

### Installation

- Installateurs MSI et NSIS pour Windows 11 x64. Ils ne sont pas signés : Windows SmartScreen peut afficher un avertissement.

[0.1.0]: https://github.com/quackez-dev/UniLaunch/releases/tag/v0.1.0
