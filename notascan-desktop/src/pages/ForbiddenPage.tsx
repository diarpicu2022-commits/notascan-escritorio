import { ROLE_NAME } from "../app/AuthContext";
import { useShell } from "../app/ShellContext";
import { Button } from "../components/atoms/Button";
import { EmptyState } from "../components/organisms/EmptyState";
import { PageShell } from "../components/templates/PageShell";
import type { DesktopRole } from "../data/roles";

/**
 * «Sin permiso» (aprobada el 2026-10-01): dentro del marco del propio rol, el EmptyState de error con
 * candado del sistema — el mismo patrón que «Boletines bloqueados» — y una salida a su inicio.
 * La base también lo impide (RLS); esta vista solo lo explica.
 */
export function ForbiddenPage({ sectionRole }: { sectionRole: DesktopRole }) {
  const { role, navigate } = useShell();
  return (
    <PageShell active="">
      <EmptyState
        tone="error" icon="lock" title="No tienes permiso para ver esta sección."
        message={"Esta sección es de " + ROLE_NAME[sectionRole] + " y tu cuenta es de " + ROLE_NAME[role] + "."}
        action={<Button icon="dashboard" onClick={() => navigate("dashboard")}>Ir a mi inicio</Button>}
      />
    </PageShell>
  );
}
