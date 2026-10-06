// NotaScan · borrar las fotos de exámenes de un periodo cerrado (paso 6e, 2026-10-06).
// Decisión de Diego: las fotos se guardan en el bucket privado solo mientras sirven para revisar y se borran al cerrar
// el periodo. Las notas se conservan (es el registro académico); se borran los archivos y la referencia a ellos.
// Solo Secretaría la pide, y solo para un periodo de SU colegio que ya esté cerrado (se comprueba con su sesión).
// El borrado usa la clave de servicio (las fotos están en la carpeta de cada docente), que Supabase pone dentro de la
// función y nunca llega a la app. Se borra la carpeta completa de cada evaluación (<docente>/<evaluación>/), incluidas
// las fotos que no se pudieron asignar a ningún estudiante.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido." });

  const firstOf = (json: string | undefined) => { try { return Object.values(JSON.parse(json ?? "{}"))[0] as string | undefined; } catch { return undefined; } };
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || firstOf(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstOf(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (!anon || !service) return reply(500, { error: "La función no tiene sus claves de servidor configuradas." });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply(401, { error: "Inicia sesión para cerrar el periodo." });

  let body: { period_id?: string } = {};
  try { body = await req.json(); } catch { return reply(400, { error: "Solicitud no válida." }); }
  if (!body.period_id) return reply(400, { error: "Falta el periodo." });

  // Quién llama y el periodo, con su sesión: solo Secretaría, solo su colegio, solo un periodo cerrado.
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const [{ data: role }, { data: inst }] = await Promise.all([caller.rpc("current_app_role"), caller.rpc("current_institution")]);
  if (role !== "admin" || !inst) return reply(403, { error: "Solo Secretaría borra las fotos de un periodo." });
  const { data: period } = await caller.from("academic_periods").select("id, status").eq("id", body.period_id).maybeSingle();
  if (!period) return reply(404, { error: "No encontramos ese periodo en tu colegio." });
  if ((period as { status: string }).status !== "closed") return reply(409, { error: "Las fotos se borran solo cuando el periodo está cerrado." });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: asg, error: asgErr } = await admin.from("teaching_assignments").select("id, teacher_email").eq("period_id", body.period_id).eq("institution_id", inst);
  if (asgErr) return reply(500, { error: "No pudimos leer la malla del periodo." });
  const assignments = (asg ?? []) as Array<{ id: number; teacher_email: string }>;
  if (!assignments.length) return reply(200, { removed: 0, grades: 0 });
  const [{ data: evs }, { data: profiles }] = await Promise.all([
    admin.from("evaluations").select("id, assignment_id").in("assignment_id", assignments.map((a) => a.id)),
    admin.from("profiles").select("id, email").eq("institution_id", inst).in("email", [...new Set(assignments.map((a) => a.teacher_email))]),
  ]);
  const uidOf = new Map(((profiles ?? []) as Array<{ id: string; email: string }>).map((p) => [p.email, p.id]));
  const teacherOf = new Map(assignments.map((a) => [a.id, a.teacher_email]));
  const evaluations = (evs ?? []) as Array<{ id: number; assignment_id: number }>;

  // Carpeta de cada evaluación: <docente>/<evaluación>/ (así subió las fotos la app).
  let removed = 0;
  for (const e of evaluations) {
    const uid = uidOf.get(teacherOf.get(e.assignment_id) ?? "");
    if (!uid) continue;
    const prefix = uid + "/" + e.id;
    for (;;) {
      const { data: files, error } = await admin.storage.from("exam-photos").list(prefix, { limit: 1000 });
      if (error) return reply(500, { error: "No pudimos listar las fotos.", removed });
      if (!files?.length) break;
      const { error: rmErr } = await admin.storage.from("exam-photos").remove(files.map((f) => prefix + "/" + f.name));
      if (rmErr) return reply(500, { error: "No pudimos borrar todas las fotos.", removed });
      removed += files.length;
      if (files.length < 1000) break;
    }
  }
  // Las notas se quedan; la referencia a la foto, no.
  const { data: cleared, error: gErr } = evaluations.length
    ? await admin.from("grades").update({ photo_path: null }).in("evaluation_id", evaluations.map((e) => e.id)).not("photo_path", "is", null).select("id")
    : { data: [], error: null };
  if (gErr) return reply(500, { error: "Se borraron las fotos, pero no la referencia en las notas.", removed });
  return reply(200, { removed, grades: (cleared ?? []).length });
});
