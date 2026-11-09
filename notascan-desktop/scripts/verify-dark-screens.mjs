// Modo oscuro · paso 4 (anexo 2026-11-08-modo-oscuro, sección 15): todas las pantallas en oscuro.
//
//   npm run build:demo && npm run verify:dark-screens
//
// Recorre todas las rutas de Docente, Secretaría, Rectoría y Plataforma, y los diálogos principales, con el tema oscuro
// guardado como lo haría la persona (notascan.theme en localStorage), a 1024 y 1440 px. En cada carga mide sobre los
// estilos calculados de lo que se pinta:
//   - todo el texto visible contra su fondo real (capas semitransparentes compuestas): AA, 3:1 en texto grande
//   - cifras de decisión a 7:1 (O6)
//   - O4: texto sobre relleno dorado con tinta oscura
//   - bordes de 2 px a 3:1 contra lo que tienen detrás
//   - superficies claras sueltas (luminancia > 0.5) fuera del papel (O5)
//   - foco visible en las primeras paradas de Tab (a 1440)
//   - gráficas: cada serie a 3:1 contra el fondo y separación entre series, comparada con el claro
//   - consola limpia
// Capturas del tamaño de la ventana en verify-out/p4/. Informe en verify-out/oscuro-p4-mediciones.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview, watchConsole, contrast } from "./harness.mjs";

const SHOTS = join(OUT, "p4");
mkdirSync(SHOTS, { recursive: true });
const report = createReport();

const ROUTES = [
  ...["dashboard", "grades", "review", "evaluations", "gradebook", "concepts", "recoveries", "attendance", "behavior", "students", "reports",
    "profile/20261175?tab=profile", "profile/20261175?tab=grades", "profile/20261175?tab=attendance", "profile/20261175?tab=observer", "profile/20261175?tab=reportcards"].map((p) => "#/teacher/" + p),
  ...["dashboard", "students", "enrollment", "users", "structure", "curriculum", "periods", "reportcards", "clearances", "ranking", "profile/20261175?tab=info"].map((p) => "#/admin/" + p),
  ...["dashboard", "analytics", "teachers", "requests", "students", "observer", "reports", "profile/20261175?tab=info"].map((p) => "#/principal/" + p),
  "#/platform/dashboard", "#/platform/school/demo-sf",
  "#/login", "#/dev/components",
];
// Diálogos principales: cómo se abren desde su ruta.
const DIALOGS = [
  { name: "preferencias", hash: "#/teacher/dashboard", open: async (p) => { await p.locator(".ns-pref-row").click(); await p.locator(".ns-drawer").waitFor(); } },
  { name: "busqueda-ctrl-k", hash: "#/teacher/dashboard", open: async (p) => { await p.keyboard.press("Control+k"); await p.keyboard.type("Mar"); await p.waitForTimeout(300); } },
  { name: "confirmar-guardado", hash: "#/teacher/review", open: async (p) => { await p.locator(".ns-header button").last().click(); await p.locator("[role=dialog], [role=alertdialog]").first().waitFor(); } },
  { name: "alta-colegio", hash: "#/platform/dashboard", open: async (p) => { await p.getByRole("button", { name: "Dar de alta un colegio" }).click(); await p.locator(".ns-drawer").waitFor(); } },
  { name: "nuevo-estudiante", hash: "#/admin/students", open: async (p) => { await p.locator(".ns-header .ns-btn--primary").first().click(); await p.waitForTimeout(400); } },
];
// Cifras de decisión (O6).
// Incluye las notas de la Planilla (.ns-gcell y el promedio .ns-gb-avg), que el docente lee para decidir.
const DECISION = ".ns-card-grade, .ns-bento-value, .ns-kpi strong, .ns-change-big strong, .ns-donut-value, .ns-gcell, .ns-gb-avg, .ns-grade-big";

