import { useState } from "react";
import { cx } from "../../lib/cx";
import type { NavItem } from "../../data/roles";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { BrandTile, Logo } from "../atoms/Logo";
import { NavigationItem } from "../molecules/NavigationItem";
import { UserProfile } from "../molecules/UserProfile";
import type { Institution } from "../../services/institution";
import { SchoolBadge } from "./InstitutionIdentity";
import { PreferencesDrawer } from "./Preferences";
import { useI18n } from "../../i18n/I18nProvider";

interface SidebarProps {
  items: NavItem[];
  active?: string;
  collapsed?: boolean;
  user: { name: string; role: string };
  course?: string;
  courseLabel?: string;
  /** Colegio de la sesión (modo normal). Sin él, el marco del sistema. */
  school?: Institution | null;
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  onClose?: () => void;
  className?: string;
}

/** Navegación global. Solo navega: sin filtros, títulos ni acciones de página. */
export function Sidebar({ items, active, collapsed: rail, user, course, courseLabel, school, onNavigate, onLogout, onClose, className }: SidebarProps) {
  const { t } = useI18n();
  const [prefsOpen, setPrefsOpen] = useState(false);
  return (
    <aside className={cx("ns-sidebar", rail && "ns-sidebar--rail", className)} aria-label="Navegación principal">
      <div className="ns-sidebar-brand">
        {rail ? <Logo size={30} markOnly /> : <BrandTile />}
        {onClose ? <Button variant="ghost" size="sm" className="ns-btn--icon" aria-label="Cerrar menú" onClick={onClose}><Icon name="close" size={16} /></Button> : null}
      </div>
      <nav>
        {rail ? null : <div className="ns-sidebar-section">Navegación</div>}
        <ul>
          {items.map((it, i) => (
            <li key={it.id}>
              <NavigationItem
                icon={it.icon} label={it.label} collapsed={rail} active={active === it.id} count={it.count} disabled={it.disabled}
                index={String(i + 1).padStart(2, "0")} onClick={() => onNavigate?.(it.id)}
              />
            </li>
          ))}
        </ul>
      </nav>
      <div className="ns-sidebar-foot">
        {rail || !school ? null : <SchoolBadge institution={school} />}
        {rail || !course ? null : (
          <div className="ns-sidebar-course">
            <span className="ns-overline">{courseLabel || "Periodo 3 · 2026"}</span>
            <span style={{ font: "600 14px/20px var(--font-ui)" }}>{course}</span>
          </div>
        )}
        <div className="ns-sidebar-user">
          <UserProfile name={user.name} role={user.role} compact={rail} />
          {/* Preferencias (anexo 2026-11-08-idiomas, I1): mismo botón fantasma que «Cerrar sesión», a su lado. */}
          {!rail ? (
            <Button data-enmienda="11" variant="ghost" size="sm" className="ns-btn--icon" aria-label={t.prefs.open} title={t.prefs.open} aria-haspopup="dialog" onClick={() => setPrefsOpen(true)}><Icon name="settings" size={16} /></Button>
          ) : null}
          {onLogout && !rail ? (
            <Button variant="ghost" size="sm" className="ns-btn--icon" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onLogout}><Icon name="logout" size={16} /></Button>
          ) : null}
          <PreferencesDrawer open={prefsOpen} onClose={() => setPrefsOpen(false)} />
        </div>
      </div>
    </aside>
  );
}
