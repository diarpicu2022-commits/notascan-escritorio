// Campos de texto en el motor de la app de escritorio (Edge/WebView2), 2026-10-06, pedido de Diego:
// al escribir no debe aparecer un recuadro dentro de la cápsula, y la contraseña no debe traer el ojo propio de Edge
// (el del sistema es el único). Se mide en Microsoft Edge (canal msedge de Playwright), no en Chromium.
// Uso: npm run build && node scripts/verify-fields-edge.mjs
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, OUT, URL_BASE, createReport } from "./harness.mjs";

const report = createReport();
const server = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--port", "4173", "--strictPort"], { cwd: ROOT });
await new Promise((res) => server.stdout.on("data", (d) => { if (String(d).includes("4173")) res(); }));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  report.check("Se mide en Microsoft Edge", (await browser.version()).length > 0 && (await page.evaluate(() => navigator.userAgent)).includes("Edg/"));

  const style = async (sel) => { await page.waitForTimeout(300); return page.evaluate((s) => {
    const el = document.querySelector(s); const box = el.closest(".ns-auth-input"); const a = getComputedStyle(el), b = getComputedStyle(box);
    return { outline: a.outlineStyle, boxBorder: b.borderTopColor, boxShadow: b.boxShadow };
  }, sel); };

  await page.locator('input[type="email"]').first().click();
  await page.keyboard.type("diego@colegio.edu.co");
  const mail = await style('input[type="email"]');
  report.check("Correo al escribir: el campo interior no dibuja recuadro", mail.outline === "none");
  report.check("Correo al escribir: la cápsula marca el foco (borde dorado + halo)", mail.boxBorder === "rgb(184, 146, 75)" && mail.boxShadow !== "none");

  const pw = page.locator('input[autocomplete="current-password"], input[type="password"]').first();
  await pw.click();
  await page.keyboard.type("clave1234");
  const pass = await style('input[type="password"]');
  report.check("Contraseña al escribir: el campo interior no dibuja recuadro", pass.outline === "none");
  // Edge no expone ::-ms-reveal en getComputedStyle: se compara la imagen del campo con la regla y forzando el ojo de
  // Edge. Si difieren, Edge sí pone su ojo y la regla del sistema lo quita.
  const field = page.locator('input[type="password"]').first();
  await page.keyboard.press("End");
  const without = await field.screenshot();
  await page.addStyleTag({ content: 'input::-ms-reveal { display: block !important; }' });
  await page.waitForTimeout(200);
  const withEdge = await field.screenshot();
  report.check("Contraseña: el ojo propio de Edge está oculto (::-ms-reveal)", !without.equals(withEdge), "la imagen cambia al forzarlo");
  await page.evaluate(() => document.querySelector("style:last-of-type").remove());
  report.check("Contraseña: queda un solo botón de mostrar (el del sistema)", (await page.locator(".ns-auth-eye").count()) === 1);
  await page.locator(".ns-auth-panel").screenshot({ path: join(OUT, "campos-edge-foco.png") });

  // Teclado: con Tab el foco sigue siendo visible (en la cápsula), no desaparece.
  await page.keyboard.press("Shift+Tab");
  const back = await style('input[type="email"]');
  report.check("Teclado: el foco sigue visible en la cápsula del correo", back.boxBorder === "rgb(184, 146, 75)");
} finally {
  await browser.close();
  server.kill();
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
}
process.exitCode = report.print() ? 1 : 0;
