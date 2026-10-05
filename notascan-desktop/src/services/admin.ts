import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import { GRADE_NAME, PERIOD_SETUP, SUBJECTS, TEACHERS } from "../data/academic";
import { INITIAL_ASSIGN, PERIODS, USERS, type Assignment, type DirectoryUser, type UserRole, type UserStatus } from "../data/admin";
import { ALL_STUDENTS, COURSES } from "../data/students";
import { demoData, demoInitial, forcedState, allRows } from "./client";

/*
 * Secretaría · configuración (paso 6b.3a): estructura académica, malla curricular, periodos y usuarios.
 * Escribe solo Secretaría (RLS); las reglas que no pueden depender del cliente están en la base
 * (asignación con evaluaciones, un solo periodo abierto, periodo que suma 100 %).
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const msgOf = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "");
const codeOf = (e: unknown) => (e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "");

/** Mensaje para la persona: las reglas de la base se muestran tal cual; lo demás, genérico. */
export function adminMessage(e: unknown): string {
  const m = msgOf(e);
  if (/Cambia el docente|Solo Secretaría|debe sumar 100|no existe/.test(m)) return m;
  if (/academic_periods_one_open/.test(m)) return "Ya hay un periodo abierto. Ciérralo antes de abrir otro.";
  if (codeOf(e) === "23505") return "Ya existe un registro con ese nombre o código.";
  return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
}

/* ---------- Estructura académica ---------- */

export type StructureKind = "grades" | "courses" | "subjects";
export type StructureItem = { id: string; name: string; status: string; level?: string; courses?: number; grade?: string; gradeId?: string; director?: string; directorEmail?: string; capacity?: number; students?: number; code?: string; category?: string };
export interface Person { email: string; name: string }
export interface StructureData { grades: StructureItem[]; courses: StructureItem[]; subjects: StructureItem[]; teachers: Person[] }

const DEMO_STRUCTURE: StructureData = {
  grades: ["6", "7", "8", "9", "10", "11"].map((g, i) => ({ id: g, name: GRADE_NAME[g], level: i < 4 ? "Básica secundaria" : "Media", courses: i < 3 ? 2 : 0, status: i < 3 ? "active" : "draft" })),
  courses: COURSES.map((c, i) => ({ id: c, grade: GRADE_NAME[c.charAt(0)], name: c, director: TEACHERS[i % TEACHERS.length].name, students: ALL_STUDENTS.filter((s) => s.course === c && s.status !== "retired").length, status: "active" })),
  subjects: [...SUBJECTS.map((s) => ({ status: "active", ...s })), { id: "is", name: "Ingeniería de Software", code: "ISW-07", category: "Tecnología e informática", status: "archived" }],
  teachers: TEACHERS.map((t) => ({ email: "", name: t.name })),
};
const EMPTY_STRUCTURE: StructureData = { grades: [], courses: [], subjects: [], teachers: [] };

async function fetchStructure(): Promise<StructureData> {
  const sb = supabase();
  const [g, c, s, st, t] = await Promise.all([
    sb.from("grade_levels").select("id, name, level, status").order("id"),
    sb.from("courses").select("id, grade_level_id, name, director_email, capacity, status").order("id"),
    sb.from("subjects").select("id, name, code, category, status").order("name"),
    allRows((from, to) => sb.from("students").select("course_id, status").order("id").range(from, to)),
    sb.from("staff_directory").select("email, full_name, role").eq("role", "teacher").order("full_name"),
  ]);
  [g, c, s, st, t].forEach(throwIf);
  const teachers = ((t.data ?? []) as Array<{ email: string; full_name: string }>).map((x) => ({ email: x.email, name: x.full_name }));
  const gradeRows = (g.data ?? []) as Array<{ id: string; name: string; level: string; status: string }>;
  const courseRows = (c.data ?? []) as Array<{ id: string; grade_level_id: string; name: string; director_email: string | null; capacity: number; status: string }>;
  const studentRows = (st.data ?? []) as Array<{ course_id: string | null; status: string }>;
  return {
    grades: gradeRows.sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id)).map((x) => ({
      id: x.id, name: x.name, level: x.level, status: x.status, courses: courseRows.filter((k) => k.grade_level_id === x.id && k.status !== "archived").length,
    })),
    courses: courseRows.map((x) => ({
      id: x.id, name: x.name, gradeId: x.grade_level_id, grade: gradeRows.find((k) => k.id === x.grade_level_id)?.name ?? x.grade_level_id,
      directorEmail: x.director_email ?? "", director: teachers.find((k) => k.email === x.director_email)?.name ?? "", capacity: x.capacity, status: x.status,
      students: studentRows.filter((k) => k.course_id === x.id && k.status !== "retired" && k.status !== "archived").length,
    })),
    subjects: ((s.data ?? []) as Array<{ id: string; name: string; code: string; category: string; status: string }>).map((x) => ({ ...x })),
    teachers,
  };
}

