import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";
import { PERIODS } from "../data/admin";
import { ALL_STUDENTS, COURSES, type StudentRecord } from "../data/students";
import { demoReportCard, type ReportCardData } from "../components/organisms/ReportCardDocument";
import { DEMO_INSTITUTION, toInstitution, type InstitutionRow } from "./institution";
import { demoData, demoInitial, forcedState } from "./client";

/*
 * Boletines (paso 6b.3c). Solo entra lo que una persona confirmó: notas verificadas, conceptos escritos o revisados
 * por el docente y el mensaje que escribió o revisó el director de grupo. El PDF se produce imprimiendo el documento.
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const round1 = (x: number) => Math.round(x * 10) / 10;
const mean = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : NaN);

export type RcState = "pending" | "generated" | "blocked";
export interface RcRow { id: string; name: string; course: string; avg: number; rc: RcState; data: ReportCardData | null; student?: StudentRecord }
export interface ReportCardsData { rows: RcRow[]; periods: string[]; courses: Array<{ id: string; gradeId: string; gradeName: string }>; demo?: boolean }

/* ---------- Secretaría: boletines de un curso en un periodo ---------- */

interface Ctx { course: string; period: string }

async function fetchReportCards({ course, period }: Ctx): Promise<ReportCardsData> {
  const sb = supabase();
  const [pq, cq, gq, sq, dq, iq] = await Promise.all([
    sb.from("academic_periods").select("id, name, year, position, final_weight, open_date, close_date").order("year").order("position"),
    sb.from("courses").select("id, grade_level_id, director_email").neq("status", "archived").order("id"),
    sb.from("grade_levels").select("id, name"),
    sb.from("student_overview").select("id, full_name, document, course_id, grade_level_id, status, library_ok, fees_ok, documents_ok").eq("course_id", course).in("status", ["active", "pending"]).order("full_name"),
    sb.from("staff_directory").select("email, full_name, role"),
    sb.from("institutions").select("id, name, short_name, city, department, resolution, dane, logo_path, status").limit(1),
  ]);
  [pq, cq, gq, sq, dq, iq].forEach(throwIf);
  // El colegio de quien consulta (el RLS solo deja leer el propio).
  const instRow = ((iq.data ?? []) as InstitutionRow[])[0];
  const school = instRow ? toInstitution(instRow) : DEMO_INSTITUTION;
  const periods = (pq.data ?? []) as Array<{ id: string; name: string; year: number; position: number; final_weight: number; open_date: string; close_date: string }>;
  const gradeNames = new Map(((gq.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
  const courses = ((cq.data ?? []) as Array<{ id: string; grade_level_id: string; director_email: string | null }>);
  const staff = (dq.data ?? []) as Array<{ email: string; full_name: string; role: string }>;
  const nameOf = (email: string | null | undefined) => staff.find((x) => x.email === email)?.full_name ?? "Sin asignar";
  const base: ReportCardsData = { rows: [], periods: periods.map((p) => p.name), courses: courses.map((c) => ({ id: c.id, gradeId: c.grade_level_id, gradeName: gradeNames.get(c.grade_level_id) ?? c.grade_level_id })) };
  const cur = periods.find((p) => p.name === period);
  const students = (sq.data ?? []) as Array<{ id: string; full_name: string; document: string; course_id: string; grade_level_id: string; library_ok: boolean; fees_ok: boolean; documents_ok: boolean }>;
  if (!cur || !students.length) return base;
  const yearPeriods = periods.filter((p) => p.year === cur.year && p.position <= cur.position);

  const aq = await sb.from("teaching_assignments").select("id, subject_id, period_id, teacher_email, subject:subjects(name)").eq("course_id", course).in("period_id", yearPeriods.map((p) => p.id));
  throwIf(aq);
  const asg = (aq.data ?? []) as unknown as Array<{ id: number; subject_id: string; period_id: string; teacher_email: string; subject: { name: string } | null }>;
  const ids = students.map((s) => s.id);
  const [eq, cpq, atq, mq, rq] = await Promise.all([
    asg.length ? sb.from("evaluations").select("id, assignment_id, weight").in("assignment_id", asg.map((a) => a.id)) : Promise.resolve({ data: [], error: null }),
    sb.from("period_concepts").select("student_id, assignment_id, text, state").in("assignment_id", asg.filter((a) => a.period_id === cur.id).map((a) => a.id)).in("state", ["teacher", "reviewed"]),
    sb.from("attendance").select("student_id, state").eq("course_id", course).gte("class_date", cur.open_date).lte("class_date", cur.close_date),
    sb.from("director_messages").select("student_id, text, state").eq("period_id", cur.id).in("state", ["teacher", "reviewed"]),
    sb.from("report_cards").select("student_id, status").eq("period_id", cur.id).in("student_id", ids),
  ]);
  [eq, cpq, atq, mq, rq].forEach(throwIf);
  const evals = (eq.data ?? []) as Array<{ id: number; assignment_id: number; weight: number }>;
  const gr = evals.length
    ? await sb.from("grades").select("evaluation_id, student_id, value").eq("status", "verified").in("evaluation_id", evals.map((e) => e.id)).in("student_id", ids)
    : { data: [], error: null };
  throwIf(gr);

  // Nota de cada estudiante en cada asignación (promedio ponderado de sus notas verificadas).
  const evById = new Map(evals.map((e) => [e.id, e]));
  const acc = new Map<string, { s: number; w: number }>();
  ((gr.data ?? []) as Array<{ evaluation_id: number; student_id: string; value: number }>).forEach((g) => {
    const e = evById.get(g.evaluation_id); if (!e) return;
    const k = g.student_id + ":" + e.assignment_id, c = acc.get(k) ?? { s: 0, w: 0 };
    c.s += Number(g.value) * Number(e.weight); c.w += Number(e.weight); acc.set(k, c);
  });
  const gradeIn = (sid: string, aid: number | undefined) => { const c = aid === undefined ? undefined : acc.get(sid + ":" + aid); return c && c.w ? round1(c.s / c.w) : NaN; };
  const concepts = new Map(((cpq.data ?? []) as Array<{ student_id: string; assignment_id: number; text: string }>).map((c) => [c.student_id + ":" + c.assignment_id, c.text]));
  const att = (atq.data ?? []) as Array<{ student_id: string; state: string }>;
  const messages = new Map(((mq.data ?? []) as Array<{ student_id: string; text: string }>).map((m) => [m.student_id, m.text]));
  const generated = new Set(((rq.data ?? []) as Array<{ student_id: string; status: string }>).filter((r) => r.status === "generated").map((r) => r.student_id));
  const current = asg.filter((a) => a.period_id === cur.id).sort((a, b) => (a.subject?.name ?? "").localeCompare(b.subject?.name ?? "", "es"));
  const totalPeriods = periods.filter((p) => p.year === cur.year).length;
  const courseRow = courses.find((c) => c.id === course);
  const director = nameOf(courseRow?.director_email);
  const rector = staff.find((x) => x.role === "principal")?.full_name ?? "Rectoría";

  const built = students.map((s) => {
    const rows = current.map((a) => {
      const subj = a.subject?.name ?? a.subject_id;
      const byPeriod = yearPeriods.map((p) => gradeIn(s.id, asg.find((x) => x.period_id === p.id && x.subject_id === a.subject_id)?.id));
      let sum = 0, w = 0;
      byPeriod.forEach((g, i) => { if (!isNaN(g)) { sum += g * yearPeriods[i].final_weight; w += yearPeriods[i].final_weight; } });
      return {
        subject: subj, teacher: nameOf(a.teacher_email), periods: byPeriod.slice(0, -1), grade: byPeriod[byPeriod.length - 1],
        cumulative: w ? round1(sum / w) : NaN, absences: null as number | null, concept: concepts.get(s.id + ":" + a.id) ?? "",
      };
    });
    const mine = att.filter((x) => x.student_id === s.id);
    const absences = mine.filter((x) => x.state === "absent").length;
    return { s, rows, avg: mean(rows.map((r) => r.grade).filter((g) => !isNaN(g))), cum: mean(rows.map((r) => r.cumulative).filter((g) => !isNaN(g))), absences, attendance: mine.length ? Math.round(((mine.length - absences) / mine.length) * 100) : NaN };
  });
  // Puesto en el curso: por promedio del periodo, entre quienes tienen notas.
  const ranked = built.filter((b) => !isNaN(b.avg)).sort((a, b) => b.avg - a.avg);
  return {
    ...base,
    rows: built.map((b) => {
      const blocked = !(b.s.library_ok && b.s.fees_ok && b.s.documents_ok);
      const pos = ranked.indexOf(b);
      const data: ReportCardData = {
        school, studentName: b.s.full_name, period: cur.name, year: cur.year, index: cur.position, totalPeriods,
        weightsText: periods.filter((p) => p.year === cur.year).map((p) => "P" + p.position + " " + Number(p.final_weight) + "%").join(" · "),
        facts: [["Estudiante", b.s.full_name], ["Documento", b.s.document], ["Grado", gradeNames.get(b.s.grade_level_id) ?? b.s.grade_level_id], ["Curso", course],
          ["Director de grupo", director], ["Puesto en el curso", pos >= 0 ? pos + 1 + " de " + ranked.length : "Sin notas del periodo"]],
        rows: b.rows, avg: b.avg, cum: b.cum, absences: b.absences, attendance: b.attendance, director, course, message: messages.get(b.s.id) ?? null, rector,
      };
      return { id: b.s.id, name: b.s.full_name, course, avg: b.avg, rc: blocked ? "blocked" : generated.has(b.s.id) ? "generated" : "pending", data };
    }),
  };
}

function demoRows(course: string): ReportCardsData {
  return {
    rows: ALL_STUDENTS.filter((s) => s.course === course && s.status !== "retired").map((s) => ({
      id: s.id, name: s.name, course: s.course, avg: s.avg, rc: !(s.library && s.fees && s.documents) ? "blocked" : "pending", data: null, student: s,
    })),
    periods: PERIODS, courses: COURSES.map((c) => ({ id: c, gradeId: c.charAt(0), gradeName: "" })), demo: true,
  };
}

export function useReportCards(ctx: Ctx) {
  return useQuery({
    queryKey: ["report-cards", ctx.course, ctx.period, forcedState()],
    queryFn: () => (DEMO ? demoData(demoRows(ctx.course), { ...demoRows(ctx.course), rows: [] }) : fetchReportCards(ctx)),
    initialData: demoInitial(demoRows(ctx.course)),
    refetchOnWindowFocus: false,
  });
}

/** Datos del boletín de una fila (en demostración, las reglas del sistema). */
export const cardOf = (r: RcRow, period: string): ReportCardData => r.data ?? demoReportCard(r.student!, period);

/** Marca como generados (la base pone quién y cuándo). */
export function useMarkGenerated() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, period }: { ids: string[]; period: string }) => {
      if (DEMO || !ids.length) return;
      const p = await supabase().from("academic_periods").select("id").eq("name", period).limit(1);
      throwIf(p);
      const pid = ((p.data ?? []) as Array<{ id: string }>)[0]?.id;
      const r = await supabase().from("report_cards").upsert(ids.map((id) => ({ student_id: id, period_id: pid, status: "generated" })), { onConflict: "student_id,period_id" });
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["report-cards"] }); },
  });
}

