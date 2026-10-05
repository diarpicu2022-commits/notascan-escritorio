import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import writeXlsxFile from "write-excel-file/browser";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";
import { PERF, type ObsType } from "../data/academic";
import type { ReportCell, ReportData, ReportTable } from "../components/organisms/ReportDocument";
import type { Institution } from "./institution";
import { allRows } from "./client";
import type { AnalyticsData } from "./principal";

/*
 * Reportes (paso 6c). Tres tipos del sistema —consolidado por curso, por estudiante y por evaluación— más el informe
 * de Analítica de Rectoría. Solo entran notas verificadas y cada lectura pasa por el RLS de quien genera: el docente
 * obtiene sus materias; Rectoría, todas. Formatos: PDF (impresión), Excel (.xlsx) y CSV.
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const r1 = (v: number) => Math.round(v * 10) / 10;
const avgOf = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const hhmm = (d: Date) => ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
export const stamp = (d = new Date()) => d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear() + ", " + hhmm(d);
const perfOf = (g: number) => (isNaN(g) ? "Sin notas" : PERF(g));

export type ReportKind = ReportData["kind"];
export type ReportFormat = "pdf" | "xlsx" | "csv";
export const FORMAT_LABEL: Record<ReportFormat, string> = { pdf: "PDF", xlsx: "Excel", csv: "CSV" };

export interface Period { id: string; name: string; year: number; position: number; weight: number; status: string }
interface Ctx { school: Institution; me: string }

/* ---------- Alcance: cursos y periodos que puede consultar quien genera ---------- */

export interface ReportScope { periods: Period[]; courses: string[] }

export function useReportScope() {
  const profile = useAuth().profile;
  return useQuery({
    queryKey: ["report-scope", profile?.id],
    enabled: !DEMO && !!profile,
    queryFn: async (): Promise<ReportScope> => {
      const sb = supabase();
      const [p, a, c] = await Promise.all([
        sb.from("academic_periods").select("id, name, year, position, final_weight, status").order("year").order("position"),
        profile!.role === "teacher" ? sb.from("teaching_assignments").select("course_id").eq("teacher_email", profile!.email) : Promise.resolve({ data: [], error: null }),
        profile!.role === "teacher" ? Promise.resolve({ data: [], error: null }) : sb.from("courses").select("id").neq("status", "archived").order("id"),
      ]);
      [p, a, c].forEach(throwIf);
      const courses = profile!.role === "teacher"
        ? [...new Set(((a.data ?? []) as Array<{ course_id: string }>).map((x) => x.course_id))].sort()
        : ((c.data ?? []) as Array<{ id: string }>).map((x) => x.id);
      return {
        periods: ((p.data ?? []) as Array<{ id: string; name: string; year: number; position: number; final_weight: number; status: string }>)
          .map((x) => ({ id: x.id, name: x.name, year: x.year, position: x.position, weight: Number(x.final_weight), status: x.status })),
        courses,
      };
    },
  });
}

/** Estudiantes del curso (para «Por estudiante»). */
export function useCourseStudents(course: string | undefined) {
  return useQuery({
    queryKey: ["report-students", course],
    enabled: !DEMO && !!course,
    queryFn: async () => {
      const r = await supabase().from("students").select("id, full_name").eq("course_id", course!).in("status", ["active", "pending"]).order("full_name");
      throwIf(r);
      return (r.data ?? []) as Array<{ id: string; full_name: string }>;
    },
  });
}

