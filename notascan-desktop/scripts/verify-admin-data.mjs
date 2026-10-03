// Paso 6b.3a · configuración de Secretaría en modo normal (requiere `npm run build`), con la API de Supabase simulada:
// lo que se lee de la base, lo que se envía al guardar y cómo se muestran las reglas que pone la base.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const UID = "44444444-4444-4444-8444-444444444444";
const ANA = "55555555-5555-4555-8555-555555555555";
const today = new Date().toISOString();

const STAFF = [
  { email: "ana.lucia@losandes.edu.co", full_name: "Ana Lucía Rosero", role: "teacher" },
  { email: "nuevo@losandes.edu.co", full_name: "Docente Nuevo", role: "teacher" },
  { email: "patricia@losandes.edu.co", full_name: "Patricia Ortega", role: "admin" },
];
const PERIODS = [
  { id: "2026-p3", year: 2026, position: 3, name: "Periodo 3", open_date: "2026-07-13", close_date: "2026-10-15", status: "open", final_weight: 50 },
  { id: "2026-p4", year: 2026, position: 4, name: "Periodo 4", open_date: "2026-10-19", close_date: "2026-11-27", status: "draft", final_weight: 50 },
];
const COMPONENTS = PERIODS.flatMap((p) => [["Actividades", 40], ["Exámenes", 30], ["Talleres", 20], ["Actitudinal", 10]].map(([name, weight], i) => ({ period_id: p.id, name, weight, position: i + 1 })));

const writes = [];
const record = (r) => { const q = r.request(); writes.push({ method: q.method(), url: decodeURIComponent(q.url()), body: q.postDataJSON() }); };
const last = (method, table) => writes.filter((w) => w.method === method && w.url.includes("/rest/v1/" + table)).pop();

async function mockApi(page) {
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: "patricia@losandes.edu.co", app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/auth/v1/recover**", (r) => { record(r); r.fulfill({ json: {} }); });
  await page.route("**/rest/v1/rpc/**", (r) => { record(r); r.fulfill({ status: 204, body: "" }); });
  await page.route("**/rest/v1/profiles**", (r) => {
    if (r.request().method() !== "GET") { record(r); return r.fulfill({ status: 204, body: "" }); }
    if (decodeURIComponent(r.request().url()).includes("last_seen_at")) return r.fulfill({ json: [
      { id: ANA, email: "ana.lucia@losandes.edu.co", status: "active", last_seen_at: today },
      { id: UID, email: "patricia@losandes.edu.co", status: "active", last_seen_at: today },
    ] });
    return r.fulfill({ json: { id: UID, email: user.email, full_name: "Patricia Ortega", role: "admin", status: "active" } });
  });
  const table = (name, rows) => page.route("**/rest/v1/" + name + "**", (r) => {
    if (r.request().method() !== "GET") { record(r); return r.fulfill({ status: 201, body: "" }); }
    const u = decodeURIComponent(r.request().url());
    return r.fulfill({ json: typeof rows === "function" ? rows(u) : rows });
  });
  await table("grade_levels", [{ id: "6", name: "Sexto", level: "Básica secundaria", status: "active" }, { id: "9", name: "Noveno", level: "Básica secundaria", status: "draft" }]);
  await table("courses", [{ id: "6A", grade_level_id: "6", name: "6A", director_email: "ana.lucia@losandes.edu.co", capacity: 35, status: "active" }]);
  await table("subjects", [{ id: "fis", name: "Física", code: "FIS-02", category: "Ciencias exactas", status: "active" }, { id: "mat", name: "Matemáticas", code: "MAT-01", category: "Ciencias exactas", status: "active" }]);
  await table("students", [{ course_id: "6A", status: "active" }, { course_id: "6A", status: "retired" }]);
  await table("staff_directory", (u) => (u.includes("role=eq.teacher") ? STAFF.filter((s) => s.role === "teacher") : STAFF));
  await table("guardians", [{ id: 1, full_name: "Gloria López", email: null }]);
  await table("academic_periods", PERIODS);
  await table("period_components", COMPONENTS);
  await page.route("**/rest/v1/teaching_assignments**", (r) => {
    const m = r.request().method();
    if (m === "DELETE") { record(r); return r.fulfill({ status: 400, json: { code: "P0001", message: "Esta asignación ya tiene evaluaciones. Cambia el docente en lugar de eliminarla." } }); }
    if (m !== "GET") { record(r); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: [{ id: 5, teacher_email: "ana.lucia@losandes.edu.co", subject_id: "mat", course_id: "6A", period_id: "2026-p3" }] });
  });

  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.getByText("Secretaría", { exact: true }).click();
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-pass").fill("secreta123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/#\/admin\/dashboard$/, { timeout: 8000 });
}

