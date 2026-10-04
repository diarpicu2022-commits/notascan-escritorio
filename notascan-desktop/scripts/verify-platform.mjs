// Paso 7c · marco del rol Plataforma.
//   node scripts/verify-platform.mjs        → con `npm run build:demo`: estructura del marco y del esqueleto, anchos.
//   node scripts/verify-platform.mjs auth   → con `npm run build`: la cuenta de la plataforma entra con cualquier
//                                             opción del selector, y las secciones de otros roles dicen «Sin permiso».
import { join } from "node:path";
import { OUT, URL_BASE, checkOverflow, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const AUTH = process.argv[2] === "auth";

async function fakeAccount(page, profile) {
  const UID = "66666666-6666-4666-8666-666666666666";
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: profile.email, app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: { id: UID, email: profile.email, full_name: profile.full_name, role: profile.role, status: "active" } }));
}

async function login(page, roleLabel, email) {
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.getByText(roleLabel, { exact: true }).click();
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-pass").fill("secreta123");
  await page.getByRole("button", { name: "Entrar" }).click();
}

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);

  if (!AUTH) {
    await page.goto(URL_BASE + "#/platform/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200); // la entrada del sistema (ns-enter) termina antes de capturar
    const nav = await page.locator(".ns-sidebar nav li").allTextContents();
    report.check("Marco: el menú de la plataforma tiene solo «Colegios»", nav.length === 1 && nav[0].includes("Colegios"), nav.join(" | "));
    report.check("Marco: chip de rol «Plataforma» y sin búsqueda de estudiantes (no ve datos personales)",
      (await page.locator(".ns-role-chip").textContent()) === "Plataforma" && (await page.locator(".ns-gsearch-trigger").count()) === 0);
    report.check("Marco: sin bloque de curso ni de colegio inventado", (await page.locator(".ns-sidebar-course").count()) === 0);
    report.check("Lista: título, pestañas de estado y una sola acción primaria (deshabilitada hasta 7d)",
      (await page.locator(".ns-header-title").textContent()) === "Colegios" && (await page.getByRole("tab").allTextContents()).join("|") === "Activos|Implementación|Suspendidos" && await page.getByRole("button", { name: "Dar de alta un colegio" }).isDisabled());
    report.check("Lista: la región de la tabla anuncia su contenido mientras espera datos", (await page.locator("[aria-busy=true] .ns-sr").textContent()).includes("Lista de colegios"));
    for (const w of [1440, 1024, 768]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(200);
      checkOverflow(report, "#/platform/dashboard", await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), w);
      await page.screenshot({ path: join(OUT, "paso7c-plataforma-lista-" + w + ".png"), fullPage: true, animations: "disabled" });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(URL_BASE + "#/platform/school/demo", { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    const regions = await page.locator(".ns-app-main .ns-block-title h2, .ns-app-main .ns-block-title").allTextContents();
    const order = ["Requiere atención", "Uso", "Identidad"].map((t) => regions.findIndex((x) => x.includes(t)));
    report.check("Detalle: «Requiere atención» primero, luego Uso e Identidad", order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1])), regions.join(" | "));
    await page.screenshot({ path: join(OUT, "paso7c-plataforma-detalle-1440.png"), fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Todos los colegios" }).click();
    report.check("Detalle: «Todos los colegios» vuelve a la lista", page.url().endsWith("#/platform/dashboard"));
    report.check("Consola sin errores", cons.length === 0, cons.join(" | "));
  } else {
    await fakeAccount(page, { email: "diarpicu2022@gmail.com", full_name: "Diego Armando Pinta Cuasquen", role: "platform" });
    await login(page, "Docente", "diarpicu2022@gmail.com");
    await page.waitForURL(/#\/platform\/dashboard$/, { timeout: 8000 }).catch(() => {});
    report.check("La cuenta de la plataforma entra con cualquier opción del selector y llega a su consola", page.url().endsWith("#/platform/dashboard"), page.url());
    report.check("Su nombre aparece en el marco y no hay colegio en el menú", (await page.locator(".ns-sidebar-user").textContent()).includes("Diego Armando Pinta Cuasquen") && (await page.locator(".ns-school").count()) === 0);
    await page.goto(URL_BASE + "#/admin/students");
    await page.locator(".ns-empty-title").waitFor({ timeout: 8000 });
    report.check("La plataforma no entra a pantallas de un colegio: «Sin permiso»", (await page.locator(".ns-empty-text").textContent()) === "Esta sección es de Secretaría y tu cuenta es de Plataforma.");
    await page.screenshot({ path: join(OUT, "paso7c-plataforma-sin-permiso.png") });

    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    await fakeAccount(p2, { email: "ana.lucia@losandes.edu.co", full_name: "Ana Lucía Rosero", role: "teacher" });
    await login(p2, "Docente", "ana.lucia@losandes.edu.co");
    await p2.waitForURL(/#\/teacher\/dashboard$/, { timeout: 8000 });
    await p2.goto(URL_BASE + "#/platform/dashboard");
    await p2.locator(".ns-empty-title").waitFor({ timeout: 8000 });
    report.check("Un docente no entra a la consola de la plataforma: «Sin permiso»", (await p2.locator(".ns-empty-text").textContent()) === "Esta sección es de Plataforma y tu cuenta es de Docente.");
    await ctx2.close();
    const real = cons.filter((m) => !/status of (400|401|403|500)/.test(m));
    report.check("Consola sin errores", real.length === 0, real.join(" | "));
  }
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
