/*
 * Formatos por idioma (anexo 2026-11-08-idiomas, I5).
 * Notas con una cifra decimal («4,5» en español y portugués, «4.5» en inglés), fechas y horas con Intl.
 */
export type Lang = "es" | "en" | "pt";
export type LangPref = Lang | "sistema";

export const LANGS: Lang[] = ["es", "en", "pt"];

/** Variante regional de cada idioma: Colombia, Estados Unidos y Brasil. */
export const LOCALE: Record<Lang, string> = { es: "es-CO", en: "en-US", pt: "pt-BR" };

/** Idioma del equipo entre los tres que hay; si no es ninguno, español. */
export function systemLang(languages: readonly string[] = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []): Lang {
  for (const l of languages) {
    const base = l.toLowerCase().split("-")[0];
    if (base === "es" || base === "en" || base === "pt") return base;
  }
  return "es";
}

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(lang: Lang, digits: number): Intl.NumberFormat {
  const k = `n:${lang}:${digits}`;
  if (!cache.has(k)) cache.set(k, new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  return cache.get(k) as Intl.NumberFormat;
}
function df(lang: Lang, opts: Intl.DateTimeFormatOptions, key: string): Intl.DateTimeFormat {
  const k = `d:${lang}:${key}`;
  if (!cache.has(k)) cache.set(k, new Intl.DateTimeFormat(LOCALE[lang], opts));
  return cache.get(k) as Intl.DateTimeFormat;
}

/** Nota de 1,0 a 5,0 con una cifra decimal. */
export const formatGrade = (lang: Lang, value: number) => nf(lang, 1).format(Math.round(value * 10) / 10);
/** Número con los decimales pedidos y separador de miles del idioma. */
export const formatNumber = (lang: Lang, value: number, digits = 0) => nf(lang, digits).format(value);
/** «8 nov 2026», «Nov 8, 2026», «8 de nov. de 2026». */
export const formatDate = (lang: Lang, d: Date) => df(lang, { day: "numeric", month: "short", year: "numeric" }, "date").format(d);
/** Hora según la variante regional: 12 h con a. m. y p. m. en Colombia y Estados Unidos, 24 h en Brasil. */
export const formatTime = (lang: Lang, d: Date) => df(lang, { hour: "numeric", minute: "2-digit" }, "time").format(d);
