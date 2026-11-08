import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { formatGrade, validateGrade } from "../../lib/grade";
import { useI18n } from "../../i18n/I18nProvider";
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
  const { t, shownGrade } = useI18n();
  const c = t.tch.card;
  const shown = value !== undefined ? value : formatGrade(detected);
  const check = validateGrade(shown);
  const manual = detected === null || detected === undefined || isNaN(detected);
  const edited = !manual && check.valid && Math.abs(check.value - detected) > 0.001;
  return (
    <div className={cx("ns-gig", className)}>
      <GradeInput id={id} label={label || c.detected} value={shown} onChange={onChange} autoFocus={autoFocus} onKeyDown={onKeyDown} hint={c.scale} />
      <span className={cx("ns-gig-note", edited && "is-edited")}>
        <Icon name={edited || manual ? "edit" : "ai"} size={14} />
        {manual ? c.gigManual : edited ? c.gigEdited(shownGrade(detected)) : c.gigAi}
      </span>
      {actions ? <div className="ns-row" style={{ gap: 8 }}>{actions}</div> : null}
    </div>
  );
}
