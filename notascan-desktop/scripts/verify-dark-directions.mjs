// Modo oscuro · fase de direcciones (2026-11-08). NO es la implementación: genera tres hojas de prueba,
// las inyecta sobre el build de demostración sin tocar src/, captura y mide el contraste sobre el render.
//
//   npm run build:demo && node scripts/verify-dark-directions.mjs
//
// Por cada dirección:
//   1. Tokens oscuros con los mismos nombres de tokens.css, bajo :root[data-theme="dark"] y dentro de @media screen
//      (impresión siempre en claro).
//   2. Parches generados leyendo notascan.css, porque el sistema usa --navy para cuatro trabajos a la vez (tinta,
//      borde, sombra dura y campo de los bloques invertidos) y tiene ~100 colores literales:
//        - CAMPOS: reglas con `background: var(--navy)` que además fijan color → se re-declaran los tokens dentro.
//        - REPISAS: reglas con `box-shadow: … var(--navy)` → la sombra pasa al token de repisa de la dirección.
//        - LITERALES: fondos claros escritos a mano (filas al pasar el ratón, avisos, diálogo…) → tokens.
//        - PAPEL: el boletín y la foto del examen siguen en claro (son documentos, no interfaz).
//   3. Capturas a 1440 px en docs/ux/capturas/2026-11-08-oscuro-<direccion>-<pantalla>.png
//   4. Mediciones: texto, --muted, cifra de nota (AAA), botones, enlaces, foco, confianza, bordes, barra de título,
//      deslumbramiento (% de píxeles claros) y que la impresión siga en claro.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, URL_BASE, startPreview, watchConsole, sampleTextContrast, contrast } from "./harness.mjs";

const SHOTS = join(ROOT, "docs/ux/capturas");
const SHEETS = join(ROOT, "docs/ux/maquetas");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(SHEETS, { recursive: true });
const DATE = "2026-11-08";

// ---------------------------------------------------------------- direcciones
const LIGHT_ISLAND = `--navy: #1b2a4a; --navy-soft: #33425f; --gold: #b8924b; --gold-ink: #7a5f2c; --gold-soft: #f3e8d2; --ivory: #f7f3ec;
  --ivory-deep: #efe8dc; --paper: #fffdf8; --charcoal: #2b2b2b; --muted: #5b5a56; --hairline: rgba(27, 42, 74, 0.16); --sage: #6b8f71;
  --sage-ink: #3f6346; --sage-soft: #e1eadf; --burgundy: #7a2e2e; --burgundy-soft: #f3e1dd; --focus: #1b2a4a; color-scheme: light;`;

