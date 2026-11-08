// Modo oscuro · paso 1 (tokens y parches de B · Campo marino). Mide sobre el render del build de demostración.
//
//   npm run build:demo && npm run verify:dark
//
// Todavía no hay selector (es el paso 2), así que Playwright pone data-theme="dark" en <html> antes del primer pintado.
// Comprueba:
//   - que theme-dark.css es exactamente lo que genera scripts/generar-tema-oscuro.mjs, que notascan.css y tokens.css no
//     cambiaron, y que todo color de theme-dark.css sale del contrato o del propio notascan.css
//   - que sin data-theme y con data-theme="light" la app pinta igual (píxel a píxel)
//   - contraste AA de piso, AAA (7:1) en la nota y en las cifras de decisión (O6)
//   - O4: todo texto sobre relleno dorado visible lleva tinta oscura con 4.5:1 o más
//   - O5: boletín y foto del examen en claro, y la impresión vuelve a los tokens claros
//   - foco visible en el recorrido por teclado del panel docente
//   - consola limpia
// Capturas a 1024 y 1440 en verify-out/oscuro-<pantalla>-<ancho>.png. Informe en verify-out/oscuro-mediciones.md.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { OUT, ROOT, URL_BASE, createReport, startPreview, watchConsole, sampleTextContrast, contrast, pixelDiff } from "./harness.mjs";
import { buildThemeDark, THEME_DARK_PATH, DARK_TOKENS, ON_GOLD, LEDGE, FIELD, LIGHT_TOKENS } from "./generar-tema-oscuro.mjs";

