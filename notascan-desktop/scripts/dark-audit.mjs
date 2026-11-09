// Auditoría de contraste y superficies que corre dentro de la página (modo oscuro, pasos 4 y 5).
// La usan scripts/verify-dark-screens.mjs y scripts/verify-dark-states.mjs con page.evaluate(audit, selectorDeCifras).
/** Auditoría dentro de la página: devuelve hallazgos crudos. */
export function audit(decisionSel) {
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
