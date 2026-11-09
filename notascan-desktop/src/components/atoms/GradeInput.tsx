import { useId, useState, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { gradeCheckText, validateGrade } from "../../lib/grade";
import { useI18n } from "../../i18n/I18nProvider";
import type { GradeCheck } from "../../types/domain";
import { Icon } from "./Icon";

export interface GradeInputProps {
  id?: string;
  label?: string;
  hideLabel?: boolean;
  value?: string;
  defaultValue?: string | number;
  onChange?: (raw: string, check: GradeCheck) => void;
  hint?: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  showError?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}

/** Campo de nota 1.0–5.0: solo acepta dígitos y separador decimal, y explica el error con salida. */
export function GradeInput({
  id, label, hideLabel, value, defaultValue, onChange, hint, disabled, readOnly, autoFocus, showError = true, onKeyDown, className,
}: GradeInputProps) {
  const autoId = useId();
  const { t, grade } = useI18n();
  const inputId = id || autoId;
  const controlled = value !== undefined;
  const [own, setOwn] = useState(defaultValue !== undefined ? String(defaultValue) : "");
  const raw = controlled ? String(value) : own;
  const check = validateGrade(raw);
  const invalid = showError && raw !== "" && !check.valid;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.replace(/[^0-9.,]/g, "").slice(0, 4);
    if (!controlled) setOwn(v);
    onChange?.(v, validateGrade(v));
  }

  return (
    <div className={cx("ns-field", className)}>
      <label htmlFor={inputId} className={cx("ns-field-label", hideLabel && "ns-sr")}>{label || t.tch.card.gradeLabel}</label>
      <div className={cx("ns-grade-input", invalid && "is-invalid", disabled && "is-disabled")}>
        <input
          id={inputId} type="text" inputMode="decimal" autoComplete="off" value={raw} onChange={handleChange}
          onKeyDown={onKeyDown} disabled={disabled} readOnly={readOnly} autoFocus={autoFocus}
          placeholder={grade(0)} aria-invalid={invalid || undefined} aria-describedby={inputId + "-msg"}
        />
        <span className="ns-grade-input-scale" aria-hidden><span>{t.tch.card.of}</span><span>{grade(5)}</span></span>
      </div>
      <span id={inputId + "-msg"} className={invalid ? "ns-field-error" : "ns-field-hint"} role={invalid ? "alert" : undefined}>
        {invalid ? <Icon name="error" size={16} /> : null}
        {invalid ? gradeCheckText(t.tch.gradeCheck, raw) : hint || t.tch.card.scale}
      </span>
    </div>
  );
}
