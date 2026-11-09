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
    invoke: async (cmd, args) => {
      window.__tauriCalls = [...(window.__tauriCalls || []), cmd];
      if (cmd === "plugin:window|set_theme") window.__tauriSetTheme = [...(window.__tauriSetTheme || []), args.value];
      return cmd.endsWith("is_maximized") ? false : null;
    },
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
    report.check("mac: la marca empieza a 85 px, 12 px después de los botones del sistema (de 14 a 73 px)", Math.round(m.brandX) === 85, `${m.brandX}px`);
    report.check("mac: no se consulta el estado de maximizado (no hay botón que lo muestre)", !(await page.evaluate(() => (window.__tauriCalls || []).some((c) => c.includes("is_maximized")))));
  } else {
    report.check(`${os}: minimizar, maximizar y cerrar`, m.buttons === 3, `${m.buttons} botones`);
    report.check(`${os}: la marca empieza a 12 px`, Math.round(m.brandX) === 12, `${m.brandX}px`);
    const names = await bar.locator("button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-label")));
    report.check(`${os}: botones con nombre accesible`, names.join(",") === "Minimizar,Maximizar,Cerrar", names.join(","));
  }
  {
    // En claro la barra queda igual a la de antes en los tres sistemas (referencia: el commit anterior, con --referencia).
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

if (REFERENCIA) { await close(); process.exit(report.print() ? 1 : 0); }

// ---------------------------------------------------------------- Modo oscuro, paso 3 (anexo 2026-11-08-modo-oscuro, sección 14)
// La barra usa los tokens (--paper, --ivory-deep, --muted, --navy, --burgundy, --focus), así que cambia con el tema sin
// código aparte. Se mide en los dos temas: marca, iconos, hover, cerrar con su rojo y foco. En macOS se mide además que
// se le pide a Tauri setTheme con el valor correcto (los botones del sistema solo se ven en un Mac real).
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
/** Color de primer plano y fondo opaco calculados de un elemento (el fondo se busca hacia arriba si es transparente). */
const colors = (loc) => loc.evaluate((el) => {
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  let n = el, bg = null;
  while (n && !bg) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) bg = c.slice(0, 3); n = n.parentElement; }
  const cs = getComputedStyle(el);
  return { fg: parse(cs.color).slice(0, 3), bg, outline: { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: parse(cs.outlineColor).slice(0, 3) } };
});
const themeTable = [];
const measureBar = async (page, os, theme) => {
  const bar = page.locator("header.ns-titlebar");
  const row = (what, r, min, note) => { themeTable.push({ os, theme, what, r, min }); report.check(`${theme} · ${os}: ${what} ≥ ${min}:1`, r >= min, `${r.toFixed(2)}:1 ${note}`); };
  const brand = await colors(bar.locator(".ns-titlebar-brand > span").last());
  row("marca «NotaScan»", ratio(brand.fg, brand.bg), 4.5, `${hex(brand.fg)} sobre ${hex(brand.bg)}`);
  const mark = await colors(bar.locator(".ns-logo-mark"));
  row("logo N sobre dorado", ratio(mark.fg, mark.bg), 4.5, `${hex(mark.fg)} sobre ${hex(mark.bg)}`);
  if (os === "mac") return;
  const btns = bar.locator("button");
  for (let i = 0; i < 3; i++) {
    const b = btns.nth(i);
    const name = await b.getAttribute("aria-label");
    const rest = await colors(b);
    row(`icono «${name}» en reposo`, ratio(rest.fg, rest.bg), 3, `${hex(rest.fg)} sobre ${hex(rest.bg)}`);
    await b.hover(); await page.waitForTimeout(250);
    const hov = await colors(b);
    row(`icono «${name}» al pasar el ratón`, ratio(hov.fg, hov.bg), 3, `${hex(hov.fg)} sobre ${hex(hov.bg)}`);
    if (i === 2) {
      const want = await page.evaluate(() => { const p = document.createElement("i"); p.style.color = "var(--burgundy)"; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; });
      const got = await b.evaluate((el) => getComputedStyle(el).backgroundColor);
      report.check(`${theme} · ${os}: cerrar al pasar el ratón se pinta con --burgundy del tema`, got === want, `${got}`);
      await b.screenshot({ path: join(OUT, `titlebar-${theme}-${os}-cerrar-hover.png`) });
    }
    await page.mouse.move(700, 500);
  }
  // Foco: la barra es lo primero del documento, así que el primer Tab cae en «Minimizar».
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement.getAttribute("aria-label"));
  const f = await colors(btns.first());
  const fr = ratio(f.outline.color, f.bg);
  report.check(`${theme} · ${os}: foco visible en «${focused}» (contorno ${f.outline.width}px, ${fr.toFixed(2)}:1 ≥ 3)`, focused === "Minimizar" && f.outline.style !== "none" && f.outline.width >= 2 && fr >= 3, `${hex(f.outline.color)} sobre ${hex(f.bg)}`);
  themeTable.push({ os, theme, what: "foco de los botones", r: fr, min: 3 });
  await bar.screenshot({ path: join(OUT, `titlebar-${theme}-${os}-foco.png`), animations: "disabled" });
};

