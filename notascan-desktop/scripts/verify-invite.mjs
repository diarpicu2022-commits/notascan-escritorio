// Paso 7e · activar la cuenta con el código del correo (requiere `npm run build`), con la API de Supabase simulada:
// invitación desde la consola, código incorrecto y correcto, contraseña débil y nueva, entrada con el rol del perfil,
// y restablecimiento con «Ya tengo el código». Además: en demostración el login sigue igual al sistema (verify:shell).
import { join } from "node:path";
import { OUT, URL_BASE, createReport, sampleTextContrast, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const UID = "77777777-7777-4777-8777-777777777777";
const now = Math.floor(Date.now() / 1000);
const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
const user = { id: UID, aud: "authenticated", role: "authenticated", email: "secretaria@champagnat.edu.co", app_metadata: {}, user_metadata: {} };
const session = { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user };

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  const verifies = [], updates = [];
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/verify**", (r) => {
    const b = r.request().postDataJSON();
    verifies.push(b);
    if (b.token !== "482913") return r.fulfill({ status: 403, json: { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" } });
    return r.fulfill({ json: session });
  });
  await page.route("**/auth/v1/user**", (r) => {
    if (r.request().method() === "PUT") { updates.push(r.request().postDataJSON()); return r.fulfill({ json: user }); }
    return r.fulfill({ json: user });
  });
  await page.route("**/auth/v1/recover**", (r) => r.fulfill({ json: {} }));
  await page.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: { id: UID, email: user.email, full_name: "Lucía Bastidas", role: "admin", status: "active" } }));

  // 1. Desde el login: «Activa tu cuenta con el código del correo».
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Activa tu cuenta con el código del correo" }).click();
  report.check("El login ofrece activar la cuenta con el código", (await page.locator(".ns-auth-form h2").textContent()) === "Activa tu cuenta");
  await page.getByRole("button", { name: "Continuar" }).click();
  report.check("Sin datos: pide el correo y el código del correo", (await page.locator(".ns-auth-error").allTextContents()).join("|") === "Escribe tu correo completo.|Escribe el código completo del correo.");
  await page.locator("#code-email").fill("Secretaria@Champagnat.edu.co");
  await page.locator("#code-token").fill("12a34-56");
  report.check("El código solo acepta dígitos", (await page.locator("#code-token").inputValue()) === "123456");
  // Supabase puede enviar códigos de 6 a 10 dígitos (el proyecto real envía 8): se aceptan enteros.
  await page.locator("#code-token").fill("12345678901");
  report.check("El código admite hasta 10 dígitos (Supabase envía 6 a 10)", (await page.locator("#code-token").inputValue()) === "1234567890");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator(".ns-auth-error", { hasText: "El código no es válido" }).waitFor({ timeout: 8000 });
  report.check("Código equivocado: lo dice y prueba invitación y código reenviado", (await page.locator(".ns-auth-error").textContent()) === "El código no es válido o ya venció. Pide uno nuevo." && verifies.map((v) => v.type).join(",") === "invite,email" && verifies[0].email === "secretaria@champagnat.edu.co", JSON.stringify(verifies));
  await page.locator("#code-token").fill("482913");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator(".ns-auth-form h2", { hasText: "Crea tu contraseña" }).waitFor({ timeout: 8000 });
  report.check("Código correcto: pasa a crear la contraseña sin entrar todavía", page.url().endsWith("#/login") && (await page.locator(".ns-auth-note").textContent()).includes("secretaria@champagnat.edu.co"), page.url());
  const note = await sampleTextContrast(page, page.locator(".ns-auth-note"));
  report.check("Contraste del texto de apoyo ≥ 4.5:1", note.ratio >= 4.5, note.ratio.toFixed(2) + ":1");
  await page.screenshot({ path: join(OUT, "paso7e-crear-contrasena.png") });
  await page.locator("#code-pass").fill("corta1");
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  report.check("Contraseña débil: pide 8 caracteres con letras y números", (await page.locator(".ns-auth-error").textContent()) === "Al menos 8 caracteres con letras y números.");
  await page.locator("#code-pass").fill("Colegio2026");
  await page.locator("#code-pass2").fill("Colegio2025");
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  report.check("Las dos contraseñas deben coincidir", (await page.locator(".ns-auth-error").textContent()) === "Las contraseñas no coinciden.");
  await page.locator("#code-pass2").fill("Colegio2026");
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  await page.waitForURL(/#\/admin\/dashboard$/, { timeout: 8000 }).catch(() => {});
  report.check("Guarda la contraseña y entra al inicio de su rol (Secretaría)", updates[0]?.password === "Colegio2026" && page.url().endsWith("#/admin/dashboard"), page.url());

  // 2. Restablecer: «¿Olvidaste tu contraseña?» → «Ya tengo el código».
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p2 = await ctx2.newPage();
  const verifies2 = [];
  await p2.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await p2.route("**/auth/v1/recover**", (r) => r.fulfill({ json: {} }));
  await p2.route("**/auth/v1/verify**", (r) => { verifies2.push(r.request().postDataJSON()); return r.fulfill({ json: session }); });
  await p2.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await p2.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: { id: UID, email: user.email, full_name: "Lucía Bastidas", role: "admin", status: "active" } }));
  await p2.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await p2.locator("#auth-email").fill("secretaria@champagnat.edu.co");
  await p2.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await p2.locator(".ns-toast-title", { hasText: "Revisa tu correo" }).waitFor({ timeout: 8000 });
  report.check("Restablecer: el aviso habla del código y ofrece «Ya tengo el código»", (await p2.locator(".ns-toast-text").textContent()).includes("Te enviamos un código a "));
  await p2.getByRole("link", { name: "Ya tengo el código" }).click();
  report.check("Restablecer: abre «Restablece tu contraseña» con el correo ya escrito", (await p2.locator(".ns-auth-form h2").textContent()) === "Restablece tu contraseña" && (await p2.locator("#code-email").inputValue()) === "secretaria@champagnat.edu.co");
  await p2.locator("#code-token").fill("482913");
  await p2.getByRole("button", { name: "Continuar" }).click();
  await p2.locator(".ns-auth-form h2", { hasText: "Crea tu contraseña" }).waitFor({ timeout: 8000 });
  report.check("Restablecer: el código se verifica como «recovery»", verifies2.map((v) => v.type).join(",") === "recovery", JSON.stringify(verifies2));
  await p2.getByRole("link", { name: "Volver a iniciar sesión" }).click();
  report.check("«Volver a iniciar sesión» regresa al formulario de acceso", (await p2.locator(".ns-auth-form h2").textContent()) === "Iniciar sesión");
  await ctx2.close();

  const real = cons.filter((m) => !/status of (400|401|403|500)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0, real.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
