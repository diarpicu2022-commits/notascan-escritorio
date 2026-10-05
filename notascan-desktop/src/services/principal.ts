import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import { TEACHERS } from "../data/academic";
import { REQUESTS, type GradeRequest, type RequestStatus, type TeacherState } from "../data/principal";
import { allRows, demoData, demoInitial, forcedState } from "./client";
import { useAcademic, type Academic } from "./enrollment";

/*
 * Rectoría · solicitudes de cambio de nota (paso 6b.4a). La decisión la toma la base (decide_grade_request):
 * solo Rectoría decide, aprobar cambia la nota en la misma transacción y rechazar exige motivo.
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const hhmm = (d: Date) => ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

/** «1 oct 2026, 08:15», como el sistema. */
export function requestDate(iso: string): string {
  const d = new Date(iso);
  return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear() + ", " + hhmm(d);
}
/** «1 oct, 08:15» para el historial. */
export function historyDate(iso: string): string {
  const d = new Date(iso);
  return d.getDate() + " " + MON[d.getMonth()] + ", " + hhmm(d);
}

/** Mensaje para la persona: las reglas de la base se muestran tal cual; lo demás, genérico. */
export function decideMessage(e: unknown): string {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/no indica qué nota|La nota cambió|no está pendiente|Solo Rectoría/.test(m)) return m;
  if (/rejection_needs_reason/.test(m)) return "Escribe el motivo del rechazo.";
  return "No pudimos guardar la decisión. Revisa tu conexión e inténtalo de nuevo.";
}

interface RequestRow {
  id: number; teacher_email: string; course_id: string; from_value: number; to_value: number; reason: string; detail: string | null;
  status: RequestStatus; created_at: string; student: { full_name: string } | null; subject: { name: string } | null;
  events: Array<{ description: string; at: string }> | null;
}

async function fetchRequests(): Promise<GradeRequest[]> {
  const sb = supabase();
  const [r, p] = await Promise.all([
    sb.from("grade_change_requests")
      .select("id, teacher_email, course_id, from_value, to_value, reason, detail, status, created_at, student:students(full_name), subject:subjects(name), events:request_events(description, at)")
      .order("created_at", { ascending: false }),
    // El nombre del docente sale de su perfil: Rectoría no lee el directorio de personal.
    sb.from("profiles").select("email, full_name"),
  ]);
  [r, p].forEach(throwIf);
  const names = new Map(((p.data ?? []) as Array<{ email: string; full_name: string }>).map((x) => [x.email, x.full_name]));
  return ((r.data ?? []) as unknown as RequestRow[]).map((x) => {
    const teacher = names.get(x.teacher_email) ?? x.teacher_email.split("@")[0];
    const events = (x.events ?? []).slice().sort((a, b) => a.at.localeCompare(b.at));
    return {
      id: x.id, teacher, student: x.student?.full_name ?? "", course: x.course_id, subject: x.subject?.name ?? "",
      from: Number(x.from_value), to: Number(x.to_value), reason: x.reason, detail: x.detail ?? "", date: requestDate(x.created_at), status: x.status,
      history: [["Creada por " + teacher, historyDate(x.created_at)] as [string, string]].concat(events.map((e) => [e.description, historyDate(e.at)] as [string, string])),
    };
  });
}

export function useRequests(enabled = true) {
  return useQuery({ queryKey: ["requests", forcedState()], enabled, queryFn: () => (DEMO ? demoData(REQUESTS, []) : fetchRequests()), initialData: demoInitial(REQUESTS) });
}

/** Pendientes para el menú y el panorama. */
export function usePendingCount(enabled = true): number {
  const q = useRequests(enabled);
  return (q.data ?? []).filter((r) => r.status === "pending").length;
}

export function useDecideRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: number; decision: Exclude<RequestStatus, "pending">; note: string }) => {
      if (DEMO) return;
      const r = await supabase().rpc("decide_grade_request", { p_request: v.id, p_decision: v.decision, p_note: v.note.trim() || null });
      throwIf(r);
    },
    // Una nota cambió: las vistas del docente y de los estudiantes se recargan al volver a ellas.
    onSuccess: () => { if (!DEMO) qc.invalidateQueries(); },
  });
}

/* ---------- Analítica institucional (paso 6b.4b) ----------
   Mismo modelo de notas que el Ranking: por estudiante, periodo y materia, el promedio ponderado de sus notas
   verificadas. Reprobar una materia es tenerla por debajo de 3.0. La inasistencia la agrega la base por grado. */

export interface AttendanceRow { grade_level_id: string; records: number; absences: number }

export interface AnalyticsData {
  period: string;
  periods: string[];
  avg: number; avgDelta: number | null;
  failPct: number; failCount: number; failDelta: number | null; students: number;
  absenceRate: number | null; worstAbsence: string | null;
  gradeAvg: Array<{ label: string; value: number }>;
  evol: { labels: string[]; now: number[]; prev: number[] | null; year: number; prevYear: number };
  absence: Array<{ label: string; value: number }>;
}

