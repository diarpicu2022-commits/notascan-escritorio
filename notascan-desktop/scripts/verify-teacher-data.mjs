// Paso 6b.2 · pantallas del Docente en modo normal (requiere `npm run build`), con la API de Supabase simulada:
// lo que se lee de la base, lo que se envía al guardar (sin firmas desde el cliente) y qué pasa si la base lo rechaza.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const toastTitle = (page, text) => page.locator(".ns-toast-title", { hasText: text }).waitFor({ timeout: 8000 }).then(() => true, () => false);
const UID = "33333333-3333-4333-8333-333333333333";
const today = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();

const PERIOD = { name: "Periodo 3", status: "open", open_date: "2026-07-13", close_date: "2026-10-15" };
const ASSIGNMENTS = [
  { id: 11, course_id: "7A", subject_id: "mat", period_id: "2026-p3", teacher_email: "ana.lucia@losandes.edu.co", subject: { name: "Matemáticas" }, period: PERIOD },
  { id: 12, course_id: "7B", subject_id: "mat", period_id: "2026-p3", teacher_email: "ana.lucia@losandes.edu.co", subject: { name: "Matemáticas" }, period: PERIOD },
];
// 6c · reportes: lo que se guarda en el historial y lo que devuelve.
const reportsSaved = [];
let reportHistory = [];
const STUDENTS = [
  { id: "20261175", full_name: "María Fernanda López Rosero", course_id: "7A" },
  { id: "20261182", full_name: "Juan Sebastián Martínez Paz", course_id: "7A" },
  { id: "20261189", full_name: "Valentina Guerrero Ortiz", course_id: "7A" },
  { id: "20261201", full_name: "Mateo Burbano Paz", course_id: "7B" },
];
const EVALS = [
  { id: 101, assignment_id: 11, name: "Parcial 2", kind: "examen", weight: 25, status: "en-revision", due_date: "2026-09-28", assignment: { course_id: "7A", period_id: "2026-p3", subject: { name: "Matemáticas" } } },
  { id: 102, assignment_id: 11, name: "Taller 3", kind: "taller", weight: 15, status: "borrador", due_date: "2026-10-05", assignment: { course_id: "7A", subject: { name: "Matemáticas" } } },
];
const REVIEW = [
  { id: 501, evaluation_id: 101, student_id: "20261175", detected: 4.5, confidence: 98, value: 4.5, status: "pending", student: { full_name: STUDENTS[0].full_name, course_id: "7A" } },
  { id: 502, evaluation_id: 101, student_id: "20261182", detected: 3.8, confidence: 62, value: 3.8, status: "needs-review", student: { full_name: STUDENTS[1].full_name, course_id: "7A" } },
];

/** Registro de escrituras por tabla y respuesta configurable (ok o rechazo). */
let reminderSeen = false;
const seenCalls = [];
const writes = { grades: [], attendance: [], observations: [], period_concepts: [], evaluations: [], recoveries: [], director_messages: [] };
const reject = { grades: null, abort: false };

