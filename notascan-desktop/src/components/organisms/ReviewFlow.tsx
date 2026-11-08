import { useEffect, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { CountUp } from "../atoms/CountUp";
import { Icon, type IconName } from "../atoms/Icon";
import { StatusDot } from "../atoms/StatusDot";
import { useI18n } from "../../i18n/I18nProvider";

/* Piezas del flujo de revisión: pasos, resumen bento, cinta del principio y panel de procesamiento. */

/** Los pasos en español; las pantallas usan los del idioma (t.tch.flow.steps). */
export const FLOW = ["Cargar fotografía", "Detectar estudiante", "Detectar calificación", "Calcular confianza", "Revisar", "Confirmar", "Guardar"];

/** Los siete pasos técnicos; la IA opera en 2–4, los pasos 5–7 son del docente. */
export function ReviewStepper({ current = 1, steps: own, className }: { current?: number; steps?: string[]; className?: string }) {
  const f = useI18n().t.tch.flow;
  const steps = own ?? f.steps;
  return (
    <ol className={cx("ns-stepper", className)} aria-label={f.aria}>
      {steps.map((label, i) => {
        const n = i + 1, done = n < current, now = n === current;
        return (
          <li key={label} className={cx("ns-step", done && "is-done", now && "is-current")} aria-current={now ? "step" : undefined}>
            <span className="ns-step-mark">{done ? <Icon name="check" size={14} strokeWidth={3} /> : n}</span>
            <span className="ns-step-label">{label}{done ? <span className="ns-sr">{f.done}</span> : null}</span>
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
  const { t } = useI18n();
  const f = t.tch.flow;
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
    <section className={cx("ns-bento", className)} aria-label={f.summaryAria}>
      <div className="ns-bento-tile ns-bento-tile--lead">
        <span className="ns-overline" style={{ color: "var(--gold)" }}>{evaluation || f.thisEvaluation}</span>
        <span className="ns-bento-value ns-bento-value--xl"><CountUp value={total} /><small>{f.students}</small></span>
        <div className="ns-bento-progress" role="img" aria-label={t.tch.verifiedOf(v, total)}>
          <span className="is-verified" style={{ width: pct(v) + "%" }} />
          <span className="is-review" style={{ width: pct(r) + "%" }} />
        </div>
        <span className="ns-bento-foot">{foot || (v === total ? f.allVerified : f.toVerify(total - v))}</span>
      </div>
      {tile("sage", v, labels?.[0] || f.tiles[0], "check", "success")}
      {tile("gold", p, labels?.[1] || f.tiles[1], "clock", "warning")}
      {tile("burgundy", r, labels?.[2] || f.tiles[2], labels ? "shield" : "warning", "error")}
    </section>
  );
}

/** Cinta del principio de la marca. Una por página como máximo. */
export function Marquee({ items: own, tone = "navy", label, className }: { items?: string[]; tone?: "navy" | "gold"; label?: string; className?: string }) {
  const f = useI18n().t.tch.flow;
  const items = own ?? f.marquee;
  const seq: ReactNode[] = [];
  for (let k = 0; k < 4; k++) items.forEach((t, i) => seq.push(<span key={k + "-" + i} className="ns-marquee-item">{t}<span className="ns-marquee-sep" aria-hidden /></span>));
  return (
    <div className={cx("ns-marquee", "ns-marquee--" + tone, className)} role="note" aria-label={items.join(". ")}>
      <span className="ns-marquee-label" aria-hidden><Icon name="ai" size={16} strokeWidth={2.5} />{label || f.principle}</span>
      <div className="ns-marquee-window"><div className="ns-marquee-track" aria-hidden>{seq}</div></div>
    </div>
  );
}

const PROC_N = 3;

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
export function ProcessingPanel({ step: stepProp, simulate, file = "parcial2_programacion_07.jpg", index, total, grade, studentName, detected, confidence, doneTitle, className }: ProcessingPanelProps) {
  const { t, grade: fmtGrade, shownGrade } = useI18n();
  const f = t.tch.flow;
  const auto = simulate !== false && stepProp === undefined;
  const [own, setOwn] = useState(auto ? 0 : stepProp ?? 0);
  const step = auto ? own : stepProp ?? 0;
  useEffect(() => {
    if (!auto) return;
    if (step >= PROC_N) { const t2 = window.setTimeout(() => setOwn(0), 2600); return () => window.clearTimeout(t2); }
    const t = window.setTimeout(() => setOwn(step + 1), 1100);
    return () => window.clearTimeout(t);
  }, [step, auto]);
  const done = step >= PROC_N;
  return (
    <section className={cx("ns-proc ns-glass", className)} aria-live="polite" aria-busy={!done}>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <span className="ns-overline">{f.photoOf(index || 7, total || 24)}</span>
        <StatusDot status={done ? "success" : "processing"} label={done ? f.readyToReview : f.processing} />
      </div>
      <h2 className="ns-proc-title">{done ? doneTitle ?? t.tch.upload.identified : f.analyzing}</h2>
      <div className="ns-photo" role="img" aria-label={f.previewOf(file)}>
        <span className="ns-photo-qr" />
        {step >= 1 ? <span className="ns-photo-box" style={{ left: "6%", top: "9%", width: 64, height: 64 }} /> : null}
        <span className="ns-photo-grade" style={{ opacity: step >= 1 ? 1 : 0.5 }}>{grade || fmtGrade(4.5)}</span>
        {step >= 2 ? <span className="ns-photo-box" style={{ right: "10%", top: "16%", width: 84, height: 56 }} /> : null}
        {done ? null : <span className="ns-photo-scan" />}
      </div>
      <ul className="ns-proc-list">
        {f.proc.map((label, i) => {
          const d = i < step, a = i === step;
          return (
            <li key={label} className={cx("ns-proc-item", d && "is-done", a && "is-active")}>
              {d ? <Icon name="check" size={18} /> : a ? <StatusDot status="processing" hideLabel /> : <Icon name="clock" size={18} />}
              {label}
              <span className="ns-proc-item-state">
                {d ? (i === 0 ? studentName || "María Fernanda López" : i === 1 ? detected || shownGrade(4.5) : (confidence === undefined ? "98%" : confidence === null ? "—" : confidence + "%")) : a ? f.running : f.waiting}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="ns-proc-bar" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Math.min(step, 3)} aria-label={f.procAria}>
        <span style={{ width: (Math.min(step, 3) / 3) * 100 + "%" }} />
      </div>
      <span className="ns-caption">{f.aiOnly}</span>
    </section>
  );
}
