import { cx } from "../../lib/cx";
import { formatGrade } from "../../lib/grade";
import { GRADE_NAME, PERF, PERIOD_SETUP, directorMessage, directorOf, periodIndex, subjectGrades } from "../../data/academic";
import { seeded, type StudentRecord } from "../../data/students";

/** Todo lo que imprime un boletín. En modo normal sale de la base; en demostración, de las reglas del sistema. */
export interface ReportCardData {
  studentName: string;
  period: string;
  year: number;
  /** Posición del periodo (1…) y cuántos tiene el año. */
  index: number;
  totalPeriods: number;
  weightsText: string;
  facts: [string, string][];
  rows: Array<{ subject: string; teacher: string; periods: number[]; grade: number; cumulative: number; absences: number | null; concept: string }>;
  avg: number;
  cum: number;
  absences: number;
  attendance: number;
  director: string;
  course: string;
  /** Solo si el director lo escribió o lo revisó: sin mensaje, la sección no aparece. */
  message: string | null;
  rector: string;
}

/** Boletín de demostración, con las mismas reglas del sistema. */
export function demoReportCard(s: StudentRecord, period = "Periodo 3"): ReportCardData {
  const N = periodIndex(period);
  const rows = subjectGrades(s, period);
  const avg = Math.round((rows.reduce((a, r) => a + r.grade, 0) / rows.length) * 10) / 10;
  const cum = Math.round((rows.reduce((a, r) => a + r.cumulative, 0) / rows.length) * 10) / 10;
  const director = directorOf(s);
  return {
    studentName: s.name, period, year: 2026, index: N, totalPeriods: PERIOD_SETUP.names.length,
    weightsText: PERIOD_SETUP.names.map((_, i) => "P" + (i + 1) + " " + PERIOD_SETUP.weights[i] + "%").join(" · "),
    facts: [
      ["Estudiante", s.name], ["Documento", s.document], ["Grado", GRADE_NAME[s.grade]], ["Curso", s.course],
      ["Director de grupo", director], ["Puesto en el curso", 1 + Math.floor(seeded(Number(s.id) + N) * 12) + " de 12"],
    ],
    rows: rows.map((r) => ({ subject: r.subject, teacher: r.teacher, periods: r.periods, grade: r.grade, cumulative: r.cumulative, absences: r.absences, concept: r.concept })),
    avg, cum, absences: rows.reduce((a, r) => a + r.absences, 0), attendance: s.attendance,
    director, course: s.course, message: directorMessage(s, rows, avg), rector: "Hernando Villota",
  };
}

const perf = (g: number) => (isNaN(g) ? "—" : PERF(g));

