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
  const cons = watchConsole(page);
  await mockApi(page);

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

  // El único error permitido es el 400 simulado de la aprobación de #244.
  const real = cons.filter((m) => !/status of 400/.test(m));
  report.check("Consola: solo el error de red simulado (1)", real.length === 0 && cons.length === 1, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
