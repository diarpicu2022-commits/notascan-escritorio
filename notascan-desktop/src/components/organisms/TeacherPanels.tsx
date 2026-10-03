import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { formatGrade, validateGrade } from "../../lib/grade";
import { subjectGrades } from "../../data/academic";
import { ALL_STUDENTS } from "../../data/students";
import { Avatar } from "../atoms/Avatar";
import { Badge, type BadgeTone } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Input, Textarea } from "../atoms/Field";
import { Icon, type IconName } from "../atoms/Icon";
import { FilterGroup } from "../molecules/Filters";
import { longDate, saveMessage, type AttRow, type AttState } from "../../services/teacher";
import { DataGrid } from "./DataGrid";
import { useToast } from "./Toast";

/* ---------- Recuperaciones: la nota original nunca se reemplaza ---------- */

interface RecoveryRow { id: string; name: string; course: string; subject: string; original: number; recovery: string; saved: boolean }

export function RecoveryTable() {
  const [rows, setRows] = useState<RecoveryRow[]>(() => ALL_STUDENTS.filter((s) => s.status === "active")
    .map((s) => ({ s, g: subjectGrades(s).filter((x) => x.grade < 3)[0] }))
    .filter((x) => x.g).slice(0, 9)
    .map((x, i) => ({ id: x.s.id, name: x.s.name, course: x.s.course, subject: x.g.subject, original: x.g.grade, recovery: i === 0 ? "4.0" : i === 1 ? "2.6" : "", saved: i < 2 })));
  const [showToast, toastNode] = useToast();
  const upd = (id: string, patch: Partial<RecoveryRow>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  function result(r: RecoveryRow): [string, BadgeTone, IconName, string] {
    if (!r.recovery) return ["Pendiente", "pending", "clock", "Sin nota de recuperación"];
    const c = validateGrade(r.recovery);
    if (!c.valid) return ["Revisar", "review", "error", c.message];
    return c.value >= 3 ? ["Aprobada", "verified", "check", "Definitiva 3.0 · original " + formatGrade(r.original) + " conservada"] : ["No aprobada", "review", "warning", "Se mantiene " + formatGrade(Math.max(r.original, c.value))];
  }
  return (
    <>
      <p className="ns-sensitive"><Icon name="lock" size={16} />La nota original nunca se reemplaza: queda en el historial académico junto a la de recuperación.</p>
      <DataGrid
        caption="Estudiantes que requieren recuperación" rows={rows} paginate={false} emptyTitle="No hay estudiantes en recuperación." emptyIcon="check"
        columns={[
          { key: "name", label: "Estudiante", header: true, sortable: true, render: (r) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={r.name} size="sm" /><span>{r.name}<small className="ns-caption" style={{ display: "block" }}>{r.course}</small></span></div> },
          { key: "subject", label: "Materia", sortable: true },
          { key: "original", label: "Nota original", numeric: true, render: (r) => <span className="ns-orig" title="Se conserva en el historial"><Icon name="lock" size={12} />{formatGrade(r.original)}</span> },
          {
            key: "recovery", label: "Nota de recuperación", render: (r) => {
              const c = r.recovery ? validateGrade(r.recovery) : null;
              return (
                <div className="ns-rec-input">
                  <input className={cx("ns-input ns-input--grade", c && !c.valid && "is-invalid")} value={r.recovery} inputMode="decimal" placeholder="0.0"
                    aria-label={"Nota de recuperación de " + r.name} aria-invalid={c && !c.valid ? true : undefined}
                    onChange={(e) => upd(r.id, { recovery: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4), saved: false })} />
                </div>
              );
            },
          },
          { key: "result", label: "Resultado", render: (r) => { const x = result(r); return <div className="ns-col" style={{ gap: 2 }}><Badge tone={x[1]} icon={x[2]}>{x[0]}</Badge><span className="ns-caption">{x[3]}</span></div>; } },
        ]}
        rowActions={(r) => {
          const x = result(r);
          return r.saved ? <Badge tone="neutral" icon="check">Guardada</Badge> : (
            <Button size="sm" disabled={!r.recovery || x[0] === "Revisar"} onClick={() => {
              upd(r.id, { saved: true });
              showToast({ tone: "success", title: "Recuperación registrada", message: r.name.split(" ")[0] + " · " + r.subject + ": original " + formatGrade(r.original) + ", recuperación " + r.recovery });
            }}>Guardar</Button>
          );
        }}
      />
      {toastNode}
    </>
  );
}

/* ---------- Asistencia rápida con atajos P · A · T · E ---------- */

const ATT: Array<[AttState, string, string, IconName]> = [["present", "Presente", "P", "check"], ["absent", "Inasistencia", "A", "close"], ["late", "Tarde", "T", "clock"], ["excused", "Excusa", "E", "file"]];

