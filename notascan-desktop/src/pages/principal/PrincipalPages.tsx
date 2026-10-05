import { useState, type ReactNode } from "react";
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
import { ErrorState, LoadingBlocks } from "../../components/organisms/QueryState";
import { useAuth } from "../../app/AuthContext";
import { DEMO } from "../../lib/supabase";
import { decideMessage, useAnalytics, useDecideRequest, useMonitoring, usePendingCount, useRequests } from "../../services/principal";
import { useObservations } from "../../services/teacher";
import { useMyInstitution } from "../../services/institution";
import { forcedState } from "../../services/client";
import { queryState } from "../teacher/states";

/* Rectoría: densidad equilibrada, indicadores, gráficos que responden una pregunta y decisiones. */

type Analytics = ReturnType<typeof useAnalytics>;

/** Indicadores y gráficos: los del sistema en demostración; los de la base, con carga, error y vacío. */
function analyticsBody(an: Analytics, goal: number | undefined, hideFilters: boolean, onPeriod?: (p: string) => void): ReactNode {
  const q = an.academic;
  if (q.data?.demo) return <InstitutionalAnalytics hideFilters={hideFilters} />;
  if (q.isPending && !q.data) return <LoadingBlocks rows={4} height={120} label="Cargando la analítica" />;
  if (q.isError && !q.data) return <ErrorState title="No pudimos cargar la analítica." onRetry={() => q.refetch()} />;
  if (!an.data) return <EmptyState icon="reports" title="Aún no hay notas verificadas." message="Los indicadores aparecen cuando los docentes verifiquen las primeras notas del periodo." />;
  return <InstitutionalAnalytics hideFilters={hideFilters} data={an.data} goal={goal} onPeriod={onPeriod} />;
}

/** «Periodo 3 · 2026» del periodo que se muestra (en demostración, el del sistema). */
function periodLabel(an: Analytics): string {
  const p = an.academic.data?.periods.find((x) => x.name === an.data?.period) ?? an.academic.data?.periods.find((x) => x.status === "open");
  return DEMO || !p ? "Periodo 3 · 2026" : p.name + (p.year ? " · " + p.year : "");
}

export function PrincipalDashboardPage() {
  const { navigate: go } = useShell();
  const rq = useRequests();
  const pend = (rq.data ?? []).filter((r) => r.status === "pending");
  const mq = useMonitoring();
  const an = useAnalytics();
  const goal = useMyInstitution().data?.goal;
  const attention = (mq.data ?? []).filter((t) => t.status !== "ok");
  const teachers = queryState(mq, "Cargando el seguimiento docente", "No pudimos cargar el seguimiento docente.")
    ?? (!attention.length ? <EmptyState icon="check" title={mq.data?.length ? "Todos los docentes están al día." : "Aún no hay asignaciones en el periodo abierto."} message="Aquí aparecen los docentes con calificaciones atrasadas." /> : null);
  // Sobre el bloque navy, los estados usan la lista inversa del sistema (el EmptyState no tiene versión inversa).
  const failed = rq.isError && !rq.data;
  const note = (title: string, caption: string) => <ul className="ns-list ns-list--inverse"><li className="ns-list-item"><div className="ns-list-main"><strong>{title}</strong><span className="ns-caption">{caption}</span></div></li></ul>;
  const decisions = rq.isPending && !rq.data ? <LoadingBlocks rows={3} height={40} label="Cargando las solicitudes" />
    : failed ? note("No pudimos cargar las solicitudes.", "Revisa tu conexión e inténtalo de nuevo.")
      : !pend.length ? note("No hay solicitudes pendientes.", "Las nuevas solicitudes de los docentes aparecerán aquí.") : null;
  return (
    <PageShell active="dashboard" counts={{ requests: pend.length }}>
      <Header eyebrow={"Rectoría · " + periodLabel(an)} title="Panorama Institucional" highlight="Institucional" description="Cómo va el colegio y qué necesita tu decisión hoy."
        actions={<Button iconRight="arrow" onClick={() => go("analytics")}>Ver analítica completa</Button>} />
      <div className="ns-principal-top">
        <Block tone="navy" className="ns-decide">
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <span className="ns-overline" style={{ color: "var(--gold)" }}>Esperan tu decisión</span>
            {rq.data ? <Sticker tone="gold" rotate={3}>{pend.length + (pend.length === 1 ? " solicitud" : " solicitudes")}</Sticker> : null}
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
          {teachers ?? <ul className="ns-list">
            {attention.map((t) => (
              <li key={t.id} className="ns-list-item">
                <Avatar name={t.name} size="sm" />
                <div className="ns-list-main"><strong>{t.name}</strong><span className="ns-caption">{t.pending + (t.pending === 1 ? " evaluación pendiente" : " evaluaciones pendientes") + " · " + t.last}</span></div>
                <TeacherStatus status={t.status} />
              </li>
            ))}
          </ul>}
        </Block>
      </div>
      {analyticsBody(an, goal, true)}
    </PageShell>
  );
}

export function AnalyticsPage() {
  const pending = usePendingCount();
  const [period, setPeriod] = useState<string | undefined>();
  const an = useAnalytics(period);
  const goal = useMyInstitution().data?.goal;
  return (
    <PageShell active="analytics" counts={{ requests: pending }}>
      <Header eyebrow="Analítica" title="Rendimiento institucional" highlight="institucional" description="Cada gráfico responde una pregunta. Pasa el cursor sobre las barras y puntos para ver el detalle."
        actions={<Button variant="secondary" icon="download">Exportar informe</Button>} />
      {analyticsBody(an, goal, false, setPeriod)}
    </PageShell>
  );
}

export function TeacherMonitoringPage() {
  const pending = usePendingCount();
  const mq = useMonitoring();
  const an = useAnalytics();
  // El recordatorio aún no tiene canal real (decisión pendiente): solo se muestra en demostración.
  const body = queryState(mq, "Cargando el seguimiento docente", "No pudimos cargar el seguimiento docente.")
    ?? (!mq.data?.length ? <EmptyState icon="students" title="Aún no hay asignaciones en el periodo abierto." message="Secretaría arma la malla curricular; el avance de cada docente aparecerá aquí." />
      : DEMO ? <TeacherMonitoringPanel /> : <TeacherMonitoringPanel rows={mq.data} remind={false} />);
  return (
    <PageShell active="teachers" counts={{ requests: pending }}>
      <Header eyebrow={"Supervisión · " + periodLabel(an).split(" · ")[0]} title="Seguimiento Docente" highlight="Docente" description="Avance del registro de calificaciones por docente. Verde: al día · Amarillo: requiere atención · Rojo: retraso." />
      {body}
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