const slug = (h) => h.replace(/^#\//, "").replace(/[/?=]+/g, "-").replace(/-+$/, "");

/** Auditoría dentro de la página: devuelve hallazgos crudos. */
function audit(decisionSel) {
  const parse = (s) => { const m = (s || "").match(/[\d.]+/g); if (!m) return null; const v = m.map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
  const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, base) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + base[i] * (1 - a)).concat(1); };
  const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor);
  const canvas = rootBg && rootBg[3] > 0 ? rootBg : (document.documentElement.getAttribute("data-theme") === "dark" ? [22, 21, 19, 1] : [255, 255, 255, 1]);
  /** Fondo real detrás de `el` (incluido): compone capas semitransparentes. null si hay degradado o imagen en medio. */
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== "none" && !n.matches("html, body, .ns-canvas, .ns-select-input")) return null;
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; }
    }
    let base = layers.length && layers[layers.length - 1][3] >= 0.99 ? layers.pop() : canvas;
    while (layers.length) base = over(layers.pop(), base);
    return base;
  };
  const visible = (el) => {
    if (!el.checkVisibility || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const translucent = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (parseFloat(getComputedStyle(n).opacity) < 0.99) return true; return false; };
  const desc = (el) => {
    const c = el.getAttribute("class");
    return (el.tagName.toLowerCase() + (c ? "." + String(c).trim().split(/\s+/).slice(0, 2).join(".") : ""));
  };
  const inPaper = (el) => !!el.closest(".ns-paper, .ns-photo");

  // ---- texto
  const texts = [], unmeasured = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || el.closest("script, style, .ns-sr, [hidden]") || !visible(el)) continue;
    seen.add(el);
    if (el.closest(":disabled, [aria-disabled='true']")) continue;
    const cs = getComputedStyle(el);
    const isSvg = el instanceof SVGElement;
    const fgRaw = parse(isSvg ? cs.fill : cs.color);
    if (!fgRaw) continue;
    const bg = bgOf(isSvg ? el.closest("svg").parentElement : el);
    const txt = t.textContent.trim().slice(0, 30);
    if (!bg) { unmeasured.push({ el: desc(el), txt }); continue; }
    const fg = fgRaw[3] < 1 ? over(fgRaw, bg) : fgRaw;
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    texts.push({ el: desc(el), txt, r: ratio(fg, bg), min: large ? 3 : 4.5, fg, bg, paper: inPaper(el), dim: translucent(el) });
  }
  // ---- cifras de decisión
  const decision = [...document.querySelectorAll(decisionSel)].filter((e) => visible(e) && /\d/.test(e.textContent)).map((e) => {
    const cs = getComputedStyle(e); const bg = bgOf(e); const fg = parse(e instanceof SVGElement ? cs.fill : cs.color);
    return bg ? { el: desc(e), txt: e.textContent.trim().slice(0, 12), r: ratio(fg[3] < 1 ? over(fg, bg) : fg, bg) } : null;
  }).filter(Boolean);
  // ---- O4: relleno dorado
  const probe = document.createElement("i"); probe.style.color = "var(--gold)"; document.body.appendChild(probe);
  const gold = parse(getComputedStyle(probe).color); probe.remove();
  const golds = texts.filter((t) => !t.paper && t.bg.slice(0, 3).every((v, i) => Math.abs(v - gold[i]) <= 2)).map((t) => ({ ...t, dark: L(t.fg) < L(t.bg) }));
  // ---- bordes de 2 px, superficies claras
  const borders = [], bright = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el instanceof SVGElement || !visible(el) || inPaper(el)) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const own = parse(cs.backgroundColor);
    // Una línea de 4 px o menos (separador fuerte, barra de progreso) es tinta, no superficie.
    if (own && own[3] >= 0.99 && L(own) > 0.5 && Math.min(r.width, r.height) > 4) bright.push({ el: desc(el), area: Math.round(r.width * r.height), bg: own, txt: (el.textContent || "").trim().slice(0, 24) });
    const w = parseFloat(cs.borderTopWidth);
    if (w >= 2 && cs.borderTopStyle !== "none") {
      const bc = parse(cs.borderTopColor);
      if (!bc || bc[3] < 0.5) continue;
      const behind = bgOf(el.parentElement);
      if (!behind) continue;
      const ownBg = own && own[3] >= 0.99 ? own : null;
      const rb = ratio(over(bc, behind), behind);
      const rFill = ownBg ? ratio(ownBg, behind) : 0;
      borders.push({ el: desc(el), r: rb, fill: rFill, ok: rb >= 3 || rFill >= 3 });
    }
  }
  // ---- gráficas
  const charts = [...document.querySelectorAll(".ns-chart")].filter(visible).map((fig) => {
    const bg = bgOf(fig);
    const series = [];
    const add = (name, sel, prop) => { const e = fig.querySelector(sel); if (e) { const c = parse(getComputedStyle(e)[prop]); if (c) series.push({ name, c }); } };
    add("barra", ".ns-bar:not(.ns-bar--low)", "fill");
    add("barra baja", ".ns-bar--low", "fill");
    fig.querySelectorAll(".ns-line-g").forEach((g, i) => { const e = g.querySelector(".ns-line"); if (e) series.push({ name: "línea " + (g.getAttribute("class").match(/--(\w+)/) || [, i])[1], c: parse(getComputedStyle(e).stroke) }); });
    fig.querySelectorAll(".ns-donut-seg").forEach((e) => series.push({ name: "anillo " + (e.getAttribute("class").match(/--(\w+)/) || [, "?"])[1], c: parse(getComputedStyle(e).stroke) }));
    add("meta", ".ns-target-line", "stroke");
    const title = fig.querySelector(".ns-chart-head strong")?.textContent.trim() || "?";
    const vsBg = series.map((s) => ({ name: s.name, r: ratio(s.c, bg) }));
    const pairs = [];
    for (let i = 0; i < series.length; i++) for (let j = i + 1; j < series.length; j++) if (series[i].name !== "meta" && series[j].name !== "meta") pairs.push({ a: series[i].name, b: series[j].name, r: ratio(series[i].c, series[j].c), dashed: !!fig.querySelector(".ns-line.is-dashed") });
    return { title, vsBg, pairs };
  });
  return { texts, unmeasured, decision, golds, borders, bright, charts };
}

