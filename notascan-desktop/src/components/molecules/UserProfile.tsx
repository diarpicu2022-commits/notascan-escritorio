import { cx } from "../../lib/cx";
import { Avatar } from "../atoms/Avatar";

interface UserProfileProps {
  name: string;
  role?: string;
  src?: string;
  compact?: boolean;
  className?: string;
}

export function UserProfile({ name, role, src, compact, className }: UserProfileProps) {
  return (
    <div className={cx("ns-profile", className)}>
      <Avatar name={name} src={src} size={compact ? "sm" : "md"} />
      {compact ? null : (
        <div className="ns-profile-text">
          <span className="ns-profile-name">{name}</span>
          <span className="ns-profile-role">{role}</span>
        </div>
      )}
    </div>
  );
}
