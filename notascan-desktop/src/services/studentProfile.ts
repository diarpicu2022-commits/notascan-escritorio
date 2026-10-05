import { useQuery } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import type { ObsType, ObservationItem } from "../data/academic";
import type { StudentRecord } from "../data/students";
import { allRows, forcedState } from "./client";
import { toRecord, type OverviewRow } from "./students";
import { longDate } from "./teacher";

/*
 * Perfil del estudiante con datos reales (paso 6b.4c). Cada lectura pasa por el RLS de quien consulta: el docente
 * solo ve sus estudiantes y las notas de sus evaluaciones; los datos del acudiente y de salud, solo Secretaría y Rectoría.
 * Las notas siguen la regla del Ranking: por materia y periodo, promedio ponderado de las notas verificadas.
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const r1 = (v: number) => Math.round(v * 10) / 10;
const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export type DayState = "present" | "absent" | "late" | "excused";

export interface ProfileData {
  student: StudentRecord;
  /** Periodo abierto (o el último del año si no hay abierto). */
  period: { name: string; year: number } | null;
  /** Promedio del periodo y materias aprobadas sobre las que tienen nota. */
  avg: number; passed: number; graded: number;
  /** Promedio por periodo del año, solo los que tienen notas. */
  evol: Array<{ label: string; value: number }>;
  /** Materias del curso en el periodo, con su docente y nota (NaN sin notas verificadas). */
  subjects: Array<{ subject: string; teacher: string; grade: number }>;
  /** Mes de asistencia que se muestra (el del último registro) y el estado de cada día con registro. */
  month: { year: number; month: number; days: Record<number, DayState> } | null;
  observations: ObservationItem[];
  medical: { allergies: string; conditions: string; notes: string; emergency: string } | null;
}

