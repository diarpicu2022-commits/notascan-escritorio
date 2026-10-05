import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cx } from "../../lib/cx";
import type { Institution } from "../../services/institution";
import { InstitutionHeader } from "./InstitutionIdentity";

/*
 * Reporte como documento (paso 6c): la misma hoja del boletín del sistema (.ns-paper, encabezado con el escudo del
 * colegio, ficha y tabla .ns-paper-table) con una tabla genérica. Se ve en la vista previa y se imprime a PDF.
 */

export type ReportCell = string | number | null;
/** `grade`: columna de notas (siempre con un decimal, «2.0»); el resto de números van tal cual (conteos). */
export interface ReportTable { caption: string; columns: Array<{ label: string; numeric?: boolean; grade?: boolean }>; rows: ReportCell[][]; footer?: ReportCell[] }

export interface ReportData {
  kind: "course" | "student" | "evaluation" | "analytics";
  /** Nombre del reporte, también para el archivo («Consolidado 7A · Periodo 3»). */
  title: string;
  school: Institution;
  /** Lo que va arriba a la derecha: tipo de informe, periodo o año y una línea corta. */
  head: { kind: string; period: string; year: number; note: string };
  facts: Array<[string, string]>;
  tables: ReportTable[];
  notes: string[];
  /** Quién lo generó y cuándo (pie del documento). */
  generatedBy: string;
  generatedAt: string;
}

const cell = (v: ReportCell, grade?: boolean) => (v === null || (typeof v === "number" && isNaN(v)) ? "—" : typeof v === "number" ? (grade ? v.toFixed(1) : String(v)) : v);

export function ReportView({ data: d, compact }: { data: ReportData; compact?: boolean }) {
  return (
    <article className={cx("ns-paper", compact && "ns-paper--compact")} aria-label={d.title}>
      <InstitutionHeader institution={d.school} period={d.head.period} year={d.head.year} index={0} total={0} kind={d.head.kind} note={d.head.note} />
      <section className="ns-paper-student">
        {d.facts.map((x) => <div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}
      </section>
      {d.tables.map((t) => (
        <table key={t.caption} className="ns-paper-table">
          <caption className="ns-sr">{t.caption}</caption>
          <thead><tr>{t.columns.map((c, i) => <th key={i} scope="col" className={c.numeric ? "is-num" : undefined}>{c.label}</th>)}</tr></thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i}>{r.map((v, j) => (j === 0 ? <th key={j} scope="row">{cell(v)}</th> : <td key={j} className={t.columns[j]?.numeric ? "is-num" : undefined}>{cell(v, t.columns[j]?.grade)}</td>))}</tr>
            ))}
          </tbody>
          {t.footer ? <tfoot><tr>{t.footer.map((v, j) => (j === 0 ? <th key={j} scope="row">{cell(v)}</th> : <td key={j} className={t.columns[j]?.numeric ? "is-num" : undefined}>{cell(v, t.columns[j]?.grade)}</td>))}</tr></tfoot> : null}
        </table>
      ))}
      {d.notes.map((n, i) => <p key={i} className="ns-paper-note">{n}</p>)}
      <p className="ns-paper-note">{"Generado por " + d.generatedBy + " el " + d.generatedAt + " con NotaScan. Solo incluye notas verificadas por un docente."}</p>
    </article>
  );
}

/** Imprime un reporte (el PDF sale de «Guardar como PDF»), igual que los boletines: portal fuera de la app. */
export function PrintReport({ data, onDone }: { data: ReportData; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const done = () => onDoneRef.current();
    window.addEventListener("afterprint", done, { once: true });
    const t = window.setTimeout(() => window.print(), 50);
    return () => { window.clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, []);
  return createPortal(<div className="ns-print-root" aria-hidden><ReportView data={data} /></div>, document.body);
}
