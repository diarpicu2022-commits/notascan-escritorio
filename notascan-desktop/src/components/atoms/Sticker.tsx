import type { CSSProperties, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Icon, type IconName } from "./Icon";

interface StickerProps {
  tone?: "gold" | "sage" | "navy" | "burgundy" | "ivory";
  rotate?: number;
  icon?: IconName;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** Etiqueta rotada entre −6° y 6°. Uno o dos por pantalla. */
export function Sticker({ tone = "gold", rotate = -4, icon, className, style, children }: StickerProps) {
  return (
    <span className={cx("ns-sticker", "ns-sticker--" + tone, className)} style={{ "--rot": rotate + "deg", ...style } as CSSProperties}>
      {icon ? <Icon name={icon} size={16} strokeWidth={2.5} /> : null}
      {children}
    </span>
  );
}
