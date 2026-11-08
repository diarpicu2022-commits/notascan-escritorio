import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSync } from "../../app/SyncContext";
import { isNetworkError } from "../../services/offlineQueue";
import { cx } from "../../lib/cx";
import { formatGrade, gradeCheckText, validateGrade } from "../../lib/grade";
import { useI18n } from "../../i18n/I18nProvider";
import { saveMessage, type GbColumn, type GbRow, type GradebookData } from "../../services/teacher";
import { Icon } from "../atoms/Icon";
import { FilterGroup } from "../molecules/Filters";

/* Planilla tipo hoja de cálculo: se maneja con el teclado y funciona sin conexión. */

function gbAvg(r: GbRow, cols: GbColumn[]): number {
  let sum = 0, w = 0;
  cols.forEach((c) => { const v = r[c.key]; if (typeof v === "number" && !isNaN(v)) { sum += v * c.weight; w += c.weight; } });
  return w ? Math.round((sum / w) * 10) / 10 : NaN;
}

interface GradeCellProps {
  value: number;
  label: string;
  active: boolean;
  editing: boolean;
  draft: string;
  onDraft: (v: string) => void;
  error?: boolean;
  pending?: boolean;
  cellRef: (el: HTMLTableCellElement | null) => void;
  onSelect: () => void;
  onEdit: () => void;
  onInputKey: (e: KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

export function GradeCell(p: GradeCellProps) {
  const v = p.value;
  const { t, shownGrade } = useI18n();
  const g = t.tch.gb;
  return (
    <td
      role="gridcell" tabIndex={p.active ? 0 : -1} aria-selected={p.active} aria-invalid={p.error ? true : undefined}
      aria-label={g.cellAria(p.label, isNaN(v) ? null : shownGrade(v))}
      className={cx("ns-gcell", p.active && "is-active", p.editing && "is-editing", p.error && "is-invalid", p.pending && "is-pending", !isNaN(v) && v < 3 && "is-low")}
      onMouseDown={p.onSelect} onDoubleClick={p.onEdit} ref={p.cellRef}
    >
      {p.editing
        ? <input className="ns-gcell-input" autoFocus value={p.draft} inputMode="decimal" aria-label={g.editAria(p.label)} onChange={(e) => p.onDraft(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4))} onKeyDown={p.onInputKey} onBlur={p.onBlur} />
        : <span>{shownGrade(v)}</span>}
      {p.pending ? <i className="ns-gcell-dot" title={g.pendingSync} aria-hidden /> : null}
    </td>
  );
}

type Pos = { r: number; c: number };
type Msg = { tone: "error" | "warn" | "ok"; text: string } | null;

interface GradebookProps {
  courses: Array<{ value: string; label: string }>;
  course: string;
  onCourse: (v: string) => void;
  period: string;
  data?: GradebookData;
  /** Carga, error o vacío: reemplaza la tabla y deja la barra para cambiar de curso. */
  state?: ReactNode;
  /** Guarda una celda; si falla, la celda vuelve a su valor y se avisa en la barra de estado. */
  onSave?: (studentId: string, column: string, value: number) => Promise<void>;
}

export function Gradebook({ courses, course, onCourse, period, data, state, onSave }: GradebookProps) {
  const { sync, setSync, queue, enqueue, notice } = useSync();
  const { t, shownGrade } = useI18n();
  const g = t.tch.gb;
  const cols = data?.columns ?? [];
  // Con la cola real (paso 6f), lo que está guardado en este equipo y aún no llega a la base se ve en la planilla.
  const overlay = (rs: GbRow[]) => (!queue?.length ? rs : rs.map((r) => {
    const mine = queue.filter((q) => q.studentId === r.id);
    return mine.length ? mine.reduce((acc, q) => (q.column in acc ? { ...acc, [q.column]: q.value } : acc), r) : r;
  }));
  const [rows, setRows] = useState<GbRow[]>(() => overlay(data?.rows ?? []));
  const [pos, setPos] = useState<Pos>({ r: 0, c: 0 });
  const [edit, setEdit] = useState<Pos | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pend, setPend] = useState<Record<string, true>>({});
  const refs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const lastData = useRef(data);

