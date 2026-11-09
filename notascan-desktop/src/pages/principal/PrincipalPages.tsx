import { useState, type ReactNode } from "react";
import { useShell } from "../../app/ShellContext";
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
import { reminderText, useSendReminder } from "../../services/reminders";
import { FORMAT_LABEL, buildAnalyticsReport, downloadCsv, downloadXlsx, useSaveReportHistory, type ReportFormat } from "../../services/reports";
import { PrintReport, type ReportData } from "../../components/organisms/ReportDocument";
import { Modal } from "../../components/organisms/Overlays";
import { useToast } from "../../components/organisms/Toast";
import { FilterGroup } from "../../components/molecules/Filters";
import { forcedState } from "../../services/client";
import { queryState } from "../teacher/states";
import { useI18n } from "../../i18n/I18nProvider";
import { usePrintNotice } from "../../components/organisms/PrintNotice";
import { seenText } from "../../i18n/seen";
import type { Messages } from "../../i18n/es";

/* Rectoría: densidad equilibrada, indicadores, gráficos que responden una pregunta y decisiones. */

type Analytics = ReturnType<typeof useAnalytics>;

/** Indicadores y gráficos: los del sistema en demostración; los de la base, con carga, error y vacío. */
function analyticsBody(t: Messages, an: Analytics, goal: number | undefined, hideFilters: boolean, onPeriod?: (p: string) => void): ReactNode {
  const q = an.academic, x = t.pri.an;
  if (q.data?.demo) return <InstitutionalAnalytics hideFilters={hideFilters} />;
  if (q.isPending && !q.data) return <LoadingBlocks rows={4} height={120} label={x.loading} />;
  if (q.isError && !q.data) return <ErrorState title={x.error} onRetry={() => q.refetch()} />;
  if (!an.data) return <EmptyState icon="reports" title={x.emptyTitle} message={x.emptyText} />;
  return <InstitutionalAnalytics hideFilters={hideFilters} data={an.data} goal={goal} onPeriod={onPeriod} />;
}

/** Periodo abierto (el que mide el seguimiento docente). */
function openPeriodName(an: Analytics, t: Messages): string {
  const name = DEMO ? "Periodo 3" : an.academic.data?.periods.find((x) => x.status === "open")?.name;
  return name ? t.tch.periodName(name) : t.pri.openPeriod;
}

/** «Periodo 3 · 2026» del periodo que se muestra (en demostración, el del sistema). */
function periodLabel(an: Analytics, t: Messages): string {
  const p = an.academic.data?.periods.find((x) => x.name === an.data?.period) ?? an.academic.data?.periods.find((x) => x.status === "open");
  return DEMO || !p ? t.tch.periodName("Periodo 3") + " · 2026" : t.tch.periodName(p.name) + (p.year ? " · " + p.year : "");
}

