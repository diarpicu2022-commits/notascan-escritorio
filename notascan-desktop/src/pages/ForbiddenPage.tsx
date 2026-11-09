import { useShell } from "../app/ShellContext";
import { Button } from "../components/atoms/Button";
import { EmptyState } from "../components/organisms/EmptyState";
import { PageShell } from "../components/templates/PageShell";
import type { DesktopRole } from "../data/roles";
import { useI18n } from "../i18n/I18nProvider";


/**
 * «Sin permiso» (aprobada el 2026-10-01): dentro del marco del propio rol, el EmptyState de error con
 * candado del sistema — el mismo patrón que «Boletines bloqueados» — y una salida a su inicio.
 * La base también lo impide (RLS); esta vista solo lo explica.
 */
export function ForbiddenPage({ sectionRole }: { sectionRole: DesktopRole }) {
  const { role, navigate } = useShell();
  const { t } = useI18n();
  return (
    <PageShell active="">
      <EmptyState
        tone="error" icon="lock" title={t.forbidden.title}
        message={t.forbidden.text(t.roles[sectionRole], t.roles[role])}
        action={<Button icon="dashboard" onClick={() => navigate("dashboard")}>{t.forbidden.home}</Button>}
      />
    </PageShell>
  );
}
