// Paso 6a · verificación del inicio de sesión en modo normal (build sin --mode demo).
// Contra el proyecto Supabase real para lo que no necesita cuenta (sin sesión, credenciales malas).
// Para el inicio de sesión correcto se simulan las respuestas de Supabase (aún no hay cuentas creadas),
// y el restablecimiento se intercepta para no enviar correos reales.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";

const report = createReport();
const UID = "11111111-1111-4111-8111-111111111111";

/** Simula una cuenta de Supabase con el perfil dado (sesión, usuario y fila de profiles). */
async function fakeAccount(page, profile) {
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: profile.email, app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  // Desde 6b.2b el inicio del Docente lee la base: con la sesión simulada, el resto de la API responde vacío
  // (las rutas registradas después, como profiles, tienen prioridad).
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/auth/v1/logout**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: { id: UID, email: profile.email, full_name: profile.full_name, role: profile.role, status: "active" }, headers: { "content-type": "application/vnd.pgrst.object+json" } }));
}

const { browser, close } = await startPreview();
try {
  // ---------- 1. Contra Supabase real, sin cuenta ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/teacher/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  report.check("Sin sesión, una ruta interna lleva al login", page.url().endsWith("#/login") && (await page.locator(".ns-auth").count()) === 1, page.url());
  await page.goto(URL_BASE + "#/dev/tokens", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  report.check("En modo normal no existen las vistas de verificación (#/dev)", (await page.locator(".ns-auth").count()) === 1);

  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.locator("#auth-email").fill("ana.lucia@losandes.edu.co");
  await page.locator("#auth-pass").fill("contrasena-incorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.locator(".ns-auth-error").first().waitFor({ timeout: 15000 });
  const wrong = await page.locator("#auth-pass-err").textContent().catch(() => "");
  report.check("Credenciales malas (respuesta real de Supabase): «Correo o contraseña incorrectos.» en la contraseña", wrong === "Correo o contraseña incorrectos.", wrong);
  report.check("El campo queda marcado como inválido para lectores de pantalla", (await page.locator("#auth-pass").getAttribute("aria-invalid")) === "true");

  await page.getByRole("button", { name: "Cuenta institucional" }).click();
  report.check("«Cuenta institucional» ya no entra sin contraseña: avisa que aún no está", (await page.locator(".ns-auth-error", { hasText: "aún no está disponible" }).count()) === 1 && page.url().endsWith("#/login"));

  // Restablecimiento: se intercepta para no enviar correos reales.
  let recoverBody = null;
  await page.route("**/auth/v1/recover**", (r) => { recoverBody = r.request().postDataJSON(); r.fulfill({ json: {} }); });
  await page.locator("#auth-email").fill("");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  report.check("«¿Olvidaste tu contraseña?» sin correo pide el correo primero", (await page.locator("#auth-email-err").textContent()) === "Escribe tu correo institucional completo.");
  await page.locator("#auth-email").fill("Ana.Lucia@losandes.edu.co");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await page.locator(".ns-toast").waitFor({ timeout: 5000 });
  report.check("Con correo, pide el restablecimiento a Supabase (correo normalizado) y lo confirma", recoverBody?.email === "ana.lucia@losandes.edu.co" && (await page.locator(".ns-toast-title").textContent()) === "Revisa tu correo", JSON.stringify(recoverBody));
  const toastContrast = await sampleTextContrast(page, page.locator(".ns-toast-text"));
  report.check("Contraste del aviso ≥ 4.5:1", toastContrast.ratio >= 4.5, toastContrast.ratio.toFixed(2) + ":1");
  await page.screenshot({ path: join(OUT, "paso6a-login-errores.png") });
  report.check("Consola sin errores en el login real", cons.filter((m) => !/400|Failed to load resource/.test(m)).length === 0, cons.join(" | "));
  await ctx.close();

  // ---------- 2. Sesión simulada: rol, nombre real, «Sin permiso» y cierre ----------
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await c2.newPage();
  const cons2 = watchConsole(p2);
  await fakeAccount(p2, { email: "ana.lucia@losandes.edu.co", full_name: "Ana Lucía Rosero", role: "teacher" });
  await p2.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await p2.getByText("Secretaría", { exact: true }).click();
  await p2.locator("#auth-email").fill("ana.lucia@losandes.edu.co");
  await p2.locator("#auth-pass").fill("secreta123");
  await p2.getByRole("button", { name: "Entrar" }).click();
  await p2.locator(".ns-auth-roles .ns-auth-error").waitFor({ timeout: 5000 });
  report.check("Rol elegido distinto al de la cuenta: «Tu cuenta está registrada como Docente.»", (await p2.locator(".ns-auth-roles .ns-auth-error").textContent()) === "Tu cuenta está registrada como Docente." && p2.url().endsWith("#/login"));
  await p2.getByText("Docente", { exact: true }).click();
  report.check("Cambiar de rol limpia el error", (await p2.locator(".ns-auth-roles .ns-auth-error").count()) === 0);
  await p2.getByRole("button", { name: "Entrar" }).click();
  await p2.waitForURL(/#\/teacher\/dashboard$/, { timeout: 5000 });
  await p2.waitForTimeout(500);
  report.check("Rol correcto: entra al inicio del Docente", p2.url().endsWith("#/teacher/dashboard"));
  report.check("El marco muestra el nombre del perfil real", (await p2.locator(".ns-profile-name").textContent()) === "Ana Lucía Rosero");

  await p2.goto(URL_BASE + "#/admin/users");
  await p2.waitForTimeout(400);
  report.check("Ruta de Secretaría con sesión de Docente: vista «Sin permiso»", (await p2.locator(".ns-empty-title").textContent()) === "No tienes permiso para ver esta sección." && (await p2.locator(".ns-empty-text").textContent()) === "Esta sección es de Secretaría y tu cuenta es de Docente.");
  report.check("«Sin permiso» se muestra dentro del marco del Docente", (await p2.locator(".ns-role-chip").textContent()) === "Docente");
  const forbiddenContrast = await sampleTextContrast(p2, p2.locator(".ns-empty-title"));
  report.check("Contraste del título «Sin permiso» ≥ 4.5:1", forbiddenContrast.ratio >= 4.5, forbiddenContrast.ratio.toFixed(2) + ":1");
  await p2.screenshot({ path: join(OUT, "paso6a-sin-permiso.png") });
  await p2.getByRole("button", { name: "Ir a mi inicio" }).click();
  await p2.waitForTimeout(300);
  report.check("«Ir a mi inicio» vuelve al inicio del Docente", p2.url().endsWith("#/teacher/dashboard"));

  await p2.goto(URL_BASE + "#/login");
  await p2.waitForTimeout(400);
  report.check("Con sesión, el login lleva al inicio de tu rol", p2.url().endsWith("#/teacher/dashboard"));
  await p2.getByRole("button", { name: "Cerrar sesión" }).click();
  await p2.waitForTimeout(500);
  report.check("Cerrar sesión vuelve al login y la ruta interna ya no abre", p2.url().endsWith("#/login") && (await p2.locator(".ns-auth").count()) === 1);
  report.check("Consola sin errores con la sesión simulada", cons2.length === 0, cons2.join(" | "));
  await c2.close();
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
