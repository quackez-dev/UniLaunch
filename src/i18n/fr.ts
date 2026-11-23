// Textes de l'interface en français (langue de référence : toutes les clés sont ici).

export const fr = {
  "app.name": "UniLaunch",
  "window.minimize": "Réduire",
  "window.close": "Fermer",

  "section.apps": "Applications",
  "section.folders": "Dossiers",
  "section.websites": "Sites web",
  "section.empty.apps": "Aucune application.",
  "section.empty.folders": "Aucun dossier.",
  "section.empty.websites": "Aucun site web.",
  "section.empty.hint": "Cliquez sur Modifier pour en ajouter.",

  "group.collapse": "Replier ou déplier {name}",

  "columns.resize": "Redimensionner les colonnes {left} et {right}",
  "columns.resizeHint": "Glisser pour redimensionner · double-clic pour égaliser",

  "tile.missing": "Introuvable",
  "tile.missingTitle": "{name} — introuvable\n{target}",

  "menu.label": "Actions sur {name}",
  "menu.open": "Ouvrir",
  "menu.openKey": "Entrée",
  "menu.runAsAdmin": "Exécuter en tant qu'administrateur",
  "menu.revealFile": "Ouvrir l'emplacement du fichier",
  "menu.revealFolder": "Ouvrir le dossier parent",
  "menu.copyPath": "Copier le chemin",
  "menu.copyUrl": "Copier l'URL",
  "menu.edit": "Modifier…",
  "menu.delete": "Supprimer",
  "menu.deleteKey": "Suppr",
  "menu.close": "Fermer le menu",

  "toast.launching": "Lancement de {name}…",
  "toast.openingFolder": "Ouverture de « {name} » dans l'Explorateur",
  "toast.openingSite": "Ouverture de {name} dans le navigateur",
  "toast.copied": "Copié dans le presse-papiers",
  "toast.undo": "Annuler",
  "toast.saveFailed": "Impossible d'enregistrer la configuration : {error}",

  "error.notFound": "Introuvable : {detail}",
  "error.invalidUrl": "Adresse web invalide : {detail}",
  "error.emptyTarget": "Cette tuile n'a pas de cible",
  "error.cancelled": "Lancement annulé",
  "error.failed": "Échec du lancement : {detail}",

  "status.hint": "Clic droit sur une tuile pour plus d'options",
  "status.toggle": "afficher / cacher",
  "status.loading": "Chargement…",
} as const;

export type MessageKey = keyof typeof fr;
