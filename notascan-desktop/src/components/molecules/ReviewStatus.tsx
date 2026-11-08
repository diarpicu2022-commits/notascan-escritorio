import { cx } from "../../lib/cx";
import type { ReviewStatus as Status } from "../../types/domain";
import { Icon, type IconName } from "../atoms/Icon";
import { useI18n } from "../../i18n/I18nProvider";

const STATUS_ICON: Record<Status, IconName> = { pending: "clock", verified: "check", "needs-review": "warning" };

interface ReviewStatusProps {
  status?: Status;
  label?: string;
  className?: string;
}

/** Estado de revisión con palabra fija: Pendiente de revisión · Verificada · Requiere revisión. */
export function ReviewStatus({ status = "pending", label, className }: ReviewStatusProps) {
  const { t } = useI18n();
  return (
    <span className={cx("ns-status", "ns-status--" + status, className)}>
      <Icon name={STATUS_ICON[status]} size={16} />
      {label || t.tch.review[status]}
    </span>
  );
}
