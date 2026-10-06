import type { CSSProperties, ReactNode } from "react";
import { useSync } from "../../app/SyncContext";
import { ROLES, roleNav, type DesktopRole } from "../../data/roles";
import { Icon } from "../atoms/Icon";
import { ConnectivityStatus } from "../molecules/ConnectivityStatus";
import { GlobalSearch } from "../molecules/GlobalSearch";
import { AppShell } from "./AppShell";
import type { Institution } from "../../services/institution";

export interface RoleShellProps {
  role: DesktopRole;
  active?: string;
  counts?: Record<string, number> | null;
  overlay?: ReactNode;
  /** Persona con sesión (perfil real). Sin ella se muestra la persona de ejemplo del rol. */
  user?: { name: string; role: string };
  school?: Institution | null;
  /** Tarjeta de contexto del menú con datos reales; `null` la oculta; sin ella, la del sistema. */
  context?: { label: string; value: string } | null;
  onNavigate?: (page: string, params?: { id?: string; tab?: string }) => void;
  onLogout?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

/** AppShell + navegación del rol + herramientas: chip de rol, búsqueda global y, para el docente, conexión. */
export function RoleShell({ role, active, counts, overlay, user, school, context, onNavigate, onLogout, style, children }: RoleShellProps) {
  const r = ROLES[role];
  const { sync, setSync, onSync, enqueue, notice } = useSync();
  const tools = (
    <>
      <span className="ns-role-chip"><Icon name="shield" size={14} />{r.label}</span>
      {role === "platform" ? null : <GlobalSearch onOpenStudent={(s, tab) => onNavigate?.("profile", { id: s.id, tab })} />}
      {role === "teacher" ? (
        <ConnectivityStatus
          status={sync.status} lastSync={sync.last} pending={sync.pending} onSync={onSync} notice={notice ?? undefined}
          // El interruptor «Trabajar sin conexión» es de la demostración; con sesión real manda la conexión del equipo.
          onToggleOffline={enqueue ? undefined : (v) => setSync({ ...sync, status: v ? "offline" : "online" })}
        />
      ) : null}
    </>
  );
  // Como el sistema: sin contadores propios (undefined o null) se usan los del rol.
  const navCounts = counts || (role === "teacher" ? { grades: 8 } : role === "principal" ? { requests: 3 } : null);
  return (
    <AppShell
      active={active} onNavigate={onNavigate} onLogout={onLogout} style={style} overlay={overlay}
      items={roleNav(role, navCounts)} user={user || r.user} school={school} course={context === undefined ? r.course : context?.value ?? ""} courseLabel={context === undefined ? r.courseLabel : context?.label ?? ""} density={r.density} topbar={tools}
    >
      {children}
    </AppShell>
  );
}