async function fetchProfile(id: string): Promise<ProfileData | null> {
  const sb = supabase();
  const ov = await sb.from("student_overview").select("*").eq("id", id).maybeSingle();
  throwIf(ov);
  if (!ov.data) return null;
  const student = toRecord(ov.data as OverviewRow);
  const [pq, aq, sq, sdq, pfq, gq, atq, oq, mq] = await Promise.all([
    sb.from("academic_periods").select("id, name, status, year, position").order("year").order("position"),
    sb.from("teaching_assignments").select("id, period_id, subject_id, teacher_email").eq("course_id", student.course),
    sb.from("subjects").select("id, name"),
    // Nombres: el directorio (Secretaría y Rectoría) y, si no se puede leer, los perfiles con cuenta.
    sb.from("staff_directory").select("email, full_name"),
    sb.from("profiles").select("email, full_name"),
    allRows<{ evaluation_id: number; value: number }>((from, to) => sb.from("grades").select("evaluation_id, value").eq("student_id", id).eq("status", "verified").order("id").range(from, to)),
    allRows<{ class_date: string; state: DayState }>((from, to) => sb.from("attendance").select("class_date, state").eq("student_id", id).order("id").range(from, to)),
    sb.from("observations").select("id, type, title, context, created_at, author:profiles(full_name)").eq("student_id", id).order("created_at", { ascending: false }),
    sb.from("student_medical").select("allergies, conditions, notes, emergency_contact, emergency_phone").eq("student_id", id).maybeSingle(),
  ]);
  [pq, aq, sq, gq, atq, oq].forEach(throwIf);
  const periods = (pq.data ?? []) as Array<{ id: string; name: string; status: string; year: number }>;
  const asg = (aq.data ?? []) as Array<{ id: number; period_id: string; subject_id: string; teacher_email: string }>;
  const subjName = new Map(((sq.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
  const names = new Map<string, string>();
  for (const q of [pfq, sdq]) if (!q.error) ((q.data ?? []) as Array<{ email: string; full_name: string }>).forEach((x) => names.set(x.email, x.full_name));

  const ev = asg.length
    ? await allRows<{ id: number; assignment_id: number; weight: number }>((from, to) => sb.from("evaluations").select("id, assignment_id, weight").in("assignment_id", asg.map((a) => a.id)).order("id").range(from, to))
    : { data: [], error: null };
  throwIf(ev);
  const evById = new Map(ev.data.map((e) => [e.id, e]));
  const asgById = new Map(asg.map((a) => [a.id, a]));
  // Nota por periodo y materia.
  const acc = new Map<string, { s: number; w: number }>();
  gq.data.forEach((g) => {
    const e = evById.get(g.evaluation_id), a = e && asgById.get(e.assignment_id);
    if (!e || !a) return;
    const k = a.period_id + "|" + a.subject_id, cur = acc.get(k) ?? { s: 0, w: 0 };
    cur.s += Number(g.value) * Number(e.weight); cur.w += Number(e.weight);
    acc.set(k, cur);
  });
  const score = (pid: string, sid: string) => { const v = acc.get(pid + "|" + sid); return v && v.w ? r1(v.s / v.w) : NaN; };
  const periodAvg = (pid: string) => avgOf(asg.filter((a) => a.period_id === pid).map((a) => score(pid, a.subject_id)).filter((v) => !isNaN(v)));

  const cur = periods.find((p) => p.status === "open") ?? periods.filter((p) => periodAvg(p.id) >= 0).pop() ?? periods[periods.length - 1];
  const subjects = cur
    ? asg.filter((a) => a.period_id === cur.id)
      .map((a) => ({ subject: subjName.get(a.subject_id) ?? a.subject_id, teacher: names.get(a.teacher_email) ?? a.teacher_email.split("@")[0], grade: score(cur.id, a.subject_id) }))
      .sort((x, y) => x.subject.localeCompare(y.subject))
    : [];
  const graded = subjects.filter((x) => !isNaN(x.grade));
  const year = cur?.year;
  const evol = periods.filter((p) => p.year === year)
    .map((p, i) => ({ label: "P" + (i + 1), value: periodAvg(p.id) }))
    .filter((x) => !isNaN(x.value)).map((x) => ({ ...x, value: r1(x.value) }));

  let month: ProfileData["month"] = null;
  if (atq.data.length) {
    const last = atq.data.map((x) => x.class_date).sort().pop()!;
    const [yy, mm] = last.split("-").map(Number);
    const days: Record<number, DayState> = {};
    atq.data.filter((x) => x.class_date.startsWith(last.slice(0, 7))).forEach((x) => {
      const d = Number(x.class_date.slice(8, 10));
      // Con varias clases el mismo día, manda la más grave: inasistencia > tarde > excusa > presente.
      const rank: Record<DayState, number> = { absent: 3, late: 2, excused: 1, present: 0 };
      if (!days[d] || rank[x.state] > rank[days[d]]) days[d] = x.state;
    });
    month = { year: yy, month: mm - 1, days };
  }

  const med = mq.error ? null : (mq.data as { allergies: string | null; conditions: string | null; notes: string | null; emergency_contact: string | null; emergency_phone: string | null } | null);
  return {
    student, period: cur ? { name: cur.name, year: cur.year } : null,
    avg: r1(avgOf(graded.map((x) => x.grade))), passed: graded.filter((x) => x.grade >= 3).length, graded: graded.length,
    evol, subjects, month,
    observations: ((oq.data ?? []) as unknown as Array<{ type: ObsType; title: string; context: string | null; created_at: string; author: { full_name: string } | null }>).map((o) => ({
      date: longDate(o.created_at), type: o.type, title: o.title, context: o.context ?? "", by: o.author?.full_name ?? "", student: student.name, course: student.course,
    })),
    medical: med ? {
      allergies: med.allergies ?? "", conditions: med.conditions ?? "", notes: med.notes ?? "",
      emergency: [med.emergency_contact, med.emergency_phone].filter(Boolean).join(" · "),
    } : null,
  };
}

/** Perfil con datos de la base (en demostración no se usa: la página pinta el del sistema). */
export function useStudentProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["student-profile", id, forcedState()],
    enabled: !DEMO && !!id,
    queryFn: () => fetchProfile(id!),
  });
}
