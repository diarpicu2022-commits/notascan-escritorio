import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import { SUBJECTS, subjectGrades } from "../data/academic";
import { IMPORT_ISSUES, PERIODS, type ImportIssue } from "../data/admin";
import { ALL_STUDENTS, COURSES, type StudentRecord } from "../data/students";
import { demoData, demoInitial, forcedState } from "./client";

/*
 * Secretaría · matrícula, importación, paz y salvo, ranking e inicio (paso 6b.3b).
 * Registrar e importar pasan por funciones de la base (enroll_student / enroll_students): una matrícula entra
 * completa o no entra, y el código estudiantil lo genera la base.
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const msgOf = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "");

/** Mensaje para la persona: las reglas de la base tal cual; lo demás, genérico. */
export function enrollMessage(e: unknown): string {
  const m = msgOf(e);
  if (/Ya existe un estudiante|no existe en la estructura|Faltan nombres|Solo Secretaría/.test(m)) return m;
  return "No pudimos guardar la matrícula. Revisa tu conexión e inténtalo de nuevo.";
}

export const DOC_ABBR: Record<string, string> = { "Tarjeta de identidad": "TI", "Registro civil": "RC", "Cédula de ciudadanía": "CC", "Cédula de extranjería": "CE", "Pasaporte": "PA" };
const ABBR_DOC: Record<string, string> = Object.fromEntries(Object.entries(DOC_ABBR).map(([k, v]) => [v, k]));

/* ---------- Grados y cursos para los formularios ---------- */

export interface CourseOption { id: string; gradeId: string; gradeName: string }

export function useCourseOptions() {
  const demo: CourseOption[] = COURSES.map((c) => ({ id: c, gradeId: c.charAt(0), gradeName: "" }));
  return useQuery({
    queryKey: ["course-options"],
    initialData: DEMO ? demo : undefined,
    queryFn: async (): Promise<CourseOption[]> => {
      if (DEMO) return demo;
      const [c, g] = await Promise.all([
        supabase().from("courses").select("id, grade_level_id").neq("status", "archived").order("id"),
        supabase().from("grade_levels").select("id, name").neq("status", "archived"),
      ]);
      [c, g].forEach(throwIf);
      const names = new Map(((g.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
      return ((c.data ?? []) as Array<{ id: string; grade_level_id: string }>).map((x) => ({ id: x.id, gradeId: x.grade_level_id, gradeName: names.get(x.grade_level_id) ?? x.grade_level_id }));
    },
  });
}

/* ---------- Registro de un estudiante ---------- */

export interface EnrollInput {
  first: string; last: string; docType: string; doc: string; birth: string; phone: string; email: string;
  allergies: string; conditions: string; medNotes: string; emName: string; emPhone: string;
  gName: string; gRel: string; gDoc: string; gPhone: string; gEmail: string; year: string; grade: string; course: string; state: string;
}

const toRpc = (v: EnrollInput) => ({
  year: v.year, first_names: v.first, last_names: v.last, doc_type: v.docType, document: (DOC_ABBR[v.docType] ?? "TI") + " " + v.doc.replace(/\D/g, ""),
  birth_date: v.birth, course_id: v.course, status: v.state === "Pendiente" ? "pending" : "active",
  guardian_name: v.gName, guardian_rel: v.gRel, guardian_doc: v.gDoc, guardian_phone: v.gPhone, guardian_email: v.gEmail,
  allergies: v.allergies, conditions: v.conditions, medical_notes: v.medNotes, emergency_contact: v.emName, emergency_phone: v.emPhone,
});

/** Devuelve el código estudiantil asignado por la base (en demostración, ninguno). */
export function useEnrollStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: EnrollInput): Promise<string | null> => {
      if (DEMO) return null;
      const r = await supabase().rpc("enroll_student", { p: toRpc(v) });
      throwIf(r);
      return r.data as string;
    },
    onSuccess: () => { if (!DEMO) ["students", "structure", "admin-home"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

/* ---------- Importación masiva (CSV) ---------- */

export const IMPORT_HEADERS = ["Nombres", "Apellidos", "Tipo de documento", "Número de documento", "Fecha de nacimiento", "Curso", "Acudiente", "Parentesco", "Teléfono"];

export interface ImportRow { row: number; first: string; last: string; docType: string; doc: string; birth: string; course: string; guardian: string; rel: string; phone: string }
export interface ImportResult { rows: ImportRow[]; issues: ImportIssue[]; total: number }

/** CSV con «;» o «,» (lo detecta en el encabezado), comillas dobles y BOM de Excel. */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const firstLine = t.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === "\"" && t[i + 1] === "\"") { cell += "\""; i++; } else if (ch === "\"") q = false; else cell += ch;
    } else if (ch === "\"") q = true;
    else if (ch === sep) { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some((c) => c)) out.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c)) out.push(row);
  return out;
}

