import { cx } from "../../lib/cx";
import { ICONS, type IconName } from "./icons";

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  /** Si se da, el icono es significativo (role="img"); si no, es decorativo. */
  label?: string;
  strokeWidth?: number;
  className?: string;
}

/** Átomo Icon de notascan-ui: hereda el color del texto y siempre acompaña a una palabra. */
export function Icon({ name, size = 20, label, strokeWidth = 2, className }: IconProps) {
  const parts: readonly string[] = ICONS[name] ?? ICONS.ai;
  return (
    <svg
      className={cx("ns-icon", className)} width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false"
    >
      {parts.map((d, i) => {
        if (d.charAt(0) === "R") {
          const [x, y, width, height, rx] = d.slice(1).split(",");
          return <rect key={i} x={x} y={y} width={width} height={height} rx={rx} />;
        }
        if (d.charAt(0) === "C") {
          const [cxv, cy, r] = d.slice(1).split(",");
          return <circle key={i} cx={cxv} cy={cy} r={r} />;
        }
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}