export function AttendanceRow({ row: r, index, onChange }: { row: AttRow; index: number; onChange: (p: Partial<AttRow>) => void }) {
  const [open, setOpen] = useState(!!r.note);
  return (
    <li className={cx("ns-att-row", "is-" + (r.state || "none"))} onKeyDown={(e) => {
      const m = ({ p: "present", a: "absent", t: "late", e: "excused" } as Record<string, AttState>)[e.key.toLowerCase()];
      if (m && (e.target as HTMLElement).tagName !== "TEXTAREA") { e.preventDefault(); onChange({ state: m }); }
    }}>
      <div className="ns-att-main">
        <span className="ns-gb-n">{index + 1}</span>
        <Avatar name={r.name} size="sm" />
        <strong className="ns-att-name">{r.name}</strong>
        <div className="ns-att-seg" role="radiogroup" aria-label={"Asistencia de " + r.name}>
          {ATT.map((a) => {
            const on = r.state === a[0];
            return (
              <button key={a[0]} type="button" role="radio" aria-checked={on} tabIndex={on || (!r.state && a[0] === "present") ? 0 : -1}
                className={cx("ns-att-btn", "ns-att-btn--" + a[0], on && "is-on")} onClick={() => onChange({ state: a[0] })} title={a[1] + " (tecla " + a[2] + ")"}>
                <Icon name={a[3]} size={14} strokeWidth={2.5} /><span>{a[1]}</span>
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" icon={open ? "minus" : "plus"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Ocultar" : "Agregar observación"}</Button>
      </div>
      {open ? <Textarea label="Observación" rows={2} value={r.note || ""} onChange={(v) => onChange({ note: v })} placeholder="El estudiante participó activamente durante la actividad." /> : null}
    </li>
  );
}

interface AttendancePanelProps {
  courses: Array<{ value: string; label: string }>;
  course: string;
  onCourse: (v: string) => void;
  date: string;
  onDate: (v: string) => void;
  data?: AttRow[];
  /** Carga, error o vacío: reemplaza la lista y deja la barra para cambiar de curso o fecha. */
  state?: ReactNode;
  onSave?: (rows: AttRow[]) => Promise<void>;
}

export function AttendancePanel({ courses, course, onCourse, date, onDate, data, state, onSave }: AttendancePanelProps) {
  const [rows, setRows] = useState<AttRow[]>(() => data ?? []);
  const [saving, setSaving] = useState(false);
  const lastData = useRef(data);
  // Otro curso u otra fecha: la lista se recarga con lo registrado en la base.
  useEffect(() => { if (lastData.current !== data) { lastData.current = data; setRows(data ?? []); } }, [data]);
  const [showToast, toastNode] = useToast();
  const upd = (id: string, patch: Partial<AttRow>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const c: Record<string, number> = {};
  rows.forEach((r) => { const k = r.state || "none"; c[k] = (c[k] || 0) + 1; });
  const courseName = courses.find((x) => x.value === course)?.label.split(" · ")[0] ?? course;
  function save() {
    setSaving(true);
    (onSave ? onSave(rows) : Promise.resolve()).then(
      () => showToast({ tone: "success", title: "Asistencia guardada", message: courseName + " · " + longDate(date) + " · " + (c.absent || 0) + " inasistencias." }),
      (e) => showToast({ tone: "error", title: "No pudimos guardar la asistencia", message: saveMessage(e) + " Las marcas siguen en pantalla." }),
    ).finally(() => setSaving(false));
  }
  return (
    <>
      <div className="ns-att-bar">
        <div className="ns-row">
          <FilterGroup as="select" label="Curso" value={course} onChange={onCourse} options={courses} />
          <Input label="Fecha" hideLabel type="date" value={date} onChange={(e) => { if (e.target.value) onDate(e.target.value); }} aria-label="Fecha de la clase" />
        </div>
        {state ? null : (
          <div className="ns-att-counts" aria-live="polite">
            {ATT.map((a) => <span key={a[0]} className={"ns-att-count ns-att-count--" + a[0]}><Icon name={a[3]} size={14} />{(c[a[0]] || 0) + " " + a[1].toLowerCase()}</span>)}
            <span className="ns-att-count">{(c.none || 0) + " sin marcar"}</span>
          </div>
        )}
        {state ? null : <Button variant="secondary" icon="check" onClick={() => setRows(rows.map((r) => (r.state ? r : { ...r, state: "present" })))}>Marcar el resto como presentes</Button>}
      </div>
      {state ?? <>
        <p className="ns-caption">Atajos: con una fila enfocada pulsa <kbd>P</kbd> presente, <kbd>A</kbd> inasistencia, <kbd>T</kbd> tarde, <kbd>E</kbd> excusa.</p>
        <ul className="ns-att-list">
          {rows.map((r, i) => <AttendanceRow key={r.id} row={r} index={i} onChange={(p) => upd(r.id, p)} />)}
        </ul>
        <div className="ns-sticky-cta">
          <Button size="lg" icon="check" disabled={!!c.none} loading={saving} loadingText="Guardando…" onClick={save}>
            {c.none ? "Faltan " + c.none + " por marcar" : "Guardar asistencia"}
          </Button>
        </div>
      </>}
      {toastNode}
    </>
  );
}
