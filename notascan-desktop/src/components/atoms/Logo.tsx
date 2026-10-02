import { cx } from "../../lib/cx";

interface LogoProps {
  size?: number;
  mark?: boolean;
  markOnly?: boolean;
  className?: string;
}

/** «NotaScan» en Fraunces 600 + punto gold con borde navy: el punto final de una nota verificada. */
export function Logo({ size = 28, mark, markOnly, className }: LogoProps) {
  return (
    <span className={cx("ns-logo", className)} style={{ fontSize: size }} aria-label="NotaScan">
      {mark || markOnly ? <span className="ns-logo-mark" aria-hidden>N</span> : null}
      {markOnly ? null : <span aria-hidden>NotaScan</span>}
      {markOnly ? null : <span className="ns-logo-dot" aria-hidden />}
    </span>
  );
}

/** Firma de marca: la portada del sistema en miniatura (bloques + nombre + lema). */
export function BrandTile({ size = 34, tagline, className }: { size?: number; tagline?: string; className?: string }) {
  return (
    <div className={cx("ns-brand", className)}>
      <div className="ns-brand-blocks" aria-hidden>
        <span className="ns-brand-b ns-brand-b--gold" />
        <span className="ns-brand-b ns-brand-b--navy"><span>4.5</span></span>
        <span className="ns-brand-b ns-brand-b--sage" />
        <span className="ns-brand-b ns-brand-b--burgundy" />
      </div>
      <Logo size={size} />
      <span className="ns-brand-tag">{tagline || "La IA detecta. Tú verificas."}</span>
    </div>
  );
}
