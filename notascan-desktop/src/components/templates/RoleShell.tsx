import type { CSSProperties, ReactNode } from "react";
import { useSync } from "../../app/SyncContext";
import { ROLES, roleNav, type DesktopRole } from "../../data/roles";
import { Icon } from "../atoms/Icon";
import { ConnectivityStatus } from "../molecules/ConnectivityStatus";
import { GlobalSearch } from "../molecules/GlobalSearch";
import { AppShell } from "./AppShell";

export interface RoleShellProps {
  role: DesktopRole;
  active?: string;
  counts?: Record<string, number> | null;
  overlay?: ReactNode;
  onNavigate?: (page: string, params?: { id?: string; tab?: string }) => void;
  onLogout?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

/** AppShell + navegación del rol + herramientas: chip de rol, búsqueda global y, para el docente, conexión. */
export function RoleShell({ role, active, counts, overlay, onNavigate, onLogout, style, children }: RoleShellProps) {
  const r = ROLES[role];
  const { sync, setSync, onSync } = useSync();
  const tools = (
    <>
      <span className="ns-role-chip"><Icon name="shield" size={14} />{r.label}</span>
      <GlobalSearch onOpenStudent={(s, tab) => onNavigate?.("profile", { id: s.id, tab })} />
      {role === "teacher" ? (
        <ConnectivityStatus
          status={sync.status} lastSync={sync.last} pending={sync.pending} onSync={onSync}
          onToggleOffline={(v) => setSync({ ...sync, status: v ? "offline" : "online" })}
        />
      ) : null}
    </>
  );
  // Como el sistema: sin contadores propios (undefined o null) se usan los del rol.
  const navCounts = counts || (role === "teacher" ? { grades: 8 } : role === "principal" ? { requests: 3 } : null);
  return (
    <AppShell
      active={active} onNavigate={onNavigate} onLogout={onLogout} style={style} overlay={overlay}
      items={roleNav(role, navCounts)} user={r.user} course={r.course} courseLabel={r.courseLabel} density={r.density} topbar={tools}
    >
      {children}
    </AppShell>
  );
}
