import { supabase } from "../lib/supabase";

/*
 * Subir desde el celular (2026-10-06, dirección B: por internet). El computador abre un permiso de 20 minutos para una
 * evaluación (start_phone_upload); el QR lleva a la página móvil con ese permiso; la página sube cada foto por la
 * función phone-upload; aquí se recogen las fotos nuevas y se mandan a leer como las arrastradas.
 */

/** Página móvil publicada (GitHub Pages, repositorio público aparte: solo la página, sin claves secretas). */
export const PHONE_PAGE_URL = (import.meta.env.VITE_PHONE_PAGE_URL as string | undefined) || "https://diarpicu2022-commits.github.io/notascan-subir/";

export interface PhoneSession { id: string; token: string; expiresAt: string }

export async function startPhoneUpload(evaluationId: number): Promise<PhoneSession> {
  const { data, error } = await supabase().rpc("start_phone_upload", { p_evaluation: evaluationId });
  if (error) throw new Error(error.message || "No pudimos generar el código.");
  const row = (Array.isArray(data) ? data[0] : data) as { session_id: string; token: string; expires_at: string } | undefined;
  if (!row) throw new Error("No pudimos generar el código.");
  return { id: row.session_id, token: row.token, expiresAt: row.expires_at };
}

export async function closePhoneUpload(sessionId: string): Promise<void> {
  await supabase().rpc("close_phone_upload", { p_session: sessionId });
}

/** Fotos que llegaron y aún no se mandaron a leer; quedan marcadas como recogidas. */
export async function pickPhonePhotos(sessionId: string): Promise<string[]> {
  const sb = supabase();
  const { data, error } = await sb.from("phone_uploads").select("id, photo_path").eq("session_id", sessionId).is("picked_at", null).order("id");
  if (error || !data?.length) return [];
  const ids = (data as Array<{ id: number }>).map((r) => r.id);
  const up = await sb.from("phone_uploads").update({ picked_at: new Date().toISOString() }).in("id", ids);
  if (up.error) return [];
  return (data as Array<{ photo_path: string }>).map((r) => r.photo_path);
}

export const phoneLink = (token: string) => PHONE_PAGE_URL + "?t=" + token;
