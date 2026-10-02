// Genera supabase/seed.sql con los datos de ejemplo de notascan-ui (los mismos que usa la app),
// para que la base empiece con el colegio de demostración. Se ejecuta con: npx tsx scripts/gen-seed.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { EVALUATIONS, GRADE_NAME, OBS, SUBJECTS, TEACHERS } from "../src/data/academic";
import { INITIAL_ASSIGN, USERS } from "../src/data/admin";
import { REQUESTS } from "../src/data/principal";
import { REVIEW_ROWS } from "../src/data/reviewRows";
import { ALL_STUDENTS, COURSES } from "../src/data/students";

const q = (v: unknown): string => (v === null || v === undefined || (typeof v === "number" && isNaN(v)) ? "null" : typeof v === "number" || typeof v === "boolean" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const row = (vals: unknown[]) => "(" + vals.map(q).join(", ") + ")";
const insert = (table: string, cols: string[], rows: unknown[][]) =>
  rows.length ? `insert into public.${table} (${cols.join(", ")}) values\n  ${rows.map(row).join(",\n  ")};\n` : "";

const out: string[] = ["-- Datos de ejemplo del colegio de demostración (generado por scripts/gen-seed.ts; no editar a mano).\n"];

// Personal: docentes, Secretaría y Rectoría con los correos del directorio del sistema.
// Correos en ASCII: el directorio del sistema deja «ñ» (mauricio.ordoñez@…), que Auth puede rechazar.
const ascii = (e: string) => e.normalize("NFD").replace(/[̀-ͯ]/g, "");
const emailOf = (name: string) => ascii(USERS.find((u) => u.name === name)!.email);
const staff = USERS.filter((u) => u.role !== "guardian").map((u) => [ascii(u.email), u.name, u.role === "teacher" ? "teacher" : u.role === "staff" ? "admin" : "principal", u.role === "teacher" ? "Docencia" : u.role === "staff" ? "Secretaría académica" : "Rectoría"]);
out.push(insert("staff_directory", ["email", "full_name", "role", "area"], staff));

out.push(insert("grade_levels", ["id", "name", "level", "status"], ["6", "7", "8", "9", "10", "11"].map((g, i) => [g, GRADE_NAME[g], i < 4 ? "Básica secundaria" : "Media", i < 3 ? "active" : "draft"])));
out.push(insert("courses", ["id", "grade_level_id", "name", "director_email", "status"], COURSES.map((c, i) => [c, c.charAt(0), c, emailOf(TEACHERS[i % TEACHERS.length].name), "active"])));
out.push(insert("subjects", ["id", "name", "code", "category", "status"], [...SUBJECTS.map((s) => [s.id, s.name, s.code, s.category, "active"]), ["is", "Ingeniería de Software", "ISW-07", "Tecnología e informática", "archived"]]));

const periods = [
  ["2026-p1", 2026, 1, "Periodo 1", "2026-01-26", "2026-04-03", "closed", 25],
  ["2026-p2", 2026, 2, "Periodo 2", "2026-04-13", "2026-06-19", "closed", 25],
  ["2026-p3", 2026, 3, "Periodo 3", "2026-07-13", "2026-10-15", "open", 25],
  ["2026-p4", 2026, 4, "Periodo 4", "2026-10-19", "2026-11-27", "draft", 25],
];
out.push(insert("academic_periods", ["id", "year", "position", "name", "open_date", "close_date", "status", "final_weight"], periods));
const comps = periods.flatMap((p, i) => [["Actividades", i === 3 ? 35 : 40], ["Exámenes", 30], ["Talleres", 20], ["Actitudinal", 10]].map((c, j) => [p[0], c[0], c[1], j + 1]));
out.push(insert("period_components", ["period_id", "name", "weight", "position"], comps));

// Estudiantes, acudientes y fecha de matrícula (los «ene 2026» del sistema pasan a fecha).
const enrolled = (s: string) => "2026-01-" + String(parseInt(s, 10)).padStart(2, "0");
out.push(insert("students", ["id", "first_names", "last_names", "doc_type", "document", "course_id", "status", "enrolled_on", "library_ok", "fees_ok", "documents_ok"],
  ALL_STUDENTS.map((s) => [s.id, s.first, s.last, s.docType, s.document, s.course, s.status, enrolled(s.enrolled), s.library, s.fees, s.documents])));
out.push(insert("guardians", ["student_id", "full_name", "relationship", "phone"], ALL_STUDENTS.map((s) => [s.id, s.guardian, s.guardianRel, s.guardianPhone])));
out.push(insert("student_medical", ["student_id", "allergies"], ALL_STUDENTS.map((s) => [s.id, "Sin alergias registradas"])));

// Malla curricular del Periodo 3 (8B · Inglés queda sin docente, como en el sistema).
out.push(insert("teaching_assignments", ["teacher_email", "subject_id", "course_id", "period_id"],
  INITIAL_ASSIGN.map((a) => [emailOf(a.teacher), SUBJECTS.find((s) => s.name === a.subject)!.id, a.course, "2026-p3"])));

// Evaluaciones de Matemáticas · 7A (Ana Lucía Rosero) y la revisión del Parcial 2 con lecturas de la IA.
const anaMat7A = `(select id from public.teaching_assignments where teacher_email = ${q(emailOf("Ana Lucía Rosero"))} and subject_id = 'mat' and course_id = '7A' and period_id = '2026-p3')`;
out.push(`insert into public.evaluations (assignment_id, name, kind, weight, status, due_date) values\n  ${EVALUATIONS.map((e) => `(${anaMat7A}, ${q(e.name)}, ${q(e.kind)}, ${e.weight}, ${q(e.status)}, ${q("2026-" + monthDay(e.date))})`).join(",\n  ")};\n`);
const s7A = ALL_STUDENTS.filter((s) => s.course === "7A" && s.status !== "retired");
const parcial2 = `(select id from public.evaluations where name = 'Parcial 2' and assignment_id = ${anaMat7A})`;
out.push(`insert into public.grades (evaluation_id, student_id, detected, confidence, value, status) values\n  ${REVIEW_ROWS.map((r, i) => {
  const st = s7A[i];
  const status = isNaN(r.detected) || r.confidence < 75 ? "needs-review" : "pending";
  return `(${parcial2}, ${q(st.id)}, ${q(r.detected)}, ${q(isNaN(r.detected) ? null : r.confidence)}, ${q(r.detected)}, ${q(status)})`;
}).join(",\n  ")};\n`);

// Observador y solicitudes: los nombres del sistema se enlazan con los estudiantes de la base.
const byName = (n: string) => ALL_STUDENTS.find((s) => s.name === n) || ALL_STUDENTS.find((s) => s.name.startsWith(n.split(" ").slice(0, 2).join(" ")));
const obsDate = (d: string) => "2026-09-" + d.split(" ")[0].padStart(2, "0") + " 10:00:00-05";
out.push(insert("observations", ["student_id", "type", "title", "context", "created_at"],
  OBS.map((o) => [byName(o.student)?.id ?? s7A[0].id, o.type, o.title, o.context + (o.by ? " · " + o.by : ""), obsDate(o.date)])));
const reqRows = REQUESTS.map((r) => {
  const st = byName(r.student) ?? ALL_STUDENTS.find((s) => s.course === r.course)!;
  const subj = SUBJECTS.find((s) => s.name === r.subject)!;
  const note = r.status === "rejected" ? "falta el soporte de la evaluación" : null;
  return [emailOf(r.teacher), st.id, subj.id, r.course, r.from, r.to, r.reason, r.detail, r.status, note];
});
out.push(insert("grade_change_requests", ["teacher_email", "student_id", "subject_id", "course_id", "from_value", "to_value", "reason", "detail", "status", "decision_note"], reqRows));

out.push(insert("privacy_policies", ["version", "published_on", "url"], [["2026.1", "2026-10-01", "docs/legal/politica-de-tratamiento-de-datos.md"]]));

writeFileSync(join(import.meta.dirname, "..", "supabase", "seed.sql"), out.join("\n"));
console.log(`seed.sql: ${staff.length} personas, ${ALL_STUDENTS.length} estudiantes, ${INITIAL_ASSIGN.length} asignaciones, ${EVALUATIONS.length} evaluaciones, ${REVIEW_ROWS.length} notas, ${OBS.length} observaciones, ${REQUESTS.length} solicitudes`);

function monthDay(d: string): string {
  const [day, mon] = d.split(" ");
  const m = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12" }[mon]!;
  return m + "-" + day.padStart(2, "0");
}
