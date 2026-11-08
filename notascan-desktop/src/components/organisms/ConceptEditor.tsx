import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { useI18n } from "../../i18n/I18nProvider";
import { PERF } from "../../data/academic";
import { draftConcept, saveMessage, type ConceptRow as ConceptData, type ConceptState } from "../../services/teacher";
import { Avatar } from "../atoms/Avatar";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { ProgressBar } from "../atoms/Controls";
import { Icon, type IconName } from "../atoms/Icon";
import { ConfirmAction } from "./Overlays";
import { useToast } from "./Toast";

/** Tono e icono de cada estado; la palabra sale del diccionario (t.tch.concept.states). */
const CONCEPT_STATE: Record<ConceptState, ["pending" | "medium" | "neutral" | "verified", IconName]> = {
  empty: ["pending", "clock"], ai: ["medium", "ai"], teacher: ["neutral", "edit"], reviewed: ["verified", "check"],
};

type ConceptRow = ConceptData & { busy: boolean };
type Saved = Pick<ConceptRow, "id" | "text" | "state">;

/**
 * Textos que cambian cuando el editor se usa para el mensaje del director de grupo (6b.3c). Con `copy` el editor
 * habla de «mensajes»; sin él, de «conceptos» (los textos vienen del diccionario, idiomas paso 3).
 */
export interface EditorCopy {
  banner: string;
  meta: (r: ConceptData) => string;
  sentTitle: string;
  sentMessage: (n: number) => string;
  allReady: (n: number) => string;
}

interface ConceptEditorProps {
  subject?: string;
  /** Borrador propio (por defecto, el del concepto de la materia). Sin nota, null. */
  draft?: (r: ConceptData) => string | null;
  copy?: EditorCopy;
  course?: string;
  period?: string;
  prevPeriod?: string;
  data: ConceptData[];
  /** Guarda conceptos (texto y estado). Si falla, se avisa y el texto sigue en pantalla. */
  onSave?: (rows: Saved[]) => Promise<void>;
}

/** Conceptos del periodo: la IA propone un borrador, el docente decide el texto final. */
export function ConceptEditor({ subject = "Matemáticas", course = "7A", period: periodRaw = "Periodo 3", prevPeriod: prevRaw = "Periodo 2", data, onSave, draft = (r) => draftConcept(subject, r), copy }: ConceptEditorProps) {
  const { t, shownGrade } = useI18n();
  const x = t.tch.concept;
  const k = copy ? "director" : "concept";
  const period = t.tch.periodName(periodRaw), prevPeriod = t.tch.periodName(prevRaw);
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
  const persistQuiet = (list: Saved[]) => persist(list).catch((e) => showToast({ tone: "error", title: x.saveOneError(k), message: saveMessage(e, t) + x.textKept }));
  function suggest(list: ConceptRow[]) {
    // Sin nota verificada en el periodo no hay base para un borrador: ese concepto lo escribe el docente.
    const ok = list.filter((r) => draft(r) !== null);
    if (ok.length < list.length) showToast({ tone: "info", title: x.noGradesTitle(list.length - ok.length), message: x.noGradesText(k) });
    ok.forEach((r, k) => {
      upd(r.id, { busy: true });
      // Sin servicio de IA en esta fase: el borrador sale de la misma regla del sistema.
      timers.current.push(window.setTimeout(() => {
        const text = draft(r)!;
        upd(r.id, { busy: false, text, state: "ai" });
        persistQuiet([{ id: r.id, text, state: "ai" }]);
      }, 700 + k * 180));
    });
  }
  function send() {
    setSending(true);
    persist(rows.filter((r) => r.text.trim()).map(({ id, text, state }) => ({ id, text, state }))).then(
      () => { setConfirm(false); showToast({ tone: "success", title: copy?.sentTitle ?? x.sentTitle, message: copy ? copy.sentMessage(done) : x.sentText(done, subject, course) }); },
      (e) => { setConfirm(false); showToast({ tone: "error", title: x.sendError(k), message: saveMessage(e, t) + x.textsKept }); },
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
          <strong>{x.bannerTitle}</strong>
          <span>{copy?.banner ?? x.banner}</span>
        </div>
        <Button variant="secondary" icon="ai" disabled={!c.empty} onClick={() => suggest(rows.filter((r) => r.state === "empty"))}>
          {x.suggestEmpty(k, c.empty)}
        </Button>
      </div>
      {/* D2 y D3: solo en inglés y portugués; en español el diccionario deja estas líneas vacías. */}
      {x.langNote ? <p className="ns-caption" style={{ margin: 0 }}>{x.langNote + " " + t.tch.scaleNote}</p> : null}
      <div className="ns-concept-progress">
        <ProgressBar label={x.ready(k, done, total)} value={done} total={total} showValue tone={done === total ? "sage" : "gold"} />
      </div>
      <ul className="ns-concepts">
        {rows.map((r) => {
          const st = CONCEPT_STATE[r.state];
          return (
            <li key={r.id} className={cx("ns-concept", "is-" + r.state)}>
              <div className="ns-concept-head">
                <Avatar name={r.name} size="sm" />
                <div className="ns-concept-who"><strong>{r.name}</strong><span className="ns-caption">{copy ? copy.meta(r) : x.meta(prevPeriod, shownGrade(r.prev), r.absences)}</span></div>
                <span className="ns-concept-grade">{shownGrade(r.grade)}<small>{isNaN(r.grade) ? x.noGrade : PERF(r.grade)}</small></span>
                <Badge tone={st[0]} icon={st[1]}>{x.states[r.state]}</Badge>
              </div>
              <label className="ns-sr" htmlFor={"cpt-" + r.id}>{x.fieldLabel(k, r.name)}</label>
              <textarea
                id={"cpt-" + r.id} className={cx("ns-input ns-textarea", r.state === "ai" && "is-ai")} rows={3} value={r.busy ? "" : r.text}
                placeholder={r.busy ? x.drafting : x.placeholder} disabled={r.busy}
                onChange={(e) => upd(r.id, { text: e.target.value, state: e.target.value.trim() ? "teacher" : "empty" })}
                onBlur={() => persistQuiet([{ id: r.id, text: r.text, state: r.state }])}
              />
              <div className="ns-concept-actions">
                <Button size="sm" variant="ghost" icon="ai" loading={r.busy} loadingText={x.writing} onClick={() => suggest([r])}>{r.text ? x.suggestAgain : x.suggest}</Button>
                {r.state === "ai" ? <Button size="sm" icon="check" onClick={() => { upd(r.id, { state: "reviewed" }); persistQuiet([{ id: r.id, text: r.text, state: "reviewed" }]); }}>{x.approve}</Button> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="ns-sticky-cta"><Button size="lg" icon="book" onClick={() => setConfirm(true)}>{x.send}</Button></div>
      <ConfirmAction
        open={confirm} icon="book" onCancel={() => setConfirm(false)}
        title={done === total ? x.sendTitle(k, total) : x.missingTitle(k, total - done)}
        description={done === total ? (copy ? copy.allReady(total) : x.allReady(period, subject)) : x.partial(k, done)}
        confirmLabel={done === total ? x.send : x.sendReady(done)}
        loading={sending} onConfirm={send}
      />
      {toastNode}
    </>
  );
}
