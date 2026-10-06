// NotaScan · recibir fotos de exámenes desde el celular (2026-10-06).
// El celular no inicia sesión: trae el permiso del QR (token de un solo uso, 20 minutos, una sola evaluación).
//   GET  ?t=<token>          → a qué evaluación sube y cuántas fotos lleva (para la página del celular).
//   POST { t, image }        → image = JPEG en base64 (la página ya la reduce a 1568 px). Se guarda en la carpeta del
//                              docente: exam-photos/<docente>/<evaluación>/movil-…jpg (la misma que se borra al cerrar
//                              el periodo) y se anota en phone_uploads para que el computador la mande a leer.
// Se publica con «Verify JWT» desactivado: la seguridad es el token, validado aquí con la clave de servicio.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MAX_BYTES = 4 * 1024 * 1024; // una hoja a 1568 px en JPEG pesa ~0,3–1 MB
const MAX_PHOTOS = 80;             // por permiso: un curso grande y repeticiones

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const firstOf = (json: string | undefined) => { try { return Object.values(JSON.parse(json ?? "{}"))[0] as string | undefined; } catch { return undefined; } };
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstOf(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (!service) return reply(500, { error: "La función no tiene su clave de servidor configurada." });
  const admin = createClient(url, service, { auth: { persistSession: false } });

  let token = "", image = "";
  if (req.method === "GET") token = new URL(req.url).searchParams.get("t") ?? "";
  else if (req.method === "POST") {
    try { const b = await req.json(); token = String(b.t ?? ""); image = String(b.image ?? ""); } catch { return reply(400, { error: "Solicitud no válida." }); }
  } else return reply(405, { error: "Método no permitido." });
  if (!/^[0-9a-f]{64}$/.test(token)) return reply(404, { error: "Este código no es válido. Vuelve a escanear el QR del computador." });

  const { data: s } = await admin.from("phone_upload_sessions")
    .select("id, teacher_id, evaluation_id, expires_at, closed_at, evaluation:evaluations(name, status, assignment:teaching_assignments(course_id, subject:subjects(name)))")
    .eq("token", token).maybeSingle();
  if (!s) return reply(404, { error: "Este código no es válido. Vuelve a escanear el QR del computador." });
  if (s.closed_at || new Date(s.expires_at).getTime() < Date.now()) return reply(410, { error: "Este código venció. Genera uno nuevo en el computador." });
  // deno-lint-ignore no-explicit-any
  const ev = s.evaluation as any;
  if (ev?.status === "cerrada") return reply(410, { error: "La evaluación ya está cerrada: no recibe más fotos." });
  const { count } = await admin.from("phone_uploads").select("id", { count: "exact", head: true }).eq("session_id", s.id);
  const info = { evaluation: ev?.name ?? "Evaluación", course: ev?.assignment?.course_id ?? "", subject: ev?.assignment?.subject?.name ?? "", expires_at: s.expires_at, count: count ?? 0 };
  if (req.method === "GET") return reply(200, info);

  if ((count ?? 0) >= MAX_PHOTOS) return reply(429, { error: "Llegaste al máximo de fotos de este código. Genera uno nuevo en el computador." });
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(image.replace(/^data:image\/jpeg;base64,/, "")), (c) => c.charCodeAt(0)); } catch { return reply(400, { error: "La foto llegó dañada. Inténtalo de nuevo." }); }
  if (bytes.length < 1000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return reply(400, { error: "Eso no es una foto JPEG. Inténtalo de nuevo." });
  if (bytes.length > MAX_BYTES) return reply(413, { error: "La foto es demasiado grande." });

  const path = `${s.teacher_id}/${s.evaluation_id}/movil-${Date.now()}-${(count ?? 0) + 1}.jpg`;
  const up = await admin.storage.from("exam-photos").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (up.error) return reply(502, { error: "No pudimos guardar la foto. Inténtalo de nuevo." });
  const { error: insErr } = await admin.from("phone_uploads").insert({ session_id: s.id, photo_path: path });
  if (insErr) return reply(500, { error: "La foto se guardó, pero no pudimos avisar al computador. Inténtalo de nuevo." });
  return reply(200, { ...info, count: (count ?? 0) + 1 });
});
