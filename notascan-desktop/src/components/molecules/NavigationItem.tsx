import type { MouseEvent } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "../atoms/Icon";

interface NavigationItemProps {
  icon: IconName;
  label: string;
  active?: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  count?: number;
  index?: string;
  href?: string;
  state?: "hover";
  onClick?: (e: MouseEvent) => void;
  className?: string;
}

/** Ítem del sidebar: activo en bloque navy con aria-current, numeración «01» o contador de pendientes. */
export function NavigationItem({ icon, label, active, disabled, collapsed: rail, count, index, href, state, onClick, className }: NavigationItemProps) {
  const Tag = href ? "a" : "button";
  return (
    <Tag
      href={href} type={href ? undefined : "button"}
      className={cx("ns-nav-item", rail && "ns-nav-item--rail", state && "is-" + state, className)}
      aria-current={active ? "page" : undefined} aria-disabled={disabled || undefined}
      aria-label={rail ? label : undefined} title={rail ? label : undefined}
      onClick={(e: MouseEvent) => { if (disabled) { e.preventDefault(); return; } onClick?.(e); }}
    >
      <Icon name={icon} size={20} />
      {rail ? null : <span>{label}</span>}
      {rail ? null : count ? <span className="ns-nav-item-count" aria-label={count + " pendientes"}>{count}</span>
        : index ? <span className="ns-nav-item-index" aria-hidden>{index}</span> : null}
    </Tag>
  );
}
