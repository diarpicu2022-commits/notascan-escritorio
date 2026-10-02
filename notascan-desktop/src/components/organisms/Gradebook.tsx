import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useSync } from "../../app/SyncContext";
import { cx } from "../../lib/cx";
import { formatGrade, validateGrade } from "../../lib/grade";
import { ALL_STUDENTS, seeded } from "../../data/students";
import { Icon } from "../atoms/Icon";
import { FilterGroup } from "../molecules/Filters";

/* Planilla tipo hoja de cálculo: se maneja con el teclado y funciona sin conexión. */

const GB_COLS: Array<[key: string, label: string, weight: number]> = [["a1", "Actividad 1", 15], ["a2", "Actividad 2", 15], ["ws", "Taller", 20], ["ex", "Examen", 35], ["at", "Actitudinal", 15]];
type GbRow = { id: string; name: string } & Record<string, number | string>;

function gbAvg(r: GbRow): number {
  let sum = 0, w = 0;
  GB_COLS.forEach((c) => { const v = r[c[0]]; if (typeof v === "number" && !isNaN(v)) { sum += v * c[2]; w += c[2]; } });
  return w ? Math.round((sum / w) * 10) / 10 : NaN;
}

function gbRows(course: string): GbRow[] {
  return ALL_STUDENTS.filter((s) => s.course === course && s.status !== "retired").map((s, i) => {
    const b = s.avg, r: GbRow = { id: s.id, name: s.name };
    GB_COLS.forEach((c, j) => {
      const v = Math.round(Math.max(1, Math.min(5, b + (seeded(Number(s.id) + j * 3) - 0.5) * 1.4)) * 10) / 10;
      r[c[0]] = c[0] === "ex" && i % 5 === 3 ? NaN : v;
    });
    return r;
  });
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
  return (
    <td
      role="gridcell" tabIndex={p.active ? 0 : -1} aria-selected={p.active} aria-invalid={p.error ? true : undefined}
      aria-label={p.label + ": " + (isNaN(v) ? "sin nota" : formatGrade(v))}
      className={cx("ns-gcell", p.active && "is-active", p.editing && "is-editing", p.error && "is-invalid", p.pending && "is-pending", !isNaN(v) && v < 3 && "is-low")}
      onMouseDown={p.onSelect} onDoubleClick={p.onEdit} ref={p.cellRef}
    >
      {p.editing
        ? <input className="ns-gcell-input" autoFocus value={p.draft} inputMode="decimal" aria-label={"Editar " + p.label} onChange={(e) => p.onDraft(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4))} onKeyDown={p.onInputKey} onBlur={p.onBlur} />
        : <span>{isNaN(v) ? "—" : formatGrade(v)}</span>}
      {p.pending ? <i className="ns-gcell-dot" title="Pendiente de sincronizar" aria-hidden /> : null}
    </td>
  );
}

type Pos = { r: number; c: number };
type Msg = { tone: "error" | "warn" | "ok"; text: string } | null;

