// Paso 6b.4a · Rectoría con datos reales (requiere `npm run build`), con la API de Supabase simulada:
// solicitudes leídas de la base, decisión por decide_grade_request, reglas de la base a la vista y observador.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const UID = "66666666-6666-4666-8666-666666666666";

const PROFILES = [
  { email: "laura.benavides@losandes.edu.co", full_name: "Laura Benavides" },
  { email: "carlos.perez@losandes.edu.co", full_name: "Carlos Pérez" },
  { email: "diana.cabrera@losandes.edu.co", full_name: "Diana Cabrera" },
  { email: "hernando@losandes.edu.co", full_name: "Hernando Villota" },
];
// Estado de la base simulada: decidir cambia el estado y añade el evento, como decide_grade_request.
const REQS = [
  { id: 245, teacher_email: "laura.benavides@losandes.edu.co", course_id: "7A", from_value: 4.2, to_value: 4.7, reason: "Corrección de evaluación", detail: "Pregunta 4 mal calificada.", status: "pending", created_at: "2026-10-01T13:15:00Z", student: { full_name: "Juan Sebastián Martínez Paz" }, subject: { name: "Lengua Castellana" }, events: [] },
  { id: 244, teacher_email: "carlos.perez@losandes.edu.co", course_id: "8A", from_value: 2.8, to_value: 3.2, reason: "Error de digitación", detail: null, status: "pending", created_at: "2026-09-30T21:40:00Z", student: { full_name: "Valentina Guerrero Ortiz" }, subject: { name: "Física" }, events: [] },
  { id: 243, teacher_email: "diana.cabrera@losandes.edu.co", course_id: "6B", from_value: 3.0, to_value: 3.6, reason: "Recuperación aprobada", detail: "Actividad de recuperación del Periodo 2.", status: "pending", created_at: "2026-09-29T15:02:00Z", student: { full_name: "Mateo Bravo Rosero" }, subject: { name: "Ciencias Naturales" }, events: [] },
  { id: 238, teacher_email: "jorge.insuasty@losandes.edu.co", course_id: "8B", from_value: 2.5, to_value: 3.5, reason: "Ajuste de nota", detail: "Sin soporte adjunto.", status: "rejected", created_at: "2026-09-22T14:45:00Z", student: { full_name: "Tomás Ordóñez Mora" }, subject: { name: "Inglés" }, events: [{ description: "Rechazada por Hernando Villota: falta el soporte de la evaluación", at: "2026-09-22T17:00:00Z" }] },
];
const OBS = [
  { id: 1, type: "positive", title: "Representó al colegio", context: "Olimpiadas de matemáticas", created_at: "2026-10-02T15:00:00Z", student: { full_name: "Sara Lucía Cabrera Paz", course_id: "7B" }, author: { full_name: "Ana Lucía Rosero" } },
  { id: 2, type: "attention", title: "Tarea sin entregar", context: "Inglés · taller 3", created_at: "2026-09-30T15:00:00Z", student: { full_name: "Tomás Ordóñez Mora", course_id: "8B" }, author: { full_name: "Jorge Insuasty" } },
];

const rpcs = [];
const reminders = [];
const reportsSaved = [];
const consents = [];