async function mockApi(page) {
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: "ana.lucia@losandes.edu.co", app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  // Lo que la prueba no simula responde vacío (p. ej. el registro de último acceso, desde 6b.3a); las rutas
  // registradas después tienen prioridad.
  await page.route("**/rest/v1/**", (r) => r.fulfill({ json: [] }));
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  // El perfil de la sesión es una fila (id=eq.); una lista de perfiles es una lista, como en la base.
  await page.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: decodeURIComponent(r.request().url()).includes("id=eq.")
    ? { id: UID, email: user.email, full_name: "Ana Lucía Rosero", role: "teacher", status: "active" }
    : [{ email: user.email, full_name: "Ana Lucía Rosero" }] }));
  await page.route("**/rest/v1/teaching_assignments**", (r) => {
    const m = decodeURIComponent(r.request().url()).match(/course_id=eq\.(\w+)/);
    return r.fulfill({ json: m ? ASSIGNMENTS.filter((a) => a.course_id === m[1]) : ASSIGNMENTS });
  });
  await page.route("**/rest/v1/subjects**", (r) => r.fulfill({ json: [{ id: "mat", name: "Matemáticas" }] }));
  await page.route("**/rest/v1/institutions**", (r) => r.fulfill({ json: [{ id: "00000000-0000-4000-8000-000000000001", name: "Colegio Los Andes", short_name: "LA", city: "Pasto", department: "Nariño", resolution: "Resolución 0123 de 2015", dane: "152001000000", logo_path: null, status: "active", performance_goal: 3.5 }] }));
  await page.route("**/rest/v1/generated_reports**", (r) => {
    if (r.request().method() === "POST") { reportsSaved.push(r.request().postDataJSON()); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: reportHistory });
  });
  // 6b.4c: perfil visto por el docente (la vista no trae datos del acudiente al docente).
  await page.route("**/rest/v1/student_overview**", (r) => r.fulfill({ json: [{ id: "20261175", first_names: "María Fernanda", last_names: "López Rosero", full_name: "María Fernanda López Rosero", doc_type: "Tarjeta de identidad", document: "TI 1084000175", course_id: "7A", grade_level_id: "7", status: "active", enrolled_on: "2026-01-12", library_ok: true, fees_ok: true, documents_ok: true, guardian_name: null, guardian_rel: null, guardian_phone: null, avg_grade: 4.0, attendance_pct: null }] }));
  // Recordatorio de Rectoría (6b.4b): uno sin ver hasta que se marca con «Entendido».
  await page.route("**/rest/v1/teacher_reminders**", (r) => r.fulfill({ json: reminderSeen ? [] : [{ id: 7, message: "Tienes 2 evaluaciones con notas sin verificar en el Periodo 3 (82 % registrado). Ponte al día, por favor.", created_at: new Date().toISOString(), sender: { full_name: "Hernando Villota" } }] }));
  await page.route("**/rest/v1/rpc/mark_reminder_seen**", (r) => { seenCalls.push(r.request().postDataJSON()); reminderSeen = true; r.fulfill({ status: 204, body: "" }); });
  await page.route("**/rest/v1/students**", (r) => {
    const u = decodeURIComponent(r.request().url());
    const one = u.match(/[?&]id=eq\.(\w+)/);
    if (one) return r.fulfill({ json: STUDENTS.filter((s) => s.id === one[1]).map((s) => ({ ...s, document: "TI 1084000175" })) });
    return r.fulfill({ json: STUDENTS.filter((s) => u.includes(s.course_id)) });
  });
  await page.route("**/rest/v1/evaluations**", (r) => {
    if (r.request().method() === "POST") { writes.evaluations.push(r.request().postDataJSON()); return r.fulfill({ status: 201, body: "" }); }
    const u = decodeURIComponent(r.request().url());
    const one = u.match(/[?&]id=eq\.(\d+)/);
    if (one) return r.fulfill({ json: EVALS.filter((e) => e.id === Number(one[1])) });
    // 7B (asignación 12) aún no tiene evaluaciones.
    return r.fulfill({ json: u.includes("assignment_id=eq.12") ? [] : EVALS });
  });
  await page.route("**/rest/v1/grades**", (r) => {
    const req = r.request();
    if (req.method() === "POST") {
      writes.grades.push({ url: decodeURIComponent(req.url()), body: req.postDataJSON() });
      if (reject.abort) return r.abort("failed"); // red caída a mitad de camino
      return reject.grades ? r.fulfill({ status: 400, json: { message: reject.grades } }) : r.fulfill({ status: 201, body: "" });
    }
    const u = decodeURIComponent(req.url());
    if (u.includes("evaluation_id=eq.101")) return r.fulfill({ json: REVIEW });
    // Resumen del docente (inicio, estudiantes, evaluaciones, recuperaciones).
    if (u.includes("verified_at")) return r.fulfill({ json: [
      { evaluation_id: 101, student_id: "20261175", status: "verified", value: 4.0, verified_at: today + "T10:00:00Z", verified_by: UID },
      { evaluation_id: 101, student_id: "20261182", status: "needs-review", value: null, verified_at: null, verified_by: null },
      { evaluation_id: 102, student_id: "20261189", status: "verified", value: 2.0, verified_at: today + "T11:00:00Z", verified_by: UID },
    ] });
    // Planilla y conceptos: solo verificadas. María tiene 4.0 en el Parcial 2.
    return r.fulfill({ json: [{ evaluation_id: 101, student_id: "20261175", value: 4.0 }] });
  });
  await page.route("**/rest/v1/attendance**", (r) => {
    const req = r.request();
    if (req.method() === "POST") { writes.attendance.push({ url: decodeURIComponent(req.url()), body: req.postDataJSON() }); return r.fulfill({ status: 201, body: "" }); }
    const u = decodeURIComponent(req.url());
    if (u.includes("state=eq.absent")) return r.fulfill({ json: [{ student_id: "20261182" }, { student_id: "20261182" }] });
    if (u.includes("student_id=eq.")) return r.fulfill({ json: [] }); // perfil (6b.4c): sin asistencia registrada
    return r.fulfill({ json: [{ student_id: "20261182", state: "absent", note: null }] });
  });
  await page.route("**/rest/v1/observations**", (r) => {
    const req = r.request();
    if (req.method() === "POST") { writes.observations.push(req.postDataJSON()); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: [{ id: 1, type: "attention", title: "Tarea sin entregar", context: "Matemáticas · taller 3", created_at: "2026-09-11T15:00:00Z", student: { full_name: STUDENTS[1].full_name, course_id: "7A" }, author: { full_name: "Ana Lucía Rosero" } }] });
  });
  await page.route("**/rest/v1/recoveries**", (r) => {
    if (r.request().method() === "POST") { writes.recoveries.push({ url: decodeURIComponent(r.request().url()), body: r.request().postDataJSON() }); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: [] });
  });
  await page.route("**/rest/v1/academic_periods**", (r) => r.fulfill({ json: [{ id: "2026-p3", name: "Periodo 3", year: 2026, position: 3, final_weight: 25, status: "open" }] }));
  await page.route("**/rest/v1/director_messages**", (r) => { writes.director_messages.push({ url: decodeURIComponent(r.request().url()), body: r.request().postDataJSON() }); return r.fulfill({ status: 201, body: "" }); });
  await page.route("**/rest/v1/rpc/director_overview**", (r) => r.fulfill({ json: [
    { student_id: "20261175", full_name: STUDENTS[0].full_name, course_id: "7A", subjects: [{ subject: "Física", grade: 3.4 }, { subject: "Matemáticas", grade: 4.6 }], absences: 1, message: null, message_state: null },
    { student_id: "20261182", full_name: STUDENTS[1].full_name, course_id: "7A", subjects: [], absences: 0, message: null, message_state: null },
  ] }));
  await page.route("**/rest/v1/period_concepts**", (r) => {
    const req = r.request();
    if (req.method() === "POST") { writes.period_concepts.push({ url: decodeURIComponent(req.url()), body: req.postDataJSON() }); return r.fulfill({ status: 201, body: "" }); }
    return r.fulfill({ json: [] });
  });

  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.getByText("Docente", { exact: true }).click();
  await page.locator("#auth-email").fill(user.email);
  await page.locator("#auth-pass").fill("secreta123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/#\/teacher\/dashboard$/, { timeout: 8000 });
}

