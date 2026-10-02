import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { formatGrade, validateGrade } from "../../lib/grade";
import type { GradeCheck } from "../../types/domain";
import { GradeInput } from "../atoms/GradeInput";
import { Icon } from "../atoms/Icon";

interface GradeInputGroupProps {
  id?: string;
  /** Nota que leyó la IA; NaN si no detectó ninguna. */
  detected: number;
  value?: string;
  onChange?: (raw: string, check: GradeCheck) => void;
  label?: string;
  actions?: ReactNode;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}

/** Campo de nota más el origen del dato: detectado por la IA, corregido o introducido a mano. */
export function GradeInputGroup({ id, detected, value, onChange, label, actions, autoFocus, onKeyDown, className }: GradeInputGroupProps) {
  const shown = value !== undefined ? value : formatGrade(detected);
  const check = validateGrade(shown);
  const manual = detected === null || detected === undefined || isNaN(detected);
  const edited = !manual && check.valid && Math.abs(check.value - detected) > 0.001;
  return (
    <div className={cx("ns-gig", className)}>
      <GradeInput id={id} label={label || "Calificación detectada"} value={shown} onChange={onChange} autoFocus={autoFocus} onKeyDown={onKeyDown} hint="Escala de 1.0 a 5.0" />
      <span className={cx("ns-gig-note", edited && "is-edited")}>
        <Icon name={edited || manual ? "edit" : "ai"} size={14} />
        {manual ? "La IA no detectó una nota: ingreso manual" : edited ? "Corregida por el docente · la IA detectó " + formatGrade(detected) : "La IA detectó esta calificación"}
      </span>
      {actions ? <div className="ns-row" style={{ gap: 8 }}>{actions}</div> : null}
    </div>
  );
}