const report = createReport();
const AA = 4.5, AAA = 7, NONTEXT = 3;
const rows = []; // tabla del informe
const measure = (width, screen, what, ratio, min, note = "") => {
  const ok = ratio != null && ratio >= min;
  rows.push({ width, screen, what, ratio, min, ok, note });
  report.check(`${width} · ${screen} · ${what} ≥ ${min}:1`, ok, `${ratio == null ? "sin medir" : ratio.toFixed(2) + ":1"} ${note}`);
};
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// ---------------------------------------------------------------- 1. Comprobaciones sobre los archivos
const sheet = readFileSync(THEME_DARK_PATH, "utf8").replace(/\r\n/g, "\n");
report.check("theme-dark.css es lo que genera scripts/generar-tema-oscuro.mjs (no hay edición a mano)", sheet === buildThemeDark());
const untouched = (f) => spawnSync("git", ["diff", "--quiet", "HEAD", "--", f], { cwd: ROOT }).status === 0;
report.check("notascan.css sin cambios respecto de HEAD", untouched("src/styles/notascan.css"));
report.check("tokens.css sin cambios respecto de HEAD", untouched("src/styles/tokens.css"));
const norm = (c) => c.toLowerCase().replace(/\s+/g, "").replace(/0\.(\d)/g, ".$1");
const LIT = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
const allowed = new Set([...Object.values(DARK_TOKENS), ON_GOLD, LEDGE, ...Object.values(FIELD), ...Object.values(LIGHT_TOKENS)].flatMap((v) => v.match(LIT) || []).map(norm));
for (const lit of readFileSync(join(ROOT, "src/styles/notascan.css"), "utf8").match(LIT) || []) allowed.add(norm(lit));
const foreign = [...new Set((sheet.replace(/\/\*[\s\S]*?\*\//g, "").match(LIT) || []).map(norm))].filter((c) => !allowed.has(c));
report.check("Todo color de theme-dark.css sale del contrato B o de notascan.css", foreign.length === 0, foreign.join(", "));
const tj = JSON.parse(readFileSync(join(ROOT, "src/styles/tokens.json"), "utf8"));
const darkTheme = tj.color.themes.find((t) => t.id === "dark");
const jsonMismatch = darkTheme ? Object.entries(DARK_TOKENS).filter(([k, v]) => darkTheme.values[k.slice(2)] !== v).map(([k]) => k) : ["sin tema dark"];
report.check("tokens.json tiene el tema dark con los mismos valores que theme-dark.css", jsonMismatch.length === 0, jsonMismatch.join(", "));

// ---------------------------------------------------------------- 2. Navegador
// En el navegador la barra de título no existe: réplica estática del marcado de TitleBar.tsx.
const TITLEBAR = `<header class="ns-titlebar" data-mock="titlebar"><span class="ns-titlebar-brand"><span class="ns-logo" style="font-size:13px"><span class="ns-logo-mark">N</span></span><span>NotaScan</span></span>
<div class="ns-titlebar-controls">
<button type="button" class="ns-titlebar-btn" aria-label="Minimizar"><svg class="ns-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
<button type="button" class="ns-titlebar-btn" aria-label="Maximizar"><svg class="ns-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1"/></svg></button>
<button type="button" class="ns-titlebar-btn ns-titlebar-btn--close" aria-label="Cerrar"><svg class="ns-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
</div></header>`;

/** Pone data-theme en <html> antes del primer pintado. El script de inicio corre antes de que exista <html>, así que espera. */
const themeInit = (t) => {
  const set = () => document.documentElement.setAttribute("data-theme", t);
  if (document.documentElement) set();
  else new MutationObserver((_, o) => { if (document.documentElement) { set(); o.disconnect(); } }).observe(document, { childList: true });
};

const consoleLog = [];
async function open(ctx, hash, { titlebar = true } = {}) {
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (titlebar) await page.evaluate((tb) => { document.documentElement.classList.add("ns-in-desktop"); document.body.insertAdjacentHTML("afterbegin", tb); }, TITLEBAR);
  await page.waitForTimeout(1100);
  page.themeSet = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  return { page, cons };
}
const closePage = async (page, cons, width, screen) => { consoleLog.push({ width, screen, msgs: [...cons] }); await page.close(); };

/** Texto medido sobre los píxeles del render. */
async function sample(page, width, screen, what, selector, min, nth = 0) {
  const loc = page.locator(selector).nth(nth);
  if (!(await loc.count())) { measure(width, screen, what, null, min, `no encontrado: ${selector}`); return; }
  const r = await sampleTextContrast(page, loc);
  measure(width, screen, what, r.ratio, min, `render ${hex(r.fg)} sobre ${hex(r.bg)}`);
}
/** Color calculado contra el fondo opaco del propio elemento o del primero detrás (controles con esquina redondeada). */
async function textPair(page, width, screen, what, selector, min, nth = 0) {
  const loc = page.locator(selector).nth(nth);
  if (!(await loc.count())) { measure(width, screen, what, null, min, `no encontrado: ${selector}`); return; }
  const p = await loc.evaluate((el) => {
    const parse = (s) => s.match(/[\d.]+/g).map(Number);
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    let n = el, bg = null;
    while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) { bg = c.slice(0, 3); break; } n = n.parentElement; }
    return { fg, bg: bg || [255, 255, 255] };
  });
  measure(width, screen, what, contrast(p.fg, p.bg), min, `calculado ${hex(p.fg)} sobre ${hex(p.bg)}`);
}
/** Borde u otro color no textual contra el primer fondo opaco detrás del elemento. */
async function edge(page, width, screen, what, selector, prop) {
  const loc = page.locator(selector).first();
  if (!(await loc.count())) { measure(width, screen, what, null, NONTEXT, `no encontrado: ${selector}`); return; }
  const p = await loc.evaluate((el, prop) => {
    const parse = (s) => s.match(/[\d.]+/g).map(Number);
    let n = el.parentElement, bg = null;
    while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) { bg = c.slice(0, 3); break; } n = n.parentElement; }
    return { fg: parse(getComputedStyle(el)[prop]).slice(0, 3), bg: bg || [255, 255, 255] };
  }, prop);
  measure(width, screen, what, contrast(p.fg, p.bg), NONTEXT, `${hex(p.fg)} sobre ${hex(p.bg)}`);
}

/** O4: todo texto visible que se pinta sobre el relleno dorado del tema, con su color calculado. */
const goldAudit = [];
async function auditGold(page, width, screen) {
  const found = await page.evaluate(() => {
    const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
    const probe = document.createElement("i");
    probe.style.color = "var(--gold)"; document.body.appendChild(probe);
    const gold = parse(getComputedStyle(probe).color); probe.remove();
    const opaque = (b) => b.length === 3 || (b.length === 4 && b[3] > 0.9);
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      const bg = parse(cs.backgroundColor);
      if (!opaque(bg) || bg.slice(0, 3).some((v, i) => Math.abs(v - gold[i]) > 2)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || cs.visibility === "hidden") continue;
      const visit = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3 && c.textContent.trim()) out.push({ cls: String(el.getAttribute("class") || el.tagName).split(" ")[0], bg: bg.slice(0, 3), fg: parse(getComputedStyle(n).color).slice(0, 3), text: c.textContent.trim().slice(0, 24) });
          else if (c.nodeType === 1 && !opaque(parse(getComputedStyle(c).backgroundColor))) visit(c);
        }
      };
      visit(el);
    }
    return out;
  });
  for (const f of found) goldAudit.push({ width, screen, ...f, ratio: contrast(f.fg, f.bg) });
}