const signed = (o) => ["verified_by", "verified_at", "recorded_by", "reviewed_by", "author_id", "result"].some((k) => k in o);

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  // La impresión (PDF) se simula: se guarda el texto del documento que se imprimiría y se cierra el diálogo.
  await page.addInitScript(() => {
    window.__printed = [];
    window.print = () => { window.__printed.push(document.querySelector(".ns-print-root")?.textContent ?? ""); window.dispatchEvent(new Event("afterprint")); };
  });
  const cons = watchConsole(page);
  await mockApi(page);

  // ---------- 1. Revisión: la evaluación en revisión con las lecturas de la IA ----------
  await page.goto(URL_BASE + "#/teacher/review");
  await page.locator(".ns-card:not(.ns-card--skeleton)").first().waitFor({ timeout: 10000 });
  const eyebrow = await page.locator(".ns-header .ns-overline, .ns-eyebrow").first().textContent().catch(() => "");
  report.check("Revisión: muestra la evaluación de la base y sus 2 lecturas", (await page.locator(".ns-card").count()) === 2 && (await page.content()).includes("Parcial 2 · Matemáticas · 7A"), eyebrow);
  await page.getByRole("button", { name: "Confirmar calificación de " + STUDENTS[0].full_name }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Confirmar y guardar" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Confirmar y guardar" }).click();
  await page.locator(".ns-toast-title").waitFor({ timeout: 8000 });
  const rv = writes.grades[0];
  report.check("Revisión: guarda solo la tarjeta que cambió, como verificada y sin firma del cliente",
    rv && rv.url.includes("on_conflict=id") && Array.isArray(rv.body) && rv.body.length === 1 && rv.body[0].id === 501 && rv.body[0].status === "verified" && rv.body[0].value === 4.5 && !signed(rv.body[0]),
    JSON.stringify(rv?.body));
  report.check("Revisión: confirma «1 calificaciones guardadas»", (await page.locator(".ns-toast-title").textContent()) === "1 calificaciones guardadas");
  await page.screenshot({ path: join(OUT, "paso6b2-revision.png") });

  // ---------- 2. Planilla: columnas = evaluaciones; celdas = notas verificadas ----------
  await page.goto(URL_BASE + "#/teacher/gradebook");
  await page.locator(".ns-gb").waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  const heads = await page.locator(".ns-gb thead th").allTextContents();
  report.check("Planilla: columnas de la base con su porcentaje", heads.join("|") === "Estudiante|Parcial 225%|Taller 315%|Promedioautomático", heads.join("|"));
  const first = await page.locator(".ns-gb tbody tr").first().textContent();
  report.check("Planilla: nota verificada en su celda y «—» donde no hay", first.includes("4.0") && first.includes("—"), first);
  writes.grades.length = 0;
  await page.keyboard.press("ArrowRight"); // María · Taller 3
  await page.keyboard.press("4");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const gw = writes.grades[0];
  report.check("Planilla: escribir 4 guarda la nota verificada de esa evaluación, sin firma del cliente",
    gw && gw.url.includes("on_conflict=evaluation_id,student_id") && gw.body.evaluation_id === 102 && gw.body.student_id === "20261175" && gw.body.value === 4 && gw.body.status === "verified" && !signed(gw.body),
    JSON.stringify(gw));
  report.check("Planilla: la barra confirma lo guardado", /Guardado · María, Taller 3: 4\.0/.test(await page.locator(".ns-gb-status").textContent()));
  // La base rechaza (evaluación cerrada): la celda vuelve y se dice por qué.
  reject.grades = "La evaluación está cerrada. Solicita el cambio de nota a Rectoría.";
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft"); // María · Parcial 2 (4.0)
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const status = await page.locator(".ns-gb-status").textContent();
  const cell = await page.locator(".ns-gb tbody tr").first().locator(".ns-gcell").first().textContent();
  report.check("Planilla: si la base rechaza, la celda vuelve a 4.0 y la barra explica que la evaluación está cerrada",
    cell === "4.0" && status.includes("La evaluación está cerrada. Solicita el cambio de nota a Rectoría.") && status.includes("volvió a 4.0") && (await page.locator(".ns-gb-status.is-error").count()) === 1, `${cell} · ${status}`);
  reject.grades = null;
  await page.screenshot({ path: join(OUT, "paso6b2-planilla-rechazo.png") });
  await page.locator("#flt-Curso").selectOption("12");
  await page.locator(".ns-empty-title").waitFor({ timeout: 8000 });
  report.check("Planilla: un curso sin evaluaciones lo dice y ofrece «Ir a evaluaciones»",
    (await page.locator(".ns-empty-title").textContent()) === "Este curso aún no tiene evaluaciones." && (await page.getByRole("button", { name: "Ir a evaluaciones" }).count()) === 1);

  // ---------- 3. Asistencia ----------
  await page.goto(URL_BASE + "#/teacher/attendance");
  await page.locator(".ns-att-row").first().waitFor({ timeout: 10000 });
  report.check("Asistencia: carga lo registrado (Juan Sebastián con inasistencia) y la fecha de hoy",
    (await page.locator(".ns-att-row.is-absent").count()) === 1 && (await page.locator("input[type=date]").inputValue()) === today, await page.locator("input[type=date]").inputValue());
  await page.getByRole("button", { name: "Marcar el resto como presentes" }).click();
  await page.getByRole("button", { name: "Guardar asistencia" }).click();
  await page.locator(".ns-toast-title", { hasText: "Asistencia guardada" }).waitFor({ timeout: 8000 });
  const aw = writes.attendance[0];
  report.check("Asistencia: guarda las 3 marcas de la clase de hoy (hora 1), sin firma del cliente",
    aw && aw.url.includes("on_conflict=student_id,course_id,class_date,slot") && aw.body.length === 3 && aw.body.every((x) => x.class_date === today && x.slot === 1 && x.course_id === "7A" && !signed(x)) && aw.body.filter((x) => x.state === "absent").length === 1,
    JSON.stringify(aw?.body));

  // ---------- 4. Comportamiento ----------
  await page.goto(URL_BASE + "#/teacher/behavior");
  await page.locator(".ns-tl-item").first().waitFor({ timeout: 10000 });
  report.check("Observador: muestra las anotaciones de la base con fecha y autor", (await page.locator(".ns-timeline").textContent()).includes("Tarea sin entregar") && (await page.locator(".ns-tl-date").first().textContent()) === "11 DE SEPTIEMBRE");
  await page.locator(".ns-behavior select").selectOption("20261175");
  await page.getByLabel("Título").fill("Participación destacada");
  await page.getByRole("button", { name: "Agregar observación" }).click();
  await page.locator(".ns-toast-title", { hasText: "Observación registrada" }).waitFor({ timeout: 8000 });
  const ow = writes.observations[0];
  report.check("Observador: registra con el id del estudiante y sin autor desde el cliente",
    ow && ow.student_id === "20261175" && ow.type === "positive" && ow.title === "Participación destacada" && !signed(ow), JSON.stringify(ow));
  report.check("Observador: el aviso dice dónde quedó, sin prometer notificaciones", (await page.locator(".ns-toast-text").textContent()) === "Quedó en el observador de María.");

  // ---------- 5. Conceptos ----------
  await page.goto(URL_BASE + "#/teacher/concepts");
  await page.locator(".ns-concept").first().waitFor({ timeout: 10000 });
  const conceptHead = await page.locator(".ns-concept").first().textContent();
  report.check("Conceptos: nota del periodo con las verificadas (4.0) y faltas del periodo", conceptHead.includes("4.0") && (await page.locator(".ns-concept").nth(1).textContent()).includes("Faltas: 2"), conceptHead.slice(0, 120));
  report.check("Conceptos: sin notas verificadas muestra «—» y «Sin nota», no un desempeño inventado", (await page.locator(".ns-concept").nth(1).locator(".ns-concept-grade").textContent()) === "—Sin nota");
  await page.locator(".ns-concept").first().locator("textarea").fill("Alcanza satisfactoriamente el logro del periodo.");
  await page.locator(".ns-concept").nth(1).locator("textarea").focus(); // sale del primero: se guarda
  await page.waitForTimeout(500);
  const cw = writes.period_concepts[0];
  report.check("Conceptos: al salir del texto se guarda como «escrito por el docente», sin firma del cliente",
    cw && cw.url.includes("on_conflict=student_id,assignment_id") && cw.body[0].student_id === "20261175" && cw.body[0].assignment_id === 11 && cw.body[0].state === "teacher" && !signed(cw.body[0]), JSON.stringify(cw));
  await page.locator(".ns-concept").nth(1).getByRole("button", { name: "Sugerir con IA" }).click();
  await page.locator(".ns-toast-title", { hasText: "sin notas verificadas" }).waitFor({ timeout: 4000 }).catch(() => {});
  report.check("Conceptos: sin nota del periodo no se inventa un borrador; se avisa", (await page.locator(".ns-toast-title").textContent()) === "1 estudiante sin notas verificadas");
  await page.screenshot({ path: join(OUT, "paso6b2-conceptos.png") });

  // ---------- 5b. Mensajes del director de grupo (6b.3c) ----------
  await page.goto(URL_BASE + "#/teacher/concepts");
  await page.getByRole("tab", { name: "Mensajes de director · 7A" }).click();
  await page.locator(".ns-concept").first().waitFor({ timeout: 8000 });
  report.check("Director: pestaña propia con los estudiantes de su grupo", (await page.locator(".ns-header-title").textContent()).includes("Mensajes del director") && (await page.locator(".ns-concept").count()) === 2);
  await page.locator(".ns-concept").first().getByRole("button", { name: "Sugerir con IA" }).click();
  await page.locator(".ns-concept").first().getByRole("button", { name: "Aprobar borrador" }).waitFor({ timeout: 4000 });
  const draftText = await page.locator(".ns-concept").first().locator("textarea").inputValue();
  report.check("Director: el borrador nombra su mejor y su materia más baja con notas reales", draftText.includes("Se destaca en Matemáticas (4.6)") && draftText.includes("Física (3.4)"), draftText);
  await page.locator(".ns-concept").first().getByRole("button", { name: "Aprobar borrador" }).click();
  await page.waitForTimeout(500);
  const dm = writes.director_messages.filter((w) => w.body[0].state === "reviewed").pop();
  report.check("Director: aprobar guarda el mensaje revisado del periodo, sin firma del cliente",
    dm && dm.url.includes("on_conflict=student_id,period_id") && dm.body[0].student_id === "20261175" && dm.body[0].period_id === "2026-p3" && !signed(dm.body[0]), JSON.stringify(dm));
  await page.locator(".ns-concept").nth(1).getByRole("button", { name: "Sugerir con IA" }).click();
  report.check("Director: sin notas del periodo no se inventa un mensaje", (await page.locator(".ns-toast-title").last().textContent()) === "1 estudiante sin notas verificadas");

  // ---------- 6. Inicio (6b.2b) ----------
  await page.goto(URL_BASE + "#/teacher/dashboard");
  await page.locator(".ns-home-hero-title").waitFor({ timeout: 10000 });
  const title = await page.locator(".ns-header-title").textContent();
  const hero = await page.locator(".ns-home-hero").textContent();
  report.check("Inicio: saludo con el nombre real y la evaluación en revisión con su avance (1 de 3)",
    /Buen[oa]s (días|tardes|noches), Ana Lucía/.test(title) && hero.includes("Parcial 2 · Matemáticas") && hero.includes("1 de 3 verificadas") && hero.includes("2 pendientes"), title + " | " + hero);
  const stats = await page.locator(".ns-home-stat .ns-bento-value").allTextContents();
  report.check("Inicio: 1 nota por verificar, 2 verificadas este mes, promedio 3.0 de Matemáticas 7A",
    stats.join("|") === "1|2|3.0" && (await page.locator(".ns-home-stat").nth(2).textContent()).includes("promedio de Matemáticas 7A"), stats.join("|"));
  report.check("Inicio: «Requieren tu atención» lista la lectura sin detección", (await page.locator(".ns-block--paper").textContent()).includes("Juan Sebastián Martínez PazSin detección · Parcial 2"));
  const firstAttention = await page.locator(".ns-block--paper .ns-list-item").first().textContent();
  report.check("Inicio: el recordatorio de Rectoría va primero en «Requieren tu atención» con quién lo envía",
    firstAttention.includes("Recordatorio de Hernando Villota") && firstAttention.includes("Tienes 2 evaluaciones con notas sin verificar en el Periodo 3 (82 % registrado)."), firstAttention);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, "paso6b4b-inicio-recordatorio.png") });
  await page.getByRole("button", { name: "Marcar como visto el recordatorio de Hernando Villota" }).click();
  await page.waitForTimeout(800);
  report.check("Inicio: «Entendido» lo marca como visto en la base (mark_reminder_seen) y desaparece",
    JSON.stringify(seenCalls.at(-1)) === JSON.stringify({ p_id: 7 }) && !(await page.locator(".ns-block--paper").textContent()).includes("Recordatorio de"), JSON.stringify(seenCalls));
  await page.screenshot({ path: join(OUT, "paso6b2b-inicio.png") });

  // ---------- 7. Estudiantes (6b.2b) ----------
  await page.goto(URL_BASE + "#/teacher/students");
  await page.locator(".ns-table tbody tr").first().waitFor({ timeout: 10000 });
  const srows = await page.locator(".ns-table tbody tr").allTextContents();
  report.check("Estudiantes: los 4 de sus cursos, con promedio de notas verificadas y última evaluación",
    srows.length === 4 && srows.some((t) => t.includes("María Fernanda López Rosero") && t.includes("4.0") && t.includes("Parcial 2")) && srows.some((t) => t.includes("Mateo Burbano Paz") && t.includes("Sin calificaciones")), srows.join(" / ").slice(0, 300));
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar lista" }).click()]);
  const csv = (await (await import("node:fs/promises")).readFile(await download.path(), "utf8"));
  report.check("Estudiantes: «Exportar lista» descarga un CSV con encabezados y las 4 filas",
    download.suggestedFilename() === "estudiantes-todos.csv" && csv.startsWith("\ufeffID;Estudiante;Curso;Promedio;Última evaluación;Estado") && csv.trim().split("\r\n").length === 5, download.suggestedFilename());

  // ---------- 8. Evaluaciones (6b.2b) ----------
  await page.goto(URL_BASE + "#/teacher/evaluations");
  await page.locator(".ns-eval").first().waitFor({ timeout: 10000 });
  report.check("Evaluaciones: tarjetas de la base con avance real y porcentaje asignado (40 %)",
    (await page.locator(".ns-eval").count()) === 2 && (await page.locator(".ns-weight-value").textContent()).startsWith("40") && (await page.locator(".ns-eval").first().textContent()).includes("1 de 3 verificadas"));
  await page.getByRole("button", { name: "Nueva evaluación" }).first().click();
  await page.locator(".ns-drawer").getByLabel("Nombre").fill("Parcial 3");
  await page.locator(".ns-drawer").getByLabel("Porcentaje").fill("70");
  await page.getByRole("button", { name: "Crear evaluación" }).click();
  report.check("Evaluaciones: no deja pasar del 100 % del periodo y dice cuánto sumaría",
    (await page.locator(".ns-drawer").textContent()).includes("Con esta evaluación el periodo sumaría 110 %. El máximo es 100 %.") && writes.evaluations.length === 0);
  await page.locator(".ns-drawer").getByLabel("Porcentaje").fill("20");
  await page.getByRole("button", { name: "Crear evaluación" }).click();
  await page.locator(".ns-toast-title", { hasText: "Evaluación creada" }).waitFor({ timeout: 8000 });
  const ew = writes.evaluations[0];
  report.check("Evaluaciones: crea la evaluación en borrador en la asignación elegida",
    ew && ew.assignment_id === 11 && ew.name === "Parcial 3" && ew.kind === "examen" && ew.weight === 20 && ew.status === "borrador", JSON.stringify(ew));

  // ---------- 9. Recuperaciones (6b.2b) ----------
  await page.goto(URL_BASE + "#/teacher/recoveries");
  await page.locator("tbody tr").first().waitFor({ timeout: 10000 });
  const recRows = await page.locator("tbody tr").allTextContents();
  report.check("Recuperaciones: solo quien está por debajo de 3.0 (Valentina, 2.0)", recRows.length === 1 && recRows[0].includes("Valentina Guerrero Ortiz") && recRows[0].includes("2.0"), recRows.join(" / "));
  await page.getByLabel("Nota de recuperación de Valentina Guerrero Ortiz").fill("3.5");
  await page.locator("tbody tr").first().getByRole("button", { name: "Guardar" }).click();
  await page.locator(".ns-toast-title", { hasText: "Recuperación registrada" }).waitFor({ timeout: 8000 });
  const rw = writes.recoveries[0];
  report.check("Recuperaciones: guarda original y recuperación; el resultado y la firma los pone la base",
    rw && rw.url.includes("on_conflict=student_id,assignment_id") && rw.body.student_id === "20261189" && rw.body.assignment_id === 11 && rw.body.original === 2 && rw.body.recovery === 3.5 && !signed(rw.body), JSON.stringify(rw));

  // ---------- Planilla sin conexión (6f): cola persistente en el equipo ----------
  const queueInStorage = () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("notascan.cola-planilla")).map((k) => JSON.parse(localStorage.getItem(k) ?? "[]")).flat());
  const pill = page.locator(".ns-conn-pill");
  await page.goto(URL_BASE + "#/teacher/gradebook");
  await page.locator(".ns-gb").waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
  writes.grades.length = 0;
  await ctx.setOffline(true);
  await page.waitForTimeout(300);
  report.check("Sin conexión: la píldora lo dice sola (sin interruptor de demostración)", (await pill.textContent()).includes("Modo offline"));
  await page.locator(".ns-gb tbody tr").first().locator(".ns-gcell").nth(1).click();
  await page.keyboard.press("3");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const q1 = await queueInStorage();
  report.check("Sin conexión: la nota (María · Taller 3 · 3.0) queda en la cola de este equipo, marcada pendiente y sin enviarse",
    writes.grades.length === 0 && q1.length === 1 && q1[0].studentId === "20261175" && q1[0].column === "102" && q1[0].value === 3
      && (await page.locator(".ns-gb-status").textContent()).includes("Guardado en este equipo") && (await page.locator(".ns-gcell.is-pending").count()) === 1 && (await pill.textContent()).includes("1"),
    JSON.stringify(q1));

  // Vuelve la conexión pero la red falla al enviar: la nota sigue en la cola (error de sincronización).
  reject.abort = true;
  await ctx.setOffline(false);
  await page.waitForTimeout(1500);
  report.check("Al reconectar con la red fallando: «Error de sincronización» y la nota sigue en la cola", (await pill.textContent()).includes("Error de sincronización") && (await queueInStorage()).length === 1, await pill.textContent());

  // Recargar la app: la cola sigue y la planilla muestra la nota pendiente.
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".ns-gb").waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  const cellAfter = await page.locator(".ns-gb tbody tr").first().locator(".ns-gcell").nth(1).textContent();
  report.check("Tras recargar: la cola sigue en el equipo y la celda muestra 3.0 pendiente", cellAfter.startsWith("3.0") && (await page.locator(".ns-gcell.is-pending").count()) === 1 && (await queueInStorage()).length === 1, cellAfter);

  // Sincronizar ahora con la red bien: se envía y la cola queda vacía.
  reject.abort = false;
  writes.grades.length = 0;
  await pill.click();
  await page.getByRole("button", { name: "Sincronizar ahora" }).click();
  await page.waitForTimeout(1500);
  const sent = writes.grades.at(-1);
  report.check("«Sincronizar ahora» envía la nota a la base (verificada, sin firma del cliente) y vacía la cola",
    sent && sent.body.evaluation_id === 102 && sent.body.student_id === "20261175" && sent.body.value === 3 && sent.body.status === "verified" && !signed(sent.body) && (await queueInStorage()).length === 0 && (await page.locator(".ns-gcell.is-pending").count()) === 0,
    JSON.stringify(sent));
  report.check("Después de sincronizar: conectado y con la hora de la última sincronización", (await pill.textContent()).includes("Conectado") && !(await page.locator(".ns-conn-pop").textContent()).includes("—"), await page.locator(".ns-conn-pop").textContent());
  await page.keyboard.press("Escape");

  // Si la base no acepta un cambio de la cola (evaluación cerrada), se quita y se dice cuál.
  await ctx.setOffline(true);
  await page.waitForTimeout(300);
  await page.locator(".ns-gb tbody tr").first().locator(".ns-gcell").first().click();
  await page.keyboard.press("2");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  reject.grades = "La evaluación está cerrada. Solicita el cambio de nota a Rectoría.";
  await ctx.setOffline(false);
  await page.waitForTimeout(1500);
  if (!(await page.locator(".ns-conn-pop").isVisible())) await pill.click();
  const pop = await page.locator(".ns-conn-pop").textContent();
  report.check("Un cambio que la base rechaza se quita de la cola y la píldora dice cuál",
    pop.includes("La base no aceptó 1 cambio") && pop.includes("María, Parcial 2: 2.0") && (await queueInStorage()).length === 0
      && (await page.locator(".ns-gb-status").textContent()).includes("La base no aceptó 1 cambio") && !(await page.locator(".ns-gb-status").textContent()).includes("Se sincronizará"), pop);
  reject.grades = null;
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "paso6f-planilla-sin-conexion.png") });
  await page.keyboard.press("Escape");
  // Los errores de red de esta sección son el corte simulado (sin conexión y red caída), no fallos de la app.
  const ownOffline = cons.filter((m) => !/ERR_FAILED|ERR_INTERNET_DISCONNECTED|Failed to fetch|status of (400|403|500)/.test(m));
  report.check("Planilla sin conexión: consola sin errores propios", ownOffline.length === 0, ownOffline.join(" | "));
  cons.length = 0;

  // ---------- Subir fotografías (6d): foto a la carpeta privada, lectura con read-exam y resultado por foto ----------
  // Imagen real (PNG 40×30) para que el equipo la pueda reducir antes de subirla.
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAALElEQVR4nO3NIREAAAgEMPq3RGM+AjFA7G5+lekTJRaLxWKxWCwWi8XivI0XNKnR9TxFfTUAAAAASUVORK5CYII=", "base64");
  const uploads = [], reads = [];
  let readMode = "ok";
  const RESULTS = [
    { saved: true, studentId: "20261175", studentName: "María Fernanda López Rosero", how: "code", detected: 4.5, confidence: 96, status: "pending", note: "", reading: { code: "20261175", name: "María López" } },
    { saved: true, studentId: "20261182", studentName: "Juan Sebastián Martínez Paz", how: "code", detected: 3.8, confidence: 60, status: "needs-review", note: "El nombre escrito («Valentina Guerrero») no coincide con el del código.", reading: { code: "20261182", name: "Valentina Guerrero" } },
    { saved: false, studentId: null, studentName: null, how: "none", detected: 4, confidence: 96, status: "needs-review", note: "El código 20269999 no es de un estudiante del curso.", reading: { code: "20269999", name: "Ana Torres" } },
  ];
  await page.route("**/storage/v1/object/exam-photos/**", (r) => { uploads.push({ url: decodeURIComponent(r.request().url()), type: r.request().headers()["content-type"] }); r.fulfill({ json: { Key: "exam-photos/x" } }); });
  await page.route("**/functions/v1/read-exam**", (r) => {
    reads.push(r.request().postDataJSON());
    if (readMode === "sin-clave") return r.fulfill({ status: 503, json: { error: "El servicio de lectura de fotos aún no está configurado. Falta la clave del proveedor en Supabase." } });
    return r.fulfill({ json: RESULTS[(reads.length - 1) % RESULTS.length] });
  });
  await page.goto(URL_BASE + "#/teacher/grades");
  const fileInput = page.locator('input[type=file][accept="image/*"]');
  await fileInput.waitFor({ state: "attached", timeout: 10000 });
  report.check("Subir fotografías: evaluación abierta de la base (Matemáticas · 7A · Parcial 2) y panel vacío antes de subir",
    (await page.getByRole("combobox", { name: "Evaluación" }).inputValue()) === "101" && (await page.locator(".ns-empty-title").last().textContent()) === "Aún no has subido fotografías.");
  await fileInput.setInputFiles([1, 2, 3].map((i) => ({ name: "hoja" + i + ".png", mimeType: "image/png", buffer: PNG })));
  await page.waitForFunction(() => document.querySelectorAll(".ns-list-item .ns-dot--processing, .ns-list-item [data-status=processing]").length === 0 && document.querySelectorAll(".ns-list-item").length === 3 && !document.body.textContent.includes("Leyendo código"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  const items = await page.locator(".ns-upload-grid .ns-list-item").allTextContents();
  report.check("Cada foto se sube como JPEG a la carpeta del docente y de la evaluación (UID/101/…) y se manda a leer en orden",
    uploads.length === 3 && uploads.every((u) => u.url.includes("/exam-photos/" + UID + "/101/") && u.url.endsWith(".jpg")) && reads.length === 3 && reads.every((b, i) => b.evaluation_id === 101 && b.photo_path.startsWith(UID + "/101/") && b.photo_path.endsWith("-" + i + ".jpg")),
    JSON.stringify({ uploads: uploads.map((u) => u.url.split("/exam-photos/")[1]), reads }));
  report.check("Resultado por foto: lista (María · 4.5), revisar con el motivo (nombre que no coincide) y sin estudiante con qué hacer",
    items[0].includes("María Fernanda López Rosero · 4.5") && items[0].includes("Listo")
      && items[1].includes("Juan Sebastián Martínez Paz · 3.8 · El nombre escrito («Valentina Guerrero») no coincide") && items[1].includes("Revisar")
      && items[2].includes("El código 20269999 no es de un estudiante del curso. No se guardó: anótala a mano en la planilla.") && items[2].includes("Sin estudiante"),
    items.join(" / "));
  const panel = await page.locator(".ns-proc").textContent();
  report.check("Panel: datos reales de la última foto (3 de 3); si no hubo estudiante lo dice y no inventa confianza",
    panel.includes("Foto 3 de 3") && panel.includes("Sin estudiante identificado") && panel.includes("Calculando confianza—") && !panel.includes("96%"), panel.slice(0, 200));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "paso6d-subir-fotos.png") });

  // Sin la clave del servicio: la primera foto lo explica y las demás esperan (no se gasta nada en vano).
  readMode = "sin-clave";
  const before = reads.length;
  await fileInput.setInputFiles([4, 5].map((i) => ({ name: "hoja" + i + ".png", mimeType: "image/png", buffer: PNG })));
  await toastTitle(page, "El servicio de lectura no está listo");
  const all = await page.locator(".ns-upload-grid .ns-list-item").allTextContents();
  report.check("Sin clave configurada: avisa una vez, la foto dice por qué y la siguiente queda en cola sin llamar al servicio",
    reads.length === before + 1 && all[3].includes("aún no está configurado") && all[3].includes("No se leyó") && all[4].includes("En cola"), all.slice(3).join(" / "));
  const ownErrors = cons.filter((m) => !/status of (400|403|500|503)/.test(m));
  report.check("Subir fotografías: consola sin errores propios", ownErrors.length === 0, ownErrors.join(" | "));
  cons.length = 0;

  // ---------- Reportes (6c): consolidado, por evaluación y por estudiante en PDF, Excel y CSV ----------
  const { default: readXlsx } = await import("read-excel-file/node");
  const fs = await import("node:fs/promises");
  await page.goto(URL_BASE + "#/teacher/reports");
  await page.locator(".ns-report-grid").waitFor({ timeout: 10000 });
  report.check("Reportes: cursos y periodos de la base (7A, 7B · Periodo 3 · 2026) y sin historial todavía",
    (await page.getByLabel("Curso").locator("option").allTextContents()).join("|") === "7A|7B" && (await page.getByLabel("Periodo").inputValue()) === "2026-p3"
      && (await page.locator(".ns-empty-title").last().textContent()) === "Aún no has generado reportes.");
  const generate = (i) => page.locator(".ns-report-grid .ns-report").nth(i).getByRole("button", { name: "Generar" });

  // Consolidado en Excel: el archivo trae la nota verificada de María (4.0) en Matemáticas.
  await page.getByRole("radio", { name: "Excel" }).click().catch(async () => page.getByRole("button", { name: "Excel" }).click());
  const [xlsx] = await Promise.all([page.waitForEvent("download"), generate(0).click()]);
  const xrows = (await readXlsx(await fs.readFile(await xlsx.path())))[0].data;
  const maria = xrows.find((r) => r[0] === "María Fernanda López Rosero");
  report.check("Consolidado · Excel: «Consolidado 7A · Periodo 3.xlsx» con la nota verificada como número (4.0) y su desempeño",
    xlsx.suggestedFilename() === "Consolidado 7A · Periodo 3.xlsx" && maria && maria[1] === 4 && maria[2] === 4 && maria[3] === "Alto" && xrows.some((r) => r[0] === "Matemáticas" || r[1] === "Matemáticas"),
    JSON.stringify(maria) + " · " + xlsx.suggestedFilename());
  report.check("Consolidado · Excel: queda en el historial con sus parámetros", JSON.stringify(reportsSaved.at(-1)) === JSON.stringify({ kind: "course", format: "xlsx", title: "Consolidado 7A · Periodo 3", params: { course: "7A", periodId: "2026-p3" } }), JSON.stringify(reportsSaved.at(-1)));

  // Consolidado en PDF: se imprime la hoja del sistema con el consolidado.
  await page.getByRole("radio", { name: "PDF" }).click().catch(async () => page.getByRole("button", { name: "PDF" }).click());
  await generate(0).click();
  await page.waitForFunction(() => window.__printed.length > 0, null, { timeout: 8000 }).catch(() => {});
  const printed = await page.evaluate(() => window.__printed.at(-1) ?? "");
  report.check("Consolidado · PDF: imprime la hoja con el colegio, «Consolidado por curso», los estudiantes y quién lo generó",
    printed.includes("Consolidado por curso") && printed.includes("María Fernanda López Rosero") && printed.includes("Generado por Ana Lucía Rosero") && printed.includes("Incluye solo las materias que dicta"), printed.slice(0, 200));

  // Por evaluación en CSV: se elige la evaluación en el diálogo.
  await page.getByRole("radio", { name: "CSV" }).click().catch(async () => page.getByRole("button", { name: "CSV" }).click());
  await generate(2).click();
  const dlg = page.locator("[role=dialog], [role=alertdialog]");
  await dlg.getByLabel(/Evaluación/).selectOption({ label: "Matemáticas · Parcial 2" });
  const [csvDl] = await Promise.all([page.waitForEvent("download"), dlg.getByRole("button", { name: "Generar CSV" }).click()]);
  const evCsv = await fs.readFile(await csvDl.path(), "utf8");
  report.check("Por evaluación · CSV: lectura de la IA, confianza y estado por estudiante; con BOM y punto y coma",
    evCsv.charCodeAt(0) === 0xfeff && evCsv.includes('"Leída por la IA";"Confianza";"Nota final";"Estado"') && evCsv.includes('"María Fernanda López Rosero";"4.5";"98 %";"4.5";"Por verificar"') && evCsv.includes('"Verificadas";"0 de 2"'), evCsv.slice(0, 300));

  // Por estudiante en Excel: historial del año.
  await page.getByRole("radio", { name: "Excel" }).click().catch(async () => page.getByRole("button", { name: "Excel" }).click());
  await generate(1).click();
  await dlg.getByLabel(/Estudiante/).selectOption({ label: "María Fernanda López Rosero" });
  const [stDl] = await Promise.all([page.waitForEvent("download"), dlg.getByRole("button", { name: "Generar Excel" }).click()]);
  const srows2 = (await readXlsx(await fs.readFile(await stDl.path())))[0].data;
  report.check("Por estudiante · Excel: «María Fernanda López Rosero · 2026» con Matemáticas en P1 y el acumulado",
    stDl.suggestedFilename() === "María Fernanda López Rosero · 2026.xlsx" && srows2.some((r) => r[0] === "Matemáticas" && r[1] === 4 && r[2] === 4), JSON.stringify(srows2.filter((r) => r[0] === "Matemáticas")));

  // Recientes: «Descargar» vuelve a generar sin duplicar el historial.
  reportHistory = [{ id: 9, kind: "course", format: "csv", title: "Consolidado 7A · Periodo 3", params: { course: "7A", periodId: "2026-p3" }, created_at: new Date().toISOString() }];
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Descargar Consolidado 7A · Periodo 3" }).waitFor({ timeout: 10000 });
  const savedBefore = reportsSaved.length;
  const [again] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar Consolidado 7A · Periodo 3" }).click()]);
  report.check("Recientes: «Descargar» lo genera de nuevo en su formato (CSV) sin otra fila en el historial", again.suggestedFilename() === "Consolidado 7A · Periodo 3.csv" && reportsSaved.length === savedBefore);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "paso6c-reportes-docente.png") });

  // ---------- Menú: tarjeta de contexto con datos reales (6b.4c) ----------
  await page.goto(URL_BASE + "#/teacher/dashboard");
  await page.locator(".ns-sidebar-course:not(.ns-school)").waitFor({ timeout: 10000 });
  report.check("Menú (docente): periodo abierto y sus materias y cursos de la base", (await page.locator(".ns-sidebar-course:not(.ns-school)").textContent()) === "Periodo 3 · 2026Matemáticas · 7A, 7B", await page.locator(".ns-sidebar-course:not(.ns-school)").textContent());

  // ---------- Perfil del estudiante visto por el docente (6b.4c) ----------
  await page.goto(URL_BASE + "#/teacher/profile/20261175");
  await page.locator(".ns-profile-head h1").waitFor({ timeout: 10000 });
  const ptabs = await page.getByRole("tab").allTextContents();
  report.check("Perfil (docente): sin la pestaña Información", ptabs.length === 5 && !ptabs.includes("Información"), ptabs.join("|"));
  await page.getByRole("tab", { name: "Calificaciones" }).click();
  report.check("Perfil (docente): avisa que solo ve las notas de sus materias", (await page.locator("p.ns-caption").first().textContent()) === "Ves las notas de las materias que dictas; el resto las consultan Secretaría y Rectoría.");
  await page.getByRole("tab", { name: "Boletines" }).click();
  report.check("Perfil (docente): el boletín completo queda para Secretaría y Rectoría", (await page.locator(".ns-empty-title").textContent()) === "El boletín completo lo consultan Secretaría y Rectoría.");
  await page.getByRole("tab", { name: "Asistencia" }).click();
  report.check("Perfil (docente): sin asistencia registrada lo dice", (await page.locator(".ns-empty-title").textContent()) === "Aún no hay asistencia registrada.");

  const real = cons.filter((m) => !/status of (400|403|500)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0, real.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
