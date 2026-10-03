// Paso 6b.2 · pantallas del Docente en modo normal (requiere `npm run build`), con la API de Supabase simulada:
// lo que se lee de la base, lo que se envía al guardar (sin firmas desde el cliente) y qué pasa si la base lo rechaza.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const UID = "33333333-3333-4333-8333-333333333333";
const today = (() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); })();

const PERIOD = { name: "Periodo 3", status: "open", open_date: "2026-07-13", close_date: "2026-10-15" };
const ASSIGNMENTS = [
  { id: 11, course_id: "7A", subject: { name: "Matemáticas" }, period: PERIOD },
  { id: 12, course_id: "7B", subject: { name: "Matemáticas" }, period: PERIOD },
];
const STUDENTS = [
  { id: "20261175", full_name: "María Fernanda López Rosero", course_id: "7A" },
  { id: "20261182", full_name: "Juan Sebastián Martínez Paz", course_id: "7A" },
  { id: "20261189", full_name: "Valentina Guerrero Ortiz", course_id: "7A" },
  { id: "20261201", full_name: "Mateo Burbano Paz", course_id: "7B" },
];
const EVALS = [
  { id: 101, assignment_id: 11, name: "Parcial 2", kind: "examen", weight: 25, status: "en-revision", due_date: "2026-09-28", assignment: { course_id: "7A", subject: { name: "Matemáticas" } } },
  { id: 102, assignment_id: 11, name: "Taller 3", kind: "taller", weight: 15, status: "borrador", due_date: "2026-10-05", assignment: { course_id: "7A", subject: { name: "Matemáticas" } } },
];
const REVIEW = [
  { id: 501, evaluation_id: 101, student_id: "20261175", detected: 4.5, confidence: 98, value: 4.5, status: "pending", student: { full_name: STUDENTS[0].full_name, course_id: "7A" } },
  { id: 502, evaluation_id: 101, student_id: "20261182", detected: 3.8, confidence: 62, value: 3.8, status: "needs-review", student: { full_name: STUDENTS[1].full_name, course_id: "7A" } },
];

/** Registro de escrituras por tabla y respuesta configurable (ok o rechazo). */
const writes = { grades: [], attendance: [], observations: [], period_concepts: [], evaluations: [], recoveries: [] };
const reject = { grades: null };

async function mockApi(page) {
  const user = { id: UID, aud: "authenticated", role: "authenticated", email: "ana.lucia@losandes.edu.co", app_metadata: {}, user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: UID, exp: now + 3600, role: "authenticated" })).toString("base64url"), "firma"].join(".");
  await page.route("**/auth/v1/token**", (r) => r.fulfill({ json: { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r", user } }));
  await page.route("**/auth/v1/user**", (r) => r.fulfill({ json: user }));
  await page.route("**/rest/v1/profiles**", (r) => r.fulfill({ json: { id: UID, email: user.email, full_name: "Ana Lucía Rosero", role: "teacher", status: "active" } }));
  await page.route("**/rest/v1/teaching_assignments**", (r) => r.fulfill({ json: ASSIGNMENTS }));
  await page.route("**/rest/v1/students**", (r) => {
    const u = decodeURIComponent(r.request().url());
    return r.fulfill({ json: STUDENTS.filter((s) => u.includes(s.course_id)) });
  });
  await page.route("**/rest/v1/evaluations**", (r) => {
    if (r.request().method() === "POST") { writes.evaluations.push(r.request().postDataJSON()); return r.fulfill({ status: 201, body: "" }); }
    const u = decodeURIComponent(r.request().url());
    // 7B (asignación 12) aún no tiene evaluaciones.
    return r.fulfill({ json: u.includes("assignment_id=eq.12") ? [] : EVALS });
  });
  await page.route("**/rest/v1/grades**", (r) => {
    const req = r.request();
    if (req.method() === "POST") {
      writes.grades.push({ url: decodeURIComponent(req.url()), body: req.postDataJSON() });
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

  const real = cons.filter((m) => !/status of (400|403|500)/.test(m));
  report.check("Consola: solo los errores de red simulados", real.length === 0, real.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
