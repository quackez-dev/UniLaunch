# Tests manuels

À faire sur Windows 11 avant chaque version, avec l'installateur (pas seulement `tauri dev`). Les tests automatiques couvrent la logique ; cette liste couvre ce qui dépend de Windows et de l'interaction réelle.

Conseil : faire d'abord un tour avec une configuration jetable (`UNILAUNCH_DATA_DIR`, voir le README), puis avec la vraie.

## Installation et démarrage

- [ ] L'installateur NSIS installe et désinstalle proprement ; idem pour le MSI.
- [ ] Premier lancement : la fenêtre fait environ la moitié de l'écran, centrée, avec des groupes de départ vides.
- [ ] Relancer UniLaunch alors qu'il tourne : la fenêtre existante revient (pas de seconde instance).
- [ ] Sur un deuxième écran : avec la souris et le focus sur l'autre écran, le raccourci (et le clic sur l'icône de notification) affiche la fenêtre centrée sur l'écran principal, celui du menu Démarrer.

## Lancement

- [ ] Clic sur une app (`.exe`), un raccourci (`.lnk`), une app du Store : elle démarre.
- [ ] Clic sur un dossier : l'Explorateur s'ouvre dessus.
- [ ] Clic sur un site : il s'ouvre dans le navigateur par défaut.
- [ ] App avec arguments et dossier de travail : les deux sont pris en compte.
- [ ] « Exécuter en tant qu'administrateur » (menu ou option de la tuile) : l'invite UAC apparaît ; la refuser affiche « Lancement annulé ».
- [ ] Une cible supprimée est signalée (badge orange) ; la lancer affiche « Introuvable ».
- [ ] Clic droit : « Ouvrir l'emplacement » sélectionne le fichier dans l'Explorateur ; « Copier le chemin / l'URL » remplit le presse-papiers.

## Fenêtre et intégration

- [ ] Mode barre système : pas de bouton dans la barre des tâches ; Fermer cache la fenêtre ; cliquer ailleurs la cache ; Échap la cache.
- [ ] Mode fenêtre : bouton dans la barre des tâches ; Fermer quitte l'application.
- [ ] Cacher après un lancement : la fenêtre se cache (barre système) ou se réduit (fenêtre).
- [ ] Icône de la zone de notification : clic gauche affiche / cache ; menu Afficher / Quitter.
- [ ] Raccourci global : affiche / cache depuis n'importe quelle application. Un raccourci déjà pris par une autre application affiche un avertissement.
- [ ] Démarrer avec Windows : après redémarrage, UniLaunch tourne dans la zone de notification sans ouvrir sa fenêtre (mode barre système).
- [ ] Taille de la fenêtre 40 / 50 / 60 % : appliquée tout de suite, toujours centrée.

## Mode édition

- [ ] Hors du mode édition : aucun bouton d'ajout, pas de « Modifier / Supprimer » dans le menu, un fichier déposé ou une URL collée ne fait qu'afficher un message.
- [ ] Ajouter une app, un dossier, un site avec le formulaire (Parcourir, nom proposé, aperçu de l'icône).
- [ ] Icône personnalisée (PNG, ICO, SVG) puis monogramme.
- [ ] Glisser un `.exe`, un `.lnk`, un dossier et un raccourci Internet (`.url`) depuis l'Explorateur sur un groupe : la tuile arrive dans la bonne colonne ; le groupe survolé est mis en évidence.
- [ ] Glisser un lien depuis le navigateur (peut ne pas fonctionner selon le navigateur : utiliser Ctrl+V).
- [ ] Ctrl+V d'une URL au-dessus d'un groupe de sites : la tuile y est ajoutée.
- [ ] Applications installées : liste complète, filtre, icônes, « Déjà ajoutée » ; ajout de plusieurs apps d'un coup.
- [ ] Déplacer une tuile dans son groupe, vers un autre groupe, vers un groupe replié ; Échap pendant le glisser annule.
- [ ] Déplacer un groupe par sa poignée.
- [ ] Renommer, créer, supprimer un groupe ; supprimer une tuile ; « Annuler » restaure à la même place.

## Recherche et clavier

- [ ] Taper n'importe où remplit la recherche ; les trois colonnes se filtrent.
- [ ] Le meilleur résultat est mis en évidence ; ← → passent à la tuile voisine puis à la colonne d'à côté ; ↑ ↓ changent de ligne dans la colonne ; la tuile choisie reste visible ; Entrée lance ; Échap efface.
- [ ] Ctrl+F donne le focus à la recherche ; F5, Ctrl+R, Ctrl+P ne font rien.

## Paramètres et données

- [ ] Langue FR / EN : toute l'interface et le menu de la zone de notification changent.
- [ ] Couleur d'accent, taille des tuiles, nom au survol : appliqués tout de suite.
- [ ] Colonnes redimensionnées : largeur gardée après redémarrage ; double-clic sur un séparateur pour égaliser.
- [ ] Exporter, puis importer sur une autre session (ou après avoir tout modifié) : tuiles, groupes, réglages et icônes personnalisées reviennent ; « Annuler » après l'import rétablit l'état précédent.
- [ ] À propos : la version affichée est celle de `tauri.conf.json` ; « Copier les infos de version » donne la version d'UniLaunch, de Windows et de WebView2.
- [ ] Configuration corrompue (éditer `config.json` à la main et casser le JSON) : au démarrage, un message indique que la copie de secours a été restaurée ; le fichier cassé est gardé en `.corrupt`.