const DIRS = {
  pizarra: {
    name: "A · Pizarra",
    tokens: {
      "--navy": "#ece4d4", "--navy-soft": "#b9c0cf", "--gold": "#c9a35e", "--gold-ink": "#dcbf86", "--gold-soft": "#33301f",
      "--ivory": "#0f1729", "--ivory-deep": "#1c2843", "--paper": "#152039", "--charcoal": "#d9d2c5", "--muted": "#a9afbd",
      "--hairline": "rgba(236, 228, 212, 0.18)", "--sage": "#83a889", "--sage-ink": "#aed0b2", "--sage-soft": "#1b2e2c",
      "--burgundy": "#e38a80", "--burgundy-soft": "#3a2128", "--glass": "rgba(21, 32, 57, 0.72)", "--glass-edge": "rgba(236, 228, 212, 0.12)",
      "--scrim": "rgba(5, 8, 16, 0.62)", "--focus": "#dcbf86",
      // La sombra dura sigue siendo del color de la tinta, como en claro (navy borde + navy sombra → marfil + marfil).
      "--shadow-sm": "2px 2px 0 #ece4d4", "--shadow-md": "4px 4px 0 #ece4d4", "--shadow-lg": "6px 6px 0 #ece4d4",
      "--shadow-gold": "3px 3px 0 #c9a35e", "--shadow-pressed": "0 0 0 #ece4d4", "--shadow-glass": "0 10px 30px rgba(0, 0, 0, 0.35)",
    },
    onGold: "#0f1729",
    ledge: null, // sin parche: la repisa ya es var(--navy) = tinta marfil
    // Los bloques invertidos se vuelven hojas marfil con el sistema claro dentro.
    // Dentro de la hoja: --ivory (el texto que en claro va sobre navy) pasa a navy, y el contorno de foco, que se dibuja
    // fuera de la hoja, conserva el del tema oscuro.
    field: { bg: "#ece4d4", scope: LIGHT_ISLAND.replace("--ivory: #f7f3ec;", "--ivory: #1b2a4a;").replace("--focus: #1b2a4a; ", "").replace("--muted: #5b5a56;", "--muted: #4f4e4a;"), ink: "#1b2a4a" },
    lowLiteral: "#5b5a56", // los textos #d9cfbd que iban sobre navy ahora van sobre marfil
    extra: [
      [".ns-auth-input", "background: rgba(27, 42, 74, 0.05); border-color: rgba(27, 42, 74, 0.34);"],
      [".ns-auth-input:hover", "background: rgba(27, 42, 74, 0.08);"],
      [".ns-auth-input input::placeholder, .ns-auth-or", "color: #5b5a56;"],
      [".ns-auth-or::before, .ns-auth-or::after", "background: rgba(27, 42, 74, 0.22);"],
      [".ns-auth-sso", "border-color: rgba(27, 42, 74, 0.34);"],
      [".ns-auth-row a, .ns-auth-foot a", "color: #7a5f2c;"],
      [".ns-auth button:focus-visible, .ns-auth a:focus-visible", "outline-color: #1b2a4a;"],
    ],
  },
  "campo-marino": {
    name: "B · Campo marino",
    tokens: {
      "--navy": "#ece4d4", "--navy-soft": "#bdb5a6", "--gold": "#c9a35e", "--gold-ink": "#dcbf86", "--gold-soft": "#342c1e",
      "--ivory": "#161513", "--ivory-deep": "#2a2824", "--paper": "#1f1e1b", "--charcoal": "#d6cfc2", "--muted": "#a8a194",
      "--hairline": "rgba(236, 228, 212, 0.16)", "--sage": "#83a889", "--sage-ink": "#aed0b2", "--sage-soft": "#1e2a21",
      "--burgundy": "#e38a80", "--burgundy-soft": "#36211e", "--glass": "rgba(31, 30, 27, 0.78)", "--glass-edge": "rgba(236, 228, 212, 0.10)",
      "--scrim": "rgba(8, 8, 7, 0.62)", "--focus": "#dcbf86",
      // Repisa: el navy de marca levantado, para que la sombra dura siga siendo azul y se lea sobre el carbón.
      "--shadow-sm": "2px 2px 0 #34497a", "--shadow-md": "4px 4px 0 #34497a", "--shadow-lg": "6px 6px 0 #34497a",
      "--shadow-gold": "3px 3px 0 #c9a35e", "--shadow-pressed": "0 0 0 #34497a", "--shadow-glass": "0 10px 30px rgba(0, 0, 0, 0.4)",
    },
    onGold: "#161513",
    ledge: "#34497a",
    // Los bloques invertidos conservan el navy de marca como campo, con marfil encima.
    field: { bg: null, scope: "--navy: #22345c; --ivory: #f1eadc; --muted: #c9c1b2; --hairline: rgba(241, 234, 220, 0.22);", ink: null },
    lowLiteral: null,
    extra: [],
  },
  lampara: {
    name: "C · Lámpara baja",
    tokens: {
      "--navy": "#ddd3c1", "--navy-soft": "#b3aa9a", "--gold": "#b8924b", "--gold-ink": "#d3b176", "--gold-soft": "#30281a",
      "--ivory": "#1a1713", "--ivory-deep": "#2d2923", "--paper": "#221f1a", "--charcoal": "#cfc6b6", "--muted": "#a0978a",
      "--hairline": "rgba(221, 211, 193, 0.14)", "--sage": "#7a9e80", "--sage-ink": "#a3c2a8", "--sage-soft": "#20271f",
      "--burgundy": "#d4827a", "--burgundy-soft": "#311e1b", "--glass": "rgba(34, 31, 26, 0.8)", "--glass-edge": "rgba(221, 211, 193, 0.08)",
      "--scrim": "rgba(10, 9, 7, 0.66)", "--focus": "#d3b176",
      // Sin sombras neutras: la elevación la da el escalón de superficie. Solo quedan las repisas de estado (burdeos, dorado, salvia).
      "--shadow-sm": "0 0 0 transparent", "--shadow-md": "0 0 0 transparent", "--shadow-lg": "0 0 0 transparent",
      "--shadow-gold": "3px 3px 0 #b8924b", "--shadow-pressed": "0 0 0 transparent", "--shadow-glass": "none",
    },
    onGold: "#1a1713",
    ledge: "transparent",
    field: { bg: null, scope: "--navy: #232c3e; --ivory: #e6dccb; --muted: #b9b09f; --hairline: rgba(230, 220, 203, 0.2);", ink: null },
    lowLiteral: null,
    extra: [],
  },
};

