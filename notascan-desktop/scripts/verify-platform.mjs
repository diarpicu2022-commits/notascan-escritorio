// Paso 7 · consola de la plataforma.
//   node scripts/verify-platform.mjs        → con `npm run build:demo`: marco, lista, ficha, alta, identidad, servicio,
//                                             contraste, privacidad y anchos.
//   node scripts/verify-platform.mjs auth   → con `npm run build`: entrada de la cuenta de la plataforma, «Sin permiso»
//                                             y lo que se envía a Supabase (alta, identidad con logo, servicio).
import { join } from "node:path";
import { OUT, ROOT, URL_BASE, checkOverflow, createReport, sampleTextContrast, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const AUTH = process.argv[2] === "auth";
const toast = (page, text) => page.locator(".ns-toast-title", { hasText: text }).waitFor({ timeout: 8000 }).then(() => true, () => false);

async function fakeAccount(page, profile, extra) {
  const UID = "66666666-6666-4666-8666-666666666666";
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: profile.email, app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  if (extra) await extra(page);
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const cons = watchConsole(page);

  if (!AUTH) {
    // ---------- Marco y lista ----------
    await page.goto(URL_BASE + "#/platform/dashboard", { waitUntil: "networkidle" });
    await page.locator("tbody tr").first().waitFor();
    const nav = await page.locator(".ns-sidebar nav li").allTextContents();
    report.check("Marco: menú con solo «Colegios», chip «Plataforma», sin búsqueda de estudiantes ni curso",
      nav.length === 1 && nav[0].includes("Colegios") && (await page.locator(".ns-role-chip").textContent()) === "Plataforma" && (await page.locator(".ns-gsearch-trigger").count()) === 0 && (await page.locator(".ns-sidebar-course").count()) === 0);
    const tabs = await page.getByRole("tab").allTextContents();
    report.check("Lista: pestañas de estado con su cantidad", tabs.join("|") === "Activos2|Implementación1|Suspendidos1", tabs.join("|"));
    const rows = await page.locator("tbody tr").allTextContents();
    report.check("Lista: primero el colegio que se cae (orden por adopción)", rows.length === 2 && rows[0].includes("Colegio San Felipe Neri") && rows[0].includes("Se cae") && rows[1].includes("Crece"), rows.join(" / ").slice(0, 300));
    const bars = await page.locator("tbody tr").first().locator(".ns-spark i").count();
    report.check("Lista: actividad de 8 semanas en barras, la semana en curso marcada", bars === 8 && (await page.locator("tbody tr").first().locator(".ns-spark i.is-now").count()) === 1);
    report.check("Privacidad: ningún nombre de estudiante en la consola", !(await page.locator(".ns-app-main").textContent()).includes("María Fernanda"));
    await page.screenshot({ path: join(OUT, "paso7d-lista-1440.png"), fullPage: true, animations: "disabled" });

    // ---------- Alta ----------
    await page.getByRole("button", { name: "Dar de alta un colegio" }).click();
    await page.locator(".ns-drawer").getByRole("button", { name: "Dar de alta" }).click();
    report.check("Alta: sin datos marca nombre, persona y correo de Secretaría", (await page.locator(".ns-drawer .ns-field-error").count()) === 3);
    await page.locator(".ns-drawer").getByLabel(/^Nombre del colegio/).fill("Colegio Champagnat");
    await page.locator(".ns-drawer").getByLabel(/^Nombre completo/).fill("Lucía Bastidas");
    await page.locator(".ns-drawer").getByLabel(/^Correo/).fill("secretaria@champagnat.edu.co");
    await page.locator(".ns-drawer").getByRole("button", { name: "Dar de alta" }).click();
    report.check("Alta: confirma quién puede crear su acceso", await toast(page, "Colegio dado de alta") && (await page.locator(".ns-toast-text").textContent()).includes("secretaria@champagnat.edu.co"));

    await page.getByRole("tab", { name: /Implementación/ }).click();
    report.check("Pestaña Implementación: el colegio en implementación", (await page.locator("tbody").textContent()).includes("Institución Educativa La Merced"));

    // ---------- Ficha ----------
    await page.getByRole("tab", { name: /Activos/ }).click();
    await page.getByRole("button", { name: "Abrir Colegio San Felipe Neri" }).click();
    await page.locator(".ns-header-title", { hasText: "Colegio San Felipe Neri" }).waitFor();
    report.check("Ficha: se abre desde la lista", page.url().endsWith("#/platform/school/demo-sf"));
    const blocks = await page.locator(".ns-app-main .ns-block-title").allTextContents();
    const order = ["Requiere atención", "Uso", "Identidad", "Servicio", "Secretaría"].map((t) => blocks.findIndex((x) => x.startsWith(t)));
    report.check("Ficha: «Requiere atención» primero, luego Uso, Identidad, Servicio y Secretaría", order.every((x, k) => x >= 0 && (k === 0 || x > order[k - 1])), blocks.join(" | "));
    const alerts = await page.locator(".ns-block--gold .ns-list-item strong").allTextContents();
    report.check("Ficha: atención con sin uso, caída y logo faltante", ["Sin uso en las últimas dos semanas", "El uso viene cayendo", "Sin logo"].every((t) => alerts.includes(t)), alerts.join(" | "));
    report.check("Ficha: uso con cifras y gráfico de 8 semanas", (await page.locator(".ns-plat-stat").count()) === 4 && (await page.locator(".ns-app-main svg").count()) >= 1);
    await page.screenshot({ path: join(OUT, "paso7d-ficha-1440.png"), fullPage: true, animations: "disabled" });

    // Identidad: vista previa en vivo y guardar solo con cambios.
    report.check("Identidad: «Guardar identidad» deshabilitado sin cambios", await page.getByRole("button", { name: "Guardar identidad" }).isDisabled());
    await page.getByLabel("Archivo del logo").setInputFiles(join(ROOT, "scripts/fixtures/logo-ancho.png"));
    await page.getByLabel(/^Ciudad/).fill("Ipiales centro");
    report.check("Identidad: el logo y la ciudad se ven al instante en el boletín", (await page.locator(".ns-paper-head .ns-paper-crest img").count()) === 1 && (await page.locator(".ns-paper-head").textContent()).includes("Ipiales centro"));
    await page.getByRole("button", { name: "Guardar identidad" }).click();
    report.check("Identidad: guardar confirma dónde se verá", await toast(page, "Identidad guardada"));

    // Servicio: suspender pide confirmación.
    await page.locator(".ns-block", { hasText: "Servicio" }).getByLabel(/^Estado/).selectOption("suspended");
    await page.getByRole("button", { name: "Guardar servicio" }).click();
    report.check("Servicio: suspender pide confirmación y explica qué pasa", (await page.locator("[role=alertdialog]").textContent()).includes("Nadie del colegio podrá entrar hasta que lo reactives"));
    await page.locator("[role=alertdialog]").getByRole("button", { name: "Suspender" }).click();
    report.check("Servicio: confirma la suspensión", await toast(page, "Colegio suspendido"));

    // Secretaría (2026-10-06): sin cuentas, lo dice; agregar valida y envía la invitación a esa persona.
    const secBlock = page.locator(".ns-block", { has: page.locator(".ns-block-title", { hasText: /^Secretaría/ }) });
    report.check("Secretaría: sin cuentas, lo dice y explica qué falta", (await secBlock.locator(".ns-empty-title").textContent()) === "Sin cuenta de Secretaría");
    report.check("Secretaría: ya no hay botón para invitar a todas de una vez", (await page.getByRole("button", { name: "Enviar invitación a Secretaría" }).count()) === 0);
    await secBlock.getByRole("button", { name: "Agregar cuenta de Secretaría" }).click();
    await page.locator(".ns-drawer").getByRole("button", { name: "Agregar y enviar invitación" }).click();
    report.check("Secretaría: sin datos marca nombre y correo", (await page.locator(".ns-drawer .ns-field-error").count()) === 2);
    await page.locator(".ns-drawer").getByLabel(/^Nombre completo/).fill("Secretaría de prueba");
    await page.locator(".ns-drawer").getByLabel(/^Correo/).fill("firux386@gmail.com");
    await page.locator(".ns-drawer").getByRole("button", { name: "Agregar y enviar invitación" }).click();
    report.check("Secretaría: agregar envía la invitación y dice a quién", await toast(page, "Invitación enviada") && (await page.locator(".ns-toast-text").last().textContent()).includes("firux386@gmail.com"));
    await page.screenshot({ path: join(OUT, "secretaria-plataforma-1440.png"), fullPage: true, animations: "disabled" });

    // Contraste medido sobre el render.
    for (const [loc, label, min] of [
      [page.locator(".ns-block--gold .ns-list-item strong").first(), "título de una alerta", 4.5],
      [page.locator(".ns-block--gold .ns-list-item .ns-caption").first(), "detalle de una alerta", 4.5],
      [page.locator(".ns-plat-stat .ns-bento-label").first(), "rótulo de una cifra", 4.5],
      [page.locator(".ns-plat-stat .ns-bento-value").first(), "cifra de uso", 7],
    ]) {
      const r = await sampleTextContrast(page, loc);
      report.check("Contraste " + label + " ≥ " + min + ":1", r.ratio >= min, r.ratio.toFixed(2) + ":1");
    }
    for (const w of [1440, 1024, 768]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(200);
      checkOverflow(report, "#/platform/school/demo-sf", await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), w);
      await page.screenshot({ path: join(OUT, "paso7d-ficha-" + w + ".png"), fullPage: true, animations: "disabled" });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(URL_BASE + "#/platform/school/no-existe");
    await page.locator(".ns-empty-title").waitFor();
    report.check("Ficha de un colegio que no existe: lo dice y ofrece volver", (await page.locator(".ns-empty-title").textContent()) === "No encontramos este colegio.");
    report.check("Consola sin errores", cons.length === 0, cons.join(" | "));
  } else {
    // ---------- Entrada, permisos y escrituras ----------
    const writes = [];
    const rec = (r) => { const q = r.request(); let body = null; try { body = q.postDataJSON(); } catch { body = null; } writes.push({ method: q.method(), url: decodeURIComponent(q.url()), body }); };
    const SCHOOL = { id: "11111111-1111-4111-8111-111111111111", name: "Colegio San Felipe Neri", short_name: "SF", city: "Ipiales", department: "Nariño", resolution: "", dane: "", logo_path: null, status: "active", plan: "Anual", contract_until: "2027-01-31", created_at: "2026-01-10T00:00:00Z" };
    await fakeAccount(page, { email: "diarpicu2022@gmail.com", full_name: "Diego Armando Pinta Cuasquen", role: "platform" }, async (p) => {
      await p.route("**/rest/v1/institutions**", (r) => { if (r.request().method() !== "GET") { rec(r); return r.fulfill({ status: 204, body: "" }); } return r.fulfill({ json: [SCHOOL] }); });
      await p.route("**/rest/v1/rpc/platform_stats**", (r) => r.fulfill({ json: [{ institution_id: SCHOOL.id, students: 41, teachers: 4, secretaries: 1, accounts: 5, last_seen: null, grades_7d: 3, grades_30d: 36, attendance_7d: 10, observations_30d: 2, weekly: [140, 150, 120, 130, 60, 20, 5, 8] }] }));
      await p.route("**/rest/v1/rpc/create_institution**", (r) => { rec(r); return r.fulfill({ json: "22222222-2222-4222-8222-222222222222" }); });
      await p.route("**/rest/v1/rpc/platform_secretaries**", (r) => r.fulfill({ json: [
        { email: "claudia@sanfelipe.edu.co", full_name: "Claudia Enríquez", account: "none", last_seen: null },
        { email: "rosa@sanfelipe.edu.co", full_name: "Rosa Erazo", account: "active", last_seen: new Date().toISOString() },
      ] }));
      await p.route("**/rest/v1/rpc/platform_add_secretary**", (r) => { rec(r); return r.fulfill({ status: 204, body: "" }); });
      await p.route("**/rest/v1/rpc/platform_remove_secretary**", (r) => { rec(r); return r.fulfill({ status: 204, body: "" }); });
      await p.route("**/storage/v1/object/institution-logos/**", (r) => { rec(r); return r.fulfill({ json: { Key: "institution-logos/x" } }); });
      await p.route("**/functions/v1/invite-staff**", (r) => { rec(r); let b = {}; try { b = r.request().postDataJSON() ?? {}; } catch { b = {}; } return r.fulfill({ json: { sent: [b.email ?? "secretaria@champagnat.edu.co"] } }); });
    });
    await login(page, "Docente", "diarpicu2022@gmail.com");
    await page.waitForURL(/#\/platform\/dashboard$/, { timeout: 8000 }).catch(() => {});
    report.check("La cuenta de la plataforma entra con cualquier opción del selector y llega a su consola", page.url().endsWith("#/platform/dashboard"), page.url());
    await page.locator("tbody tr", { hasText: "Colegio San Felipe Neri" }).waitFor({ timeout: 8000 });
    report.check("Lista con colegios y cifras de la base", (await page.locator("tbody tr").first().textContent()).includes("41"));

    await page.getByRole("button", { name: "Dar de alta un colegio" }).click();
    await page.locator(".ns-drawer").getByLabel(/^Nombre del colegio/).fill("Colegio Champagnat");
    await page.locator(".ns-drawer").getByLabel(/^Iniciales del escudo/).fill("cha");
    await page.locator(".ns-drawer").getByLabel(/^Nombre completo/).fill("Lucía Bastidas");
    await page.locator(".ns-drawer").getByLabel(/^Correo/).fill("Secretaria@Champagnat.edu.co");
    await page.locator(".ns-drawer").getByRole("button", { name: "Dar de alta" }).click();
    await page.waitForURL(/#\/platform\/school\/22222222/, { timeout: 8000 }).catch(() => {});
    const cr = writes.find((w) => w.url.includes("rpc/create_institution"));
    for (let k = 0; k < 30 && !writes.some((w) => w.url.includes("/functions/v1/invite-staff")); k++) await page.waitForTimeout(100);
    const inv = writes.find((w) => w.url.includes("/functions/v1/invite-staff"));
    report.check("Alta: envía enseguida la invitación a la Secretaría del colegio nuevo", inv?.body.institution_id === "22222222-2222-4222-8222-222222222222", JSON.stringify(inv?.body));
    report.check("Alta: una sola llamada con el colegio y su primera Secretaría, y abre su ficha",
      cr?.body.p.name === "Colegio Champagnat" && cr.body.p.short_name === "CHA" && cr.body.p.admin_email === "Secretaria@Champagnat.edu.co" && page.url().includes("#/platform/school/22222222"), JSON.stringify(cr?.body));

    await page.goto(URL_BASE + "#/platform/school/" + SCHOOL.id);
    await page.locator(".ns-header-title", { hasText: "Colegio San Felipe Neri" }).waitFor({ timeout: 8000 });
    await page.getByLabel("Archivo del logo").setInputFiles(join(ROOT, "scripts/fixtures/logo-alto.png"));
    await page.getByLabel(/^Código DANE/).fill("152356000123");
    await page.getByRole("button", { name: "Guardar identidad" }).click();
    await toast(page, "Identidad guardada");
    const up = writes.find((w) => w.url.includes("/storage/v1/object/institution-logos/"));
    const patch = writes.filter((w) => w.method === "PATCH" && w.url.includes("institutions")).pop();
    report.check("Identidad: sube el logo a la carpeta del colegio y guarda su ruta con el DANE",
      up && up.url.includes("institution-logos/" + SCHOOL.id + "/logo-") && patch?.body.dane === "152356000123" && patch.body.logo_path?.startsWith(SCHOOL.id + "/logo-") && patch.url.includes("id=eq." + SCHOOL.id), JSON.stringify({ up: up?.url, patch: patch?.body }));

    // Secretaría: invitar es por persona; agregar registra y luego invita solo a esa; quitar pide confirmación.
    const sec = page.locator(".ns-block", { has: page.locator(".ns-block-title", { hasText: /^Secretaría/ }) });
    await sec.locator(".ns-list-item").first().waitFor({ timeout: 8000 });
    const items = await sec.locator(".ns-list-item").allTextContents();
    report.check("Secretaría: lista cada cuenta con su estado (sin invitar / activa)", items.length === 2 && items[0].includes("Sin invitar") && items[1].includes("Activa"), items.join(" | "));
    report.check("Secretaría: una cuenta activa no se invita ni se quita desde aquí", (await sec.getByRole("button", { name: /Rosa Erazo/ }).count()) === 0);
    const before = writes.length;
    await sec.getByRole("button", { name: "Enviar invitación a Claudia Enríquez" }).click();
    await toast(page, "Invitación enviada");
    const one = writes.slice(before).find((w) => w.url.includes("/functions/v1/invite-staff"));
    report.check("Secretaría: invita solo a esa persona (colegio + correo)", one?.body.institution_id === SCHOOL.id && one.body.email === "claudia@sanfelipe.edu.co", JSON.stringify(one?.body));
    await sec.getByRole("button", { name: "Agregar cuenta de Secretaría" }).click();
    await page.locator(".ns-drawer").getByLabel(/^Nombre completo/).fill("Secretaría de prueba");
    await page.locator(".ns-drawer").getByLabel(/^Correo/).fill(" Firux386@Gmail.com ");
    const before2 = writes.length;
    await page.locator(".ns-drawer").getByRole("button", { name: "Agregar y enviar invitación" }).click();
    for (let k = 0; k < 40 && !writes.slice(before2).some((w) => w.url.includes("/functions/v1/invite-staff")); k++) await page.waitForTimeout(100);
    const addW = writes.slice(before2).find((w) => w.url.includes("platform_add_secretary"));
    const invW = writes.slice(before2).find((w) => w.url.includes("/functions/v1/invite-staff"));
    report.check("Secretaría: agregar registra en el colegio (correo limpio) y después invita solo a esa persona",
      addW?.body.p_institution === SCHOOL.id && addW.body.p_email === "firux386@gmail.com" && addW.body.p_name === "Secretaría de prueba" && invW?.body.email === "firux386@gmail.com" && writes.indexOf(addW) < writes.indexOf(invW),
      JSON.stringify({ add: addW?.body, inv: invW?.body }));
    await sec.getByRole("button", { name: "Quitar a Claudia Enríquez" }).click();
    report.check("Secretaría: quitar pide confirmación y explica que no pierde nada", (await page.locator("[role=alertdialog]").textContent()).includes("Nunca recibió su invitación"));
    await page.locator("[role=alertdialog]").getByRole("button", { name: "Quitar" }).click();
    await toast(page, "Cuenta quitada");
    const rmW = writes.find((w) => w.url.includes("platform_remove_secretary"));
    report.check("Secretaría: quitar llama a la base con el colegio y el correo", rmW?.body.p_institution === SCHOOL.id && rmW.body.p_email === "claudia@sanfelipe.edu.co", JSON.stringify(rmW?.body));

    await page.locator(".ns-block", { hasText: "Servicio" }).getByLabel(/^Estado/).selectOption("suspended");
    await page.getByRole("button", { name: "Guardar servicio" }).click();
    await page.locator("[role=alertdialog]").getByRole("button", { name: "Suspender" }).click();
    await toast(page, "Colegio suspendido");
    const sp = writes.filter((w) => w.method === "PATCH" && w.url.includes("institutions")).pop();
    report.check("Servicio: suspender guarda el estado del colegio", sp?.body.status === "suspended", JSON.stringify(sp?.body));

    await page.goto(URL_BASE + "#/admin/students");
    await page.locator(".ns-empty-title").waitFor({ timeout: 8000 });
    report.check("La plataforma no entra a pantallas de un colegio: «Sin permiso»", (await page.locator(".ns-empty-text").textContent()) === "Esta sección es de Secretaría y tu cuenta es de Plataforma.");

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
