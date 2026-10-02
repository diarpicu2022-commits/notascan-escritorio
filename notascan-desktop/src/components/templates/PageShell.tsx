import type { ReactNode } from "react";
import { useAuth } from "../../app/AuthContext";
import { useShell } from "../../app/ShellContext";
import { ROLES } from "../../data/roles";
import { RoleShell } from "./RoleShell";

/* Ítems que se iluminan en el menú cuando la página no tiene uno propio (ALIAS del sistema). */
const ALIAS: Record<string, string> = { grade: "grades", review: "grades", evaluations: "grades" };

interface PageShellProps {
  active: string;
  counts?: Record<string, number> | null;
  overlay?: ReactNode;
  children?: ReactNode;
}

/** Marco de una página dentro del rol activo: RoleShell con navegación y cierre de sesión del contexto. */
export function PageShell({ active, counts, overlay, children }: PageShellProps) {
  const { role, navigate, logout } = useShell();
  const { profile } = useAuth();
  const user = profile ? { name: profile.fullName, role: ROLES[role].user.role } : undefined;
  return (
    <RoleShell role={role} active={ALIAS[active] || active} counts={counts} overlay={overlay} user={user} onNavigate={navigate} onLogout={logout}>
      {children}
    </RoleShell>
  );
}
