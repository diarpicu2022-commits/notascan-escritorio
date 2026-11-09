import { Fragment, useEffect, useRef, useState } from "react";
import { cx } from "../../../lib/cx";
import { TEACHERS } from "../../../data/academic";
import { PERIODS } from "../../../data/admin";
import { ABSENCE, EVOL, GRADE_AVG, REQUESTS, REQ_STATUS, TSTATUS, type GradeRequest, type RequestStatus, type TeacherState } from "../../../data/principal";
import { Avatar } from "../../atoms/Avatar";
import { Badge } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { ProgressBar, SegmentedTabs } from "../../atoms/Controls";
import { CountUp } from "../../atoms/CountUp";
import { Textarea } from "../../atoms/Field";
import { Icon } from "../../atoms/Icon";
import { StatusDot } from "../../atoms/StatusDot";
import { FilterGroup } from "../../molecules/Filters";
import { BarChart, DonutChart, LineChart } from "../Charts";
import { DataGrid } from "../DataGrid";
import { EmptyState } from "../EmptyState";
import { Block } from "../Layout";
import { Modal } from "../Overlays";
import { useToast } from "../Toast";
import { type AnalyticsData, type MonitorRow } from "../../../services/principal";
import { useI18n } from "../../../i18n/I18nProvider";
import { dayTime, shortDayYear } from "../../../i18n/dates";
import { seenText } from "../../../i18n/seen";
import type { Messages } from "../../../i18n/es";
import type { RequestEvent } from "../../../data/principal";

/** Paso del historial en el idioma: los que escribe la base (`text`) llegan en español (D4). */
function eventText(t: Messages, e: RequestEvent): string {
  if (e.k === "text") return e.text;
  const note = e.note?.trim() ?? "";
  return e.k === "created" ? t.pri.req.created(e.by) : e.k === "approved" ? t.pri.req.approvedBy(e.by, note) : t.pri.req.rejectedBy(e.by, note);
}

/** Verde, amarillo o rojo con forma y palabra, nunca solo color. */
export function TeacherStatus({ status }: { status: TeacherState }) {
  const s = TSTATUS[status];
  return <StatusDot status={s[1]} label={useI18n().t.pri.status[status]} />;
}

/** Diferencia con signo y el separador del idioma («+0,1», «−2»). */
function useSigned() {
  const { number } = useI18n();
  return (v: number) => (v > 0 ? "+" : "−") + number(Math.abs(v), Math.abs(v) % 1 ? 1 : 0);
}

/** Indicadores y cuatro gráficos; cada uno responde una pregunta. Sin `data`, las cifras del sistema. */
export function InstitutionalAnalytics({ hideFilters, data, goal = 3.5, onPeriod }: { hideFilters?: boolean; data?: AnalyticsData; goal?: number; onPeriod?: (p: string) => void }) {
  const [period, setPeriod] = useState("Periodo 3");
  const { t, shownGrade } = useI18n();
  const signed = useSigned();
  if (data) return <RealAnalytics hideFilters={hideFilters} d={data} goal={goal} onPeriod={onPeriod} />;
  const x = t.pri.an, gn = t.adm.gradeName;
  return (
    <div className="ns-col" style={{ gap: 24 }}>
      {hideFilters ? null : (
        <div className="ns-row">
          <FilterGroup as="select" label={x.year} value="2026" options={[{ value: "2026", label: "2026" }]} />
          <FilterGroup as="select" label={t.adm.f.period} value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: t.tch.periodName(p) }))} />
        </div>
      )}
      <section className="ns-kpis" aria-label={x.kpisAria}>
        <div className="ns-kpi ns-kpi--lead"><span className="ns-overline" style={{ color: "var(--gold)" }}>{x.avg}</span><strong><CountUp value={shownGrade(3.8)} /></strong><span><Icon name="sortup" size={14} />{x.vsPrev(signed(0.1))}</span></div>
        <div className="ns-kpi"><span className="ns-overline">{x.fail}</span><strong><CountUp value="9%" /></strong><span><Icon name="sortdown" size={14} />{x.points(signed(-2), 2) + " · " + x.students(39)}</span></div>
        <div className="ns-kpi"><span className="ns-overline">{x.absence}</span><strong><CountUp value="6%" /></strong><span><Icon name="warning" size={14} />{x.worst(gn("Octavo"))}</span></div>
      </section>
      <div className="ns-charts">
        <Block className="ns-chart-block"><BarChart title={x.byGrade} subtitle={x.byGradeQ} data={GRADE_AVG.map((g) => ({ ...g, label: gn(g.label) }))} max={5} ticks={[0, 2.5, 5]} target={3.5} targetLabel={x.target} seriesLabel={x.average} lowBelow={3.5} format={shownGrade} /></Block>
        <Block className="ns-chart-block"><LineChart title={x.evolution} subtitle={x.evolutionQ} labels={EVOL.labels.map((_, i) => t.tch.periodShort(i + 1))} min={3} max={4.2} ticks={[3, 3.6, 4.2]} series={[{ name: "2026", points: EVOL.now }, { name: "2025", points: EVOL.prev, tone: "gold", dashed: true }]} format={shownGrade} /></Block>
        <Block className="ns-chart-block"><DonutChart title={x.fail} subtitle={x.failQ} centerValue="9%" centerLabel={x.failCenter} data={[{ label: x.passAll, value: 393, tone: "navy" }, { label: x.failSome, value: 39, tone: "gold" }]} /></Block>
        <Block className="ns-chart-block"><BarChart title={x.absenceTitle} subtitle={x.absenceQ} data={ABSENCE.map((g) => ({ ...g, label: gn(g.label) }))} max={12} ticks={[0, 6, 12]} format={(v) => Math.round(v) + "%"} /></Block>
      </div>
    </div>
  );
}

