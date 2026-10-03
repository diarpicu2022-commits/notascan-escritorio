import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";
import { EVALUATIONS, STUDENTS, subjectGrades, type EvalKind, type EvalStatus, type EvaluationItem, type TeacherStudent } from "../data/academic";
import { ALL_STUDENTS } from "../data/students";
import type { ReviewStatus } from "../types/domain";
import { demoData, demoInitial, forcedState } from "./client";
import { roster, todayIso, useMyAssignments, weekdayDate, type Assignment, type RosterRow } from "./teacher";

/*
 * Docente · inicio, estudiantes, evaluaciones y recuperaciones (paso 6b.2b).
 * Una sola lectura (evaluaciones de sus asignaciones del periodo abierto, sus notas y la lista de sus cursos)
 * alimenta las tres primeras pantallas; cada una la resume a la forma que usan los componentes del sistema.
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
/** «28 sep» para las tarjetas de evaluación. */
const shortDate = (iso: string | null) => { if (!iso) return "Sin fecha"; const [, m, d] = iso.split("-").map(Number); return d + " " + SHORT[m - 1]; };

interface Ev { id: number; assignmentKey: string; name: string; kind: EvalKind; weight: number; status: EvalStatus; dueDate: string | null; course: string; subject: string }
interface G { evaluationId: number; studentId: string; status: ReviewStatus; value: number | null; verifiedAt: string | null; verifiedBy: string | null }
export interface Overview { assignments: Assignment[]; evals: Ev[]; grades: G[]; roster: RosterRow[]; /** Demo: usar las cifras fijas del sistema. */ demo?: boolean }

const EMPTY: Overview = { assignments: [], evals: [], grades: [], roster: [] };
const DEMO_OVERVIEW: Overview = { ...EMPTY, demo: true };

async function fetchOverview(assignments: Assignment[]): Promise<Overview> {
  const sb = supabase();
  const keys = assignments.map((a) => Number(a.key));
  const byKey = new Map(assignments.map((a) => [a.key, a]));
  const [er, students] = await Promise.all([
    keys.length ? sb.from("evaluations").select("id, assignment_id, name, kind, weight, status, due_date").in("assignment_id", keys).order("due_date").order("id") : Promise.resolve({ data: [], error: null }),
    roster([...new Set(assignments.map((a) => a.courseId))]),
  ]);
  throwIf(er);
  const evals = ((er.data ?? []) as Array<{ id: number; assignment_id: number; name: string; kind: EvalKind; weight: number; status: EvalStatus; due_date: string | null }>).map((e) => {
    const a = byKey.get(String(e.assignment_id));
    return { id: e.id, assignmentKey: String(e.assignment_id), name: e.name, kind: e.kind, weight: Number(e.weight), status: e.status, dueDate: e.due_date, course: a?.courseId ?? "", subject: a?.subject ?? "" };
  });
  const gr = evals.length
    ? await sb.from("grades").select("evaluation_id, student_id, status, value, verified_at, verified_by").in("evaluation_id", evals.map((e) => e.id))
    : { data: [], error: null };
  throwIf(gr);
  const grades = ((gr.data ?? []) as Array<{ evaluation_id: number; student_id: string; status: ReviewStatus; value: number | null; verified_at: string | null; verified_by: string | null }>)
    .map((g) => ({ evaluationId: g.evaluation_id, studentId: g.student_id, status: g.status, value: g.value === null ? null : Number(g.value), verifiedAt: g.verified_at, verifiedBy: g.verified_by }));
  return { assignments, evals, grades, roster: students };
}

/** Lectura compartida por inicio, estudiantes, evaluaciones y recuperaciones. En demo marca «usar los datos del sistema». */
export function useOverview() {
  const aq = useMyAssignments();
  const q = useQuery({
    queryKey: ["overview", aq.data?.map((a) => a.key).join(","), forcedState()],
    enabled: !!aq.data,
    queryFn: () => (DEMO ? demoData(DEMO_OVERVIEW, EMPTY) : fetchOverview(aq.data!)),
    initialData: demoInitial(DEMO_OVERVIEW),
  });
  return { aq, q };
}

/** Promedio ponderado de notas verificadas; NaN si no hay ninguna. */
function weighted(list: Array<{ value: number; weight: number }>): number {
  const w = list.reduce((a, x) => a + x.weight, 0);
  return w ? Math.round((list.reduce((a, x) => a + x.value * x.weight, 0) / w) * 10) / 10 : NaN;
}
const verifiedOf = (o: Overview, evalIds: Set<number>, studentId?: string) =>
  o.grades.filter((g) => evalIds.has(g.evaluationId) && g.status === "verified" && g.value !== null && (!studentId || g.studentId === studentId));

function evaluationItems(o: Overview, list: Ev[]): EvaluationItem[] {
  return list.map((e) => ({
    id: String(e.id), name: e.name, subject: e.subject, kind: e.kind, weight: e.weight, status: e.status, date: shortDate(e.dueDate),
    reviewed: o.grades.filter((g) => g.evaluationId === e.id && g.status === "verified").length,
    total: o.roster.filter((s) => s.course_id === e.course).length,
  }));
}

