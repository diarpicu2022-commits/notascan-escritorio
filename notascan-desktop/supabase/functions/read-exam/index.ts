// NotaScan · leer una foto de examen (paso 6d, 2026-10-06). Servicio de visión decidido por Diego: Claude Haiku 4.5.
// La clave de Anthropic vive solo aquí (secreto ANTHROPIC_API_KEY de la función); nunca llega a la app.
// Todo se hace con la sesión de quien llama: el RLS decide qué evaluación, qué estudiantes y qué foto puede usar, y la
// nota se guarda con sus permisos (grades_insert/update: solo el docente dueño de la evaluación).
// El modelo solo LEE (código, nombre y nota); quién es el estudiante lo decide match.ts contra la lista del curso.
// Privacidad: la foto se envía a Anthropic únicamente para esta lectura; se guarda en el bucket privado y se borra al
// cerrar el periodo (decisión de Diego; va en la política de tratamiento de datos).
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { matchReading, type Reading } from "./match.ts";

const MODEL = "claude-haiku-4-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Respuesta con forma fija (structured outputs: output_config.format con json_schema).
const CLARITY = { type: "string", enum: ["clear", "doubtful", "unreadable"] };
const READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["code", "code_clarity", "name", "grade", "grade_clarity"],
  properties: {
    code: { anyOf: [{ type: "string" }, { type: "null" }], description: "Código estudiantil escrito en la hoja, solo dígitos; un «?» por cada dígito que no se entienda. null si no hay código." },
    code_clarity: CLARITY,
    name: { anyOf: [{ type: "string" }, { type: "null" }], description: "Nombre del estudiante tal como está escrito. null si no hay nombre." },
    grade: { anyOf: [{ type: "number" }, { type: "null" }], description: "Nota final en la escala 1.0 a 5.0 (por ejemplo 4.5). null si no hay nota o no se entiende." },
    grade_clarity: CLARITY,
  },
};
const CLARITIES = ["clear", "doubtful", "unreadable"];

/** Comprueba la forma de la lectura antes de usarla (no se confía en el texto sin validar). */
function toReading(x: unknown): Reading | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const strOrNull = (v: unknown) => v === null || typeof v === "string";
  if (!strOrNull(o.code) || !strOrNull(o.name) || !(o.grade === null || typeof o.grade === "number")) return null;
  if (!CLARITIES.includes(o.code_clarity as string) || !CLARITIES.includes(o.grade_clarity as string)) return null;
  return o as unknown as Reading;
}

