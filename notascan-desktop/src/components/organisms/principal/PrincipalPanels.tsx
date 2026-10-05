import { Fragment, useEffect, useRef, useState } from "react";
import { cx } from "../../../lib/cx";
import { formatGrade } from "../../../lib/grade";
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
import { historyDate } from "../../../services/principal";

/** Verde, amarillo o rojo con forma y palabra, nunca solo color. */
export function TeacherStatus({ status }: { status: TeacherState }) {
  const s = TSTATUS[status];
  return <StatusDot status={s[1]} label={s[0]} />;
}

/** Indicadores y cuatro gráficos; cada uno responde una pregunta. */
export function InstitutionalAnalytics({ hideFilters }: { hideFilters?: boolean }) {
  const [period, setPeriod] = useState("Periodo 3");
  const one = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
  return (
    <div className="ns-col" style={{ gap: 24 }}>
      {hideFilters ? null : (
        <div className="ns-row">
          <FilterGroup as="select" label="Año" value="2026" options={[{ value: "2026", label: "2026" }]} />
          <FilterGroup as="select" label="Periodo" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: p }))} />
        </div>
      )}
      <section className="ns-kpis" aria-label="Indicadores institucionales">
        <div className="ns-kpi ns-kpi--lead"><span className="ns-overline" style={{ color: "var(--gold)" }}>Promedio institucional</span><strong><CountUp value="3.8" /></strong><span><Icon name="sortup" size={14} />+0.1 frente al periodo anterior</span></div>
        <div className="ns-kpi"><span className="ns-overline">Índice de reprobación</span><strong><CountUp value="9%" /></strong><span><Icon name="sortdown" size={14} />−2 puntos · 39 estudiantes</span></div>
        <div className="ns-kpi"><span className="ns-overline">Tasa de inasistencia</span><strong><CountUp value="6%" /></strong><span><Icon name="warning" size={14} />Octavo concentra la mayor tasa</span></div>
      </section>
      <div className="ns-charts">
        <Block className="ns-chart-block"><BarChart title="Promedio por grado" subtitle="¿Qué grados están por debajo de la meta institucional?" data={GRADE_AVG} max={5} ticks={[0, 2.5, 5]} target={3.5} targetLabel="Meta" seriesLabel="Promedio" lowBelow={3.5} format={one} /></Block>
        <Block className="ns-chart-block"><LineChart title="Evolución del rendimiento" subtitle="¿Mejoramos frente al año pasado?" labels={EVOL.labels} min={3} max={4.2} ticks={[3, 3.6, 4.2]} series={[{ name: "2026", points: EVOL.now }, { name: "2025", points: EVOL.prev, tone: "gold", dashed: true }]} format={(v) => v.toFixed(1)} /></Block>
        <Block className="ns-chart-block"><DonutChart title="Índice de reprobación" subtitle="¿Cuántos estudiantes pierden al menos una materia?" centerValue="9%" centerLabel="reprueban" data={[{ label: "Aprueban todas", value: 393, tone: "navy" }, { label: "Reprueban 1 o más", value: 39, tone: "gold" }]} /></Block>
        <Block className="ns-chart-block"><BarChart title="Tasa de inasistencia por grado" subtitle="¿Dónde intervenir primero?" data={ABSENCE} max={12} ticks={[0, 6, 12]} format={(v) => Math.round(v) + "%"} /></Block>
      </div>
    </div>
  );
}

type TeacherRow = (typeof TEACHERS)[number];

