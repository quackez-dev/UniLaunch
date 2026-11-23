import { useEffect, useId, useRef, type ReactNode } from "react";
import { useT } from "../store";
import "./Dialog.css";

type Props = {
  title: string;
  subtitle?: string;
  onClose(): void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

/** Fenêtre modale : fond assombri, Échap pour fermer, focus gardé à l'intérieur. */
export function Dialog({ title, subtitle, onClose, children, footer, width = 520 }: Props) {
  const t = useT();
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef<Element | null>(null);

  useEffect(() => {
    previous.current = document.activeElement;
    // Priorité au champ marqué `data-autofocus`, sinon le premier champ du contenu.
    const first =
      ref.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      ref.current?.querySelector<HTMLElement>(".dialog__body input, .dialog__body select, .dialog__body textarea, .dialog__body button");
    first?.focus();
    return () => (previous.current as HTMLElement | null)?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const focusable = Array.from(
      ref.current.querySelectorAll<HTMLElement>("button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])"),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="dialog-backdrop" onKeyDown={onKeyDown}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ maxWidth: width }}>
        <div className="dialog__header">
          <div className="dialog__titles">
            <h2 id={titleId} className="dialog__title">
              {title}
            </h2>
            {subtitle && <span className="dialog__subtitle">{subtitle}</span>}
          </div>
          <button type="button" className="icon-btn" aria-label={t("dialog.close")} onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
