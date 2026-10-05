// Paso 6b.4a · Rectoría en 1024/1440 px (requiere `npm run build:demo`): sin desbordamiento horizontal,
// estados del bloque navy y recorrido por teclado hasta «Aprobar».
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const { browser, close } = await startPreview();
try {
  // 390 y 768 no aplican: ventana Tauri con minWidth 1024 (anexo, paso 1).
  for (const w of [1024, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const cons = watchConsole(page);
    for (const h of ["#/principal/dashboard", "#/principal/dashboard?estado=vacio", "#/principal/dashboard?estado=cargando", "#/principal/requests", "#/principal/observer"]) {
      await page.goto(URL_BASE + h, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      report.check(`${w}px ${h}: sin desbordamiento horizontal`, over <= 0, over + " px");
      await page.screenshot({ path: join(OUT, `paso6b4a-${w}-${h.replace(/[#/?=]+/g, "-").slice(1)}.png`), fullPage: true });
    }
    report.check(`${w}px: consola limpia`, cons.length === 0, cons.join(" | "));
    await ctx.close();
  }
  // Teclado: desde la lista, Tab llega a «Rechazar» y «Aprobar» del detalle, con foco visible.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL_BASE + "#/principal/requests", { waitUntil: "networkidle" });
  await page.getByRole("option", { name: /Solicitud #245/ }).focus();
  let reached = null, outline = "";
  for (let i = 0; i < 25 && !reached; i++) {
    await page.keyboard.press("Tab");
    const t = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (t === "Aprobar") { reached = i + 1; outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + " " + s.outlineWidth + " | " + s.boxShadow; }); }
  }
  report.check("Teclado: «Aprobar» se alcanza con Tab desde la solicitud y tiene foco visible", reached && !/^none 0px \| none$/.test(outline), `${reached} tabs · ${outline}`);
  await page.keyboard.press("Enter");
  const dlg = await page.locator("[role=alertdialog]").isVisible();
  const focusIn = await page.evaluate(() => !!document.activeElement?.closest("[role=alertdialog]"));
  await page.keyboard.press("Escape");
  report.check("Teclado: Enter abre la confirmación con el foco dentro y Escape la cierra", dlg && focusIn && !(await page.locator("[role=alertdialog]").isVisible()));
  await ctx.close();
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
