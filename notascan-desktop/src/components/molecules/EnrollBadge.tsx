import type { EnrollmentStatus } from "../../types/domain";
import { Badge, type BadgeTone } from "../atoms/Badge";
import type { IconName } from "../atoms/Icon";

const ENROLL_STATUS: Record<EnrollmentStatus, [string, BadgeTone, IconName]> = {
  active: ["Activo", "verified", "check"],
  pending: ["Pendiente", "pending", "clock"],
  retired: ["Retirado", "review", "userx"],
  archived: ["Archivado", "neutral", "archive"],
};

/** Estado de matrícula con palabra, tono e icono. */
export function EnrollBadge({ status }: { status: EnrollmentStatus }) {
  const [label, tone, icon] = ENROLL_STATUS[status] || ENROLL_STATUS.active;
  return <Badge tone={tone} icon={icon}>{label}</Badge>;
}