/** O6 y AA: medición de cada pantalla. */
async function screens(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript(themeInit, "dark");
  const shot = (page, name) => page.screenshot({ path: join(OUT, `oscuro-${name}-${width}.png`), animations: "disabled" });

  // ---- login
  let { page, cons } = await open(ctx, "#/login");
  report.check(`${width} · data-theme="dark" puesto en <html> antes de medir`, page.themeSet === "dark", String(page.themeSet));
  await shot(page, "login");
  await sample(page, width, "login", "Titular", ".ns-auth-hello h1, .ns-auth-hello h2", AA);
  await sample(page, width, "login", "Bienvenida", ".ns-auth-hello p", AA);
  await textPair(page, width, "login", "Botón Entrar", ".ns-auth-submit", AA);
  await sample(page, width, "login", "Enlace «¿Olvidaste…?»", ".ns-auth-row a", AA);
  await sample(page, width, "login", "Barra de título · marca", ".ns-titlebar-brand", AA);
  await sample(page, width, "login", "Barra de título · icono", ".ns-titlebar-btn", NONTEXT);
  const wave = await page.evaluate(() => { const w = document.querySelector(".ns-auth-wave"), p = document.querySelector(".ns-auth-panel"); return w && p ? [getComputedStyle(w).fill, getComputedStyle(p).backgroundColor] : null; });
  report.check(`${width} · login · la ola tiene el color del panel`, !!wave && wave[0] === wave[1], wave ? wave.join(" / ") : "no encontrada");
  await auditGold(page, width, "login");
  await closePage(page, cons, width, "login");

  // ---- panel docente y recorrido por teclado
  ({ page, cons } = await open(ctx, "#/teacher/dashboard"));
  await shot(page, "panel-docente");
  await sample(page, width, "panel docente", "Titular de página", ".ns-header-title", AA);
  await sample(page, width, "panel docente", "Descripción", ".ns-header-desc", AA);
  await sample(page, width, "panel docente", "Bloque invertido · título", ".ns-block--navy h2, .ns-block--navy h3", AA);
  await sample(page, width, "panel docente", "Bloque invertido · meta", ".ns-home-hero-meta", AA);
  await textPair(page, width, "panel docente", "Botón «Calificar» (dorado)", ".ns-header .ns-btn--primary", AA);
  await textPair(page, width, "panel docente", "Botón dorado en el bloque invertido", ".ns-block--navy .ns-btn--primary", AA);
  await textPair(page, width, "panel docente", "Botón secundario", ".ns-header .ns-btn--secondary", AA);
  await textPair(page, width, "panel docente", "Menú · ítem activo", '.ns-nav-item[aria-current="page"]', AA);
  await textPair(page, width, "panel docente", "Menú · número del ítem activo", '.ns-nav-item[aria-current="page"] .ns-nav-item-index', AA);
  await textPair(page, width, "panel docente", "Menú · contador", ".ns-nav-item-count", AA);
  await sample(page, width, "panel docente", "Texto --muted (rótulo de sección)", ".ns-sidebar-section", AA);
  await sample(page, width, "panel docente", "Cifra «notas por verificar»", ".ns-bento-value", AAA);
  await edge(page, width, "panel docente", "Borde de tarjeta", ".ns-block:not(.ns-block--navy)", "borderTopColor");
  await edge(page, width, "panel docente", "Borde del buscador", ".ns-gsearch-trigger", "borderTopColor");
  await auditGold(page, width, "panel docente");
  // Recorrido: 30 pulsaciones de Tab desde el principio. Cada parada necesita contorno de 2 px o más con 3:1.
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const stops = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    stops.push(await page.evaluate(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      let n = el.parentElement, bg = null;
      while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) { bg = c.slice(0, 3); break; } n = n.parentElement; }
      const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 32);
      return { name, outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2, color: parse(cs.outlineColor).slice(0, 3), bg: bg || [255, 255, 255] };
    }));
  }
  const seen = stops.filter(Boolean);
  const bad = seen.filter((s) => !s.outline || contrast(s.color, s.bg) < NONTEXT);
  report.check(`${width} · panel docente · foco visible en ${seen.length} paradas de Tab (contorno ≥2 px, ≥3:1)`, seen.length > 5 && bad.length === 0, bad.map((s) => `«${s.name}» ${s.outline ? contrast(s.color, s.bg).toFixed(2) + ":1" : "sin contorno"}`).join("; "));
  const withOutline = seen.filter((s) => s.outline);
  if (withOutline.length) { const worst = Math.min(...withOutline.map((s) => contrast(s.color, s.bg))); rows.push({ width, screen: "panel docente", what: `Foco, peor contraste en ${seen.length} paradas de Tab`, ratio: worst, min: NONTEXT, ok: worst >= NONTEXT && !bad.length, note: "" }); }
  await page.locator(".ns-nav-item").first().focus();
  await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
  await page.screenshot({ path: join(OUT, `oscuro-foco-${width}.png`), clip: { x: 0, y: 200, width: 300, height: 200 }, animations: "disabled" });
  await closePage(page, cons, width, "panel docente");

  // ---- revisión: tarjeta de nota
  ({ page, cons } = await open(ctx, "#/teacher/review"));
  await shot(page, "revision");
  const cards = page.locator(".ns-card:not(.ns-card--skeleton)");
  const n = Math.min(await cards.count(), 6);
  report.check(`${width} · revisión · hay tarjetas de nota que medir`, n > 0, `${n}`);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const status = (await card.getAttribute("class")).match(/ns-card--([a-z-]+)/)?.[1] ?? "?";
    const g = card.locator(".ns-card-grade");
    if (!(await g.count())) continue;
    const r = await sampleTextContrast(page, g);
    measure(width, "revisión", `Cifra de nota, tarjeta ${i + 1} (${status})`, r.ratio, AAA, `render ${hex(r.fg)} sobre ${hex(r.bg)}`);
  }
  await sample(page, width, "revisión", "Rótulo «Calificación detectada»", ".ns-card-grade-label .ns-overline", AA);
  await sample(page, width, "revisión", "ID del estudiante", ".ns-card-id", AA);
  await textPair(page, width, "revisión", "Cinta · frase", ".ns-marquee-item", AA);
  await textPair(page, width, "revisión", "Cinta · rótulo dorado", ".ns-marquee-label", AA);
  await textPair(page, width, "revisión", "Nº de tarjeta (requiere revisión)", ".ns-card--needs-review .ns-card-index", AA);
  await textPair(page, width, "revisión", "Botón «Confirmar»", ".ns-card .ns-btn--primary", AA);
  for (const [lvl, label] of [["high", "alta"], ["medium", "media"], ["low", "baja"]]) {
    await textPair(page, width, "revisión", `Insignia IA ${label}`, `.ns-badge--${lvl}`, AA);
    await textPair(page, width, "revisión", `Nivel de confianza ${label}`, `.ns-conf--${lvl} .ns-conf-level`, AA);
  }
  const shapes = await page.evaluate(() => ["high", "medium", "low"].map((l) => {
    const els = [...document.querySelectorAll(`.ns-badge--${l}, .ns-conf--${l} .ns-conf-level`)];
    return { l, n: els.length, ok: els.every((e) => e.querySelector("svg") && e.textContent.trim().length > 1) };
  }));
  for (const s of shapes) report.check(`${width} · revisión · confianza ${s.l} con icono y palabra (${s.n})`, s.ok && s.n > 0);
  await edge(page, width, "revisión", "Borde de la tarjeta", ".ns-card:not(.ns-card--skeleton)", "borderTopColor");
  await auditGold(page, width, "revisión");
  if (n >= 3) {
    await cards.nth(0).scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const b = await Promise.all([0, 2].map((i) => cards.nth(i).boundingBox()));
    const x = Math.max(0, b[0].x - 24), y = Math.max(0, b[0].y - 24);
    await page.screenshot({ path: join(OUT, `oscuro-tarjeta-${width}.png`), clip: { x, y, width: Math.min(width - x, b[1].x + b[1].width - x + 24), height: Math.min(900 - y, b[0].height + 48) }, animations: "disabled" });
  }
  await closePage(page, cons, width, "revisión");

  // ---- rectoría, secretaría y solicitudes de cambio de nota
  for (const [hash, name, label] of [["#/principal/dashboard", "panel-rectoria", "panel rectoría"], ["#/admin/dashboard", "panel-secretaria", "panel secretaría"]]) {
    ({ page, cons } = await open(ctx, hash));
    await shot(page, name);
    await sample(page, width, label, "Titular de página", ".ns-header-title", AA);
    await sample(page, width, label, "Cifra principal (KPI)", ".ns-kpi strong, .ns-bento-value", AAA);
    await auditGold(page, width, label);
    await closePage(page, cons, width, label);
  }
  ({ page, cons } = await open(ctx, "#/principal/requests"));
  await shot(page, "solicitudes-rectoria");
  if (await page.locator(".ns-change-big").count()) {
    await sample(page, width, "solicitudes rectoría", "Cifra actual del cambio de nota", ".ns-change-big > div:not(.is-new) strong", AAA);
    await textPair(page, width, "solicitudes rectoría", "Cifra solicitada del cambio (papel, enmienda 2026-10)", ".ns-change-big .is-new strong", AAA);
    await textPair(page, width, "solicitudes rectoría", "Rótulo de la cifra solicitada", ".ns-change-big .is-new .ns-overline", AA);
    // amendments.css le da a la cifra nueva una repisa dorada (var(--shadow-gold)). La capa REPISAS sale de notascan.css,
    // donde esa regla tiene repisa navy, y con más especificidad la pisa. Se mide para que no pase desapercibido.
    const ledge = await page.locator(".ns-change-big .is-new").first().evaluate((el) => [getComputedStyle(el).boxShadow, getComputedStyle(el).getPropertyValue("--shadow-gold").trim()]);
    report.check(`${width} · solicitudes rectoría · la cifra nueva conserva la repisa dorada de amendments.css`, /201, 163, 94/.test(ledge[0]), `box-shadow ${ledge[0]}`);
  } else report.check(`${width} · solicitudes rectoría · el bloque del cambio de nota está en pantalla`, false, "no hay .ns-change-big");
  await auditGold(page, width, "solicitudes rectoría");
  await closePage(page, cons, width, "solicitudes rectoría");

  // ---- O5: papel en claro (boletín y foto del examen)
  for (const [hash, label, sel] of [["#/teacher/profile/20261175?tab=reportcards", "boletín", ".ns-paper"], ["#/dev/components", "foto del examen", ".ns-photo"]]) {
    ({ page, cons } = await open(ctx, hash));
    const loc = page.locator(sel).first();
    if (!(await loc.count())) { report.check(`${width} · ${label} · ${sel} en pantalla para medir O5`, false, "no encontrado"); await closePage(page, cons, width, label); continue; }
    const p = await loc.evaluate((el) => { const cs = getComputedStyle(el); return { navy: cs.getPropertyValue("--navy").trim(), bg: cs.backgroundColor, color: cs.color, scheme: cs.colorScheme }; });
    report.check(`${width} · ${label} · O5 papel con tokens claros (--navy ${LIGHT_TOKENS["--navy"]}, color-scheme light)`, p.navy.toLowerCase() === LIGHT_TOKENS["--navy"] && p.scheme === "light", `--navy ${p.navy}, fondo ${p.bg}, texto ${p.color}`);
    await loc.scrollIntoViewIfNeeded();
    const r = await sampleTextContrast(page, loc);
    const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    report.check(`${width} · ${label} · el fondo renderizado es claro (luminancia > 0.7)`, L(r.bg) > 0.7, `fondo ${hex(r.bg)}, texto más oscuro ${hex(r.fg)} a ${r.ratio.toFixed(2)}:1`);
    if (width === 1440) await loc.screenshot({ path: join(OUT, `oscuro-papel-${sel.slice(4)}-${width}.png`), animations: "disabled" });
    await closePage(page, cons, width, label);
  }

  // ---- O5: impresión con el tema oscuro puesto
  ({ page, cons } = await open(ctx, "#/teacher/dashboard"));
  await page.emulateMedia({ media: "print" });
  const ink = await page.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue("--navy").trim(), getComputedStyle(document.documentElement).colorScheme]);
  report.check(`${width} · impresión con data-theme="dark" vuelve a --navy #1b2a4a`, ink[0].toLowerCase() === "#1b2a4a", `--navy ${ink[0]}, color-scheme ${ink[1]}`);
  await closePage(page, cons, width, "impresión");
  await ctx.close();
}

