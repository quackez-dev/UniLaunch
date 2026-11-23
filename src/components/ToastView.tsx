import { useStore, useT } from "../store";
import "./ToastView.css";

/** Notification en bas de la fenêtre (avec « Annuler » si l'action le permet). */
export function ToastView() {
  const t = useT();
  const toast = useStore((s) => s.toast);
  const hideToast = useStore((s) => s.hideToast);
  if (!toast) return null;

  return (
    <div className={`toast toast--${toast.tone}`} role={toast.tone === "error" ? "alert" : "status"}>
      <span className="toast__dot" aria-hidden="true" />
      <span className="toast__text">{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          className="toast__undo"
          onClick={() => {
            toast.undo?.();
            hideToast();
          }}
        >
          {t("toast.undo")}
        </button>
      )}
    </div>
  );
}
