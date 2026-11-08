import { cx } from "../../lib/cx";
import { confidenceLevel } from "../../lib/grade";
import { useI18n } from "../../i18n/I18nProvider";
import { BADGE_ICON } from "./Badge";
import { Icon } from "./Icon";

interface ConfidenceIndicatorProps {
  value: number;
  label?: string;
  showHead?: boolean;
  showLevel?: boolean;
  className?: string;
}

/** Medidor de 10 segmentos con role="meter": cuánto confía la IA en su lectura. */
export function ConfidenceIndicator({ value, label, showHead = true, showLevel = true, className }: ConfidenceIndicatorProps) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const lvl = confidenceLevel(v);
  const { t } = useI18n();
  const level = t.tch.level[lvl], name = label || t.tch.card.confidenceLabel;
  const on = Math.round(v / 10);
  return (
    <div className={cx("ns-conf", "ns-conf--" + lvl, className)}>
      {showHead ? (
        <div className="ns-conf-head">
          <span>{name}</span>
          <span className="ns-conf-value">{v + "%"}</span>
        </div>
      ) : null}
      <div
        className="ns-conf-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}
        aria-valuetext={v + "% · " + level} aria-label={name}
      >
        {Array.from({ length: 10 }, (_, i) => <span key={i} className={cx("ns-conf-seg", i < on && "is-on")} />)}
      </div>
      {showLevel ? (
        <span className="ns-conf-level"><Icon name={BADGE_ICON[lvl]!} size={14} />{level}</span>
      ) : null}
    </div>
  );
}
