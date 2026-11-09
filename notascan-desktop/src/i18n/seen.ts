/*
 * Último acceso (idiomas, paso 5). Los servicios devuelven la fecha (o un dato estructurado) y la pantalla la escribe
 * en el idioma de la app. En español sale igual que antes: «Hoy, 08:42», «Ayer, 17:10», «Hace 9 días», «Nunca».
 */
import type { Messages } from "./es";
import { formatTime, type Lang } from "./format";

export type Seen = { k: "today" | "yesterday"; time: string } | { k: "days"; n: number } | { k: "never" };

const DAY = 86_400_000;
const hhmm = (d: Date) => ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

/**
 * Fecha ISO → último acceso. «calendar» cuenta días de calendario (directorio de usuarios y plataforma); «elapsed»
 * redondea hacia arriba el tiempo desde el inicio de hoy (seguimiento docente). Son las dos reglas que ya usaba la app.
 */
export function seenOf(iso: string | null | undefined, rule: "calendar" | "elapsed", now = new Date()): Seen {
  if (!iso) return { k: "never" };
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (rule === "elapsed") {
    if (d.getTime() >= start) return { k: "today", time: hhmm(d) };
    if (d.getTime() >= start - DAY) return { k: "yesterday", time: hhmm(d) };
    return { k: "days", n: Math.ceil((start - d.getTime()) / DAY) };
  }
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / DAY);
  return days <= 0 ? { k: "today", time: hhmm(d) } : days === 1 ? { k: "yesterday", time: hhmm(d) } : { k: "days", n: days };
}

/** Escribe el último acceso. `empty`: el texto de «sin dato» (Nunca o Sin registros). En español la hora queda «08:42». */
export function seenText(t: Messages, lang: Lang, s: Seen, empty: "never" | "none" = "never"): string {
  if (s.k === "never") return t.seen[empty];
  if (s.k === "days") return t.seen.days(s.n);
  const [h, m] = s.time.split(":").map(Number);
  const time = lang === "es" ? s.time : formatTime(lang, new Date(2026, 0, 1, h, m));
  return s.k === "today" ? t.seen.today(time) : t.seen.yesterday(time);
}
