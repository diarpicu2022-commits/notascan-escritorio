import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { formatGrade } from "../../lib/grade";
import { PERF, conceptFor, subjectGrades } from "../../data/academic";
import { ALL_STUDENTS } from "../../data/students";
import { Avatar } from "../atoms/Avatar";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { ProgressBar } from "../atoms/Controls";
import { Icon, type IconName } from "../atoms/Icon";
import { ConfirmAction } from "./Overlays";
import { useToast } from "./Toast";

type ConceptState = "empty" | "ai" | "teacher" | "reviewed";
const CONCEPT_STATE: Record<ConceptState, [string, "pending" | "medium" | "neutral" | "verified", IconName]> = {
  empty: ["Sin concepto", "pending", "clock"], ai: ["Borrador de IA · revisar", "medium", "ai"],
  teacher: ["Escrito por el docente", "neutral", "edit"], reviewed: ["Revisado", "verified", "check"],
};

interface ConceptRow { id: string; name: string; grade: number; prev: number; absences: number; text: string; state: ConceptState; busy: boolean }

/** Conceptos del periodo: la IA propone un borrador, el docente decide el texto final. */
export function ConceptEditor({ subject = "Matemáticas" }: { subject?: string }) {
  const [rows, setRows] = useState<ConceptRow[]>(() => ALL_STUDENTS.filter((s) => s.course === "7A" && s.status !== "retired").map((s, i) => {
    const g = subjectGrades(s).filter((x) => x.subject === subject)[0];
    return { id: s.id, name: s.name, grade: g.grade, prev: g.periods[g.periods.length - 2], absences: g.absences, text: i < 2 ? g.concept : "", state: i === 0 ? "reviewed" : i === 1 ? "ai" : "empty", busy: false };
  }));
  const [showToast, toastNode] = useToast();
  const [confirm, setConfirm] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const upd = (id: string, patch: Partial<ConceptRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  function suggest(list: ConceptRow[]) {
    list.forEach((r, k) => {
      upd(r.id, { busy: true });
      // Sin servicio de IA en esta fase: el borrador sale de la misma regla del sistema.
      timers.current.push(window.setTimeout(() => upd(r.id, { busy: false, text: conceptFor(subject, r.grade, r.absences, r.prev), state: "ai" }), 700 + k * 180));
    });
  }
  const c: Record<ConceptState, number> = { empty: 0, ai: 0, teacher: 0, reviewed: 0 };
  rows.forEach((r) => { c[r.state]++; });
  const done = c.reviewed + c.teacher, total = rows.length;

  return (
    <>
      <div className="ns-ai-banner" role="note">
        <span className="ns-ai-banner-icon" aria-hidden><Icon name="ai" size={20} /></span>
        <div>
          <strong>La IA te propone un borrador; tú decides el texto final.</strong>
          <span>Lo redacta a partir de la nota del periodo, su evolución y las faltas. Ningún concepto llega al boletín sin tu revisión.</span>
        </div>
        <Button variant="secondary" icon="ai" disabled={!c.empty} onClick={() => suggest(rows.filter((r) => r.state === "empty"))}>
          {c.empty ? "Sugerir los " + c.empty + " vacíos" : "Sin conceptos vacíos"}
        </Button>
      </div>
      <div className="ns-concept-progress">
        <ProgressBar label={done + " de " + total + " conceptos listos para el boletín"} value={done} total={total} showValue tone={done === total ? "sage" : "gold"} />
      </div>
      <ul className="ns-concepts">
        {rows.map((r) => {
          const st = CONCEPT_STATE[r.state];
          return (
            <li key={r.id} className={cx("ns-concept", "is-" + r.state)}>
              <div className="ns-concept-head">
                <Avatar name={r.name} size="sm" />
                <div className="ns-concept-who"><strong>{r.name}</strong><span className="ns-caption">{"Periodo 2: " + formatGrade(r.prev) + " · Faltas: " + r.absences}</span></div>
                <span className="ns-concept-grade">{formatGrade(r.grade)}<small>{PERF(r.grade)}</small></span>
                <Badge tone={st[1]} icon={st[2]}>{st[0]}</Badge>
              </div>
              <label className="ns-sr" htmlFor={"cpt-" + r.id}>{"Concepto de " + r.name}</label>
              <textarea
                id={"cpt-" + r.id} className={cx("ns-input ns-textarea", r.state === "ai" && "is-ai")} rows={3} value={r.busy ? "" : r.text}
                placeholder={r.busy ? "La IA está redactando un borrador…" : "Escribe el concepto o pide una sugerencia."} disabled={r.busy}
                onChange={(e) => upd(r.id, { text: e.target.value, state: e.target.value.trim() ? "teacher" : "empty" })}
              />
              <div className="ns-concept-actions">
                <Button size="sm" variant="ghost" icon="ai" loading={r.busy} loadingText="Redactando…" onClick={() => suggest([r])}>{r.text ? "Sugerir otra redacción" : "Sugerir con IA"}</Button>
                {r.state === "ai" ? <Button size="sm" icon="check" onClick={() => upd(r.id, { state: "reviewed" })}>Aprobar borrador</Button> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ns-sticky-cta"><Button size="lg" icon="book" onClick={() => setConfirm(true)}>Enviar a boletines</Button></div>
      <ConfirmAction
        open={confirm} icon="book" onCancel={() => setConfirm(false)}
        title={done === total ? "¿Enviar " + total + " conceptos a boletines?" : "Faltan " + (total - done) + " conceptos por revisar"}
        description={done === total ? "Aparecerán en el boletín del Periodo 3 junto a la nota de " + subject + "." : "Solo se enviarán los " + done + " conceptos revisados o escritos por ti. Los borradores de IA sin revisar no se publican."}
        confirmLabel={done === total ? "Enviar a boletines" : "Enviar los " + done + " listos"}
        onConfirm={() => { setConfirm(false); showToast({ tone: "success", title: "Conceptos enviados", message: done + " conceptos de " + subject + " · 7A quedaron en los boletines." }); }}
      />
      {toastNode}
    </>
  );
}
