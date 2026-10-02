// Paso 2 · verificación medida de StudentGradeCard.
// 1) Fidelidad: la tarjeta original de notascan-ui y la portada, en el mismo navegador,
//    con los mismos datos → DOM normalizado idéntico y diferencia de píxeles.
// 2) Comportamiento con teclado. 3) Count-up y movimiento reducido.
// 4) Contraste muestreado sobre el render. 5) Tamaño de los controles. 6) Consola.
import { join } from "node:path";
import { DS, OUT, URL_BASE, createReport, findOffSystemValues, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";
import { applyAmendments } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

const ROWS_IDX = [0, 1, 2, 3, 5];
const { browser, close } = await startPreview();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  // ---------- 1. Fidelidad contra el sistema original ----------
  // Página de referencia: el CSS, React y notascan.js del propio design system, sin tocar.
  const ref = await ctx.newPage();
  const refConsole = watchConsole(ref);
  await ref.goto(URL_BASE + "#/dev/tokens", { waitUntil: "networkidle" }); // mismo origen y fuentes
  await ref.evaluate(() => {
    document.head.querySelectorAll("style,link[rel=stylesheet]:not([href*=fonts])").forEach((n) => n.remove());
    const mount = document.createElement("div");
    mount.id = "ref";
    document.body.replaceChildren(mount);
  });
  await ref.addStyleTag({ path: join(DS, "css/tokens.css") });
  await ref.addStyleTag({ path: join(DS, "css/notascan.css") });
  await applyAmendments(ref);
  await ref.addScriptTag({ path: join(DS, "vendor/react.production.min.js") });
  await ref.addScriptTag({ path: join(DS, "vendor/react-dom.production.min.js") });
  await ref.addScriptTag({ path: join(DS, "js/notascan.js") });

  const mine = await ctx.newPage();
  const mineConsole = watchConsole(mine);
  await mine.goto(URL_BASE + "#/dev/card-static", { waitUntil: "networkidle" });
  const rows = await mine.evaluate(() => window.__REVIEW_ROWS__);

  await ref.evaluate(({ rows, idx }) => {
    const h = React.createElement, N = window.NotaScan;
    const picks = idx.map((i) => rows[i]).map((r) => ({ ...r, detected: r.detected === null ? NaN : r.detected }));
    ReactDOM.createRoot(document.getElementById("ref")).render(
      h("main", { className: "ns ns-canvas", style: { minHeight: "100vh", padding: "var(--space-7)" } },
        h("div", { className: "ns-grid" },
          picks.map((r, i) => h(N.StudentGradeCard, { key: r.student.id, index: i + 1, student: r.student, detected: r.detected, confidence: r.confidence, status: r.status, animate: false })),
          h(N.StudentGradeCardSkeleton || "div", { key: "sk" }))));
  }, { rows, idx: ROWS_IDX });
  await ref.waitForTimeout(900);
  await mine.waitForTimeout(900);

  const normalize = (page) => page.evaluate(() => {
    const walk = (el) => {
      if (el.nodeType === 3) return el.textContent.trim() ? `"${el.textContent.trim()}"` : "";
      if (el.nodeType !== 1) return "";
      const attrs = [...el.attributes]
        .filter((a) => !["id", "aria-labelledby", "aria-describedby", "for", "style"].includes(a.name))
        .map((a) => `${a.name}=${a.value}`).sort().join(" ");
      return `<${el.tagName.toLowerCase()} ${attrs}>${[...el.childNodes].map(walk).join("")}</${el.tagName.toLowerCase()}>`;
    };
    return [...document.querySelectorAll(".ns-grid > *")].map(walk);
  });
  const refDom = await normalize(ref);
  const mineDom = await normalize(mine);
  report.check("Mismo número de tarjetas que la referencia", refDom.length === mineDom.length && refDom.length === 6, `${mineDom.length} vs ${refDom.length}`);
  refDom.forEach((r, i) => {
    let at = 0;
    while (at < r.length && r[at] === mineDom[i]?.[at]) at++;
    report.check(`Tarjeta ${i + 1}: DOM normalizado idéntico al del sistema`, r === mineDom[i], r === mineDom[i] ? "" : `difiere en: …${r.slice(at - 40, at + 60)}… vs …${(mineDom[i] || "").slice(at - 40, at + 60)}…`);
  });

  // Diferencia de píxeles, tarjeta por tarjeta.
  const refCards = ref.locator(".ns-grid > *");
  const mineCards = mine.locator(".ns-grid > *");
  for (let i = 0; i < 6; i++) {
    const a = await refCards.nth(i).screenshot({ animations: "disabled" });
    const b = await mineCards.nth(i).screenshot({ animations: "disabled", path: join(OUT, `paso2-card-${i + 1}.png`) });
    const diff = await mine.evaluate(async ([x, y]) => {
      const load = async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); return im; };
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`, pct: 100 };
      const read = (im) => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
      const da = read(ia), db = read(ib);
      let off = 0;
      for (let p = 0; p < da.length; p += 4) if (Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2]) > 24) off++;
      return { size: `${ia.width}x${ia.height}`, pct: (off / (da.length / 4)) * 100 };
    }, [a.toString("base64"), b.toString("base64")]);
    report.check(`Tarjeta ${i + 1}: píxeles iguales a la referencia (≤ 0.5 % distintos)`, diff.pct <= 0.5, `${diff.size}, ${diff.pct.toFixed(3)} % distinto`);
  }
  await ref.screenshot({ fullPage: true, path: join(OUT, "paso2-referencia-ds-1440.png") });
  report.check("Consola de la referencia sin errores", refConsole.length === 0, refConsole.join(" | "));

  // ---------- 2. Comportamiento con teclado ----------
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  // Registra cada valor que pinta la nota desde el primer fotograma.
  await page.addInitScript(() => {
    window.__seen = [];
    const tick = () => {
      const el = document.querySelectorAll(".ns-card")[2]?.querySelector(".ns-card-grade");
      if (el && window.__seen[window.__seen.length - 1] !== el.textContent) window.__seen.push(el.textContent);
      if (performance.now() < 4000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(URL_BASE + "#/dev/card", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const seen = await page.evaluate(() => window.__seen);
  report.check("Count-up: la nota cuenta desde 0.0 y termina en 4.2", seen[0] === "0.0" && seen[seen.length - 1] === "4.2" && seen.length > 5, `${seen.length} valores: ${seen.slice(0, 4).join(", ")} … ${seen.slice(-2).join(", ")}`);
  await page.screenshot({ fullPage: true, path: join(OUT, "paso2-cards-1440.png") });

  const card = page.locator(".ns-card").nth(2); // Valentina Guerrero · 4.2 · 94 %
  await card.getByRole("button", { name: "Editar calificación de Valentina Guerrero" }).focus();
  await page.keyboard.press("Enter");
  const input = card.locator("input");
  report.check("Editar con Enter enfoca el campo de nota", await input.evaluate((el) => el === document.activeElement));
  await input.fill("");
  await page.keyboard.type("7");
  const err = await card.locator(".ns-field-error").textContent().catch(() => "");
  report.check("Nota 7 muestra el error del sistema", err.includes("La calificación debe estar entre 1.0 y 5.0."), err);
  report.check("Confirmar deshabilitado con nota fuera de rango", await card.getByRole("button", { name: "Confirmar" }).isDisabled());
  await page.keyboard.press("Enter");
  report.check("Enter con nota inválida no verifica", !(await card.evaluate((el) => el.classList.contains("ns-card--verified"))));
  await page.keyboard.press("Escape");
  report.check("Escape cancela y devuelve 4.2", (await card.locator(".ns-card-grade").textContent()) === "4.2");

  await card.getByRole("button", { name: "Editar calificación de Valentina Guerrero" }).click();
  await input.fill("4,3");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  report.check("Enter con 4,3 verifica la tarjeta", await card.evaluate((el) => el.classList.contains("ns-card--verified")));
  report.check("El sello cae con la nota corregida", (await card.locator(".ns-stamp").textContent()) === "4.3Verificada");
  report.check("Rótulo pasa a «Calificación corregida»", (await card.locator(".ns-card-grade-label").textContent()) === "Calificación corregida");
  report.check("Estado con palabra fija «Verificada»", (await card.locator(".ns-status").textContent()) === "Verificada");
  await page.waitForTimeout(800);
  await card.screenshot({ path: join(OUT, "paso2-card-verificada-por-teclado.png") });

  const lowCard = page.locator(".ns-card").nth(1);
  report.check("Confianza 62 % → «Requiere revisión» en burdeos", await lowCard.evaluate((el) => el.classList.contains("ns-card--needs-review")) && (await lowCard.locator(".ns-status").textContent()) === "Requiere revisión");
  const meter = lowCard.locator("[role=meter]");
  report.check("Medidor accesible con valor y nivel", (await meter.getAttribute("aria-valuetext")) === "62% · Baja confianza");

  const noDet = page.locator(".ns-card").nth(4); // Santiago Muñoz · sin detección
  report.check("Sin detección muestra el mensaje con salida", (await noDet.textContent()).includes("No pudimos detectar una calificación.Puedes introducirla manualmente."));
  await noDet.getByRole("button", { name: "Editar calificación de Santiago Muñoz" }).click();
  await noDet.locator("input").fill("3.6");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800); // la nota vuelve a contar hasta el valor nuevo
  report.check("Ingreso manual 3.6 queda verificado como «Introducida por el docente»",
    (await noDet.locator(".ns-card-grade-label").textContent()) === "Introducida por el docente" && (await noDet.locator(".ns-card-grade").textContent()) === "3.6");

  // Foco visible en los botones
  await page.locator(".ns-card").nth(3).getByRole("button", { name: /Confirmar calificación/ }).focus();
  const outline = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });
  report.check("Foco visible en Confirmar (contorno 2px)", outline === "solid 2px", outline);

  // ---------- 3. Contraste medido sobre el render ----------
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const targets = [
    [".ns-card >> nth=2 >> .ns-card-grade", 7, "nota (cifra que decide, AAA)"],
    [".ns-card >> nth=0 >> .ns-card-grade", 7, "nota verificada (AAA)"],
    [".ns-card >> nth=1 >> .ns-card-grade", 7, "nota en revisión (AAA)"],
    [".ns-card >> nth=2 >> .ns-card-name", 4.5, "nombre"],
    [".ns-card >> nth=2 >> .ns-card-id", 4.5, "ID y curso"],
    [".ns-card >> nth=2 >> .ns-badge", 4.5, "insignia alta confianza"],
    [".ns-card >> nth=3 >> .ns-badge", 4.5, "insignia confianza media"],
    [".ns-card >> nth=1 >> .ns-badge", 4.5, "insignia baja confianza"],
    [".ns-card >> nth=2 >> .ns-card-grade-label", 4.5, "rótulo «Calificación detectada»"],
    [".ns-card >> nth=2 >> .ns-conf-level", 4.5, "nivel de confianza"],
    [".ns-card >> nth=2 >> .ns-status", 4.5, "estado pendiente"],
    [".ns-card >> nth=1 >> .ns-status", 4.5, "estado requiere revisión"],
    [".ns-card >> nth=0 >> .ns-status", 4.5, "estado verificada"],
    [".ns-card >> nth=0 >> .ns-stamp", 4.5, "sello"],
    [".ns-card >> nth=2 >> .ns-btn--primary", 4.5, "botón Confirmar"],
    [".ns-card >> nth=2 >> .ns-btn--secondary", 4.5, "botón Editar"],
  ];
  for (const [sel, min, label] of targets) {
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ ${min}:1`, r.ratio >= min, `${r.ratio.toFixed(2)}:1 · texto rgb(${r.fg}) sobre rgb(${r.bg})`);
  }

  // ---------- 4. Tamaño de los controles ----------
  const sizes = await page.locator(".ns-card .ns-btn").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  const minH = Math.min(...sizes);
  report.check("Controles de la tarjeta ≥ 24 px (WCAG 2.2 AA, 2.5.8)", minH >= 24, `${minH}px`);
  // Excepción aceptada por Diego el 2026-10-01 (anexo §2): se mide y se informa, no falla.
  console.log(`NOTA  Controles de la tarjeta: ${minH}px < 44px — excepción aceptada (anexo, 2026-10-01)`);

  // ---------- 5. Movimiento reducido ----------
  const rm = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const rmPage = await rm.newPage();
  await rmPage.goto(URL_BASE + "#/dev/card", { waitUntil: "networkidle" });
  const rmGrade = await rmPage.locator(".ns-card").nth(2).locator(".ns-card-grade").textContent();
  report.check("Con movimiento reducido la nota aparece sin contar", rmGrade === "4.2", rmGrade);
  const rmAnim = await rmPage.locator(".ns-card").nth(1).evaluate((el) => getComputedStyle(el).animationName);
  report.check("Con movimiento reducido no late la tarjeta en revisión", rmAnim === "none", rmAnim);
  await rm.close();

  // ---------- 6. Anchos y consola ----------
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.screenshot({ fullPage: true, path: join(OUT, "paso2-cards-1024.png") });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  report.check("Sin desbordamiento horizontal a 1024 px", !overflow);
  report.check("Consola de la app sin errores ni avisos", cons.length === 0 && mineConsole.length === 0, [...cons, ...mineConsole].join(" | "));
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
