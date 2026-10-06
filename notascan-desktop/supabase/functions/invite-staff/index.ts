// NotaScan · invitar al personal por correo (paso 7e, 2026-10-04).
// La invitación usa la clave de servicio, que Supabase pone dentro de la función (SUPABASE_SERVICE_ROLE_KEY): nunca
// llega a la app. Antes de invitar se comprueba con la sesión de quien llama:
//   · Plataforma: invita a una persona de la Secretaría de un colegio ({ institution_id, email }) o, sin correo, a
//     todas las que aún no tienen cuenta ({ institution_id }, el alta de un colegio nuevo).
//   · Secretaría: invita a una persona registrada en el directorio de SU colegio ({ email }).
// Solo se invita a quien ya está en el directorio y aún no tiene cuenta. El correo trae un código numérico
// (plantilla «Invite user» con {{ .Token }}) que la persona escribe en la app para crear su contraseña.
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

  // Claves que Supabase pone dentro de la función: las clásicas o, en proyectos con el modelo nuevo, las publicables
  // y secretas (JSON con nombre → clave). Ninguna sale de aquí.
  const firstOf = (json: string | undefined) => { try { return Object.values(JSON.parse(json ?? "{}"))[0] as string | undefined; } catch { return undefined; } };
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || firstOf(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || firstOf(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (!anon || !service) return reply(500, { error: "La función no tiene sus claves de servidor configuradas." });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply(401, { error: "Inicia sesión para enviar invitaciones." });

  // Quién llama, con su propia sesión (RLS y funciones de la base).
  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const [{ data: role }, { data: myInstitution }] = await Promise.all([caller.rpc("current_app_role"), caller.rpc("current_institution")]);
  if (role !== "platform" && role !== "admin") return reply(403, { error: "Solo la plataforma o la Secretaría envían invitaciones." });

  let body: { email?: string; institution_id?: string } = {};
  try { body = await req.json(); } catch { return reply(400, { error: "Solicitud no válida." }); }

  const admin = createClient(url, service, { auth: { persistSession: false } });

  // A quién se invita: siempre alguien registrado en el directorio y sin cuenta todavía.
  let query = admin.from("staff_directory").select("email, full_name, institution_id, role");
  if (role === "platform") {
    if (!body.institution_id) return reply(400, { error: "Falta el colegio." });
    query = query.eq("institution_id", body.institution_id).eq("role", "admin");
    const one = (body.email ?? "").trim().toLowerCase();
    if (one) query = query.eq("email", one);
  } else {
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) return reply(400, { error: "Falta el correo." });
    query = query.eq("email", email).eq("institution_id", myInstitution);
  }
  const { data: staff, error: staffErr } = await query;
  if (staffErr) return reply(500, { error: "No pudimos consultar el directorio." });
  if (!staff?.length) return reply(404, { error: role === "platform" ? (body.email ? "Esa persona no es de la Secretaría de este colegio." : "El colegio no tiene una cuenta de Secretaría registrada.") : "Esa persona no está registrada en el directorio de tu colegio." });

  const { data: existing } = await admin.from("profiles").select("email, status").in("email", staff.map((s) => s.email));
  const active = new Set((existing ?? []).filter((p) => p.status === "active").map((p) => p.email));
  const pending = staff.filter((s) => !active.has(s.email));
  if (!pending.length) return reply(409, { error: "Ya tiene una cuenta activa. Si olvidó su contraseña, puede restablecerla desde el inicio de sesión." });

  const sent: string[] = [];
  for (const s of pending) {
    const invited = (existing ?? []).some((p) => p.email === s.email);
    // Ya invitada antes: se reenvía con un código nuevo (enlace mágico de su usuario sin confirmar).
    const res = invited
      ? await admin.auth.signInWithOtp({ email: s.email, options: { shouldCreateUser: false } })
      : await admin.auth.admin.inviteUserByEmail(s.email, { data: { full_name: s.full_name } });
    if (res.error) {
      const rate = /rate limit|too many/i.test(res.error.message);
      return reply(rate ? 429 : 502, { error: rate ? "Supabase limita los correos por hora. Inténtalo más tarde." : "No pudimos enviar la invitación.", detail: res.error.message, sent });
    }
    sent.push(s.email);
  }
  return reply(200, { sent });
});
