import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import { DEMO_INSTITUTION, toInstitution, type Institution, type InstitutionRow, type InstitutionStatus } from "./institution";
import { demoData, demoInitial, forcedState } from "./client";

/*
 * Consola de la plataforma (paso 7d). Solo cifras agregadas por colegio (platform_stats): ningún nombre, documento
 * ni nota de estudiantes llega aquí (decisión de privacidad de Diego, 2026-10-03).
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const msgOf = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "");

export function platformMessage(e: unknown): string {
  const m = msgOf(e);
  if (/ya está registrado|Escribe|Solo la plataforma|check/.test(m)) return /check/.test(m) ? "Revisa el DANE (12 dígitos) y las iniciales (hasta 3 letras)." : m;
  return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
}

export type Adoption = "grows" | "steady" | "drops" | "idle";

export interface SchoolRow {
  institution: Institution;
  plan: string;
  contractUntil: string | null;
  createdAt: string;
  students: number; teachers: number; secretaries: number; accounts: number;
  lastSeen: string | null;
  grades7d: number; grades30d: number; attendance7d: number; observations30d: number;
  /** Actividad de 8 semanas (notas verificadas + asistencia), de la más antigua a la actual. */
  weekly: number[];
  adoption: Adoption;
}

/** Adopción: últimas 4 semanas frente a las 4 anteriores (±20 %). Sin actividad en 8 semanas: «sin uso». */
export function adoptionOf(weekly: number[]): Adoption {
  const prev = weekly.slice(0, 4).reduce((a, b) => a + b, 0), last = weekly.slice(4).reduce((a, b) => a + b, 0);
  if (!prev && !last) return "idle";
  if (!prev) return "grows";
  const ch = (last - prev) / prev;
  return ch > 0.2 ? "grows" : ch < -0.2 ? "drops" : "steady";
}

const demoSchool = (i: Partial<Institution>, extra: Partial<SchoolRow>): SchoolRow => {
  const weekly = extra.weekly ?? [0, 0, 0, 0, 0, 0, 0, 0];
  return {
    institution: { ...DEMO_INSTITUTION, ...i }, plan: "Anual", contractUntil: "2027-01-31", createdAt: "2026-01-10",
    students: 0, teachers: 0, secretaries: 1, accounts: 0, lastSeen: null, grades7d: 0, grades30d: 0, attendance7d: 0, observations30d: 0,
    ...extra, weekly, adoption: adoptionOf(weekly),
  };
};

/** Colegios de la demostración (datos de ejemplo de la consola, no de colegios reales). */
const DEMO_SCHOOLS: SchoolRow[] = [
  demoSchool({}, { students: 68, teachers: 6, accounts: 9, lastSeen: new Date().toISOString(), grades7d: 112, grades30d: 418, attendance7d: 340, observations30d: 24, weekly: [180, 210, 260, 240, 300, 330, 360, 452] }),
  demoSchool({ id: "demo-sf", name: "Colegio San Felipe Neri", shortName: "SF", city: "Ipiales", department: "Nariño", resolution: "Resolución 0456 de 2019", dane: "152356000123" },
    { students: 41, teachers: 4, accounts: 5, lastSeen: new Date(Date.now() - 9 * 86400000).toISOString(), grades7d: 0, grades30d: 36, attendance7d: 0, observations30d: 2, weekly: [140, 150, 120, 130, 60, 20, 0, 0] }),
  demoSchool({ id: "demo-lm", name: "Institución Educativa La Merced", shortName: "LM", city: "Túquerres", department: "Nariño", resolution: "", dane: "", status: "implementation" },
    { students: 0, teachers: 0, accounts: 0, plan: "Piloto", contractUntil: "2026-11-15", createdAt: "2026-09-28" }),
  demoSchool({ id: "demo-ls", name: "Liceo del Sur", shortName: "LS", city: "Tumaco", department: "Nariño", resolution: "Resolución 0981 de 2012", dane: "152835000456", status: "suspended" },
    { students: 22, teachers: 3, accounts: 3, lastSeen: new Date(Date.now() - 40 * 86400000).toISOString(), plan: "Anual", contractUntil: "2026-08-31", weekly: [0, 0, 0, 0, 0, 0, 0, 0] }),
];

interface StatRow {
  institution_id: string; students: number; teachers: number; secretaries: number; accounts: number; last_seen: string | null;
  grades_7d: number; grades_30d: number; attendance_7d: number; observations_30d: number; weekly: number[] | null;
}