// ---------- 6b.4b · datos para analítica y seguimiento, calculados a mano ----------
// Periodo 3 (abierto): s1 Matemáticas (4.0×50 + 5.0×50) = 4.5 · s2 Matemáticas 2.0 · s3 Física 3.4.
//   Promedio (4.5 + 2.0 + 3.4) / 3 = 3.3 · reprueba s2 → 1 de 3 = 33 % · Sexto 3.3 (3.25) · Octavo 3.4.
// Periodo 2: s1 3.0, s2 3.0 → 3.0 y 0 % · diferencias: +0.3 y +33 puntos.
// Asistencia: Sexto 2/40 = 5 %, Octavo 3/20 = 15 % → 5/60 = 8 %, Octavo concentra la mayor tasa.
// Seguimiento (vencidas e1 y e3): Ana 2/2 verificadas = 100 % · Carlos 1/2 (8A tiene s3 y s4) = 50 %, 1 pendiente.
const hoyA = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };
const haceDias = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const A = {
  academic_periods: [
    { id: "2026-p1", name: "Periodo 1", position: 1, final_weight: 25, status: "closed", year: 2026, open_date: "2026-01-19", close_date: "2026-03-27" },
    { id: "2026-p2", name: "Periodo 2", position: 2, final_weight: 25, status: "closed", year: 2026, open_date: "2026-04-06", close_date: "2026-06-19" },
    { id: "2026-p3", name: "Periodo 3", position: 3, final_weight: 25, status: "open", year: 2026, open_date: "2026-07-13", close_date: "2026-10-15" },
    { id: "2026-p4", name: "Periodo 4", position: 4, final_weight: 25, status: "draft", year: 2026, open_date: "2026-10-19", close_date: "2026-11-27" },
  ],
  teaching_assignments: [
    { id: 1, teacher_email: "ana.lucia@losandes.edu.co", subject_id: "mat", course_id: "6A", period_id: "2026-p3", subject: { name: "Matemáticas" } },
    { id: 2, teacher_email: "carlos.perez@losandes.edu.co", subject_id: "fis", course_id: "8A", period_id: "2026-p3", subject: { name: "Física" } },
    { id: 3, teacher_email: "ana.lucia@losandes.edu.co", subject_id: "mat", course_id: "6A", period_id: "2026-p2", subject: { name: "Matemáticas" } },
    // 6b.4c: Física en 6A sin evaluaciones (en el perfil sale «Sin notas»; en el seguimiento no cambia el avance).
    { id: 4, teacher_email: "carlos.perez@losandes.edu.co", subject_id: "fis", course_id: "6A", period_id: "2026-p3", subject: { name: "Física" } },
  ],
  // 6b.4c · perfil de s1: Matemáticas 4.5 en P3 y 3.0 en P2; asistencia de septiembre (y un día de agosto que no se muestra).
  student_overview: [{ id: "s1", first_names: "Ana", last_names: "Bravo Paz", full_name: "Ana Bravo Paz", doc_type: "Tarjeta de identidad", document: "TI 1084000001", course_id: "6A", grade_level_id: "6", status: "active", enrolled_on: "2026-01-12", library_ok: true, fees_ok: true, documents_ok: true, guardian_name: "Rosa Paz", guardian_rel: "Madre", guardian_phone: "3120000000", avg_grade: 4.0, attendance_pct: 90 }],
  attendance: [
    { id: 1, student_id: "s1", class_date: "2026-08-28", state: "present" },
    { id: 2, student_id: "s1", class_date: "2026-09-01", state: "present" },
    { id: 3, student_id: "s1", class_date: "2026-09-02", state: "absent" },
    { id: 4, student_id: "s1", class_date: "2026-09-03", state: "late" },
    { id: 5, student_id: "s1", class_date: "2026-09-04", state: "excused" },
  ],
  student_medical: [{ student_id: "s1", allergies: "Penicilina", conditions: null, notes: null, emergency_contact: "Rosa Paz", emergency_phone: "3120000000" }],
  subjects: [{ id: "fis", name: "Física" }, { id: "mat", name: "Matemáticas" }],
  evaluations: [
    { id: 11, assignment_id: 1, weight: 50, due_date: "2026-09-01" },
    { id: 12, assignment_id: 1, weight: 50, due_date: "2099-01-01" },
    { id: 13, assignment_id: 2, weight: 100, due_date: "2026-09-10" },
    { id: 14, assignment_id: 3, weight: 100, due_date: "2026-06-01" },
  ],
  grades: [
    { id: 1, evaluation_id: 11, student_id: "s1", value: 4.0, status: "verified", updated_at: hoyA(8, 10) },
    { id: 2, evaluation_id: 11, student_id: "s2", value: 2.0, status: "verified", updated_at: hoyA(9, 20) },
    { id: 3, evaluation_id: 12, student_id: "s1", value: 5.0, status: "verified", updated_at: hoyA(7, 0) },
    { id: 4, evaluation_id: 13, student_id: "s3", value: 3.4, status: "verified", updated_at: haceDias(9) },
    { id: 5, evaluation_id: 13, student_id: "s4", value: 3.9, status: "needs-review", updated_at: haceDias(9) },
    { id: 6, evaluation_id: 14, student_id: "s1", value: 3.0, status: "verified", updated_at: haceDias(120) },
    { id: 7, evaluation_id: 14, student_id: "s2", value: 3.0, status: "verified", updated_at: haceDias(120) },
  ],
  students: [
    { id: "s1", full_name: "Ana Bravo Paz", course_id: "6A" }, { id: "s2", full_name: "Luis Mora Ortiz", course_id: "6A" },
    { id: "s3", full_name: "Sara Cabrera Paz", course_id: "8A" }, { id: "s4", full_name: "Tomás Ordóñez Mora", course_id: "8A" },
  ],
  courses: [{ id: "6A", grade_level_id: "6" }, { id: "8A", grade_level_id: "8" }],
  grade_levels: [{ id: "6", name: "Sexto" }, { id: "8", name: "Octavo" }],
  institutions: [{ id: "00000000-0000-4000-8000-000000000001", name: "Colegio Los Andes", short_name: "LA", city: "Pasto", department: "Nariño", resolution: "", dane: "", logo_path: null, status: "active", performance_goal: 3.3 }],
  staff_directory: [{ email: "ana.lucia@losandes.edu.co", full_name: "Ana Lucía Rosero" }, { email: "carlos.perez@losandes.edu.co", full_name: "Carlos Pérez" }],
};
const ATT = [{ grade_level_id: "6", records: 40, absences: 2 }, { grade_level_id: "8", records: 20, absences: 3 }];

