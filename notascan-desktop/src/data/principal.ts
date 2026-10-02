import type { BadgeTone } from "../components/atoms/Badge";
import type { IconName } from "../components/atoms/Icon";
import { PERIODS } from "./admin";

/* Datos simulados de Rectoría (notascan-ui): indicadores, solicitudes y estados docentes. */

export const GRADE_AVG = [{ label: "Sexto", value: 3.9 }, { label: "Séptimo", value: 3.7 }, { label: "Octavo", value: 3.4 }, { label: "Noveno", value: 3.6 }, { label: "Décimo", value: 3.8 }, { label: "Undécimo", value: 4.0 }];
export const EVOL = { labels: PERIODS.map((p) => p.replace("Periodo ", "P")), now: [3.6, 3.7, 3.8, 3.8], prev: [3.5, 3.5, 3.6, 3.7] };
export const ABSENCE = [{ label: "Sexto", value: 5 }, { label: "Séptimo", value: 6 }, { label: "Octavo", value: 9 }, { label: "Noveno", value: 7 }, { label: "Décimo", value: 4 }, { label: "Undécimo", value: 3 }];

export type RequestStatus = "pending" | "approved" | "rejected";
export interface GradeRequest { id: number; teacher: string; student: string; course: string; subject: string; from: number; to: number; reason: string; detail: string; date: string; status: RequestStatus; history: Array<[string, string]> }

export const REQUESTS: GradeRequest[] = [
  { id: 245, teacher: "Laura Benavides", student: "Juan Sebastián Martínez Paz", course: "7A", subject: "Lengua Castellana", from: 4.2, to: 4.7, reason: "Corrección de evaluación", detail: "Al revisar el examen se encontró una pregunta mal calificada (punto 4). Se adjunta la hoja escaneada.", date: "1 oct 2026, 08:15", status: "pending", history: [["Creada por Laura Benavides", "1 oct, 08:15"]] },
  { id: 244, teacher: "Carlos Pérez", student: "Valentina Guerrero Ortiz", course: "8A", subject: "Física", from: 2.8, to: 3.2, reason: "Error de digitación", detail: "La nota registrada en la planilla no coincide con la hoja física del taller 2.", date: "30 sep 2026, 16:40", status: "pending", history: [["Creada por Carlos Pérez", "30 sep, 16:40"]] },
  { id: 243, teacher: "Diana Cabrera", student: "Mateo Bravo Rosero", course: "6B", subject: "Ciencias Naturales", from: 3.0, to: 3.6, reason: "Recuperación aprobada", detail: "El estudiante presentó la actividad de recuperación del Periodo 2.", date: "29 sep 2026, 10:02", status: "pending", history: [["Creada por Diana Cabrera", "29 sep, 10:02"]] },
  { id: 241, teacher: "Ana Lucía Rosero", student: "Sara Lucía Cabrera Paz", course: "7B", subject: "Matemáticas", from: 3.9, to: 4.3, reason: "Corrección de evaluación", detail: "Revisión solicitada por la acudiente; procede.", date: "26 sep 2026, 11:30", status: "approved", history: [["Creada por Ana Lucía Rosero", "26 sep, 11:30"], ["Aprobada por Hernando Villota", "26 sep, 15:12"]] },
  { id: 238, teacher: "Jorge Insuasty", student: "Tomás Ordóñez Mora", course: "8B", subject: "Inglés", from: 2.5, to: 3.5, reason: "Ajuste de nota", detail: "Sin soporte adjunto.", date: "22 sep 2026, 09:45", status: "rejected", history: [["Creada por Jorge Insuasty", "22 sep, 09:45"], ["Rechazada por Hernando Villota: falta el soporte de la evaluación", "22 sep, 12:00"]] },
];
export const REQ_STATUS: Record<RequestStatus, [string, BadgeTone, IconName]> = { pending: ["Pendiente", "pending", "clock"], approved: ["Aprobada", "verified", "check"], rejected: ["Rechazada", "review", "close"] };

export type TeacherState = "ok" | "warn" | "late";
export const TSTATUS: Record<TeacherState, [string, "success" | "warning" | "error", IconName]> = { ok: ["Al día", "success", "check"], warn: ["Requiere atención", "warning", "warning"], late: ["Retraso", "error", "clock"] };
