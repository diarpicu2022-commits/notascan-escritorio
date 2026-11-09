import type { BadgeTone } from "../components/atoms/Badge";
import type { IconName } from "../components/atoms/Icon";
import { PERIODS } from "./admin";

/* Datos simulados de Rectoría (notascan-ui): indicadores, solicitudes y estados docentes. */

export const GRADE_AVG = [{ label: "Sexto", value: 3.9 }, { label: "Séptimo", value: 3.7 }, { label: "Octavo", value: 3.4 }, { label: "Noveno", value: 3.6 }, { label: "Décimo", value: 3.8 }, { label: "Undécimo", value: 4.0 }];
export const EVOL = { labels: PERIODS.map((p) => p.replace("Periodo ", "P")), now: [3.6, 3.7, 3.8, 3.8], prev: [3.5, 3.5, 3.6, 3.7] };
export const ABSENCE = [{ label: "Sexto", value: 5 }, { label: "Séptimo", value: 6 }, { label: "Octavo", value: 9 }, { label: "Noveno", value: 7 }, { label: "Décimo", value: 4 }, { label: "Undécimo", value: 3 }];

export type RequestStatus = "pending" | "approved" | "rejected";
/**
 * Un paso del historial: creada, aprobada o rechazada (la pantalla escribe el texto en el idioma) o un texto que llega
 * escrito de la base (`text`, en español, D4). `at`: fecha ISO.
 */
export type RequestEvent = { k: "created" | "approved" | "rejected"; by: string; note?: string; at: string } | { k: "text"; text: string; at: string };
/** `at`: fecha ISO de la solicitud. El motivo y el detalle los escribe el docente (I6). */
export interface GradeRequest { id: number; teacher: string; student: string; course: string; subject: string; from: number; to: number; reason: string; detail: string; at: string; status: RequestStatus; history: RequestEvent[] }

export const REQUESTS: GradeRequest[] = [
  { id: 245, teacher: "Laura Benavides", student: "Juan Sebastián Martínez Paz", course: "7A", subject: "Lengua Castellana", from: 4.2, to: 4.7, reason: "Corrección de evaluación", detail: "Al revisar el examen se encontró una pregunta mal calificada (punto 4). Se adjunta la hoja escaneada.", at: "2026-10-01T08:15:00", status: "pending", history: [{ k: "created", by: "Laura Benavides", at: "2026-10-01T08:15:00" }] },
  { id: 244, teacher: "Carlos Pérez", student: "Valentina Guerrero Ortiz", course: "8A", subject: "Física", from: 2.8, to: 3.2, reason: "Error de digitación", detail: "La nota registrada en la planilla no coincide con la hoja física del taller 2.", at: "2026-09-30T16:40:00", status: "pending", history: [{ k: "created", by: "Carlos Pérez", at: "2026-09-30T16:40:00" }] },
  { id: 243, teacher: "Diana Cabrera", student: "Mateo Bravo Rosero", course: "6B", subject: "Ciencias Naturales", from: 3.0, to: 3.6, reason: "Recuperación aprobada", detail: "El estudiante presentó la actividad de recuperación del Periodo 2.", at: "2026-09-29T10:02:00", status: "pending", history: [{ k: "created", by: "Diana Cabrera", at: "2026-09-29T10:02:00" }] },
  { id: 241, teacher: "Ana Lucía Rosero", student: "Sara Lucía Cabrera Paz", course: "7B", subject: "Matemáticas", from: 3.9, to: 4.3, reason: "Corrección de evaluación", detail: "Revisión solicitada por la acudiente; procede.", at: "2026-09-26T11:30:00", status: "approved", history: [{ k: "created", by: "Ana Lucía Rosero", at: "2026-09-26T11:30:00" }, { k: "approved", by: "Hernando Villota", at: "2026-09-26T15:12:00" }] },
  { id: 238, teacher: "Jorge Insuasty", student: "Tomás Ordóñez Mora", course: "8B", subject: "Inglés", from: 2.5, to: 3.5, reason: "Ajuste de nota", detail: "Sin soporte adjunto.", at: "2026-09-22T09:45:00", status: "rejected", history: [{ k: "created", by: "Jorge Insuasty", at: "2026-09-22T09:45:00" }, { k: "rejected", by: "Hernando Villota", note: "falta el soporte de la evaluación", at: "2026-09-22T12:00:00" }] },
];
/** Tonos e iconos; las palabras salen del diccionario (t.pri.reqStatus, t.pri.status). */
export const REQ_STATUS: Record<RequestStatus, [string, BadgeTone, IconName]> = { pending: ["Pendiente", "pending", "clock"], approved: ["Aprobada", "verified", "check"], rejected: ["Rechazada", "review", "close"] };

export type TeacherState = "ok" | "warn" | "late";
export const TSTATUS: Record<TeacherState, [string, "success" | "warning" | "error", IconName]> = { ok: ["Al día", "success", "check"], warn: ["Requiere atención", "warning", "warning"], late: ["Retraso", "error", "clock"] };