/* ---------- Director de grupo: mensaje del boletín ---------- */

export interface DirectorRow { id: string; name: string; course: string; subjects: Array<{ subject: string; grade: number }>; absences: number; avg: number; text: string; state: "empty" | "ai" | "teacher" | "reviewed" }
export interface DirectorData { period: { id: string; name: string } | null; rows: DirectorRow[] }

/** Borrador del mensaje (regla del sistema; aún sin servicio de IA). Sin notas del periodo no hay borrador. */
export function draftDirectorMessage(r: DirectorRow): string | null {
  if (isNaN(r.avg) || !r.subjects.length) return null;
  const sorted = r.subjects.slice().sort((a, b) => b.grade - a.grade);
  const best = sorted[0], low = sorted[sorted.length - 1], name = r.name.split(" ")[0];
  const open = r.avg >= 4.6 ? name + " cerró el periodo con un desempeño superior que refleja disciplina y gusto por aprender."
    : r.avg >= 4 ? name + " tuvo un periodo muy positivo: es responsable y participa en clase."
      : r.avg >= 3 ? name + " cumplió con los procesos del periodo y muestra disposición para mejorar."
        : name + " atravesó un periodo difícil y necesita nuestro acompañamiento cercano para recuperar el ritmo.";
  const mid = " Se destaca en " + best.subject + " (" + best.grade.toFixed(1) + ")" + (low.grade < 4 && low !== best ? " y debe concentrar su esfuerzo en " + low.subject + " (" + low.grade.toFixed(1) + ")" : "") + ".";
  const att = r.absences >= 3 ? " Le pedimos cuidar la asistencia: registra " + r.absences + " faltas en el periodo." : "";
  const close = r.avg < 3 ? " Invitamos a la familia a una reunión para acordar un plan de mejoramiento." : " Contamos con el apoyo de la familia para seguir creciendo.";
  return open + mid + att + close;
}

