import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";
import { confidenceLevel } from "../lib/grade";
import { OBS, conceptFor, subjectGrades, type ObsType, type ObservationItem } from "../data/academic";
import { REVIEW_ROWS } from "../data/reviewRows";
import { ALL_STUDENTS, seeded } from "../data/students";
import type { ReviewStatus } from "../types/domain";
import { demoData, demoInitial, forcedState, allRows } from "./client";

/*
 * Docente: asignaciones del periodo abierto, revisión de notas, planilla, asistencia, observador y conceptos.
 * Cada lectura pasa por el RLS de quien consulta: el docente solo ve sus evaluaciones, sus cursos y sus estudiantes.
 * Las firmas (quién verificó, quién tomó la asistencia, quién revisó el concepto) las pone la base con la sesión.
 */

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/** «28 de septiembre» a partir de una fecha ISO (día local). */
export function longDate(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return d.getDate() + " de " + MONTHS[d.getMonth()];
}

/** «Jueves 1 de octubre» para el encabezado de asistencia. */
export function weekdayDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return WEEKDAYS[d.getDay()] + " " + longDate(iso);
}

/** Fecha local de hoy en ISO (aaaa-mm-dd). */
export function todayIso(): string {
  const d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

/** Mensaje de la base para la persona: el de la evaluación cerrada se muestra tal cual; el resto, genérico. */
export function saveMessage(e: unknown): string {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  return /evaluación está cerrada/i.test(m) ? "La evaluación está cerrada. Solicita el cambio de nota a Rectoría." : "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
}

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };

/* ---------- Asignaciones del docente en el periodo abierto ---------- */

export interface Assignment { key: string; courseId: string; subject: string; periodName: string; openDate: string; closeDate: string }

const DEMO_ASSIGNMENTS: Assignment[] = ["6A", "7A", "7B"].map((c) => ({ key: c, courseId: c, subject: "Matemáticas", periodName: "Periodo 3", openDate: "2026-07-13", closeDate: "2026-10-15" }));

interface AssignmentRow { id: number; course_id: string; subject: { name: string } | null; period: { name: string; open_date: string; close_date: string } | null }

export function useMyAssignments() {
  const email = useAuth().profile?.email ?? "";
  return useQuery({
    queryKey: ["assignments", email],
    enabled: DEMO || !!email,
    initialData: DEMO ? DEMO_ASSIGNMENTS : undefined,
    queryFn: async (): Promise<Assignment[]> => {
      if (DEMO) return DEMO_ASSIGNMENTS;
      const r = await supabase().from("teaching_assignments")
        .select("id, course_id, subject:subjects(name), period:academic_periods!inner(name, status, open_date, close_date)")
        .eq("teacher_email", email).eq("period.status", "open").order("course_id");
      throwIf(r);
      return ((r.data ?? []) as unknown as AssignmentRow[]).map((a) => ({
        key: String(a.id), courseId: a.course_id, subject: a.subject?.name ?? "", periodName: a.period?.name ?? "",
        openDate: a.period?.open_date ?? "", closeDate: a.period?.close_date ?? "",
      }));
    },
  });
}

/** Elige la asignación (la del curso pedido o la primera) y devuelve también la lista. */
export function pickAssignment(list: Assignment[] | undefined, key: string | null, fallbackCourse = "7A"): Assignment | undefined {
  if (!list?.length) return undefined;
  return list.find((a) => a.key === key) ?? list.find((a) => a.courseId === fallbackCourse) ?? list[0];
}

export interface RosterRow { id: string; full_name: string; course_id: string }

export async function roster(courseIds: string[]): Promise<RosterRow[]> {
  if (!courseIds.length) return [];
  const r = await supabase().from("students").select("id, full_name, course_id").in("course_id", courseIds).in("status", ["active", "pending"]).order("full_name");
  throwIf(r);
  return (r.data ?? []) as RosterRow[];
}

/* ---------- Revisión de notas (la IA detecta, el docente verifica) ---------- */

