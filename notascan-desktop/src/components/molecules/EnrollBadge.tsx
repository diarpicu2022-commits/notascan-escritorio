import type { EnrollmentStatus } from "../../types/domain";
import { Badge, type BadgeTone } from "../atoms/Badge";
import type { IconName } from "../atoms/Icon";
import { useI18n } from "../../i18n/I18nProvider";


const ENROLL_STATUS: Record<EnrollmentStatus, [BadgeTone, IconName]> = {
  active: ["verified", "check"],
  pending: ["pending", "clock"],
  retired: ["review", "userx"],
  archived: ["neutral", "archive"],
};

/** Estado de matrícula con palabra, tono e icono. */
export function EnrollBadge({ status }: { status: EnrollmentStatus }) {
  const { t } = useI18n();
  const known = status in ENROLL_STATUS ? status : "active";
  const [tone, icon] = ENROLL_STATUS[known];
  return <Badge tone={tone} icon={icon}>{t.enroll[known]}</Badge>;
}
