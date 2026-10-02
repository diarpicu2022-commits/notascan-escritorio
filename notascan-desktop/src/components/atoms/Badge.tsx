import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "./Icon";

export type BadgeTone = "neutral" | "high" | "medium" | "low" | "verified" | "pending" | "review" | "solid";

/** Icono por defecto de cada tono: el color nunca va solo. */
export const BADGE_ICON: Partial<Record<BadgeTone, IconName>> = {
  high: "check", verified: "check", medium: "ai", low: "warning", review: "warning", pending: "clock",
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: IconName | false;
  title?: string;
  className?: string;
  children?: ReactNode;
}

export function Badge({ tone = "neutral", icon, title, className, children }: BadgeProps) {
  const name = icon === false ? null : icon || BADGE_ICON[tone];
  return (
    <span className={cx("ns-badge", "ns-badge--" + tone, className)} title={title}>
      {name ? <Icon name={name} size={14} /> : null}
      {children}
    </span>
  );
}