export interface ReviewRow { key: string; gradeId: number; evaluationId: number; index: number; student: { name: string; id: string; course: string }; detected: number; confidence: number; status: ReviewStatus; grade: number }
export interface ReviewData { evaluation: { id: number; name: string; subject: string; course: string } | null; rows: ReviewRow[] }

const DEMO_REVIEW: ReviewData = {
  evaluation: { id: 0, name: "Parcial 2", subject: "Matemáticas", course: "7A" },
  rows: REVIEW_ROWS.map((r, i) => ({
    ...r, key: r.student.id, gradeId: i, evaluationId: 0, index: i + 1, grade: r.detected,
    status: r.status || (isNaN(r.detected) || confidenceLevel(r.confidence) === "low" ? "needs-review" : "pending"),
  })),
};

interface EvalRow { id: number; name: string; assignment: { course_id: string; subject: { name: string } | null } | null }
interface GradeRow { id: number; evaluation_id: number; student_id: string; detected: number | null; confidence: number | null; value: number | null; status: ReviewStatus; student: { full_name: string; course_id: string } | null }

async function fetchReview(evaluationId?: string): Promise<ReviewData> {
  if (DEMO) return demoData(DEMO_REVIEW, { evaluation: null, rows: [] });
  const sb = supabase();
  const sel = "id, name, assignment:teaching_assignments(course_id, subject:subjects(name))";
  // Sin evaluación en la ruta: la primera en revisión del docente (el RLS ya limita a las suyas).
  const er = evaluationId
    ? await sb.from("evaluations").select(sel).eq("id", Number(evaluationId)).limit(1)
    : await sb.from("evaluations").select(sel).eq("status", "en-revision").order("due_date").order("id").limit(1);
  throwIf(er);
  const ev = ((er.data ?? []) as unknown as EvalRow[])[0];
  if (!ev) return { evaluation: null, rows: [] };
  const gr = await sb.from("grades").select("id, evaluation_id, student_id, detected, confidence, value, status, student:students(full_name, course_id)").eq("evaluation_id", ev.id);
  throwIf(gr);
  const rows = ((gr.data ?? []) as unknown as GradeRow[])
    .sort((a, b) => (a.student?.full_name ?? "").localeCompare(b.student?.full_name ?? "", "es"))
    .map((g, i) => {
      const detected = g.detected === null ? NaN : Number(g.detected);
      return {
        key: String(g.id), gradeId: g.id, evaluationId: g.evaluation_id, index: i + 1,
        student: { name: g.student?.full_name ?? g.student_id, id: g.student_id, course: g.student?.course_id ?? "" },
        detected, confidence: g.confidence ?? 0, status: g.status, grade: g.value === null ? detected : Number(g.value),
      };
    });
  return { evaluation: { id: ev.id, name: ev.name, subject: ev.assignment?.subject?.name ?? "", course: ev.assignment?.course_id ?? "" }, rows };
}

export function useReview(evaluationId?: string) {
  return useQuery({
    queryKey: ["review", evaluationId ?? "actual", forcedState()],
    queryFn: () => fetchReview(evaluationId),
    initialData: demoInitial(DEMO_REVIEW),
    // La revisión guarda trabajo sin confirmar: no se recarga sola al volver a la ventana.
    refetchOnWindowFocus: false,
  });
}

/** Guarda las tarjetas que cambiaron (nota o estado). La firma de «verificada» la pone la base. */
export function useSaveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ReviewRow[]) => {
      if (DEMO) { await new Promise((r) => window.setTimeout(r, 900)); return; }
      if (!rows.length) return;
      const r = await supabase().from("grades").upsert(
        rows.map((x) => ({ id: x.gradeId, evaluation_id: x.evaluationId, student_id: x.student.id, value: isNaN(x.grade) ? null : x.grade, status: x.status })),
        { onConflict: "id" },
      );
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["review"] }); },
  });
}

/* ---------- Planilla: columnas = evaluaciones de la asignación; celdas = notas verificadas ---------- */

export interface GbColumn { key: string; label: string; weight: number }
export type GbRow = { id: string; name: string } & Record<string, number | string>;
export interface GradebookData { columns: GbColumn[]; rows: GbRow[] }

