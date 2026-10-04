import { useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Field";
import { Icon } from "../atoms/Icon";
import { headerLine, initialsOf, type Institution } from "../../services/institution";

/**
 * Escudo del colegio: su logo dentro del marco del escudo del boletín o, sin logo, sus iniciales en el escudo navy del
 * sistema. «mini» es la versión del marco de la app. El logo se contiene (nunca se recorta ni se deforma).
 */
export function SchoolCrest({ institution: i, size = "doc", className }: { institution: Pick<Institution, "name" | "shortName" | "logoUrl">; size?: "doc" | "mini"; className?: string }) {
  return (
    <div className={cx("ns-paper-crest", i.logoUrl && "ns-paper-crest--logo", size === "mini" && "ns-crest-mini", className)} aria-hidden>
      {i.logoUrl ? <img key={i.logoUrl} src={i.logoUrl} alt="" draggable={false} /> : <span>{initialsOf(i)}</span>}
    </div>
  );
}

/** Encabezado del boletín: escudo, nombre y datos legales del colegio, y el título del informe. */
export function InstitutionHeader({ institution: i, period, year, index, total }: { institution: Institution; period: string; year: number; index: number; total: number }) {
  const line = headerLine(i);
  return (
    <header className="ns-paper-head">
      <SchoolCrest institution={i} />
      <div><strong className="ns-paper-school">{i.name || "Nombre del colegio"}</strong>{line ? <span>{line}</span> : null}</div>
      <div className="ns-paper-title"><span>Informe académico</span><strong>{period + " · " + year}</strong><small>{"Periodo " + index + " de " + total}</small></div>
    </header>
  );
}

/** Colegio en el marco de la app (barra lateral): escudo pequeño, nombre y ciudad. */
export function SchoolBadge({ institution: i }: { institution: Institution }) {
  return (
    <div className="ns-sidebar-course ns-school" aria-label={"Colegio: " + i.name}>
      <SchoolCrest institution={i} size="mini" />
      <div className="ns-col" style={{ gap: 0, minWidth: 0 }}>
        <span className="ns-overline">{i.city || "Colegio"}</span>
        <span className="ns-school-name">{i.name}</span>
      </div>
    </div>
  );
}

/* ---------- Editor de identidad con vista previa en vivo (lo usa la consola de la plataforma) ---------- */

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
export const LOGO_MAX_BYTES = 1024 * 1024;

/** Revisa el archivo de logo antes de mostrarlo: tipo de imagen y tamaño. */
export function logoProblem(f: File): string | null {
  if (!LOGO_TYPES.includes(f.type)) return "El logo debe ser PNG, JPG, SVG o WebP.";
  if (f.size > LOGO_MAX_BYTES) return "El logo pesa " + (f.size / 1048576).toFixed(1) + " MB. El máximo es 1 MB.";
  return null;
}

/** Errores del formulario de identidad (los mismos que exige la base: DANE de 12 dígitos, iniciales hasta 3). */
export function identityErrors(i: Institution): Partial<Record<"name" | "shortName" | "dane", string>> {
  return {
    name: i.name.trim() ? undefined : "Escribe el nombre del colegio.",
    shortName: i.shortName.trim().length > 3 ? "Usa hasta 3 letras." : undefined,
    dane: !i.dane.trim() || /^\d{12}$/.test(i.dane.trim()) ? undefined : "El código DANE tiene 12 dígitos.",
  };
}

/** Vista previa en vivo: encabezado del boletín y el colegio en el marco de la app, tal como se verán. */
export function IdentityPreview({ institution: i }: { institution: Institution }) {
  const year = new Date().getFullYear();
  return (
    <div className="ns-col" style={{ gap: "var(--space-4)" }} aria-label="Vista previa de la identidad">
      <span className="ns-overline">Así se verá en el boletín</span>
      <article className="ns-paper ns-paper--compact" aria-label={"Encabezado del boletín de " + (i.name || "el colegio")}>
        <InstitutionHeader institution={i} period="Periodo 3" year={year} index={3} total={4} />
      </article>
      <span className="ns-overline">Y en el menú de la app del colegio</span>
      <div className="ns-sidebar ns-identity-sidebar"><div className="ns-sidebar-foot"><SchoolBadge institution={i} /></div></div>
    </div>
  );
}

/**
 * Formulario de identidad. El logo elegido se muestra al instante (URL local) y se sube al guardar.
 * `onLogo(file)` recibe el archivo válido (o null al quitarlo); los errores de archivo se muestran aquí mismo.
 */
export function IdentityEditor({ value: v, onChange, onLogo, tried }: { value: Institution; onChange: (v: Institution) => void; onLogo: (f: File | null) => void; tried?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const e = tried ? identityErrors(v) : {};
  const set = (k: keyof Institution) => (ev: { target: { value: string } }) => onChange({ ...v, [k]: ev.target.value });
  function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const p = logoProblem(f);
    setLogoErr(p);
    if (!p) onLogo(f);
  }
  return (
    <div className="ns-form-grid">
      <Input label="Nombre del colegio" required value={v.name} onChange={set("name")} error={e.name} className="ns-span-2" />
      <Input label="Iniciales del escudo" value={v.shortName} onChange={(ev) => onChange({ ...v, shortName: ev.target.value.toUpperCase().slice(0, 3) })} error={e.shortName} hint="Se usan si el colegio no tiene logo." />
      <Input label="Código DANE" inputMode="numeric" value={v.dane} onChange={(ev) => onChange({ ...v, dane: ev.target.value.replace(/\D/g, "").slice(0, 12) })} error={e.dane} />
      <Input label="Ciudad" value={v.city} onChange={set("city")} />
      <Input label="Departamento" value={v.department} onChange={set("department")} />
      <Input label="Resolución de aprobación" value={v.resolution} onChange={set("resolution")} placeholder="Número y año de la resolución" className="ns-span-2" />
      <div className="ns-field ns-span-2">
        <span className="ns-field-label">Logo</span>
        <div className="ns-row" style={{ gap: "var(--space-3)" }}>
          <SchoolCrest institution={v} />
          <Button variant="secondary" icon="upload" onClick={() => ref.current?.click()}>{v.logoUrl ? "Cambiar logo" : "Elegir logo"}</Button>
          {v.logoUrl ? <Button variant="ghost" onClick={() => { setLogoErr(null); onLogo(null); }}>Quitar logo</Button> : null}
          <input ref={ref} type="file" accept={LOGO_TYPES.join(",")} hidden aria-label="Archivo del logo" onChange={(ev) => { pick(ev.target.files); ev.target.value = ""; }} />
        </div>
        {logoErr
          ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{logoErr}</span>
          : <span className="ns-field-hint">PNG, JPG, SVG o WebP de hasta 1 MB. Mejor con fondo transparente: se ajusta al escudo sin recortarse.</span>}
      </div>
    </div>
  );
}
