import { formatGrade } from "../lib/grade";
import type { IconName } from "../components/atoms/Icon";
import type { ReviewStatus } from "../types/domain";
import { COURSES, seeded, type StudentRecord } from "./students";

/* Datos y reglas académicas simuladas de notascan-ui (sin backend en esta fase).
   Se portan sin cambios para que nombres, notas y textos coincidan con el sistema. */

export const GRADE_NAME: Record<string, string> = { "6": "Sexto", "7": "Séptimo", "8": "Octavo", "9": "Noveno", "10": "Décimo", "11": "Undécimo" };

export const SUBJECTS = [
  { id: "mat", name: "Matemáticas", code: "MAT-01", category: "Ciencias exactas" },
  { id: "fis", name: "Física", code: "FIS-02", category: "Ciencias exactas" },
  { id: "len", name: "Lengua Castellana", code: "LEN-03", category: "Humanidades" },
  { id: "ing", name: "Inglés", code: "ING-04", category: "Humanidades" },
  { id: "cna", name: "Ciencias Naturales", code: "CNA-05", category: "Ciencias naturales" },
  { id: "tec", name: "Tecnología", code: "TEC-06", category: "Tecnología e informática" },
];

export const TEACHERS = [
  { id: "t1", name: "Ana Lucía Rosero", subjects: ["Matemáticas"], courses: ["6A", "7A", "7B"], pending: 0, pct: 100, last: "Hoy, 08:42", status: "ok" },
  { id: "t2", name: "Carlos Pérez", subjects: ["Física"], courses: ["7A", "8A", "8B"], pending: 2, pct: 82, last: "Ayer, 17:10", status: "warn" },
  { id: "t3", name: "Laura Benavides", subjects: ["Lengua Castellana"], courses: ["6A", "6B"], pending: 0, pct: 100, last: "Hoy, 07:55", status: "ok" },
  { id: "t4", name: "Jorge Insuasty", subjects: ["Inglés"], courses: ["6B", "7B", "8B"], pending: 5, pct: 48, last: "Hace 9 días", status: "late" },
  { id: "t5", name: "Diana Cabrera", subjects: ["Ciencias Naturales"], courses: ["6A", "6B", "7A"], pending: 1, pct: 91, last: "Hoy, 09:20", status: "warn" },
  { id: "t6", name: "Mauricio Ordóñez", subjects: ["Tecnología"], courses: ["8A", "8B"], pending: 0, pct: 100, last: "Ayer, 15:02", status: "ok" },
] as const;

/* ---------- Docente: lista corta y evaluaciones del periodo ---------- */
export interface TeacherStudent { name: string; id: string; course: string; avg: number; status: ReviewStatus; last: string }

export const STUDENTS: TeacherStudent[] = ([
  ["María Fernanda López", "20261045", "7A", 4.5, "verified", "Parcial 2"],
  ["Juan Sebastián Martínez", "20261051", "7A", 3.8, "needs-review", "Parcial 2"],
  ["Valentina Guerrero", "20261063", "7A", 4.2, "pending", "Parcial 2"],
  ["Carlos Andrés Rodríguez", "20261070", "7A", 2.9, "pending", "Taller 3"],
  ["Laura Camila Benavides", "20261078", "7A", 4.8, "verified", "Parcial 2"],
  ["Santiago Muñoz", "20261082", "7A", NaN, "needs-review", "Parcial 2"],
  ["Daniela Alejandra Pantoja", "20261089", "7B", 3.5, "verified", "Taller 3"],
  ["Andrés Felipe Erazo", "20261094", "7B", 4.0, "verified", "Quiz 4"],
  ["Isabella Chamorro", "20261101", "7B", 1.9, "needs-review", "Quiz 4"],
  ["Sebastián Delgado", "20261107", "7B", 3.2, "pending", "Taller 3"],
] as const).map((r) => ({ name: r[0], id: r[1], course: r[2], avg: r[3], status: r[4], last: r[5] }));

export type EvalKind = "examen" | "taller" | "actividad";
export type EvalStatus = "en-revision" | "cerrada" | "borrador";
export interface EvaluationItem { id: string; name: string; subject: string; kind: EvalKind; weight: number; status: EvalStatus; reviewed: number; total: number; date: string }

