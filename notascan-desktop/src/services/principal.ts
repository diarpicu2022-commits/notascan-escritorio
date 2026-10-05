import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import { REQUESTS, type GradeRequest, type RequestStatus } from "../data/principal";
import { demoData, demoInitial, forcedState } from "./client";

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
