import { cx } from "../../lib/cx";
import { useI18n } from "../../i18n/I18nProvider";


type DotStatus = "processing" | "success" | "warning" | "error";

interface StatusDotProps {
  status?: DotStatus;
  label?: string;
  hideLabel?: boolean;
  className?: string;
}

/** Punto de estado que cambia de forma (círculo, rombo, cuadrado, anillo), no solo de color. */
export function StatusDot({ status = "success", label, hideLabel, className }: StatusDotProps) {
  const { t } = useI18n();
  const word = label || t.common.dot[status];
  return (
    <span className={cx("ns-dot", "ns-dot--" + status, className)} role={status === "processing" ? "status" : undefined}>
      <span className="ns-dot-mark" aria-hidden />
      {hideLabel ? <span className="ns-sr">{word}</span> : word}
    </span>
  );
}
