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
    report.check(`${s.name} · vacío: «${s.emptyTitle}»`, (await page.locator(".ns-empty-title").textContent()) === s.emptyTitle);
    await page.screenshot({ path: join(OUT, `paso6b-${slug}-vacio.png`) });
  }
  report.check("Consola sin errores en los estados forzados", cons.length === 0, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
