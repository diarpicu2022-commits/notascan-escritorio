import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";
import { allRows } from "./client";

/*
 * Privacidad y derechos del titular (paso 6g · Ley 1581 de 2012, Decreto 1377 de 2013).
 * - Autorización del acudiente: Secretaría la registra (también para estudiantes ya matriculados) y la revoca con motivo;
 *   revocar la de salud borra esos datos en la base.
 * - Aceptación de la política por el personal, con su versión y fecha (tabla consents).
 * - Exportación de todos los datos de un estudiante (derecho de acceso).
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };
const msgOf = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "");

export function privacyMessage(e: unknown): string {
  const m = msgOf(e);
  if (/Solo Secretaría|motivo|ya estaba revocada|autorización/.test(m)) return m;
  return "No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.";
}

export interface GuardianAuthorization {
  id: number; guardianName: string; relationship: string; health: boolean; method: string; receivedOn: string;
  policyVersion: string; revokedAt: string | null; revokedReason: string | null;
}

export function useAuthorizations(studentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["authorizations", studentId],
    enabled: !DEMO && !!studentId && enabled,
    queryFn: async (): Promise<GuardianAuthorization[]> => {
      const r = await supabase().from("guardian_authorizations")
        .select("id, guardian_name, relationship, health_data, method, received_on, policy_version, revoked_at, revoked_reason")
        .eq("student_id", studentId!).order("created_at", { ascending: false });
      throwIf(r);
      return ((r.data ?? []) as Array<{ id: number; guardian_name: string; relationship: string; health_data: boolean; method: string; received_on: string; policy_version: string; revoked_at: string | null; revoked_reason: string | null }>)
        .map((x) => ({ id: x.id, guardianName: x.guardian_name, relationship: x.relationship, health: x.health_data, method: x.method, receivedOn: x.received_on, policyVersion: x.policy_version, revokedAt: x.revoked_at, revokedReason: x.revoked_reason }));
    },
  });
}

export function useRegisterAuthorization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { studentId: string; guardianName: string; relationship: string; health: boolean; receivedOn: string }) => {
      const pv = await supabase().rpc("current_policy_version");
      throwIf(pv);
      // Quién la registra lo pone la base (recorded_by = auth.uid()).
      const r = await supabase().from("guardian_authorizations").insert({
        student_id: v.studentId, policy_version: pv.data as string, guardian_name: v.guardianName.trim(), relationship: v.relationship, health_data: v.health, received_on: v.receivedOn,
      });
      throwIf(r);
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["authorizations", v.studentId] }); qc.invalidateQueries({ queryKey: ["student-profile", v.studentId] }); },
  });
}

export function useRevokeAuthorization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: number; studentId: string; reason: string }) => {
      const r = await supabase().rpc("revoke_guardian_authorization", { p_id: v.id, p_reason: v.reason.trim() });
      throwIf(r);
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ["authorizations", v.studentId] }); qc.invalidateQueries({ queryKey: ["student-profile", v.studentId] }); },
  });
}

/** Todo lo que el colegio tiene de un estudiante, en un archivo JSON (derecho de acceso del titular). */
export async function exportStudentData(studentId: string): Promise<{ name: string; blob: Blob }> {
  const sb = supabase();
  const one = async (table: string, select = "*") => {
    const r = await allRows<Record<string, unknown>>((from, to) => sb.from(table).select(select).eq("student_id", studentId).range(from, to));
    throwIf(r);
    return r.data;
  };
  const st = await sb.from("students").select("*").eq("id", studentId).maybeSingle();
  throwIf(st);
  if (!st.data) throw new Error("No encontramos a este estudiante.");
  const [guardians, medical, grades, attendance, observations, concepts, reportCards, authorizations, directorMessages] = await Promise.all([
    one("guardians"), one("student_medical"), one("grades", "evaluation_id, value, status, verified_at, updated_at"), one("attendance", "course_id, class_date, slot, state, note"),
    one("observations", "type, title, context, created_at"), one("period_concepts", "assignment_id, text, state"), one("report_cards", "period_id, status, generated_at"),
    one("guardian_authorizations", "guardian_name, relationship, health_data, method, received_on, policy_version, revoked_at, revoked_reason"),
    one("director_messages", "period_id, text, state"),
  ]);
  const data = {
    generado: new Date().toISOString(),
    nota: "Datos personales del estudiante que conserva el colegio en NotaScan (Ley 1581 de 2012, derecho de acceso).",
    estudiante: st.data, acudientes: guardians, salud: medical, autorizaciones: authorizations,
    notas: grades, asistencia: attendance, observador: observations, conceptos: concepts, mensajes_del_director: directorMessages, boletines: reportCards,
  };
  return { name: "datos-estudiante-" + studentId + ".json", blob: new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }) };
}

/* ---------- Aceptación de la política por el personal ---------- */

export function usePolicyConsent() {
  const profile = useAuth().profile;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["policy-consent", profile?.id],
    enabled: !DEMO && !!profile,
    queryFn: async (): Promise<{ version: string | null; accepted: boolean }> => {
      const v = await supabase().rpc("current_policy_version");
      throwIf(v);
      const version = typeof v.data === "string" && v.data ? v.data : null;
      if (!version) return { version, accepted: true };
      const c = await supabase().from("consents").select("id").eq("user_id", profile!.id).eq("policy_version", version).limit(1);
      throwIf(c);
      return { version, accepted: (c.data ?? []).length > 0 };
    },
  });
  const accept = useMutation({
    mutationFn: async () => {
      const r = await supabase().from("consents").insert({ user_id: profile!.id, policy_version: q.data!.version });
      if (r.error && !/duplicate|23505/.test(msgOf(r.error) + String((r.error as { code?: string }).code ?? ""))) throw r.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policy-consent", profile?.id] }),
  });
  return { q, accept };
}