const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Promedio de cada estudiante en un periodo (media de sus materias) y si reprueba alguna. */
function periodStudents(d: Academic, periodId: string) {
  return d.students.flatMap((s) => {
    const bySubject = d.scores.get(s.id)?.get(periodId);
    if (!bySubject || !bySubject.size) return [];
    const vals = [...bySubject.values()];
    return [{ grade: s.grade, avg: avgOf(vals), fails: vals.some((v) => v < 3) }];
  });
}

export function buildAnalytics(d: Academic, att: AttendanceRow[], periodName?: string): AnalyticsData | null {
  const withData = d.periods.filter((p) => periodStudents(d, p.id).length);
  const open = d.periods.find((p) => p.status === "open");
  const cur = d.periods.find((p) => p.name === periodName && withData.includes(p)) ?? (open && withData.includes(open) ? open : withData[withData.length - 1]);
  if (!cur) return null;
  const rows = periodStudents(d, cur.id);
  const prevP = d.periods.slice(0, d.periods.indexOf(cur)).reverse().find((p) => withData.includes(p));
  const prevRows = prevP ? periodStudents(d, prevP.id) : [];
  const avg = r1(avgOf(rows.map((x) => x.avg)));
  const failCount = rows.filter((x) => x.fails).length;
  const failPct = Math.round((100 * failCount) / rows.length);
  const prevFail = prevRows.length ? Math.round((100 * prevRows.filter((x) => x.fails).length) / prevRows.length) : null;
  const gradeName = new Map(d.courses.map((c) => [c.gradeId, c.gradeName]));
  const gradeIds = [...new Set(d.courses.map((c) => c.gradeId))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  const gradeAvg = gradeIds.flatMap((g) => {
    const xs = rows.filter((x) => x.grade === g).map((x) => x.avg);
    return xs.length ? [{ label: gradeName.get(g) ?? g, value: r1(avgOf(xs)) }] : [];
  });
  const year = cur.year ?? new Date().getFullYear();
  const ofYear = (y: number) => d.periods.filter((p) => (p.year ?? year) === y);
  const series = (y: number) => ofYear(y).map((p) => { const xs = periodStudents(d, p.id).map((x) => x.avg); return xs.length ? r1(avgOf(xs)) : NaN; });
  // La línea muestra los periodos del año que ya tienen notas; el año anterior, solo si tiene los mismos periodos.
  const posOf = (y: number) => ofYear(y).map((p, i) => ({ p, i }));
  const keep = posOf(year).filter(({ p }) => withData.includes(p)).map(({ i }) => i);
  const nowVals = keep.map((i) => series(year)[i]);
  const prevAll = series(year - 1), prevVals = keep.map((i) => prevAll[i] ?? NaN);
  const absence = gradeIds.flatMap((g) => {
    const a = att.find((x) => x.grade_level_id === g);
    return a && a.records ? [{ label: gradeName.get(g) ?? g, value: Math.round((100 * a.absences) / a.records) }] : [];
  });
  const totals = att.reduce((t, x) => ({ r: t.r + x.records, a: t.a + x.absences }), { r: 0, a: 0 });
  const worst = absence.length ? absence.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  return {
    period: cur.name, periods: withData.map((p) => p.name),
    avg, avgDelta: prevRows.length ? r1(avg - r1(avgOf(prevRows.map((x) => x.avg)))) : null,
    failPct, failCount, failDelta: prevFail === null ? null : failPct - prevFail, students: rows.length,
    absenceRate: totals.r ? Math.round((100 * totals.a) / totals.r) : null, worstAbsence: worst && worst.value > 0 ? worst.label : null,
    gradeAvg,
    evol: {
      labels: keep.map((i) => "P" + (i + 1)), now: nowVals,
      prev: prevVals.length && prevVals.every((v) => !isNaN(v)) ? prevVals : null, year, prevYear: year - 1,
    },
    absence,
  };
}

/** Analítica de un periodo (por nombre; sin nombre, el abierto o el último con notas). */
export function useAnalytics(periodName?: string) {
  const academic = useAcademic();
  const d = academic.data;
  const pick = d && !d.demo ? buildAnalytics(d, [], periodName) : null;
  const cur = d?.periods.find((p) => p.name === pick?.period);
  const att = useQuery({
    queryKey: ["attendance-by-grade", cur?.open, cur?.close],
    enabled: !DEMO && !!cur?.open && !!cur?.close,
    queryFn: async (): Promise<AttendanceRow[]> => {
      const r = await supabase().rpc("attendance_by_grade", { p_from: cur!.open, p_to: cur!.close });
      throwIf(r);
      return (r.data ?? []) as AttendanceRow[];
    },
  });
  const data = d && !d.demo ? buildAnalytics(d, att.data ?? [], periodName) : null;
  return { academic, att, data };
}

/* ---------- Seguimiento docente ----------
   Por docente, en el periodo abierto: evaluaciones con fecha cumplida, notas verificadas sobre las esperadas
   (estudiantes activos del curso × evaluaciones vencidas) y la última nota que tocó.
   Verde: 100 %; amarillo: 80 % o más; rojo: menos de 80 % (los mismos cortes de color de la barra del sistema). */

export interface MonitorRow { id: string; name: string; subjects: readonly string[]; courses: readonly string[]; pending: number; pct: number; last: string; status: TeacherState }

const DAY = 86_400_000;
/** «Hoy, 09:20» · «Ayer, 17:10» · «Hace 9 días» · «Sin registros». */
export function lastLabel(iso: string | null, now = new Date()): string {
  if (!iso) return "Sin registros";
  const d = new Date(iso);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= start) return "Hoy, " + hhmm(d);
  if (d.getTime() >= start - DAY) return "Ayer, " + hhmm(d);
  return "Hace " + Math.ceil((start - d.getTime()) / DAY) + " días";
}