/** Sin data-theme y con data-theme="light" la app pinta igual. */
async function lightParity(browser) {
  const ref = await (await browser.newContext()).newPage();
  for (const hash of ["#/login", "#/teacher/dashboard", "#/teacher/review", "#/principal/dashboard", "#/admin/dashboard"]) {
    const shots = [];
    for (const theme of [null, "light"]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      if (theme) await ctx.addInitScript(themeInit, theme);
      const { page, cons } = await open(ctx, hash, { titlebar: false });
      const vars = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return [cs.getPropertyValue("--navy").trim(), cs.getPropertyValue("--ivory").trim(), cs.colorScheme]; });
      report.check(`claro · ${hash} · ${theme ? 'data-theme="light"' : "sin data-theme"} resuelve los tokens claros`, vars[0] === "#1b2a4a" && vars[1] === "#f7f3ec", vars.join(" "));
      shots.push(await page.screenshot({ animations: "disabled" }));
      await closePage(page, cons, 1440, `claro ${hash}`);
      await ctx.close();
    }
    const diff = await pixelDiff(ref, shots[0], shots[1]);
    // Tolerancia de 0.01 % (unos 130 píxeles de 1 296 000): dos cargas seguidas de la misma ruta en claro ya difieren en
    // unos pocos píxeles de suavizado o de un número animado. Por encima de eso es un cambio de tema.
    const px = Math.round((diff.pct / 100) * 1440 * 900);
    report.check(`claro · ${hash} · sin atributo y con "light" pintan igual (≤ 0.01 %)`, diff.pct <= 0.01, `${px} píxeles distintos (${diff.pct.toFixed(4)} %)`);
  }
}