export function PrincipalDashboardPage() {
  const { navigate: go } = useShell();
  const rq = useRequests();
  const pend = (rq.data ?? []).filter((r) => r.status === "pending");
  const mq = useMonitoring();
  const an = useAnalytics();
  const goal = useMyInstitution().data?.goal;
  const attention = (mq.data ?? []).filter((x) => x.status !== "ok");
  const { t, lang, shownGrade } = useI18n();
  const x = t.pri.dash;
  const teachers = queryState(mq, x.loadingTeachers, x.teachersError)
    ?? (!attention.length ? <EmptyState icon="check" title={mq.data?.length ? x.allOk : x.noAssignments} message={x.teachersHint} /> : null);
  // Sobre el bloque navy, los estados usan la lista inversa del sistema (el EmptyState no tiene versión inversa).
  const failed = rq.isError && !rq.data;
  const note = (title: string, caption: string) => <ul className="ns-list ns-list--inverse"><li className="ns-list-item"><div className="ns-list-main"><strong>{title}</strong><span className="ns-caption">{caption}</span></div></li></ul>;
  const decisions = rq.isPending && !rq.data ? <LoadingBlocks rows={3} height={40} label={x.loadingRequests} />
    : failed ? note(x.requestsError, t.common.retryHint)
      : !pend.length ? note(x.noPending, x.newWillAppear) : null;
  return (
    <PageShell active="dashboard" counts={{ requests: pend.length }}>
      <Header eyebrow={x.eyebrow(periodLabel(an, t))} title={x.title} highlight={x.highlight} description={x.desc}
        actions={<Button iconRight="arrow" onClick={() => go("analytics")}>{x.seeAnalytics}</Button>} />
      <div className="ns-principal-top">
        <Block tone="navy" className="ns-decide">
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <span className="ns-overline" style={{ color: "var(--gold)" }}>{x.waiting}</span>
            {rq.data ? <Sticker tone="gold" rotate={3}>{x.requests(pend.length)}</Sticker> : null}
          </div>
          {decisions ?? <ul className="ns-list ns-list--inverse">
            {pend.map((r) => (
              <li key={r.id} className="ns-list-item">
                <div className="ns-list-main"><strong>{x.requestOf(r.id, r.subject)}</strong><span className="ns-caption">{r.teacher + " · " + r.student.split(" ").slice(0, 2).join(" ")}</span></div>
                <span className="ns-change">{shownGrade(r.from)}<Icon name="arrow" size={14} />{shownGrade(r.to)}</span>
              </li>
            ))}
          </ul>}
          <div>{failed ? <Button icon="refresh" onClick={() => rq.refetch()}>{t.common.retry}</Button> : <Button iconRight="arrow" onClick={() => go("requests")}>{x.review}</Button>}</div>
        </Block>
        <Block label={x.teachersLabel}>
          <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("teachers")}>{x.followUp}</Button>}>{x.teachersTitle}</BlockTitle>
          {teachers ?? <ul className="ns-list">
            {attention.map((m) => (
              <li key={m.id} className="ns-list-item">
                <Avatar name={m.name} size="sm" />
                <div className="ns-list-main"><strong>{m.name}</strong><span className="ns-caption">{x.pendingEvals(m.pending) + " · " + seenText(t, lang, m.last, "none")}</span></div>
                <TeacherStatus status={m.status} />
              </li>
            ))}
          </ul>}
        </Block>
      </div>
      {analyticsBody(t, an, goal, true)}
    </PageShell>
  );
}

export function AnalyticsPage() {
  const pending = usePendingCount();
  const [period, setPeriod] = useState<string | undefined>();
  const an = useAnalytics(period);
  const school = useMyInstitution().data;
  const goal = school?.goal;
  const me = useAuth().profile;
  const saveHistory = useSaveReportHistory();
  const [exporting, setExporting] = useState(false);
  const [fmt, setFmt] = useState<ReportFormat>("pdf");
  const [printing, setPrinting] = useState<ReportData | null>(null);
  const [showToast, toastNode] = useToast();
  const { t } = useI18n();
  const x = t.pri.analytics;
  const [askPrint, printNotice] = usePrintNotice();
  // «Exportar informe» (6c): el informe del periodo que se ve, en PDF, Excel o CSV; en demostración, el botón del sistema.
  async function exportReport() {
    if (!an.data || !school || !me) {
      setExporting(false);
      showToast({ tone: "error", title: x.exportError, message: t.tch.rep.noSchool });
      return;
    }
    const d = buildAnalyticsReport({ school, me: me.fullName }, an.data, goal ?? 3.5);
    setExporting(false);
    try {
      if (fmt === "pdf") setPrinting(d); else if (fmt === "xlsx") await downloadXlsx(d); else downloadCsv(d);
      saveHistory.mutate({ kind: "analytics", format: fmt, title: d.title, params: { period: an.data.period } });
      showToast({ tone: "success", title: x.ready, message: d.title + " · " + FORMAT_LABEL[fmt] + "." });
    } catch {
      showToast({ tone: "error", title: x.exportError, message: x.tryAgain });
    }
  }
  return (
    <PageShell active="analytics" counts={{ requests: pending }}>
      <Header eyebrow={x.eyebrow} title={x.title} highlight={x.highlight} description={x.desc}
        actions={<Button variant="secondary" icon="download" disabled={!DEMO && !an.data} onClick={() => { if (!DEMO) setExporting(true); }}>{x.export}</Button>} />
      {analyticsBody(t, an, goal, false, setPeriod)}
      <Modal open={exporting} onClose={() => setExporting(false)} icon="download" title={x.export}
        description={x.exportDesc(t.tch.periodName(an.data?.period ?? ""))}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setExporting(false)}>{t.common.cancel}</Button>,
          <Button key="g" icon="download" onClick={() => askPrint(() => { void exportReport(); })}>{x.exportFmt(FORMAT_LABEL[fmt])}</Button>,
        ]}>
        <FilterGroup label={x.format} value={fmt} onChange={(v) => setFmt(v as ReportFormat)} options={[{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }, { value: "csv", label: "CSV" }]} />
      </Modal>
      {printing ? <PrintReport data={printing} onDone={() => setPrinting(null)} /> : null}
      {printNotice}
      {toastNode}
    </PageShell>
  );
}