export const EVALUATIONS: EvaluationItem[] = [
  { id: "e1", name: "Parcial 2", subject: "Matemáticas", kind: "examen", weight: 25, status: "en-revision", reviewed: 18, total: 24, date: "28 sep" },
  { id: "e2", name: "Taller 3 · Ecuaciones", subject: "Matemáticas", kind: "taller", weight: 15, status: "cerrada", reviewed: 24, total: 24, date: "21 sep" },
  { id: "e3", name: "Quiz 4", subject: "Matemáticas", kind: "actividad", weight: 10, status: "en-revision", reviewed: 9, total: 24, date: "30 sep" },
  { id: "e4", name: "Parcial 1", subject: "Matemáticas", kind: "examen", weight: 25, status: "cerrada", reviewed: 24, total: 24, date: "31 ago" },
  { id: "e5", name: "Proyecto final", subject: "Matemáticas", kind: "taller", weight: 15, status: "borrador", reviewed: 0, total: 24, date: "25 nov" },
  { id: "e6", name: "Examen final", subject: "Matemáticas", kind: "examen", weight: 10, status: "borrador", reviewed: 0, total: 24, date: "2 dic" },
];
export const EVAL_STATUS: Record<EvalStatus, [string, "pending" | "verified" | "neutral"]> = { "en-revision": ["En revisión", "pending"], cerrada: ["Cerrada", "verified"], borrador: ["Borrador", "neutral"] };
export const KIND: Record<EvalKind, [string, "navy" | "gold" | "sage"]> = { examen: ["Examen", "navy"], taller: ["Taller", "gold"], actividad: ["Actividad", "sage"] };

/* ---------- Boletines y conceptos ---------- */
export type Perf = "Superior" | "Alto" | "Básico" | "Bajo";
export const PERF = (g: number): Perf => (g >= 4.6 ? "Superior" : g >= 4.0 ? "Alto" : g >= 3.0 ? "Básico" : "Bajo");

const SUBJECT_GOAL: Record<string, string> = {
  "Matemáticas": "resuelve problemas con ecuaciones lineales, proporcionalidad y porcentajes",
  "Física": "explica el movimiento rectilíneo y aplica las leyes de Newton en situaciones cotidianas",
  "Lengua Castellana": "comprende, interpreta y produce textos narrativos y argumentativos",
  "Inglés": "se comunica en situaciones cotidianas usando el presente y el pasado simple",
  "Ciencias Naturales": "explica la estructura de la célula y los procesos de nutrición en los seres vivos",
  "Tecnología": "diseña soluciones sencillas con algoritmos y herramientas digitales",
};

/** Borrador del concepto del periodo (lo que «sugiere la IA»): siempre lo revisa el docente. */
export function conceptFor(subject: string, grade: number, absences: number, prev?: number): string {
  const c = SUBJECT_GOAL[subject] || "alcanza los logros propuestos para el periodo";
  const p = PERF(grade), v = (subject.length + Math.round(grade * 10)) % 3;
  const NEXT: Record<Perf, string[]> = {
    Superior: ["Demuestra autonomía, argumenta sus procesos y apoya el aprendizaje de sus compañeros.", "Sus trabajos son rigurosos y creativos; se le invita a asumir retos de profundización.", "Participa con criterio y lidera el trabajo en equipo de manera ejemplar."],
    Alto: ["Cumple con sus compromisos; puede profundizar en la presentación ordenada de sus procedimientos.", "Participa activamente; le falta precisión en algunos ejercicios de mayor complejidad.", "Su desempeño es constante; se recomienda revisar con más cuidado antes de entregar."],
    "Básico": ["Debe reforzar la práctica diaria y la entrega puntual de talleres para consolidar lo aprendido.", "Comprende lo esencial, pero necesita más práctica autónoma y preguntar sus dudas a tiempo.", "Se sugiere repasar los temas del periodo y aprovechar las tutorías de la tarde."],
    Bajo: ["Se recomienda plan de mejoramiento, asistencia a las tutorías y acompañamiento en casa.", "Presenta vacíos en los temas base; debe realizar las actividades de recuperación programadas.", "Requiere compromiso con la entrega de trabajos y acompañamiento cercano de la familia."],
  };
  const OPEN: Record<Perf, string> = { Superior: "Alcanza de manera sobresaliente el logro: ", Alto: "Alcanza satisfactoriamente el logro: ", "Básico": "Alcanza el logro mínimo: ", Bajo: "Aún no alcanza el logro: " };
  let t = OPEN[p] + c + ". " + NEXT[p][v];
  if (prev !== undefined && !isNaN(prev)) {
    const d = Math.round((grade - prev) * 10) / 10;
    if (d >= 0.3) t += " Mejoró " + formatGrade(d) + " frente al periodo anterior.";
    else if (d <= -0.3) t += " Bajó " + formatGrade(-d) + " frente al periodo anterior; conviene revisar sus causas.";
  }
  if (absences >= 2) t += " Registra " + absences + " faltas en el periodo.";
  return t;
}

/** Periodos del año: los configura Secretaría. Peso de cada periodo en la nota final. */
export const PERIOD_SETUP = { names: ["Periodo 1", "Periodo 2", "Periodo 3", "Periodo 4"], weights: [25, 25, 25, 25] };

export function periodIndex(p?: string): number {
  const n = parseInt(String(p || "Periodo 3").replace(/\D/g, ""), 10);
  return isNaN(n) ? 3 : Math.max(1, Math.min(PERIOD_SETUP.names.length, n));
}

