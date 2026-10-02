import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Sticker } from "../atoms/Sticker";

export interface HeaderTab { value: string; label: string }

interface HeaderProps {
  eyebrow?: string;
  sticker?: string;
  title: string;
  /** Palabra clave del título que lleva el marcador gold. */
  highlight?: string;
  description?: string;
  actions?: ReactNode;
  tabs?: HeaderTab[];
  tab?: string;
  onTab?: (v: string) => void;
  className?: string;
}

function renderTitle(title: string, hl?: string): ReactNode {
  if (!hl || title.indexOf(hl) < 0) return title;
  const i = title.indexOf(hl);
  return [title.slice(0, i), <mark key="m" className="ns-mark">{hl}</mark>, title.slice(i + hl.length)];
}

/** Navegación local: contexto, título, descripción, una sola acción primaria y pestañas. */
export function Header({ eyebrow, sticker, title, highlight, description, actions, tabs, tab, onTab, className }: HeaderProps) {
  return (
    <header className={cx("ns-header", className)}>
      <div>
        {eyebrow || sticker ? (
          <div className="ns-header-eyebrow">
            {eyebrow ? <span className="ns-overline">{eyebrow}</span> : null}
            {sticker ? <Sticker tone="sage" rotate={-3} icon="check" className="ns-header-sticker">{sticker}</Sticker> : null}
          </div>
        ) : null}
        <h1 className="ns-header-title">{renderTitle(title, highlight)}</h1>
        {description ? <p className="ns-header-desc">{description}</p> : null}
      </div>
      {actions ? <div className="ns-header-actions">{actions}</div> : null}
      {tabs ? (
        <div className="ns-tabs" role="tablist" aria-label={"Secciones de " + title}>
          {tabs.map((t) => (
            <button key={t.value} role="tab" type="button" className="ns-tab" aria-selected={tab === t.value} onClick={() => onTab?.(t.value)}>{t.label}</button>
          ))}
        </div>
      ) : null}
    </header>
  );
}
