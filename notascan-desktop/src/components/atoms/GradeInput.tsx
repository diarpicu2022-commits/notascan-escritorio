import { useId, useState, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { validateGrade } from "../../lib/grade";
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
      <label htmlFor={inputId} className={cx("ns-field-label", hideLabel && "ns-sr")}>{label || "Calificación"}</label>
      <div className={cx("ns-grade-input", invalid && "is-invalid", disabled && "is-disabled")}>
        <input
          id={inputId} type="text" inputMode="decimal" autoComplete="off" value={raw} onChange={handleChange}
          onKeyDown={onKeyDown} disabled={disabled} readOnly={readOnly} autoFocus={autoFocus}
          placeholder="0.0" aria-invalid={invalid || undefined} aria-describedby={inputId + "-msg"}
        />
        <span className="ns-grade-input-scale" aria-hidden><span>DE</span><span>5.0</span></span>
      </div>
      <span id={inputId + "-msg"} className={invalid ? "ns-field-error" : "ns-field-hint"} role={invalid ? "alert" : undefined}>
        {invalid ? <Icon name="error" size={16} /> : null}
        {invalid ? check.message : hint || "Escala de 1.0 a 5.0"}
      </span>
    </div>
  );
}
