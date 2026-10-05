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
    { id: "2026-p1", name: "Periodo 1", final_weight: 25, status: "closed", year: 2026, open_date: "2026-01-19", close_date: "2026-03-27" },
    { id: "2026-p2", name: "Periodo 2", final_weight: 25, status: "closed", year: 2026, open_date: "2026-04-06", close_date: "2026-06-19" },
    { id: "2026-p3", name: "Periodo 3", final_weight: 25, status: "open", year: 2026, open_date: "2026-07-13", close_date: "2026-10-15" },
    { id: "2026-p4", name: "Periodo 4", final_weight: 25, status: "draft", year: 2026, open_date: "2026-10-19", close_date: "2026-11-27" },
  ],
  teaching_assignments: [
    { id: 1, teacher_email: "ana.lucia@losandes.edu.co", subject_id: "mat", course_id: "6A", period_id: "2026-p3", subject: { name: "Matemáticas" } },
    { id: 2, teacher_email: "carlos.perez@losandes.edu.co", subject_id: "fis", course_id: "8A", period_id: "2026-p3", subject: { name: "Física" } },
    { id: 3, teacher_email: "ana.lucia@losandes.edu.co", subject_id: "mat", course_id: "6A", period_id: "2026-p2", subject: { name: "Matemáticas" } },
  ],
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
  report.check("Seguimiento: sin «Enviar recordatorio» mientras no haya canal real", (await page.getByRole("button", { name: "Enviar recordatorio" }).count()) === 0);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, "paso6b4b-seguimiento.png"), fullPage: true });

  // El único error permitido es el 400 simulado de la aprobación de #244.
  const real = cons.filter((m) => !/status of 400/.test(m));
  report.check("Consola: solo el error de red simulado (1)", real.length === 0 && cons.length === 1, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