const { browser, close } = await startPreview();
try {
  await lightParity(browser);
  for (const w of [1024, 1440]) await screens(browser, w);
} finally {
  await close();
}

// O4 agregado
const key = (g) => `${g.width}|${g.screen}|${g.cls}|${g.text}`;
const goldUnique = [...new Map(goldAudit.map((g) => [key(g), g])).values()];
const goldBad = goldUnique.filter((g) => g.ratio < AA);
report.check(`O4 · ${goldUnique.length} textos sobre relleno dorado con tinta oscura ≥ 4.5:1`, goldUnique.length > 0 && goldBad.length === 0,
  goldBad.map((g) => `${g.width} ${g.screen} .${g.cls} «${g.text}» ${hex(g.fg)} sobre ${hex(g.bg)} ${g.ratio.toFixed(2)}:1`).join("; "));
// Consola
const noisy = consoleLog.filter((c) => c.msgs.length);
report.check(`Consola sin errores ni avisos en ${consoleLog.length} cargas`, noisy.length === 0, noisy.map((c) => `${c.width} ${c.screen}: ${c.msgs.slice(0, 2).join(" | ")}`).join("; "));

const failed = report.print();
const table = ["| Ancho | Pantalla | Medición | Mínimo | Resultado | Muestra |", "|---|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.width} | ${r.screen} | ${r.what} | ${r.min} | ${r.ratio == null ? "sin medir" : r.ratio.toFixed(2)}${r.ok ? "" : " FALLA"} | ${r.note} |`)];
const goldTable = ["| Ancho | Pantalla | Elemento | Texto | Tinta sobre dorado | Contraste |", "|---|---|---|---|---|---|",
  ...goldUnique.map((g) => `| ${g.width} | ${g.screen} | .${g.cls} | ${g.text} | ${hex(g.fg)} sobre ${hex(g.bg)} | ${g.ratio.toFixed(2)}${g.ratio < AA ? " FALLA" : ""} |`)];
writeFileSync(join(OUT, "oscuro-mediciones.md"), [`# verify:dark · paso 1 · ${new Date().toISOString().slice(0, 10)}`, "", `${failed} fallos.`, "", "## Contraste", "", ...table, "", "## O4 · textos sobre relleno dorado", "", ...goldTable, ""].join("\n"));
process.exit(failed ? 1 : 0);