export function Gradebook() {
  const { sync, setSync } = useSync();
  const [course, setCourse] = useState("7A");
  const [rows, setRows] = useState<GbRow[]>(() => gbRows("7A"));
  const [pos, setPos] = useState<Pos>({ r: 0, c: 0 });
  const [edit, setEdit] = useState<Pos | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [pend, setPend] = useState<Record<string, true>>({});
  const refs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setRows(gbRows(course)); setPos({ r: 0, c: 0 }); setEdit(null);
  }, [course]);
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

  const R = rows.length, C = GB_COLS.length;
  const offline = sync.status === "offline";
  function move(dr: number, dc: number) {
    let r = pos.r + dr, c = pos.c + dc;
    if (c >= C) { c = 0; r++; }
    if (c < 0) { c = C - 1; r--; }
    r = Math.max(0, Math.min(R - 1, r));
    setPos({ r, c });
  }
  function startEdit(initial?: string) {
    const row = rows[pos.r], k = GB_COLS[pos.c][0];
    setDraft(initial !== undefined ? initial : isNaN(row[k] as number) ? "" : formatGrade(row[k] as number));
    setEdit(pos); setMsg(null);
  }
  function commit(): boolean {
    const chk = validateGrade(draft);
    if (draft.trim() === "") { setEdit(null); return true; }
    if (!chk.valid) { setMsg({ tone: "error", text: chk.message }); return false; }
    const k = GB_COLS[pos.c][0];
    setRows(rows.map((x, i) => (i !== pos.r ? x : { ...x, [k]: chk.value })));
    setEdit(null);
    const key = rows[pos.r].id + k;
    if (offline) {
      const p = { ...pend, [key]: true as const };
      setPend(p);
      setSync({ ...sync, pending: Object.keys(p).length });
      setMsg({ tone: "warn", text: "Guardado en este equipo. Se sincronizará al reconectar." });
    } else setMsg({ tone: "ok", text: "Guardado · " + rows[pos.r].name.split(" ")[0] + ", " + GB_COLS[pos.c][1] + ": " + formatGrade(chk.value) });
    return true;
  }
  useEffect(() => { if (sync.status === "online" && Object.keys(pend).length) setPend({}); }, [sync.status]);

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

  const avgs = rows.map(gbAvg), valid = avgs.filter((x) => !isNaN(x));
  const courseAvg = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10 : NaN;
  const cur = rows[pos.r];

  return (
    <div className="ns-col" style={{ gap: 16 }}>
      <div className="ns-gb-bar">
        <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={["6A", "7A", "7B"].map((c) => ({ value: c, label: c + " · Matemáticas" }))} />
        <FilterGroup as="select" label="Periodo" value="3" options={[{ value: "3", label: "Periodo 3" }]} />
        <div className="ns-gb-keys" aria-label="Atajos de teclado">
          <span><kbd>↑↓←→</kbd> mover</span><span><kbd>Enter</kbd> editar / bajar</span><span><kbd>Tab</kbd> derecha</span><span><kbd>Esc</kbd> cancelar</span><span><kbd>0–9</kbd> escribir</span>
        </div>
      </div>
      <div className="ns-gb-wrap" role="region" aria-label="Planilla de calificaciones">
        <table className="ns-gb" role="grid" aria-rowcount={R + 1} aria-colcount={C + 2} onKeyDown={onGridKey}>
          <caption className="ns-sr">{"Planilla de calificaciones de " + course + ". Usa las flechas para moverte y Enter para editar."}</caption>
          <thead>
            <tr>
              <th scope="col" className="ns-gb-sticky">Estudiante</th>
              {GB_COLS.map((c) => <th key={c[0]} scope="col" className="is-num">{c[1]}<small>{c[2] + "%"}</small></th>)}
              <th scope="col" className="is-num ns-gb-avg">Promedio<small>automático</small></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const a = avgs[i];
              return (
                <tr key={r.id} className={cx(i === pos.r && "is-row")}>
                  <th scope="row" className="ns-gb-sticky"><span className="ns-gb-n">{i + 1}</span>{r.name}</th>
                  {GB_COLS.map((c, j) => {
                    const active = pos.r === i && pos.c === j, editing = !!edit && edit.r === i && edit.c === j;
                    return (
                      <GradeCell
                        key={c[0]} value={r[c[0]] as number} label={r.name + ", " + c[1]} active={active} editing={editing} draft={draft} onDraft={setDraft}
                        error={editing && !!msg && msg.tone === "error"} pending={pend[r.id + c[0]]}
                        cellRef={(el) => { refs.current[i + "-" + j] = el; }}
                        onSelect={() => { if (edit) commit(); setPos({ r: i, c: j }); }}
                        onEdit={() => { setPos({ r: i, c: j }); startEdit(); }}
                        onInputKey={onInputKey} onBlur={() => { if (!commit()) setEdit(null); }}
                      />
                    );
                  })}
                  <td className={cx("is-num ns-gb-avg", !isNaN(a) && a < 3 && "is-low")}>{isNaN(a) ? "—" : formatGrade(a)}{!isNaN(a) && a < 3 ? <Icon name="warning" size={14} /> : null}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="ns-gb-sticky">Promedio del curso</th>
              {GB_COLS.map((c) => {
                const v = rows.map((r) => r[c[0]] as number).filter((x) => !isNaN(x));
                return <td key={c[0]} className="is-num">{v.length ? formatGrade(v.reduce((a, b) => a + b, 0) / v.length) : "—"}</td>;
              })}
              <td className="is-num ns-gb-avg">{formatGrade(courseAvg)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={cx("ns-gb-status", msg && "is-" + msg.tone)} role="status" aria-live="polite">
        <span>{cur ? <><strong>{GB_COLS[pos.c][1]}</strong>{" · " + cur.name}</> : null}</span>
        <span>{msg ? msg.text : offline ? "Modo offline: los cambios se guardan en este equipo." : "Todo sincronizado."}</span>
      </div>
    </div>
  );
}
