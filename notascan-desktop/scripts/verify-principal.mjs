// Paso 5c · verificación medida de las pantallas de Rectoría.
import { join } from "node:path";
import { OUT, URL_BASE, checkOverflow, compareRoute, createReport, findOffSystemValues, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

const ROUTES = ["dashboard", "analytics", "teachers", "requests", "students", "observer", "reports", "profile/20261175?tab=info"].map((p) => "#/principal/" + p);

const { browser, close } = await startPreview();
try {
  // ---------- 1. Fidelidad ----------
  for (const hash of ROUTES) await compareRoute(browser, report, hash, hash.replace("#/principal/", ""), "paso5-rectoria");

  // ---------- 2. Flujos ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  const go = async (p) => { await page.goto(URL_BASE + "#/principal/" + p, { waitUntil: "networkidle" }); await page.waitForTimeout(300); };
  const toast = () => page.locator(".ns-toast-title").last().textContent();

  await go("dashboard");
  report.check("Panorama: 3 solicitudes esperan decisión", (await page.locator(".ns-decide .ns-list-item").count()) === 3 && (await page.locator(".ns-decide .ns-sticker").textContent()) === "3 solicitudes");
  report.check("Panorama: el menú muestra 3 solicitudes pendientes", (await page.locator(".ns-nav-item-count").getAttribute("aria-label")) === "3 pendientes");
  await page.getByRole("button", { name: "Revisar solicitudes" }).click();
  await page.waitForTimeout(300);
  report.check("«Revisar solicitudes» lleva a la bandeja", page.url().endsWith("#/principal/requests"));

  // Aprobar #244.
  await page.getByRole("option", { name: /Solicitud #244/ }).click();
  report.check("Elegir #244 muestra su detalle con el cambio 2.8 → 3.2", (await page.locator(".ns-inbox-detail .ns-block-h").textContent()) === "Solicitud #244" && (await page.locator(".ns-change-big").getAttribute("aria-label")) === "Cambio solicitado de 2.8 a 3.2");
  await page.locator(".ns-inbox-detail").getByRole("button", { name: "Aprobar" }).click();
  report.check("Aprobar pide confirmación y recuerda que la original queda en el historial", (await page.locator("[role=alertdialog] .ns-dialog-text").textContent()).includes("La nota original queda en el historial."));
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Aprobar" }).click();
  report.check("Confirmar aprueba y avisa", (await toast()) === "Solicitud #244 aprobada");
  report.check("Quedan 2 pendientes en la pestaña", (await page.getByRole("tab", { name: /Pendientes/ }).locator(".ns-chip-count").textContent()) === "2");

  // Rechazar exige motivo.
  await page.locator(".ns-inbox-detail").getByRole("button", { name: "Rechazar" }).click();
  const rejectBtn = page.locator("[role=alertdialog]").getByRole("button", { name: "Rechazar" });
  report.check("Rechazar sin motivo está deshabilitado", await rejectBtn.isDisabled());
  await page.getByRole("textbox", { name: /Motivo del rechazo/ }).fill("Falta la hoja escaneada");
  await rejectBtn.click();
  await page.getByRole("tab", { name: /Rechazadas/ }).click();
  await page.getByRole("option").first().click();
  report.check("El motivo queda en el historial de la solicitud rechazada", (await page.locator(".ns-history").textContent()).includes("Rechazada por Hernando Villota: Falta la hoja escaneada"));

  // Seguimiento docente.
  await go("teachers");
  const firstPct = await page.locator("tbody tr").first().locator(".ns-pbar-head strong").textContent();
  report.check("La tabla empieza por el docente con menos avance", firstPct === "48%", firstPct);
  await page.locator(".ns-tstatus--late").click();
  report.check("Filtrar «Rojo» deja solo los docentes en retraso", (await page.locator("tbody tr").count()) === 1 && (await page.locator(".ns-tstatus--late").getAttribute("aria-pressed")) === "true");
  await page.getByRole("button", { name: "Enviar recordatorio" }).click();
  report.check("Enviar recordatorio avisa a quién se notificó", (await toast()) === "Recordatorio enviado");

  // Estudiantes en solo lectura.
  await go("students");
  report.check("Rectoría consulta estudiantes sin selección en lote", (await page.locator("tbody .ns-grid-check").count()) === 0);
  report.check("Rectoría no ve editar, archivar ni retirar", (await page.getByRole("button", { name: /^(Editar|Archivar|Retirar) / }).count()) === 0);
  report.check("Rectoría no ve «Registrar estudiante»", (await page.getByRole("button", { name: "Registrar estudiante" }).count()) === 0);
  await page.locator("tbody tr").first().locator(".ns-cell-link").click();
  report.check("La vista rápida solo ofrece «Abrir perfil completo»", (await page.locator(".ns-drawer-foot .ns-btn").count()) === 1);

  // Analítica.
  await go("analytics");
  report.check("Cada gráfico tiene su tabla para lectores de pantalla (4)", (await page.locator("figure.ns-chart table.ns-sr").count()) === 4);
  await page.locator(".ns-bar-g").nth(2).hover();
  report.check("Pasar sobre «Octavo» muestra 3.4", (await page.locator(".ns-chart-tip").first().textContent()) === "Octavo · 3.4");

  // Observador.
  await go("observer");
  await page.getByRole("button", { name: "Atención" }).click();
  report.check("Filtrar «Atención» deja solo esas anotaciones", (await page.locator(".ns-tl-item").count()) === (await page.locator(".ns-tl-item--attention").count()) && (await page.locator(".ns-tl-item").count()) === 2);

  // Reportes.
  await go("reports");
  await page.getByRole("button", { name: "Excel" }).click();
  await page.getByRole("button", { name: "Generar" }).first().click();
  report.check("Generar un reporte avisa con el formato elegido", (await page.locator(".ns-toast-text").textContent()) === "Consolidado por curso · XLSX");

  // Perfil con datos sensibles.
  await go("profile/20261175?tab=info");
  report.check("Rectoría ve «Información» con el aviso de datos sensibles", (await page.locator(".ns-sensitive").textContent()).includes("Visible solo para Secretaría y Rectoría"));

  // ---------- 3. Contraste ----------
  const checks = [
    ["dashboard", ".ns-decide .ns-list-item strong >> nth=0", "solicitud sobre navy"],
    ["dashboard", ".ns-decide .ns-caption >> nth=0", "detalle sobre navy"],
    ["dashboard", ".ns-change >> nth=0", "cambio de nota sobre navy"],
    ["dashboard", ".ns-kpi--lead strong", "promedio institucional (cifra que decide, AAA)", 7],
    ["dashboard", ".ns-kpi >> nth=1", "indicador de reprobación"],
    ["analytics", ".ns-chart-head .ns-caption >> nth=0", "pregunta del gráfico"],
    ["teachers", ".ns-tstatus--late", "resumen «Rojo»"],
    ["teachers", ".ns-pbar-head strong >> nth=0", "porcentaje de avance"],
    ["requests", ".ns-change-big .is-new strong", "nota solicitada (cifra que decide, AAA)", 7],
    ["requests", ".ns-change-big .is-new .ns-overline", "rótulo «Cambio solicitado» (enmienda 3a)"],
    ["requests", ".ns-change-big > div:first-child strong", "nota actual (cifra que decide, AAA, enmienda 3a)", 7],
    ["requests", ".ns-reason", "motivo"],
    ["observer", ".ns-tl-date >> nth=0", "fecha del observador"],
  ];
  for (const [p, sel, label, min = 4.5] of checks) {
    await go(p);
    await page.waitForTimeout(700);
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ ${min}:1`, r.ratio >= min, `${r.ratio.toFixed(2)}:1`);
  }

  // ---------- 4. Anchos ----------
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const hash of ROUTES) {
    await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    checkOverflow(report, hash, await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  }
  await page.goto(URL_BASE + "#/principal/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, "paso5-rectoria-dashboard-1024.png") });
  report.check("Consola de la app sin errores ni avisos en los flujos", cons.length === 0, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
