import { setEditing } from "../editing";
import { useStore, useT } from "../store";

/** Bouton « Modifier » / « Terminé » de la barre de titre. */
export function EditToggle() {
  const t = useT();
  const editing = useStore((s) => s.editing);

  return (
    <button
      type="button"
      className={`edit-toggle${editing ? " edit-toggle--on" : ""}`}
      aria-pressed={editing}
      onClick={() => setEditing(!editing)}
    >
      {editing ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 5 5 9-10" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
          <path d="m13.5 6.5 4 4" />
        </svg>
      )}
      {editing ? t("edit.done") : t("edit.start")}
    </button>
  );
}