/* ---------- Inicio ---------- */

export interface DashboardData {
  greeting: string; name: string; dateLine: string; inReview: number; toVerify: number; verifiedMonth: string; avg: string; avgLabel: string;
  hero: { id: string; title: string; meta: string; pending: number; verified: number; total: number } | null;
  evaluations: EvaluationItem[];
  attention: Array<{ id: string; evaluationId: string; name: string; detail: string }>;
}

/** Los valores del sistema (sus cifras fijas), para el modo demostración. */
const DEMO_DASHBOARD: DashboardData = {
  greeting: "Buenos días", name: "Ana Lucía", dateLine: "Martes 30 de septiembre · Periodo 3 · 2026", inReview: 2, toVerify: 8, verifiedMonth: "112", avg: "3.9", avgLabel: "promedio de Matemáticas 7A",
  hero: { id: "", title: "Parcial 2 · Matemáticas", meta: "7A · 24 estudiantes · subido hace 2 horas", pending: 8, verified: 18, total: 24 },
  evaluations: EVALUATIONS.filter((e) => e.status === "en-revision").concat(EVALUATIONS.filter((e) => e.status === "borrador").slice(0, 1)),
  attention: STUDENTS.filter((s) => s.status === "needs-review").map((s) => ({ id: s.id, evaluationId: "", name: s.name, detail: (isNaN(s.avg) ? "Sin detección · " : "Baja confianza · ") + s.last })),
};

export function dashboardOf(o: Overview, fullName: string): DashboardData {
  const h = new Date().getHours();
  const items = evaluationItems(o, o.evals);
  const inReview = o.evals.filter((e) => e.status === "en-revision");
  const mine = new Set(o.evals.map((e) => e.id));
  const toVerify = o.grades.filter((g) => mine.has(g.evaluationId) && g.status !== "verified").length;
  const month = todayIso().slice(0, 7);
  const verifiedMonth = o.grades.filter((g) => g.status === "verified" && (g.verifiedAt ?? "").slice(0, 7) === month).length;
  const firstEv = inReview[0];
  const a = o.assignments.find((x) => x.key === firstEv?.assignmentKey) ?? o.assignments[0];
  // Promedio del curso = media de los promedios ponderados de cada estudiante con notas verificadas.
  const ids = new Set(o.evals.filter((e) => e.assignmentKey === a?.key).map((e) => e.id));
  const perStudent = a ? o.roster.filter((s) => s.course_id === a.courseId)
    .map((s) => weighted(verifiedOf(o, ids, s.id).map((g) => ({ value: g.value!, weight: o.evals.find((e) => e.id === g.evaluationId)!.weight }))))
    .filter((x) => !isNaN(x)) : [];
  const avg = perStudent.length ? Math.round((perStudent.reduce((x, y) => x + y, 0) / perStudent.length) * 10) / 10 : NaN;
  const heroItem = firstEv ? items.find((i) => i.id === String(firstEv.id))! : null;
  const names = new Map(o.roster.map((s) => [s.id, s.full_name]));
  const evName = new Map(o.evals.map((e) => [e.id, e.name]));
  return {
    greeting: h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches",
    name: fullName.split(" ").slice(0, 2).join(" "),
    dateLine: weekdayDate(todayIso()) + " · " + (a?.periodName ?? "") + " · " + todayIso().slice(0, 4),
    inReview: inReview.length, toVerify, verifiedMonth: String(verifiedMonth),
    avg: isNaN(avg) ? "—" : avg.toFixed(1), avgLabel: a ? "promedio de " + a.subject + " " + a.courseId : "promedio del curso",
    hero: heroItem && firstEv ? {
      id: heroItem.id, title: firstEv.name + " · " + firstEv.subject, meta: firstEv.course + " · " + heroItem.total + " estudiantes",
      pending: heroItem.total - heroItem.reviewed, verified: heroItem.reviewed, total: heroItem.total,
    } : null,
    evaluations: items.filter((e) => e.status === "en-revision").concat(items.filter((e) => e.status === "borrador").slice(0, 1)),
    attention: o.grades.filter((g) => mine.has(g.evaluationId) && g.status === "needs-review").slice(0, 8).map((g) => ({
      id: g.studentId + ":" + g.evaluationId, evaluationId: String(g.evaluationId), name: names.get(g.studentId) ?? g.studentId,
      detail: (g.value === null ? "Sin detección · " : "Baja confianza · ") + (evName.get(g.evaluationId) ?? ""),
    })),
  };
}


/* ---------- Estudiantes del docente ---------- */

export function studentsOf(o: Overview): TeacherStudent[] {
  const evById = new Map(o.evals.map((e) => [e.id, e]));
  return o.roster.map((s) => {
    const mine = o.grades.filter((g) => g.studentId === s.id);
    const ver = mine.filter((g) => g.status === "verified" && g.value !== null);
    const last = mine.slice().sort((a, b) => (evById.get(b.evaluationId)?.dueDate ?? "").localeCompare(evById.get(a.evaluationId)?.dueDate ?? ""))[0];
    return {
      name: s.full_name, id: s.id, course: s.course_id,
      avg: weighted(ver.map((g) => ({ value: g.value!, weight: evById.get(g.evaluationId)?.weight ?? 0 }))),
      status: last?.status ?? "pending", last: last ? evById.get(last.evaluationId)?.name ?? "" : "Sin calificaciones",
    };
  });
}