async function fetchMonitoring(): Promise<MonitorRow[]> {
  const sb = supabase();
  const p = await sb.from("academic_periods").select("id").eq("status", "open").limit(1);
  throwIf(p);
  const periodId = (p.data as Array<{ id: string }> | null)?.[0]?.id;
  if (!periodId) return [];
  const [a, sd, st] = await Promise.all([
    sb.from("teaching_assignments").select("id, teacher_email, course_id, subject:subjects(name)").eq("period_id", periodId),
    sb.from("staff_directory").select("email, full_name").eq("role", "teacher"),
    allRows<{ course_id: string | null }>((from, to) => sb.from("students").select("course_id").eq("status", "active").order("id").range(from, to)),
  ]);
  [a, sd, st].forEach(throwIf);
  const asg = (a.data ?? []) as unknown as Array<{ id: number; teacher_email: string; course_id: string; subject: { name: string } | null }>;
  if (!asg.length) return [];
  const ev = await allRows<{ id: number; assignment_id: number; due_date: string | null }>((from, to) =>
    sb.from("evaluations").select("id, assignment_id, due_date").in("assignment_id", asg.map((x) => x.id)).order("id").range(from, to));
  throwIf(ev);
  const gr = ev.data.length
    ? await allRows<{ evaluation_id: number; status: string; updated_at: string }>((from, to) =>
      sb.from("grades").select("evaluation_id, status, updated_at").in("evaluation_id", ev.data.map((e) => e.id)).order("id").range(from, to))
    : { data: [] as Array<{ evaluation_id: number; status: string; updated_at: string }>, error: null };
  throwIf(gr);
  const today = new Date().toISOString().slice(0, 10);
  const due = ev.data.filter((e) => e.due_date && e.due_date <= today);
  const size = new Map<string, number>();
  st.data.forEach((x) => { if (x.course_id) size.set(x.course_id, (size.get(x.course_id) ?? 0) + 1); });
  const names = new Map(((sd.data ?? []) as Array<{ email: string; full_name: string }>).map((x) => [x.email, x.full_name]));
  const verified = new Map<number, number>(), touched = new Map<number, string>();
  gr.data.forEach((g) => {
    if (g.status === "verified") verified.set(g.evaluation_id, (verified.get(g.evaluation_id) ?? 0) + 1);
    if (!touched.has(g.evaluation_id) || g.updated_at > touched.get(g.evaluation_id)!) touched.set(g.evaluation_id, g.updated_at);
  });
  const byTeacher = new Map<string, typeof asg>();
  asg.forEach((x) => byTeacher.set(x.teacher_email, [...(byTeacher.get(x.teacher_email) ?? []), x]));
  return [...byTeacher.entries()].map(([email, list]) => {
    const ids = new Set(list.map((x) => x.id));
    const course = new Map(list.map((x) => [x.id, x.course_id]));
    let expected = 0, done = 0, pending = 0;
    due.filter((e) => ids.has(e.assignment_id)).forEach((e) => {
      const n = size.get(course.get(e.assignment_id)!) ?? 0, v = Math.min(verified.get(e.id) ?? 0, n);
      expected += n; done += v;
      if (v < n) pending++;
    });
    const pct = expected ? Math.floor((100 * done) / expected) : 100;
    const lastIso = ev.data.filter((e) => ids.has(e.assignment_id)).map((e) => touched.get(e.id)).filter((x): x is string => !!x).sort().pop() ?? null;
    return {
      id: email, name: names.get(email) ?? email.split("@")[0],
      subjects: [...new Set(list.map((x) => x.subject?.name ?? ""))].filter(Boolean), courses: [...new Set(list.map((x) => x.course_id))].sort(),
      pending, pct, last: lastLabel(lastIso), status: (pct === 100 ? "ok" : pct >= 80 ? "warn" : "late") as TeacherState,
    };
  });
}

export function useMonitoring() {
  const demo = TEACHERS as unknown as MonitorRow[];
  return useQuery({ queryKey: ["monitoring", forcedState()], queryFn: () => (DEMO ? demoData(demo, []) : fetchMonitoring()), initialData: demoInitial(demo) });
}