/** Evaluaciones del curso en el periodo que puede ver quien genera (para «Por evaluación»). */
export function useCourseEvaluations(course: string | undefined, periodId: string | undefined) {
  return useQuery({
    queryKey: ["report-evaluations", course, periodId],
    enabled: !DEMO && !!course && !!periodId,
    queryFn: async () => {
      const sb = supabase();
      const a = await sb.from("teaching_assignments").select("id, subject:subjects(name)").eq("course_id", course!).eq("period_id", periodId!);
      throwIf(a);
      const asg = (a.data ?? []) as unknown as Array<{ id: number; subject: { name: string } | null }>;
      if (!asg.length) return [];
      const e = await sb.from("evaluations").select("id, name, assignment_id").in("assignment_id", asg.map((x) => x.id)).order("due_date");
      throwIf(e);
      const subj = new Map(asg.map((x) => [x.id, x.subject?.name ?? ""]));
      return ((e.data ?? []) as Array<{ id: number; name: string; assignment_id: number }>).map((x) => ({ id: x.id, label: subj.get(x.assignment_id) + " · " + x.name }));
    },
  });
}

/* ---------- Datos comunes: notas verificadas por estudiante, periodo y materia ---------- */

interface Asg { id: number; period_id: string; subject_id: string; teacher_email: string }

async function scoresFor(asgs: Asg[], studentFilter?: string) {
  const sb = supabase();
  const ev = asgs.length
    ? await allRows<{ id: number; assignment_id: number; weight: number }>((from, to) => sb.from("evaluations").select("id, assignment_id, weight").in("assignment_id", asgs.map((a) => a.id)).order("id").range(from, to))
    : { data: [], error: null };
  throwIf(ev);
  const gr = ev.data.length
    ? await allRows<{ evaluation_id: number; student_id: string; value: number }>((from, to) => {
      let q = sb.from("grades").select("evaluation_id, student_id, value").eq("status", "verified").in("evaluation_id", ev.data.map((e) => e.id));
      if (studentFilter) q = q.eq("student_id", studentFilter);
      return q.order("id").range(from, to);
    })
    : { data: [], error: null };
  throwIf(gr);
  const evById = new Map(ev.data.map((e) => [e.id, e])), asgById = new Map(asgs.map((a) => [a.id, a]));
  const acc = new Map<string, { s: number; w: number }>();
  gr.data.forEach((g) => {
    const e = evById.get(g.evaluation_id), a = e && asgById.get(e.assignment_id);
    if (!e || !a) return;
    const k = g.student_id + "|" + a.period_id + "|" + a.subject_id, cur = acc.get(k) ?? { s: 0, w: 0 };
    cur.s += Number(g.value) * Number(e.weight); cur.w += Number(e.weight);
    acc.set(k, cur);
  });
  return (student: string, period: string, subject: string) => { const v = acc.get(student + "|" + period + "|" + subject); return v && v.w ? r1(v.s / v.w) : NaN; };
}

async function subjectNames() {
  const r = await supabase().from("subjects").select("id, name");
  throwIf(r);
  return new Map(((r.data ?? []) as Array<{ id: string; name: string }>).map((x) => [x.id, x.name]));
}

const base = (ctx: Ctx, kind: ReportKind, title: string, head: ReportData["head"]): Omit<ReportData, "facts" | "tables" | "notes"> => ({
  kind, title, school: ctx.school, head, generatedBy: ctx.me, generatedAt: stamp(),
});

/* ---------- 1. Consolidado por curso ---------- */