/** Las mismas piezas con las cifras de la base; lo que aún no tiene datos lo dice en su lugar. */
function RealAnalytics({ hideFilters, d, goal, onPeriod }: { hideFilters?: boolean; d: AnalyticsData; goal: number; onPeriod?: (p: string) => void }) {
  const pts = d.evol.now.concat(d.evol.prev ?? []).filter((v) => !isNaN(v));
  const lo = Math.max(1, Math.floor((Math.min(...pts) - 0.3) * 5) / 5), hi = Math.min(5, Math.ceil((Math.max(...pts) + 0.3) * 5) / 5);
  const absMax = Math.max(12, Math.ceil(Math.max(0, ...d.absence.map((x) => x.value)) / 4) * 4);
  const { t, shownGrade } = useI18n();
  const signed = useSigned();
  const x = t.pri.an, gn = t.adm.gradeName, pn = t.tch.periodName;
  const avgNote = d.avgDelta === null ? x.firstPeriod : d.avgDelta === 0 ? x.samePrev : x.vsPrev(signed(d.avgDelta));
  const failNote = (d.failDelta === null || d.failDelta === 0 ? "" : x.points(signed(d.failDelta), Math.abs(d.failDelta)) + " · ") + x.students(d.failCount);
  const noAbsence = <EmptyState icon="calendar" title={x.noAbsenceTitle} message={x.noAbsenceText} />;
  return (
    <div className="ns-col" style={{ gap: 24 }}>
      {hideFilters ? null : (
        <div className="ns-row">
          <FilterGroup as="select" label={x.year} value={String(d.evol.year)} options={[{ value: String(d.evol.year), label: String(d.evol.year) }]} />
          <FilterGroup as="select" label={t.adm.f.period} value={d.period} onChange={(p) => onPeriod?.(p)} options={d.periods.map((p) => ({ value: p, label: pn(p) }))} />
        </div>
      )}
      <section className="ns-kpis" aria-label={x.kpisAria}>
        <div className="ns-kpi ns-kpi--lead"><span className="ns-overline" style={{ color: "var(--gold)" }}>{x.avg}</span><strong><CountUp value={shownGrade(d.avg)} /></strong><span>{d.avgDelta ? <Icon name={d.avgDelta > 0 ? "sortup" : "sortdown"} size={14} /> : null}{avgNote}</span></div>
        <div className="ns-kpi"><span className="ns-overline">{x.fail}</span><strong><CountUp value={d.failPct + "%"} /></strong><span>{d.failDelta ? <Icon name={d.failDelta > 0 ? "sortup" : "sortdown"} size={14} /> : null}{failNote}</span></div>
        <div className="ns-kpi"><span className="ns-overline">{x.absence}</span><strong>{d.absenceRate === null ? "—" : <CountUp value={d.absenceRate + "%"} />}</strong><span>{d.absenceRate === null ? x.noAttendance : d.worstAbsence ? <><Icon name="warning" size={14} />{x.worst(gn(d.worstAbsence))}</> : x.noAbsences}</span></div>
      </section>
      <div className="ns-charts">
        <Block className="ns-chart-block"><BarChart title={x.byGrade} subtitle={x.byGradeQ} data={d.gradeAvg.map((g) => ({ ...g, label: gn(g.label) }))} max={5} ticks={[0, 2.5, 5]} target={goal} targetLabel={x.target} seriesLabel={x.average} lowBelow={goal} format={shownGrade} /></Block>
        <Block className="ns-chart-block"><LineChart title={x.evolution} subtitle={x.evolutionQ} labels={d.evol.labels.map((l) => t.tch.periodShort(Number(l.slice(1))))} min={lo} max={hi} ticks={[lo, Math.round(((lo + hi) / 2) * 10) / 10, hi]}
          series={[{ name: String(d.evol.year), points: d.evol.now }, ...(d.evol.prev ? [{ name: String(d.evol.prevYear), points: d.evol.prev, tone: "gold" as const, dashed: true }] : [])]} format={shownGrade} /></Block>
        <Block className="ns-chart-block"><DonutChart title={x.fail} subtitle={x.failQ} centerValue={d.failPct + "%"} centerLabel={x.failCenter} data={[{ label: x.passAll, value: d.students - d.failCount, tone: "navy" }, { label: x.failSome, value: d.failCount, tone: "gold" }]} /></Block>
        <Block className="ns-chart-block">{d.absence.length ? <BarChart title={x.absenceTitle} subtitle={x.absenceQ} data={d.absence.map((g) => ({ ...g, label: gn(g.label) }))} max={absMax} ticks={[0, absMax / 2, absMax]} format={(v) => Math.round(v) + "%"} /> : noAbsence}</Block>
      </div>
    </div>
  );
}