export function useStructure() {
  return useQuery({ queryKey: ["structure", forcedState()], queryFn: () => (DEMO ? demoData(DEMO_STRUCTURE, EMPTY_STRUCTURE) : fetchStructure()), initialData: demoInitial(DEMO_STRUCTURE) });
}

const ORDINAL: Record<string, string> = { primero: "1", segundo: "2", tercero: "3", cuarto: "4", quinto: "5", sexto: "6", "séptimo": "7", octavo: "8", noveno: "9", "décimo": "10", "undécimo": "11", "duodécimo": "12" };
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Crear o editar un grado, curso o materia. Un curso nuevo deja su grado como activo. */
export function useSaveStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, item, isNew, data }: { kind: StructureKind; item: StructureItem; isNew: boolean; data: StructureData }) => {
      if (DEMO) return;
      const sb = supabase();
      if (kind === "grades") {
        const row = { name: item.name.trim(), level: item.level || "Básica secundaria" };
        const r = isNew ? await sb.from("grade_levels").insert({ id: ORDINAL[item.name.trim().toLowerCase()] ?? slug(item.name), status: "draft", ...row }) : await sb.from("grade_levels").update(row).eq("id", item.id);
        throwIf(r);
      } else if (kind === "courses") {
        const gradeId = data.grades.find((g) => g.name === item.grade)?.id ?? item.gradeId;
        const director = data.teachers.find((t) => t.name === item.director)?.email || null;
        const row = { grade_level_id: gradeId, name: item.name.trim(), director_email: director, capacity: item.capacity || 35 };
        const r = isNew ? await sb.from("courses").insert({ id: item.name.trim().toUpperCase(), status: "active", ...row }) : await sb.from("courses").update(row).eq("id", item.id);
        throwIf(r);
        const g = await sb.from("grade_levels").update({ status: "active" }).eq("id", gradeId).eq("status", "draft");
        throwIf(g);
      } else {
        const row = { name: item.name.trim(), code: (item.code || "").trim().toUpperCase(), category: item.category || "Ciencias exactas" };
        const r = isNew ? await sb.from("subjects").insert({ id: slug(item.name).slice(0, 12), status: "active", ...row }) : await sb.from("subjects").update(row).eq("id", item.id);
        throwIf(r);
      }
    },
    onSuccess: () => { if (!DEMO) { qc.invalidateQueries({ queryKey: ["structure"] }); qc.invalidateQueries({ queryKey: ["curriculum"] }); } },
  });
}

const TABLE: Record<StructureKind, string> = { grades: "grade_levels", courses: "courses", subjects: "subjects" };

/** Archivar: deja de aparecer en asignaciones y matrículas; el historial se conserva. */
export function useArchiveStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, id }: { kind: StructureKind; id: string }) => {
      if (DEMO) return;
      const r = await supabase().from(TABLE[kind]).update({ status: "archived" }).eq("id", id);
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) { qc.invalidateQueries({ queryKey: ["structure"] }); qc.invalidateQueries({ queryKey: ["curriculum"] }); } },
  });
}

/* ---------- Malla curricular ---------- */

export interface CurriculumData {
  list: Assignment[];
  teachers: Person[];
  subjects: Array<{ id: string; name: string }>;
  courses: string[];
  periods: Array<{ id: string; name: string; status?: string }>;
  /** Periodo que se muestra al entrar (el abierto). */
  current: string;
}

