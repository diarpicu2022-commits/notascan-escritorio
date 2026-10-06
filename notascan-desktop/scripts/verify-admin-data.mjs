// Paso 6b.3a · configuración de Secretaría en modo normal (requiere `npm run build`), con la API de Supabase simulada:
// lo que se lee de la base, lo que se envía al guardar y cómo se muestran las reglas que pone la base.
import { join } from "node:path";
import { OUT, ROOT, URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const UID = "44444444-4444-4444-8444-444444444444";
const ANA = "55555555-5555-4555-8555-555555555555";
const today = new Date().toISOString();

const STAFF = [
  { email: "ana.lucia@losandes.edu.co", full_name: "Ana Lucía Rosero", role: "teacher" },
  { email: "hernando@losandes.edu.co", full_name: "Hernando Villota", role: "principal" },
  { email: "nuevo@losandes.edu.co", full_name: "Docente Nuevo", role: "teacher" },
  { email: "patricia@losandes.edu.co", full_name: "Patricia Ortega", role: "admin" },
];
const PERIODS = [
  { id: "2026-p3", year: 2026, position: 3, name: "Periodo 3", open_date: "2026-07-13", close_date: "2026-10-15", status: "open", final_weight: 50 },
  { id: "2026-p4", year: 2026, position: 4, name: "Periodo 4", open_date: "2026-10-19", close_date: "2026-11-27", status: "draft", final_weight: 50 },
];
const COMPONENTS = PERIODS.flatMap((p) => [["Actividades", 40], ["Exámenes", 30], ["Talleres", 20], ["Actitudinal", 10]].map(([name, weight], i) => ({ period_id: p.id, name, weight, position: i + 1 })));

const writes = [];
let purgeFails = false;
// 6g · autorizaciones del acudiente simuladas (la base las devuelve y las revoca).
const auths = [];
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
  // 6g: Patricia ya aceptó la política vigente (la ventana de aceptación se prueba en Rectoría).
  await page.route("**/rest/v1/consents**", (r) => r.fulfill({ json: [{ id: 1 }] }));
  await page.route("**/rest/v1/guardian_authorizations**", (r) => {
    if (r.request().method() === "POST") {
      const b = r.request().postDataJSON();
      record(r);
      auths.push({ id: 31, guardian_name: b.guardian_name, relationship: b.relationship, health_data: b.health_data, method: "firma-fisica", received_on: b.received_on, policy_version: b.policy_version, revoked_at: null, revoked_reason: null });
      return r.fulfill({ status: 201, body: "" });
    }
    return r.fulfill({ json: auths });
  });
  await page.route("**/functions/v1/purge-exam-photos**", (r) => { record(r); return purgeFails ? r.fulfill({ status: 500, json: { error: "No pudimos borrar todas las fotos." } }) : r.fulfill({ json: { removed: 7, grades: 5 } }); });
  await page.route("**/functions/v1/invite-staff**", (r) => { record(r); r.fulfill({ json: { sent: [r.request().postDataJSON().email] } }); });
  await page.route("**/rest/v1/rpc/**", (r) => {
    record(r);
    const u = r.request().url();
    if (u.includes("current_policy_version")) return r.fulfill({ json: "2026.1" });
    if (u.includes("revoke_guardian_authorization")) { const b = r.request().postDataJSON(); auths.forEach((x) => { if (x.id === b.p_id) { x.revoked_at = new Date().toISOString(); x.revoked_reason = b.p_reason; } }); return r.fulfill({ status: 204, body: "" }); }
    if (u.includes("register_enrollments")) return r.fulfill({ json: r.request().postDataJSON().p.length });
    if (u.includes("register_enrollment")) return r.fulfill({ json: "20261211" });
    // save_period cambia el estado del periodo simulado (para ver el periodo cerrado al recargar).
    if (u.includes("save_period")) { const b = r.request().postDataJSON(); const per = PERIODS.find((x) => x.id === b.p_id); if (per) per.status = b.p_status; }
    return r.fulfill({ status: 204, body: "" });
  });
  await page.route("**/rest/v1/profiles**", (r) => {
    if (r.request().method() !== "GET") { record(r); return r.fulfill({ status: 204, body: "" }); }
    if (decodeURIComponent(r.request().url()).includes("last_seen_at")) return r.fulfill({ json: [
      { id: ANA, email: "ana.lucia@losandes.edu.co", status: "active", last_seen_at: today },
      { id: UID, email: "patricia@losandes.edu.co", status: "active", last_seen_at: today },
    ] });
    // El perfil de la sesión es una fila (id=eq.); una lista de perfiles es una lista, como en la base.
    if (!decodeURIComponent(r.request().url()).includes("id=eq.")) return r.fulfill({ json: [{ email: user.email, full_name: "Patricia Ortega" }] });
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
  await table("students", (u) => {
    if (u.includes("document=in.")) return [{ document: "TI 1084000099" }]; // ya matriculado: duplicado en la importación
    if (u.includes("full_name")) return [{ id: "20261001", full_name: "Ana Bravo Paz", course_id: "6A" }, { id: "20261002", full_name: "Luis Mora Ortiz", course_id: "6A" }];
    return [{ course_id: "6A", status: "active" }, { course_id: "6A", status: "retired" }];
  });
  const OVERVIEW = [
    { id: "20261001", first_names: "Ana", last_names: "Bravo Paz", full_name: "Ana Bravo Paz", doc_type: "Tarjeta de identidad", document: "TI 1084000001", course_id: "6A", grade_level_id: "6", status: "active", enrolled_on: "2026-01-12", library_ok: true, fees_ok: true, documents_ok: true, guardian_name: "Rosa Paz", guardian_rel: "Madre", guardian_phone: "3120000000", avg_grade: 4.5, attendance_pct: 98 },
    { id: "20261002", first_names: "Luis", last_names: "Mora Ortiz", full_name: "Luis Mora Ortiz", doc_type: "Tarjeta de identidad", document: "TI 1084000002", course_id: "6A", grade_level_id: "6", status: "pending", enrolled_on: "2026-01-19", library_ok: true, fees_ok: false, documents_ok: true, guardian_name: "Jorge Mora", guardian_rel: "Padre", guardian_phone: "3157654321", avg_grade: 2.5, attendance_pct: 90 },
  ];
  await table("student_overview", OVERVIEW);
  await table("evaluations", [{ id: 1, assignment_id: 5, weight: 50 }]);
  await table("period_concepts", [{ student_id: "20261001", assignment_id: 5, text: "Alcanza satisfactoriamente el logro del periodo.", state: "reviewed" }]);
  await table("director_messages", [{ student_id: "20261001", text: "Ana tuvo un periodo excelente y es un ejemplo para el grupo.", state: "teacher" }]);
  await table("report_cards", []);
  await table("grades", [{ evaluation_id: 1, student_id: "20261001", value: 4.5 }, { evaluation_id: 1, student_id: "20261002", value: 2.5 }]);
  await table("staff_directory", (u) => (u.includes("role=eq.teacher") ? STAFF.filter((s) => s.role === "teacher") : STAFF));
  await table("guardians", [{ id: 1, full_name: "Gloria López", email: null }]);
  await table("academic_periods", PERIODS);
  await table("period_components", COMPONENTS);
  await page.route("**/rest/v1/teaching_assignments**", (r) => {
    const m = r.request().method();
    if (m === "DELETE") { record(r); return r.fulfill({ status: 400, json: { code: "P0001", message: "Esta asignación ya tiene evaluaciones. Cambia el docente en lugar de eliminarla." } }); }
    if (m !== "GET") { record(r); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: [{ id: 5, teacher_email: "ana.lucia@losandes.edu.co", subject_id: "mat", course_id: "6A", period_id: "2026-p3", subject: { name: "Matemáticas" } }] });
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
  // La impresión del sistema se simula: se cuentan los boletines del documento y se cierra el diálogo.
  await page.addInitScript(() => {
    window.__printed = [];
    window.print = () => { window.__printed.push(document.querySelectorAll(".ns-print-root .ns-paper").length); window.dispatchEvent(new Event("afterprint")); };
  });
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
    users.length === 5 && users.some((t) => t.includes("Ana Lucía Rosero") && t.includes("Activo") && t.includes("Hoy, ")) && users.some((t) => t.includes("Docente Nuevo") && t.includes("Sin cuenta") && t.includes("Nunca")) && users.some((t) => t.includes("Gloria López") && t.includes("Acudiente")),
    users.join(" / ").slice(0, 400));
  report.check("Usuarios: sin cuenta no se desactiva y en vez de restablecer se le envía la invitación",
    await page.getByRole("button", { name: "Desactivar a Docente Nuevo" }).isDisabled() && (await page.getByRole("button", { name: "Restablecer contraseña de Docente Nuevo" }).count()) === 0 && !(await page.getByRole("button", { name: "Enviar invitación a Docente Nuevo" }).isDisabled()));
  await page.getByRole("button", { name: "Invitar usuario" }).click();
  await page.locator(".ns-drawer").getByRole("button", { name: "Registrar usuario" }).click();
  report.check("Usuarios: registrar sin datos marca nombre y correo", (await page.locator(".ns-drawer .ns-field-error").count()) === 2);
  await page.locator(".ns-drawer").getByLabel("Nombre completo").fill("Rocío Bastidas");
  await page.locator(".ns-drawer").getByLabel("Correo").fill("Rocio.Bastidas@losandes.edu.co");
  await page.locator(".ns-drawer").getByLabel("Rol").selectOption("staff");
  await page.locator(".ns-drawer").getByRole("button", { name: "Registrar usuario" }).click();
  await toastTitle(page, "Invitación enviada");
  const sPost = last("POST", "staff_directory");
  const inv = writes.filter((w) => w.url.includes("/functions/v1/invite-staff")).pop();
  report.check("Usuarios: al registrar a alguien sale su invitación con el código (función invite-staff)", inv?.body.email === "rocio.bastidas@losandes.edu.co", JSON.stringify(inv?.body));
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

  // ---------- 5. Inicio de Secretaría (6b.3b) ----------
  await page.goto(URL_BASE + "#/admin/dashboard");
  await page.locator(".ns-list-item").first().waitFor({ timeout: 10000 });
  const tasks = await page.locator(".ns-block--gold .ns-list-item").allTextContents();
  report.check("Inicio: tareas calculadas (cierre del periodo abierto, paz y salvos, hueco de la malla)",
    tasks.some((t) => t.includes("Cerrar Periodo 3") && t.includes("Cierre programado el 15 de octubre")) && tasks.some((t) => t.includes("1 paz y salvos bloqueados")) && tasks.some((t) => t.includes("Asignar docente a 6A · Física")), tasks.join(" / "));
  report.check("Inicio: matrículas pendientes de la base", (await page.locator(".ns-admin-cols tbody tr").first().textContent()).includes("Luis Mora Ortiz"));

  // ---------- 6. Matrícula: registro (6b.3b) ----------
  await page.goto(URL_BASE + "#/admin/enrollment");
  await page.getByRole("textbox", { name: /^Nombres/ }).fill("Emilia");
  await page.getByRole("textbox", { name: /^Apellidos/ }).fill("Narváez Paz");
  await page.getByRole("textbox", { name: /^Número de documento/ }).fill("10845");
  await page.getByLabel(/^Fecha de nacimiento/).fill("2014-03-12");
  await page.getByRole("button", { name: "Siguiente" }).click();
  report.check("Registro: documento corto avisa «entre 8 y 12 dígitos»", (await page.locator(".ns-field-error").textContent()) === "Escribe solo números, entre 8 y 12 dígitos.");
  await page.getByRole("textbox", { name: /^Número de documento/ }).fill("1084512345");
  await page.getByRole("button", { name: "Siguiente" }).click();
  // Datos de salud sin su autorización expresa: se escriben, pero no se envían (6g).
  await page.getByRole("textbox", { name: /^Alergias/ }).fill("Penicilina");
  report.check("Registro (6g): sin autorización para datos de salud, la sección lo advierte", (await page.locator(".ns-reg-body").textContent()).includes("Sin esta autorización, los datos de salud no se guardan."));
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("textbox", { name: /^Nombre completo/ }).fill("Rosa Paz");
  await page.getByLabel(/^Parentesco/).selectOption("Madre");
  await page.getByRole("textbox", { name: /^Teléfono/ }).fill("3120000000");
  await page.getByRole("button", { name: "Siguiente" }).click();
  report.check("Registro: grado y curso salen de la estructura de la base", (await page.getByLabel(/^Curso/).inputValue()) === "6A" && (await page.getByLabel(/^Grado/).inputValue()) === "6");
  const before6g = writes.filter((w) => w.url.includes("/rpc/register_enrollment")).length;
  await page.getByRole("button", { name: "Guardar matrícula" }).click();
  report.check("Registro (6g): sin la autorización firmada del acudiente no se guarda y lo dice",
    writes.filter((w) => w.url.includes("/rpc/register_enrollment")).length === before6g && (await page.locator(".ns-reg-body .ns-field-error").textContent()) === "Sin la autorización firmada del acudiente no se puede matricular.");
  await page.getByLabel(/Recibí la autorización firmada del acudiente/).check();
  await page.getByRole("button", { name: "Guardar matrícula" }).click();
  await page.locator(".ns-reg-done h2").waitFor({ timeout: 8000 });
  const en = writes.filter((w) => w.url.includes("/rpc/register_enrollment")).pop();
  report.check("Registro: una sola llamada con documento normalizado, curso y acudiente; muestra el código de la base",
    en?.body.p.document === "TI 1084512345" && en.body.p.course_id === "6A" && en.body.p.guardian_name === "Rosa Paz" && en.body.p.status === "active" && (await page.locator(".ns-reg-done p").textContent()).includes("Código estudiantil: 20261211."),
    JSON.stringify(en?.body.p));
  report.check("Registro (6g): la autorización va en la misma llamada (recibida, sin salud) y las alergias no se envían",
    JSON.stringify(en?.body.a) === JSON.stringify({ received: true, health: false, guardian_name: "Rosa Paz", relationship: "Madre" }) && !("allergies" in (en?.body.p ?? {})), JSON.stringify(en?.body));

  // ---------- 7. Matrícula: importación CSV (6b.3b) ----------
  await page.goto(URL_BASE + "#/admin/enrollment?tab=import");
  report.check("Importación: sin archivo de ejemplo en modo normal (importaría estudiantes inventados)", (await page.getByRole("button", { name: "Usar archivo de ejemplo" }).count()) === 0);
  const csv = [
    "Nombres;Apellidos;Tipo de documento;Número de documento;Fecha de nacimiento;Curso;Acudiente;Parentesco;Teléfono",
    "Samuel;Ortiz Bravo;Tarjeta de identidad;1084000010;12/03/2014;6A;Marta Bravo;Madre;3120000001",
    "Luciana;Paz Mora;Tarjeta de identidad;10843;12/03/2014;6A;Ana Mora;Madre;3120000002",
    "Tomás;Riascos;Tarjeta de identidad;1084000012;12/03/2014;6C;Pedro Riascos;Padre;3120000003",
    "Gabriela;Zambrano;Tarjeta de identidad;1084000099;12/03/2014;6A;Luz Zambrano;Madre;3120000004",
    "Nicolás;Cabrera;Tarjeta de identidad;1084000013;31/02/2014;6A;Eva Cabrera;Madre;3120000005",
    "Antonella;Burbano;Tarjeta de identidad;1084000014;12/03/2014;6A;Raúl Burbano;Padre;",
    "Samuel;Ortiz Bravo;Tarjeta de identidad;1084000010;12/03/2014;6A;Marta Bravo;Madre;3120000001",
  ].join("\r\n");
  await page.locator("input[type=file]").setInputFiles({ name: "matricula.csv", mimeType: "text/csv", buffer: Buffer.from("\ufeff" + csv, "utf8") });
  await page.locator(".ns-block-title h2", { hasText: "registros encontrados" }).waitFor({ timeout: 8000 });
  report.check("Importación: lee el CSV (7 filas) y muestra la vista previa", (await page.locator(".ns-block-title h2").first().textContent()) === "7 registros encontrados" && (await page.locator("tbody tr").first().textContent()).includes("Samuel"));
  await page.getByRole("button", { name: "Validar archivo" }).click();
  const issueRows = await page.locator("tbody tr").allTextContents();
  report.check("Importación: valida cada fila (documento corto, curso inexistente, ya matriculado, fecha imposible, sin teléfono, repetida)",
    issueRows.length === 6 && ["Documento incompleto (mínimo 8 dígitos)", "El curso 6C no existe", "Ya existe un estudiante con este documento", "Fecha de nacimiento inválida: 31/02/2014", "Falta el teléfono del acudiente", "Fila repetida (igual a la fila 2)"].every((m) => issueRows.some((t) => t.includes(m))),
    issueRows.join(" / ").slice(0, 500));
  await page.getByRole("button", { name: "Corregir errores" }).click();
  await page.getByLabel("Corregir documento de Luciana Paz Mora").fill("1084000011");
  await page.getByLabel("Corregir documento de Luciana Paz Mora").blur();
  await page.getByLabel("Corregir curso de Tomás Riascos").selectOption("6A");
  await page.locator("tbody tr", { hasText: "Nicolás Cabrera" }).getByRole("button", { name: "Omitir fila" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar importación" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Confirmar importación" }).click();
  report.check("Importación (6g): sin marcar que se tienen las autorizaciones firmadas no se importa",
    (await page.locator("[role=alertdialog] .ns-field-error").textContent()) === "Sin las autorizaciones firmadas no se puede importar." && writes.filter((w) => w.url.includes("/rpc/register_enrollments")).length === 0);
  await page.locator("[role=alertdialog]").getByLabel(/Tengo la autorización firmada del acudiente/).check();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Confirmar importación" }).click();
  await page.locator(".ns-reg-done h2", { hasText: "Importación completada" }).waitFor({ timeout: 8000 });
  const imp = writes.filter((w) => w.url.includes("/rpc/register_enrollments")).pop();
  report.check("Importación (6g): una autorización por estudiante en la misma llamada", JSON.stringify(imp?.body.a) === JSON.stringify({ received: true }), JSON.stringify(imp?.body.a));
  const docs = imp?.body.p.map((x) => x.document + "@" + x.course_id).sort().join(", ");
  report.check("Importación: una sola llamada con válidas, corregidas y con advertencia; sin duplicados ni omitidas",
    docs === "TI 1084000010@6A, TI 1084000011@6A, TI 1084000012@6A, TI 1084000014@6A" && (await page.locator(".ns-reg-done p").textContent()) === "4 estudiantes fueron registrados correctamente.", docs);

  // ---------- 7b. Importación desde Excel (.xlsx real, generado con openpyxl) (6b.3c) ----------
  await page.goto(URL_BASE + "#/admin/students"); // misma URL que antes: hay que salir para volver a montar
  await page.goto(URL_BASE + "#/admin/enrollment?tab=import");
  report.check("Importación: la zona vuelve a aceptar Excel (.xlsx) y CSV", (await page.locator(".ns-import-drop").textContent()).includes("Excel .xlsx"));
  await page.locator("input[type=file]").setInputFiles(join(ROOT, "scripts/fixtures/matricula.xlsx"));
  await page.locator(".ns-block-title h2", { hasText: "registros encontrados" }).waitFor({ timeout: 10000 });
  const xprev = await page.locator("tbody tr").first().textContent();
  report.check("Excel: lee la primera hoja con fechas de celda y documentos numéricos", (await page.locator(".ns-block-title h2").first().textContent()) === "2 registros encontrados" && xprev.includes("Mariana") && xprev.includes("1084000021") && xprev.includes("12/03/2014"), xprev);
  await page.getByRole("button", { name: "Validar archivo" }).click();
  await page.getByRole("button", { name: "Corregir errores" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Confirmar importación" }).click();
  await page.locator("[role=alertdialog]").getByLabel(/Tengo la autorización firmada del acudiente/).check();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Confirmar importación" }).click();
  await page.locator(".ns-reg-done h2", { hasText: "Importación completada" }).waitFor({ timeout: 8000 });
  const ximp = writes.filter((w) => w.url.includes("/rpc/register_enrollments")).pop();
  report.check("Excel: importa con documento, curso en mayúsculas y fecha ISO", JSON.stringify(ximp?.body.p.map((x) => [x.document, x.course_id, x.birth_date])) === JSON.stringify([["TI 1084000021", "6A", "2014-03-12"], ["TI 1084000022", "6A", "2014-07-01"]]), JSON.stringify(ximp?.body.p));

  // ---------- 7c. Boletines (6b.3c) ----------
  await page.goto(URL_BASE + "#/admin/reportcards");
  await page.locator("tbody tr", { hasText: "Ana Bravo Paz" }).waitFor({ timeout: 10000 });
  const rcRows = await page.locator("tbody tr").allTextContents();
  report.check("Boletines: estado de cada estudiante (Luis bloqueado por paz y salvo)", rcRows.some((t) => t.includes("Ana Bravo Paz") && t.includes("4.5") && t.includes("Pendiente")) && rcRows.some((t) => t.includes("Luis Mora Ortiz") && t.includes("Bloqueado")), rcRows.join(" / "));
  await page.locator("tbody tr", { hasText: "Ana Bravo Paz" }).getByRole("button", { name: "Previsualizar" }).click();
  const paper = await page.locator("[role=dialog] .ns-paper").textContent();
  report.check("Boletín: materia, docente, nota verificada, concepto revisado, mensaje del director, puesto y rector reales",
    ["Matemáticas", "Ana Lucía Rosero", "4.5", "Alcanza satisfactoriamente el logro del periodo.", "Ana tuvo un periodo excelente", "Puesto en el curso1 de 2", "Hernando Villota", "Periodo 3 · 2026"].every((t) => paper.includes(t)), paper.slice(0, 300));
  await page.locator("[role=dialog]").getByRole("button", { name: "Generar PDF" }).click();
  await page.locator(".ns-toast-title", { hasText: "boletín generado" }).waitFor({ timeout: 8000 });
  const rcPost = last("POST", "report_cards");
  report.check("Boletín: abre la impresión con un boletín y lo marca como generado en la base",
    JSON.stringify(await page.evaluate(() => window.__printed)) === "[1]" && JSON.stringify(rcPost?.body) === JSON.stringify([{ student_id: "20261001", period_id: "2026-p3", status: "generated" }]), JSON.stringify(rcPost?.body));
  await page.getByRole("button", { name: "Generar todos" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Generar todos" }).click();
  await page.waitForTimeout(600);
  report.check("Boletines: «Generar todos» imprime solo los habilitados (1 de 2), uno por página", JSON.stringify(await page.evaluate(() => window.__printed)) === "[1,1]", JSON.stringify(await page.evaluate(() => window.__printed)));
  await page.screenshot({ path: join(OUT, "paso6b3c-boletines.png") });

  // ---------- 8. Paz y salvo (6b.3b) ----------
  await page.goto(URL_BASE + "#/admin/clearances");
  await page.locator("#flt-Curso").selectOption("6A");
  await page.locator("tbody tr", { hasText: "Luis Mora Ortiz" }).waitFor({ timeout: 10000 });
  await page.getByRole("switch", { name: "Pensiones de Luis Mora Ortiz" }).click();
  await page.waitForTimeout(400);
  const cl = last("PATCH", "students");
  report.check("Paz y salvo: el interruptor guarda solo esa obligación y habilita al estudiante",
    JSON.stringify(cl?.body) === JSON.stringify({ fees_ok: true }) && cl.url.includes("id=in.(20261002)") && (await page.locator("tbody tr", { hasText: "Luis Mora Ortiz" }).locator(".ns-badge").textContent()) === "Habilitado", JSON.stringify(cl));

  // ---------- 9. Ranking (6b.3b) ----------
  await page.goto(URL_BASE + "#/admin/ranking");
  await page.locator("tbody tr", { hasText: "Ana Bravo Paz" }).waitFor({ timeout: 10000 });
  const rk = await page.locator("tbody tr").allTextContents();
  report.check("Ranking: ordena por notas verificadas del periodo abierto, con materias aprobadas reales",
    rk.length === 2 && rk[0].includes("Ana Bravo Paz") && rk[0].includes("4.5") && rk[0].includes("1 / 1") && rk[1].includes("Luis Mora Ortiz") && rk[1].includes("0 / 1") && rk[1].includes("En riesgo"), rk.join(" / "));
  await page.screenshot({ path: join(OUT, "paso6b3b-ranking.png") });

  // ---------- Menú: año lectivo y periodo abierto de la base (6b.4c) ----------
  await page.goto(URL_BASE + "#/admin/dashboard");
  await page.locator(".ns-sidebar-course").waitFor({ timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".ns-sidebar-course")?.textContent?.includes("Periodo"), null, { timeout: 8000 }).catch(() => {});
  report.check("Menú (Secretaría): año lectivo con el periodo abierto de la base", (await page.locator(".ns-sidebar-course").textContent()) === "Año lectivo2026 · Periodo 3", await page.locator(".ns-sidebar-course").textContent());

  // ---------- Autorización del acudiente en el perfil (6g): registrar y revocar ----------
  await page.route("**/rest/v1/student_overview?*id=eq.20261002*", (r) => r.fulfill({ json: [{ id: "20261002", first_names: "Luis", last_names: "Mora Ortiz", full_name: "Luis Mora Ortiz", doc_type: "Tarjeta de identidad", document: "TI 1084000002", course_id: "6A", grade_level_id: "6", status: "pending", enrolled_on: "2026-01-19", library_ok: true, fees_ok: false, documents_ok: true, guardian_name: "Jorge Mora", guardian_rel: "Padre", guardian_phone: "3157654321", avg_grade: 2.5, attendance_pct: 90 }] }));
  await page.goto(URL_BASE + "#/admin/profile/20261002?tab=info");
  const authBox = page.locator("[aria-label='Autorización del acudiente']");
  await authBox.getByRole("button", { name: "Registrar autorización" }).waitFor({ timeout: 10000 });
  report.check("Perfil (6g): un estudiante matriculado antes aparece «Sin autorización registrada» y Secretaría puede registrarla",
    (await authBox.textContent()).includes("Sin autorización registrada"));
  await authBox.getByRole("button", { name: "Registrar autorización" }).click();
  const regDlg = page.locator("[role=dialog]", { hasText: "Registrar autorización del acudiente" });
  report.check("Perfil (6g): el formulario trae el acudiente de la matrícula", (await regDlg.getByLabel(/Quién firma/).inputValue()) === "Jorge Mora" && (await regDlg.getByLabel(/Parentesco/).inputValue()) === "Padre");
  await regDlg.getByLabel(/Autorizó expresamente los datos de salud/).check();
  await regDlg.getByRole("button", { name: "Registrar" }).click();
  await toastTitle(page, "Autorización registrada");
  const authPost = writes.filter((w) => w.url.includes("/rest/v1/guardian_authorizations")).pop();
  report.check("Perfil (6g): registrar guarda versión vigente, quien firma, parentesco y salud, sin firma del cliente",
    authPost?.body.student_id === "20261002" && authPost.body.policy_version === "2026.1" && authPost.body.guardian_name === "Jorge Mora" && authPost.body.relationship === "Padre" && authPost.body.health_data === true && !("recorded_by" in authPost.body),
    JSON.stringify(authPost?.body));
  await authBox.getByRole("button", { name: "Revocar autorización" }).waitFor({ timeout: 8000 });
  await authBox.getByRole("button", { name: "Revocar autorización" }).click();
  const revDlg = page.locator("[role=alertdialog]", { hasText: "¿Revocar la autorización?" });
  report.check("Perfil (6g): revocar exige motivo", await revDlg.getByRole("button", { name: "Revocar" }).isDisabled());
  await revDlg.getByLabel(/Motivo/).fill("El acudiente retiró la autorización");
  await revDlg.getByRole("button", { name: "Revocar" }).click();
  await toastTitle(page, "Autorización revocada");
  const rev = writes.filter((w) => w.url.includes("/rpc/revoke_guardian_authorization")).pop();
  await page.waitForTimeout(800);
  report.check("Perfil (6g): la revocatoria va a la base con el motivo y queda en el historial",
    JSON.stringify(rev?.body) === JSON.stringify({ p_id: 31, p_reason: "El acudiente retiró la autorización" }) && (await authBox.textContent()).includes("El acudiente retiró la autorización") && (await authBox.textContent()).includes("Sin autorización registrada"),
    JSON.stringify(rev?.body));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "paso6g-perfil-autorizacion.png"), fullPage: true });

  // ---------- Cerrar el periodo borra sus fotos de exámenes (6e) ----------
  await page.goto(URL_BASE + "#/admin/periods");
  await page.locator(".ns-period-editor").waitFor({ timeout: 10000 });
  await page.getByRole("tab", { name: /Periodo 3/ }).click();
  await page.locator(".ns-period-editor").getByLabel("Estado").selectOption("closed");
  await page.locator(".ns-period-editor").getByRole("button", { name: "Guardar periodo" }).click();
  await toastTitle(page, "Periodo cerrado");
  const purgeCall = writes.filter((w) => w.url.includes("/functions/v1/purge-exam-photos")).pop();
  report.check("Cerrar el periodo borra sus fotos (purge-exam-photos con el periodo) y dice cuántas, con las notas a salvo",
    JSON.stringify(purgeCall?.body) === JSON.stringify({ period_id: "2026-p3" }) && (await page.locator(".ns-toast-text").last().textContent()) === "Se borraron 7 fotos de exámenes. Las notas se conservan.", JSON.stringify(purgeCall?.body));
  const retry = page.locator(".ns-period-editor").getByRole("button", { name: "Borrar fotos de exámenes del periodo" });
  await retry.waitFor({ timeout: 8000 });
  purgeFails = true;
  await retry.click();
  await toastTitle(page, "No se borraron las fotos");
  report.check("Periodo cerrado: si el borrado falla lo dice y se puede reintentar desde el periodo",
    (await page.locator(".ns-toast-text").last().textContent()) === "No pudimos borrar todas las fotos. Usa «Borrar fotos de exámenes del periodo» para intentarlo de nuevo.");
  purgeFails = false;
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "paso6e-periodo-cerrado.png") });

  // ---------- Meta institucional (6b.4b, enmienda 5) ----------
  await page.goto(URL_BASE + "#/admin/periods");
  const goalBlock = page.locator("[aria-label='Meta institucional']");
  await goalBlock.waitFor({ timeout: 10000 });
  await goalBlock.getByLabel("Promedio esperado por grado").fill("3.84");
  await goalBlock.getByRole("button", { name: "Guardar meta" }).click();
  await toastTitle(page, "Meta institucional guardada");
  const goalRpc = writes.filter((w) => w.url.includes("/rpc/set_performance_goal")).pop();
  report.check("Meta: redondea a un decimal (3.84 → 3.8) y la guarda por set_performance_goal", JSON.stringify(goalRpc?.body) === JSON.stringify({ p_goal: 3.8 }), JSON.stringify(goalRpc?.body));

  const real = cons.filter((m) => !/status of (400|403|500)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0, real.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
