import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";

/*
 * Recordatorios de Rectoría al docente (paso 6b.4b). Rectoría los envía desde Seguimiento docente; el docente los ve
 * en su Inicio hasta marcarlos como vistos. Quién envía lo firma la base (sent_by = auth.uid()).
 */

const throwIf = (r: { error: unknown }) => { if (r.error) throw r.error; };

export interface Reminder { id: number; message: string; sender: string; at: string }

/** Texto del recordatorio según el avance del docente. */
export function reminderText(pending: number, pct: number, period: string): string {
  return "Tienes " + pending + (pending === 1 ? " evaluación" : " evaluaciones") + " con notas sin verificar en el " + period
    + " (" + pct + " % registrado). Ponte al día, por favor.";
}

export function useSendReminder() {
  return useMutation({
    mutationFn: async (v: { email: string; message: string }) => {
      if (DEMO) return;
      const r = await supabase().from("teacher_reminders").insert({ teacher_email: v.email, message: v.message });
      throwIf(r);
    },
  });
}

/** Recordatorios sin ver del docente con sesión (en demostración, ninguno: el Inicio queda como el sistema). */
export function useMyReminders() {
  const profile = useAuth().profile;
  return useQuery({
    queryKey: ["my-reminders", profile?.id],
    enabled: !DEMO && profile?.role === "teacher",
    initialData: DEMO ? [] : undefined,
    queryFn: async (): Promise<Reminder[]> => {
      const r = await supabase().from("teacher_reminders").select("id, message, created_at, sender:profiles(full_name)")
        .is("seen_at", null).order("created_at", { ascending: false });
      throwIf(r);
      return ((r.data ?? []) as unknown as Array<{ id: number; message: string; created_at: string; sender: { full_name: string } | null }>)
        .map((x) => ({ id: x.id, message: x.message, sender: x.sender?.full_name ?? "Rectoría", at: x.created_at }));
    },
  });
}

export function useMarkReminderSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (DEMO) return;
      const r = await supabase().rpc("mark_reminder_seen", { p_id: id });
      throwIf(r);
    },
    onSuccess: () => { if (!DEMO) qc.invalidateQueries({ queryKey: ["my-reminders"] }); },
  });
}