// ---------------------------------------------------------------- lectura de notascan.css
/** Reglas de estilo con su selector y declaraciones; ignora @keyframes y anota si van dentro de @media. */
function parseRules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const walk = (src, media) => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open < 0) break;
      const head = src.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
      const body = src.slice(open + 1, j - 1);
      if (head.startsWith("@media")) walk(body, head);
      else if (!head.startsWith("@")) rules.push({ sel: head, body, media });
      i = j;
    }
  };
  walk(css, null);
  return rules;
}
const NS_CSS = readFileSync(join(ROOT, "src/styles/notascan.css"), "utf8");
const RULES = parseRules(NS_CSS);
const scoped = (sel) => sel.split(",").map((s) => `:root[data-theme="dark"] ${s.trim()}`).join(", ");
const wrapMedia = (media, text) => (media ? `${media} {\n${text}\n}` : text);

/** Último fondo que el sistema da a cada selector exacto (notascan.css repinta varios: la cinta pasa de navy a papel). */
const LAST_BG = new Map();
for (const r of RULES) { const m = r.body.match(/background(?:-color)?:\s*([^;]+)/g); if (m && !r.media) LAST_BG.set(r.sel, m[m.length - 1]); }
const finalBgIs = (r, token) => (r.media ? true : (LAST_BG.get(r.sel) || "").includes(`var(--${token})`));
/** Contenedores invertidos: fondo var(--navy) con color propio (texto marfil o dorado sobre navy). */
const FIELD_RULES = RULES.filter((r) => /background(-color)?:\s*var\(--navy\)/.test(r.body) && /(^|;|\s)color:\s*var\(--(ivory|gold|paper)\)/.test(r.body) && finalBgIs(r, "navy"));
// Bloques cuyo color lo fijan los hijos (sin `color` en la regla del fondo).
const FIELD_EXTRA = [".ns-kpi--lead", ".ns-brand-b--navy", ".ns-m-card--navy", ".ns-auth-panel"];
/** Sombras duras escritas con var(--navy) en el propio sistema (no pasan por los tokens de sombra). */
const LEDGE_RULES = RULES.filter((r) => /box-shadow:[^;]*var\(--navy\)/.test(r.body));
/** Rellenos dorados: en claro llevan tinta navy encima; con la tinta marfil el texto sobre dorado caería a ~1.9:1. */
// Se excluyen los selectores que una regla posterior vuelve a pintar de navy (el ítem activo del menú): esos son CAMPOS.
const GOLD_RULES = RULES.filter((r) => /background(-color)?:\s*var\(--gold\)/.test(r.body) && !FIELD_RULES.some((f) => f.sel === r.sel) && finalBgIs(r, "gold"));
/** Textos claros escritos a mano para ir sobre navy. */
const LOW_LITERAL_RULES = RULES.filter((r) => /(^|;|\s)color:\s*#(d9cfbd|e4dccd|b8b3a8)/i.test(r.body));

function buildSheet(key) {
  const d = DIRS[key];
  const out = [`/* Modo oscuro · dirección ${d.name} · maqueta ${DATE}. Generada por scripts/verify-dark-directions.mjs. NO es la implementación. */`, "@media screen {"];
  out.push(`:root[data-theme="dark"] { color-scheme: dark;\n  ${Object.entries(d.tokens).map(([k, v]) => `${k}: ${v};`).join("\n  ")}\n}`);

  // CAMPOS
  const fieldSels = [...FIELD_RULES.map((r) => ({ sel: r.sel, media: r.media })), ...FIELD_EXTRA.map((s) => ({ sel: s, media: null }))];
  out.push(`/* CAMPOS (${fieldSels.length} reglas): bloques que en claro son navy con texto marfil o dorado. */`);
  for (const { sel, media } of fieldSels) {
    const decl = d.field.bg ? `${d.field.scope} background-color: ${d.field.bg};` : d.field.scope;
    out.push(wrapMedia(media, `${scoped(sel)} { ${decl} }`));
  }
  // La ola del login (svg con fill var(--navy)) acompaña al panel: campo navy en B y C; en A ya es marfil como la hoja.
  if (!d.field.bg) out.push(`:root[data-theme="dark"] .ns-auth-wave { ${d.field.scope} }`);
  // En la Pizarra el contador del menú y el Nº de tarjeta (dorado sobre navy) pasan a dorado tinta sobre marfil.
  if (d.field.bg) out.push(`:root[data-theme="dark"] .ns-nav-item[aria-current="page"] .ns-nav-item-count, :root[data-theme="dark"] .ns-nav-item[aria-current="page"] .ns-nav-item-index, :root[data-theme="dark"] .ns-card-index { color: #7a5f2c; }`);
  // Nº de la tarjeta que requiere revisión: fondo burdeos (claro en oscuro) con tinta oscura.
  out.push(`:root[data-theme="dark"] .ns-card--needs-review .ns-card-index { background-color: var(--burgundy); color: ${d.field.bg ? "#f7f3ec" : d.onGold}; --ivory: ${d.field.bg ? "#f7f3ec" : d.onGold}; }`);

  // DORADOS
  out.push(`/* DORADOS (${GOLD_RULES.length + 1} reglas): todo relleno dorado lleva tinta oscura encima, como en claro. */`);
  out.push(`:root[data-theme="dark"] .ns-btn--primary { --btn-fg: ${d.onGold}; }`);
  for (const r of GOLD_RULES) out.push(wrapMedia(r.media, `${scoped(r.sel)} { color: ${d.onGold}; }`));
  // REPISAS
  if (d.ledge) {
    out.push(`/* REPISAS (${LEDGE_RULES.length} reglas): sombras duras escritas con var(--navy) en notascan.css. */`);
    for (const r of LEDGE_RULES) {
      const shadow = r.body.match(/box-shadow:\s*([^;]+)/)[1].replace(/var\(--navy\)/g, d.ledge);
      out.push(wrapMedia(r.media, `${scoped(r.sel)} { box-shadow: ${shadow}; }`));
    }
  }
  // LITERALES bajos
  if (d.lowLiteral) {
    out.push(`/* LITERALES (${LOW_LITERAL_RULES.length} reglas): textos #d9cfbd escritos para ir sobre navy. */`);
    for (const r of LOW_LITERAL_RULES) out.push(wrapMedia(r.media, `${scoped(r.sel)} { color: ${d.lowLiteral}; }`));
  }
  // LITERALES comunes: fondos claros a mano que en oscuro dejarían el texto marfil sobre blanco.
  out.push(`/* LITERALES comunes */
:root[data-theme="dark"] .ns-table tbody tr:hover td, :root[data-theme="dark"] .ns-gb tbody tr.is-row th, :root[data-theme="dark"] .ns-gb tbody tr.is-row td { background: var(--ivory-deep); }
:root[data-theme="dark"] .ns-nav-item:hover, :root[data-theme="dark"] .ns-nav-item.is-hover { background: var(--ivory-deep); }
:root[data-theme="dark"] .ns-att-row.is-absent { background: var(--burgundy-soft); }
:root[data-theme="dark"] .ns-notif.is-unread, :root[data-theme="dark"] .ns-textarea.is-ai { background: var(--gold-soft); }
:root[data-theme="dark"] .ns-dialog { background: var(--paper); }
:root[data-theme="dark"] .ns-skel::after { background: linear-gradient(90deg, transparent, var(--hairline), transparent); }
:root[data-theme="dark"] .ns-select-input { background-image: linear-gradient(45deg, transparent 50%, var(--navy) 50%), linear-gradient(135deg, var(--navy) 50%, transparent 50%); }
:root[data-theme="dark"] .ns-canvas::before { background: radial-gradient(circle at 1px 1px, var(--hairline) 1.2px, transparent 1.6px) 0 0 / 22px 22px; }
:root[data-theme="dark"] .ns-btn--primary:hover { --btn-bg: var(--gold-ink); }
/* PAPEL: el boletín en pantalla y la foto del examen siguen en claro. */
:root[data-theme="dark"] .ns-paper, :root[data-theme="dark"] .ns-photo { ${LIGHT_ISLAND} }`);
  for (const [sel, decl] of d.extra) out.push(`${scoped(sel)} { ${decl} }`);
  out.push("}");
  return out.join("\n");
}

// ---------------------------------------------------------------- barra de título (réplica estática del marcado de TitleBar.tsx)
const TITLEBAR = `<header class="ns-titlebar" data-mock="titlebar"><span class="ns-titlebar-brand"><span class="ns-logo" style="font-size:13px"><span class="ns-logo-mark">N</span></span><span>NotaScan</span></span>
<div class="ns-titlebar-controls">
<button type="button" class="ns-titlebar-btn" aria-label="Minimizar"><svg class="ns-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
<button type="button" class="ns-titlebar-btn" aria-label="Maximizar"><svg class="ns-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1"/></svg></button>
<button type="button" class="ns-titlebar-btn ns-titlebar-btn--close" aria-label="Cerrar"><svg class="ns-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
</div></header>`;

// ---------------------------------------------------------------- medición
const AA = 4.5, AAA = 7, NONTEXT = 3;
const rows = []; // { dir, screen, what, ratio, min, ok, note }
const record = (dir, screen, what, ratio, min, note = "") => rows.push({ dir, screen, what, ratio, min, ok: ratio != null && ratio >= min, note });

async function sample(page, dir, screen, what, selector, min, nth = 0) {
  const loc = page.locator(selector).nth(nth);
  if (!(await loc.count())) { rows.push({ dir, screen, what, ratio: null, min, ok: false, note: `no encontrado: ${selector}` }); return; }
  const r = await sampleTextContrast(page, loc);
  record(dir, screen, what, +r.ratio.toFixed(2), min, `${hex(r.fg)} sobre ${hex(r.bg)}`);
}
const hex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

/** Contraste de un color calculado (borde, contorno) contra el primer fondo opaco detrás del elemento. */
async function computedPair(page, selector, prop, nth = 0, fromParent = false) {
  return page.locator(selector).nth(nth).evaluate((el, [prop, fromParent]) => {
    const parse = (s) => { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 4).map(Number) : null; };
    const fg = parse(getComputedStyle(el)[prop]);
    let n = fromParent ? el.parentElement : el.parentElement;
    let bg = null;
    while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c && (c[3] === undefined || c[3] > 0.9)) { bg = c; break; } n = n.parentElement; }
    return { fg: fg.slice(0, 3), bg: (bg || [255, 255, 255]).slice(0, 3) };
  }, [prop, fromParent]).catch(() => null);
}
/** Color de texto contra el fondo opaco del propio elemento o, si es transparente, del primero detrás. */
async function textPair(page, dir, screen, what, selector, min, nth = 0) {
  const loc = page.locator(selector).nth(nth);
  if (!(await loc.count())) { rows.push({ dir, screen, what, ratio: null, min, ok: false, note: `no encontrado: ${selector}` }); return; }
  const p = await loc.evaluate((el) => {
    const parse = (s) => s.match(/[\d.]+/g).map(Number);
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    let n = el, bg = null;
    while (n) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) { bg = c.slice(0, 3); break; } n = n.parentElement; }
    return { fg, bg: bg || [255, 255, 255] };
  });
  record(dir, screen, what, +contrast(p.fg, p.bg).toFixed(2), min, `calculado: ${hex(p.fg)} sobre ${hex(p.bg)}`);
}
async function pair(page, dir, screen, what, selector, prop, min, nth = 0) {
  if (!(await page.locator(selector).nth(nth).count())) { rows.push({ dir, screen, what, ratio: null, min, ok: false, note: `no encontrado: ${selector}` }); return; }
  const p = await computedPair(page, selector, prop, nth);
  record(dir, screen, what, +contrast(p.fg, p.bg).toFixed(2), min, `${hex(p.fg)} sobre ${hex(p.bg)}`);
}

