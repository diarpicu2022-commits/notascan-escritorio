import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { CountUp } from "../atoms/CountUp";
import { Icon, type IconName } from "../atoms/Icon";
import { StatusDot } from "../atoms/StatusDot";

/* Piezas del flujo de revisión: pasos, resumen bento, cinta del principio y panel de procesamiento. */

export const FLOW = ["Cargar fotografía", "Detectar estudiante", "Detectar calificación", "Calcular confianza", "Revisar", "Confirmar", "Guardar"];

/** Los siete pasos técnicos; la IA opera en 2–4, los pasos 5–7 son del docente. */
export function ReviewStepper({ current = 1, steps = FLOW, className }: { current?: number; steps?: string[]; className?: string }) {
  return (
    <ol className={cx("ns-stepper", className)} aria-label="Flujo de calificación">
      {steps.map((label, i) => {
        const n = i + 1, done = n < current, now = n === current;
        return (
          <li key={label} className={cx("ns-step", done && "is-done", now && "is-current")} aria-current={now ? "step" : undefined}>
            <span className="ns-step-mark">{done ? <Icon name="check" size={14} strokeWidth={3} /> : n}</span>
            <span className="ns-step-label">{label}{done ? <span className="ns-sr"> (completado)</span> : null}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface ReviewSummaryProps {
  total: number;
  verified: number;
  pending: number;
  review: number;
  evaluation?: string;
  foot?: string;
  labels?: [string, string, string];
  className?: string;
}

/** Bento de la revisión: bloque navy con el total y tres baldosas con significado de color. */
export function ReviewSummary({ total, verified: v, pending: p, review: r, evaluation, foot, labels, className }: ReviewSummaryProps) {
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const tile = (tone: string, value: number, label: string, icon: IconName, dot: "success" | "warning" | "error") => (
    <div className={"ns-bento-tile ns-bento-tile--" + tone}>
      <div className="ns-bento-top">
        <span className="ns-bento-icon" aria-hidden><Icon name={icon} size={18} strokeWidth={2.5} /></span>
        <span className="ns-bento-pct">{pct(value) + "%"}</span>
      </div>
      <span className="ns-bento-value"><CountUp value={value} /></span>
      <span className="ns-bento-label"><StatusDot status={dot} hideLabel label={label} />{label}</span>
    </div>
  );
  return (
    <section className={cx("ns-bento", className)} aria-label="Resumen de la revisión">
      <div className="ns-bento-tile ns-bento-tile--lead">
        <span className="ns-overline" style={{ color: "var(--gold)" }}>{evaluation || "Esta evaluación"}</span>
        <span className="ns-bento-value ns-bento-value--xl"><CountUp value={total} /><small> estudiantes</small></span>
        <div className="ns-bento-progress" role="img" aria-label={v + " de " + total + " verificadas"}>
          <span className="is-verified" style={{ width: pct(v) + "%" }} />
          <span className="is-review" style={{ width: pct(r) + "%" }} />
        </div>
        <span className="ns-bento-foot">{foot || (v === total ? "Todo verificado. Listo para guardar." : (total - v) + " por verificar antes de guardar")}</span>
      </div>
      {tile("sage", v, labels?.[0] || "verificadas", "check", "success")}
      {tile("gold", p, labels?.[1] || "pendientes", "clock", "warning")}
      {tile("burgundy", r, labels?.[2] || "requieren revisión", labels ? "shield" : "warning", "error")}
    </section>
  );
}

/** Cinta del principio de la marca. Una por página como máximo. */
export function Marquee({ items = ["La IA detecta", "El docente verifica", "El sistema guarda", "Precisión con control humano"], tone = "navy", label, className }: { items?: string[]; tone?: "navy" | "gold"; label?: string; className?: string }) {
  const seq: ReactNode[] = [];
  for (let k = 0; k < 4; k++) items.forEach((t, i) => seq.push(<span key={k + "-" + i} className="ns-marquee-item">{t}<span className="ns-marquee-sep" aria-hidden /></span>));
  return (
    <div className={cx("ns-marquee", "ns-marquee--" + tone, className)} role="note" aria-label={items.join(". ")}>
      <span className="ns-marquee-label" aria-hidden><Icon name="ai" size={16} strokeWidth={2.5} />{label || "Principio"}</span>
      <div className="ns-marquee-window"><div className="ns-marquee-track" aria-hidden>{seq}</div></div>
    </div>
  );
}

const PROC_STEPS = ["Identificando estudiante", "Detectando calificación", "Calculando confianza"];

interface ProcessingPanelProps {
  step?: number;
  simulate?: boolean;
  file?: string;
  index?: number;
  total?: number;
  grade?: string;
  studentName?: string;
  detected?: string;
  /** null: sin confianza (no se detectó); sin valor, la cifra de ejemplo del sistema. */
  confidence?: number | null;
  /** Título al terminar (por defecto, el del sistema). */
  doneTitle?: string;
  className?: string;
}

/** Reconocimiento de una foto: QR → nota → confianza. Vidrio porque flota sobre el flujo. */
export function ProcessingPanel({ step: stepProp, simulate, file = "parcial2_programacion_07.jpg", index, total, grade, studentName, detected, confidence, doneTitle = "Estudiante identificado", className }: ProcessingPanelProps) {
  const auto = simulate !== false && stepProp === undefined;
  const [own, setOwn] = useState(auto ? 0 : stepProp ?? 0);
  const step = auto ? own : stepProp ?? 0;
  useEffect(() => {
    if (!auto) return;
    if (step >= PROC_STEPS.length) { const t2 = window.setTimeout(() => setOwn(0), 2600); return () => window.clearTimeout(t2); }
    const t = window.setTimeout(() => setOwn(step + 1), 1100);
    return () => window.clearTimeout(t);
  }, [step, auto]);
  const done = step >= PROC_STEPS.length;
  return (
    <section className={cx("ns-proc ns-glass", className)} aria-live="polite" aria-busy={!done}>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <span className="ns-overline">{"Foto " + (index || 7) + " de " + (total || 24)}</span>
        <StatusDot status={done ? "success" : "processing"} label={done ? "Listo para revisar" : "Procesando"} />
      </div>
      <h2 className="ns-proc-title">{done ? doneTitle : "Analizando fotografía…"}</h2>
      <div className="ns-photo" role="img" aria-label={"Vista previa de " + file}>
        <span className="ns-photo-qr" />
        {step >= 1 ? <span className="ns-photo-box" style={{ left: "6%", top: "9%", width: 64, height: 64 }} /> : null}
        <span className="ns-photo-grade" style={{ opacity: step >= 1 ? 1 : 0.5 }}>{grade || "4,5"}</span>
        {step >= 2 ? <span className="ns-photo-box" style={{ right: "10%", top: "16%", width: 84, height: 56 }} /> : null}
        {done ? null : <span className="ns-photo-scan" />}
      </div>
      <ul className="ns-proc-list">
        {PROC_STEPS.map((label, i) => {
          const d = i < step, a = i === step;
          return (
            <li key={label} className={cx("ns-proc-item", d && "is-done", a && "is-active")}>
              {d ? <Icon name="check" size={18} /> : a ? <StatusDot status="processing" hideLabel /> : <Icon name="clock" size={18} />}
              {label}
              <span className="ns-proc-item-state">
                {d ? (i === 0 ? studentName || "María Fernanda López" : i === 1 ? detected || "4.5" : (confidence === undefined ? "98%" : confidence === null ? "—" : confidence + "%")) : a ? "En curso" : "En espera"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="ns-proc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(step, 3)} aria-label="Progreso del reconocimiento">
        <span style={{ width: (Math.min(step, 3) / 3) * 100 + "%" }} />
      </div>
      <span className="ns-caption">La IA solo detecta. Tú revisas y confirmas cada nota.</span>
    </section>
  );
}
