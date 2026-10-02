import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon } from "./Icon";

/* Sistema de formularios de notascan-ui: label real, ayuda, error, éxito, obligatorio,
   deshabilitado y solo lectura, con los mismos textos y clases en todos los controles. */

interface FieldShellProps {
  id: string;
  label?: string;
  required?: boolean;
  hint?: string | null;
  error?: string | null;
  success?: string;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, required, hint, error, success, className, children }: FieldShellProps) {
  return (
    <div className={cx("ns-field", className)}>
      <label htmlFor={id} className="ns-field-label">{label}{required ? <span className="ns-req" aria-hidden> *</span> : null}</label>
      {children}
      {error ? <span className="ns-field-error" role="alert" id={id + "-msg"}><Icon name="error" size={16} />{error}</span>
        : success ? <span className="ns-field-success" id={id + "-msg"}><Icon name="check" size={16} />{success}</span>
          : hint ? <span className="ns-field-hint" id={id + "-msg"}>{hint}</span> : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  hideLabel?: boolean;
  hint?: string | null;
  error?: string | null;
  success?: string;
  state?: "hover" | "focus";
  className?: string;
}

export function Input({ label, hideLabel, hint, error, success, id, className, state, required, ...other }: InputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = inputId + "-hint", errId = inputId + "-err";
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cx("ns-field", className)}>
      {label ? (
        <label htmlFor={inputId} className={cx("ns-field-label", hideLabel && "ns-sr")}>
          {label}{required ? <span className="ns-req" aria-hidden> *</span> : null}
        </label>
      ) : null}
      <input id={inputId} className={cx("ns-input", state && "is-" + state, success && "is-success")} aria-invalid={error ? true : undefined} aria-describedby={describedBy} required={required} {...other} />
      {error ? <span id={errId} className="ns-field-error" role="alert"><Icon name="error" size={16} />{error}</span>
        : success ? <span id={hintId} className="ns-field-success"><Icon name="check" size={16} />{success}</span>
          : hint ? <span id={hintId} className="ns-field-hint">{hint}</span> : null}
    </div>
  );
}

export type SelectOption = string | { value: string; label: string };

interface SelectProps {
  id?: string;
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string | null;
  error?: string | null;
  onChange?: (v: string) => void;
  className?: string;
}

export function Select({ id, label, options, value, defaultValue, placeholder, required, disabled, hint, error, onChange, className }: SelectProps) {
  const autoId = useId();
  const sid = id || autoId;
  return (
    <FieldShell id={sid} label={label} required={required} hint={hint} error={error} className={className}>
      <select id={sid} className={cx("ns-input ns-select-input", error && "is-invalid")} value={value} defaultValue={defaultValue} disabled={disabled} required={required}
        aria-invalid={error ? true : undefined} aria-describedby={sid + "-msg"} onChange={(e) => onChange?.(e.target.value)}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return <option key={v} value={v}>{typeof o === "string" ? o : o.label}</option>;
        })}
      </select>
    </FieldShell>
  );
}

interface TextareaProps {
  id?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  hint?: string | null;
  error?: string | null;
  onChange?: (v: string) => void;
  className?: string;
}

export function Textarea({ id, label, value, defaultValue, placeholder, rows = 3, required, readOnly, disabled, hint, error, onChange, className }: TextareaProps) {
  const autoId = useId();
  const tid = id || autoId;
  return (
    <FieldShell id={tid} label={label} required={required} hint={hint} error={error} className={className}>
      <textarea id={tid} className="ns-input ns-textarea" rows={rows} value={value} defaultValue={defaultValue} placeholder={placeholder} readOnly={readOnly} disabled={disabled}
        aria-describedby={tid + "-msg"} onChange={(e) => onChange?.(e.target.value)} />
    </FieldShell>
  );
}

interface CheckboxProps {
  label: string;
  hideLabel?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  className?: string;
}

export function Checkbox({ label, hideLabel, checked, indeterminate, disabled, onChange, className }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className={cx("ns-checkbox", hideLabel && "ns-checkbox--bare", className)}>
      <input ref={ref} type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} aria-label={hideLabel ? label : undefined} />
      <span className="ns-checkbox-box" aria-hidden><Icon name={indeterminate ? "minus" : "check"} size={14} strokeWidth={3} /></span>
      {hideLabel ? null : <span>{label}</span>}
    </label>
  );
}
