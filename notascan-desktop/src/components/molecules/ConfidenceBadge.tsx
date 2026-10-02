import { LEVEL_LABEL, confidenceLevel } from "../../lib/grade";
import { Badge } from "../atoms/Badge";

interface ConfidenceBadgeProps {
  value: number;
  compact?: boolean;
  className?: string;
}

/** Porcentaje de confianza con tono, icono y nivel en texto para lectores de pantalla. */
export function ConfidenceBadge({ value, compact, className }: ConfidenceBadgeProps) {
  const v = Math.round(value || 0);
  const lvl = confidenceLevel(v);
  return (
    <Badge tone={lvl} className={className} title={LEVEL_LABEL[lvl]}>
      <span>{(compact ? "IA " : "Confianza IA ") + v + "%"}</span>
      <span className="ns-sr">{" · " + LEVEL_LABEL[lvl]}</span>
    </Badge>
  );
}