export async function buildCourseReport(ctx: Ctx, course: string, period: Period, teacherOnly: string | null): Promise<ReportData> {
  const sb = supabase();
  let q = sb.from("teaching_assignments").select("id, period_id, subject_id, teacher_email").eq("course_id", course).eq("period_id", period.id);
  if (teacherOnly) q = q.eq("teacher_email", teacherOnly);
  const [a, st, names] = await Promise.all([
    q,
    allRows<{ id: string; full_name: string }>((from, to) => sb.from("students").select("id, full_name").eq("course_id", course).in("status", ["active", "pending"]).order("full_name").order("id").range(from, to)),
    subjectNames(),
  ]);
  [a, st].forEach(throwIf);
  const asgs = (a.data ?? []) as Asg[];
  const score = await scoresFor(asgs);
  const subjects = [...new Set(asgs.map((x) => x.subject_id))].sort((x, y) => (names.get(x) ?? x).localeCompare(names.get(y) ?? y));
  const rows: ReportCell[][] = st.data.map((s) => {
    const vals = subjects.map((sj) => score(s.id, period.id, sj));
    const avg = r1(avgOf(vals.filter((v) => !isNaN(v))));
    return [s.full_name, ...vals, avg, perfOf(avg)];
  });
  const colAvg = subjects.map((_, i) => r1(avgOf(rows.map((r) => r[1 + i] as number).filter((v) => !isNaN(v)))));
  const allAvg = r1(avgOf(rows.map((r) => r[1 + subjects.length] as number).filter((v) => !isNaN(v))));
  const graded = rows.filter((r) => !isNaN(r[1 + subjects.length] as number));
  const failing = graded.filter((r) => subjects.some((_, i) => (r[1 + i] as number) < 3)).length;
  return {
    ...base(ctx, "course", "Consolidado " + course + " · " + period.name, { kind: "Consolidado por curso", period: period.name, year: period.year, note: "Curso " + course }),
    facts: [["Curso", course], ["Periodo", period.name + " · " + period.year], ["Estudiantes", String(st.data.length)], ["Materias", subjects.length ? subjects.map((s) => names.get(s) ?? s).join(", ") : "Ninguna asignada"],
      ["Promedio del curso", isNaN(allAvg) ? "—" : allAvg.toFixed(1)], ["Con alguna materia por debajo de 3.0", graded.length ? failing + " de " + graded.length : "—"]],
    tables: [{
      caption: "Nota del periodo por estudiante y materia",
      columns: [{ label: "Estudiante" }, ...subjects.map((s) => ({ label: names.get(s) ?? s, numeric: true, grade: true })), { label: "Promedio", numeric: true, grade: true }, { label: "Desempeño" }],
      rows, footer: ["Promedio", ...colAvg, allAvg, perfOf(allAvg)],
    }],
    notes: [
      "Nota de cada materia: promedio ponderado (peso de cada evaluación) de las notas verificadas del periodo. Sin nota: aún no hay notas verificadas.",
      ...(teacherOnly ? ["Incluye solo las materias que dicta quien generó el reporte."] : []),
    ],
  };
}

/* ---------- 2. Por estudiante: historial del año y observaciones ---------- */

export async function buildStudentReport(ctx: Ctx, studentId: string, periods: Period[], year: number, teacherOnly: string | null): Promise<ReportData> {
  const sb = supabase();
  const s = await sb.from("students").select("id, full_name, document, course_id").eq("id", studentId).maybeSingle();
  throwIf(s);
  if (!s.data) throw new Error("No encontramos a este estudiante.");
  const st = s.data as { id: string; full_name: string; document: string; course_id: string };
  const ofYear = periods.filter((p) => p.year === year);
  let q = sb.from("teaching_assignments").select("id, period_id, subject_id, teacher_email").eq("course_id", st.course_id).in("period_id", ofYear.map((p) => p.id));
  if (teacherOnly) q = q.eq("teacher_email", teacherOnly);
  const [a, o, names] = await Promise.all([
    q,
    sb.from("observations").select("type, title, context, created_at, author:profiles(full_name)").eq("student_id", studentId).order("created_at", { ascending: false }),
    subjectNames(),
  ]);
  [a, o].forEach(throwIf);
  const asgs = (a.data ?? []) as Asg[];
  const score = await scoresFor(asgs, studentId);
  const subjects = [...new Set(asgs.map((x) => x.subject_id))].sort((x, y) => (names.get(x) ?? x).localeCompare(names.get(y) ?? y));
  const rows: ReportCell[][] = subjects.map((sj) => {
    const vals = ofYear.map((p) => score(studentId, p.id, sj));
    let sum = 0, w = 0;
    vals.forEach((v, i) => { if (!isNaN(v)) { sum += v * ofYear[i].weight; w += ofYear[i].weight; } });
    const cum = w ? r1(sum / w) : NaN;
    return [names.get(sj) ?? sj, ...vals, cum, perfOf(cum)];
  });
  const TYPE: Record<ObsType, string> = { positive: "Positiva", neutral: "Informativa", attention: "Atención" };
  const obs = ((o.data ?? []) as unknown as Array<{ type: ObsType; title: string; context: string | null; created_at: string; author: { full_name: string } | null }>);
  const tables: ReportTable[] = [{
    caption: "Notas por materia y periodo con el acumulado del año",
    columns: [{ label: "Materia" }, ...ofYear.map((_, i) => ({ label: "P" + (i + 1), numeric: true, grade: true })), { label: "Acumulado", numeric: true, grade: true }, { label: "Desempeño" }],
    rows,
  }];
  if (obs.length) tables.push({
    caption: "Observador del estudiante",
    columns: [{ label: "Fecha" }, { label: "Tipo" }, { label: "Anotación" }, { label: "Registró" }],
    rows: obs.map((x) => { const d = new Date(x.created_at); return [d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(), TYPE[x.type], x.title + (x.context ? " · " + x.context : ""), x.author?.full_name ?? ""]; }),
  });
  return {
    ...base(ctx, "student", st.full_name + " · " + year, { kind: "Reporte por estudiante", period: "Año lectivo", year, note: "Curso " + st.course_id }),
    facts: [["Estudiante", st.full_name], ["Documento", st.document], ["Curso", st.course_id], ["Año", String(year)], ["Observaciones", String(obs.length)]],
    tables,
    notes: [
      "Acumulado: promedio de los periodos con nota, ponderado con los pesos que configura Secretaría (" + ofYear.map((p, i) => "P" + (i + 1) + " " + p.weight + "%").join(" · ") + ").",
      ...(teacherOnly ? ["Incluye solo las materias que dicta quien generó el reporte."] : []),
    ],
  };
}