const consoleLog = [];
const results = []; // por carga
async function load(browser, hash, width, theme = "dark", dialog = null) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript((t) => { try { localStorage.setItem("notascan.theme", t); } catch {} }, theme);
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  if (dialog) { await dialog.open(page); await page.waitForTimeout(500); }
  return { ctx, page, cons };
}

const { browser, close } = await startPreview();
const chartLight = new Map();
try {
  // Gráficas en claro, para comparar la separación entre series.
  for (const hash of ROUTES) {
    if (process.env.NS_ONLY && !new RegExp(process.env.NS_ONLY).test(slug(hash))) continue;
    const { ctx, page } = await load(browser, hash, 1440, "light");
    if (await page.locator(".ns-chart").count()) {
      const a = await page.evaluate(audit, DECISION);
      for (const c of a.charts) chartLight.set(hash + "|" + c.title, c);
    }
    await ctx.close();
  }
  // NS_ONLY=<regex> limita el recorrido a las cargas cuyo nombre coincide (para repetir una sola pantalla).
  const only = process.env.NS_ONLY ? new RegExp(process.env.NS_ONLY) : null;
  const targets = [...ROUTES.map((h) => ({ hash: h, label: slug(h), dialog: null })), ...DIALOGS.map((d) => ({ hash: d.hash, label: "dialogo-" + d.name, dialog: d }))].filter((t) => !only || only.test(t.label));
  for (const width of [1024, 1440]) for (const t of targets) {
    let ctx, page, cons;
    try { ({ ctx, page, cons } = await load(browser, t.hash, width, "dark", t.dialog)); }
    catch (e) { report.check(`${width} · ${t.label}: se abre`, false, String(e).split("\n")[0]); continue; }
    const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    if (theme !== "dark") report.check(`${width} · ${t.label}: tema oscuro puesto`, false, String(theme));
    await page.screenshot({ path: join(SHOTS, `oscuro-${t.label}-${width}.png`), animations: "disabled" });
    const a = await page.evaluate(audit, DECISION);
    // Foco en las primeras paradas de Tab, solo a 1440 y en rutas sin diálogo.
    let focus = [];
    if (width === 1440 && !t.dialog) {
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        // Las transiciones de 1 ms del movimiento reducido terminan en el siguiente cuadro: sin esta espera se medía el
        // contorno a medio camino (el de los roles del login salía navy sobre navy).
        await page.waitForTimeout(60);
        const f = await page.evaluate(() => {
          const el = document.activeElement; if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
          let n = el.parentElement, bg = null;
          while (n && !bg) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) bg = c.slice(0, 3); n = n.parentElement; }
          const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 28);
          // Campos de texto que marcan el foco en su envoltorio (:focus-within con borde dorado, como el login): cuenta
          // si ese borde tiene 2 px y 3:1 contra lo que tiene detrás.
          let wrapRing = false;
          const wrap = el.parentElement;
          // También el contorno del envoltorio (los roles del login dibujan el foco con outline en .ns-auth-role).
          if (wrap && wrap.matches(":focus-within")) {
            const ws = getComputedStyle(wrap);
            const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
            const cr = (x, y) => { const a = L(x), b = L(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
            let m = wrap.parentElement, behind = null;
            while (m && !behind) { const c = parse(getComputedStyle(m).backgroundColor); if (c.length === 3 || c[3] > 0.9) behind = c.slice(0, 3); m = m.parentElement; }
            if (behind) {
              const byBorder = parseFloat(ws.borderTopWidth) >= 2 && cr(parse(ws.borderTopColor).slice(0, 3), behind) >= 3;
              const byOutline = ws.outlineStyle !== "none" && parseFloat(ws.outlineWidth) >= 2 && cr(parse(ws.outlineColor).slice(0, 3), behind) >= 3;
              wrapRing = byBorder || byOutline;
            }
          }
          return { name, outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2, color: parse(cs.outlineColor).slice(0, 3), bg: bg || [22, 21, 19], ring: /inset/.test(cs.boxShadow) || wrapRing };
        });
        if (f) focus.push({ ...f, r: f.outline ? contrast(f.color, f.bg) : 0 });
      }
    }
    results.push({ width, label: t.label, hash: t.hash, a, focus, cons: [...cons] });
    consoleLog.push({ label: `${width} ${t.label}`, cons: [...cons] });
    await ctx.close();
  }
} finally {
  await close();
}