for (const os of ["mac", "windows", "linux"]) for (const theme of ["claro", "oscuro"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA[os], reducedMotion: "reduce" });
  await ctx.addInitScript(mockTauri);
  if (theme === "oscuro") await ctx.addInitScript(() => { if (!sessionStorage.getItem("seed")) { sessionStorage.setItem("seed", "1"); localStorage.setItem("notascan.theme", "dark"); } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/teacher/dashboard", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const attr = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  report.check(`${theme} · ${os}: data-theme ${theme === "oscuro" ? "dark" : "light"}`, attr === (theme === "oscuro" ? "dark" : "light"), attr);
  if (theme === "oscuro") await page.locator("header.ns-titlebar").screenshot({ path: join(OUT, `titlebar-oscuro-${os}.png`), animations: "disabled" });
  await measureBar(page, os, theme);

  // setTheme: en macOS se llama con el tema elegido y con null para «Como el sistema»; en Windows y Linux nunca.
  const calls = () => page.evaluate(() => (window.__tauriSetTheme || []).slice());
  const atStart = await calls();
  if (os === "mac") {
    report.check(`${theme} · mac: al abrir, setTheme ${theme === "oscuro" ? "con 'dark'" : "no se llama («Como el sistema» ya es la apariencia de la ventana)"}`,
      theme === "oscuro" ? JSON.stringify(atStart) === JSON.stringify(["dark"]) : atStart.length === 0, JSON.stringify(atStart));
  } else {
    report.check(`${theme} · ${os}: al abrir no se llama setTheme`, atStart.length === 0, JSON.stringify(atStart));
  }
  if (theme === "oscuro") {
    await page.locator(".ns-pref-row").click();
    await page.locator(".ns-theme-seg").waitFor();
    for (const v of ["light", "system", "dark"]) { await page.locator(`.ns-theme-seg [data-theme-option="${v}"]`).click(); await page.waitForTimeout(100); }
    const after = (await calls()).slice(atStart.length);
    if (os === "mac") report.check("mac: al elegir Claro, Como el sistema y Oscuro, setTheme recibe 'light', null y 'dark'", JSON.stringify(after) === JSON.stringify(["light", null, "dark"]), JSON.stringify(after));
    else report.check(`${os}: cambiar el tema no llama a setTheme (la ventana no tiene marco nativo)`, after.length === 0, JSON.stringify(after));
  }
  report.check(`${theme} · ${os}: consola limpia`, cons.length === 0, cons.join(" | "));
  await ctx.close();
}

await close();
const lines = ["| Sistema | Tema | Medición | Mínimo | Contraste |", "|---|---|---|---|---|", ...themeTable.map((t) => `| ${t.os} | ${t.theme} | ${t.what} | ${t.min} | ${t.r.toFixed(2)} |`)];
writeFileSync(join(OUT, "titlebar-temas.md"), lines.join("\n") + "\n");
process.exit(report.print() ? 1 : 0);
