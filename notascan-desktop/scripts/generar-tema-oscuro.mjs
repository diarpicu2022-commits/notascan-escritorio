// Modo oscuro · generador de src/styles/theme-dark.css (dirección B · Campo marino, contrato del 2026-11-08).
//
//   node scripts/generar-tema-oscuro.mjs          escribe src/styles/theme-dark.css
//   node scripts/generar-tema-oscuro.mjs --check  sale con código 1 si el archivo no coincide con lo generado
//
// La hoja no se escribe a mano. Sale de leer notascan.css, que no se edita, y amendments.css (anexo 2026-11-08-modo-oscuro.md, §3, O2 y su enmienda del 2026-11-08).
// La lógica es la misma que validó scripts/verify-dark-directions.mjs para la maqueta de B, que sigue intacta como
// registro de la investigación.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const THEME_DARK_PATH = join(ROOT, "src/styles/theme-dark.css");

// ---------------------------------------------------------------- contrato B · Campo marino (anexo §11, O1)
/** Tokens oscuros con los mismos nombres de tokens.css. */
export const DARK_TOKENS = {
  "--navy": "#ece4d4", "--navy-soft": "#bdb5a6", "--gold": "#c9a35e", "--gold-ink": "#dcbf86", "--gold-soft": "#342c1e",
  "--ivory": "#161513", "--ivory-deep": "#2a2824", "--paper": "#1f1e1b", "--charcoal": "#d6cfc2", "--muted": "#a8a194",
  "--hairline": "rgba(236, 228, 212, 0.16)", "--sage": "#83a889", "--sage-ink": "#aed0b2", "--sage-soft": "#1e2a21",
  "--burgundy": "#e38a80", "--burgundy-soft": "#36211e", "--glass": "rgba(31, 30, 27, 0.78)", "--glass-edge": "rgba(236, 228, 212, 0.10)",
  "--scrim": "rgba(8, 8, 7, 0.62)", "--focus": "#dcbf86",
  "--shadow-sm": "2px 2px 0 #34497a", "--shadow-md": "4px 4px 0 #34497a", "--shadow-lg": "6px 6px 0 #34497a",
  "--shadow-gold": "3px 3px 0 #c9a35e", "--shadow-pressed": "0 0 0 #34497a", "--shadow-glass": "0 10px 30px rgba(0, 0, 0, 0.4)",
};
/** Tinta sobre relleno dorado (O4). */
export const ON_GOLD = "#161513";
/** Repisa: la sombra dura deja de ser tinta y pasa a ser navy de marca levantado. */
export const LEDGE = "#34497a";
/** Campo navy (O3): dentro de cada bloque invertido se vuelven a declarar los tokens. */
export const FIELD = { navy: "#22345c", ivory: "#f1eadc", muted: "#c9c1b2", hairline: "rgba(241, 234, 220, 0.22)" };
const FIELD_SCOPE = `--navy: ${FIELD.navy}; --ivory: ${FIELD.ivory}; --muted: ${FIELD.muted}; --hairline: ${FIELD.hairline};`;
/** Papel (O5): boletín y foto del examen con los tokens claros de tokens.css. */
export const LIGHT_TOKENS = {
  "--navy": "#1b2a4a", "--navy-soft": "#33425f", "--gold": "#b8924b", "--gold-ink": "#7a5f2c", "--gold-soft": "#f3e8d2", "--ivory": "#f7f3ec",
  "--ivory-deep": "#efe8dc", "--paper": "#fffdf8", "--charcoal": "#2b2b2b", "--muted": "#5b5a56", "--hairline": "rgba(27, 42, 74, 0.16)",
  "--sage": "#6b8f71", "--sage-ink": "#3f6346", "--sage-soft": "#e1eadf", "--burgundy": "#7a2e2e", "--burgundy-soft": "#f3e1dd", "--focus": "#1b2a4a",
};
const LIGHT_SCOPE = Object.entries(LIGHT_TOKENS).map(([k, v]) => `${k}: ${v};`).join(" ") + " color-scheme: light;";