const toastTitle = (page, text) => page.locator(".ns-toast-title", { hasText: text }).waitFor({ timeout: 8000 }).then(() => true, () => false);

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await mockApi(page);
  // ---------- 1. Estructura académica ----------
  await page.goto(URL_BASE + "#/admin/structure");
  await page.locator("tbody tr").first().waitFor({ timeout: 10000 });
  const gradeRows = await page.locator("tbody tr").allTextContents();
  report.check("Estructura: grados de la base con sus cursos y estado", gradeRows.length === 2 && gradeRows[0].includes("Sexto") && gradeRows[0].includes("1") && gradeRows[1].includes("NovenoBásica secundaria0Sin cursos"), gradeRows.join(" / "));
  report.check("Al entrar se registra el último acceso (touch_last_seen)", writes.some((w) => w.url.includes("/rpc/touch_last_seen")));
  await page.getByRole("tab", { name: /^Cursos/ }).click();
  const courseRow = await page.locator("tbody tr").first().textContent();
  report.check("Estructura: curso con director (por correo del directorio) y estudiantes sin contar retirados", courseRow.includes("6ASextoAna Lucía Rosero1Activo"), courseRow);
  await page.getByRole("button", { name: "Crear curso" }).click();
  await page.locator(".ns-drawer").getByLabel("Nombre del curso").fill("6b");
  await page.locator(".ns-drawer").getByRole("button", { name: "Crear curso" }).click();
  await toastTitle(page, "Creado correctamente");
  const cPost = last("POST", "courses"), gPatch = last("PATCH", "grade_levels");
  report.check("Estructura: crear curso envía id en mayúsculas, grado por id y cupo; activa su grado si estaba sin cursos",
    cPost?.body.id === "6B" && cPost.body.grade_level_id === "6" && cPost.body.capacity === 35 && cPost.body.director_email === null && gPatch?.body.status === "active" && gPatch.url.includes("id=eq.6") && gPatch.url.includes("status=eq.draft"),
    JSON.stringify([cPost?.body, gPatch?.body]));

  // ---------- 2. Malla curricular ----------
  await page.goto(URL_BASE + "#/admin/curriculum");
  await page.locator(".ns-matrix").waitFor({ timeout: 10000 });
  report.check("Malla: matriz de la base en el periodo abierto", (await page.locator(".ns-matrix thead th").first().textContent()) === "Curso · Periodo 3" && (await page.getByRole("button", { name: "Editar: Ana Lucía Rosero dicta Matemáticas en 6A" }).count()) === 1);
  await page.getByRole("button", { name: "Asignar docente a Física en 6A" }).click();
  await page.locator(".ns-assign").getByLabel("Docente").selectOption("Docente Nuevo");
  await page.locator(".ns-assign").getByRole("button", { name: "Asignar" }).click();
  await toastTitle(page, "Docente asignado");
  const aPost = last("POST", "teaching_assignments");
  report.check("Malla: asignar envía correo del docente e ids de materia y periodo", JSON.stringify(aPost?.body) === JSON.stringify({ teacher_email: "nuevo@losandes.edu.co", subject_id: "fis", course_id: "6A", period_id: "2026-p3" }), JSON.stringify(aPost?.body));
  await page.getByRole("tab", { name: "Lista de asignaciones" }).click();
  await page.getByRole("button", { name: "Eliminar asignación" }).first().click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Eliminar asignación" }).click();
  await toastTitle(page, "No se eliminó la asignación");
  report.check("Malla: si la asignación tiene evaluaciones, la base no la elimina y se dice qué hacer",
    (await page.locator(".ns-toast-text").textContent()) === "Esta asignación ya tiene evaluaciones. Cambia el docente en lugar de eliminarla." && (await page.locator("tbody tr").count()) === 1);
  await page.screenshot({ path: join(OUT, "paso6b3a-malla.png") });

  // ---------- 3. Periodos ----------
  await page.goto(URL_BASE + "#/admin/periods");
  await page.locator(".ns-period-editor").waitFor({ timeout: 10000 });
  report.check("Periodos: abre el periodo en borrador de la base", (await page.locator(".ns-period-editor .ns-block-title").first().textContent()).includes("Periodo 4 · 2026"));
  await page.locator(".ns-period-editor").getByRole("button", { name: "Guardar periodo" }).click();
  await toastTitle(page, "Periodo guardado");
  const rpc = writes.filter((w) => w.url.includes("/rpc/save_period")).pop();
  report.check("Periodos: guardar usa save_period con fechas, estado y los 4 componentes",
    rpc?.body.p_id === "2026-p4" && rpc.body.p_open === "2026-10-19" && rpc.body.p_status === "draft" && rpc.body.p_components.length === 4 && rpc.body.p_components.reduce((a, c) => a + c.weight, 0) === 100, JSON.stringify(rpc?.body));
  await page.getByRole("button", { name: "Guardar pesos" }).click();
  await toastTitle(page, "Pesos de los periodos guardados");
  const wPatches = writes.filter((w) => w.method === "PATCH" && w.url.includes("academic_periods"));
  report.check("Periodos: guardar pesos actualiza el peso final de cada periodo", wPatches.length === 2 && wPatches.every((w) => w.body.final_weight === 50), JSON.stringify(wPatches.map((w) => w.url.split("?")[1])));
  await page.getByRole("button", { name: "Crear periodo" }).click();
  await toastTitle(page, "Periodo creado");
  const pPost = last("POST", "academic_periods"), cpPost = last("POST", "period_components");
  report.check("Periodos: «Crear periodo» crea el siguiente en borrador con su distribución base",
    pPost?.body.id === "2026-p5" && pPost.body.position === 5 && pPost.body.status === "draft" && pPost.body.open_date === "2026-11-30" && cpPost?.body.length === 4, JSON.stringify([pPost?.body, cpPost?.body?.length]));

  // ---------- 4. Usuarios ----------
  await page.goto(URL_BASE + "#/admin/users");
  await page.locator("tbody tr", { hasText: "Ana Lucía Rosero" }).waitFor({ timeout: 10000 });
  const users = await page.locator("tbody tr").allTextContents();
  report.check("Usuarios: personal con estado de su cuenta y último acceso; acudientes «Sin cuenta»",
    users.length === 4 && users.some((t) => t.includes("Ana Lucía Rosero") && t.includes("Activo") && t.includes("Hoy, ")) && users.some((t) => t.includes("Docente Nuevo") && t.includes("Sin cuenta") && t.includes("Nunca")) && users.some((t) => t.includes("Gloria López") && t.includes("Acudiente")),
    users.join(" / ").slice(0, 400));
  report.check("Usuarios: sin cuenta no se puede desactivar ni restablecer", await page.getByRole("button", { name: "Desactivar a Docente Nuevo" }).isDisabled() && await page.getByRole("button", { name: "Restablecer contraseña de Docente Nuevo" }).isDisabled());
  await page.getByRole("button", { name: "Invitar usuario" }).click();
  await page.locator(".ns-drawer").getByRole("button", { name: "Registrar usuario" }).click();
  report.check("Usuarios: registrar sin datos marca nombre y correo", (await page.locator(".ns-drawer .ns-field-error").count()) === 2);
  await page.locator(".ns-drawer").getByLabel("Nombre completo").fill("Rocío Bastidas");
  await page.locator(".ns-drawer").getByLabel("Correo").fill("Rocio.Bastidas@losandes.edu.co");
  await page.locator(".ns-drawer").getByLabel("Rol").selectOption("staff");
  await page.locator(".ns-drawer").getByRole("button", { name: "Registrar usuario" }).click();
  await toastTitle(page, "Usuario registrado");
  const sPost = last("POST", "staff_directory");
  report.check("Usuarios: registrar guarda el correo en minúsculas con el rol de la base", JSON.stringify(sPost?.body) === JSON.stringify({ email: "rocio.bastidas@losandes.edu.co", full_name: "Rocío Bastidas", role: "admin", area: "Secretaría académica" }), JSON.stringify(sPost?.body));
  await page.getByRole("button", { name: "Desactivar a Ana Lucía Rosero" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Desactivar" }).click();
  await toastTitle(page, "Usuario desactivado");
  const prPatch = last("PATCH", "profiles");
  report.check("Usuarios: desactivar marca el perfil como inactivo", prPatch?.body.status === "inactive" && prPatch.url.includes("id=eq." + ANA), JSON.stringify(prPatch));
  await page.getByRole("button", { name: "Restablecer contraseña de Patricia Ortega" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Restablecer contraseña" }).click();
  await page.locator("[role=alertdialog] .ns-dialog-title", { hasText: "Solicitud enviada" }).waitFor({ timeout: 8000 });
  report.check("Usuarios: restablecer pide a Supabase el enlace para ese correo", last("POST", "x") === undefined && writes.some((w) => w.url.includes("/auth/v1/recover") && w.body.email === "patricia@losandes.edu.co"));
  await page.screenshot({ path: join(OUT, "paso6b3a-usuarios.png") });

  const real = cons.filter((m) => !/status of (400|403|500)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0, real.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