/* ---------- 3. Por evaluación: distribución, confianza de la IA y correcciones ---------- */

const STATUS_LABEL: Record<string, string> = { verified: "Verificada", pending: "Por verificar", "needs-review": "Revisar", "no-detection": "Sin detección" };

export async function buildEvaluationReport(ctx: Ctx, evaluationId: number, periods: Period[]): Promise<ReportData> {
  const sb = supabase();
  const e = await sb.from("evaluations").select("id, name, kind, weight, due_date, status, assignment:teaching_assignments(course_id, period_id, subject:subjects(name))").eq("id", evaluationId).maybeSingle();
  throwIf(e);
  if (!e.data) throw new Error("No encontramos la evaluación.");
  const ev = e.data as unknown as { id: number; name: string; weight: number; due_date: string | null; assignment: { course_id: string; period_id: string; subject: { name: string } | null } | null };
  const g = await allRows<{ student_id: string; detected: number | null; confidence: number | null; value: number | null; status: string; student: { full_name: string } | null }>((from, to) =>
    sb.from("grades").select("student_id, detected, confidence, value, status, student:students(full_name)").eq("evaluation_id", evaluationId).order("id").range(from, to));
  throwIf(g);
  const rows = g.data.slice().sort((x, y) => (x.student?.full_name ?? "").localeCompare(y.student?.full_name ?? ""));
  const verified = rows.filter((x) => x.status === "verified" && x.value !== null).map((x) => Number(x.value));
  const corrected = rows.filter((x) => x.status === "verified" && x.detected !== null && x.value !== null && Number(x.detected) !== Number(x.value)).length;
  const conf = rows.filter((x) => x.confidence !== null).map((x) => Number(x.confidence));
  const band = (lo: number, hi: number) => verified.filter((v) => v >= lo && v <= hi).length;
  const period = periods.find((p) => p.id === ev.assignment?.period_id);
  const subject = ev.assignment?.subject?.name ?? "";
  return {
    ...base(ctx, "evaluation", ev.name + " · " + subject + " " + (ev.assignment?.course_id ?? ""), { kind: "Reporte por evaluación", period: period?.name ?? "", year: period?.year ?? new Date().getFullYear(), note: subject + " · " + (ev.assignment?.course_id ?? "") }),
    facts: [
      ["Evaluación", ev.name], ["Materia y curso", subject + " · " + (ev.assignment?.course_id ?? "")], ["Peso en el periodo", ev.weight + " %"],
      ["Verificadas", verified.length + " de " + rows.length], ["Promedio", verified.length ? r1(avgOf(verified)).toFixed(1) : "—"],
      ["Mínima · máxima", verified.length ? Math.min(...verified).toFixed(1) + " · " + Math.max(...verified).toFixed(1) : "—"],
      ["Confianza promedio de la IA", conf.length ? Math.round(avgOf(conf)) + " %" : "—"], ["Corregidas por el docente", String(corrected)],
    ],
    tables: [
      {
        caption: "Distribución de las notas verificadas por desempeño",
        columns: [{ label: "Desempeño" }, { label: "Rango" }, { label: "Estudiantes", numeric: true }],
        rows: [["Superior", "4.6–5.0", band(4.6, 5)], ["Alto", "4.0–4.5", band(4.0, 4.5)], ["Básico", "3.0–3.9", band(3.0, 3.9)], ["Bajo", "1.0–2.9", band(1.0, 2.9)]],
      },
      {
        caption: "Nota de cada estudiante: lo que leyó la IA y la nota final",
        columns: [{ label: "Estudiante" }, { label: "Leída por la IA", numeric: true, grade: true }, { label: "Confianza", numeric: true }, { label: "Nota final", numeric: true, grade: true }, { label: "Estado" }],
        rows: rows.map((x) => [x.student?.full_name ?? x.student_id, x.detected === null ? null : Number(x.detected), x.confidence === null ? null : x.confidence + " %", x.value === null ? null : Number(x.value), STATUS_LABEL[x.status] ?? x.status]),
      },
    ],
    notes: ["La distribución y el promedio usan solo las notas verificadas. «Corregidas»: la nota final es distinta de la que leyó la IA."],
  };
}

