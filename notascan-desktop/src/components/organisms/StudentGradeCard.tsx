import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useCountUp } from "../../hooks/useCountUp";
import { cx } from "../../lib/cx";
import { confidenceLevel, validateGrade } from "../../lib/grade";
import type { ReviewStatus as Status } from "../../types/domain";
import { Avatar } from "../atoms/Avatar";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { ConfidenceIndicator } from "../atoms/ConfidenceIndicator";
import { Icon } from "../atoms/Icon";
import { ConfidenceBadge } from "../molecules/ConfidenceBadge";
import { GradeInputGroup } from "../molecules/GradeInputGroup";
import { ReviewStatus } from "../molecules/ReviewStatus";
import { useI18n } from "../../i18n/I18nProvider";

export interface StudentGradeCardProps {
  student: { name: string; id: string; course?: string };
  /** Nota leída por la IA; NaN o null si no detectó ninguna. */
  detected: number | null;
  /** Porcentaje 0–100 que devuelve el reconocimiento. */
  confidence: number;
  /** Nota vigente (controlada). Si no se da, parte de `detected`. */
  grade?: number;
  status?: Status;
  onStatusChange?: (s: Status) => void;
  onGradeChange?: (n: number) => void;
  onConfirm?: (n: number) => void;
  index?: number;
  animate?: boolean;
  editing?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Organismo central: una nota detectada por la IA, lista para que el docente la verifique.
 * Jerarquía (no alterar): calificación → estudiante → confianza → estado → acciones → metadata.
 */
export function StudentGradeCard(props: StudentGradeCardProps) {
  const { student: s, confidence, index, animate = true, className, style } = props;
  const detected = props.detected ?? NaN;
  const [ownGrade, setOwnGrade] = useState<number>(props.grade !== undefined ? props.grade : detected);
  const grade = props.grade !== undefined ? props.grade : ownGrade;
  const [ownStatus, setOwnStatus] = useState<Status>(props.status || (confidenceLevel(confidence) === "low" ? "needs-review" : "pending"));
  const status = props.status !== undefined && props.onStatusChange ? props.status : ownStatus;
  const [editing, setEditing] = useState(!!props.editing);
  const { t, shownGrade } = useI18n();
  const [draft, setDraft] = useState(shownGrade(grade));
  const [stamping, setStamping] = useState(false);
  const shown = useCountUp(isNaN(grade) ? 0 : grade, animate);
  const check = validateGrade(draft);
  const noDetection = isNaN(detected);
  const failed = noDetection && isNaN(grade);
  const headingId = useId();
  const stampTimer = useRef<number>();
  const c = t.tch.card;

  useEffect(() => () => window.clearTimeout(stampTimer.current), []);

  function setStatus(v: Status) { setOwnStatus(v); props.onStatusChange?.(v); }
  function commitDraft(): boolean {
    if (!check.valid) return false;
    setOwnGrade(check.value);
    props.onGradeChange?.(check.value);
    return true;
  }
  function confirm() {
    if (editing && !commitDraft()) return;
    setEditing(false);
    setStamping(true);
    setStatus("verified");
    props.onConfirm?.(editing ? check.value : grade);
    stampTimer.current = window.setTimeout(() => setStamping(false), 700);
  }
  function startEdit() {
    setDraft(failed ? "" : shownGrade(grade));
    setEditing(true);
    if (status === "verified") setStatus("pending");
  }
  function cancelEdit() { setEditing(false); setDraft(shownGrade(grade)); }

  const edited = !noDetection && Math.abs(grade - detected) > 0.001;

  return (
    <article className={cx("ns-card", "ns-card--" + status, stamping && "is-stamping", className)} aria-labelledby={headingId} style={style}>
      {index ? <span className="ns-card-index" aria-hidden>{c.number(String(index).padStart(2, "0"))}</span> : null}

      <div className="ns-card-head">
        <Avatar name={s.name} size="sm" />
        <div className="ns-card-who">
          <h3 id={headingId} className="ns-card-name" style={{ margin: 0 }}>{s.name}</h3>
          <span className="ns-card-id">{t.tch.idOf(s.id) + (s.course ? " · " + s.course : "")}</span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          {noDetection ? <Badge tone="low" icon="error">{c.noDetection}</Badge> : <ConfidenceBadge value={confidence} compact />}
        </div>
      </div>

      <div className="ns-card-body">
        {editing ? (
          <div className="ns-card-edit" style={{ gridColumn: "1 / -1" }}>
            <GradeInputGroup
              detected={noDetection ? NaN : detected} value={draft} autoFocus
              label={noDetection ? c.enter : c.correct}
              onChange={(v) => setDraft(v)}
              onKeyDown={(e) => { if (e.key === "Enter") confirm(); if (e.key === "Escape") cancelEdit(); }}
            />
          </div>
        ) : failed ? (
          <div style={{ gridColumn: "1 / -1", display: "grid", gap: 6, padding: "8px 0" }}>
            <strong className="ns-serif" style={{ fontSize: 20, lineHeight: "26px" }}>{c.failed}</strong>
            <span className="ns-caption" style={{ color: "var(--charcoal)" }}>{c.manual}</span>
          </div>
        ) : (
          <>
            <div className="ns-card-grade-label">
              <span className="ns-overline" style={{ color: "var(--muted)" }}>
                {noDetection ? c.byTeacher : edited ? c.corrected : c.detected}
              </span>
            </div>
            <div className="ns-card-grade" aria-label={c.gradeAria(shownGrade(grade))}>{shownGrade(shown)}</div>
            {status === "verified" ? (
              <div className="ns-card-side">
                <div className={cx("ns-stamp", stamping && "is-new")} aria-hidden>
                  <span><b>{shownGrade(grade)}</b>{c.verified}</span>
                </div>
              </div>
            ) : (
              <div className="ns-card-side">
                {noDetection
                  ? <span className="ns-gig-note is-edited"><Icon name="edit" size={14} />{c.manualNote}</span>
                  : <ConfidenceIndicator value={confidence} label={c.aiReading} showHead={false} />}
                {edited ? <span className="ns-gig-note is-edited"><Icon name="edit" size={14} />{c.aiSaw(shownGrade(detected))}</span> : null}
              </div>
            )}
          </>
        )}
      </div>

      <div className="ns-card-foot">
        <ReviewStatus status={editing ? "pending" : status} label={editing ? t.tch.review.editing : undefined} />
        <div className="ns-card-actions">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>{c.cancel}</Button>
              <Button size="sm" icon="check" onClick={confirm} disabled={!check.valid}>{c.confirm}</Button>
            </>
          ) : status === "verified" ? (
            <Button variant="ghost" size="sm" icon="edit" onClick={startEdit} aria-label={c.editAria(s.name)}>{c.edit}</Button>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon="edit" onClick={startEdit} aria-label={c.editAria(s.name)}>{failed ? c.input : c.edit}</Button>
              {failed ? null : <Button size="sm" icon="check" onClick={confirm} aria-label={c.confirmAria(s.name)}>{c.confirm}</Button>}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** Estado de carga de la tarjeta. */
export function StudentGradeCardSkeleton() {
  return (
    <div className="ns-card ns-card--skeleton" aria-hidden>
      <div className="ns-card-head">
        <span className="ns-skel" style={{ width: 40, height: 40, borderRadius: 999 }} />
        <div style={{ display: "grid", gap: 6, flex: 1 }}>
          <span className="ns-skel" style={{ height: 14, width: "70%" }} />
          <span className="ns-skel" style={{ height: 10, width: "40%" }} />
        </div>
      </div>
      <div className="ns-card-body">
        <span className="ns-skel" style={{ width: 96, height: 64 }} />
        <span className="ns-skel" style={{ height: 30 }} />
      </div>
      <div className="ns-card-foot"><span className="ns-skel" style={{ height: 14, width: 120 }} /></div>
    </div>
  );
}
