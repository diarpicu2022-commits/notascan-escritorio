import { useId } from "react";
import { cx } from "../../lib/cx";
import { Icon } from "./Icon";

interface SwitchProps {
  label?: string;
  ariaLabel?: string;
  hideLabel?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (on: boolean) => void;
  onText?: string;
  offText?: string;
  className?: string;
}

/** Interruptor con role="switch"; el estado también se lee en el icono del botón. */
export function Switch({ label, ariaLabel, hideLabel, checked, disabled, onChange, onText, offText, className }: SwitchProps) {
  const id = useId();
  const on = !!checked;
  return (
    <div className={cx("ns-switch-wrap", className)}>
      <button id={id} type="button" role="switch" aria-checked={on} aria-label={ariaLabel || label} disabled={disabled} className={cx("ns-switch", on && "is-on")} onClick={() => onChange?.(!on)}>
        <span className="ns-switch-knob" aria-hidden><Icon name={on ? "check" : "close"} size={12} strokeWidth={3} /></span>
      </button>
      {label && !hideLabel ? <label htmlFor={id} className="ns-switch-label">{label}</label> : null}
      {onText ? <span className={cx("ns-switch-state", on ? "is-on" : "is-off")}>{on ? onText : offText}</span> : null}
    </div>
  );
}
