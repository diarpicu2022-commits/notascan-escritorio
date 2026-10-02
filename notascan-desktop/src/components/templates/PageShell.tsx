import type { ReactNode } from "react";
import { useShell } from "../../app/ShellContext";
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
  return (
    <RoleShell role={role} active={ALIAS[active] || active} counts={counts} overlay={overlay} onNavigate={navigate} onLogout={logout}>
      {children}
    </RoleShell>
  );
}