// ---------------------------------------------------------------- evaluación
const fmt = (x) => x.toFixed(2);
const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const lines = [`# verify:dark-screens · paso 4 · ${new Date().toISOString().slice(0, 10)}`, ""];
let textCount = 0, textFails = [], unmeasuredAll = [], decisionAll = [], goldAll = [], borderFails = [], borderCount = 0, brightAll = [], focusAll = [];
for (const r of results) {
  textCount += r.a.texts.length;
  for (const t of r.a.texts) if (t.r < t.min && !t.dim) textFails.push({ ...t, where: `${r.width} ${r.label}` });
  unmeasuredAll.push(...r.a.unmeasured.map((u) => ({ ...u, where: `${r.width} ${r.label}` })));
  decisionAll.push(...r.a.decision.map((d) => ({ ...d, where: `${r.width} ${r.label}` })));
  goldAll.push(...r.a.golds.map((g) => ({ ...g, where: `${r.width} ${r.label}` })));
  borderCount += r.a.borders.length;
  borderFails.push(...r.a.borders.filter((b) => !b.ok).map((b) => ({ ...b, where: `${r.width} ${r.label}` })));
  brightAll.push(...r.a.bright.map((b) => ({ ...b, where: `${r.width} ${r.label}` })));
  focusAll.push(...r.focus.map((f) => ({ ...f, where: r.label })));
}
const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];

const tf = uniq(textFails, (t) => t.el + "|" + t.txt + "|" + t.where.split(" ")[1]);
report.check(`Texto · ${textCount} textos medidos en ${results.length} cargas, todos con AA (3:1 en texto grande)`, tf.length === 0,
  tf.slice(0, 25).map((t) => `${t.where} ${t.el} «${t.txt}» ${fmt(t.r)}:1 (${hex(t.fg)} sobre ${hex(t.bg)})`).join("; "));