async function fetchSchools(): Promise<SchoolRow[]> {
  const sb = supabase();
  const [iq, sq] = await Promise.all([
    sb.from("institutions").select("id, name, short_name, city, department, resolution, dane, logo_path, status, plan, contract_until, created_at").order("name"),
    sb.rpc("platform_stats"),
  ]);
  [iq, sq].forEach(throwIf);
  const stats = new Map(((sq.data ?? []) as StatRow[]).map((s) => [s.institution_id, s]));
  return ((iq.data ?? []) as Array<InstitutionRow & { plan: string; contract_until: string | null; created_at: string }>).map((r) => {
    const s = stats.get(r.id);
    const weekly = (s?.weekly ?? []).map(Number);
    return {
      institution: toInstitution(r), plan: r.plan, contractUntil: r.contract_until, createdAt: r.created_at,
      students: s?.students ?? 0, teachers: s?.teachers ?? 0, secretaries: s?.secretaries ?? 0, accounts: s?.accounts ?? 0, lastSeen: s?.last_seen ?? null,
      grades7d: s?.grades_7d ?? 0, grades30d: s?.grades_30d ?? 0, attendance7d: s?.attendance_7d ?? 0, observations30d: s?.observations_30d ?? 0,
      weekly, adoption: adoptionOf(weekly),
    };
  });
}

export function useSchools() {
  return useQuery({ queryKey: ["schools", forcedState()], queryFn: () => (DEMO ? demoData(DEMO_SCHOOLS, []) : fetchSchools()), initialData: demoInitial(DEMO_SCHOOLS) });
}

/* ---------- Requiere atención ---------- */

export interface Attention { key: string; tone: "gold" | "burgundy"; title: string; detail: string; target: "identity" | "service" | "usage" | "secretaries" }

const daysUntil = (iso: string) => Math.ceil((new Date(iso + "T23:59:59").getTime() - Date.now()) / 86400000);

/** Lo que Diego debe atender de un colegio, del más grave al más leve. */
export function attentionOf(s: SchoolRow): Attention[] {
  const out: Attention[] = [];
  const i = s.institution;
  if (s.contractUntil) {
    const d = daysUntil(s.contractUntil);
    if (d < 0 && i.status !== "suspended") out.push({ key: "contract-over", tone: "burgundy", title: "Contrato vencido hace " + -d + (d === -1 ? " día" : " días"), detail: "Renueva el contrato o suspende el colegio.", target: "service" });
    else if (d >= 0 && d <= 30) out.push({ key: "contract-soon", tone: "gold", title: "El contrato vence en " + d + (d === 1 ? " día" : " días"), detail: "Conviene acordar la renovación antes del cierre.", target: "service" });
  }
  if (i.status === "active" && s.weekly.length && s.weekly.slice(-2).every((n) => n === 0)) out.push({ key: "idle", tone: "burgundy", title: "Sin uso en las últimas dos semanas", detail: "No hay notas verificadas ni asistencia tomada.", target: "usage" });
  if (s.adoption === "drops" && i.status === "active") out.push({ key: "drops", tone: "gold", title: "El uso viene cayendo", detail: "Las últimas 4 semanas tienen más de un 20 % menos de actividad que las 4 anteriores.", target: "usage" });
  if (!s.secretaries) out.push({ key: "no-admin", tone: "burgundy", title: "Sin cuenta de Secretaría registrada", detail: "Nadie del colegio puede configurar la estructura ni matricular.", target: "secretaries" });
  else if (!s.accounts && i.status !== "suspended") out.push({ key: "no-login", tone: "gold", title: "Nadie del colegio ha entrado todavía", detail: "La Secretaría registrada aún no activa su cuenta. Puedes reenviarle la invitación.", target: "secretaries" });
  if (!i.logoUrl) out.push({ key: "no-logo", tone: "gold", title: "Sin logo", detail: "Los boletines salen con las iniciales del colegio.", target: "identity" });
  if (!i.resolution.trim() || !i.dane.trim()) out.push({ key: "no-legal", tone: "gold", title: "Faltan resolución o DANE", detail: "El encabezado de los boletines sale incompleto.", target: "identity" });
  return out;
}

/* ---------- Escrituras ---------- */

export interface NewSchool { name: string; shortName: string; city: string; department: string; plan: string; contractUntil: string; adminName: string; adminEmail: string }

export function useCreateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: NewSchool): Promise<string> => {
      if (DEMO) return "demo-nuevo";
      const r = await supabase().rpc("create_institution", { p: {
        name: v.name, short_name: v.shortName, city: v.city, department: v.department, plan: v.plan, contract_until: v.contractUntil,
        admin_name: v.adminName, admin_email: v.adminEmail,
      } });
      throwIf(r);
      return r.data as string;
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["schools"] }); },
  });
}

