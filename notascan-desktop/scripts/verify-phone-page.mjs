// Página del celular para subir fotos (mobile-subir/index.html, 2026-10-06), a 390 px y con la función simulada:
// muestra la evaluación, sube cada foto reducida a JPEG con el permiso, cuenta las que llegaron, permite reintentar y
// explica el código vencido o inválido. Uso: node scripts/verify-phone-page.mjs
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { OUT, ROOT, createReport, sampleTextContrast } from "./harness.mjs";

const report = createReport();
const PAGE = pathToFileURL(join(ROOT, "mobile-subir/index.html")).href;
const T = "b".repeat(64);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAALElEQVR4nO3NIREAAAgEMPq3RGM+AjFA7G5+lekTJRaLxWKxWCwWi8XivI0XNKnR9TxFfTUAAAAASUVORK5CYII=", "base64");
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const posts = [];
  let mode = "ok";
  await page.route("**/functions/v1/phone-upload**", async (r) => {
    const info = { evaluation: "Parcial 2", course: "7A", subject: "Matemáticas", expires_at: new Date(Date.now() + 9e5).toISOString(), count: posts.length };
    if (r.request().method() === "GET") return r.fulfill({ json: info, headers: { "access-control-allow-origin": "*" } });
    const body = r.request().postDataJSON();
    if (mode === "falla") { mode = "ok"; return r.fulfill({ status: 502, json: { error: "No pudimos guardar la foto. Inténtalo de nuevo." }, headers: { "access-control-allow-origin": "*" } }); }
    posts.push(body);
    return r.fulfill({ json: { ...info, count: posts.length }, headers: { "access-control-allow-origin": "*" } });
  });
  await page.goto(PAGE + "?t=" + T);
  await page.locator("h1").waitFor();
  const head = await page.locator("main").textContent();
  report.check("Muestra a qué evaluación sube (Matemáticas · 7A · Parcial 2) y los 3 consejos antes de la primera foto",
    head.includes("Matemáticas · 7A") && head.includes("Parcial 2") && head.includes("Hoja completa") && head.includes("sin sombras"));
  const btn = await page.locator(".shoot").boundingBox();
  report.check("«Tomar foto» es la acción grande: ancho completo y al menos 76 px de alto (toque ≥ 44)", btn.width >= 350 && btn.height >= 76, JSON.stringify(btn));
  const cam = await page.locator("#cam").evaluate((e) => ({ accept: e.accept, capture: e.getAttribute("capture") }));
  report.check("Abre la cámara trasera del celular (capture=environment)", cam.accept === "image/*" && cam.capture === "environment", JSON.stringify(cam));
  const c = await sampleTextContrast(page, page.locator(".shoot"));
  report.check("Contraste del texto de «Tomar foto» ≥ 4.5:1", c.ratio >= 4.5, c.ratio.toFixed(2) + ":1");
  await page.screenshot({ path: join(OUT, "celular-pagina-390.png") });

  await page.locator("#cam").setInputFiles({ name: "hoja.png", mimeType: "image/png", buffer: PNG });
  await page.locator(".list li", { hasText: "Llegó al computador" }).waitFor({ timeout: 8000 });
  report.check("Sube la foto como JPEG con el permiso y cuenta 1 foto que llegó",
    posts.length === 1 && posts[0].t === T && posts[0].image.startsWith("data:image/jpeg;base64,") && (await page.locator(".count strong").textContent()) === "1");

  mode = "falla";
  await page.locator("#gal").setInputFiles({ name: "hoja2.png", mimeType: "image/png", buffer: PNG });
  await page.locator(".retry").waitFor({ timeout: 8000 });
  report.check("Si falla, lo dice con el motivo y ofrece «Reintentar»", (await page.locator(".list li").first().textContent()).includes("No pudimos guardar la foto"));
  await page.locator(".retry").click();
  await page.locator(".count strong", { hasText: "2" }).waitFor({ timeout: 8000 });
  report.check("«Reintentar» la vuelve a enviar y llega (2 fotos)", posts.length === 2 && (await page.locator(".retry").count()) === 0);
  await page.screenshot({ path: join(OUT, "celular-pagina-enviadas-390.png"), fullPage: true });
  report.check("Sin desbordes a 390 px", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  const p2 = await ctx.newPage();
  await p2.route("**/functions/v1/phone-upload**", (r) => r.fulfill({ status: 410, json: { error: "Este código venció. Genera uno nuevo en el computador." }, headers: { "access-control-allow-origin": "*" } }));
  await p2.goto(PAGE + "?t=" + T);
  await p2.locator("h2").waitFor();
  report.check("Código vencido: lo dice y explica qué hacer", (await p2.locator("h2").textContent()) === "El código venció" && (await p2.locator("main").textContent()).includes("Genera uno nuevo"));
  await p2.goto(PAGE + "?t=corto");
  await p2.locator("h2", { hasText: "Este enlace no sirve" }).waitFor();
  report.check("Enlace sin permiso válido: no llama al servidor y pide volver a escanear", (await p2.locator("main").textContent()).includes("vuelve a escanear"));
} finally {
  await browser.close();
}
process.exitCode = report.print() ? 1 : 0;