type TeacherRow = MonitorRow;

/** Avance del registro de notas por docente, con recordatorio a quien va atrasado. Sin `rows`, los del sistema. */
export function TeacherMonitoringPanel({ rows, onRemind }: { rows?: MonitorRow[]; onRemind?: (t: MonitorRow) => Promise<void> } = {}) {
  const [sending, setSending] = useState<string | null>(null);
  const [f, setF] = useState("all");
  const [showToast, toastNode] = useToast();
  const { t, lang } = useI18n();
  const m = t.pri.mon;
  const source = rows ?? (TEACHERS as unknown as MonitorRow[]);
  const counts: Record<TeacherState, number> = { ok: 0, warn: 0, late: 0 };
  source.forEach((t) => { counts[t.status]++; });
  const list = source.filter((t) => f === "all" || t.status === f);
  return (
    <>
      <div className="ns-tstatus-strip" role="group" aria-label={m.stripAria}>
        {(["ok", "warn", "late"] as TeacherState[]).map((k) => {
          const s = TSTATUS[k];
          return (
            <button key={k} type="button" className={cx("ns-tstatus", "ns-tstatus--" + k)} aria-pressed={f === k} onClick={() => setF(f === k ? "all" : k)}>
              <strong>{counts[k]}</strong><StatusDot status={s[1]} label={t.pri.status[k]} /><span className="ns-caption">{t.pri.colors[k]}</span>
            </button>
          );
        })}
      </div>
      <DataGrid<TeacherRow>
        caption={m.caption} rows={list as TeacherRow[]} paginate={false} initialSort={{ key: "pct", dir: "asc" }} resetKey={f}
        columns={[
          { key: "name", label: m.cols.teacher, header: true, sortable: true, render: (t) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={t.name} size="sm" />{t.name}</div> },
          { key: "subjects", label: m.cols.subjects, render: (r) => r.subjects.join(", ") },
          { key: "courses", label: m.cols.courses, render: (r) => <div className="ns-row" style={{ gap: 4, flexWrap: "nowrap" }}>{r.courses.map((c) => <span key={c} className="ns-course-tag">{c}</span>)}</div> },
          { key: "pending", label: m.cols.pending, numeric: true, sortable: true },
          { key: "pct", label: m.cols.pct, sortable: true, render: (t) => <div style={{ minWidth: 150 }}><ProgressBar value={t.pct} total={100} showValue label="" tone={t.pct === 100 ? "sage" : t.pct >= 80 ? "gold" : "burgundy"} /></div> },
          { key: "last", label: m.cols.last, render: (r) => seenText(t, lang, r.last, "none") },
          { key: "status", label: m.cols.state, sortable: true, sortValue: (t) => ({ ok: 2, warn: 1, late: 0 })[t.status], render: (t) => <TeacherStatus status={t.status} /> },
        ]}
        rowActions={(r) => (r.status === "ok" ? null : (
          <Button size="sm" variant="secondary" icon="bell" loading={sending === r.id} loadingText={m.sending} onClick={() => {
            if (!onRemind) { showToast({ tone: "success", title: m.sent, message: m.notified(r.name) }); return; }
            setSending(r.id);
            onRemind(r).then(
              () => showToast({ tone: "success", title: m.sent, message: m.willSee(r.name) }),
              () => showToast({ tone: "error", title: m.notSent, message: t.common.retryHint }),
            ).finally(() => setSending(null));
          }}>{m.remind}</Button>
        ))}
      />
      {toastNode}
    </>
  );
}

