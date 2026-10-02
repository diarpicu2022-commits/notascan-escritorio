import { cx } from "../../lib/cx";

type DotStatus = "processing" | "success" | "warning" | "error";
const DOT_LABEL: Record<DotStatus, string> = { processing: "Procesando", success: "Completado", warning: "Revisar", error: "Error" };

interface StatusDotProps {
  status?: DotStatus;
  label?: string;
  hideLabel?: boolean;
  className?: string;
}

/** Punto de estado que cambia de forma (círculo, rombo, cuadrado, anillo), no solo de color. */
export function StatusDot({ status = "success", label, hideLabel, className }: StatusDotProps) {
  return (
    <span className={cx("ns-dot", "ns-dot--" + status, className)} role={status === "processing" ? "status" : undefined}>
      <span className="ns-dot-mark" aria-hidden />
      {hideLabel ? <span className="ns-sr">{label || DOT_LABEL[status]}</span> : label || DOT_LABEL[status]}
    </span>
  );
}
