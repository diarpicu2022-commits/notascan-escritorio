import type { CSSProperties, ReactNode } from "react";
import { cx } from "../../lib/cx";

/* Primitivas de composición de página del sistema: bloques con relleno de significado y rejilla. */

export type BlockTone = "navy" | "gold" | "sage" | "burgundy" | "paper";

export function Block({ tone, label, className, style, children }: { tone?: BlockTone; label?: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  return <section className={cx("ns-block", tone && "ns-block--" + tone, className)} aria-label={label} style={style}>{children}</section>;
}

export function BlockTitle({ action, children }: { action?: ReactNode; children?: ReactNode }) {
  return <div className="ns-block-title"><h2>{children}</h2>{action || null}</div>;
}

export function PageGrid({ className, style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  return <div className={cx("ns-pagegrid", className)} style={style}>{children}</div>;
}