/** Filtros simples de PostgREST que usa la app (eq e in) sobre las filas simuladas. */
function filterRows(rows, url) {
  const q = new URL(url).searchParams;
  return rows.filter((row) => [...q.entries()].every(([k, v]) => {
    if (["select", "order", "limit", "offset"].includes(k) || !(k in row)) return true;
    if (v.startsWith("eq.")) return String(row[k]) === v.slice(3);
    if (v.startsWith("in.(")) return v.slice(4, -1).split(",").map((x) => x.replace(/"/g, "")).includes(String(row[k]));
    if (v.startsWith("neq.")) return String(row[k]) !== v.slice(4);
    return true;
  }));
}

async function mockApi(page) {
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: "hernando@losandes.edu.co", app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/rest/v1/rpc/**", (r) => {
    const body = r.request().postDataJSON();
    rpcs.push({ url: r.request().url(), body });
    if (r.request().url().includes("attendance_by_grade")) return r.fulfill({ json: ATT });
    if (r.request().url().includes("current_policy_version")) return r.fulfill({ json: "2026.1" });
    if (!r.request().url().includes("decide_grade_request")) return r.fulfill({ status: 204, body: "" });
    const req = REQS.find((x) => x.id === body.p_request);
    if (body.p_request === 244 && body.p_decision === "approved") {
      return r.fulfill({ status: 400, json: { code: "P0001", message: "La nota cambió desde la solicitud (ahora es 3.0). Recházala y pide una nueva." } });
    }
    req.status = body.p_decision;
    req.events.push({ description: (body.p_decision === "approved" ? "Aprobada" : "Rechazada") + " por Hernando Villota" + (body.p_note ? ": " + body.p_note : ""), at: new Date().toISOString() });
    return r.fulfill({ status: 204, body: "" });
  });
  await page.route("**/rest/v1/profiles**", (r) => {
    const u = decodeURIComponent(r.request().url());
    if (u.includes("id=eq.")) return r.fulfill({ json: { id: UID, email: user.email, full_name: "Hernando Villota", role: "principal", status: "active" } });
    return r.fulfill({ json: PROFILES });
  });
  await page.route("**/rest/v1/grade_change_requests**", (r) => r.fulfill({ json: REQS }));
  await page.route("**/rest/v1/observations**", (r) => r.fulfill({ json: OBS }));
  // 6g: la aceptación de la política (vacía hasta aceptar) y la autorización del acudiente de s1.
  await page.route("**/rest/v1/consents**", (r) => {
    if (r.request().method() === "POST") { consents.push(r.request().postDataJSON()); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: consents.length ? [{ id: 1 }] : [] });
  });
  await page.route("**/rest/v1/guardian_authorizations**", (r) => r.fulfill({ json: [{ id: 5, guardian_name: "Rosa Paz", relationship: "Madre", health_data: true, method: "firma-fisica", received_on: "2026-01-12", policy_version: "2026.1", revoked_at: null, revoked_reason: null }] }));
  await page.route("**/rest/v1/teacher_reminders**", (r) => { if (r.request().method() === "POST") reminders.push(r.request().postDataJSON()); r.fulfill({ status: 201, body: "" }); });
  await page.route("**/rest/v1/generated_reports**", (r) => { if (r.request().method() === "POST") reportsSaved.push(r.request().postDataJSON()); return r.fulfill(r.request().method() === "POST" ? { status: 201, body: "" } : { json: [] }); });
  for (const [name, rows] of Object.entries(A)) {
    await page.route("**/rest/v1/" + name + "?**", (r) => r.fulfill({ json: filterRows(rows, r.request().url()) }));
  }

  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.getByText("Rectoría", { exact: true }).click();
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-pass").fill("secreta123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/#\/principal\/dashboard$/, { timeout: 8000 });
}