/** Avance del registro de notas por docente, con recordatorio a quien va atrasado. */
export function TeacherMonitoringPanel() {
  const [f, setF] = useState("all");
  const [showToast, toastNode] = useToast();
  const counts: Record<TeacherState, number> = { ok: 0, warn: 0, late: 0 };
  TEACHERS.forEach((t) => { counts[t.status]++; });
  const list = TEACHERS.filter((t) => f === "all" || t.status === f);
  return (
    <>
      <div className="ns-tstatus-strip" role="group" aria-label="Resumen por estado">
        {([["ok", "Verde"], ["warn", "Amarillo"], ["late", "Rojo"]] as Array<[TeacherState, string]>).map((x) => {
          const s = TSTATUS[x[0]];
          return (
            <button key={x[0]} type="button" className={cx("ns-tstatus", "ns-tstatus--" + x[0])} aria-pressed={f === x[0]} onClick={() => setF(f === x[0] ? "all" : x[0])}>
              <strong>{counts[x[0]]}</strong><StatusDot status={s[1]} label={s[0]} /><span className="ns-caption">{x[1]}</span>
            </button>
          );
        })}
      </div>
      <DataGrid<TeacherRow>
        caption="Seguimiento docente" rows={list as TeacherRow[]} paginate={false} initialSort={{ key: "pct", dir: "asc" }} resetKey={f}
        columns={[
          { key: "name", label: "Docente", header: true, sortable: true, render: (t) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={t.name} size="sm" />{t.name}</div> },
          { key: "subjects", label: "Materias", render: (t) => t.subjects.join(", ") },
          { key: "courses", label: "Cursos", render: (t) => <div className="ns-row" style={{ gap: 4, flexWrap: "nowrap" }}>{t.courses.map((c) => <span key={c} className="ns-course-tag">{c}</span>)}</div> },
          { key: "pending", label: "Evaluaciones pendientes", numeric: true, sortable: true },
          { key: "pct", label: "Calificaciones registradas", sortable: true, render: (t) => <div style={{ minWidth: 150 }}><ProgressBar value={t.pct} total={100} showValue label="" tone={t.pct === 100 ? "sage" : t.pct >= 80 ? "gold" : "burgundy"} /></div> },
          { key: "last", label: "Última actualización" },
          { key: "status", label: "Estado", sortable: true, sortValue: (t) => ({ ok: 2, warn: 1, late: 0 })[t.status], render: (t) => <TeacherStatus status={t.status} /> },
        ]}
        rowActions={(t) => (t.status === "ok" ? null : (
          <Button size="sm" variant="secondary" icon="bell" onClick={() => showToast({ tone: "success", title: "Recordatorio enviado", message: "Se notificó a " + t.name + "." })}>Enviar recordatorio</Button>
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
  const list = items.filter((r) => r.status === tab);
  let cur = items.find((r) => r.id === sel);
  if (!cur || cur.status !== tab) cur = list[0];

  async function decide(kind: RequestStatus) {
    const r = cur!, now = source ? historyDate(new Date().toISOString()) : "1 oct, " + new Date().toTimeString().slice(0, 5);
    if (onDecide) {
      setSaving(true);
      try { await onDecide(r.id, kind as Exclude<RequestStatus, "pending">, note); } catch (e) {
        setSaving(false);
        setConfirm(null);
        showToast({ tone: "error", title: "No se guardó la decisión", message: errorMessage ? errorMessage(e) : "Inténtalo de nuevo." });
        return;
      }
      setSaving(false);
    }
    setItems(items.map((x) => (x.id === r.id ? { ...x, status: kind, history: x.history.concat([[(kind === "approved" ? "Aprobada" : "Rechazada") + " por " + decider + (note.trim() ? ": " + note.trim() : ""), now]]) } : x)));
    setConfirm(null);
    setNote("");
    showToast({ tone: "success", title: "Solicitud #" + r.id + (kind === "approved" ? " aprobada" : " rechazada"), message: kind === "approved" ? "La nota de " + r.student.split(" ")[0] + " cambió a " + formatGrade(r.to) + "." : "Se notificó a " + r.teacher + "." });
  }
  const cnt = (s: RequestStatus) => items.filter((r) => r.status === s).length;

  return (
    <div className="ns-inbox">
      <div className="ns-inbox-list">
        <SegmentedTabs label="Estado de las solicitudes" value={tab} onChange={(v) => setTab(v as RequestStatus)}
          tabs={[{ value: "pending", label: "Pendientes", count: cnt("pending") }, { value: "approved", label: "Aprobadas", count: cnt("approved") }, { value: "rejected", label: "Rechazadas", count: cnt("rejected") }]} />
        {list.length ? (
          <ul role="listbox" aria-label="Solicitudes">
            {list.map((r) => {
              const on = !!cur && r.id === cur.id;
              return (
                <li key={r.id}>
                  <button type="button" role="option" aria-selected={on} className={cx("ns-inbox-item", on && "is-on")} onClick={() => setSel(r.id)}>
                    <div className="ns-row" style={{ justifyContent: "space-between", gap: 8 }}><strong>{"Solicitud #" + r.id}</strong><span className="ns-caption">{r.date.split(",")[0]}</span></div>
                    <span>{r.subject + " · " + r.course}</span>
                    <span className="ns-caption">{r.teacher}</span>
                    <span className="ns-change ns-change--sm">{formatGrade(r.from)}<Icon name="arrow" size={12} />{formatGrade(r.to)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState icon="inbox" title={tab === "pending" ? "No hay solicitudes pendientes." : "No hay solicitudes en este estado."} message="Las nuevas solicitudes de los docentes aparecerán aquí." />}
      </div>
      {cur ? (
        <Block className="ns-inbox-detail" label="Detalle de la solicitud">
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <h2 className="ns-block-h">{"Solicitud #" + cur.id}</h2>
            <Badge tone={REQ_STATUS[cur.status][1]} icon={REQ_STATUS[cur.status][2]}>{REQ_STATUS[cur.status][0]}</Badge>
          </div>
          <dl className="ns-dl ns-dl--2">
            {[["Docente", cur.teacher], ["Estudiante", cur.student + " · " + cur.course], ["Materia", cur.subject], ["Fecha", cur.date]].map((x) => <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>)}
          </dl>
          <div className="ns-change-big" aria-label={"Cambio solicitado de " + formatGrade(cur.from) + " a " + formatGrade(cur.to)}>
            <div><span className="ns-overline">Nota actual</span><strong>{formatGrade(cur.from)}</strong></div>
            <Icon name="arrow" size={28} />
            <div className="is-new"><span className="ns-overline">Cambio solicitado</span><strong>{formatGrade(cur.to)}</strong></div>
          </div>
          <div><span className="ns-overline">Motivo</span><p className="ns-reason"><strong>{cur.reason}</strong>{" · " + cur.detail}</p></div>
          <div><span className="ns-overline">Historial</span><ol className="ns-history">{cur.history.map((x, i) => <li key={i}><span>{x[0]}</span><span className="ns-caption">{x[1]}</span></li>)}</ol></div>
          {cur.status === "pending" ? (
            <div className="ns-reg-actions">
              <Button variant="danger" icon="close" onClick={() => setConfirm("rejected")}>Rechazar</Button>
              <Button icon="check" size="lg" onClick={() => setConfirm("approved")}>Aprobar</Button>
            </div>
          ) : null}
        </Block>
      ) : <EmptyState icon="inbox" title="Selecciona una solicitud" message="Verás el cambio solicitado, el motivo y el historial." />}
      <Modal
        open={!!confirm} alert onClose={() => setConfirm(null)} icon={confirm === "approved" ? "check" : "close"} tone={confirm === "approved" ? "sage" : "burgundy"}
        title={confirm === "approved" ? "¿Aprobar el cambio de nota?" : "¿Rechazar la solicitud?"}
        description={cur ? cur.student + " · " + cur.subject + ": " + formatGrade(cur.from) + " → " + formatGrade(cur.to) + (confirm === "approved" ? ". La nota original queda en el historial." : ". El docente recibirá tu motivo.") : ""}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setConfirm(null)} data-autofocus>Cancelar</Button>,
          <Button key="o" variant={confirm === "approved" ? "primary" : "danger"} icon={confirm === "approved" ? "check" : "close"} disabled={confirm === "rejected" && !note.trim()} loading={saving} loadingText="Guardando…" onClick={() => decide(confirm!)}>
            {confirm === "approved" ? "Aprobar" : "Rechazar"}
          </Button>,
        ]}
      >
        <Textarea label={confirm === "rejected" ? "Motivo del rechazo" : "Comentario (opcional)"} required={confirm === "rejected"} value={note} onChange={setNote} rows={2} hint={confirm === "rejected" ? "Obligatorio para rechazar." : null} />
      </Modal>
      {toastNode}
    </div>
  );
}