/** % de píxeles de la vista con luminancia relativa > 0.5: cuánta superficie clara le da a la cara de noche. */
async function glare(page) {
  const png = await page.screenshot({ animations: "disabled" });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    let bright = 0;
    for (let i = 0; i < d.length; i += 16) if (0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]) > 0.5) bright++;
    return (bright / (d.length / 16)) * 100;
  }, png.toString("base64"));
}

async function open(ctx, hash, sheetPath) {
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate((tb) => {
    document.documentElement.classList.add("ns-in-desktop");
    document.body.insertAdjacentHTML("afterbegin", tb);
  }, TITLEBAR);
  if (sheetPath) {
    await page.addStyleTag({ path: sheetPath });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  }
  await page.waitForTimeout(1300);
  return { page, cons };
}

const { browser, close } = await startPreview();
const glareRows = [];
const consoleRows = [];
try {
  for (const key of ["claro", ...Object.keys(DIRS)]) {
    let sheetPath = null;
    if (key !== "claro") {
      sheetPath = join(SHEETS, `${DATE}-oscuro-${key}.css`);
      writeFileSync(sheetPath, buildSheet(key));
    }
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const shot = (page, name) => key === "claro" ? null : page.screenshot({ path: join(SHOTS, `${DATE}-oscuro-${key}-${name}.png`), animations: "disabled" });

    // ---- login
    let { page, cons } = await open(ctx, "#/login", sheetPath);
    await shot(page, "login");
    glareRows.push({ dir: key, screen: "login", pct: await glare(page) });
    await sample(page, key, "login", "Titular «¡Hola!»", ".ns-auth-hello h1, .ns-auth-hello h2", AA);
    await sample(page, key, "login", "Bienvenida (texto secundario)", ".ns-auth-hello p", AA);
    await textPair(page, key, "login", "Botón Entrar", ".ns-auth-submit", AA);
    await sample(page, key, "login", "Enlace «¿Olvidaste…?»", ".ns-auth-row a", AA);
    await sample(page, key, "login", "Pie «¿Primera vez?»", ".ns-auth-foot", AA);
    const wave = await page.evaluate(() => { const w = document.querySelector(".ns-auth-wave"), p = document.querySelector(".ns-auth-panel"); return w && p ? [getComputedStyle(w).fill, getComputedStyle(p).backgroundColor] : null; });
    rows.push({ dir: key, screen: "login", what: "La ola tiene el color del panel", ratio: null, min: null, ok: !!wave && wave[0] === wave[1], note: wave ? wave.join(" / ") : "no encontrada" });
    await sample(page, key, "login", "Barra de título · marca", ".ns-titlebar-brand", AA);
    await sample(page, key, "login", "Barra de título · icono minimizar", ".ns-titlebar-btn", NONTEXT);
    consoleRows.push({ dir: key, screen: "login", msgs: cons.length });
    await page.close();

    // ---- panel docente
    ({ page, cons } = await open(ctx, "#/teacher/dashboard", sheetPath));
    await shot(page, "panel-docente");
    glareRows.push({ dir: key, screen: "panel docente", pct: await glare(page) });
    await sample(page, key, "panel docente", "Titular de página", ".ns-header-title", AA);
    await sample(page, key, "panel docente", "Descripción (texto)", ".ns-header-desc", AA);
    await sample(page, key, "panel docente", "Bloque invertido · título", ".ns-block--navy h2, .ns-block--navy h3", AA);
    await sample(page, key, "panel docente", "Bloque invertido · meta (#d9cfbd)", ".ns-home-hero-meta", AA);
    await textPair(page, key, "panel docente", "Botón primario «Calificar» (dorado)", ".ns-header .ns-btn--primary", AA);
    await textPair(page, key, "panel docente", "Botón dorado dentro del bloque invertido", ".ns-block--navy .ns-btn--primary", AA);
    await textPair(page, key, "panel docente", "Sello «8 pendientes» sobre dorado", ".ns-block--navy .ns-sticker", AA);
    await textPair(page, key, "panel docente", "Botón secundario", ".ns-header .ns-btn--secondary", AA);
    await textPair(page, key, "panel docente", "Menú · ítem activo", '.ns-nav-item[aria-current="page"]', AA);
    await textPair(page, key, "panel docente", "Menú · número «01» del ítem activo", '.ns-nav-item[aria-current="page"] .ns-nav-item-index', AA);
    await textPair(page, key, "panel docente", "Menú · contador «8» de Calificaciones", ".ns-nav-item-count", AA);
    await textPair(page, key, "panel docente", "Menú · ítem normal", '.ns-nav-item:not([aria-current="page"])', AA, 1);
    await textPair(page, key, "panel docente", "Enlace «Ver todas»", ".ns-btn--ghost:has-text('Ver todas')", AA);
    await sample(page, key, "panel docente", "Texto --muted (rótulo de sección)", ".ns-sidebar-section", AA);
    await sample(page, key, "panel docente", "Cifra «8 notas por verificar»", ".ns-bento-value", AAA);
    await pair(page, key, "panel docente", "Borde de tarjeta contra el fondo (no texto)", ".ns-block:not(.ns-block--navy)", "borderTopColor", NONTEXT);
    await pair(page, key, "panel docente", "Borde del buscador (control, no texto)", ".ns-gsearch-trigger", "borderTopColor", NONTEXT);
    // Foco: Tab hasta el primer ítem del menú; contorno contra el fondo de la barra lateral.
    await page.locator(".ns-nav-item").first().focus();
    await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement; const cs = getComputedStyle(el);
      const parse = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      let n = el.parentElement, bg = null;
      while (n) { const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g); if (m && (m[3] === undefined || +m[3] > 0.9)) { bg = m.slice(0, 3).map(Number); break; } n = n.parentElement; }
      return { cls: el.className, style: cs.outlineStyle, width: cs.outlineWidth, color: parse(cs.outlineColor), bg };
    });
    record(key, "panel docente", "Foco visible (contorno contra fondo)", focused.style === "none" ? 0 : +contrast(focused.color, focused.bg).toFixed(2), NONTEXT, `${focused.style} ${focused.width} ${hex(focused.color)} sobre ${hex(focused.bg)}`);
    if (key !== "claro") await page.screenshot({ path: join(SHOTS, `${DATE}-oscuro-${key}-foco.png`), clip: { x: 0, y: 200, width: 300, height: 200 }, animations: "disabled" });
    consoleRows.push({ dir: key, screen: "panel docente", msgs: cons.length });
    await page.close();

    // ---- revisión: tarjeta de nota y estados de confianza
    ({ page, cons } = await open(ctx, "#/teacher/review", sheetPath));
    await shot(page, "revision");
    glareRows.push({ dir: key, screen: "revisión", pct: await glare(page) });
    const cards = page.locator(".ns-card:not(.ns-card--skeleton)");
    const n = Math.min(await cards.count(), 6);
    for (let i = 0; i < n; i++) {
      const card = cards.nth(i);
      const status = (await card.getAttribute("class")).match(/ns-card--([a-z-]+)/)?.[1] ?? "?";
      const g = card.locator(".ns-card-grade");
      if (!(await g.count())) continue;
      const r = await sampleTextContrast(page, g);
      record(key, "revisión", `Cifra de nota (tarjeta ${i + 1}, ${status})`, +r.ratio.toFixed(2), AAA, `${hex(r.fg)} sobre ${hex(r.bg)}`);
    }
    await sample(page, key, "revisión", "Rótulo --muted «Calificación detectada»", ".ns-card-grade-label .ns-overline", AA);
    await sample(page, key, "revisión", "ID del estudiante (--charcoal)", ".ns-card-id", AA);
    await textPair(page, key, "revisión", "Cinta «Principio» · frase", ".ns-marquee-item", AA);
    await textPair(page, key, "revisión", "Cinta «Principio» · rótulo dorado", ".ns-marquee-label", AA);
    await textPair(page, key, "revisión", "Nº de tarjeta (pendiente)", ".ns-card--pending .ns-card-index", AA);
    await textPair(page, key, "revisión", "Nº de tarjeta (requiere revisión)", ".ns-card--needs-review .ns-card-index", AA);
    await textPair(page, key, "revisión", "Botón «Confirmar» de la tarjeta", ".ns-card .ns-btn--primary", AA);
    for (const [lvl, label] of [["high", "alta"], ["medium", "media"], ["low", "baja"]]) {
      await textPair(page, key, "revisión", `Insignia IA confianza ${label}`, `.ns-badge--${lvl}`, AA);
      await textPair(page, key, "revisión", `Nivel de confianza ${label} (texto bajo la barra)`, `.ns-conf--${lvl} .ns-conf-level`, AA);
    }
    // Confianza sin depender solo del color: cada insignia y nivel lleva icono y palabra.
    const shapes = await page.evaluate(() => ["high", "medium", "low"].map((l) => {
      const els = [...document.querySelectorAll(`.ns-badge--${l}, .ns-conf--${l} .ns-conf-level`)];
      return { l, n: els.length, ok: els.every((e) => e.querySelector("svg") && e.textContent.trim().length > 1) };
    }));
    for (const s of shapes) rows.push({ dir: key, screen: "revisión", what: `Confianza ${s.l}: icono + palabra en todas (${s.n})`, ratio: null, min: null, ok: s.ok && s.n > 0, note: "forma, no color" });
    await pair(page, key, "revisión", "Borde de la tarjeta (no texto)", ".ns-card:not(.ns-card--skeleton)", "borderTopColor", NONTEXT);
    await pair(page, key, "revisión", "Borde del recuadro de la nota (no texto)", ".ns-card-grade", "borderTopColor", NONTEXT);
    // Recorte de tres tarjetas para la captura «tarjeta»
    if (key !== "claro" && n >= 3) {
      await cards.nth(0).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const b = await Promise.all([0, 2].map((i) => cards.nth(i).boundingBox()));
      const y = Math.max(0, b[0].y - 24);
      await page.screenshot({ path: join(SHOTS, `${DATE}-oscuro-${key}-tarjeta.png`), clip: { x: b[0].x - 24, y, width: b[1].x + b[1].width - b[0].x + 48, height: Math.min(900 - y, b[0].height + 48) }, animations: "disabled" });
    }
    consoleRows.push({ dir: key, screen: "revisión", msgs: cons.length });
    await page.close();

    // ---- rectoría y secretaría (captura + deslumbramiento + titular)
    for (const [hash, name, label] of [["#/principal/dashboard", "panel-rectoria", "panel rectoría"], ["#/admin/dashboard", "panel-secretaria", "panel secretaría"]]) {
      ({ page, cons } = await open(ctx, hash, sheetPath));
      await shot(page, name);
      glareRows.push({ dir: key, screen: label, pct: await glare(page) });
      await sample(page, key, label, "Titular de página", ".ns-header-title", AA);
      await sample(page, key, label, "Cifra principal (KPI)", ".ns-kpi strong, .ns-bento-value", AAA);
      consoleRows.push({ dir: key, screen: label, msgs: cons.length });
      await page.close();
    }

    // ---- impresión: con el tema oscuro puesto, la impresión resuelve los tokens claros
    if (key !== "claro") {
      ({ page } = await open(ctx, "#/teacher/dashboard", sheetPath));
      await page.emulateMedia({ media: "print" });
      const ink = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--navy").trim());
      rows.push({ dir: key, screen: "impresión", what: "Con tema oscuro, al imprimir --navy vuelve a #1b2a4a", ratio: null, min: null, ok: ink.toLowerCase() === "#1b2a4a", note: `--navy = ${ink}` });
      await page.close();
    }
    await ctx.close();
  }
} finally {
  await close();
}