const dimText = uniq(results.flatMap((r) => r.a.texts.filter((t) => t.dim && t.r < t.min).map((t) => ({ ...t, where: r.label }))), (t) => t.el + t.txt);
const dFail = decisionAll.filter((d) => d.r < 7);
const dMin = decisionAll.length ? Math.min(...decisionAll.map((d) => d.r)) : null;
report.check(`O6 · ${decisionAll.length} cifras de decisión a 7:1 o más (la más baja ${dMin == null ? "n/a" : fmt(dMin)})`, decisionAll.length > 0 && dFail.length === 0,
  uniq(dFail, (d) => d.el + d.txt).map((d) => `${d.where} ${d.el} «${d.txt}» ${fmt(d.r)}:1`).join("; "));
const gBad = goldAll.filter((g) => g.r < 4.5 || !g.dark);
report.check(`O4 · ${uniq(goldAll, (g) => g.el + g.txt).length} textos sobre dorado con tinta oscura ≥ 4.5:1`, gBad.length === 0,
  uniq(gBad, (g) => g.el + g.txt).map((g) => `${g.where} ${g.el} «${g.txt}» ${fmt(g.r)}:1`).join("; "));
const bf = uniq(borderFails, (b) => b.el + "|" + b.where.split(" ")[1]);
report.check(`Bordes · ${borderCount} bordes de 2 px a 3:1 contra lo que tienen detrás (o el relleno a 3:1)`, bf.length === 0,
  bf.slice(0, 25).map((b) => `${b.where} ${b.el} ${fmt(b.r)}:1`).join("; "));
// Superficies claras sueltas: más de 1500 px² (más que un chip) fuera del papel.
const big = uniq(brightAll.filter((b) => b.area >= 1500), (b) => b.el + "|" + b.where.split(" ")[1]);
const small = uniq(brightAll.filter((b) => b.area < 1500), (b) => b.el);
report.check(`Sin superficies claras sueltas fuera del papel (O5), mayores de 1500 px²`, big.length === 0,
  big.slice(0, 25).map((b) => `${b.where} ${b.el} ${b.area}px² ${hex(b.bg)} «${b.txt}»`).join("; "));
const fBad = uniq(focusAll.filter((f) => !(f.outline && f.r >= 3) && !f.ring), (f) => f.where + f.name);
report.check(`Foco · ${focusAll.length} paradas de Tab con contorno de 2 px a 3:1 (o anillo interior)`, focusAll.length > 0 && fBad.length === 0,
  fBad.slice(0, 20).map((f) => `${f.where} «${f.name}» ${f.outline ? fmt(f.r) + ":1" : "sin contorno"} (${hex(f.color)} sobre ${hex(f.bg)})`).join("; "));
// Gráficas
const chartRows = [];
for (const r of results.filter((x) => x.width === 1440)) for (const c of r.a.charts) {
  const light = chartLight.get(r.hash + "|" + c.title);
  for (const s of c.vsBg) {
    if (s.name === "meta") { chartRows.push({ where: r.label, title: c.title, what: `${s.name} contra el fondo`, r: s.r, light: light?.vsBg.find((x) => x.name === s.name)?.r, min: 3 }); continue; }
    chartRows.push({ where: r.label, title: c.title, what: `${s.name} contra el fondo`, r: s.r, light: light?.vsBg.find((x) => x.name === s.name)?.r, min: 3 });
  }
  for (const p of c.pairs) chartRows.push({ where: r.label, title: c.title, what: `${p.a} contra ${p.b}`, r: p.r, light: light?.pairs.find((x) => x.a === p.a && x.b === p.b)?.r, min: null, pair: true });
}
const seriesBad = chartRows.filter((c) => !c.pair && c.r < 3);
report.check(`Gráficas · ${chartRows.filter((c) => !c.pair).length} series a 3:1 contra el fondo`, chartRows.length > 0 && seriesBad.length === 0,
  uniq(seriesBad, (c) => c.title + c.what).map((c) => `${c.where} «${c.title}» ${c.what} ${fmt(c.r)}:1`).join("; "));