// ---------------------------------------------------------------- lectura de notascan.css
/** Reglas de estilo con su selector y declaraciones. Ignora @keyframes y anota si van dentro de @media. */
export function parseRules(css) {
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

export function analyze(
  nsCss = readFileSync(join(ROOT, "src/styles/notascan.css"), "utf8"),
  amendCss = readFileSync(join(ROOT, "src/styles/amendments.css"), "utf8"),
) {
  // Enmienda de O2 (2026-11-08): se lee también amendments.css, que se carga después de notascan.css. Si una enmienda
  // repinta el fondo o la sombra de un selector, el parche sigue a la enmienda y no al valor viejo del sistema
  // (la nota solicitada de rectoría pasó a papel con repisa dorada y el parche de repisas la volvía navy).
  const RULES = [...parseRules(nsCss), ...parseRules(amendCss)];
  // Último fondo y última sombra de cada selector exacto (la cinta pasa de navy a papel, el ítem activo de dorado a navy).
  const LAST_BG = new Map(), LAST_SHADOW = new Map();
  for (const r of RULES) {
    if (r.media) continue;
    const m = r.body.match(/background(?:-color)?:\s*([^;]+)/g); if (m) LAST_BG.set(r.sel, m[m.length - 1]);
    const s = r.body.match(/box-shadow:\s*([^;]+)/g); if (s) LAST_SHADOW.set(r.sel, s[s.length - 1]);
  }
  const finalBgIs = (r, token) => (r.media ? true : (LAST_BG.get(r.sel) || "").includes(`var(--${token})`));
  const fields = RULES.filter((r) => /background(-color)?:\s*var\(--navy\)/.test(r.body) && /(^|;|\s)color:\s*var\(--(ivory|gold|paper)\)/.test(r.body) && finalBgIs(r, "navy"));
  // Bloques navy cuyo color lo fijan los hijos (la regla del fondo no declara `color`).
  // También el indicador y la opción elegida del grupo Tema (preferences.css, paso 2): son el segmentado del sistema,
  // cuya opción elegida ya es campo navy en notascan.css.
  const fieldExtra = [".ns-kpi--lead", ".ns-brand-b--navy", ".ns-m-card--navy", ".ns-auth-panel", ".ns-theme-seg-ind", '.ns-theme-seg .ns-theme-seg-tab[aria-checked="true"]'];
  const ledges = RULES.filter((r) => /box-shadow:[^;]*var\(--navy\)/.test(r.body) && (r.media || (LAST_SHADOW.get(r.sel) || "").includes("var(--navy)")));
  const golds = RULES.filter((r) => /background(-color)?:\s*var\(--gold\)/.test(r.body) && !fields.some((f) => f.sel === r.sel) && finalBgIs(r, "gold"));
  return { fields, fieldExtra, ledges, golds };
}

const scoped = (sel) => sel.split(",").map((s) => `:root[data-theme="dark"] ${s.trim()}`).join(", ");
const wrapMedia = (media, text) => (media ? `  ${media} {\n  ${text}\n  }` : `  ${text}`);

export function buildThemeDark() {
  const { fields, fieldExtra, ledges, golds } = analyze();
  const out = [];
  out.push(`/* Modo oscuro de NotaScan · dirección B · Campo marino (contrato del 2026-11-08).
   ARCHIVO GENERADO por scripts/generar-tema-oscuro.mjs a partir de notascan.css y amendments.css. No se edita a mano.
   Solo actúa con data-theme="dark" en <html>. Sin el atributo, o con "light", la app queda igual que antes.
   Todo va dentro de @media screen, así que la impresión resuelve siempre los tokens claros (O5). */`);
  out.push("@media screen {");

  out.push(`  /* TOKENS (O1): mismos nombres de tokens.css con los valores de B. color-scheme hace que las barras de
     desplazamiento y los controles nativos de WebView2 y WKWebView sigan el tema. */`);
  out.push(`  :root[data-theme="dark"] {\n    color-scheme: dark;\n    ${Object.entries(DARK_TOKENS).map(([k, v]) => `${k}: ${v};`).join("\n    ")}\n  }`);

  const fieldSels = [...fields.map((r) => ({ sel: r.sel, media: r.media })), ...fieldExtra.map((s) => ({ sel: s, media: null }))];
  out.push(`  /* CAMPOS (${fieldSels.length + 1} reglas, O3): en claro --navy es a la vez tinta y fondo de los bloques invertidos.
     En oscuro la tinta pasa a marfil, así que dentro de cada bloque se vuelve a declarar --navy como campo de marca
     ${FIELD.navy} con texto ${FIELD.ivory}. La regla del sistema, sin editarse, pinta el campo con estos valores. */`);
  for (const { sel, media } of fieldSels) out.push(wrapMedia(media, `${scoped(sel)} { ${FIELD_SCOPE} }`));
  out.push(`  :root[data-theme="dark"] .ns-auth-wave { ${FIELD_SCOPE} }`);
  out.push(`  /* Nº de la tarjeta que requiere revisión: el burdeos de oscuro es claro y lleva tinta oscura. */`);
  out.push(`  :root[data-theme="dark"] .ns-card--needs-review .ns-card-index { background-color: var(--burgundy); color: ${ON_GOLD}; --ivory: ${ON_GOLD}; }`);

  out.push(`  /* DORADOS (${golds.length + 2} reglas, O4): en claro el dorado lleva tinta navy. Con la tinta marfil el texto de
     «Calificar», «Confirmar» o la cabecera de tablas caería a 1.9:1, así que todo relleno dorado lleva ${ON_GOLD}. */`);
  out.push(`  :root[data-theme="dark"] .ns-btn--primary { --btn-fg: ${ON_GOLD}; }`);
  out.push(`  :root[data-theme="dark"] .ns-btn--primary:hover { --btn-bg: var(--gold-ink); }`);
  for (const r of golds) out.push(wrapMedia(r.media, `${scoped(r.sel)} { color: ${ON_GOLD}; }`));

  out.push(`  /* REPISAS (${ledges.length} reglas): sombras duras escritas en notascan.css como «Npx Npx 0 var(--navy)» sin pasar
     por --shadow-*. En oscuro serían marfil, y la repisa pasa al navy de marca ${LEDGE}, el mismo gesto del claro. */`);
  for (const r of ledges) {
    const shadow = r.body.match(/box-shadow:\s*([^;]+)/)[1].replace(/var\(--navy\)/g, LEDGE);
    out.push(wrapMedia(r.media, `${scoped(r.sel)} { box-shadow: ${shadow}; }`));
  }

  out.push(`  /* LITERALES: fondos claros escritos a mano en notascan.css para una página marfil (fila y menú al pasar el ratón,
     aviso sin leer, diálogo, esqueleto, flecha del selector, trama del lienzo). Pasan a tokens. */`);
  out.push(`  :root[data-theme="dark"] .ns-table tbody tr:hover td, :root[data-theme="dark"] .ns-gb tbody tr.is-row th, :root[data-theme="dark"] .ns-gb tbody tr.is-row td { background: var(--ivory-deep); }
  :root[data-theme="dark"] .ns-nav-item:hover, :root[data-theme="dark"] .ns-nav-item.is-hover { background: var(--ivory-deep); }
  :root[data-theme="dark"] .ns-att-row.is-absent { background: var(--burgundy-soft); }
  :root[data-theme="dark"] .ns-notif.is-unread, :root[data-theme="dark"] .ns-textarea.is-ai { background: var(--gold-soft); }
  :root[data-theme="dark"] .ns-dialog { background: var(--paper); }
  :root[data-theme="dark"] .ns-skel::after { background: linear-gradient(90deg, transparent, var(--hairline), transparent); }
  :root[data-theme="dark"] .ns-select-input { background-image: linear-gradient(45deg, transparent 50%, var(--navy) 50%), linear-gradient(135deg, var(--navy) 50%, transparent 50%); }
  :root[data-theme="dark"] .ns-canvas::before { background: radial-gradient(circle at 1px 1px, var(--hairline) 1.2px, transparent 1.6px) 0 0 / 22px 22px; }`);

  out.push(`  /* PAPEL (O5): el boletín en pantalla y la foto del examen son documentos, no interfaz. Siguen en claro. */`);
  out.push(`  :root[data-theme="dark"] .ns-paper, :root[data-theme="dark"] .ns-photo { ${LIGHT_SCOPE} }`);
  out.push("}");
  return out.join("\n") + "\n";
}

/** Cuántas reglas produce cada grupo, para el anexo y para verify:dark. */
export function patchCounts() {
  const { fields, fieldExtra, ledges, golds } = analyze();
  return { campos: fields.length + fieldExtra.length + 2, dorados: golds.length + 2, repisas: ledges.length, literales: 8, papel: 1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const css = buildThemeDark();
  if (process.argv.includes("--check")) {
    let current = "";
    try { current = readFileSync(THEME_DARK_PATH, "utf8"); } catch {}
    if (current.replace(/\r\n/g, "\n") !== css) { console.error("theme-dark.css no coincide con lo generado. Corre node scripts/generar-tema-oscuro.mjs"); process.exit(1); }
    console.log("theme-dark.css coincide con lo generado desde notascan.css");
  } else {
    writeFileSync(THEME_DARK_PATH, css);
    const c = patchCounts();
    console.log(`Escrito ${THEME_DARK_PATH}\nCAMPOS ${c.campos} · DORADOS ${c.dorados} · REPISAS ${c.repisas} · LITERALES ${c.literales} · PAPEL ${c.papel}`);
  }
}