const DEMO_COLS: GbColumn[] = [["a1", "Actividad 1", 15], ["a2", "Actividad 2", 15], ["ws", "Taller", 20], ["ex", "Examen", 35], ["at", "Actitudinal", 15]]
  .map(([key, label, weight]) => ({ key: key as string, label: label as string, weight: weight as number }));

function demoGradebook(course: string): GradebookData {
  const rows = ALL_STUDENTS.filter((s) => s.course === course && s.status !== "retired").map((s, i) => {
    const b = s.avg, r: GbRow = { id: s.id, name: s.name };
    DEMO_COLS.forEach((c, j) => {
      const v = Math.round(Math.max(1, Math.min(5, b + (seeded(Number(s.id) + j * 3) - 0.5) * 1.4)) * 10) / 10;
      r[c.key] = c.key === "ex" && i % 5 === 3 ? NaN : v;
    });
    return r;
  });
  return { columns: DEMO_COLS, rows };
}

async function fetchGradebook(a: Assignment): Promise<GradebookData> {
  if (DEMO) return demoData(demoGradebook(a.courseId), { columns: DEMO_COLS, rows: [] });
  const sb = supabase();
  const [ev, students] = await Promise.all([
    sb.from("evaluations").select("id, name, weight").eq("assignment_id", Number(a.key)).order("due_date").order("id"),
    roster([a.courseId]),
  ]);
  throwIf(ev);
  const columns = ((ev.data ?? []) as Array<{ id: number; name: string; weight: number }>).map((e) => ({ key: String(e.id), label: e.name, weight: Number(e.weight) }));
  const grades = columns.length
    ? await allRows((from, to) => sb.from("grades").select("evaluation_id, student_id, value").in("evaluation_id", columns.map((c) => Number(c.key))).eq("status", "verified").order("id").range(from, to))
    : { data: [], error: null };
  throwIf(grades);
  const byCell = new Map<string, number>();
  ((grades.data ?? []) as Array<{ evaluation_id: number; student_id: string; value: number }>).forEach((g) => byCell.set(g.student_id + ":" + g.evaluation_id, Number(g.value)));
  const rows = students.map((s) => {
    const r: GbRow = { id: s.id, name: s.full_name };
    columns.forEach((c) => { r[c.key] = byCell.get(s.id + ":" + c.key) ?? NaN; });
    return r;
  });
  return { columns, rows };
}

export function useGradebook(a: Assignment | undefined) {
  return useQuery({
    queryKey: ["gradebook", a?.key, forcedState()],
    enabled: !!a,
    queryFn: () => fetchGradebook(a!),
    initialData: a ? demoInitial(demoGradebook(a.courseId)) : undefined,
    refetchOnWindowFocus: false,
  });
}

/** Una celda escrita por el docente: queda como nota verificada (con su firma, que pone la base). */
export function useSaveGradeCell() {
  return useMutation({
    mutationFn: async (v: { studentId: string; column: string; value: number }) => {
      if (DEMO) return;
      const r = await supabase().from("grades").upsert(
        { evaluation_id: Number(v.column), student_id: v.studentId, value: v.value, status: "verified" },
        { onConflict: "evaluation_id,student_id" },
      );
      throwIf(r);
    },
  });
}

/* ---------- Asistencia de una clase ---------- */

export type AttState = "present" | "absent" | "late" | "excused";
export interface AttRow { id: string; name: string; state: AttState | null; note: string }

function demoAttendance(): AttRow[] {
  return ALL_STUDENTS.filter((s) => s.course === "7A" && s.status !== "retired")
    .map((s, i) => ({ id: s.id, name: s.name, state: i === 3 ? "absent" : i === 6 ? "late" : null, note: i === 0 ? "Participó activamente durante la actividad." : "" }));
}

// Una clase por día y curso mientras no exista el horario: la hora (slot) queda en 1.
const SLOT = 1;

