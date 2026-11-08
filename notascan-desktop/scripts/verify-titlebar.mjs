// Barra de título según el sistema (enmienda 10, 2026-11-08).
// Simula la app de escritorio (Tauri) en el navegador con el agente de usuario de cada sistema y mide la barra.
// macOS: sin botones propios, marca después de los botones del sistema, toda la barra arrastrable.
// Windows y Linux: los tres botones de siempre, y la barra igual píxel a píxel a la de antes (verify-out/titlebar-antes-*.png,
// se generan con --referencia sobre el commit anterior).
// Lo que esta prueba no puede medir, la posición real de los botones de macOS, se mide en el Mac de GitHub (paso C).
// Requiere `npm run build:demo` antes.
import { PNG } from "pngjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createReport, startPreview, watchConsole, URL_BASE, OUT } from "./harness.mjs";

const UA = {
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
  linux: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko)",
};
const REFERENCIA = process.argv.includes("--referencia");

// Lo mínimo de Tauri que usa la barra: etiqueta de la ventana y llamadas que responden «no maximizada».
const mockTauri = () => {
  let id = 0;
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
    transformCallback: () => ++id,
    invoke: async (cmd) => { window.__tauriCalls = [...(window.__tauriCalls || []), cmd]; return cmd.endsWith("is_maximized") ? false : null; },
  };
};

const report = createReport();
const { browser, close } = await startPreview();

for (const os of ["mac", "windows", "linux"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA[os], reducedMotion: "reduce" });
  await ctx.addInitScript(mockTauri);
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/teacher/dashboard", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const bar = page.locator("header.ns-titlebar");
  if (!(await bar.count())) { report.check(`${os}: la barra existe`, false); await ctx.close(); continue; }
  const m = await bar.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const brand = el.querySelector(".ns-titlebar-brand .ns-logo-mark, .ns-titlebar-brand svg, .ns-titlebar-brand > *");
    const cs = getComputedStyle(el);
    return {
      h: r.height, w: r.width,
      buttons: el.querySelectorAll("button").length,
      brandX: brand ? brand.getBoundingClientRect().left : -1,
      drag: el.hasAttribute("data-tauri-drag-region") && el.querySelector(".ns-titlebar-brand").hasAttribute("data-tauri-drag-region"),
      bg: cs.backgroundColor, border: cs.borderBottomColor,
      rootTop: document.getElementById("root").getBoundingClientRect().top,
    };
  });
  const png = await bar.screenshot({ animations: "disabled" });
  writeFileSync(join(OUT, `titlebar-${REFERENCIA ? "antes" : "ahora"}-${os}.png`), png);

  report.check(`${os}: barra de 32 px más 1 px de borde, a todo el ancho`, m.h === 33 && m.w === 1440, `${m.w}x${m.h}`);
  report.check(`${os}: el contenido empieza debajo de la barra`, m.rootTop === 32, `${m.rootTop}px`);
  report.check(`${os}: barra y marca arrastrables`, m.drag);
  report.check(`${os}: consola limpia`, cons.length === 0, cons.join(" | "));
  if (os === "mac") {
    report.check("mac: sin botones propios (los pone el sistema)", m.buttons === 0, `${m.buttons} botones`);
    // Botones del sistema: 14 px + 3 × 12 px + 2 × 8 px = 66 px; la marca va 12 px después.
    report.check("mac: la marca empieza a 78 px, después de los botones del sistema", Math.round(m.brandX) === 78, `${m.brandX}px`);
    report.check("mac: no se consulta el estado de maximizado (no hay botón que lo muestre)", !(await page.evaluate(() => (window.__tauriCalls || []).some((c) => c.includes("is_maximized")))));
  } else {
    report.check(`${os}: minimizar, maximizar y cerrar`, m.buttons === 3, `${m.buttons} botones`);
    report.check(`${os}: la marca empieza a 12 px`, Math.round(m.brandX) === 12, `${m.brandX}px`);
    const names = await bar.locator("button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")));
    report.check(`${os}: botones con nombre accesible`, names.join(",") === "Minimizar,Maximizar,Cerrar", names.join(","));
    const ref = join(OUT, `titlebar-antes-${os}.png`);
    if (!REFERENCIA && existsSync(ref)) {
      const a = PNG.sync.read(readFileSync(ref)), b = PNG.sync.read(png);
      let diff = 0;
      for (let i = 0; i < a.data.length; i += 4) if (Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])) > 8) diff++;
      report.check(`${os}: barra igual a la de antes`, a.width === b.width && a.height === b.height && diff === 0, `${diff} píxeles distintos`);
    }
  }
  await ctx.close();
}

await close();
process.exit(report.print() ? 1 : 0);