/** Guarda la identidad: sube el logo nuevo (si hay) al bucket público y actualiza el colegio. */
export function useSaveIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ value, logo, removeLogo }: { value: Institution; logo: File | null; removeLogo: boolean }) => {
      if (DEMO) return;
      const sb = supabase();
      let logoPath: string | null | undefined;
      if (logo) {
        const ext = (logo.name.split(".").pop() || "png").toLowerCase();
        logoPath = value.id + "/logo-" + Date.now() + "." + ext;
        const up = await sb.storage.from("institution-logos").upload(logoPath, logo, { contentType: logo.type, upsert: false });
        if (up.error) throw up.error;
      } else if (removeLogo) logoPath = null;
      const r = await sb.from("institutions").update({
        name: value.name.trim(), short_name: value.shortName.trim().toUpperCase(), city: value.city.trim(), department: value.department.trim(),
        resolution: value.resolution.trim(), dane: value.dane.trim(), ...(logoPath !== undefined ? { logo_path: logoPath } : {}),
      }).eq("id", value.id);
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) { qc.invalidateQueries({ queryKey: ["schools"] }); qc.invalidateQueries({ queryKey: ["my-institution"] }); } },
  });
}

/** Estado del servicio, plan y contrato. Suspender deja al colegio sin acceso (la base lo aplica al instante). */
export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; status: InstitutionStatus; plan: string; contractUntil: string | null }) => {
      if (DEMO) return;
      const r = await supabase().from("institutions").update({ status: v.status, plan: v.plan.trim(), contract_until: v.contractUntil || null }).eq("id", v.id);
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["schools"] }); },
  });
}

/* ---------- Invitaciones por correo (paso 7e) ---------- */

/** Pide a la función invite-staff que envíe la invitación (código numérico por correo). */
export async function sendInvitation(target: { institutionId?: string; email?: string }): Promise<string[]> {
  if (DEMO) { await new Promise((r) => window.setTimeout(r, 600)); return [target.email ?? "secretaria@colegio.edu.co"]; }
  // Plataforma: colegio y, si se indica, la persona concreta. Secretaría: solo el correo (siempre de su colegio).
  const body = target.institutionId ? { institution_id: target.institutionId, ...(target.email ? { email: target.email } : {}) } : { email: target.email };
  const { data, error } = await supabase().functions.invoke("invite-staff", { body });
  if (error) {
    // El cuerpo de la respuesta trae el motivo en español (sin cuenta de Secretaría, ya activa, límite de correos…).
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().then((b: { error?: string }) => b.error, () => undefined) : undefined;
    throw new Error(detail || "No pudimos enviar la invitación. Revisa tu conexión e inténtalo de nuevo.");
  }
  return (data as { sent?: string[] }).sent ?? [];
}

/* ---------- Cuentas de Secretaría de un colegio (2026-10-06) ---------- */

export type SecretaryAccount = "none" | "invited" | "active" | "inactive";
export interface Secretary { email: string; name: string; account: SecretaryAccount; lastSeen: string | null }

const DEMO_SECRETARIES: Record<string, Secretary[]> = {
  "00000000-0000-4000-8000-000000000001": [
    { email: "claudia@losandes.edu.co", name: "Claudia Enríquez", account: "active", lastSeen: new Date().toISOString() },
    { email: "patricia@losandes.edu.co", name: "Patricia Ortega", account: "invited", lastSeen: null },
  ],
  "demo-lm": [{ email: "secretaria@lamerced.edu.co", name: "Rosa Erazo", account: "none", lastSeen: null }],
};

/** Quiénes son la Secretaría de un colegio y en qué estado está su cuenta (solo la plataforma). */
export function useSecretaries(institutionId: string | undefined) {
  return useQuery({
    queryKey: ["secretaries", institutionId, forcedState()],
    enabled: !!institutionId,
    queryFn: async (): Promise<Secretary[]> => {
      if (DEMO) return demoData(DEMO_SECRETARIES[institutionId!] ?? [], []);
      const r = await supabase().rpc("platform_secretaries", { p_institution: institutionId });
      throwIf(r);
      return ((r.data ?? []) as Array<{ email: string; full_name: string; account: SecretaryAccount; last_seen: string | null }>)
        .map((x) => ({ email: x.email, name: x.full_name, account: x.account, lastSeen: x.last_seen }));
    },
  });
}

/** Registra una cuenta de Secretaría en el directorio del colegio (después se le envía la invitación). */
export function useAddSecretary(institutionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; email: string }) => {
      if (DEMO) { await new Promise((r) => window.setTimeout(r, 400)); return; }
      throwIf(await supabase().rpc("platform_add_secretary", { p_institution: institutionId, p_email: v.email, p_name: v.name }));
    },
    onSuccess: () => { if (!DEMO) { qc.invalidateQueries({ queryKey: ["secretaries", institutionId] }); qc.invalidateQueries({ queryKey: ["schools"] }); } },
  });
}

/** Quita del directorio a quien nunca activó su cuenta (correo mal escrito, cuentas de prueba). */
export function useRemoveSecretary(institutionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      if (DEMO) { await new Promise((r) => window.setTimeout(r, 400)); return; }
      throwIf(await supabase().rpc("platform_remove_secretary", { p_institution: institutionId, p_email: email }));
    },
    onSuccess: () => { if (!DEMO) { qc.invalidateQueries({ queryKey: ["secretaries", institutionId] }); qc.invalidateQueries({ queryKey: ["schools"] }); } },
  });
}