/** «12/03/2013» o «2013-03-12» → ISO; null si no es una fecha real. */
export function toIsoDate(s: string): string | null {
  let y: number, m: number, d: number;
  const a = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/), b = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (a) { d = +a[1]; m = +a[2]; y = +a[3]; } else if (b) { y = +b[1]; m = +b[2]; d = +b[3]; } else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0") : null;
}

const docOf = (r: ImportRow) => {
  const abbr = DOC_ABBR[r.docType] ?? (ABBR_DOC[r.docType.toUpperCase()] ? r.docType.toUpperCase() : "TI");
  return abbr + " " + r.doc.replace(/\D/g, "");
};

/** Valida las filas: error (bloquea), duplicado (no se importa), advertencia (se importa). Las válidas no se listan. */
export function validateRows(rows: ImportRow[], courses: string[], existingDocs: Set<string>): ImportIssue[] {
  const seen = new Map<string, number>();
  const issues: ImportIssue[] = [];
  rows.forEach((r) => {
    const name = (r.first + " " + r.last).trim();
    const docNum = r.doc.replace(/\D/g, "");
    const base = { row: r.row, name: name || "(sin nombre)", doc: r.doc ? docOf(r) : "", course: r.course };
    const key = docNum ? docOf(r) : "";
    const dupOf = key ? seen.get(key) : undefined;
    if (key && !seen.has(key)) seen.set(key, r.row);
    if (!r.first || !r.last) issues.push({ ...base, state: "error", msg: "Faltan nombres o apellidos", field: null });
    else if (!docNum) issues.push({ ...base, state: "error", msg: "Documento vacío", field: "doc" });
    else if (docNum.length < 8) issues.push({ ...base, state: "error", msg: "Documento incompleto (mínimo 8 dígitos)", field: "doc" });
    else if (!courses.includes(r.course.toUpperCase())) issues.push({ ...base, state: "error", msg: "El curso " + (r.course || "(vacío)") + " no existe en la estructura académica", field: "course" });
    else if (r.birth && !toIsoDate(r.birth)) issues.push({ ...base, state: "error", msg: "Fecha de nacimiento inválida: " + r.birth, field: "birth" });
    else if (existingDocs.has(key)) issues.push({ ...base, state: "duplicate", msg: "Ya existe un estudiante con este documento", field: null });
    else if (dupOf !== undefined) issues.push({ ...base, state: "duplicate", msg: "Fila repetida (igual a la fila " + dupOf + ")", field: null });
    else if (!r.phone) issues.push({ ...base, state: "warning", msg: "Falta el teléfono del acudiente", field: null });
  });
  return issues;
}

/** Celda de Excel → texto: las fechas como dd/mm/aaaa (Excel las guarda en UTC) y los números sin decimales de más. */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return String(v.getUTCDate()).padStart(2, "0") + "/" + String(v.getUTCMonth() + 1).padStart(2, "0") + "/" + v.getUTCFullYear();
  return String(v).trim();
}

/** Primera hoja de un .xlsx como tabla de textos (lector cargado solo cuando hace falta). */
async function readXlsx(file: File): Promise<string[][]> {
  const { readSheet } = await import("read-excel-file/browser");
  const rows = (await readSheet(file)) as unknown[][];
  return rows.map((r) => r.map(cellText)).filter((r) => r.some((c) => c));
}