  // Otro curso u otros datos de la base: la planilla se recarga y vuelve a la primera celda.
  useEffect(() => {
    if (lastData.current === data) return;
    lastData.current = data;
    setRows(overlay(data?.rows ?? [])); setPos({ r: 0, c: 0 }); setEdit(null);
  }, [data]);
  useEffect(() => {
    const el = refs.current[pos.r + "-" + pos.c];
    if (!el || edit) return;
    el.focus({ preventScroll: false });
    // Corrección de comportamiento (anexo, 2026-10-01): focus() no desplazaba la caja de la planilla
    // cuando la celda quedaba a medias. Se trae a la vista sin que la tape la columna fija de nombres.
    const wrap = el.closest(".ns-gb-wrap");
    const sticky = wrap?.querySelector<HTMLElement>("thead .ns-gb-sticky");
    if (!wrap) return;
    const c = el.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    const left = w.left + (sticky ? sticky.getBoundingClientRect().width : 0);
    if (c.right > w.right) wrap.scrollLeft += c.right - w.right;
    else if (c.left < left) wrap.scrollLeft -= left - c.left;
  }, [pos, edit]);
  const R = rows.length, C = cols.length;
  const offline = sync.status === "offline";
  function move(dr: number, dc: number) {
    let r = pos.r + dr, c = pos.c + dc;
    if (c >= C) { c = 0; r++; }
    if (c < 0) { c = C - 1; r--; }
    r = Math.max(0, Math.min(R - 1, r));
    setPos({ r, c });
  }
  function startEdit(initial?: string) {
    const row = rows[pos.r], k = cols[pos.c].key;
    setDraft(initial !== undefined ? initial : isNaN(row[k] as number) ? "" : formatGrade(row[k] as number));
    setEdit(pos); setMsg(null);
  }
  function commit(): boolean {
    const chk = validateGrade(draft);
    if (draft.trim() === "") { setEdit(null); return true; }
    if (!chk.valid) { setMsg({ tone: "error", text: gradeCheckText(t.tch.gradeCheck, draft) }); return false; }
    const k = cols[pos.c].key, row = rows[pos.r], before = row[k];
    setRows(rows.map((x, i) => (i !== pos.r ? x : { ...x, [k]: chk.value })));
    setEdit(null);
    const key = row.id + k;
    const queueIt = () => enqueue!({ studentId: row.id, column: k, value: chk.value, label: row.name.split(" ")[0] + ", " + cols[pos.c].label + ": " + formatGrade(chk.value), at: new Date().toISOString() });
    if (enqueue && offline) {
      queueIt();
      setMsg({ tone: "warn", text: g.savedLocal });
    } else if (offline) {
      const p = { ...pend, [key]: true as const };
      setPend(p);
      setSync({ ...sync, pending: Object.keys(p).length });
      setMsg({ tone: "warn", text: g.savedLocal });
    } else {
      setMsg({ tone: "ok", text: g.saved(row.name.split(" ")[0], cols[pos.c].label, shownGrade(chk.value)) });
      onSave?.(row.id, k, chk.value).catch((e) => {
        // Sin red: la nota no se pierde, queda en la cola de este equipo.
        if (enqueue && isNetworkError(e)) {
          queueIt();
          setMsg({ tone: "warn", text: g.offlineQueued(row.name.split(" ")[0], cols[pos.c].label) });
          return;
        }
        setRows((rs) => rs.map((x) => (x.id === row.id ? { ...x, [k]: before } : x)));
        setMsg({ tone: "error", text: saveMessage(e, t) + g.reverted(row.name.split(" ")[0], cols[pos.c].label, shownGrade(before as number)) });
      });
    }
    return true;
  }
  useEffect(() => { if (sync.status === "online" && Object.keys(pend).length) setPend({}); }, [sync.status]);
  // Marcas de «pendiente» de la cola real: celdas de esta planilla que aún no llegan a la base.
  const queued: Record<string, true> = {};
  (queue ?? []).forEach((q) => { queued[q.studentId + q.column] = true; });
  const pendMarks = enqueue ? queued : pend;
  // La barra no se queda diciendo «se sincronizará» cuando ya se envió, y avisa si la base no aceptó algo.
  useEffect(() => { if (enqueue && !queue?.length) setMsg((m) => (m?.tone === "warn" ? null : m)); }, [enqueue, queue?.length]);
  useEffect(() => { if (enqueue && notice) setMsg({ tone: "error", text: notice }); }, [enqueue, notice]);

