// Modo oscuro · paso 2 (anexo 2026-11-08-modo-oscuro, sección 7, O7 y O8): el grupo Tema del panel Preferencias.
//
//   npm run build:demo && npm run verify:theme
//
// Mide con el build de demostración:
//   - el panel trae Tema encima de Idioma, y el login no trae Tema
//   - flechas, Inicio y Fin cambian el tema al instante, lo guardan en notascan.theme y mueven el foco
//   - la elección sobrevive al recargar, y al abrir en oscuro no hay destello claro (primer pintado con la hoja retenida)
//   - «Como el sistema» sigue a colorScheme de Playwright, también con la app abierta
//   - sin fundido de color: el fondo de un botón ya tiene su valor final en el mismo instante del cambio
//   - solo el indicador se mueve, con transform, y no se mueve con prefers-reduced-motion
//   - toque de 44 px, contraste en claro y oscuro, foco visible, consola limpia
//   - el panel no se desborda en es, en y pt a 1024 px
// Capturas en verify-out/oscuro-preferencias-*.png.
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole, sampleTextContrast, contrast } from "./harness.mjs";

const report = createReport();
const consoleLog = [];
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

async function newPage(browser, { theme = null, lang = null, width = 1440, height = 900, colorScheme = "light", reducedMotion = "no-preference", quiet = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion });
  await ctx.addInitScript(([t, l]) => {
    // Solo la primera carga de cada pestaña: así recargar mide lo que guardó la app y no lo que pone la prueba.
    if (sessionStorage.getItem("ns-test-seeded")) return;
    sessionStorage.setItem("ns-test-seeded", "1");
    if (t) localStorage.setItem("notascan.theme", t);
    if (l) localStorage.setItem("notascan.idioma", l);
  }, [theme, lang]);
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  // `quiet`: la prueba del primer pintado corta la hoja de estilos a propósito y el navegador lo anota en la consola.
  if (!quiet) consoleLog.push({ label: `${theme || "sin tema"} ${lang || ""} ${width} ${colorScheme}`, cons });
  return { ctx, page };
}
const htmlTheme = (page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
const stored = (page) => page.evaluate(() => localStorage.getItem("notascan.theme"));
async function openPrefs(page, hash = "#/teacher/dashboard") {
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".ns-pref-row").click();
  await page.locator(".ns-drawer .ns-theme-seg").waitFor();
  await page.waitForTimeout(400);
}
const radio = (page, v) => page.locator(`.ns-theme-seg [data-theme-option="${v}"]`);

/** Texto contra el fondo opaco del propio elemento o del primero detrás. */
async function pairOf(loc, { useIndicator = false } = {}) {
  return loc.evaluate((el, useIndicator) => {
    const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const opaque = (c) => c.length === 3 || c[3] > 0.9;
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    let bg = null;
    if (useIndicator) bg = parse(getComputedStyle(el.closest(".ns-theme-seg").querySelector(".ns-theme-seg-ind")).backgroundColor).slice(0, 3);
    let n = el;
    while (!bg && n) { const c = parse(getComputedStyle(n).backgroundColor); if (opaque(c)) bg = c.slice(0, 3); n = n.parentElement; }
    return { fg, bg };
  }, useIndicator);
}