/** Bandeja de solicitudes de cambio de nota: aprobar o rechazar con motivo; la nota original queda en el historial. */
interface AuthorizationInboxProps {
  /** Solicitudes leídas de la base; sin ellas, las del sistema. */
  source?: GradeRequest[];
  /** Quién decide, para el historial. */
  decider?: string;
  /** Guarda la decisión; si falla, la bandeja no cambia y se muestra el mensaje. */
  onDecide?: (id: number, kind: Exclude<RequestStatus, "pending">, note: string) => Promise<void>;
  errorMessage?: (e: unknown) => string;
}

export function AuthorizationInbox({ source, decider = "Hernando Villota", onDecide, errorMessage }: AuthorizationInboxProps = {}) {
  const [items, setItems] = useState<GradeRequest[]>(() => (source ?? REQUESTS).map((r) => ({ ...r })));
  const lastSource = useRef(source);
  useEffect(() => { if (source && lastSource.current !== source) { lastSource.current = source; setItems(source.map((r) => ({ ...r }))); } }, [source]);
  const [tab, setTab] = useState<RequestStatus>("pending");
  const [sel, setSel] = useState(() => (source ? source.find((r) => r.status === "pending")?.id ?? 0 : 245));
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<RequestStatus | null>(null);
  const [note, setNote] = useState("");
  const [showToast, toastNode] = useToast();
  const { t, lang, shownGrade } = useI18n();
  const q = t.pri.req;
  const list = items.filter((r) => r.status === tab);
  let cur = items.find((r) => r.id === sel);
  if (!cur || cur.status !== tab) cur = list[0];

  async function decide(kind: RequestStatus) {
    // La demostración vive el 1 de octubre de 2026, como el sistema.
    const r = cur!, now = source ? new Date().toISOString() : "2026-10-01T" + new Date().toTimeString().slice(0, 5) + ":00";
    if (onDecide) {
      setSaving(true);
      try { await onDecide(r.id, kind as Exclude<RequestStatus, "pending">, note); } catch (e) {
        setSaving(false);
        setConfirm(null);
        showToast({ tone: "error", title: q.saveError, message: errorMessage ? errorMessage(e) : q.tryAgain });
        return;
      }
      setSaving(false);
    }
    setItems(items.map((x) => (x.id === r.id ? { ...x, status: kind, history: x.history.concat([{ k: kind as "approved" | "rejected", by: decider, note: note.trim(), at: now }]) } : x)));
    setConfirm(null);
    setNote("");
    showToast({ tone: "success", title: q.decided(r.id, kind === "approved"), message: kind === "approved" ? q.changed(r.student.split(" ")[0], shownGrade(r.to)) : q.notified(r.teacher) });
  }
  const cnt = (s: RequestStatus) => items.filter((r) => r.status === s).length;

  return (
    <div className="ns-inbox">
      <div className="ns-inbox-list">
        <SegmentedTabs label={q.tabsAria} value={tab} onChange={(v) => setTab(v as RequestStatus)}
          tabs={(["pending", "approved", "rejected"] as const).map((k) => ({ value: k, label: q.tabs[k], count: cnt(k) }))} />
        {list.length ? (
          <ul role="listbox" aria-label={q.listAria}>
            {list.map((r) => {
              const on = !!cur && r.id === cur.id;
              return (
                <li key={r.id}>
                  <button type="button" role="option" aria-selected={on} className={cx("ns-inbox-item", on && "is-on")} onClick={() => setSel(r.id)}>
                    <div className="ns-row" style={{ justifyContent: "space-between", gap: 8 }}><strong>{q.number(r.id)}</strong><span className="ns-caption">{shortDayYear(lang, r.at)}</span></div>
                    <span>{r.subject + " · " + r.course}</span>
                    <span className="ns-caption">{r.teacher}</span>
                    <span className="ns-change ns-change--sm">{shownGrade(r.from)}<Icon name="arrow" size={12} />{shownGrade(r.to)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon="inbox" title={tab === "pending" ? q.noPending : q.noneInState} message={t.pri.dash.newWillAppear} />}
      </div>
      {cur ? (
        <Block className="ns-inbox-detail" label={q.detail}>
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <h2 className="ns-block-h">{q.number(cur.id)}</h2>
            <Badge tone={REQ_STATUS[cur.status][1]} icon={REQ_STATUS[cur.status][2]}>{t.pri.reqStatus[cur.status]}</Badge>
          </div>
          <dl className="ns-dl ns-dl--2">
            {[[q.teacher, cur.teacher], [q.student, cur.student + " · " + cur.course], [q.subject, cur.subject], [q.date, dayTime(lang, cur.at)]].map((x) => <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>)}
          </dl>
          <div className="ns-change-big" aria-label={q.changeAria(shownGrade(cur.from), shownGrade(cur.to))}>
            <div><span className="ns-overline">{q.current}</span><strong>{shownGrade(cur.from)}</strong></div>
            <Icon name="arrow" size={28} />
            <div className="is-new"><span className="ns-overline">{q.requested}</span><strong>{shownGrade(cur.to)}</strong></div>
          </div>
          {/* El motivo y el detalle los escribe el docente (I6). */}
          <div><span className="ns-overline">{q.reason}</span><p className="ns-reason"><strong>{cur.reason}</strong>{" · " + cur.detail}</p></div>
          <div><span className="ns-overline">{q.history}</span><ol className="ns-history">{cur.history.map((x, i) => <li key={i}><span>{eventText(t, x)}</span><span className="ns-caption">{dayTime(lang, x.at, false)}</span></li>)}</ol></div>
          {cur.status === "pending" ? (
            <div className="ns-reg-actions">
              <Button variant="danger" icon="close" onClick={() => setConfirm("rejected")}>{q.reject}</Button>
              <Button icon="check" size="lg" onClick={() => setConfirm("approved")}>{q.approve}</Button>
            </div>
          ) : null}
        </Block>
      ) : <EmptyState icon="inbox" title={q.pickTitle} message={q.pickText} />}
      <Modal
        open={!!confirm} alert onClose={() => setConfirm(null)} icon={confirm === "approved" ? "check" : "close"} tone={confirm === "approved" ? "sage" : "burgundy"}
        title={confirm === "approved" ? q.approveTitle : q.rejectTitle}
        description={cur ? cur.student + " · " + cur.subject + ": " + shownGrade(cur.from) + " → " + shownGrade(cur.to) + (confirm === "approved" ? q.approveText : q.rejectText) : ""}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setConfirm(null)} data-autofocus>{q.cancel}</Button>,
          <Button key="o" variant={confirm === "approved" ? "primary" : "danger"} icon={confirm === "approved" ? "check" : "close"} disabled={confirm === "rejected" && !note.trim()} loading={saving} loadingText={t.common.saving} onClick={() => decide(confirm!)}>
            {confirm === "approved" ? q.approve : q.reject}
          </Button>,
        ]}
      >
        <Textarea label={confirm === "rejected" ? q.rejectReason : q.comment} required={confirm === "rejected"} value={note} onChange={setNote} rows={2} hint={confirm === "rejected" ? q.required : null} />
      </Modal>
      {toastNode}
    </div>
  );
}
