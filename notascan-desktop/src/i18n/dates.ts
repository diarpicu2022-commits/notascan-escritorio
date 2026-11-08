/*
 * Fechas de las pantallas (idiomas, paso 3). En español se conservan las formas que ya tenía la app, con sus propias
 * tablas («28 sep», «28 de septiembre», «Jueves 1 de octubre»), para que el español salga igual byte a byte. En inglés y
 * portugués se usa Intl con la variante regional de LOCALE.
 */
import { LOCALE, type Lang } from "./format";

const SHORT_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** Fecha ISO (aaaa-mm-dd o con hora) como día local, sin que la zona horaria la corra un día. */
export function isoDay(iso: string): Date {
  return new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
}

const fmt = (lang: Lang, d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE[lang], o).format(d);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «28 sep» · «Sep 28» · «28 de set.» */
export function shortDay(lang: Lang, iso: string): string {
  const d = isoDay(iso);
  if (lang === "es") return d.getDate() + " " + SHORT_ES[d.getMonth()];
  return fmt(lang, d, { day: "numeric", month: "short" });
}

/** «29 sep 2026» · «Sep 29, 2026» · «29 de set. de 2026» */
export function shortDayYear(lang: Lang, iso: string): string {
  const d = isoDay(iso);
  if (lang === "es") return d.getDate() + " " + SHORT_ES[d.getMonth()] + " " + d.getFullYear();
  return fmt(lang, d, { day: "numeric", month: "short", year: "numeric" });
}

/** «28 de septiembre» · «September 28» · «28 de setembro» */
export function longDay(lang: Lang, iso: string): string {
  const d = isoDay(iso);
  if (lang === "es") return d.getDate() + " de " + MONTHS_ES[d.getMonth()];
  return fmt(lang, d, { day: "numeric", month: "long" });
}

/** «Jueves 1 de octubre» · «Thursday, October 1» · «Quinta-feira, 1 de outubro» */
export function weekdayDay(lang: Lang, iso: string): string {
  const d = isoDay(iso);
  if (lang === "es") return WEEKDAYS_ES[d.getDay()] + " " + longDay(lang, iso);
  return cap(fmt(lang, d, { weekday: "long", day: "numeric", month: "long" }));
}

/** Nombre del mes con mayúscula inicial: «Septiembre» · «September» · «Setembro». */
export function monthName(lang: Lang, month: number): string {
  if (lang === "es") return cap(MONTHS_ES[month]);
  return cap(fmt(lang, new Date(2026, month, 15), { month: "long" }));
}

/** Iniciales de los días de lunes a domingo para el calendario. */
export function weekInitials(lang: Lang): string[] {
  if (lang === "es") return ["L", "M", "M", "J", "V", "S", "D"];
  // 2026-09-07 es lunes.
  return Array.from({ length: 7 }, (_, i) => fmt(lang, new Date(2026, 8, 7 + i), { weekday: "narrow" }).toUpperCase());
}