export function TeacherMonitoringPage() {
  const pending = usePendingCount();
  const mq = useMonitoring();
  const an = useAnalytics();
  const remind = useSendReminder();
  const { t } = useI18n();
  const m = t.pri.mon;
  // El recordatorio se guarda y lo lee el docente: sale en español, como los correos (D4). Por eso usa el nombre del
  // periodo tal como está guardado y no el traducido.
  const savedPeriod = DEMO ? "Periodo 3" : an.academic.data?.periods.find((x) => x.status === "open")?.name ?? "periodo abierto";
  const body = queryState(mq, t.pri.dash.loadingTeachers, t.pri.dash.teachersError)
    ?? (!mq.data?.length ? <EmptyState icon="students" title={t.pri.dash.noAssignments} message={m.noAssignmentsText} />
      : DEMO ? <TeacherMonitoringPanel /> : (
        <TeacherMonitoringPanel rows={mq.data} onRemind={(r) => remind.mutateAsync({ email: r.id, message: reminderText(r.pending, r.pct, savedPeriod) })} />
      ));
  return (
    <PageShell active="teachers" counts={{ requests: pending }}>
      <Header eyebrow={m.eyebrow(openPeriodName(an, t))} title={m.title} highlight={m.highlight} description={m.desc} />
      {body}
    </PageShell>
  );
}

export function RequestsPage() {
  const rq = useRequests();
  const pending = (rq.data ?? []).filter((r) => r.status === "pending").length;
  const me = useAuth().profile;
  const decide = useDecideRequest();
  const { t } = useI18n();
  const r = t.pri.req;
  const body = queryState(rq, t.pri.dash.loadingRequests, t.pri.dash.requestsError);
  return (
    <PageShell active="requests" counts={{ requests: pending }}>
      <Header eyebrow={r.eyebrow} title={r.title} highlight={r.title} description={r.desc} />
      {body ?? (DEMO ? <AuthorizationInbox source={forcedState() ? rq.data : undefined} /> : (
        <AuthorizationInbox source={rq.data} decider={me?.fullName ?? t.roles.principal} errorMessage={(e) => decideMessage(e, t)}
          onDecide={(id, decision, note) => decide.mutateAsync({ id, decision, note })} />
      ))}
    </PageShell>
  );
}

export function ObserverPage() {
  const pending = usePendingCount();
  const q = useObservations();
  const { t } = useI18n();
  const o = t.pri.obs;
  const body = queryState(q, t.tch.beh.loading, t.tch.beh.error)
    ?? (!q.data?.length ? <EmptyState icon="eye" title={t.tch.beh.emptyTitle} message={o.emptyText} /> : <ObserverTimeline items={q.data} showStudent />);
  return (
    <PageShell active="observer" counts={{ requests: pending }}>
      <Header eyebrow={o.eyebrow} title={o.title} highlight={o.title} description={o.desc} />
      <Block>{body}</Block>
    </PageShell>
  );
}