/** Grupo que dirige el docente en el periodo abierto (vacío si no dirige ninguno). */
export function useDirectorGroup() {
  const email = useAuth().profile?.email ?? "";
  return useQuery({
    queryKey: ["director-group", email, forcedState()],
    enabled: !DEMO && !!email,
    queryFn: async (): Promise<DirectorData> => {
      const sb = supabase();
      const p = await sb.from("academic_periods").select("id, name").eq("status", "open").limit(1);
      throwIf(p);
      const period = ((p.data ?? []) as Array<{ id: string; name: string }>)[0] ?? null;
      if (!period) return { period: null, rows: [] };
      const r = await sb.rpc("director_overview", { p_period: period.id });
      throwIf(r);
      const rows = ((r.data ?? []) as Array<{ student_id: string; full_name: string; course_id: string; subjects: Array<{ subject: string; grade: number }>; absences: number; message: string | null; message_state: DirectorRow["state"] | null }>).map((x) => {
        const subjects = (x.subjects ?? []).map((s) => ({ subject: s.subject, grade: Number(s.grade) }));
        return { id: x.student_id, name: x.full_name, course: x.course_id, subjects, absences: x.absences, avg: mean(subjects.map((s) => s.grade)), text: x.message ?? "", state: x.message_state ?? "empty" };
      });
      return { period, rows };
    },
  });
}

export function useSaveDirectorMessages() {
  return useMutation({
    mutationFn: async ({ period, rows }: { period: string; rows: Array<{ id: string; text: string; state: string }> }) => {
      if (DEMO || !rows.length) return;
      const r = await supabase().from("director_messages").upsert(rows.map((x) => ({ student_id: x.id, period_id: period, text: x.text, state: x.state })), { onConflict: "student_id,period_id" });
      throwIf(r);
    },
  });
}