export function cumulative(vals: number[]): number {
  let sw = 0, sum = 0;
  vals.forEach((v, i) => { const w = PERIOD_SETUP.weights[i] || 0; sum += v * w; sw += w; });
  return sw ? Math.round((sum / sw) * 10) / 10 : NaN;
}

export interface SubjectGrade { subject: string; grade: number; periods: number[]; cumulative: number; p1: number; p2: number; absences: number; teacher: string; concept: string }

export function subjectGrades(s: StudentRecord, period?: string): SubjectGrade[] {
  const N = periodIndex(period || "Periodo 3");
  const clamp = (x: number) => Math.max(1.5, Math.min(5, Math.round(x * 10) / 10));
  return SUBJECTS.map((sub, i) => {
    const id = Number(s.id);
    const g3 = clamp(s.avg + (seeded(id + i) - 0.5) * 1.2);
    const all = [
      clamp(g3 + (seeded(id * 7 + i) - 0.6) * 0.8),
      clamp(g3 + (seeded(id * 13 + i) - 0.55) * 0.6),
      g3,
      clamp(g3 + (seeded(id * 19 + i) - 0.4) * 0.6),
    ];
    const periods = all.slice(0, N), g = periods[N - 1], prev = N > 1 ? periods[N - 2] : undefined;
    const abs = Math.round(seeded(id * 3 + i + N) * 3);
    const teacher = (TEACHERS.find((t) => t.subjects[0] === sub.name) || TEACHERS[0]).name;
    return { subject: sub.name, grade: g, periods, cumulative: cumulative(periods), p1: all[0], p2: all[1], absences: abs, teacher, concept: conceptFor(sub.name, g, abs, prev) };
  });
}

export function directorMessage(s: StudentRecord, rows: SubjectGrade[], avg: number): string {
  const sorted = rows.slice().sort((a, b) => b.grade - a.grade);
  const best = sorted[0], low = sorted[sorted.length - 1], name = s.first.split(" ")[0];
  const open = avg >= 4.6 ? name + " cerró el periodo con un desempeño superior que refleja disciplina y gusto por aprender."
    : avg >= 4 ? name + " tuvo un periodo muy positivo: es responsable, participa en clase y mantiene buenas relaciones con sus compañeros."
      : avg >= 3 ? name + " cumplió con los procesos del periodo y muestra disposición para mejorar."
        : name + " atravesó un periodo difícil y necesita nuestro acompañamiento cercano para recuperar el ritmo.";
  const mid = " Se destaca en " + best.subject + " (" + formatGrade(best.grade) + ")" + (low.grade < 4 ? " y debe concentrar su esfuerzo en " + low.subject + " (" + formatGrade(low.grade) + ")" : "") + ".";
  const att = s.attendance >= 95 ? " Su asistencia es ejemplar." : " Le pedimos cuidar la asistencia y la puntualidad.";
  const close = avg < 3 ? " Invitamos a la familia a una reunión para acordar un plan de mejoramiento." : " Contamos con el apoyo de la familia para seguir creciendo en el próximo periodo.";
  return open + mid + att + close;
}

export function directorOf(s: StudentRecord): string {
  return TEACHERS[COURSES.indexOf(s.course) % TEACHERS.length].name;
}

/* ---------- Observador ---------- */
export type ObsType = "positive" | "neutral" | "attention";
export interface ObservationItem { date: string; type: ObsType; title: string; context: string; by: string; student: string; course: string }

export const OBS: ObservationItem[] = [
  { date: "28 de septiembre", type: "positive", title: "Participación destacada", context: "Matemáticas", by: "Ana Lucía Rosero", student: "María Fernanda López Rosero", course: "7A" },
  { date: "24 de septiembre", type: "neutral", title: "Inasistencia justificada", context: "Cita médica · excusa entregada", by: "Coordinación", student: "María Fernanda López Rosero", course: "7A" },
  { date: "22 de septiembre", type: "attention", title: "Llamado de atención", context: "Llegó tarde a clase", by: "Carlos Pérez", student: "María Fernanda López Rosero", course: "7A" },
  { date: "18 de septiembre", type: "positive", title: "Excelente trabajo grupal", context: "Proyecto de ciencias", by: "Diana Cabrera", student: "María Fernanda López Rosero", course: "7A" },
  { date: "11 de septiembre", type: "attention", title: "Tarea sin entregar", context: "Inglés · taller 3", by: "Jorge Insuasty", student: "Juan Sebastián Martínez Paz", course: "7A" },
  { date: "5 de septiembre", type: "positive", title: "Representó al colegio", context: "Olimpiadas de matemáticas", by: "Rectoría", student: "Juan Sebastián Martínez Paz", course: "7A" },
];
export const OBS_TYPE: Record<ObsType, [string, IconName, string]> = { positive: ["Positiva", "check", "sage"], neutral: ["Informativa", "file", "navy"], attention: ["Atención", "warning", "burgundy"] };