async function fetchAttendance(courseId: string, date: string): Promise<AttRow[]> {
  if (DEMO) return demoData(demoAttendance(), []);
  const [students, rec] = await Promise.all([
    roster([courseId]),
    supabase().from("attendance").select("student_id, state, note").eq("course_id", courseId).eq("class_date", date).eq("slot", SLOT),
  ]);
  throwIf(rec);
  const by = new Map(((rec.data ?? []) as Array<{ student_id: string; state: AttState; note: string | null }>).map((x) => [x.student_id, x]));
  return students.map((s) => ({ id: s.id, name: s.full_name, state: by.get(s.id)?.state ?? null, note: by.get(s.id)?.note ?? "" }));
}

export function useAttendance(courseId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["attendance", courseId, date, forcedState()],
    enabled: !!courseId,
    queryFn: () => fetchAttendance(courseId!, date),
    initialData: demoInitial(demoAttendance()),
    refetchOnWindowFocus: false,
  });
}

export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { courseId: string; date: string; rows: AttRow[] }) => {
      if (DEMO) return;
      const r = await supabase().from("attendance").upsert(
        v.rows.filter((x) => x.state).map((x) => ({ course_id: v.courseId, student_id: x.id, class_date: v.date, slot: SLOT, state: x.state, note: x.note.trim() || null })),
        { onConflict: "student_id,course_id,class_date,slot" },
      );
      throwIf(r);
    },
    onSuccess: (_d, v) => { if (!DEMO) qc.setQueryData(["attendance", v.courseId, v.date, null], v.rows); },
  });
}

/* ---------- Observador ---------- */

export interface StudentOption { value: string; label: string; course: string }

/** Estudiantes a los que el docente puede anotar (sus cursos). En demo, 7A con el nombre como valor, como el sistema. */
export function useMyStudents(courseIds: string[]) {
  const demo = ALL_STUDENTS.filter((s) => s.course === "7A").map((s) => ({ value: s.name, label: s.name, course: s.course }));
  return useQuery({
    queryKey: ["my-students", courseIds.join(",")],
    enabled: DEMO || courseIds.length > 0,
    initialData: DEMO ? demo : undefined,
    queryFn: async (): Promise<StudentOption[]> => (DEMO ? demo : (await roster(courseIds)).map((s) => ({ value: s.id, label: s.full_name, course: s.course_id }))),
  });
}

interface ObsRow { id: number; type: ObsType; title: string; context: string | null; created_at: string; student: { full_name: string; course_id: string } | null; author: { full_name: string } | null }

async function fetchObservations(): Promise<ObservationItem[]> {
  if (DEMO) return demoData(OBS, []);
  const r = await supabase().from("observations")
    .select("id, type, title, context, created_at, student:students(full_name, course_id), author:profiles(full_name)")
    .order("created_at", { ascending: false }).limit(60);
  throwIf(r);
  return ((r.data ?? []) as unknown as ObsRow[]).map((o) => ({
    date: longDate(o.created_at), type: o.type, title: o.title, context: o.context ?? "", by: o.author?.full_name ?? "",
    student: o.student?.full_name ?? "", course: o.student?.course_id ?? "",
  }));
}

export function useObservations() {
  return useQuery({ queryKey: ["observations", forcedState()], queryFn: fetchObservations, initialData: demoInitial(OBS) });
}

export function useAddObservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { studentId: string; type: ObsType; title: string; context: string }) => {
      if (DEMO) return;
      // El autor lo pone la base (author_id = auth.uid()).
      const r = await supabase().from("observations").insert({ student_id: v.studentId, type: v.type, title: v.title.trim(), context: v.context.trim() || null });
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["observations"] }); },
  });
}

/* ---------- Conceptos del periodo ---------- */

export type ConceptState = "empty" | "ai" | "teacher" | "reviewed";
export interface ConceptRow { id: string; name: string; grade: number; prev: number; absences: number; text: string; state: ConceptState }

function demoConcepts(subject: string): ConceptRow[] {
  return ALL_STUDENTS.filter((s) => s.course === "7A" && s.status !== "retired").map((s, i) => {
    const g = subjectGrades(s).filter((x) => x.subject === subject)[0];
    return { id: s.id, name: s.name, grade: g.grade, prev: g.periods[g.periods.length - 2], absences: g.absences, text: i < 2 ? g.concept : "", state: i === 0 ? "reviewed" : i === 1 ? "ai" : "empty" };
  });
}

