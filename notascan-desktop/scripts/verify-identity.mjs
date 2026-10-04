// Paso 7b · identidad del colegio (requiere `npm run build:demo`): vista #/dev/identity con el editor y la vista
// previa en vivo. Comprueba el escudo con logo o iniciales, la línea legal sin datos inventados, los errores, el
// contraste medido sobre el render, el movimiento reducido, el teclado y los anchos.
import { join } from "node:path";
import { OUT, ROOT, URL_BASE, checkOverflow, createReport, findOffSystemValues, sampleTextContrast, startPreview, watchConsole } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/dev/identity", { waitUntil: "networkidle" });
  const head = page.locator(".ns-paper-head");
  const badge = page.locator(".ns-identity-sidebar .ns-school");
  const legal = () => head.locator(":scope > div").nth(1).locator("span").textContent();

  // 1. Sin logo: iniciales en el escudo del boletín y del menú; línea legal completa.
  report.check("Sin logo: las iniciales del colegio en el escudo del boletín y del menú",
    (await head.locator(".ns-paper-crest").textContent()) === "LA" && (await badge.locator(".ns-paper-crest").textContent()) === "LA");
  report.check("Encabezado con los datos del colegio de demostración", (await legal()) === "Pasto, Nariño · Resolución 0123 de 2015 · DANE 152001000000", await legal());
  await page.screenshot({ path: join(OUT, "paso7b-identidad-iniciales-1440.png"), fullPage: true });

  // 2. Vista previa en vivo.
  await page.getByLabel(/^Nombre del colegio/).fill("Colegio San Felipe Neri");
  await page.getByLabel(/^Iniciales del escudo/).fill("sfn");
  await page.getByLabel(/^Ciudad/).fill("Ipiales");
  await page.getByLabel(/^Resolución de aprobación/).fill("Resolución 0456 de 2019");
  await page.getByLabel(/^Código DANE/).fill("1523-5600-0123");
  report.check("En vivo: el nombre cambia en el boletín y en el menú", (await head.locator(".ns-paper-school").textContent()) === "Colegio San Felipe Neri" && (await badge.locator(".ns-school-name").textContent()) === "Colegio San Felipe Neri");
  report.check("En vivo: iniciales en mayúsculas y la línea legal se arma con lo escrito (DANE solo dígitos)",
    (await head.locator(".ns-paper-crest").textContent()) === "SFN" && (await legal()) === "Ipiales, Nariño · Resolución 0456 de 2019 · DANE 152356000123", await legal());
  await page.getByLabel(/^Resolución de aprobación/).fill("");
  await page.getByLabel(/^Código DANE/).fill("");
  await page.getByLabel(/^Departamento/).fill("");
  report.check("Sin resolución, DANE ni departamento, la línea no inventa nada", (await legal()) === "Ipiales", await legal());
  await page.getByLabel(/^Código DANE/).fill("123");
  report.check("DANE incompleto avisa «El código DANE tiene 12 dígitos.»", (await page.locator(".ns-field-error").allTextContents()).some((t) => t.includes("El código DANE tiene 12 dígitos.")));
  await page.getByLabel(/^Código DANE/).fill("152356000123");

  // 3. Logos ancho y alto: siempre contenidos en el escudo, sin recorte ni deformación.
  for (const [file, label] of [["logo-ancho.png", "ancho"], ["logo-alto.png", "alto"]]) {
    await page.getByLabel("Archivo del logo").setInputFiles(join(ROOT, "scripts/fixtures", file));
    const img = head.locator(".ns-paper-crest img");
    await img.waitFor();
    await page.waitForTimeout(400);
    const fit = await img.evaluate((el) => {
      const c = el.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect(), s = getComputedStyle(el);
      const k = Math.min(r.width / el.naturalWidth, r.height / el.naturalHeight);
      const pw = el.naturalWidth * k, ph = el.naturalHeight * k;
      return { fit: s.objectFit, inside: r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5,
        ratio: (pw / ph).toFixed(2), natural: (el.naturalWidth / el.naturalHeight).toFixed(2) };
    });
    report.check("Logo " + label + ": contenido dentro del escudo y con su proporción", fit.fit === "contain" && fit.inside && fit.ratio === fit.natural, JSON.stringify(fit));
    report.check("Logo " + label + ": también en el escudo del menú", (await badge.locator(".ns-paper-crest img").count()) === 1);
    await page.screenshot({ path: join(OUT, "paso7b-identidad-logo-" + label + "-1440.png"), fullPage: true });
  }

  // 4. Archivos que no sirven.
  await page.getByLabel("Archivo del logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.alloc(1300 * 1024, 1) });
  report.check("Logo de más de 1 MB: avisa el peso y conserva el logo anterior",
    (await page.locator(".ns-field-error[role=alert]").textContent()).includes("El logo pesa 1.3 MB. El máximo es 1 MB.") && (await head.locator(".ns-paper-crest img").count()) === 1);
  await page.getByLabel("Archivo del logo").setInputFiles({ name: "logo.txt", mimeType: "text/plain", buffer: Buffer.from("no") });
  report.check("Archivo que no es imagen: avisa los formatos", (await page.locator(".ns-field-error[role=alert]").textContent()).includes("El logo debe ser PNG, JPG, SVG o WebP."));
  await page.getByRole("button", { name: "Quitar logo" }).click();
  report.check("Quitar logo vuelve a las iniciales", (await head.locator(".ns-paper-crest").textContent()) === "SFN" && (await head.locator("img").count()) === 0);

  // 5. Contraste medido sobre el render.
  const samples = [[head.locator(".ns-paper-school"), "nombre en el boletín", 4.5], [head.locator(":scope > div").nth(1).locator("span"), "línea legal", 4.5],
    [head.locator(".ns-paper-crest span"), "iniciales del escudo (texto grande)", 3], [badge.locator(".ns-school-name"), "nombre en el menú", 4.5]];
  for (const [loc, label, min] of samples) {
    const r = await sampleTextContrast(page, loc);
    report.check("Contraste " + label + " ≥ " + min + ":1", r.ratio >= min, r.ratio.toFixed(2) + ":1");
  }

  // 6. Teclado: el botón del logo se alcanza con Tab y muestra el foco.
  await page.getByLabel(/^Resolución de aprobación/).focus();
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { text: a?.textContent, outline: s.outlineStyle, shadow: s.boxShadow }; });
  report.check("Teclado: tras los campos, Tab llega a «Elegir logo» con foco visible", focused.text === "Elegir logo" && (focused.outline !== "none" || focused.shadow !== "none"), JSON.stringify(focused));

  // 7. Anchos: sin desbordamiento; en ventana estrecha la vista previa pasa debajo.
  for (const w of [1440, 1024, 768]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(200);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    checkOverflow(report, "#/dev/identity", over, w);
    await page.screenshot({ path: join(OUT, "paso7b-identidad-" + w + ".png"), fullPage: true });
  }
  const stacked = await page.evaluate(() => { const [a, b] = document.querySelectorAll(".ns-identity-grid > *"); return b.getBoundingClientRect().top > a.getBoundingClientRect().bottom - 1; });
  report.check("A 768 px la vista previa queda debajo del formulario", stacked);
  report.check("Consola sin errores", cons.length === 0, cons.join(" | "));

  // 8. Movimiento reducido: el logo aparece sin animación.
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const p2 = await ctx2.newPage();
  await p2.goto(URL_BASE + "#/dev/identity", { waitUntil: "networkidle" });
  await p2.getByLabel("Archivo del logo").setInputFiles(join(ROOT, "scripts/fixtures/logo-ancho.png"));
  const anim = await p2.locator(".ns-paper-head .ns-paper-crest img").evaluate((el) => getComputedStyle(el).animationName);
  report.check("Con movimiento reducido, el logo entra sin animación", anim === "none", anim);
  await ctx2.close();
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
