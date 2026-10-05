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
import { EmptyState } from "../../components/organisms/EmptyState";
import { LoadingBlocks } from "../../components/organisms/QueryState";
import { TEACHERS } from "../../data/academic";
import { useAuth } from "../../app/AuthContext";
import { DEMO } from "../../lib/supabase";
import { decideMessage, useDecideRequest, usePendingCount, useRequests } from "../../services/principal";
import { useObservations } from "../../services/teacher";
import { forcedState } from "../../services/client";
import { queryState } from "../teacher/states";

/* Rectoría: densidad equilibrada, indicadores, gráficos que responden una pregunta y decisiones. */

export function PrincipalDashboardPage() {
  const { navigate: go } = useShell();
  const rq = useRequests();
  const pend = (rq.data ?? []).filter((r) => r.status === "pending");
  const attention = TEACHERS.filter((t) => t.status !== "ok");
  // Sobre el bloque navy, los estados usan la lista inversa del sistema (el EmptyState no tiene versión inversa).
  const failed = rq.isError && !rq.data;
  const note = (title: string, caption: string) => <ul className="ns-list ns-list--inverse"><li className="ns-list-item"><div className="ns-list-main"><strong>{title}</strong><span className="ns-caption">{caption}</span></div></li></ul>;
  const decisions = rq.isPending && !rq.data ? <LoadingBlocks rows={3} height={40} label="Cargando las solicitudes" />
    : failed ? note("No pudimos cargar las solicitudes.", "Revisa tu conexión e inténtalo de nuevo.")
      : !pend.length ? note("No hay solicitudes pendientes.", "Las nuevas solicitudes de los docentes aparecerán aquí.") : null;
  return (
    <PageShell active="dashboard" counts={{ requests: pend.length }}>
      <Header eyebrow="Rectoría · Periodo 3 · 2026" title="Panorama Institucional" highlight="Institucional" description="Cómo va el colegio y qué necesita tu decisión hoy."
        actions={<Button iconRight="arrow" onClick={() => go("analytics")}>Ver analítica completa</Button>} />
      <div className="ns-principal-top">
        <Block tone="navy" className="ns-decide">
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <span className="ns-overline" style={{ color: "var(--gold)" }}>Esperan tu decisión</span>
            {rq.data ? <Sticker tone="gold" rotate={3}>{pend.length + " solicitudes"}</Sticker> : null}
          </div>
          {decisions ?? <ul className="ns-list ns-list--inverse">
            {pend.map((r) => (
              <li key={r.id} className="ns-list-item">
                <div className="ns-list-main"><strong>{"Solicitud #" + r.id + " · " + r.subject}</strong><span className="ns-caption">{r.teacher + " · " + r.student.split(" ").slice(0, 2).join(" ")}</span></div>
                <span className="ns-change">{formatGrade(r.from)}<Icon name="arrow" size={14} />{formatGrade(r.to)}</span>
              </li>
            ))}
          </ul>}
          <div>{failed ? <Button icon="refresh" onClick={() => rq.refetch()}>Reintentar</Button> : <Button iconRight="arrow" onClick={() => go("requests")}>Revisar solicitudes</Button>}</div>
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
  const pending = usePendingCount();
  return (
    <PageShell active="analytics" counts={{ requests: pending }}>
      <Header eyebrow="Analítica" title="Rendimiento institucional" highlight="institucional" description="Cada gráfico responde una pregunta. Pasa el cursor sobre las barras y puntos para ver el detalle."
        actions={<Button variant="secondary" icon="download">Exportar informe</Button>} />
      <InstitutionalAnalytics />
    </PageShell>
  );
}

export function TeacherMonitoringPage() {
  const pending = usePendingCount();
  return (
    <PageShell active="teachers" counts={{ requests: pending }}>
      <Header eyebrow="Supervisión · Periodo 3" title="Seguimiento Docente" highlight="Docente" description="Avance del registro de calificaciones por docente. Verde: al día · Amarillo: requiere atención · Rojo: retraso." />
      <TeacherMonitoringPanel />
    </PageShell>
  );
}

export function RequestsPage() {
  const rq = useRequests();
  const pending = (rq.data ?? []).filter((r) => r.status === "pending").length;
  const me = useAuth().profile;
  const decide = useDecideRequest();
  const body = queryState(rq, "Cargando las solicitudes", "No pudimos cargar las solicitudes.");
  return (
    <PageShell active="requests" counts={{ requests: pending }}>
      <Header eyebrow="Bandeja de autorizaciones" title="Solicitudes" highlight="Solicitudes" description="Cambios de nota que los docentes solicitan después del cierre. Cada decisión queda en el historial." />
      {body ?? (DEMO ? <AuthorizationInbox source={forcedState() ? rq.data : undefined} /> : (
        <AuthorizationInbox source={rq.data} decider={me?.fullName ?? "Rectoría"} errorMessage={decideMessage}
          onDecide={(id, decision, note) => decide.mutateAsync({ id, decision, note })} />
      ))}
    </PageShell>
  );
}

export function ObserverPage() {
  const pending = usePendingCount();
  const q = useObservations();
  const body = queryState(q, "Cargando las anotaciones", "No pudimos cargar las anotaciones.")
    ?? (!q.data?.length ? <EmptyState icon="eye" title="Aún no hay anotaciones." message="Las observaciones que registren los docentes aparecerán aquí en orden cronológico." /> : <ObserverTimeline items={q.data} showStudent />);
  return (
    <PageShell active="observer" counts={{ requests: pending }}>
      <Header eyebrow="Convivencia" title="Observador" highlight="Observador" description="Anotaciones recientes de toda la institución, en orden cronológico." />
      <Block>{body}</Block>
    </PageShell>
  );
}
