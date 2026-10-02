import { cx } from "../../lib/cx";
import { formatGrade } from "../../lib/grade";
import { GRADE_NAME, PERF, PERIOD_SETUP, directorMessage, directorOf, periodIndex, subjectGrades } from "../../data/academic";
import { seeded, type StudentRecord } from "../../data/students";

/**
 * Boletín del periodo como documento académico real: materias con periodos cursados, nota del
 * periodo, acumulado ponderado, concepto de cada docente, mensaje del director y firmas.
 */
export function ReportCardDocument({ student: s, period = "Periodo 3", compact }: { student: StudentRecord; period?: string; compact?: boolean }) {
  const N = periodIndex(period);
  const rows = subjectGrades(s, period);
  const avg = Math.round((rows.reduce((a, r) => a + r.grade, 0) / rows.length) * 10) / 10;
  const cum = Math.round((rows.reduce((a, r) => a + r.cumulative, 0) / rows.length) * 10) / 10;
  const director = directorOf(s);
  const past: number[] = [];
  for (let k = 1; k < N; k++) past.push(k);
  const cols = 5 + past.length;
  const wText = PERIOD_SETUP.names.map((_, i) => "P" + (i + 1) + " " + PERIOD_SETUP.weights[i] + "%").join(" · ");
  const absences = rows.reduce((a, r) => a + r.absences, 0);
  const facts: [string, string][] = [
    ["Estudiante", s.name], ["Documento", s.document], ["Grado", GRADE_NAME[s.grade]], ["Curso", s.course],
    ["Director de grupo", director], ["Puesto en el curso", 1 + Math.floor(seeded(Number(s.id) + N) * 12) + " de 12"],
  ];
  return (
    <article className={cx("ns-paper", compact && "ns-paper--compact")} aria-label={"Boletín de " + s.name + ", " + period}>
      <header className="ns-paper-head">
        <div className="ns-paper-crest" aria-hidden><span>LA</span></div>
        <div><strong className="ns-paper-school">Colegio Los Andes</strong><span>Pasto, Nariño · Resolución 0123 de 2015 · DANE 152001000000</span></div>
        <div className="ns-paper-title"><span>Informe académico</span><strong>{period + " · 2026"}</strong><small>{"Periodo " + N + " de " + PERIOD_SETUP.names.length}</small></div>
      </header>
      <section className="ns-paper-student">
        {facts.map((x) => <div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}
      </section>
      <table className="ns-paper-table ns-paper-table--rich">
        <caption className="ns-sr">{"Calificaciones de " + period + " por materia, periodos anteriores, acumulado y concepto de cada docente"}</caption>
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
        {rows.map((r) => (
          <tbody key={r.subject} className="ns-paper-subject">
            <tr>
              <th scope="row">{r.subject}<small>{r.teacher}</small></th>
              {past.map((k) => <td key={k} className="is-num is-past">{formatGrade(r.periods[k - 1])}</td>)}
              <td className="is-grade is-current">{formatGrade(r.grade)}</td>
              <td className="is-grade is-cum">{formatGrade(r.cumulative)}</td>
              <td><span className={"ns-perf ns-perf--" + PERF(r.grade).toLowerCase()}>{PERF(r.grade)}</span></td>
              <td className="is-num">{r.absences}</td>
            </tr>
            <tr className="ns-paper-concept"><td colSpan={cols}><span>Concepto del docente</span>{r.concept}</td></tr>
          </tbody>
        ))}
        <tfoot>
          <tr>
            <th scope="row" colSpan={1 + past.length}>Promedio</th>
            <td className="is-grade is-current">{formatGrade(avg)}</td>
            <td className="is-grade is-cum">{formatGrade(cum)}</td>
            <td>{PERF(avg)}</td>
            <td className="is-num">{absences}</td>
          </tr>
        </tfoot>
      </table>
      <p className="ns-paper-note">{"Desempeño según la nota del periodo. El acumulado pondera los periodos cursados con los pesos que configura Secretaría (" + wText + ")."}</p>
      <div className="ns-paper-cols">
        <section><h4>Asistencia</h4><p>{s.attendance + "% de asistencia · " + absences + " faltas registradas en el periodo"}</p></section>
        <section><h4>Escala de valoración</h4><p>Superior 4.6–5.0 · Alto 4.0–4.5 · Básico 3.0–3.9 · Bajo 1.0–2.9 (Decreto 1290 de 2009)</p></section>
      </div>
      <section className="ns-paper-msg">
        <h4>Mensaje del director de grupo</h4>
        <p>{directorMessage(s, rows, avg)}</p>
        <span className="ns-paper-msg-by">{"— " + director + ", director(a) de grupo " + s.course}</span>
      </section>
      <footer className="ns-paper-sign">
        <div><em className="ns-paper-signature" aria-hidden>{director.split(" ").slice(0, 2).join(" ")}</em><span /><strong>{director}</strong>{"Director(a) de grupo · " + s.course}</div>
        <div><em className="ns-paper-signature" aria-hidden>H. Villota</em><span /><strong>Hernando Villota</strong>Rector</div>
        <div className="ns-paper-seal" aria-hidden>NotaScan.<small>Verificado</small></div>
      </footer>
    </article>
  );
}
