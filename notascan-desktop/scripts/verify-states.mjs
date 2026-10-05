// Paso 6b · estados forzados en modo demostración (requiere `npm run build:demo`).
// Cada estado debe mostrar la pieza del sistema que le corresponde, con contraste y una salida.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";

const report = createReport();

/** Pantallas conectadas a la capa de datos en esta entrega. Se amplía en cada entrega de 6b. */
const SCREENS = [
  { hash: "#/admin/students", name: "Estudiantes y Matrículas (Secretaría)", errorTitle: "No pudimos cargar los estudiantes.", emptyTitle: "No hay estudiantes registrados." },
  { hash: "#/principal/students", name: "Estudiantes (Rectoría)", errorTitle: "No pudimos cargar los estudiantes.", emptyTitle: "No hay estudiantes registrados." },
  // 6b.2 · Docente: pantallas sin tabla; la carga usa bloques .ns-skel (o las tarjetas esqueleto del sistema).
  { hash: "#/teacher/review", name: "Revisión de calificaciones", loading: ".ns-card--skeleton", errorTitle: "No pudimos cargar la revisión.", emptyTitle: "No tienes evaluaciones en revisión." },
  { hash: "#/teacher/gradebook", name: "Planilla", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar la planilla.", emptyTitle: "Este curso no tiene estudiantes activos." },
  { hash: "#/teacher/attendance", name: "Asistencia", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar la asistencia.", emptyTitle: "Este curso no tiene estudiantes activos." },
  { hash: "#/teacher/behavior", name: "Comportamiento", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar las anotaciones.", emptyTitle: "Aún no hay anotaciones." },
  { hash: "#/teacher/concepts", name: "Conceptos", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar los conceptos.", emptyTitle: "Este curso no tiene estudiantes activos." },
  // 6b.3a · Secretaría: configuración.
  { hash: "#/admin/structure", name: "Estructura académica", errorTitle: "No pudimos cargar la estructura académica.", emptyTitle: "No hay elementos configurados." },
  { hash: "#/admin/curriculum", name: "Malla curricular", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar la malla curricular.", emptyTitle: "Aún no hay cursos o materias activas." },
  { hash: "#/admin/periods", name: "Periodos académicos", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar los periodos.", emptyTitle: "Aún no hay periodos en el año lectivo." },
  { hash: "#/admin/users", name: "Usuarios", errorTitle: "No pudimos cargar el directorio de usuarios.", emptyTitle: "Aún no hay usuarios registrados." },
  // 6b.3b · Secretaría: inicio, paz y salvo y ranking.
  { hash: "#/admin/dashboard", name: "Inicio de Secretaría", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar el resumen.", emptyTitle: "No hay matrículas pendientes." },
  { hash: "#/admin/clearances", name: "Paz y salvos", errorTitle: "No pudimos cargar los paz y salvos.", emptyTitle: "No hay estudiantes activos." },
  { hash: "#/admin/ranking", name: "Ranking académico", errorTitle: "No pudimos cargar el ranking.", emptyTitle: "Aún no hay notas verificadas para este filtro." },
  // 6b.3c · Boletines.
  { hash: "#/admin/reportcards", name: "Boletines", errorTitle: "No pudimos cargar los boletines.", emptyTitle: "No hay estudiantes activos en este curso." },
  // 6b.2b · Docente: inicio, estudiantes, evaluaciones y recuperaciones.
  { hash: "#/teacher/dashboard", name: "Inicio del docente", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar tu resumen.", emptyTitle: "No hay evaluaciones en curso." },
  { hash: "#/teacher/students", name: "Estudiantes (Docente)", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar tus estudiantes.", emptyTitle: "No tienes estudiantes en tus cursos." },
  { hash: "#/teacher/evaluations", name: "Evaluaciones", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar las evaluaciones.", emptyTitle: "Este curso aún no tiene evaluaciones." },
  { hash: "#/teacher/recoveries", name: "Recuperaciones", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar las recuperaciones.", emptyTitle: "No hay estudiantes en recuperación." },
  // 6b.4a · Rectoría: solicitudes (bandeja y bloque del panorama) y observador.
  { hash: "#/principal/requests", name: "Solicitudes (Rectoría)", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar las solicitudes.", emptyTitle: "No hay solicitudes pendientes." },
  { hash: "#/principal/dashboard", name: "Panorama · Esperan tu decisión", inverse: ".ns-decide", loading: ".ns-decide [aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar las solicitudes.", emptyTitle: "No hay solicitudes pendientes." },
  { hash: "#/principal/observer", name: "Observador (Rectoría)", loading: "[aria-busy=true] .ns-skel", errorTitle: "No pudimos cargar las anotaciones.", emptyTitle: "Aún no hay anotaciones." },
];

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  for (const s of SCREENS) {
    const slug = s.hash.replace(/[#/]+/g, "-").slice(1);
    // Cargando: filas esqueleto del sistema, ocultas a lectores de pantalla, sin paginación.
    await page.goto(URL_BASE + s.hash + "?estado=cargando", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    if (s.loading) {
      const skel = await page.locator(s.loading).count();
      report.check(`${s.name} · cargando: bloques esqueleto del sistema`, skel > 0 && (await page.locator(".ns-empty").count()) === 0, `${skel} × ${s.loading}`);
    } else {
      const skel = await page.locator("tbody tr[aria-hidden=true] .ns-skel").count();
      report.check(`${s.name} · cargando: filas esqueleto del sistema`, skel > 0 && (await page.locator(".ns-pager").count()) === 0, `${skel} bloques .ns-skel`);
    }
    await page.screenshot({ path: join(OUT, `paso6b-${slug}-cargando.png`) });

    if (s.inverse) {
      // Bloque navy: los estados son una fila de la lista inversa del sistema, con contraste medido sobre el render.
      const row = page.locator(s.inverse + " .ns-list--inverse .ns-list-item strong");
      await page.goto(URL_BASE + s.hash + "?estado=error", { waitUntil: "networkidle" });
      await row.first().waitFor({ timeout: 8000 });
      report.check(`${s.name} · error: «${s.errorTitle}» con «Reintentar»`, (await row.first().textContent()) === s.errorTitle && (await page.locator(s.inverse).getByRole("button", { name: "Reintentar" }).count()) === 1);
      for (const [what, loc] of [["título", row.first()], ["mensaje", page.locator(s.inverse + " .ns-list--inverse .ns-caption").first()]]) {
        const c = await sampleTextContrast(page, loc);
        report.check(`${s.name} · error: contraste del ${what} ≥ 4.5:1`, c.ratio >= 4.5, c.ratio.toFixed(2) + ":1");
      }
      await page.screenshot({ path: join(OUT, `paso6b-${slug}-error.png`) });
      await page.goto(URL_BASE + s.hash + "?estado=vacio", { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      report.check(`${s.name} · vacío: «${s.emptyTitle}»`, (await row.first().textContent()) === s.emptyTitle);
      await page.screenshot({ path: join(OUT, `paso6b-${slug}-vacio.png`) });
      continue;
    }
    // Error: EmptyState de error con salida «Reintentar».
    await page.goto(URL_BASE + s.hash + "?estado=error", { waitUntil: "networkidle" });
    await page.locator(".ns-empty--error").waitFor({ timeout: 8000 });
    report.check(`${s.name} · error: «${s.errorTitle}» con «Reintentar»`, (await page.locator(".ns-empty-title").textContent()) === s.errorTitle && (await page.getByRole("button", { name: "Reintentar" }).count()) === 1);
    const ec = await sampleTextContrast(page, page.locator(".ns-empty--error .ns-empty-title"));
    report.check(`${s.name} · error: contraste del título ≥ 4.5:1`, ec.ratio >= 4.5, ec.ratio.toFixed(2) + ":1");
    await page.screenshot({ path: join(OUT, `paso6b-${slug}-error.png`) });

    // Vacío: EmptyState con su mensaje.
    await page.goto(URL_BASE + s.hash + "?estado=vacio", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    report.check(`${s.name} · vacío: «${s.emptyTitle}»`, (await page.locator(".ns-empty-title").first().textContent()) === s.emptyTitle);
    await page.screenshot({ path: join(OUT, `paso6b-${slug}-vacio.png`) });
  }
  report.check("Consola sin errores en los estados forzados", cons.length === 0, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