const INSTRUCTIONS = `Eres el lector de NotaScan. Recibes la foto de un examen de un colegio colombiano ya calificado por el docente.
Lee tres cosas y nada más:
1. El código estudiantil que escribió el estudiante (8 dígitos, empieza por el año, por ejemplo 20261175).
2. El nombre del estudiante tal como está escrito.
3. La nota final que puso el docente, en la escala de 1.0 a 5.0 (puede estar escrita «4,5», «4.5» o encerrada en un círculo).
Reglas:
- No adivines. Si un dígito del código no se entiende, escribe «?» en su lugar y marca code_clarity como "doubtful".
- Si la nota se puede leer pero con duda, márcala "doubtful"; si no se puede leer, grade null y "unreadable".
- Ignora puntajes parciales de cada pregunta: solo la nota final.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido." });

  const firstOf = (json: string | undefined) => { try { return Object.values(JSON.parse(json ?? "{}"))[0] as string | undefined; } catch { return undefined; } };
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || firstOf(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anon) return reply(500, { error: "La función no tiene sus claves de servidor configuradas." });
  if (!apiKey) return reply(503, { error: "El servicio de lectura de fotos aún no está configurado. Falta la clave del proveedor en Supabase." });
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply(401, { error: "Inicia sesión para calificar." });

  let body: { evaluation_id?: number; photo_path?: string } = {};
  try { body = await req.json(); } catch { return reply(400, { error: "Solicitud no válida." }); }
  if (!body.evaluation_id || !body.photo_path) return reply(400, { error: "Faltan la evaluación o la foto." });

  const caller = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
  const { data: user } = await caller.auth.getUser();
  const { data: role } = await caller.rpc("current_app_role");
  if (!user?.user || role !== "teacher") return reply(403, { error: "Solo el docente de la evaluación la califica." });
  if (!body.photo_path.startsWith(user.user.id + "/")) return reply(403, { error: "La foto no está en tu carpeta." });

  // La evaluación, con el RLS del docente: si no es suya, no la ve.
  const { data: ev } = await caller.from("evaluations").select("id, name, status, assignment:teaching_assignments(course_id, teacher_email)").eq("id", body.evaluation_id).maybeSingle();
  const evaluation = ev as unknown as { id: number; name: string; status: string; assignment: { course_id: string; teacher_email: string } | null } | null;
  if (!evaluation?.assignment) return reply(404, { error: "No encontramos esa evaluación entre las tuyas." });
  if (evaluation.status === "cerrada") return reply(409, { error: "La evaluación está cerrada. Solicita el cambio de nota a Rectoría." });

  const [{ data: roster, error: rosterErr }, { data: photo, error: photoErr }] = await Promise.all([
    caller.from("students").select("id, full_name").eq("course_id", evaluation.assignment.course_id).in("status", ["active", "pending"]),
    caller.storage.from("exam-photos").download(body.photo_path),
  ]);
  if (rosterErr) return reply(500, { error: "No pudimos leer la lista del curso." });
  if (photoErr || !photo) return reply(404, { error: "No encontramos la foto. Súbela de nuevo." });
  const mediaType = (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(photo.type) ? photo.type : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const bytes = new Uint8Array(await photo.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const data = btoa(bin);

  // Lectura con Haiku 4.5 y respuesta con forma fija (esquema).
  let reading: Reading;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: INSTRUCTIONS,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data } },
        { type: "text", text: "Lee el código, el nombre y la nota final de esta hoja." },
      ] }],
      output_config: { format: { type: "json_schema", schema: READING_SCHEMA } },
    });
    const text = response.content.find((b) => b.type === "text");
    let parsed: Reading | null = null;
    try { parsed = text && text.type === "text" ? toReading(JSON.parse(text.text)) : null; } catch { parsed = null; }
    if (response.stop_reason !== "end_turn" || !parsed) return reply(502, { error: "El servicio no pudo leer esta foto. Revísala y califícala a mano." });
    reading = parsed;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return reply(503, { error: "La clave del servicio de lectura no es válida. Revísala en Supabase." });
    if (e instanceof Anthropic.RateLimitError) return reply(429, { error: "El servicio de lectura está ocupado. Inténtalo en un momento." });
    if (e instanceof Anthropic.BadRequestError) {
      console.error("read-exam 400", e.message);
      // Anthropic responde 400 también cuando la cuenta no tiene saldo: se dice tal cual para que se resuelva en Billing.
      if (/credit balance/i.test(e.message)) return reply(402, { error: "La cuenta de Anthropic no tiene saldo. Carga créditos en console.anthropic.com → Billing.", detail: e.message });
      return reply(400, { error: "La foto no se pudo procesar (formato o tamaño). Prueba con otra foto.", detail: e.message });
    }
    if (e instanceof Anthropic.APIError) return reply(502, { error: "El servicio de lectura falló. Inténtalo de nuevo." });
    return reply(502, { error: "No pudimos conectar con el servicio de lectura." });
  }

  const m = matchReading(reading, ((roster ?? []) as Array<{ id: string; full_name: string }>).map((s) => ({ id: s.id, name: s.full_name })));
  const result = { reading: { code: reading.code, name: reading.name }, ...m };
  if (!m.studentId) return reply(200, { ...result, saved: false });

  // Una nota ya verificada por el docente no se reemplaza con una lectura nueva.
  const { data: existing } = await caller.from("grades").select("id, status").eq("evaluation_id", evaluation.id).eq("student_id", m.studentId).maybeSingle();
  if ((existing as { status: string } | null)?.status === "verified") return reply(200, { ...result, saved: false, note: (m.note ? m.note + " " : "") + "Esta nota ya estaba verificada; no se cambió." });
  const { error: saveErr } = await caller.from("grades").upsert({
    evaluation_id: evaluation.id, student_id: m.studentId, detected: m.detected, confidence: m.confidence, value: m.detected,
    status: m.status, photo_path: body.photo_path,
  }, { onConflict: "evaluation_id,student_id" });
  if (saveErr) return reply(500, { ...result, saved: false, error: /cerrada/.test(saveErr.message) ? saveErr.message : "No pudimos guardar la lectura." });
  return reply(200, { ...result, saved: true });
});