/** Lee el archivo (.xlsx o CSV), valida contra los cursos y los documentos que ya existen en la base. */
export async function readImportFile(file: File): Promise<ImportResult> {
  if (/\.xls$/i.test(file.name)) throw new Error("Los archivos .xls antiguos no se pueden leer. En Excel: Archivo → Guardar como → «Libro de Excel (.xlsx)» o «CSV UTF-8».");
  if (!/\.(xlsx|csv)$/i.test(file.name)) throw new Error("Solo se aceptan archivos Excel (.xlsx) o CSV.");
  let table: string[][];
  try {
    table = /\.xlsx$/i.test(file.name) ? await readXlsx(file) : parseCsv(await file.text());
  } catch {
    throw new Error("No pudimos leer el archivo. Revisa que sea un .xlsx o CSV válido y que no esté protegido con contraseña.");
  }
  if (table.length < 2) throw new Error("El archivo no tiene filas de estudiantes debajo del encabezado.");
  const rows: ImportRow[] = table.slice(1).map((c, i) => ({
    row: i + 2, first: c[0] ?? "", last: c[1] ?? "", docType: c[2] || "Tarjeta de identidad", doc: c[3] ?? "", birth: c[4] ?? "", course: (c[5] ?? "").toUpperCase(),
    guardian: c[6] ?? "", rel: c[7] ?? "", phone: c[8] ?? "",
  }));
  const sb = supabase();
  const docs = [...new Set(rows.filter((r) => r.doc).map(docOf))];
  const [c, s] = await Promise.all([
    sb.from("courses").select("id").neq("status", "archived"),
    docs.length ? sb.from("students").select("document").in("document", docs) : Promise.resolve({ data: [], error: null }),
  ]);
  [c, s].forEach(throwIf);
  const courses = ((c.data ?? []) as Array<{ id: string }>).map((x) => x.id);
  const existing = new Set(((s.data ?? []) as Array<{ document: string }>).map((x) => x.document));
  return { rows, issues: validateRows(rows, courses, existing), total: rows.length };
}

/** Importa las filas que quedaron válidas, corregidas o con advertencia. Todo o nada. */
export function useImportStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, issues }: { rows: ImportRow[]; issues: ImportIssue[] }): Promise<number> => {
      const out = new Set(issues.filter((x) => x.state === "error" || x.state === "duplicate" || x.state === "skipped").map((x) => x.row));
      const fixed = new Map(issues.filter((x) => x.state === "fixed").map((x) => [x.row, x]));
      const list = rows.filter((r) => !out.has(r.row)).map((r) => {
        const f = fixed.get(r.row);
        const doc = f ? f.doc.replace(/\D/g, "") : r.doc;
        return {
          first_names: r.first, last_names: r.last, doc_type: DOC_ABBR[r.docType] ? r.docType : ABBR_DOC[r.docType.toUpperCase()] ?? "Tarjeta de identidad",
          document: docOf({ ...r, doc }), birth_date: toIsoDate(r.birth) ?? "", course_id: (f?.course ?? r.course).toUpperCase(), status: "active",
          guardian_name: r.guardian, guardian_rel: r.rel, guardian_phone: r.phone,
        };
      });
      if (DEMO) return list.length;
      const res = await supabase().rpc("enroll_students", { p: list });
      throwIf(res);
      return res.data as number;
    },
    onSuccess: () => { if (!DEMO) ["students", "structure", "admin-home"].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
  });
}

export const DEMO_IMPORT = { total: 245, issues: IMPORT_ISSUES };

/* ---------- Paz y salvo ---------- */

export type ClearKey = "library" | "fees" | "documents";
const COLUMN: Record<ClearKey, string> = { library: "library_ok", fees: "fees_ok", documents: "documents_ok" };

/** Cambia una obligación de uno o varios estudiantes. */
export async function saveClearance(ids: string[], key: ClearKey, value: boolean): Promise<void> {
  if (DEMO) return;
  const r = await supabase().from("students").update({ [COLUMN[key]]: value }).in("id", ids);
  throwIf(r);
}

/* ---------- Ranking ---------- */

export interface RankRow { id: string; name: string; course: string; grade: string; score: number; subjectsPassed: number; subjectsTotal: number; pos: number }
export interface Academic {
  periods: Array<{ id: string; name: string; weight: number; status: string }>;
  subjects: string[];
  courses: CourseOption[];
  students: Array<{ id: string; name: string; course: string; grade: string }>;
  /** Nota por estudiante → periodo → materia (promedio ponderado de sus notas verificadas). */
  scores: Map<string, Map<string, Map<string, number>>>;
  demo?: boolean;
}

