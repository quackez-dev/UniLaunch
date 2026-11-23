import type { MessageKey } from "./fr";

// English UI strings. Every French key must exist here (checked by the type).

export const en: Record<MessageKey, string> = {
  "app.name": "UniLaunch",
  "window.minimize": "Minimize",
  "window.close": "Close",

  "section.apps": "Apps",
  "section.folders": "Folders",
  "section.websites": "Websites",
  "section.empty.apps": "No apps yet.",
  "section.empty.folders": "No folders yet.",
  "section.empty.websites": "No websites yet.",
  "section.empty.hint": "Click Edit to add some.",

  "group.collapse": "Collapse or expand {name}",

  "columns.resize": "Resize the {left} and {right} columns",
  "columns.resizeHint": "Drag to resize · double-click to reset",

  "tile.missing": "Not found",
  "tile.missingTitle": "{name} — not found\n{target}",

  "menu.label": "Actions for {name}",
  "menu.open": "Open",
  "menu.openKey": "Enter",
  "menu.runAsAdmin": "Run as administrator",
  "menu.revealFile": "Open file location",
  "menu.revealFolder": "Open parent folder",
  "menu.copyPath": "Copy path",
  "menu.copyUrl": "Copy URL",
  "menu.edit": "Edit…",
  "menu.delete": "Delete",
  "menu.deleteKey": "Del",
  "menu.close": "Close menu",

  "toast.launching": "Launching {name}…",
  "toast.openingFolder": "Opening “{name}” in File Explorer",
  "toast.openingSite": "Opening {name} in the browser",
  "toast.copied": "Copied to clipboard",
  "toast.undo": "Undo",
  "toast.saveFailed": "Could not save the configuration: {error}",

  "error.notFound": "Not found: {detail}",
  "error.invalidUrl": "Invalid web address: {detail}",
  "error.emptyTarget": "This tile has no target",
  "error.cancelled": "Launch cancelled",
  "error.failed": "Launch failed: {detail}",

  "status.hint": "Right-click a tile for more options",
  "status.toggle": "show / hide",
  "status.loading": "Loading…",
};