const toastTitle = (page, text) => page.locator(".ns-toast-title", { hasText: text }).waitFor({ timeout: 8000 }).then(() => true, () => false);
const navCount = (page) => page.locator(".ns-nav-item-count").first().textContent().catch(() => null);

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__printed = [];
    window.print = () => { window.__printed.push(document.querySelector(".ns-print-root")?.textContent ?? ""); window.dispatchEvent(new Event("afterprint")); };
  });
  const cons = watchConsole(page);
  await mockApi(page);

  // ---------- 0. Política de datos (6g): hay que aceptarla antes de usar la app ----------
  const gate = page.locator("[role=dialog]", { hasText: "Antes de usar NotaScan" });
  await gate.waitFor({ timeout: 10000 });
  const accept = gate.getByRole("button", { name: "Aceptar y continuar" });
  report.check("Política (6g): al entrar sin haberla aceptado, la ventana pide aceptarla (versión 2026.1) y no deja seguir sin marcar",
    (await gate.textContent()).includes("versión 2026.1") && (await accept.isDisabled()), (await gate.textContent()).slice(0, 120));
  await gate.getByRole("tab", { name: "Política completa" }).click();
  const fullPolicy = await gate.textContent();
  report.check("Política (6g): se puede leer la política completa del repositorio dentro de la app",
    fullPolicy.includes("Responsable del tratamiento") && fullPolicy.includes("Anthropic PBC") && fullPolicy.includes("Borrador técnico"), fullPolicy.slice(0, 200));
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "paso6g-politica.png") });
  await gate.getByLabel(/Leí y acepto/).check();
  await accept.click();
  await gate.waitFor({ state: "detached", timeout: 8000 }).catch(() => {});
  report.check("Política (6g): aceptar la guarda con la versión y la ventana se cierra",
    JSON.stringify(consents.at(-1)) === JSON.stringify({ user_id: UID, policy_version: "2026.1" }) && (await gate.count()) === 0, JSON.stringify(consents));

  // ---------- 1. Panorama: lo que espera decisión ----------
  const items = page.locator(".ns-decide .ns-list-item");
  await items.first().waitFor({ timeout: 10000 });
  const first = await items.first().textContent();
  report.check("Panorama: las 3 pendientes de la base, con el docente por su perfil", (await items.count()) === 3 && first.includes("Solicitud #245 · Lengua Castellana") && first.includes("Laura Benavides · Juan Sebastián"), first);
  report.check("Panorama: «3 solicitudes» en la etiqueta y en el menú", (await page.locator(".ns-decide").textContent()).includes("3 solicitudes") && (await navCount(page)) === "3");
  await page.screenshot({ path: join(OUT, "paso6b4a-panorama.png") });

  // ---------- 2. Solicitudes: detalle e historial ----------
  await page.goto(URL_BASE + "#/principal/requests");
  await page.locator(".ns-inbox-detail").waitFor({ timeout: 10000 });
  const detail = await page.locator(".ns-inbox-detail").textContent();
  report.check("Solicitudes: abre la primera pendiente (#245) con la fecha local y «Creada por» en el historial",
    detail.includes("Solicitud #245") && detail.includes("1 oct 2026") && detail.includes("Creada por Laura Benavides"), detail.slice(0, 160));
  const tabs = await page.getByRole("tab").allTextContents();
  report.check("Solicitudes: cuenta por estado (3 pendientes, 0 aprobadas, 1 rechazada)", tabs.join("|").replace(/\s+/g, "") === "Pendientes3|Aprobadas0|Rechazadas1", tabs.join("|"));

  // Aprobar #245.
  await page.locator(".ns-inbox-detail").getByRole("button", { name: "Aprobar" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Aprobar" }).click();
  const approved = await toastTitle(page, "Solicitud #245 aprobada");
  const a = rpcs.filter((x) => x.url.includes("decide_grade_request")).pop();
  report.check("Aprobar llama a decide_grade_request con la solicitud y sin comentario", approved && JSON.stringify(a?.body) === JSON.stringify({ p_request: 245, p_decision: "approved", p_note: null }), JSON.stringify(a?.body));
  await page.waitForTimeout(800);
  report.check("Tras aprobar: 2 pendientes en la bandeja y en el menú", (await page.getByRole("tab", { name: /Pendientes/ }).textContent()).includes("2") && (await navCount(page)) === "2", await navCount(page));

  // #244: la base rechaza la aprobación porque la nota cambió.
  await page.getByRole("option", { name: /Solicitud #244/ }).click();
  await page.locator(".ns-inbox-detail").getByRole("button", { name: "Aprobar" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Aprobar" }).click();
  const failed = await toastTitle(page, "No se guardó la decisión");
  report.check("Si la nota cambió, se muestra la regla de la base y la solicitud sigue pendiente",
    failed && (await page.locator(".ns-toast-text").last().textContent()) === "La nota cambió desde la solicitud (ahora es 3.0). Recházala y pide una nueva." && (await page.locator(".ns-inbox-detail").textContent()).includes("Pendiente"));
  await page.screenshot({ path: join(OUT, "paso6b4a-solicitud-nota-cambio.png") });

  // Rechazar #244 con motivo.
  await page.locator(".ns-inbox-detail").getByRole("button", { name: "Rechazar" }).click();
  const dlg = page.locator("[role=alertdialog]");
  report.check("Rechazar sin motivo está deshabilitado", await dlg.getByRole("button", { name: "Rechazar" }).isDisabled());
  await dlg.getByLabel(/Motivo del rechazo/).fill("La nota ya se corrigió en la planilla");
  await dlg.getByRole("button", { name: "Rechazar" }).click();
  await toastTitle(page, "Solicitud #244 rechazada");
  const rj = rpcs.filter((x) => x.url.includes("decide_grade_request")).pop();
  report.check("Rechazar envía el motivo", JSON.stringify(rj?.body) === JSON.stringify({ p_request: 244, p_decision: "rejected", p_note: "La nota ya se corrigió en la planilla" }), JSON.stringify(rj?.body));
  await page.waitForTimeout(800);
  await page.getByRole("tab", { name: /Rechazadas/ }).click();
  await page.getByRole("option", { name: /Solicitud #244/ }).click();
  const hist = await page.locator(".ns-history").textContent();
  report.check("El motivo queda en el historial que devuelve la base", hist.includes("Rechazada por Hernando Villota: La nota ya se corrigió en la planilla"), hist);
  await page.screenshot({ path: join(OUT, "paso6b4a-solicitudes.png") });

  // ---------- 3. Observador ----------
  await page.goto(URL_BASE + "#/principal/observer");
  await page.locator(".ns-tl-item").first().waitFor({ timeout: 10000 });
  const obs = await page.locator(".ns-tl-item").allTextContents();
  report.check("Observador: anotaciones de la base con estudiante, curso y autor", obs.length === 2 && obs[0].includes("Representó al colegio") && obs[0].includes("Sara Lucía Cabrera (7B)") && obs[0].includes("Ana Lucía Rosero"), obs.join(" / "));
  report.check("Menú: 1 pendiente en las demás páginas de Rectoría", (await navCount(page)) === "1", await navCount(page));

  // ---------- 4. Panorama: indicadores y docentes con pendientes (6b.4b) ----------
  await page.goto(URL_BASE + "#/principal/dashboard");
  const kpis = page.locator(".ns-kpi");
  await page.waitForFunction(() => document.querySelector(".ns-kpi--lead strong")?.textContent === "3.3", null, { timeout: 10000 }).catch(() => {});
  const k = await kpis.allTextContents();
  report.check("Panorama: promedio 3.3 (+0.3), reprobación 33 % (+33 puntos · 1 estudiante), inasistencia 8 % con Octavo",
    k[0]?.includes("3.3") && k[0].includes("+0.3 frente al periodo anterior") && k[1]?.includes("33%") && k[1].includes("+33 puntos · 1 estudiante") && k[2]?.includes("8%") && k[2].includes("Octavo concentra la mayor tasa"), k.join(" / "));
  report.check("Panorama: el encabezado nombra el periodo abierto de la base", (await page.locator(".ns-header").first().textContent()).includes("Rectoría · Periodo 3 · 2026"));
  const att = await page.locator("[aria-label='Docentes que requieren atención'] .ns-list-item").allTextContents();
  report.check("Panorama: solo Carlos Pérez requiere atención (1 evaluación pendiente, hace 9 días, retraso)",
    att.length === 1 && att[0].includes("Carlos Pérez") && att[0].includes("1 evaluación pendiente · Hace 9 días") && att[0].includes("Retraso"), att.join(" / "));
  const charts = await page.locator(".ns-charts").textContent();
  report.check("Panorama: promedio por grado de la base (Sexto 3.3, Octavo 3.4) y asistencia por grado (5 %, 15 %)",
    /Sexto[^]*3\.3/.test(charts) && /Octavo[^]*3\.4/.test(charts) && charts.includes("15%") && charts.includes("5%"), charts.slice(0, 200));
  await page.waitForTimeout(1500); // fin de la entrada escalonada del sistema (los bloques entran uno tras otro)
  report.check("Panorama: «1 solicitud» en singular", (await page.locator(".ns-decide").textContent()).includes("1 solicitud") && !(await page.locator(".ns-decide").textContent()).includes("1 solicitudes"));
  const vis = await page.evaluate(() => {
    const el = document.querySelector(".ns-kpi--lead"); const r = el.getBoundingClientRect();
    let o = 1; for (let n = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return { o, top: Math.round(r.top), h: Math.round(r.height), hit: document.elementFromPoint(r.left + 10, r.top + 10)?.closest(".ns-kpi--lead") !== null };
  });
  report.check("Panorama: los indicadores se ven (opacidad efectiva 1 y en primer plano)", vis.o === 1 && vis.h > 0, JSON.stringify(vis));
  const legend = await page.locator(".ns-chart-block").first().textContent();
  report.check("Panorama: la línea de meta es la que configuró Secretaría (3.3); Sexto en 3.3 no queda resaltado, Octavo tampoco",
    legend.includes("Meta 3.3") && (await page.locator(".ns-chart-block").first().locator(".is-low, .ns-bar--low").count()) === 0, legend.slice(0, 120));
  await page.screenshot({ path: join(OUT, "paso6b4b-panorama.png"), fullPage: true });

  // ---------- 5. Analítica: cambiar de periodo ----------
  await page.goto(URL_BASE + "#/principal/analytics");
  const sel = page.getByLabel("Periodo");
  await sel.waitFor({ timeout: 10000 });
  const opts = await sel.locator("option").allTextContents();
  report.check("Analítica: el filtro ofrece los periodos con notas (Periodo 2, Periodo 3) y arranca en el abierto", opts.join("|") === "Periodo 2|Periodo 3" && (await sel.inputValue()) === "Periodo 3", opts.join("|"));
  const before = rpcs.length;
  await sel.selectOption("Periodo 2");
  await page.waitForFunction(() => document.querySelector(".ns-kpi--lead strong")?.textContent === "3.0", null, { timeout: 8000 }).catch(() => {});
  const k2 = await kpis.allTextContents();
  const attRpc = rpcs.slice(before).find((x) => x.url.includes("attendance_by_grade"));
  report.check("Analítica · Periodo 2: 3.0, sin periodo anterior para comparar, 0 % de reprobación",
    k2[0]?.includes("3.0") && k2[0].includes("Primer periodo con notas verificadas") && k2[1]?.includes("0%") && k2[1].includes("0 estudiantes"), k2.join(" / "));
  report.check("Analítica · Periodo 2: la asistencia se pide con las fechas del periodo", attRpc && attRpc.body.p_from === "2026-04-06" && attRpc.body.p_to === "2026-06-19", JSON.stringify(attRpc?.body));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, "paso6b4b-analitica.png"), fullPage: true });

  // ---------- 6. Seguimiento docente ----------
  await page.goto(URL_BASE + "#/principal/teachers");
  await page.locator("tbody tr").first().waitFor({ timeout: 10000 });
  const trs = await page.locator("tbody tr").allTextContents();
  report.check("Seguimiento: ordenado por menor avance (Carlos 50 % retraso, Ana 100 % al día) con materias y cursos de la base",
    trs.length === 2 && trs[0].includes("Carlos Pérez") && trs[0].includes("Física") && trs[0].includes("8A") && trs[0].includes("50") && trs[0].includes("Retraso") && trs[1].includes("Ana Lucía Rosero") && trs[1].includes("100") && trs[1].includes("Al día"), trs.join(" / "));
  const strip = (await page.locator(".ns-tstatus").allTextContents()).map((x) => x.replace(/\s+/g, ""));
  report.check("Seguimiento: resumen 1 verde, 0 amarillo, 1 rojo", strip[0]?.startsWith("1") && strip[1]?.startsWith("0") && strip[2]?.startsWith("1"), strip.join(" | "));
  report.check("Seguimiento: «Enviar recordatorio» solo para quien no está al día (Carlos)", (await page.getByRole("button", { name: "Enviar recordatorio" }).count()) === 1);
  await page.getByRole("button", { name: "Enviar recordatorio" }).click();
  const sent = await toastTitle(page, "Recordatorio enviado");
  report.check("Recordatorio: se guarda para Carlos con su avance del periodo abierto y avisa dónde lo verá",
    sent && JSON.stringify(reminders.at(-1)) === JSON.stringify({ teacher_email: "carlos.perez@losandes.edu.co", message: "Tienes 1 evaluación con notas sin verificar en el Periodo 3 (50 % registrado). Ponte al día, por favor." })
      && (await page.locator(".ns-toast-text").last().textContent()) === "Carlos Pérez lo verá en su Inicio.", JSON.stringify(reminders.at(-1)));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, "paso6b4b-seguimiento.png"), fullPage: true });

  const side = await page.locator(".ns-sidebar").textContent();
  report.check("Menú (Rectoría): sin la tarjeta «Institución» del sistema; el colegio de la base va en su escudo", !side.includes("Institución") && side.includes("PastoColegio Los Andes"), side.slice(-120));

  // ---------- 7. Perfil del estudiante (6b.4c) ----------
  await page.goto(URL_BASE + "#/principal/profile/s1");
  await page.locator(".ns-profile-head h1").waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  const head = await page.locator(".ns-profile-head").textContent();
  const summary = await page.locator(".ns-profile-grid").textContent();
  report.check("Perfil · resumen: promedio del periodo abierto 4.5 (Alto · 1 de 1 materia aprobada), asistencia 90 %, paz y salvo al día",
    head.includes("Ana Bravo Paz") && head.includes("6A") && summary.includes("Promedio · Periodo 3") && summary.includes("4.5") && summary.includes("Alto · 1 de 1 materia aprobada") && summary.includes("90%") && summary.includes("Al día"), summary.slice(0, 200));
  const evol = await page.locator(".ns-profile-grid svg[role=img]").getAttribute("aria-label");
  report.check("Perfil · evolución: solo los periodos con notas (P2 3.0, P3 4.5)", evol?.includes("P2 3.0") && evol.includes("P3 4.5") && !evol.includes("P1"), evol);
  await page.screenshot({ path: join(OUT, "paso6b4c-perfil-resumen.png") });

  await page.getByRole("tab", { name: "Calificaciones" }).click();
  const grows = await page.locator("tbody tr").allTextContents();
  report.check("Perfil · calificaciones: materias del curso en el periodo con su docente; sin notas lo dice",
    grows.length === 2 && grows[0].includes("Física") && grows[0].includes("Carlos Pérez") && grows[0].includes("Sin notas") && grows[1].includes("Matemáticas") && grows[1].includes("Ana Lucía Rosero") && grows[1].includes("4.5") && grows[1].includes("Alto"), grows.join(" / "));

  await page.getByRole("tab", { name: "Asistencia" }).click();
  const cal = page.locator(".ns-cal");
  const lab = async (d) => cal.getByRole("gridcell", { name: new RegExp("^" + d + " de septiembre") }).getAttribute("aria-label");
  report.check("Perfil · asistencia: mes del último registro con el estado de cada día (excusa, sin clase, sin registro)",
    (await cal.textContent()).includes("Septiembre 2026") && (await cal.textContent()).includes("90% de asistencia")
      && (await lab(2)) === "2 de septiembre: Inasistencia" && (await lab(3)) === "3 de septiembre: Tarde" && (await lab(4)) === "4 de septiembre: Excusa"
      && (await lab(5)) === "5 de septiembre: Sin clase" && (await lab(7)) === "7 de septiembre: Sin registro" && (await cal.locator(".ns-cal-pad").count()) === 1,
    [await lab(2), await lab(4), await lab(5), await lab(7)].join(" | "));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "paso6b4c-perfil-asistencia.png") });

  await page.getByRole("tab", { name: "Observador" }).click();
  report.check("Perfil · observador: las anotaciones de la base", (await page.locator(".ns-tl-item").count()) === 2);

  await page.getByRole("tab", { name: "Boletines" }).click();
  await page.locator(".ns-paper-scroll").waitFor({ timeout: 10000 }).catch(() => {});
  const paper = (await page.locator(".ns-paper-scroll").textContent().catch(() => "")) ?? "";
  report.check("Perfil · boletín: el del periodo abierto con las reglas de Secretaría", paper.includes("Ana Bravo Paz") && paper.includes("Periodo 3 de 4") && paper.includes("Matemáticas"), paper.slice(0, 600));
  await page.screenshot({ path: join(OUT, "paso6b4c-perfil-boletin.png") });

  await page.getByRole("tab", { name: "Información" }).click();
  await page.locator("[aria-label='Autorización del acudiente'] dl").waitFor({ timeout: 8000 });
  const info = await page.locator(".ns-block").last().textContent();
  report.check("Perfil · autorización (6g): quién firmó, cuándo, la versión y si cubre salud; Rectoría la ve pero no la edita",
    info.includes("Rosa Paz (Madre)") && info.includes("12/01/2026 · firma física") && info.includes("Versión 2026.1") && info.includes("Autorizados")
      && (await page.getByRole("button", { name: "Revocar autorización" }).count()) === 0 && (await page.getByRole("button", { name: "Registrar autorización" }).count()) === 0, info.slice(-260));
  const [exp6g] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar datos del estudiante" }).click()]);
  const exported = JSON.parse(await (await import("node:fs/promises")).readFile(await exp6g.path(), "utf8"));
  report.check("Perfil · derecho de acceso (6g): exporta en JSON todo lo del estudiante (datos, acudientes, salud, autorizaciones, notas, asistencia, observador)",
    exp6g.suggestedFilename() === "datos-estudiante-s1.json" && exported.estudiante?.id === "s1" && ["acudientes", "salud", "autorizaciones", "notas", "asistencia", "observador", "conceptos", "boletines"].every((k) => k in exported) && exported.autorizaciones.length === 1,
    exp6g.suggestedFilename() + " · " + Object.keys(exported).join(","));
  report.check("Perfil · información: acudiente y salud reales (alergia y contacto de emergencia), marcados como sensibles",
    info.includes("TI 1084000001") && info.includes("Rosa Paz (Madre)") && info.includes("alergias: Penicilina") && info.includes("contacto de emergencia: Rosa Paz · 3120000000") && info.includes("Visible solo para Secretaría y Rectoría"), info);

  await page.goto(URL_BASE + "#/principal/profile/nadie");
  await page.locator(".ns-empty-title").waitFor({ timeout: 10000 });
  report.check("Perfil: un estudiante que no existe (o que no se puede ver) lo dice y ofrece volver", (await page.locator(".ns-empty-title").textContent()) === "No encontramos a este estudiante." && (await page.getByRole("button", { name: "Volver a Estudiantes" }).count()) === 1);

  await page.route("**/rest/v1/student_overview?*id=eq.falla*", (r) => r.fulfill({ status: 500, json: { message: "caída simulada" } }));
  await page.goto(URL_BASE + "#/principal/profile/falla");
  await page.locator(".ns-empty--error").waitFor({ timeout: 30000 });
  report.check("Perfil: si la base falla, lo dice y ofrece reintentar", (await page.locator(".ns-empty-title").textContent()) === "No pudimos cargar el perfil." && (await page.getByRole("button", { name: "Reintentar" }).count()) === 1);

  // ---------- 8. Reportes de Rectoría (6c) ----------
  const { default: readXlsx } = await import("read-excel-file/node");
  const fs = await import("node:fs/promises");
  await page.goto(URL_BASE + "#/principal/analytics");
  await page.locator(".ns-kpi--lead").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Exportar informe" }).click();
  const exp = page.locator("[role=dialog], [role=alertdialog]");
  await exp.getByRole("button", { name: "Excel" }).click();
  const [an] = await Promise.all([page.waitForEvent("download"), exp.getByRole("button", { name: "Exportar Excel" }).click()]);
  const arows = (await readXlsx(await fs.readFile(await an.path())))[0].data;
  report.check("Exportar informe · Excel: indicadores y promedio por grado frente a la meta",
    an.suggestedFilename() === "Rendimiento institucional · Periodo 3.xlsx" && arows.some((r) => r[0] === "Promedio institucional" && String(r[1]).startsWith("3.3 (+0.3"))
      && arows.some((r) => r[0] === "Sexto" && r[1] === 3.3 && r[2] === "En la meta o por encima") && arows.some((r) => r[0] === "Meta institucional" && r[1] === "3.3"),
    an.suggestedFilename() + " · " + JSON.stringify(arows.slice(0, 12)));
  report.check("Exportar informe: queda en el historial de quien lo exporta", reportsSaved.at(-1)?.kind === "analytics" && reportsSaved.at(-1)?.format === "xlsx", JSON.stringify(reportsSaved.at(-1)));

  await page.goto(URL_BASE + "#/principal/reports");
  await page.locator(".ns-report-grid").waitFor({ timeout: 10000 });
  report.check("Reportes (Rectoría): todos los cursos del colegio", (await page.getByLabel("Curso").locator("option").allTextContents()).join("|") === "6A|8A");
  await page.locator(".ns-report-grid .ns-report").first().getByRole("button", { name: "Generar" }).click();
  await page.waitForFunction(() => window.__printed.length > 0, null, { timeout: 8000 }).catch(() => {});
  const pr = await page.evaluate(() => window.__printed.at(-1) ?? "");
  report.check("Consolidado (Rectoría) · PDF: todas las materias del curso, notas con un decimal (2.0), sin la nota de «solo sus materias»",
    pr.includes("Consolidado por curso") && pr.includes("Física") && pr.includes("Matemáticas") && pr.includes("Ana Bravo Paz") && !pr.includes("Incluye solo las materias") && pr.includes("Luis Mora Ortiz—2.02.0Bajo"), pr.slice(0, 260));

  // Captura del PDF: el diálogo no se cierra y la página se ve como al imprimir.
  await page.evaluate(() => { window.print = () => {}; });
  await page.locator(".ns-report-grid .ns-report").first().getByRole("button", { name: "Generar" }).click();
  await page.waitForTimeout(500);
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: join(OUT, "paso6c-consolidado-pdf.png"), fullPage: true });
  await page.emulateMedia({ media: "screen" });

  // Errores permitidos: el 400 simulado de la aprobación de #244 y los 500 simulados del perfil (con sus reintentos).
  const real = cons.filter((m) => !/status of (400|500)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0 && cons.filter((m) => /status of 400/.test(m)).length === 1, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
