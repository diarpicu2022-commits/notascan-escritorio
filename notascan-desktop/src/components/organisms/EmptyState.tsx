import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../atoms/Icon";

interface EmptyStateProps {
  tone?: "error";
  icon?: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

/** Vacío o error, siempre con una salida. */
export function EmptyState({ tone, icon, title, message, action, className }: EmptyStateProps) {
  const err = tone === "error";
  return (
    <section className={cx("ns-empty", err && "ns-empty--error", className)}>
      <span className="ns-empty-seal" aria-hidden><Icon name={icon || (err ? "warning" : "evaluations")} size={26} /></span>
      <h3 className="ns-empty-title">{title}</h3>
      {message ? <p className="ns-empty-text">{message}</p> : null}
      {action || null}
    </section>
  );
}
