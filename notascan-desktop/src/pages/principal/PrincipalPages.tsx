import { useShell } from "../../app/ShellContext";
import { formatGrade } from "../../lib/grade";
import { Avatar } from "../../components/atoms/Avatar";
import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { Sticker } from "../../components/atoms/Sticker";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { ObserverTimeline } from "../../components/organisms/Observer";
import { AuthorizationInbox, InstitutionalAnalytics, TeacherMonitoringPanel, TeacherStatus } from "../../components/organisms/principal/PrincipalPanels";
import { PageShell } from "../../components/templates/PageShell";
import { TEACHERS } from "../../data/academic";
import { REQUESTS } from "../../data/principal";

/* Rectoría: densidad equilibrada, indicadores, gráficos que responden una pregunta y decisiones. */

export function PrincipalDashboardPage() {
  const { navigate: go } = useShell();
  const pend = REQUESTS.filter((r) => r.status === "pending");
  const attention = TEACHERS.filter((t) => t.status !== "ok");
  return (
    <PageShell active="dashboard" counts={{ requests: pend.length }}>
      <Header eyebrow="Rectoría · Periodo 3 · 2026" title="Panorama Institucional" highlight="Institucional" description="Cómo va el colegio y qué necesita tu decisión hoy."
        actions={<Button iconRight="arrow" onClick={() => go("analytics")}>Ver analítica completa</Button>} />
      <div className="ns-principal-top">
        <Block tone="navy" className="ns-decide">
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <span className="ns-overline" style={{ color: "var(--gold)" }}>Esperan tu decisión</span>
            <Sticker tone="gold" rotate={3}>{pend.length + " solicitudes"}</Sticker>
          </div>
          <ul className="ns-list ns-list--inverse">
            {pend.map((r) => (
              <li key={r.id} className="ns-list-item">
                <div className="ns-list-main"><strong>{"Solicitud #" + r.id + " · " + r.subject}</strong><span className="ns-caption">{r.teacher + " · " + r.student.split(" ").slice(0, 2).join(" ")}</span></div>
                <span className="ns-change">{formatGrade(r.from)}<Icon name="arrow" size={14} />{formatGrade(r.to)}</span>
              </li>
            ))}
          </ul>
          <div><Button iconRight="arrow" onClick={() => go("requests")}>Revisar solicitudes</Button></div>
        </Block>
        <Block label="Docentes que requieren atención">
          <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("teachers")}>Seguimiento</Button>}>Docentes con pendientes</BlockTitle>
          <ul className="ns-list">
            {attention.map((t) => (
              <li key={t.id} className="ns-list-item">
                <Avatar name={t.name} size="sm" />
                <div className="ns-list-main"><strong>{t.name}</strong><span className="ns-caption">{t.pending + (t.pending === 1 ? " evaluación pendiente" : " evaluaciones pendientes") + " · " + t.last}</span></div>
                <TeacherStatus status={t.status} />
              </li>
            ))}
          </ul>
        </Block>
      </div>
      <InstitutionalAnalytics hideFilters />
    </PageShell>
  );
}

export function AnalyticsPage() {
  return (
    <PageShell active="analytics" counts={{ requests: 3 }}>
      <Header eyebrow="Analítica" title="Rendimiento institucional" highlight="institucional" description="Cada gráfico responde una pregunta. Pasa el cursor sobre las barras y puntos para ver el detalle."
        actions={<Button variant="secondary" icon="download">Exportar informe</Button>} />
      <InstitutionalAnalytics />
    </PageShell>
  );
}

export function TeacherMonitoringPage() {
  return (
    <PageShell active="teachers" counts={{ requests: 3 }}>
      <Header eyebrow="Supervisión · Periodo 3" title="Seguimiento Docente" highlight="Docente" description="Avance del registro de calificaciones por docente. Verde: al día · Amarillo: requiere atención · Rojo: retraso." />
      <TeacherMonitoringPanel />
    </PageShell>
  );
}

export function RequestsPage() {
  return (
    <PageShell active="requests" counts={{ requests: 3 }}>
      <Header eyebrow="Bandeja de autorizaciones" title="Solicitudes" highlight="Solicitudes" description="Cambios de nota que los docentes solicitan después del cierre. Cada decisión queda en el historial." />
      <AuthorizationInbox />
    </PageShell>
  );
}

export function ObserverPage() {
  return (
    <PageShell active="observer" counts={{ requests: 3 }}>
      <Header eyebrow="Convivencia" title="Observador" highlight="Observador" description="Anotaciones recientes de toda la institución, en orden cronológico." />
      <Block><ObserverTimeline showStudent /></Block>
    </PageShell>
  );
}
