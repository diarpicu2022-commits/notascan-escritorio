import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";

/*
 * Identidad del colegio (paso 7b): nombre, iniciales, ciudad, resolución, DANE y logo. La carga la plataforma
 * (paso 7d); aquí se lee para mostrarla en el marco de la app, en los boletines y en el perfil del estudiante.
 */

export type InstitutionStatus = "implementation" | "active" | "suspended";

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  city: string;
  department: string;
  resolution: string;
  dane: string;
  /** URL pública del logo (bucket institution-logos) o, en una vista previa, la del archivo elegido. */
  logoUrl: string | null;
  status: InstitutionStatus;
  /** Meta institucional: promedio esperado por grado (la configura Secretaría; Rectoría la ve en la analítica). */
  goal: number;
}

/** El colegio de demostración del sistema (mismos textos que el boletín original). */
export const DEMO_INSTITUTION: Institution = {
  id: "00000000-0000-4000-8000-000000000001", name: "Colegio Los Andes", shortName: "LA", city: "Pasto", department: "Nariño",
  resolution: "Resolución 0123 de 2015", dane: "152001000000", logoUrl: null, status: "active", goal: 3.5,
};

export interface InstitutionRow {
  id: string; name: string; short_name: string; city: string; department: string; resolution: string; dane: string;
  logo_path: string | null; status: InstitutionStatus; performance_goal?: number;
}

/** URL pública de un logo guardado en el bucket. */
export function logoUrlOf(path: string | null): string | null {
  if (!path || DEMO) return null;
  return supabase().storage.from("institution-logos").getPublicUrl(path).data.publicUrl;
}

export const toInstitution = (r: InstitutionRow): Institution => ({
  id: r.id, name: r.name, shortName: r.short_name, city: r.city, department: r.department, resolution: r.resolution, dane: r.dane,
  logoUrl: logoUrlOf(r.logo_path), status: r.status, goal: r.performance_goal === undefined ? 3.5 : Number(r.performance_goal),
});

/** Iniciales para el escudo cuando no hay logo: las del colegio o, si faltan, las de su nombre sin «Colegio», «Institución»… */
export function initialsOf(i: Pick<Institution, "name" | "shortName">): string {
  if (i.shortName.trim()) return i.shortName.trim().toUpperCase().slice(0, 3);
  const words = i.name.replace(/^(colegio|institución educativa|institucion educativa|liceo|escuela|gimnasio)\s+/i, "").split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w));
  return (words.slice(0, 2).map((w) => w.charAt(0)).join("") || "NS").toUpperCase();
}

/** Línea bajo el nombre en el encabezado del boletín: solo lo que existe, sin datos inventados. */
export function headerLine(i: Institution): string {
  const place = [i.city, i.department].filter((x) => x.trim()).join(", ");
  return [place, i.resolution.trim(), i.dane.trim() ? "DANE " + i.dane.trim() : ""].filter(Boolean).join(" · ");
}

/** Colegio de la persona con sesión (el RLS solo deja leer el propio). */
export function useMyInstitution(enabled = true) {
  const profile = useAuth().profile;
  return useQuery({
    queryKey: ["my-institution", profile?.id],
    enabled: enabled && (DEMO || !!profile),
    initialData: DEMO ? DEMO_INSTITUTION : undefined,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Institution | null> => {
      if (DEMO) return DEMO_INSTITUTION;
      const r = await supabase().from("institutions").select("id, name, short_name, city, department, resolution, dane, logo_path, status, performance_goal").limit(1);
      if (r.error) throw r.error;
      const row = (r.data ?? [])[0] as InstitutionRow | undefined;
      return row ? toInstitution(row) : null;
    },
  });
}

/** Secretaría cambia la meta institucional (función de la base: solo Secretaría, entre 1.0 y 5.0). */
export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: number) => {
      if (DEMO) return;
      const r = await supabase().rpc("set_performance_goal", { p_goal: goal });
      if (r.error) throw r.error;
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["my-institution"] }); },
  });
}

/**
 * Tarjeta de contexto del menú con datos de la base: Secretaría ve el año y el periodo abierto; el docente, el periodo
 * y sus materias y cursos; Rectoría no la lleva (el colegio ya va en el menú). En demostración: la del sistema.
 */
export function useMenuContext(role: string): { label: string; value: string } | null | undefined {
  const profile = useAuth().profile;
  const q = useQuery({
    queryKey: ["menu-context", role, profile?.id],
    enabled: !DEMO && !!profile && (role === "admin" || role === "teacher"),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ label: string; value: string } | null> => {
      const sb = supabase();
      const p = await sb.from("academic_periods").select("id, name, year").eq("status", "open").limit(1);
      if (p.error) throw p.error;
      const open = (p.data ?? [])[0] as { id: string; name: string; year: number } | undefined;
      if (role === "admin") return { label: "Año lectivo", value: open ? open.year + " · " + open.name : "Sin periodo abierto" };
      if (!open) return { label: "Periodo", value: "Sin periodo abierto" };
      const a = await sb.from("teaching_assignments").select("course_id, subject:subjects(name)").eq("period_id", open.id).eq("teacher_email", profile!.email);
      if (a.error) throw a.error;
      const rows = (a.data ?? []) as unknown as Array<{ course_id: string; subject: { name: string } | null }>;
      const subjects = [...new Set(rows.map((x) => x.subject?.name ?? ""))].filter(Boolean);
      const courses = [...new Set(rows.map((x) => x.course_id))].sort();
      return { label: open.name + " · " + open.year, value: rows.length ? subjects.join(", ") + " · " + courses.join(", ") : "Sin cursos asignados" };
    },
  });
  if (DEMO) return undefined;
  if (role === "principal" || role === "platform") return null;
  return q.data ?? null;
}
