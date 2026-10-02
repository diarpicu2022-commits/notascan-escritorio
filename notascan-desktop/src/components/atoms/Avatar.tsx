import { cx, hashTone, initials } from "../../lib/cx";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Iniciales sobre uno de cuatro tonos del sistema, elegido de forma estable por el nombre. */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span className={cx("ns-avatar", size !== "md" && "ns-avatar--" + size, className)} data-tone={hashTone(name)} role="img" aria-label={name}>
      {src ? <img src={src} alt="" /> : <span aria-hidden>{initials(name)}</span>}
    </span>
  );
}