const axis = uniq(results.flatMap((r) => r.a.texts.filter((t) => /^text\.ns-axis|^text\.ns-bar-val|^text\.ns-line-label|^text\.ns-donut/.test(t.el)).map((t) => ({ ...t, where: r.label }))), (t) => t.el);
const axisMin = axis.length ? Math.min(...results.flatMap((r) => r.a.texts.filter((t) => /^text\./.test(t.el)).map((t) => t.r))) : null;
report.check(`Gráficas · ejes y rótulos legibles (AA), el más bajo ${axisMin == null ? "n/a" : fmt(axisMin)}:1`, axisMin != null && axisMin >= 4.5);
const pairWorse = uniq(chartRows.filter((c) => c.pair && c.light != null && c.r < Math.min(c.light, 3) - 0.01), (c) => c.title + c.what);
report.check(`Gráficas · separación entre series al menos como en claro (o 3:1)`, pairWorse.length === 0,
  pairWorse.map((c) => `«${c.title}» ${c.what}: oscuro ${fmt(c.r)}:1, claro ${fmt(c.light)}:1`).join("; "));
const noisy = consoleLog.filter((c) => c.cons.length);
report.check(`Consola sin errores ni avisos en ${consoleLog.length} cargas`, noisy.length === 0, noisy.slice(0, 6).map((c) => `${c.label}: ${c.cons.slice(0, 2).join(" | ")}`).join("; "));

const failed = report.print();
lines.push(`${failed} fallos. ${results.length} cargas (${ROUTES.length} rutas y ${DIALOGS.length} diálogos, a 1024 y 1440).`, "",
  `Texto medido: ${textCount}. Sin medir por degradado o imagen detrás: ${uniq(unmeasuredAll, (u) => u.el + u.txt).length} (${uniq(unmeasuredAll, (u) => u.el).map((u) => u.el).slice(0, 12).join(", ")}).`,
  `Texto bajo el mínimo dentro de un elemento translúcido (animación o estado atenuado, no cuenta): ${dimText.length}.`, "",
  "## Fallos de texto", "", "| Carga | Elemento | Texto | Contraste | Colores |", "|---|---|---|---|---|",
  ...tf.map((t) => `| ${t.where} | ${t.el} | ${t.txt} | ${fmt(t.r)} | ${hex(t.fg)} sobre ${hex(t.bg)} |`), "",
  "## Cifras de decisión (O6)", "", "| Carga | Elemento | Cifra | Contraste |", "|---|---|---|---|",
  ...uniq(decisionAll, (d) => d.el + d.txt + d.where.split(" ")[1]).map((d) => `| ${d.where} | ${d.el} | ${d.txt} | ${fmt(d.r)} |`), "",
  "## Bordes que fallan", "", ...bf.map((b) => `- ${b.where} ${b.el} ${fmt(b.r)}:1`), "",
  "## Superficies claras", "", ...big.map((b) => `- ${b.where} ${b.el} ${b.area} px² ${hex(b.bg)} «${b.txt}»`), "", "Pequeñas (menos de 1500 px²):", ...small.map((b) => `- ${b.el} ${b.area} px² ${hex(b.bg)} (${b.where})`), "",
  "## Gráficas (1440)", "", "| Pantalla | Gráfica | Medición | Oscuro | Claro |", "|---|---|---|---|---|",
  ...uniq(chartRows, (c) => c.where + c.title + c.what).map((c) => `| ${c.where} | ${c.title} | ${c.what} | ${fmt(c.r)} | ${c.light == null ? "n/a" : fmt(c.light)} |`), "",
  "## Foco que falla", "", ...fBad.map((f) => `- ${f.where} «${f.name}» ${f.outline ? fmt(f.r) + ":1" : "sin contorno"}`), "");
writeFileSync(join(OUT, "oscuro-p4-mediciones.md"), lines.join("\n"));
process.exit(failed ? 1 : 0);