/** Nota del periodo: promedio ponderado de las notas verificadas; sin ninguna, NaN («—»). */
function weighted(vals: Array<{ value: number; weight: number }>): number {
  const w = vals.reduce((a, v) => a + v.weight, 0);
  return w ? Math.round((vals.reduce((a, v) => a + v.value * v.weight, 0) / w) * 10) / 10 : NaN;
}

async function fetchConcepts(a: Assignment): Promise<ConceptRow[]> {
  if (DEMO) return demoData(demoConcepts(a.subject || "Matemáticas"), []);
  const sb = supabase();
  const id = Number(a.key);
  const [students, ev, abs, cp] = await Promise.all([
    roster([a.courseId]),
    sb.from("evaluations").select("id, weight").eq("assignment_id", id),
    allRows((from, to) => sb.from("attendance").select("student_id").eq("course_id", a.courseId).eq("state", "absent").gte("class_date", a.openDate).lte("class_date", a.closeDate).order("id").range(from, to)),
    sb.from("period_concepts").select("student_id, text, state").eq("assignment_id", id),
  ]);
  [ev, abs, cp].forEach(throwIf);
  const weights = new Map(((ev.data ?? []) as Array<{ id: number; weight: number }>).map((e) => [e.id, Number(e.weight)]));
  const gr = weights.size
    ? await allRows((from, to) => sb.from("grades").select("evaluation_id, student_id, value").in("evaluation_id", [...weights.keys()]).eq("status", "verified").order("id").range(from, to))
    : { data: [], error: null };
  throwIf(gr);
  const grades = new Map<string, Array<{ value: number; weight: number }>>();
  ((gr.data ?? []) as Array<{ evaluation_id: number; student_id: string; value: number }>).forEach((g) => {
    const l = grades.get(g.student_id) ?? [];
    l.push({ value: Number(g.value), weight: weights.get(g.evaluation_id) ?? 0 });
    grades.set(g.student_id, l);
  });
  const absences = new Map<string, number>();
  ((abs.data ?? []) as Array<{ student_id: string }>).forEach((x) => absences.set(x.student_id, (absences.get(x.student_id) ?? 0) + 1));
  const concepts = new Map(((cp.data ?? []) as Array<{ student_id: string; text: string; state: ConceptState }>).map((c) => [c.student_id, c]));
  return students.map((s) => ({
    id: s.id, name: s.full_name, grade: weighted(grades.get(s.id) ?? []),
    prev: NaN, // los periodos anteriores aún no tienen notas en la base
    absences: absences.get(s.id) ?? 0, text: concepts.get(s.id)?.text ?? "", state: concepts.get(s.id)?.state ?? "empty",
  }));
}

export function useConcepts(a: Assignment | undefined) {
  return useQuery({
    queryKey: ["concepts", a?.key, forcedState()],
    enabled: !!a,
    queryFn: () => fetchConcepts(a!),
    initialData: a ? demoInitial(demoConcepts(a.subject || "Matemáticas")) : undefined,
    refetchOnWindowFocus: false,
  });
}

/** Guarda uno o varios conceptos (texto y estado). La firma del docente la pone la base. */
export function useSaveConcepts() {
  return useMutation({
    mutationFn: async (v: { assignment: Assignment; rows: Array<Pick<ConceptRow, "id" | "text" | "state">> }) => {
      if (DEMO || !v.rows.length) return;
      const r = await supabase().from("period_concepts").upsert(
        v.rows.map((x) => ({ student_id: x.id, assignment_id: Number(v.assignment.key), text: x.text, state: x.state })),
        { onConflict: "student_id,assignment_id" },
      );
      throwIf(r);
    },
  });
}

/** Borrador de concepto (regla del sistema; aún sin servicio de IA). Sin nota del periodo no hay borrador. */
export function draftConcept(subject: string, r: Pick<ConceptRow, "grade" | "absences" | "prev">): string | null {
  return isNaN(r.grade) ? null : conceptFor(subject, r.grade, r.absences, isNaN(r.prev) ? undefined : r.prev);
}
