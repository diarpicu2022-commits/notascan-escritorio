import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { formatGrade } from "../../lib/grade";
import { PERF } from "../../data/academic";
import { draftConcept, saveMessage, type ConceptRow as ConceptData, type ConceptState } from "../../services/teacher";
import { Avatar } from "../atoms/Avatar";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { ProgressBar } from "../atoms/Controls";
import { Icon, type IconName } from "../atoms/Icon";
import { ConfirmAction } from "./Overlays";
import { useToast } from "./Toast";

const CONCEPT_STATE: Record<ConceptState, [string, "pending" | "medium" | "neutral" | "verified", IconName]> = {
  empty: ["Sin concepto", "pending", "clock"], ai: ["Borrador de IA · revisar", "medium", "ai"],
  teacher: ["Escrito por el docente", "neutral", "edit"], reviewed: ["Revisado", "verified", "check"],
};

type ConceptRow = ConceptData & { busy: boolean };
type Saved = Pick<ConceptRow, "id" | "text" | "state">;

interface ConceptEditorProps {
  subject?: string;
  course?: string;
  period?: string;
  prevPeriod?: string;
  data: ConceptData[];
  /** Guarda conceptos (texto y estado). Si falla, se avisa y el texto sigue en pantalla. */
  onSave?: (rows: Saved[]) => Promise<void>;
}

/** Conceptos del periodo: la IA propone un borrador, el docente decide el texto final. */
export function ConceptEditor({ subject = "Matemáticas", course = "7A", period = "Periodo 3", prevPeriod = "Periodo 2", data, onSave }: ConceptEditorProps) {
  const [rows, setRows] = useState<ConceptRow[]>(() => data.map((r) => ({ ...r, busy: false })));
  const [showToast, toastNode] = useToast();
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const timers = useRef<number[]>([]);
  const savedText = useRef(new Map(data.map((r) => [r.id, r.text + "|" + r.state])));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const upd = (id: string, patch: Partial<ConceptRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  /** Guarda en segundo plano lo que cambió frente a lo último guardado. */
  function persist(list: Saved[]) {
    const changed = list.filter((r) => savedText.current.get(r.id) !== r.text + "|" + r.state);
    if (!changed.length || !onSave) return Promise.resolve();
    return onSave(changed).then(() => { changed.forEach((r) => savedText.current.set(r.id, r.text + "|" + r.state)); });
  }
  const persistQuiet = (list: Saved[]) => persist(list).catch((e) => showToast({ tone: "error", title: "No pudimos guardar el concepto", message: saveMessage(e) + " El texto sigue en pantalla." }));
  function suggest(list: ConceptRow[]) {
    // Sin nota verificada en el periodo no hay base para un borrador: ese concepto lo escribe el docente.
    const ok = list.filter((r) => draftConcept(subject, r) !== null);
    if (ok.length < list.length) showToast({ tone: "info", title: (list.length - ok.length) + (list.length - ok.length === 1 ? " estudiante sin notas verificadas" : " estudiantes sin notas verificadas"), message: "Sin nota del periodo no hay borrador. Escribe su concepto a mano." });
    ok.forEach((r, k) => {
      upd(r.id, { busy: true });
      // Sin servicio de IA en esta fase: el borrador sale de la misma regla del sistema.
      timers.current.push(window.setTimeout(() => {
        const text = draftConcept(subject, r)!;
        upd(r.id, { busy: false, text, state: "ai" });
        persistQuiet([{ id: r.id, text, state: "ai" }]);
      }, 700 + k * 180));
    });
  }
  function send() {
    setSending(true);
    persist(rows.filter((r) => r.text.trim()).map(({ id, text, state }) => ({ id, text, state }))).then(
      () => { setConfirm(false); showToast({ tone: "success", title: "Conceptos enviados", message: done + " conceptos de " + subject + " · " + course + " quedaron en los boletines." }); },
      (e) => { setConfirm(false); showToast({ tone: "error", title: "No pudimos enviar los conceptos", message: saveMessage(e) + " Los textos siguen en pantalla." }); },
    ).finally(() => setSending(false));
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
                <div className="ns-concept-who"><strong>{r.name}</strong><span className="ns-caption">{prevPeriod + ": " + formatGrade(r.prev) + " · Faltas: " + r.absences}</span></div>
                <span className="ns-concept-grade">{formatGrade(r.grade)}<small>{isNaN(r.grade) ? "Sin nota" : PERF(r.grade)}</small></span>
                <Badge tone={st[1]} icon={st[2]}>{st[0]}</Badge>
              </div>
              <label className="ns-sr" htmlFor={"cpt-" + r.id}>{"Concepto de " + r.name}</label>
              <textarea
                id={"cpt-" + r.id} className={cx("ns-input ns-textarea", r.state === "ai" && "is-ai")} rows={3} value={r.busy ? "" : r.text}
                placeholder={r.busy ? "La IA está redactando un borrador…" : "Escribe el concepto o pide una sugerencia."} disabled={r.busy}
                onChange={(e) => upd(r.id, { text: e.target.value, state: e.target.value.trim() ? "teacher" : "empty" })}
                onBlur={() => persistQuiet([{ id: r.id, text: r.text, state: r.state }])}
              />
              <div className="ns-concept-actions">
                <Button size="sm" variant="ghost" icon="ai" loading={r.busy} loadingText="Redactando…" onClick={() => suggest([r])}>{r.text ? "Sugerir otra redacción" : "Sugerir con IA"}</Button>
                {r.state === "ai" ? <Button size="sm" icon="check" onClick={() => { upd(r.id, { state: "reviewed" }); persistQuiet([{ id: r.id, text: r.text, state: "reviewed" }]); }}>Aprobar borrador</Button> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ns-sticky-cta"><Button size="lg" icon="book" onClick={() => setConfirm(true)}>Enviar a boletines</Button></div>
      <ConfirmAction
        open={confirm} icon="book" onCancel={() => setConfirm(false)}
        title={done === total ? "¿Enviar " + total + " conceptos a boletines?" : "Faltan " + (total - done) + " conceptos por revisar"}
        description={done === total ? "Aparecerán en el boletín del " + period + " junto a la nota de " + subject + "." : "Solo se enviarán los " + done + " conceptos revisados o escritos por ti. Los borradores de IA sin revisar no se publican."}
        confirmLabel={done === total ? "Enviar a boletines" : "Enviar los " + done + " listos"}
        loading={sending} onConfirm={send}
      />
      {toastNode}
    </>
  );
}
