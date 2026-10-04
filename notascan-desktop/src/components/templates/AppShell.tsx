import { useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import type { NavItem } from "../../data/roles";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { Logo } from "../atoms/Logo";
import { Sidebar } from "../organisms/Sidebar";
import type { Institution } from "../../services/institution";

export interface AppShellProps {
  items: NavItem[];
  active?: string;
  user: { name: string; role: string };
  course?: string;
  courseLabel?: string;
  school?: Institution | null;
  density?: "dense" | "balanced";
  /** Herramientas globales del shell (rol, búsqueda, conexión). */
  topbar?: ReactNode;
  overlay?: ReactNode;
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Plantilla: sidebar fijo + área principal sobre el lienzo de puntos. En ventanas estrechas el sidebar es un cajón. */
export function AppShell({ items, active, user, course, courseLabel, school, density, topbar, overlay, onNavigate, onLogout, style, children }: AppShellProps) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="ns ns-app ns-canvas" style={style}>
      <div className={cx("ns-app-side", drawer && "is-open")}>
        <Sidebar
          active={active} course={course || "Matemáticas · 7A"} courseLabel={courseLabel} school={school} user={user} onLogout={onLogout} items={items}
          onNavigate={(id) => { setDrawer(false); onNavigate?.(id); }}
          onClose={drawer ? () => setDrawer(false) : undefined}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="ns-app-topbar">
          <Logo size={24} />
          <Button variant="icon" size="sm" aria-label="Abrir menú" onClick={() => setDrawer(true)}><Icon name="menu" size={18} /></Button>
        </div>
        <main className={cx("ns-app-main", density && "ns-density-" + density)}>
          {topbar ? <div className="ns-app-tools">{topbar}</div> : null}
          {children}
        </main>
      </div>
      {overlay || null}
    </div>
  );
}