// ---------------------------------------------------------------- informe
const keys = ["claro", ...Object.keys(DIRS)];
const fmt = (r) => r.ratio == null ? (r.ok ? "sí" : "NO") : `${r.ratio.toFixed(2)}${r.ok ? "" : " FALLA"}`;
const whats = [...new Set(rows.map((r) => r.screen + " · " + r.what))];
const lines = [`| Medición | Mínimo | ${keys.join(" | ")} |`, `|---|---|${keys.map(() => "---").join("|")}|`];
for (const w of whats) {
  const cells = keys.map((k) => { const r = rows.find((x) => x.dir === k && x.screen + " · " + x.what === w); return r ? fmt(r) : "n/a"; });
  const min = rows.find((x) => x.screen + " · " + x.what === w).min;
  lines.push(`| ${w} | ${min ?? "—"} | ${cells.join(" | ")} |`);
}
const glareLines = ["| Pantalla | " + keys.join(" | ") + " |", `|---|${keys.map(() => "---").join("|")}|`];
for (const s of [...new Set(glareRows.map((g) => g.screen))]) glareLines.push(`| ${s} | ${keys.map((k) => { const g = glareRows.find((x) => x.dir === k && x.screen === s); return g ? g.pct.toFixed(1) + " %" : "n/a"; }).join(" | ")} |`);
const summary = keys.map((k) => { const mine = rows.filter((r) => r.dir === k); return `${k}: ${mine.filter((r) => r.ok).length}/${mine.length}`; }).join(" · ");
const cons = consoleRows.filter((c) => c.msgs > 0).map((c) => `${c.dir}/${c.screen}: ${c.msgs}`).join(", ") || "sin errores ni avisos en ninguna pantalla";
const patchInfo = `Parches generados: CAMPOS ${FIELD_RULES.length + FIELD_EXTRA.length} reglas, DORADOS ${GOLD_RULES.length + 1} reglas, REPISAS ${LEDGE_RULES.length} reglas, LITERALES de texto sobre navy ${LOW_LITERAL_RULES.length} reglas.`;
const report = [`# Mediciones modo oscuro · ${DATE}`, "", summary, "", patchInfo, "", `Consola: ${cons}`, "", ...lines, "", "## Superficie clara (% de píxeles con luminancia > 0.5, vista de 1440×900)", "", ...glareLines, "", "## Notas de muestreo", "", ...rows.filter((r) => r.note).map((r) => `- ${r.dir} · ${r.screen} · ${r.what}: ${r.note}`)].join("\n");
writeFileSync(join(ROOT, "verify-out", `${DATE}-oscuro-mediciones.md`), report);
console.log(report.split("## Notas")[0]);
const failed = rows.filter((r) => r.dir !== "claro" && !r.ok).length;
console.log(`\n${failed} fallos en las direcciones oscuras (ver tabla).`);
