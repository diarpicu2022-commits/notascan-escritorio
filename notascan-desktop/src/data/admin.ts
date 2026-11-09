import { COURSES, ALL_STUDENTS } from "./students";
import { SUBJECTS, TEACHERS } from "./academic";
import type { BadgeTone } from "../components/atoms/Badge";
import type { IconName } from "../components/atoms/Icon";
import type { Seen } from "../i18n/seen";

/* Datos simulados de Secretaría (notascan-ui): usuarios, malla curricular, periodos e importación. */

export const PERIODS = ["Periodo 1", "Periodo 2", "Periodo 3", "Periodo 4"];

export type UserRole = "teacher" | "guardian" | "staff" | "director";
export type UserStatus = "active" | "inactive" | "invited" | "none";
/** `last`: último acceso como dato; la pantalla lo escribe en el idioma (idiomas, paso 5). */
export interface DirectoryUser { id: string; name: string; email: string; role: UserRole; status: UserStatus; last: Seen }

/** Etiquetas en español (las pantallas usan t.adm.roles, t.adm.userStatus y t.adm.rowState); se conservan los tonos. */
export const USER_ROLES: Record<UserRole, string> = { teacher: "Docente", guardian: "Acudiente", staff: "Administrativo", director: "Directivo" };
export const USER_STATUS: Record<UserStatus, [string, BadgeTone, IconName]> = { active: ["Activo", "verified", "check"], inactive: ["Desactivado", "neutral", "minus"], invited: ["Invitación enviada", "pending", "mail"], none: ["Sin cuenta", "neutral", "user"] };

export const USERS: DirectoryUser[] = (() => {
  const out: DirectoryUser[] = [];
  const plain = (s: string) => s.replace(/[áéíóú]/g, (c) => "aeiou"["áéíóú".indexOf(c)]);
  TEACHERS.forEach((t, i) => {
    out.push({
      id: "u" + i, name: t.name, email: t.name.split(" ")[0].toLowerCase() + "." + plain(t.name.split(" ")[1].toLowerCase()) + "@losandes.edu.co",
      role: "teacher", status: i === 3 ? "inactive" : "active", last: t.last,
    });
  });
  ALL_STUDENTS.slice(0, 16).forEach((s, i) => {
    out.push({ id: "g" + i, name: s.guardian + " " + s.last.split(" ")[1], email: s.guardian.split(" ")[0].toLowerCase() + i + "@correo.com", role: "guardian", status: i % 7 === 3 ? "invited" : "active", last: i % 7 === 3 ? { k: "never" } : { k: "days", n: i + 1 } });
  });
  ([["Patricia Ortega", "staff"], ["Rubén Bravo", "staff"], ["Claudia Enríquez", "staff"], ["Hernando Villota", "director"], ["Marcela Narváez", "director"]] as Array<[string, UserRole]>).forEach((x, i) => {
    out.push({ id: "s" + i, name: x[0], email: x[0].split(" ")[0].toLowerCase() + "@losandes.edu.co", role: x[1], status: "active", last: { k: "today", time: "0" + (7 + i) + ":1" + i } });
  });
  return out;
})();

export interface Assignment { id: string; teacher: string; subject: string; course: string; period: string }

export const INITIAL_ASSIGN: Assignment[] = (() => {
  const out: Assignment[] = [];
  let k = 0;
  COURSES.forEach((c) => {
    SUBJECTS.forEach((s) => {
      const t = TEACHERS.find((x) => x.subjects[0] === s.name);
      if (c === "8B" && s.id === "ing") return;
      out.push({ id: "a" + k++, teacher: t ? t.name : TEACHERS[0].name, subject: s.name, course: c, period: "Periodo 3" });
    });
  });
  return out;
})();

export type ImportState = "valid" | "warning" | "error" | "duplicate" | "fixed" | "skipped";
/**
 * Problema de una fila. `msg` es el texto en español de siempre; `code` y `arg` permiten escribirlo en el idioma de la
 * app (idiomas, paso 4). Sin `code` (mensajes que llegan escritos de la base) se muestra `msg` tal cual.
 */
export type IssueCode = "noName" | "docEmpty" | "docShort" | "courseMissing" | "birthBad" | "duplicateDoc" | "duplicateRow" | "noPhone" | "docFixed" | "courseFixed" | "skipped";
export interface ImportIssue { row: number; name: string; doc: string; course: string; state: ImportState; msg: string; field: string | null; code?: IssueCode; arg?: string }

export const IMPORT_STEPS = ["Seleccionar archivo", "Previsualizar", "Validar", "Corregir errores", "Confirmar importación", "Resultados"];
export const IMPORT_ISSUES: ImportIssue[] = [
  { row: 12, name: "Samuel Ortiz Bravo", doc: "TI 10843", course: "6A", state: "error", msg: "Documento incompleto (mínimo 8 dígitos)", field: "doc", code: "docShort" },
  { row: 37, name: "Luciana Paz Mora", doc: "TI 1084412233", course: "6C", state: "error", msg: "El curso 6C no existe en la estructura académica", field: "course", code: "courseMissing", arg: "6C" },
  { row: 58, name: "Tomás Riascos", doc: "TI 1084523310", course: "7A", state: "warning", msg: "Falta el teléfono del acudiente", field: null, code: "noPhone" },
  { row: 91, name: "María Fernanda López Rosero", doc: "TI 1084655210", course: "7A", state: "duplicate", msg: "Ya existe un estudiante con este documento", field: null, code: "duplicateDoc" },
  { row: 120, name: "Gabriela Zambrano", doc: "", course: "7B", state: "error", msg: "Documento vacío", field: "doc", code: "docEmpty" },
  { row: 166, name: "Nicolás Cabrera", doc: "TI 1084812290", course: "8A", state: "duplicate", msg: "Fila repetida (igual a la fila 165)", field: null, code: "duplicateRow", arg: "165" },
  { row: 203, name: "Antonella Burbano", doc: "TI 1084933302", course: "8B", state: "error", msg: "Fecha de nacimiento inválida: 31/02/2014", field: "birth", code: "birthBad", arg: "31/02/2014" },
];
export const ROW_STATE: Record<ImportState, [string, BadgeTone, IconName]> = {
  valid: ["Válido", "verified", "check"], warning: ["Advertencia", "medium", "warning"], error: ["Error", "review", "error"],
  duplicate: ["Duplicado", "pending", "layers"], fixed: ["Corregido", "verified", "edit"], skipped: ["Omitido", "neutral", "minus"],
};

/** Descarga un CSV con BOM (Excel lo abre con tildes). Algunos visores bloquean descargas. */
export function exportCSV(name: string, head: string[], rows: Array<Array<string | number>>) {
  try {
    const csv = "﻿" + [head, ...rows].map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* algunos visores bloquean descargas */
  }
}