/** Boletín del periodo como documento académico (vista previa y versión impresa). */
export function ReportCardView({ data: d, compact }: { data: ReportCardData; compact?: boolean }) {
  const N = d.index;
  const past: number[] = [];
  for (let k = 1; k < N; k++) past.push(k);
  const cols = 5 + past.length;
  const rectorShort = d.rector.split(" ")[0].charAt(0) + ". " + d.rector.split(" ").slice(1).join(" ");
  return (
    <article className={cx("ns-paper", compact && "ns-paper--compact")} aria-label={"Boletín de " + d.studentName + ", " + d.period}>
      <header className="ns-paper-head">
        <div className="ns-paper-crest" aria-hidden><span>LA</span></div>
        <div><strong className="ns-paper-school">Colegio Los Andes</strong><span>Pasto, Nariño · Resolución 0123 de 2015 · DANE 152001000000</span></div>
        <div className="ns-paper-title"><span>Informe académico</span><strong>{d.period + " · " + d.year}</strong><small>{"Periodo " + N + " de " + d.totalPeriods}</small></div>
      </header>
      <section className="ns-paper-student">
        {d.facts.map((x) => <div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}
      </section>
      <table className="ns-paper-table ns-paper-table--rich">
        <caption className="ns-sr">{"Calificaciones de " + d.period + " por materia, periodos anteriores, acumulado y concepto de cada docente"}</caption>
        <thead>
          <tr>
            <th scope="col">Área / Materia</th>
            {past.map((k) => <th key={k} scope="col" className="is-num">{"P" + k}</th>)}
            <th scope="col" className="is-num is-current">Nota del periodo<small>{"P" + N}</small></th>
            <th scope="col" className="is-num is-cum">Acumulado<small>{N === 1 ? "P1" : "P1–P" + N}</small></th>
            <th scope="col">Desempeño</th>
            <th scope="col" className="is-num">Faltas</th>
          </tr>
        </thead>
        {d.rows.map((r) => (
          <tbody key={r.subject} className="ns-paper-subject">
            <tr>
              <th scope="row">{r.subject}<small>{r.teacher}</small></th>
              {past.map((k) => <td key={k} className="is-num is-past">{formatGrade(r.periods[k - 1])}</td>)}
              <td className="is-grade is-current">{formatGrade(r.grade)}</td>
              <td className="is-grade is-cum">{formatGrade(r.cumulative)}</td>
              <td>{isNaN(r.grade) ? "—" : <span className={"ns-perf ns-perf--" + PERF(r.grade).toLowerCase()}>{PERF(r.grade)}</span>}</td>
              <td className="is-num">{r.absences === null ? "—" : r.absences}</td>
            </tr>
            {r.concept ? <tr className="ns-paper-concept"><td colSpan={cols}><span>Concepto del docente</span>{r.concept}</td></tr> : null}
          </tbody>
        ))}
        <tfoot>
          <tr>
            <th scope="row" colSpan={1 + past.length}>Promedio</th>
            <td className="is-grade is-current">{formatGrade(d.avg)}</td>
            <td className="is-grade is-cum">{formatGrade(d.cum)}</td>
            <td>{perf(d.avg)}</td>
            <td className="is-num">{d.absences}</td>
          </tr>
        </tfoot>
      </table>
      <p className="ns-paper-note">{"Desempeño según la nota del periodo. El acumulado pondera los periodos cursados con los pesos que configura Secretaría (" + d.weightsText + ")."}</p>
      <div className="ns-paper-cols">
        <section><h4>Asistencia</h4><p>{(isNaN(d.attendance) ? "Sin registros de asistencia" : d.attendance + "% de asistencia") + " · " + d.absences + " faltas registradas en el periodo"}</p></section>
        <section><h4>Escala de valoración</h4><p>Superior 4.6–5.0 · Alto 4.0–4.5 · Básico 3.0–3.9 · Bajo 1.0–2.9 (Decreto 1290 de 2009)</p></section>
      </div>
      {d.message ? (
        <section className="ns-paper-msg">
          <h4>Mensaje del director de grupo</h4>
          <p>{d.message}</p>
          <span className="ns-paper-msg-by">{"— " + d.director + ", director(a) de grupo " + d.course}</span>
        </section>
      ) : null}
      <footer className="ns-paper-sign">
        <div><em className="ns-paper-signature" aria-hidden>{d.director.split(" ").slice(0, 2).join(" ")}</em><span /><strong>{d.director}</strong>{"Director(a) de grupo · " + d.course}</div>
        <div><em className="ns-paper-signature" aria-hidden>{rectorShort}</em><span /><strong>{d.rector}</strong>Rector</div>
        <div className="ns-paper-seal" aria-hidden>NotaScan.<small>Verificado</small></div>
      </footer>
    </article>
  );
}

/** Compatibilidad: boletín de demostración de un estudiante (perfil y vista previa del sistema). */
export function ReportCardDocument({ student, period = "Periodo 3", compact }: { student: StudentRecord; period?: string; compact?: boolean }) {
  return <ReportCardView data={demoReportCard(student, period)} compact={compact} />;
}
