// Paso 6b · capa de datos en modo normal (requiere `npm run build`), con la API de Supabase simulada:
// transformación de filas, error y reintento, cambios guardados y revertidos, y aviso de dato viejo.
import { URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const UID = "22222222-2222-4222-8222-222222222222";

const ROWS = [
  { id: "20261175", first_names: "María Fernanda", last_names: "López Rosero", full_name: "María Fernanda López Rosero", doc_type: "Tarjeta de identidad", document: "TI 1084655210", course_id: "7A", grade_level_id: "7", status: "active", enrolled_on: "2026-01-12", library_ok: true, fees_ok: true, documents_ok: true, guardian_name: "Gloria López", guardian_rel: "Madre", guardian_phone: "3124567890", avg_grade: 4.3, attendance_pct: 96 },
  { id: "20261182", first_names: "Juan Sebastián", last_names: "Martínez Paz", full_name: "Juan Sebastián Martínez Paz", doc_type: "Tarjeta de identidad", document: "TI 1084512345", course_id: "7A", grade_level_id: "7", status: "pending", enrolled_on: "2026-01-19", library_ok: true, fees_ok: false, documents_ok: true, guardian_name: "Jorge Martínez", guardian_rel: "Padre", guardian_phone: "3157654321", avg_grade: null, attendance_pct: null },
];

async function signedInAdmin(page) {
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: "patricia@losandes.edu.co", app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: { id: UID, email: user.email, full_name: "Patricia Ortega", role: "admin", status: "active" } }));
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.getByText("Secretaría", { exact: true }).click();
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-pass").fill("secreta123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/#\/admin\/dashboard$/, { timeout: 8000 });
}

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  // Lo que la prueba no simula responde vacío (p. ej. el registro de último acceso, desde 6b.3a); las rutas
  // registradas después tienen prioridad.
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));

  // 1. Primera carga falla (500): estado de error; «Reintentar» recupera los datos.
  let overviewCalls = 0, failNext = true, patches = [];
  await page.route("**/rest/v1/student_overview**", (r) => {
    overviewCalls++;
    if (failNext) return r.fulfill({ status: 500, json: { message: "fallo simulado" } });
    return r.fulfill({ json: ROWS });
  });
  await page.route("**/rest/v1/students**", (r) => {
    if (r.request().method() === "PATCH") { patches.push({ url: r.request().url(), body: r.request().postDataJSON() }); return r.fulfill(patches.length === 1 ? { status: 204, body: "" } : { status: 403, json: { message: "denegado por RLS (simulado)" } }); }
    return r.continue();
  });
  await signedInAdmin(page);
  await page.goto(URL_BASE + "#/admin/students");
  await page.locator(".ns-empty--error").waitFor({ timeout: 15000 });
  report.check("Si la carga falla: estado de error «No pudimos cargar los estudiantes.»", (await page.locator(".ns-empty-title").textContent()) === "No pudimos cargar los estudiantes.", `${overviewCalls} intentos (incluye 1 reintento automático)`);
  failNext = false;
  await page.getByRole("button", { name: "Reintentar" }).click();
  await page.locator("tbody tr").first().waitFor();
  await page.waitForTimeout(300);
  report.check("«Reintentar» carga las filas de la base", (await page.locator("tbody tr").count()) === 2);

  // 2. Transformación de filas.
  const first = await page.locator("tbody tr").first().textContent();
  report.check("Fila: nombre, documento, grado, curso, acudiente, estado y fecha de matrícula", ["Juan Sebastián Martínez Paz", "TI 1084512345", "Séptimo", "7A", "Jorge Martínez", "Pendiente", "19 ene 2026"].every((t) => first.includes(t)), first);
  await page.locator("tbody tr", { hasText: "Juan Sebastián Martínez Paz" }).locator("button.ns-cell-link").click();
  const quick = await page.locator(".ns-drawer").textContent();
  report.check("Vista rápida: sin notas verificadas ni asistencia muestra «—» y «Sin registros»", quick.includes("Promedio actual—") && quick.includes("AsistenciaSin registros") && quick.includes("Paz y salvo con pendientes"), quick.slice(0, 200));
  await page.keyboard.press("Escape");

  // 3. Archivar guarda en la base (PATCH a students con status archived).
  await page.getByRole("button", { name: "Archivar María Fernanda López Rosero" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Archivar" }).click();
  await page.locator(".ns-toast-title").waitFor();
  report.check("Archivar envía el cambio a la base y confirma", patches[0]?.body?.status === "archived" && patches[0].url.includes("id=in.%2820261175%29") && (await page.locator(".ns-toast-title").textContent()) === "Registros archivados", JSON.stringify(patches[0]));

  // 4. Si la base lo rechaza: vuelve atrás y avisa.
  await page.locator(".ns-toast").getByRole("button", { name: "Cerrar aviso" }).click().catch(() => {});
  await page.getByRole("button", { name: "Retirar Juan Sebastián Martínez Paz" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Retirar" }).click();
  await page.locator(".ns-toast-title", { hasText: "No pudimos guardar" }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(300);
  const juanRow = await page.locator("tbody tr", { hasText: "Juan Sebastián Martínez Paz" }).textContent();
  report.check("Rechazo de la base: aviso «No pudimos guardar los cambios» y la fila vuelve a «Pendiente»", juanRow.includes("Pendiente") && !juanRow.includes("Retirado"), juanRow);

  // 5. Dato viejo: la recarga falla pero quedan los datos de antes, con aviso de la hora.
  failNext = true;
  await page.locator(".ns-toast").getByRole("button", { name: "Cerrar aviso" }).click().catch(() => {});
  // Tras cualquier guardado la app recarga la tabla; aquí esa recarga falla (500).
  await page.getByRole("button", { name: "Archivar Juan Sebastián Martínez Paz" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Archivar" }).click();
  await page.locator(".ns-toast-title", { hasText: "No pudimos actualizar los estudiantes" }).waitFor({ timeout: 20000 }).catch(() => {});
  const stale = await page.locator(".ns-toast-title", { hasText: "No pudimos actualizar" }).count();
  const staleText = stale ? await page.locator(".ns-toast-text").last().textContent() : "";
  report.check("Dato viejo: la tabla sigue con los datos y avisa desde qué hora", stale === 1 && /Mostramos lo último que cargamos a las \d\d:\d\d\./.test(staleText) && (await page.locator("tbody tr").count()) === 2, staleText);

  const real = cons.filter((m) => !/status of (500|403)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0, real.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