async function fetchAcademic(): Promise<Academic> {
  const sb = supabase();
  const [p, a, sj, e, g, st, c, gl] = await Promise.all([
    sb.from("academic_periods").select("id, name, final_weight, status").order("year").order("position"),
    sb.from("teaching_assignments").select("id, subject_id, period_id"),
    sb.from("subjects").select("id, name").neq("status", "archived").order("name"),
    sb.from("evaluations").select("id, assignment_id, weight"),
    sb.from("grades").select("evaluation_id, student_id, value").eq("status", "verified").range(0, 9999),
    sb.from("students").select("id, full_name, course_id").eq("status", "active").order("full_name"),
    sb.from("courses").select("id, grade_level_id").neq("status", "archived").order("id"),
    sb.from("grade_levels").select("id, name"),
  ]);
  [p, a, sj, e, g, st, c, gl].forEach(throwIf);
  const subjects = (sj.data ?? []) as Array<{ id: string; name: string }>;
  const subjName = new Map(subjects.map((x) => [x.id, x.name]));
  const asg = new Map(((a.data ?? []) as Array<{ id: number; subject_id: string; period_id: string }>).map((x) => [x.id, x]));
  const ev = new Map(((e.data ?? []) as Array<{ id: number; assignment_id: number; weight: number }>).map((x) => [x.id, x]));
  const names = new Map(((gl.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
  const courses = ((c.data ?? []) as Array<{ id: string; grade_level_id: string }>).map((x) => ({ id: x.id, gradeId: x.grade_level_id, gradeName: names.get(x.grade_level_id) ?? x.grade_level_id }));
  // Acumula valor × peso por estudiante, periodo y materia.
  const acc = new Map<string, { s: number; w: number }>();
  ((g.data ?? []) as Array<{ evaluation_id: number; student_id: string; value: number }>).forEach((x) => {
    const evaluation = ev.get(x.evaluation_id); const as = evaluation && asg.get(evaluation.assignment_id);
    if (!evaluation || !as) return;
    const k = x.student_id + "|" + as.period_id + "|" + (subjName.get(as.subject_id) ?? as.subject_id);
    const cur = acc.get(k) ?? { s: 0, w: 0 };
    cur.s += Number(x.value) * Number(evaluation.weight); cur.w += Number(evaluation.weight);
    acc.set(k, cur);
  });
  const scores = new Map<string, Map<string, Map<string, number>>>();
  acc.forEach((v, k) => {
    const [sid, pid, subj] = k.split("|");
    if (!v.w) return;
    const byP = scores.get(sid) ?? new Map<string, Map<string, number>>();
    const byS = byP.get(pid) ?? new Map<string, number>();
    byS.set(subj, Math.round((v.s / v.w) * 10) / 10);
    byP.set(pid, byS); scores.set(sid, byP);
  });
  const gradeOf = new Map(courses.map((x) => [x.id, x.gradeId]));
  return {
    periods: ((p.data ?? []) as Array<{ id: string; name: string; final_weight: number; status: string }>).map((x) => ({ id: x.id, name: x.name, weight: Number(x.final_weight), status: x.status })),
    subjects: subjects.map((x) => x.name), courses,
    students: ((st.data ?? []) as Array<{ id: string; full_name: string; course_id: string }>).map((x) => ({ id: x.id, name: x.full_name, course: x.course_id, grade: gradeOf.get(x.course_id) ?? "" })),
    scores,
  };
}

const DEMO_ACADEMIC: Academic = { periods: PERIODS.map((p) => ({ id: p, name: p, weight: 25, status: "" })), subjects: SUBJECTS.map((s) => s.name), courses: COURSES.map((c) => ({ id: c, gradeId: c.charAt(0), gradeName: "" })), students: [], scores: new Map(), demo: true };
const EMPTY_ACADEMIC: Academic = { ...DEMO_ACADEMIC, demo: false };

export function useAcademic() {
  return useQuery({ queryKey: ["academic", forcedState()], queryFn: () => (DEMO ? demoData(DEMO_ACADEMIC, EMPTY_ACADEMIC) : fetchAcademic()), initialData: demoInitial(DEMO_ACADEMIC) });
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : NaN);

/** Filas del ranking para un periodo (o «Año»: acumulado con el peso de cada periodo) y una materia o todas. */
export function rankRows(d: Academic, f: { period: string; subject: string; grade: string; course: string }): RankRow[] {
  const pick = (s: { grade: string; course: string }) => (f.grade === "all" || s.grade === f.grade) && (f.course === "all" || s.course === f.course);
  let rows: Omit<RankRow, "pos">[];
  if (d.demo) {
    rows = ALL_STUDENTS.filter((s) => s.status === "active" && pick(s))
      .map((s: StudentRecord) => ({ id: s.id, name: s.name, course: s.course, grade: s.grade, score: f.subject === "all" ? s.avg : subjectGrades(s).filter((x) => x.subject === f.subject)[0].grade, subjectsPassed: s.subjectsPassed, subjectsTotal: 6 }));
  } else {
    const periodScore = (sid: string, pid: string): Map<string, number> => d.scores.get(sid)?.get(pid) ?? new Map();
    rows = d.students.filter(pick).map((s) => {
      let bySubject: Map<string, number>;
      if (f.period === "Año") {
        // Acumulado: por materia, promedio de sus periodos ponderado con el peso de cada periodo.
        bySubject = new Map();
        d.subjects.forEach((subj) => {
          let sum = 0, w = 0;
          d.periods.forEach((p) => { const v = periodScore(s.id, p.id).get(subj); if (v !== undefined) { sum += v * p.weight; w += p.weight; } });
          if (w) bySubject.set(subj, Math.round((sum / w) * 10) / 10);
        });
      } else bySubject = periodScore(s.id, d.periods.find((p) => p.name === f.period)?.id ?? "");
      const vals = [...bySubject.values()];
      return {
        id: s.id, name: s.name, course: s.course, grade: s.grade,
        score: f.subject === "all" ? mean(vals) : bySubject.get(f.subject) ?? NaN,
        subjectsPassed: vals.filter((v) => v >= 3).length, subjectsTotal: vals.length,
      };
    }).filter((r) => !isNaN(r.score)); // sin notas verificadas no se ubica a nadie
  }
  return rows.sort((a, b) => b.score - a.score).map((r, i) => ({ ...r, pos: i + 1 }));
}

/* ---------- Inicio de Secretaría ---------- */

export interface AdminHome {
  name: string; openPeriod: { name: string; close: string } | null; lastClosed: string | null; generatedLastClosed: number;
  gaps: Array<{ course: string; subject: string }>;
}

export function useAdminHome(fullName: string) {
  return useQuery({
    queryKey: ["admin-home", forcedState()],
    initialData: demoInitial<AdminHome>({ name: "Patricia", openPeriod: null, lastClosed: null, generatedLastClosed: 0, gaps: [] }),
    queryFn: async (): Promise<AdminHome> => {
      if (DEMO) return demoData<AdminHome>({ name: "Patricia", openPeriod: null, lastClosed: null, generatedLastClosed: 0, gaps: [] }, { name: "Patricia", openPeriod: null, lastClosed: null, generatedLastClosed: 0, gaps: [] });
      const sb = supabase();
      const [p, c, s, a, rc] = await Promise.all([
        sb.from("academic_periods").select("id, name, status, close_date").order("year").order("position"),
        sb.from("courses").select("id").eq("status", "active").order("id"),
        sb.from("subjects").select("id, name").eq("status", "active").order("name"),
        sb.from("teaching_assignments").select("course_id, subject_id, period_id"),
        sb.from("report_cards").select("period_id, status"),
      ]);
      [p, c, s, a, rc].forEach(throwIf);
      const periods = (p.data ?? []) as Array<{ id: string; name: string; status: string; close_date: string }>;
      const open = periods.find((x) => x.status === "open");
      const closed = periods.filter((x) => x.status === "closed").pop();
      const asg = (a.data ?? []) as Array<{ course_id: string; subject_id: string; period_id: string }>;
      const gaps: AdminHome["gaps"] = [];
      if (open) ((c.data ?? []) as Array<{ id: string }>).forEach((co) => ((s.data ?? []) as Array<{ id: string; name: string }>).forEach((sj) => {
        if (!asg.some((x) => x.course_id === co.id && x.subject_id === sj.id && x.period_id === open.id)) gaps.push({ course: co.id, subject: sj.name });
      }));
      return {
        name: fullName.split(" ")[0] || "Secretaría", openPeriod: open ? { name: open.name, close: open.close_date } : null, lastClosed: closed?.name ?? null,
        generatedLastClosed: ((rc.data ?? []) as Array<{ period_id: string; status: string }>).filter((x) => x.period_id === closed?.id && x.status === "generated").length,
        gaps,
      };
    },
  });
}