const DEMO_CURRICULUM: CurriculumData = {
  list: INITIAL_ASSIGN, teachers: TEACHERS.map((t) => ({ email: "", name: t.name })), subjects: SUBJECTS.map((s) => ({ id: s.id, name: s.name })),
  courses: COURSES, periods: PERIODS.map((p) => ({ id: p, name: p })), current: "Periodo 3",
};
const EMPTY_CURRICULUM: CurriculumData = { ...DEMO_CURRICULUM, list: [], subjects: [], courses: [] };

async function fetchCurriculum(): Promise<CurriculumData> {
  const sb = supabase();
  const [a, t, s, c, p] = await Promise.all([
    sb.from("teaching_assignments").select("id, teacher_email, subject_id, course_id, period_id"),
    sb.from("staff_directory").select("email, full_name").eq("role", "teacher").order("full_name"),
    sb.from("subjects").select("id, name").neq("status", "archived").order("name"),
    sb.from("courses").select("id").neq("status", "archived").order("id"),
    sb.from("academic_periods").select("id, name, status, position").order("year").order("position"),
  ]);
  [a, t, s, c, p].forEach(throwIf);
  const teachers = ((t.data ?? []) as Array<{ email: string; full_name: string }>).map((x) => ({ email: x.email, name: x.full_name }));
  const subjects = (s.data ?? []) as Array<{ id: string; name: string }>;
  const periods = (p.data ?? []) as Array<{ id: string; name: string; status: string }>;
  const list = ((a.data ?? []) as Array<{ id: number; teacher_email: string; subject_id: string; course_id: string; period_id: string }>).map((x) => ({
    id: String(x.id), teacher: teachers.find((k) => k.email === x.teacher_email)?.name ?? x.teacher_email,
    subject: subjects.find((k) => k.id === x.subject_id)?.name ?? x.subject_id, course: x.course_id, period: periods.find((k) => k.id === x.period_id)?.name ?? x.period_id,
  }));
  return { list, teachers, subjects, courses: ((c.data ?? []) as Array<{ id: string }>).map((x) => x.id), periods, current: periods.find((x) => x.status === "open")?.name ?? periods[0]?.name ?? "" };
}

export function useCurriculum() {
  return useQuery({ queryKey: ["curriculum", forcedState()], queryFn: () => (DEMO ? demoData(DEMO_CURRICULUM, EMPTY_CURRICULUM) : fetchCurriculum()), initialData: demoInitial(DEMO_CURRICULUM) });
}

/** Asignar o editar (cambiar el docente conserva evaluaciones y notas de la asignación). */
export function useSaveAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, v, data }: { id: string | null; v: Omit<Assignment, "id">; data: CurriculumData }) => {
      if (DEMO) return;
      const row = {
        teacher_email: data.teachers.find((t) => t.name === v.teacher)?.email, subject_id: data.subjects.find((s) => s.name === v.subject)?.id,
        course_id: v.course, period_id: data.periods.find((p) => p.name === v.period)?.id,
      };
      const r = id ? await supabase().from("teaching_assignments").update(row).eq("id", Number(id)) : await supabase().from("teaching_assignments").insert(row);
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["curriculum"] }); },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (DEMO) return;
      const r = await supabase().from("teaching_assignments").delete().eq("id", Number(id));
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["curriculum"] }); },
  });
}

/* ---------- Periodos ---------- */

export type PeriodStatus = "closed" | "open" | "draft";
export interface WeightItem { name: string; weight: number }
export interface Period { id: string; name: string; open: string; close: string; status: PeriodStatus; items: WeightItem[]; finalWeight: number; year: number; position?: number }
export interface PeriodsData { periods: Period[] }

const BASE_ITEMS = () => [{ name: "Actividades", weight: 40 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }];
const DEMO_PERIODS: PeriodsData = {
  periods: [
    { id: "p1", name: "Periodo 1", open: "2026-01-26", close: "2026-04-03", status: "closed", items: BASE_ITEMS(), finalWeight: 25, year: 2026 },
    { id: "p2", name: "Periodo 2", open: "2026-04-13", close: "2026-06-19", status: "closed", items: BASE_ITEMS(), finalWeight: 25, year: 2026 },
    { id: "p3", name: "Periodo 3", open: "2026-07-13", close: "2026-10-15", status: "open", items: BASE_ITEMS(), finalWeight: 25, year: 2026 },
    { id: "p4", name: "Periodo 4", open: "2026-10-19", close: "2026-11-27", status: "draft", items: [{ name: "Actividades", weight: 35 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }], finalWeight: 25, year: 2026 },
  ],
};

