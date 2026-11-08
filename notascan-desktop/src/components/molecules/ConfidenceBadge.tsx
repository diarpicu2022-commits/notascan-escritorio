import { confidenceLevel } from "../../lib/grade";
import { Badge } from "../atoms/Badge";
import { useI18n } from "../../i18n/I18nProvider";

interface ConfidenceBadgeProps {
  value: number;
  compact?: boolean;
  className?: string;
}

/** Porcentaje de confianza con tono, icono y nivel en texto para lectores de pantalla. */
export function ConfidenceBadge({ value, compact, className }: ConfidenceBadgeProps) {
  const v = Math.round(value || 0);
  const lvl = confidenceLevel(v);
  const { t } = useI18n();
  const level = t.tch.level[lvl];
  return (
    <Badge tone={lvl} className={className} title={level}>
      <span>{t.tch.card.confidence(!!compact, v)}</span>
      <span className="ns-sr">{" · " + level}</span>
    </Badge>
  );
}
