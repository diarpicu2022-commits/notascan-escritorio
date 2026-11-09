import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { gradeCheckText, validateGrade } from "../../lib/grade";
import { useI18n } from "../../i18n/I18nProvider";
import { longDay } from "../../i18n/dates";
import { Avatar } from "../atoms/Avatar";
import { Badge, type BadgeTone } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { Input, Textarea } from "../atoms/Field";
import { Icon, type IconName } from "../atoms/Icon";
import { FilterGroup } from "../molecules/Filters";
import { saveMessage, type AttRow, type AttState } from "../../services/teacher";
import type { RecoveryRow } from "../../services/teacherOverview";
import { DataGrid } from "./DataGrid";
import { useToast } from "./Toast";

/* ---------- Recuperaciones: la nota original nunca se reemplaza ---------- */

interface RecoveryTableProps {
  data: RecoveryRow[];
  /** Guarda la nota de recuperación; si la base la rechaza, la fila sigue sin guardar y se avisa. */
  onSave?: (r: RecoveryRow, value: number) => Promise<void>;
}

export function RecoveryTable({ data, onSave }: RecoveryTableProps) {
  const [rows, setRows] = useState<RecoveryRow[]>(() => data);
  const lastData = useRef(data);
  useEffect(() => { if (lastData.current !== data) { lastData.current = data; setRows(data); } }, [data]);
  const [showToast, toastNode] = useToast();
  const upd = (id: string, patch: Partial<RecoveryRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const { t, shownGrade } = useI18n();
  const x = t.tch.rec;
  /** Resultado: palabra, tono, icono, detalle y si la nota escrita no es válida. */
  function result(r: RecoveryRow): [string, BadgeTone, IconName, string, boolean] {
    if (!r.recovery) return [x.pending, "pending", "clock", x.noRecovery, false];
    const c = validateGrade(r.recovery);
    if (!c.valid) return [x.check, "review", "error", gradeCheckText(t.tch.gradeCheck, r.recovery), true];
    return c.value >= 3 ? [x.passed, "verified", "check", x.passedNote(shownGrade(r.original)), false] : [x.failed, "review", "warning", x.keeps(shownGrade(Math.max(r.original, c.value))), false];
  }
  return (
    <>
      <p className="ns-sensitive"><Icon name="lock" size={16} />{x.lockNote}</p>
      <DataGrid
        caption={x.caption} rows={rows} paginate={false} emptyTitle={x.empty} emptyIcon="check"
        columns={[
          { key: "name", label: x.cols.student, header: true, sortable: true, render: (r) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={r.name} size="sm" /><span>{r.name}<small className="ns-caption" style={{ display: "block" }}>{r.course}</small></span></div> },
          { key: "subject", label: x.cols.subject, sortable: true },
          { key: "original", label: x.cols.original, numeric: true, render: (r) => <span className="ns-orig" title={x.keptInHistory}><Icon name="lock" size={12} />{shownGrade(r.original)}</span> },
          {
            key: "recovery", label: x.cols.recovery, render: (r) => {
              const c = r.recovery ? validateGrade(r.recovery) : null;
              return (
                <div className="ns-rec-input">
                  <input className={cx("ns-input ns-input--grade", c && !c.valid && "is-invalid")} value={r.recovery} inputMode="decimal" placeholder={shownGrade(0)}
                    aria-label={x.inputAria(r.name)} aria-invalid={c && !c.valid ? true : undefined}
                    onChange={(e) => upd(r.id, { recovery: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4), saved: false })} />
                </div>
              );
            },
          },
          { key: "result", label: x.cols.result, render: (r) => { const y = result(r); return <div className="ns-col" style={{ gap: 2 }}><Badge tone={y[1]} icon={y[2]}>{y[0]}</Badge><span className="ns-caption">{y[3]}</span></div>; } },
        ]}
        rowActions={(r) => {
          const y = result(r);
          return r.saved ? <Badge tone="neutral" icon="check">{x.saved}</Badge> : (
            <Button size="sm" disabled={!r.recovery || y[4]} onClick={() => {
              upd(r.id, { saved: true });
              (onSave ? onSave(r, validateGrade(r.recovery).value) : Promise.resolve()).then(
                () => showToast({ tone: "success", title: x.toastOk, message: x.toastOkText(r.name.split(" ")[0], r.subject, shownGrade(r.original), r.recovery) }),
                (e) => { upd(r.id, { saved: false }); showToast({ tone: "error", title: x.toastError, message: saveMessage(e, t) }); },
              );
            }}>{x.save}</Button>
          );
        }}
      />
      {toastNode}
    </>
  );
}