async function fetchPeriods(): Promise<PeriodsData> {
  const sb = supabase();
  const [p, c] = await Promise.all([
    sb.from("academic_periods").select("id, year, position, name, open_date, close_date, status, final_weight").order("year").order("position"),
    sb.from("period_components").select("period_id, name, weight, position").order("position"),
  ]);
  [p, c].forEach(throwIf);
  const comps = (c.data ?? []) as Array<{ period_id: string; name: string; weight: number }>;
  return {
    periods: ((p.data ?? []) as Array<{ id: string; year: number; position: number; name: string; open_date: string; close_date: string; status: PeriodStatus; final_weight: number }>).map((x) => ({
      id: x.id, name: x.name, position: x.position, open: x.open_date, close: x.close_date, status: x.status, finalWeight: Number(x.final_weight), year: x.year,
      items: comps.filter((k) => k.period_id === x.id).map((k) => ({ name: k.name, weight: Number(k.weight) })),
    })),
  };
}

export function usePeriods() {
  return useQuery({ queryKey: ["periods", forcedState()], queryFn: () => (DEMO ? demoData(DEMO_PERIODS, { periods: [] }) : fetchPeriods()), initialData: demoInitial(DEMO_PERIODS), refetchOnWindowFocus: false });
}

const invalidatePeriods = (qc: ReturnType<typeof useQueryClient>) => {
  ["periods", "curriculum", "assignments", "overview"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

export function useSavePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Period) => {
      if (DEMO) return;
      const r = await supabase().rpc("save_period", { p_id: p.id, p_open: p.open, p_close: p.close, p_status: p.status, p_components: p.items.map((x) => ({ name: x.name.trim(), weight: Number(x.weight) })) });
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) invalidatePeriods(qc); },
  });
}

/** Peso de cada periodo en la nota final (uno por periodo creado, en orden). */
export function useSavePeriodWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periods, weights }: { periods: Period[]; weights: WeightItem[] }) => {
      if (DEMO) {
        // Como el sistema: los boletines de la demostración leen estos pesos para el acumulado.
        PERIOD_SETUP.names = weights.map((x) => x.name);
        PERIOD_SETUP.weights = weights.map((x) => Number(x.weight) || 0);
        return;
      }
      if (weights.length !== periods.length) throw new Error("Hay " + periods.length + " periodos creados y " + weights.length + " pesos. Usa «Crear periodo» para agregar uno.");
      for (let i = 0; i < periods.length; i++) {
        const r = await supabase().from("academic_periods").update({ final_weight: Number(weights[i].weight) || 0 }).eq("id", periods[i].id);
        throwIf(r);
      }
    },
    onSuccess: () => { if (!DEMO) invalidatePeriods(qc); },
  });
}

/** Crea el periodo siguiente en borrador, con la distribución base y fechas después del último. */
export function useCreatePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periods: Period[]) => {
      if (DEMO) return;
      const last = periods[periods.length - 1];
      const year = last?.year ?? new Date().getFullYear();
      // Siguiente posición del año (no el número de periodos: puede haber huecos).
      const position = Math.max(0, ...periods.filter((p) => p.year === year).map((p) => p.position ?? 0)) + 1;
      if (position > 6) throw new Error("Un año lectivo admite hasta 6 periodos.");
      const start = new Date((last?.close ?? year + "-01-20") + "T12:00:00");
      start.setDate(start.getDate() + 3);
      const end = new Date(start); end.setDate(end.getDate() + 42);
      const iso = (d: Date) => d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      const id = year + "-p" + position;
      const p = await supabase().from("academic_periods").insert({ id, year, position, name: "Periodo " + position, open_date: iso(start), close_date: iso(end), status: "draft", final_weight: 0 });
      throwIf(p);
      const c = await supabase().from("period_components").insert(BASE_ITEMS().map((x, i) => ({ period_id: id, name: x.name, weight: x.weight, position: i + 1 })));
      throwIf(c);
      return "Periodo " + position;
    },
    onSuccess: () => { if (!DEMO) invalidatePeriods(qc); },
  });
}

/* ---------- Usuarios ---------- */

