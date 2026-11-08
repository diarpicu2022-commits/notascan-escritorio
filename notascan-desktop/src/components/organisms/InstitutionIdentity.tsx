import { useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Field";
import { Icon } from "../atoms/Icon";
import { headerLine, initialsOf, type Institution } from "../../services/institution";
import { useI18n } from "../../i18n/I18nProvider";
import { es, type Messages } from "../../i18n/es";

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
export function InstitutionHeader({ institution: i, period, year, index, total, kind = "Informe académico", note }: { institution: Institution; period: string; year: number; index: number; total: number; kind?: string; note?: string }) {
  const line = headerLine(i);
  return (
    <header className="ns-paper-head">
      <SchoolCrest institution={i} />
      <div><strong className="ns-paper-school">{i.name || "Nombre del colegio"}</strong>{line ? <span>{line}</span> : null}</div>
      <div className="ns-paper-title"><span>{kind}</span><strong>{period + " · " + year}</strong><small>{note ?? "Periodo " + index + " de " + total}</small></div>
    </header>
  );
}

/** Colegio en el marco de la app (barra lateral): escudo pequeño, nombre y ciudad. */
export function SchoolBadge({ institution: i }: { institution: Institution }) {
  const x = useI18n().t.adm.idn;
  return (
    <div className="ns-sidebar-course ns-school" aria-label={x.schoolAria(i.name)}>
      <SchoolCrest institution={i} size="mini" />
      <div className="ns-col" style={{ gap: 0, minWidth: 0 }}>
        <span className="ns-overline">{i.city || x.school}</span>
        <span className="ns-school-name">{i.name}</span>
      </div>
    </div>
  );
}

/* ---------- Editor de identidad con vista previa en vivo (lo usa la consola de la plataforma) ---------- */

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
export const LOGO_MAX_BYTES = 1024 * 1024;

/** Revisa el archivo de logo antes de mostrarlo: tipo de imagen y tamaño. */
export function logoProblem(f: File, t: Messages = es): string | null {
  if (!LOGO_TYPES.includes(f.type)) return t.adm.idn.logoType;
  if (f.size > LOGO_MAX_BYTES) return t.adm.idn.logoSize((f.size / 1048576).toFixed(1));
  return null;
}

/** Errores del formulario de identidad (los mismos que exige la base: DANE de 12 dígitos, iniciales hasta 3). */
export function identityErrors(i: Institution, t: Messages = es): Partial<Record<"name" | "shortName" | "dane", string>> {
  const x = t.adm.idn;
  return {
    name: i.name.trim() ? undefined : x.nameError,
    shortName: i.shortName.trim().length > 3 ? x.shortError : undefined,
    dane: !i.dane.trim() || /^\d{12}$/.test(i.dane.trim()) ? undefined : x.daneError,
  };
}

/** Vista previa en vivo: encabezado del boletín y el colegio en el marco de la app, tal como se verán. */
export function IdentityPreview({ institution: i }: { institution: Institution }) {
  const year = new Date().getFullYear();
  const x = useI18n().t.adm.idn;
  return (
    <div className="ns-col" style={{ gap: "var(--space-4)" }} aria-label={x.previewAria}>
      <span className="ns-overline">{x.onCard}</span>
      {/* El encabezado es del boletín impreso: sale en español (D2). */}
      <article className="ns-paper ns-paper--compact" aria-label={x.headerAria(i.name || x.theSchool)}>
        <InstitutionHeader institution={i} period="Periodo 3" year={year} index={3} total={4} />
      </article>
      <span className="ns-overline">{x.onMenu}</span>
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
  const { t } = useI18n();
  const x = t.adm.idn;
  const e = tried ? identityErrors(v, t) : {};
  const set = (k: keyof Institution) => (ev: { target: { value: string } }) => onChange({ ...v, [k]: ev.target.value });
  function pick(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    const p = logoProblem(f, t);
    setLogoErr(p);
    if (!p) onLogo(f);
  }
  return (
    <div className="ns-form-grid">
      <Input label={x.name} required value={v.name} onChange={set("name")} error={e.name} className="ns-span-2" />
      <Input label={x.short} value={v.shortName} onChange={(ev) => onChange({ ...v, shortName: ev.target.value.toUpperCase().slice(0, 3) })} error={e.shortName} hint={x.shortHint} />
      <Input label={x.dane} inputMode="numeric" value={v.dane} onChange={(ev) => onChange({ ...v, dane: ev.target.value.replace(/\D/g, "").slice(0, 12) })} error={e.dane} />
      <Input label={x.city} value={v.city} onChange={set("city")} />
      <Input label={x.department} value={v.department} onChange={set("department")} />
      <Input label={x.resolution} value={v.resolution} onChange={set("resolution")} placeholder={x.resolutionPh} className="ns-span-2" />
      <div className="ns-field ns-span-2">
        <span className="ns-field-label">{x.logo}</span>
        <div className="ns-row" style={{ gap: "var(--space-3)" }}>
          <SchoolCrest institution={v} />
          <Button variant="secondary" icon="upload" onClick={() => ref.current?.click()}>{v.logoUrl ? x.change : x.choose}</Button>
          {v.logoUrl ? <Button variant="ghost" onClick={() => { setLogoErr(null); onLogo(null); }}>{x.remove}</Button> : null}
          <input ref={ref} type="file" accept={LOGO_TYPES.join(",")} hidden aria-label={x.fileAria} onChange={(ev) => { pick(ev.target.files); ev.target.value = ""; }} />
        </div>
        {logoErr
          ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{logoErr}</span>
          : <span className="ns-field-hint">{x.hint}</span>}
      </div>
    </div>
  );
}