/* ---------- Asistencia rápida con atajos P · A · T · E ---------- */

/** Estado, tecla e icono. Las teclas P · A · T · E son las mismas en los tres idiomas; la palabra sale del diccionario. */
const ATT: Array<[AttState, string, IconName]> = [["present", "P", "check"], ["absent", "A", "close"], ["late", "T", "clock"], ["excused", "E", "file"]];

export function AttendanceRow({ row: r, index, onChange }: { row: AttRow; index: number; onChange: (p: Partial<AttRow>) => void }) {
  const [open, setOpen] = useState(!!r.note);
  const a2 = useI18n().t.tch.att;
  return (
    <li className={cx("ns-att-row", "is-" + (r.state || "none"))} onKeyDown={(e) => {
      const m = ({ p: "present", a: "absent", t: "late", e: "excused" } as Record<string, AttState>)[e.key.toLowerCase()];
      if (m && (e.target as HTMLElement).tagName !== "TEXTAREA") { e.preventDefault(); onChange({ state: m }); }
    }}>
      <div className="ns-att-main">
        <span className="ns-gb-n">{index + 1}</span>
        <Avatar name={r.name} size="sm" />
        <strong className="ns-att-name">{r.name}</strong>
        <div className="ns-att-seg" role="radiogroup" aria-label={a2.rowAria(r.name)}>
          {ATT.map((a) => {
            const on = r.state === a[0];
            return (
              <button key={a[0]} type="button" role="radio" aria-checked={on} tabIndex={on || (!r.state && a[0] === "present") ? 0 : -1}
                className={cx("ns-att-btn", "ns-att-btn--" + a[0], on && "is-on")} onClick={() => onChange({ state: a[0] })} title={a2.keyTitle(a2.states[a[0]], a[1])}>
                <Icon name={a[2]} size={14} strokeWidth={2.5} /><span>{a2.states[a[0]]}</span>
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" icon={open ? "minus" : "plus"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? a2.hide : a2.addNote}</Button>
      </div>
      {open ? <Textarea label={a2.note} rows={2} value={r.note || ""} onChange={(v) => onChange({ note: v })} placeholder={a2.notePlaceholder} /> : null}
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
  const { t, lang } = useI18n();
  const a2 = t.tch.att;
  function save() {
    setSaving(true);
    (onSave ? onSave(rows) : Promise.resolve()).then(
      () => showToast({ tone: "success", title: a2.toastOk, message: a2.toastOkText(courseName, longDay(lang, date), c.absent || 0) }),
      (e) => showToast({ tone: "error", title: a2.toastError, message: saveMessage(e, t) + a2.keepOnScreen }),
    ).finally(() => setSaving(false));
  }
  return (
    <>
      <div className="ns-att-bar">
        <div className="ns-row">
          <FilterGroup as="select" label={t.tch.f.course} value={course} onChange={onCourse} options={courses} />
          <Input label={a2.date} hideLabel type="date" value={date} onChange={(e) => { if (e.target.value) onDate(e.target.value); }} aria-label={a2.dateAria} />
        </div>
        {state ? null : (
          <div className="ns-att-counts" aria-live="polite">
            {ATT.map((a) => <span key={a[0]} className={"ns-att-count ns-att-count--" + a[0]}><Icon name={a[2]} size={14} />{a2.count(c[a[0]] || 0, a2.states[a[0]])}</span>)}
            <span className="ns-att-count">{a2.unmarked(c.none || 0)}</span>
          </div>
        )}
        {state ? null : <Button variant="secondary" icon="check" onClick={() => setRows(rows.map((r) => (r.state ? r : { ...r, state: "present" })))}>{a2.markRest}</Button>}
      </div>
      {state ?? <>
        <p className="ns-caption">{a2.shortcuts[0]}<kbd>P</kbd>{a2.shortcuts[1]}<kbd>A</kbd>{a2.shortcuts[2]}<kbd>T</kbd>{a2.shortcuts[3]}<kbd>E</kbd>{a2.shortcuts[4]}</p>
        <ul className="ns-att-list">
          {rows.map((r, i) => <AttendanceRow key={r.id} row={r} index={i} onChange={(p) => upd(r.id, p)} />)}
        </ul>
        <div className="ns-sticky-cta">
          <Button size="lg" icon="check" disabled={!!c.none} loading={saving} loadingText={t.common.saving} onClick={save}>
            {c.none ? a2.missing(c.none) : a2.save}
          </Button>
        </div>
      </>}
      {toastNode}
    </>
  );
}
