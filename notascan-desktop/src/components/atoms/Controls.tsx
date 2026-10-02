import type { KeyboardEvent, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "./Icon";

// Tonos de notascan.css (.ns-progress--*). "gold" lo usa el sistema en su marcado aunque no tiene
// regla propia: se ve con el relleno por defecto. Se acepta para reproducir el mismo DOM.
type Tone = "sage" | "burgundy" | "inverse" | "gold";

/** Barra de avance con role="progressbar". */
export function Progress({ value, total, tone, label }: { value: number; total: number; tone?: Tone; label?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={cx("ns-progress", tone && "ns-progress--" + tone)} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} aria-label={label || "Avance"}>
      <span style={{ width: pct + "%" }} />
    </div>
  );
}

export function ProgressBar({ value, total, tone, label, showValue, valueText }: { value: number; total: number; tone?: Tone; label?: string; showValue?: boolean; valueText?: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="ns-pbar">
      {label || showValue ? <div className="ns-pbar-head"><span>{label}</span>{showValue ? <strong>{valueText || pct + "%"}</strong> : null}</div> : null}
      <Progress value={value} total={total} tone={tone} label={label || "Progreso"} />
    </div>
  );
}

/** Botón solo-icono con aria-label y tooltip; lleva siempre la palabra en `label`. */
export function IconAction({ icon, label, tone, disabled, onClick }: { icon: IconName; label: string; tone?: "danger"; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={cx("ns-iconbtn", tone && "ns-iconbtn--" + tone)} aria-label={label} data-tip={label} disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={16} />
    </button>
  );
}

export interface SegTab { value: string; label: ReactNode; icon?: IconName; count?: number }

/** Pestañas segmentadas con flechas izquierda/derecha (patrón tablist). */
export function SegmentedTabs({ tabs, value, onChange, label, className }: { tabs: SegTab[]; value: string; onChange: (v: string) => void; label: string; className?: string }) {
  function key(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = tabs.length;
    const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(tabs[j].value);
    const btns = e.currentTarget.parentNode?.querySelectorAll<HTMLButtonElement>("[role=tab]");
    btns?.[j]?.focus();
  }
  return (
    <div className={cx("ns-seg", className)} role="tablist" aria-label={label}>
      {tabs.map((t, i) => {
        const on = value === t.value;
        return (
          <button key={t.value} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} className="ns-seg-tab" onClick={() => onChange(t.value)} onKeyDown={(e) => key(e, i)}>
            {t.icon ? <Icon name={t.icon} size={16} /> : null}{t.label}{t.count !== undefined ? <span className="ns-chip-count">{t.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Separador: línea editorial, línea fuerte u ornamento con texto. */
export function Divider({ variant = "hairline", label, className }: { variant?: "hairline" | "strong" | "ornament"; label?: string; className?: string }) {
  if (variant === "ornament") {
    return <div className={cx("ns-divider ns-divider--ornament", className)} role="separator"><span className="ns-divider-mark">{label || "NotaScan"}</span></div>;
  }
  return <hr className={cx("ns-divider", variant === "strong" && "ns-divider--strong", className)} />;
}