/* ---------- 4. Informe de Analítica (Rectoría) ---------- */

export function buildAnalyticsReport(ctx: Ctx, d: AnalyticsData, goal: number): ReportData {
  return {
    ...base(ctx, "analytics", "Rendimiento institucional · " + d.period, { kind: "Informe de rendimiento", period: d.period, year: d.evol.year, note: "Rectoría" }),
    facts: [
      ["Promedio institucional", d.avg.toFixed(1) + (d.avgDelta === null ? "" : " (" + (d.avgDelta >= 0 ? "+" : "−") + Math.abs(d.avgDelta).toFixed(1) + " frente al periodo anterior)")],
      ["Índice de reprobación", d.failPct + " % · " + d.failCount + " de " + d.students + " estudiantes"],
      ["Tasa de inasistencia", d.absenceRate === null ? "Sin asistencia registrada" : d.absenceRate + " %" + (d.worstAbsence ? " · mayor en " + d.worstAbsence : "")],
      ["Meta institucional", goal.toFixed(1)],
    ],
    tables: [
      { caption: "Promedio por grado frente a la meta", columns: [{ label: "Grado" }, { label: "Promedio", numeric: true, grade: true }, { label: "Frente a la meta" }], rows: d.gradeAvg.map((g) => [g.label, g.value, g.value < goal ? "Por debajo" : "En la meta o por encima"]) },
      { caption: "Evolución del promedio institucional", columns: [{ label: "Periodo" }, { label: String(d.evol.year), numeric: true, grade: true }, ...(d.evol.prev ? [{ label: String(d.evol.prevYear), numeric: true, grade: true }] : [])], rows: d.evol.labels.map((l, i) => [l, d.evol.now[i], ...(d.evol.prev ? [d.evol.prev[i]] : [])]) },
      { caption: "Tasa de inasistencia por grado", columns: [{ label: "Grado" }, { label: "Inasistencia", numeric: true }], rows: d.absence.map((a) => [a.label, a.value + " %"]) },
    ],
    notes: ["Notas verificadas del periodo, con la misma regla del Ranking. Reprobar: alguna materia por debajo de 3.0."],
  };
}

