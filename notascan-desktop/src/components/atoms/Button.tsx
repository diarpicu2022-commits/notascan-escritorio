import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "./Icon";

/** Tres puntos que laten mientras una acción está en curso. */
export function Dots() {
  return <span className="ns-dots" aria-hidden><i /><i /><i /></span>;
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "icon";
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  loadingText?: string;
  success?: boolean;
  successText?: ReactNode;
  block?: boolean;
  /** Fuerza un estado visual (solo para documentar el sistema). */
  state?: "hover" | "active" | "focus";
  children?: ReactNode;
}

export function Button({
  variant = "primary", size = "md", icon, iconRight, loading = false, loadingText, success = false, successText,
  block, state, className, type = "button", disabled, children, ...other
}: ButtonProps) {
  let content: ReactNode;
  if (loading) content = <><Dots /><span>{loadingText || "Guardando…"}</span></>;
  else if (success) content = <><Icon name="check" size={18} /><span>{successText || children}</span></>;
  else content = <>{icon ? <Icon name={icon} size={size === "sm" ? 16 : 18} /> : null}{children}{iconRight ? <Icon name={iconRight} size={18} /> : null}</>;

  return (
    <button
      type={type}
      className={cx(
        "ns-btn", "ns-btn--" + (variant === "icon" ? "secondary ns-btn--icon" : variant),
        size !== "md" && "ns-btn--" + size, success && "ns-btn--success", block && "ns-btn--block", state && "is-" + state, className,
      )}
      aria-busy={loading || undefined}
      disabled={disabled || loading || undefined}
      {...other}
    >
      {content}
    </button>
  );
}