const { browser, close } = await startPreview();
try {
  // ---------------------------------------------------------------- 1. Estructura y teclado (sistema en claro)
  {
    const { ctx, page } = await newPage(browser);
    await openPrefs(page);
    const order = await page.locator(".ns-drawer .ns-pref-group h3").allTextContents();
    report.check("El panel trae Tema encima de Idioma", order[0] === "Tema" && order[1] === "Idioma", order.join(" > "));
    const radios = page.locator(".ns-theme-seg [role=radio]");
    report.check("Tres opciones: Claro, Oscuro, Como el sistema", (await radios.allTextContents()).join("|") === "Claro|Oscuro|Como el sistema", (await radios.allTextContents()).join("|"));
    report.check("Grupo de radio con nombre «Tema»", (await page.getByRole("radiogroup", { name: "Tema" }).count()) === 1);
    report.check("Sin nada guardado, la opción marcada es «Como el sistema» y el tema es claro", (await radio(page, "system").getAttribute("aria-checked")) === "true" && (await htmlTheme(page)) === "light");
    const icons = await radios.evaluateAll((els) => els.every((e) => e.querySelector("svg.ns-icon") && e.textContent.trim().length > 2));
    report.check("Cada opción lleva icono y palabra", icons);

    // Tab llega a la opción marcada y las flechas recorren el grupo.
    await radio(page, "system").focus();
    const steps = [["ArrowLeft", "dark", "dark"], ["ArrowLeft", "light", "light"], ["ArrowLeft", "system", "light"], ["Home", "light", "light"], ["End", "system", "light"], ["ArrowRight", "light", "light"], ["ArrowDown", "dark", "dark"]];
    for (const [key, want, html] of steps) {
      await page.keyboard.press(key);
      const r = await page.evaluate(() => ({ focus: document.activeElement.getAttribute("data-theme-option"), checked: document.querySelector('.ns-theme-seg [aria-checked="true"]').getAttribute("data-theme-option"), html: document.documentElement.getAttribute("data-theme"), saved: localStorage.getItem("notascan.theme") }));
      report.check(`Tecla ${key} → ${want}: marcado, foco, guardado y tema`, r.focus === want && r.checked === want && r.saved === want && r.html === html, JSON.stringify(r));
    }
    // Solo la opción marcada es parada de Tab.
    const tabStops = await radios.evaluateAll((els) => els.map((e) => e.tabIndex).join(","));
    report.check("Solo la opción marcada está en el orden de Tab (roving tabindex)", tabStops === "-1,0,-1", tabStops);

    // Foco visible en claro y en oscuro.
    for (const theme of ["dark", "light"]) {
      await radio(page, theme).focus();
      await page.keyboard.press(theme === "dark" ? "ArrowRight" : "ArrowLeft"); await page.keyboard.press(theme === "dark" ? "ArrowLeft" : "ArrowRight");
      const f = await page.evaluate(() => {
        const el = document.activeElement, cs = getComputedStyle(el);
        const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        let n = el.parentElement, bg = null;
        while (n && !bg) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) bg = c.slice(0, 3); n = n.parentElement; }
        return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: parse(cs.outlineColor).slice(0, 3), bg, html: document.documentElement.getAttribute("data-theme") };
      });
      const ratio = contrast(f.color, f.bg);
      report.check(`Foco visible en la opción (${f.html}): contorno ${f.width}px, ${ratio.toFixed(2)}:1 ≥ 3`, f.style !== "none" && f.width >= 2 && ratio >= 3, `${hex(f.color)} sobre ${hex(f.bg)}`);
    }

    // Toque de 44 px.
    const boxes = await radios.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    report.check("Cada opción mide 44 px o más de alto y de ancho", boxes.every(([w, h]) => w >= 44 && h >= 44), boxes.map((b) => b.join("×")).join(", "));
    const row = await page.locator(".ns-pref-row").boundingBox();
    report.check("La fila Preferencias mide 44 px o más de alto", row.height >= 44, `${Math.round(row.height)} px`);

    // Sin fundido de color: en el mismo instante del clic, el fondo de un botón ya tiene su valor final.
    await radio(page, "light").click(); await page.waitForTimeout(400);
    const instant = await page.evaluate(async () => {
      const btn = document.querySelector(".ns-drawer-head .ns-btn, .ns-drawer .ns-btn, .ns-header .ns-btn--secondary");
      const prop = (el) => getComputedStyle(el).backgroundColor;
      document.querySelector('.ns-theme-seg [data-theme-option="dark"]').click();
      const now = prop(btn);
      await new Promise((r) => setTimeout(r, 500));
      return { now, later: prop(btn), cls: btn.className };
    });
    report.check("Sin fundido de color al cambiar de tema (O7)", instant.now === instant.later, `${instant.cls}: ${instant.now} → ${instant.later}`);
    // Solo se mueve el indicador, con transform.
    const ind = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector(".ns-theme-seg-ind")); return { prop: cs.transitionProperty, dur: cs.transitionDuration, transform: cs.transform }; });
    report.check("El indicador se mueve solo con transform", ind.prop === "transform" && parseFloat(ind.dur) > 0 && ind.transform !== "none", JSON.stringify(ind));

    // Contraste en los dos temas.
    for (const theme of ["dark", "light"]) {
      await radio(page, theme).click(); await page.waitForTimeout(400);
      const on = await pairOf(radio(page, theme), { useIndicator: true });
      const r1 = contrast(on.fg, on.bg);
      report.check(`${theme} · opción marcada sobre el indicador ≥ 4.5:1`, r1 >= 4.5, `${r1.toFixed(2)}:1 ${hex(on.fg)} sobre ${hex(on.bg)}`);
      const other = theme === "dark" ? "light" : "dark";
      const off = await pairOf(radio(page, other));
      const r2 = contrast(off.fg, off.bg);
      report.check(`${theme} · opción sin marcar ≥ 4.5:1`, r2 >= 4.5, `${r2.toFixed(2)}:1 ${hex(off.fg)} sobre ${hex(off.bg)}`);
      const icon = await radio(page, theme).locator("svg").evaluate((el) => (getComputedStyle(el).color.match(/[\d.]+/g) || []).slice(0, 3).map(Number));
      const r3 = contrast(icon, on.bg);
      report.check(`${theme} · icono dorado de la opción marcada ≥ 3:1`, r3 >= 3, `${r3.toFixed(2)}:1 ${hex(icon)} sobre ${hex(on.bg)}`);
      const hint = await sampleTextContrast(page, page.locator(".ns-drawer .ns-pref-group").first().locator(".ns-caption"));
      report.check(`${theme} · línea de ayuda ≥ 4.5:1`, hint.ratio >= 4.5, `${hint.ratio.toFixed(2)}:1 render ${hex(hint.fg)} sobre ${hex(hint.bg)}`);
      const border = await page.locator(".ns-theme-seg").evaluate((el) => {
        const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        return { b: parse(getComputedStyle(el).borderTopColor).slice(0, 3), bg: parse(getComputedStyle(el.closest(".ns-drawer")).backgroundColor).slice(0, 3) };
      });
      const r4 = contrast(border.b, border.bg);
      report.check(`${theme} · borde del segmentado contra el panel ≥ 3:1`, r4 >= 3, `${r4.toFixed(2)}:1`);
      if (theme === "dark") await page.locator(".ns-drawer").screenshot({ path: join(OUT, "oscuro-preferencias-1440.png"), animations: "disabled" });
      else await page.locator(".ns-drawer").screenshot({ path: join(OUT, "claro-preferencias-1440.png"), animations: "disabled" });
    }
    await page.screenshot({ path: join(OUT, "claro-preferencias-panel-1440.png"), animations: "disabled" });
    await radio(page, "dark").click(); await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "oscuro-preferencias-panel-1440.png"), animations: "disabled" });

    // Sobrevive al recargar.
    await page.reload({ waitUntil: "networkidle" });
    report.check("Al recargar sigue en oscuro (guardado en notascan.theme)", (await htmlTheme(page)) === "dark" && (await stored(page)) === "dark");
    await page.locator(".ns-pref-row").click(); await page.locator(".ns-theme-seg").waitFor();
    report.check("Al recargar, el panel marca «Oscuro»", (await radio(page, "dark").getAttribute("aria-checked")) === "true");
    await ctx.close();
  }

  // ---------------------------------------------------------------- 2. Sin destello claro al abrir en oscuro
  // Se retiene el JS de la app, así que lo que se ve es el primer pintado antes de React. Dos casos: con la hoja de
  // estilos (el build) y sin ella (la hoja todavía no llega, como pasa en el servidor de desarrollo, que la inyecta con JS).
  for (const theme of ["dark", "light"]) for (const css of [true, false]) {
    const { ctx, page } = await newPage(browser, { theme, quiet: !css });
    let release; const held = new Promise((r) => { release = r; });
    await page.route(/\/assets\/.*\.js$/, async (route) => { await held; await route.continue().catch(() => {}); });
    if (!css) await page.route(/\/assets\/.*\.css$/, (route) => route.abort());
    await page.goto(URL_BASE + "#/teacher/dashboard", { waitUntil: "commit" });
    await page.waitForTimeout(600);
    const first = await page.screenshot({ timeout: 10000 });
    const px = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      return [...g.getImageData(img.width >> 1, img.height >> 1, 1, 1).data].slice(0, 3);
    }, first.toString("base64"));
    const attr = await htmlTheme(page);
    release();
    const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const label = css ? "con la hoja" : "sin la hoja todavía";
    if (theme === "dark") {
      report.check(`Primer pintado en oscuro ${label}: sin destello claro`, attr === "dark" && L(px) < 0.05, `data-theme ${attr}, píxel central ${hex(px)}`);    } else {
      report.check(`Primer pintado en claro ${label}: data-theme light y lienzo claro, igual que antes`, attr === "light" && L(px) > 0.8, `data-theme ${attr}, píxel central ${hex(px)}`);
    }
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await ctx.close();
  }

  // ---------------------------------------------------------------- 3. «Como el sistema» sigue a colorScheme
  {
    const { ctx, page } = await newPage(browser, { theme: "system", colorScheme: "dark" });
    await page.goto(URL_BASE + "#/teacher/dashboard", { waitUntil: "networkidle" });
    report.check("«Como el sistema» con el equipo en oscuro abre en oscuro", (await htmlTheme(page)) === "dark");
    await page.emulateMedia({ colorScheme: "light" }); await page.waitForTimeout(200);
    report.check("Con la app abierta, el equipo pasa a claro y la app lo sigue", (await htmlTheme(page)) === "light");
    await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(200);
    report.check("Y vuelve a oscuro cuando el equipo vuelve", (await htmlTheme(page)) === "dark");
    await page.locator(".ns-pref-row").click(); await page.locator(".ns-theme-seg").waitFor();
    await radio(page, "light").click();
    await page.emulateMedia({ colorScheme: "light" }); await page.emulateMedia({ colorScheme: "dark" }); await page.waitForTimeout(200);
    report.check("Con «Claro» elegido, el cambio del equipo no lo mueve", (await htmlTheme(page)) === "light");
    await ctx.close();
  }

  // ---------------------------------------------------------------- 4. Movimiento reducido
  {
    const { ctx, page } = await newPage(browser, { reducedMotion: "reduce" });
    await openPrefs(page);
    const dur = await page.locator(".ns-theme-seg-ind").evaluate((el) => getComputedStyle(el).transitionDuration);
    // notascan.css deja toda transición en 1 ms con movimiento reducido; preferences.css la pone en none. Cualquiera de los dos es «no se anima».
    report.check("Con prefers-reduced-motion el indicador no se anima (≤ 1 ms)", parseFloat(dur) <= 0.001, dur);
    await ctx.close();
  }

  // ---------------------------------------------------------------- 5. Login sin grupo Tema
  {
    const { ctx, page } = await newPage(browser, { theme: "dark" });
    await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
    await page.locator('.ns-auth-foot a[aria-haspopup="dialog"]').click();
    await page.locator(".ns-drawer").waitFor();
    report.check("El panel del login no trae grupo Tema y sí Idioma", (await page.locator(".ns-drawer .ns-theme-seg").count()) === 0 && (await page.locator(".ns-drawer .ns-pref-list").count()) === 1);
    report.check("El login abre con lo último guardado (oscuro)", (await htmlTheme(page)) === "dark");
    await ctx.close();
  }

  // ---------------------------------------------------------------- 6. Sin desborde en es, en y pt a 1024
  for (const lang of ["es", "en", "pt"]) for (const theme of ["dark", "light"]) {
    const { ctx, page } = await newPage(browser, { theme, lang, width: 1024, height: 768 });
    await openPrefs(page);
    const over = await page.evaluate(() => {
      const out = [];
      const d = document.querySelector(".ns-drawer"), body = d.querySelector(".ns-drawer-body");
      if (body.scrollWidth > body.clientWidth) out.push(`cuerpo ${body.scrollWidth}>${body.clientWidth}`);
      if (d.getBoundingClientRect().right > innerWidth + 0.5) out.push("panel fuera de la ventana");
      const seg = d.querySelector(".ns-theme-seg").getBoundingClientRect();
      for (const el of d.querySelectorAll(".ns-theme-seg-tab, .ns-theme-seg-tab span, .ns-period-item, .ns-pref-group .ns-caption")) {
        const r = el.getBoundingClientRect();
        if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.className || el.tagName} recorta texto`);
        if (el.closest(".ns-theme-seg") && (r.left < seg.left - 0.5 || r.right > seg.right + 0.5)) out.push(`«${el.textContent.trim()}» sale del segmentado`);
      }
      return out;
    });
    const labels = await page.locator(".ns-theme-seg [role=radio]").allTextContents();
    report.check(`${lang} · ${theme} · 1024 px · el panel no se desborda (${labels.join(", ")})`, over.length === 0, over.join("; "));
    if (lang === "pt" && theme === "dark") await page.locator(".ns-drawer").screenshot({ path: join(OUT, "oscuro-preferencias-pt-1024.png"), animations: "disabled" });
    await ctx.close();
  }
} finally {
  await close();
}

const noisy = consoleLog.filter((c) => c.cons.length);
report.check(`Consola sin errores ni avisos en ${consoleLog.length} pestañas`, noisy.length === 0, noisy.map((c) => `${c.label}: ${c.cons.slice(0, 2).join(" | ")}`).join("; "));
process.exit(report.print() ? 1 : 0);