/* ---------- Archivos: Excel y CSV con las mismas tablas del documento ---------- */

const safeName = (t: string) => t.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
const plain = (v: ReportCell) => (v === null || (typeof v === "number" && isNaN(v)) ? "" : v);

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Excel: la ficha arriba y cada tabla con su encabezado en negrita; las notas quedan como números. */
export async function downloadXlsx(d: ReportData) {
  type C = { value?: string | number; fontWeight?: "bold"; type?: StringConstructor | NumberConstructor; format?: string } | null;
  const data: C[][] = [[{ value: d.title, fontWeight: "bold" }], [{ value: d.school.name }]];
  d.facts.forEach(([k, v]) => data.push([{ value: k, fontWeight: "bold" }, { value: v }]));
  d.tables.forEach((t) => {
    data.push([], [{ value: t.caption, fontWeight: "bold" }]);
    data.push(t.columns.map((c) => ({ value: c.label, fontWeight: "bold" })));
    [...t.rows, ...(t.footer ? [t.footer] : [])].forEach((r) => data.push(r.map((v, j) => {
      const x = plain(v);
      // Las notas como número con un decimal («4.0»): se pueden ordenar y promediar en Excel.
      return x === "" ? null : typeof x === "number" ? { value: x, type: Number, ...(t.columns[j]?.grade ? { format: "0.0" } : {}) } : { value: x, type: String };
    })));
  });
  data.push([], ...d.notes.map((n) => [{ value: n }]), [{ value: "Generado por " + d.generatedBy + " el " + d.generatedAt + " con NotaScan." }]);
  const width = Math.max(...data.map((r) => r.length));
  const blob = await writeXlsxFile(data as never, { columns: Array.from({ length: width }, (_, i) => ({ width: i === 0 ? 34 : 16 })), sheet: "Reporte" }).toBlob();
  download(blob, safeName(d.title) + ".xlsx");
}

/** CSV con BOM y punto y coma (Excel en español lo abre con tildes y columnas). */
export function downloadCsv(d: ReportData) {
  const line = (r: Array<string | number>) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";");
  const out: string[] = [line([d.title]), ...d.facts.map(([k, v]) => line([k, v]))];
  const csvCell = (v: ReportCell, grade?: boolean) => { const x = plain(v); return typeof x === "number" && grade ? x.toFixed(1) : x; };
  d.tables.forEach((t) => { out.push("", line([t.caption]), line(t.columns.map((c) => c.label)), ...[...t.rows, ...(t.footer ? [t.footer] : [])].map((r) => line(r.map((v, j) => csvCell(v, t.columns[j]?.grade))))); });
  download(new Blob(["﻿" + out.join("\n")], { type: "text/csv;charset=utf-8" }), safeName(d.title) + ".csv");
}

/* ---------- Historial: se guarda qué se generó; «Descargar» lo vuelve a generar ---------- */

export interface GeneratedReport extends Record<string, unknown> { id: number; kind: ReportKind; format: ReportFormat; title: string; params: Record<string, unknown>; at: string }

export function useReportHistory() {
  const profile = useAuth().profile;
  return useQuery({
    queryKey: ["report-history", profile?.id],
    enabled: !DEMO && !!profile,
    queryFn: async (): Promise<GeneratedReport[]> => {
      const r = await supabase().from("generated_reports").select("id, kind, format, title, params, created_at").order("created_at", { ascending: false }).limit(20);
      throwIf(r);
      return ((r.data ?? []) as Array<{ id: number; kind: ReportKind; format: ReportFormat; title: string; params: Record<string, unknown>; created_at: string }>)
        .map((x) => ({ id: x.id, kind: x.kind, format: x.format, title: x.title, params: x.params, at: stamp(new Date(x.created_at)) }));
    },
  });
}

export function useSaveReportHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { kind: ReportKind; format: ReportFormat; title: string; params: Record<string, unknown> }) => {
      if (DEMO) return;
      const r = await supabase().from("generated_reports").insert(v);
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["report-history"] }); },
  });
}
