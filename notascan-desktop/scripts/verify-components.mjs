// Paso 4 · verificación medida de la infraestructura compartida.
// Los mismos casos (src/dev/specs.js) se renderizan con los componentes portados y con los
// originales de notascan-ui; se comparan DOM normalizado y píxeles caso por caso, y después
// se prueba comportamiento (DataGrid, diálogos, gráficos) y contraste sobre el render.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DS, OUT, ROOT, URL_BASE, createReport, findOffSystemValues, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";
import { applyAmendments } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

const specsSource = readFileSync(join(ROOT, "src/dev/specs.js"), "utf8").replace("export function buildSpecs", "window.buildSpecs = function buildSpecs");

const normalize = (loc) => loc.evaluate((root) => {
  const walk = (el) => {
    if (el.nodeType === 3) return el.textContent.trim() ? `"${el.textContent.trim()}"` : "";
    if (el.nodeType !== 1) return "";
    const attrs = [...el.attributes]
      .filter((a) => !["id", "aria-labelledby", "aria-describedby", "aria-controls", "for", "name"].includes(a.name))
      .map((a) => `${a.name}=${a.value}`).sort().join(" ");
    return `<${el.tagName.toLowerCase()} ${attrs}>${[...el.childNodes].map(walk).join("")}</${el.tagName.toLowerCase()}>`;
  };
  return walk(root);
});