/** Usuario del directorio con lo que hace falta para escribir en la base. */
export type DirUser = DirectoryUser & { kind: "staff" | "guardian"; profileId?: string; guardianId?: number };
const ROLE_FROM_DB: Record<string, UserRole> = { teacher: "teacher", admin: "staff", principal: "director" };
const ROLE_TO_DB: Record<string, string> = { teacher: "teacher", staff: "admin", director: "principal" };

/** «Hoy, 08:42», «Ayer, 17:10», «Hace 9 días» o «Nunca». */
export function lastSeen(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso), now = new Date();
  const hm = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  return days <= 0 ? "Hoy, " + hm : days === 1 ? "Ayer, " + hm : "Hace " + days + " días";
}

const DEMO_USERS: DirUser[] = USERS.map((u) => ({ ...u, kind: u.role === "guardian" ? "guardian" : "staff" }));

async function fetchUsers(): Promise<DirUser[]> {
  const sb = supabase();
  const [d, p, g] = await Promise.all([
    sb.from("staff_directory").select("email, full_name, role").order("full_name"),
    sb.from("profiles").select("id, email, status, last_seen_at"),
    sb.from("guardians").select("id, full_name, email").order("full_name"),
  ]);
  [d, p, g].forEach(throwIf);
  const profiles = new Map(((p.data ?? []) as Array<{ id: string; email: string; status: UserStatus; last_seen_at: string | null }>).map((x) => [x.email, x]));
  const staff: DirUser[] = ((d.data ?? []) as Array<{ email: string; full_name: string; role: string }>).map((x) => {
    const pr = profiles.get(x.email);
    return { id: "s:" + x.email, kind: "staff", name: x.full_name, email: x.email, role: ROLE_FROM_DB[x.role], status: pr ? pr.status : "none", last: lastSeen(pr?.last_seen_at ?? null), profileId: pr?.id };
  });
  // Los acudientes aún no tienen cuenta: su acceso llega con la app móvil.
  const guardians: DirUser[] = ((g.data ?? []) as Array<{ id: number; full_name: string; email: string | null }>).map((x) => ({
    id: "g:" + x.id, kind: "guardian", guardianId: x.id, name: x.full_name, email: x.email ?? "", role: "guardian", status: "none", last: "Nunca",
  }));
  return staff.concat(guardians);
}

export function useUsers() {
  return useQuery({ queryKey: ["users", forcedState()], queryFn: () => (DEMO ? demoData(DEMO_USERS, []) : fetchUsers()), initialData: demoInitial(DEMO_USERS) });
}

/** Registrar en el directorio (invitar) o editar. Cambiar el rol de alguien con cuenta cambia también su perfil. */
export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, isNew }: { user: DirUser; isNew: boolean }) => {
      if (DEMO) return;
      const sb = supabase();
      if (user.kind === "guardian") {
        const r = await sb.from("guardians").update({ full_name: user.name.trim(), email: user.email.trim().toLowerCase() || null }).eq("id", user.guardianId!);
        throwIf(r); return;
      }
      const row = { email: user.email.trim().toLowerCase(), full_name: user.name.trim(), role: ROLE_TO_DB[user.role] };
      if (isNew) { const r = await sb.from("staff_directory").insert({ ...row, area: user.role === "teacher" ? "Docencia" : user.role === "staff" ? "Secretaría académica" : "Rectoría" }); throwIf(r); return; }
      const before = user.id.slice(2);
      const r = await sb.from("staff_directory").update(row).eq("email", before);
      throwIf(r);
      if (user.profileId) { const pr = await sb.from("profiles").update({ full_name: row.full_name, role: row.role }).eq("id", user.profileId); throwIf(pr); }
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["users"] }); },
  });
}

/** Desactivar: la cuenta deja de tener rol (current_app_role exige perfil activo). */
export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (u: DirUser) => {
      if (DEMO) return;
      if (!u.profileId) throw new Error("Esta persona aún no tiene cuenta.");
      const r = await supabase().from("profiles").update({ status: "inactive" }).eq("id", u.profileId);
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["users"] }); },
  });
}

/** Restablecer: Supabase envía un enlace de un solo uso al correo. La contraseña nunca pasa por la app. */
export async function sendPasswordReset(email: string): Promise<void> {
  if (DEMO) { await new Promise((r) => window.setTimeout(r, 900)); return; }
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw error;
}