  function onGridKey(e: KeyboardEvent) {
    if (edit) return;
    const k = e.key;
    if (k === "ArrowRight") { e.preventDefault(); move(0, 1); }
    else if (k === "ArrowLeft") { e.preventDefault(); move(0, -1); }
    else if (k === "ArrowDown") { e.preventDefault(); move(1, 0); }
    else if (k === "ArrowUp") { e.preventDefault(); move(-1, 0); }
    else if (k === "Tab") { e.preventDefault(); move(0, e.shiftKey ? -1 : 1); }
    else if (k === "Enter" || k === "F2") { e.preventDefault(); startEdit(); }
    else if (k === "Delete" || k === "Backspace") { e.preventDefault(); startEdit(""); }
    else if (/^[0-9]$/.test(k)) { e.preventDefault(); startEdit(k); }
  }
  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { e.preventDefault(); setEdit(null); setMsg(null); }
    else if (e.key === "Enter") { e.preventDefault(); if (commit()) move(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === "Tab") { e.preventDefault(); if (commit()) move(0, e.shiftKey ? -1 : 1); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (commit()) move(e.key === "ArrowDown" ? 1 : -1, 0); }
  }

  const avgs = rows.map((r) => gbAvg(r, cols)), valid = avgs.filter((x) => !isNaN(x));
  const courseAvg = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : NaN;
  const cur = rows[pos.r];

  return (
    <div className="ns-col" style={{ gap: 16 }}>
      <div className="ns-gb-bar">
        <FilterGroup as="select" label={t.tch.f.course} value={course} onChange={onCourse} options={courses} />
        <FilterGroup as="select" label={t.tch.f.period} value="3" options={[{ value: "3", label: period }]} />
        <div className="ns-gb-keys" aria-label={g.keysAria}>
          <span><kbd>↑↓←→</kbd>{g.keys[0]}</span><span><kbd>Enter</kbd>{g.keys[1]}</span><span><kbd>Tab</kbd>{g.keys[2]}</span><span><kbd>Esc</kbd>{g.keys[3]}</span><span><kbd>0–9</kbd>{g.keys[4]}</span>
        </div>
      </div>
      {state ?? <>
      <div className="ns-gb-wrap" role="region" aria-label={g.region}>
        <table className="ns-gb" role="grid" aria-rowcount={R + 1} aria-colcount={C + 2} onKeyDown={onGridKey}>
          <caption className="ns-sr">{g.caption(courses.find((c) => c.value === course)?.label.split(" · ")[0] ?? course)}</caption>
          <thead>
            <tr>
              <th scope="col" className="ns-gb-sticky">{g.student}</th>
              {cols.map((c) => <th key={c.key} scope="col" className="is-num">{c.label}<small>{c.weight + "%"}</small></th>)}
              <th scope="col" className="is-num ns-gb-avg">{g.average}<small>{g.automatic}</small></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const a = avgs[i];
              return (
                <tr key={r.id} className={cx(i === pos.r && "is-row")}>
                  <th scope="row" className="ns-gb-sticky"><span className="ns-gb-n">{i + 1}</span>{r.name}</th>
                  {cols.map((c, j) => {
                    const active = pos.r === i && pos.c === j, editing = !!edit && edit.r === i && edit.c === j;
                    return (
                      <GradeCell
                        key={c.key} value={r[c.key] as number} label={r.name + ", " + c.label} active={active} editing={editing} draft={draft} onDraft={setDraft}
                        error={editing && !!msg && msg.tone === "error"} pending={pendMarks[r.id + c.key]}
                        cellRef={(el) => { refs.current[i + "-" + j] = el; }}
                        onSelect={() => { if (edit) commit(); setPos({ r: i, c: j }); }}
                        onEdit={() => { setPos({ r: i, c: j }); startEdit(); }}
                        onInputKey={onInputKey} onBlur={() => { if (!commit()) setEdit(null); }}
                      />
                    );
                  })}
                  <td className={cx("is-num ns-gb-avg", !isNaN(a) && a < 3 && "is-low")}>{shownGrade(a)}{!isNaN(a) && a < 3 ? <Icon name="warning" size={14} /> : null}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="ns-gb-sticky">{g.courseAvg}</th>
              {cols.map((c) => {
                const v = rows.map((r) => r[c.key] as number).filter((x) => !isNaN(x));
                return <td key={c.key} className="is-num">{v.length ? shownGrade(v.reduce((a, b) => a + b, 0) / v.length) : "—"}</td>;
              })}
              <td className="is-num ns-gb-avg">{shownGrade(courseAvg)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={cx("ns-gb-status", msg && "is-" + msg.tone)} role="status" aria-live="polite">
        <span>{cur && cols[pos.c] ? <><strong>{cols[pos.c].label}</strong>{" · " + cur.name}</> : null}</span>
        <span>{msg ? msg.text : offline ? g.offline : g.synced}</span>
      </div>
      </>}
    </div>
  );
}