async function pixelDiff(page, a, b) {
  return page.evaluate(async ([x, y]) => {
    const load = async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); return im; };
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`, pct: 100 };
    const read = (im) => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const da = read(ia), db = read(ib), w = ia.width, hgt = ia.height;
    const near = (src, p, dst) => {
      const px = (p / 4) % w, py = Math.floor(p / 4 / w);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = px + dx, yy = py + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= hgt) continue;
        const q = (yy * w + xx) * 4;
        if (Math.abs(src[p] - dst[q]) + Math.abs(src[p + 1] - dst[q + 1]) + Math.abs(src[p + 2] - dst[q + 2]) <= 24) return true;
      }
      return false;
    };
    let off = 0;
    for (let p = 0; p < da.length; p += 4) {
      if (Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2]) <= 24) continue;
      if (!near(da, p, db) || !near(db, p, da)) off++;
    }
    return { size: `${w}x${hgt}`, pct: (off / (da.length / 4)) * 100 };
  }, [a.toString("base64"), b.toString("base64")]);
}

const { browser, close } = await startPreview();
try {
  // ---------- 1. Fidelidad caso por caso (movimiento reducido: cinta y gráficos quietos) ----------
  const still = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const mine = await still.newPage();
  const mineConsole = watchConsole(mine);
  await mine.goto(URL_BASE + "#/dev/components", { waitUntil: "networkidle" });

  const ref = await still.newPage();
  const refConsole = watchConsole(ref);
  await ref.goto(URL_BASE + "#/dev/tokens", { waitUntil: "networkidle" });
  await ref.evaluate(() => {
    document.head.querySelectorAll("style,link[rel=stylesheet]:not([href*=fonts])").forEach((n) => n.remove());
    const m = document.createElement("div"); m.id = "ref"; document.body.replaceChildren(m);
  });
  await ref.addStyleTag({ path: join(DS, "css/tokens.css") });
  await ref.addStyleTag({ path: join(DS, "css/notascan.css") });
  await applyAmendments(ref);
  await ref.addScriptTag({ path: join(DS, "vendor/react.production.min.js") });
  await ref.addScriptTag({ path: join(DS, "vendor/react-dom.production.min.js") });
  await ref.addScriptTag({ path: join(DS, "js/notascan.js") });
  await ref.addScriptTag({ content: specsSource });
  await ref.evaluate(() => {
    const h = React.createElement;
    const specs = window.buildSpecs(h, window.NotaScan);
    ReactDOM.createRoot(document.getElementById("ref")).render(
      h("main", { className: "ns ns-canvas", style: { minHeight: "100vh", padding: "var(--space-7)" } },
        h("p", { className: "ns-overline" }, "Paso 4 · Infraestructura"),
        h("h1", { className: "ns-serif", style: { font: "800 40px/44px var(--font-display)", margin: "var(--space-2) 0 var(--space-7)" } }, "Componentes compartidos"),
        h("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "var(--space-6)", maxWidth: 1100 } },
          specs.map((s) => h("section", { key: s[0], "data-spec": s[0], style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "var(--space-3)" } },
            h("span", { className: "ns-overline" }, s[0]), h("div", { "data-spec-body": true }, s[1]))))));
  });
  await Promise.all([ref.waitForTimeout(1500), mine.waitForTimeout(1500)]);

  const names = await mine.locator("[data-spec]").evaluateAll((els) => els.map((e) => e.dataset.spec));
  const refNames = await ref.locator("[data-spec]").evaluateAll((els) => els.map((e) => e.dataset.spec));
  report.check(`Mismos ${names.length} casos en ambos lados`, names.join("|") === refNames.join("|"));
  let pixelFails = 0;
  for (const name of names) {
    const sel = `[data-spec="${name}"] [data-spec-body]`;
    const [r, m] = await Promise.all([normalize(ref.locator(sel)), normalize(mine.locator(sel))]);
    let at = 0;
    while (at < r.length && r[at] === m[at]) at++;
    report.check(`${name}: DOM idéntico al sistema`, r === m, r === m ? "" : `…${r.slice(Math.max(0, at - 60), at + 80)}… vs …${m.slice(Math.max(0, at - 60), at + 80)}…`);
    const a = await ref.locator(sel).screenshot({ animations: "disabled" });
    const b = await mine.locator(sel).screenshot({ animations: "disabled" });
    const d = await pixelDiff(mine, a, b);
    if (d.pct > 0.5) pixelFails++;
    report.check(`${name}: píxeles iguales al sistema (≤ 0.5 %)`, d.pct <= 0.5, `${d.size}, ${d.pct.toFixed(3)} %`);
  }
  await mine.screenshot({ fullPage: true, path: join(OUT, "paso4-componentes-1440.png") });
  report.check("Consola sin errores (ambos lados)", refConsole.length === 0 && mineConsole.length === 0, [...refConsole, ...mineConsole].join(" | "));
  await still.close();

  // ---------- 2. Comportamiento ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/dev/components", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // El último diálogo montado se queda el foco: PasswordResetDialog → «Cancelar».
  const focused = await page.evaluate(() => document.activeElement?.textContent);
  report.check("Al abrir un diálogo el foco va a su acción segura (data-autofocus)", focused === "Cancelar", focused);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const trapped = await page.evaluate(() => !!document.activeElement?.closest("[role=alertdialog]"));
  report.check("Tab queda atrapado dentro del diálogo", trapped);

  const grid = page.locator('[data-spec="DataGrid"]');
  const firstNames = () => grid.locator("tbody th").allTextContents();
  const before = await firstNames();
  await grid.getByRole("button", { name: "Promedio" }).click();
  const sortAttr = await grid.locator("th[aria-sort=descending]").count();
  const sorted = await grid.locator("tbody td.is-num").allTextContents();
  report.check("Ordenar por promedio: aria-sort descendente y filas ordenadas", sortAttr === 1 && sorted.join() === "4.9,4.6,4.2,3.9,3.5", sorted.join(", "));
  await grid.getByRole("button", { name: "Promedio" }).click();
  const asc = await grid.locator("tbody td.is-num").allTextContents();
  report.check("Segundo clic invierte el orden", asc[0] === "2.8", asc.join(", "));
  report.check("Paginación «Mostrando 1–5 de 7»", (await grid.locator(".ns-pager .ns-caption").textContent()) === "Mostrando 1–5 de 7");
  await grid.getByRole("button", { name: "Página 2" }).click();
  report.check("Página 2 muestra 2 filas y aria-current", (await grid.locator("tbody tr").count()) === 2 && (await grid.getByRole("button", { name: "Página 2" }).getAttribute("aria-current")) === "page");
  await grid.getByRole("button", { name: "Página 1" }).click();
  await grid.getByRole("checkbox", { name: "Seleccionar todos en esta página" }).check();
  report.check("Seleccionar todos abre la barra de lote con «5 seleccionados»", (await grid.locator(".ns-bulkbar strong").textContent()) === "5 seleccionados");
  await grid.locator(".ns-tr, tbody tr").first().getByRole("checkbox").uncheck();
  const indeterminate = await grid.getByRole("checkbox", { name: "Seleccionar todos en esta página" }).evaluate((el) => el.indeterminate);
  report.check("Quitar una fila deja la casilla general indeterminada", indeterminate);
  await grid.getByRole("button", { name: "Limpiar selección" }).click();
  report.check("Limpiar selección cierra la barra", (await grid.locator(".ns-bulkbar").count()) === 0);
  await grid.getByRole("tab", { name: "Compacta" }).click();
  report.check("Densidad compacta cambia la clase de la tabla", await grid.locator(".ns-grid-wrap").evaluate((el) => el.classList.contains("ns-grid--compact")));
  report.check("Primera columna es cabecera de fila (th scope=row)", (await grid.locator("tbody th[scope=row]").count()) === 5 && before.length === 5);

  const bar = page.locator('[data-spec="BarChart"]');
  await bar.locator(".ns-bar-g").nth(3).hover();
  report.check("Pasar sobre una barra muestra el dato con su nota", (await bar.locator(".ns-chart-tip").textContent()) === "7B · 2.9 · En riesgo");
  report.check("La barra bajo el mínimo usa la variante ns-bar--low", (await bar.locator(".ns-bar--low").count()) === 1);
  report.check("Cada gráfico tiene tabla oculta para lectores de pantalla", (await page.locator("figure.ns-chart table.ns-sr").count()) === 3);

  await page.locator('[data-spec="FilterGroup"]').getByRole("button", { name: /Verificadas/ }).click();
  report.check("Los chips de filtro exponen aria-pressed", (await page.locator('[data-spec="FilterGroup"] [aria-pressed=true]').count()) === 1);

  // ---------- 3. Contraste medido sobre el render ----------
  const targets = [
    ['[data-spec="Input"] .ns-field-label', "etiqueta de campo"],
    ['[data-spec="Input"] .ns-field-hint', "ayuda de campo"],
    ['[data-spec="Input con error"] .ns-field-error', "error de campo"],
    ['[data-spec="Input con éxito"] .ns-field-success', "éxito de campo"],
    ['[data-spec="FilterGroup"] .ns-chip >> nth=0', "chip"],
    ['[data-spec="FilterGroup"] .ns-chip[aria-pressed=true]', "chip activo"],
    ['[data-spec="SegmentedTabs"] [aria-selected=true]', "pestaña activa"],
    ['[data-spec="ReviewStepper"] .ns-step >> nth=5', "paso pendiente"],
    ['[data-spec="ReviewSummary"] .ns-bento-tile--lead', "bento principal"],
    ['[data-spec="ReviewSummary"] .ns-bento-tile--gold .ns-bento-label', "bento pendientes"],
    ['[data-spec="ProcessingPanel"] .ns-proc-item-state >> nth=0', "estado del procesamiento"],
    ['[data-spec="Toast"] .ns-toast-text >> nth=0', "texto de aviso"],
    ['[data-spec="DataGrid"] thead th >> nth=2', "cabecera de tabla"],
    ['[data-spec="DataGrid"] .ns-pager .ns-caption', "paginación"],
    ['[data-spec="BarChart"] .ns-chart-head .ns-caption', "pregunta del gráfico"],
    ['[data-spec="DonutChart"] .ns-chart-legend', "leyenda"],
    ['[data-spec="Modal"] .ns-dialog-text', "texto del modal"],
    ['[data-spec="Drawer"] .ns-drawer-head', "cabecera del drawer"],
  ];
  for (const [sel, label] of targets) {
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ 4.5:1`, r.ratio >= 4.5, `${r.ratio.toFixed(2)}:1`);
  }
  // Texto dentro de los SVG de los gráficos, medido etiqueta por etiqueta.
  for (const [sel, label] of [
    ['[data-spec="BarChart"] text.ns-axis >> nth=3', "eje del gráfico de barras"],
    ['[data-spec="BarChart"] text.ns-bar-val >> nth=0', "valor sobre la barra"],
    ['[data-spec="LineChart"] text.ns-axis--gold', "etiqueta del umbral"],
    ['[data-spec="LineChart"] text.ns-line-label >> nth=0', "valor final de la línea"],
    ['[data-spec="DonutChart"] text.ns-donut-label', "rótulo del anillo"],
  ]) {
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ 4.5:1`, r.ratio >= 4.5, `${r.ratio.toFixed(2)}:1`);
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);
  report.check("Sin desbordamiento horizontal a 1024 px", !(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await page.screenshot({ fullPage: true, path: join(OUT, "paso4-componentes-1024.png") });
  report.check("Consola de la app sin errores ni avisos", cons.length === 0, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