/* ---------- Evaluaciones ---------- */

export function evaluationsOf(o: Overview, assignmentKey: string | undefined): EvaluationItem[] {
  return evaluationItems(o, o.evals.filter((e) => e.assignmentKey === assignmentKey));
}

export interface NewEvaluation { assignmentKey: string; name: string; kind: EvalKind; weight: number; dueDate: string }

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: NewEvaluation) => {
      if (DEMO) return;
      const r = await supabase().from("evaluations").insert({ assignment_id: Number(v.assignmentKey), name: v.name.trim(), kind: v.kind, weight: v.weight, due_date: v.dueDate || null, status: "borrador" });
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) { qc.invalidateQueries({ queryKey: ["overview"] }); qc.invalidateQueries({ queryKey: ["gradebook"] }); } },
  });
}

/* ---------- Recuperaciones: materias del periodo por debajo de 3.0 ---------- */

export interface RecoveryRow { id: string; studentId: string; assignmentKey: string; name: string; course: string; subject: string; original: number; recovery: string; saved: boolean }

function demoRecoveries(): RecoveryRow[] {
  return ALL_STUDENTS.filter((s) => s.status === "active")
    .map((s) => ({ s, g: subjectGrades(s).filter((x) => x.grade < 3)[0] }))
    .filter((x) => x.g).slice(0, 9)
    .map((x, i) => ({ id: x.s.id, studentId: x.s.id, assignmentKey: "", name: x.s.name, course: x.s.course, subject: x.g.subject, original: x.g.grade, recovery: i === 0 ? "4.0" : i === 1 ? "2.6" : "", saved: i < 2 }));
}

async function fetchRecoveries(o: Overview): Promise<RecoveryRow[]> {
  const keys = o.assignments.map((a) => Number(a.key));
  const r = keys.length ? await supabase().from("recoveries").select("student_id, assignment_id, original, recovery").in("assignment_id", keys) : { data: [], error: null };
  throwIf(r);
  const saved = new Map(((r.data ?? []) as Array<{ student_id: string; assignment_id: number; original: number; recovery: number | null }>).map((x) => [x.student_id + ":" + x.assignment_id, x]));
  const out: RecoveryRow[] = [];
  o.assignments.forEach((a) => {
    const ids = new Set(o.evals.filter((e) => e.assignmentKey === a.key).map((e) => e.id));
    const w = new Map(o.evals.map((e) => [e.id, e.weight]));
    o.roster.filter((s) => s.course_id === a.courseId).forEach((s) => {
      const k = s.id + ":" + a.key, rec = saved.get(k);
      const avg = weighted(verifiedOf(o, ids, s.id).map((g) => ({ value: g.value!, weight: w.get(g.evaluationId) ?? 0 })));
      // La nota original guardada manda: si ya hubo recuperación, la fila se conserva aunque la nota cambie.
      const original = rec ? Number(rec.original) : avg;
      if (!rec && !(avg < 3)) return;
      out.push({
        id: k, studentId: s.id, assignmentKey: a.key, name: s.full_name, course: s.course_id, subject: a.subject, original,
        recovery: rec?.recovery == null ? "" : Number(rec.recovery).toFixed(1), saved: !!rec && rec.recovery != null,
      });
    });
  });
  return out.sort((x, y) => x.name.localeCompare(y.name, "es"));
}

export function useRecoveries() {
  const { aq, q } = useOverview();
  const rq = useQuery({
    queryKey: ["recoveries", q.dataUpdatedAt, forcedState()],
    enabled: !!q.data,
    queryFn: () => (DEMO ? demoData(demoRecoveries(), []) : fetchRecoveries(q.data!)),
    initialData: demoInitial(demoRecoveries()),
    refetchOnWindowFocus: false,
  });
  return { aq, q, rq };
}

export function useSaveRecovery() {
  return useMutation({
    mutationFn: async (r: RecoveryRow & { value: number }) => {
      if (DEMO) return;
      // El resultado (aprobada / no aprobada) y la firma los pone la base.
      const x = await supabase().from("recoveries").upsert(
        { student_id: r.studentId, assignment_id: Number(r.assignmentKey), original: r.original, recovery: r.value },
        { onConflict: "student_id,assignment_id" },
      );
      throwIf(x);
    },
  });
}

/** Inicio: en demo, las cifras fijas del sistema; en modo normal, calculadas. */
export function useDashboard() {
  const me = useAuth().profile;
  const { aq, q } = useOverview();
  const data = q.data ? (q.data.demo ? DEMO_DASHBOARD : dashboardOf(q.data, me?.fullName ?? "Docente")) : undefined;
  return { aq, q, data };
}

export const studentRows = (o: Overview) => (o.demo ? STUDENTS : studentsOf(o));
export const evaluationRows = (o: Overview, key: string | undefined) => (o.demo ? EVALUATIONS : evaluationsOf(o, key));
