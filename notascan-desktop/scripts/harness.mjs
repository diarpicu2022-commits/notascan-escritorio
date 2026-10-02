// Utilidades compartidas por los scripts de verificación.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DS = join(ROOT, "..", "notascan-ui");
export const OUT = join(ROOT, "verify-out");
mkdirSync(OUT, { recursive: true });
export const URL_BASE = "http://localhost:4173/";

export function createReport() {
  const results = [];
  return {
    check(name, ok, detail = "") { results.push({ name, ok: !!ok, detail }); },
    print() {
      let failed = 0;
      for (const r of results) {
        if (!r.ok) failed++;
        console.log(`${r.ok ? "OK   " : "FALLA"} ${r.name}${r.detail ? "  — " + r.detail : ""}`);
      }
      console.log(`\n${results.length - failed}/${results.length} comprobaciones superadas`);
      return failed;
    },
  };
}

/** Literales del sistema aceptados como excepción (se llenan al llamar a findOffSystemValues). */
export const DS_LITERALS = [];

/** Colores literales o valores arbitrarios de Tailwind fuera de los archivos del sistema. */
export function findOffSystemValues() {
  DS_LITERALS.length = 0;
  const SYSTEM_FILES = new Set(["tokens.css", "notascan.css"]);
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const offenders = [];
  for (const file of walk(join(ROOT, "src"))) {
    const base = file.split(/[\\/]/).pop();
    if (![".ts", ".tsx", ".css"].includes(extname(file)) || SYSTEM_FILES.has(base) || base.endsWith(".d.ts")) continue;
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      // `ds-literal`: valor copiado tal cual de notascan-ui que no está en tokens.json (excepción
      // anotada en el anexo). Se informa aparte para que nunca pase desapercibido.
      if (line.includes("// ds-literal")) { DS_LITERALS.push(`${base}:${i + 1}`); return; }
      if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /rgba?\(/.test(line)) offenders.push(`${base}:${i + 1} color literal`);
      if (/\b[a-z-]+-\[[^\]]+\]/.test(line)) offenders.push(`${base}:${i + 1} valor arbitrario de Tailwind`);
    });
  }
  return offenders;
}

/** Arranca `vite preview` sobre dist/ y Chromium; devuelve un cierre que limpia ambos. */
export async function startPreview() {
  const server = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--port", "4173", "--strictPort"], { cwd: ROOT });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("vite preview no arrancó")), 30000);
    server.stdout.on("data", (d) => { if (String(d).includes("4173")) { clearTimeout(t); res(); } });
    server.stderr.on("data", (d) => { if (/in use|error/i.test(String(d))) { clearTimeout(t); rej(new Error(String(d))); } });
  });
  // Mismo modo de suavizado de texto en todas las páginas: si no, Chromium alterna LCD y gris
  // según la capa de composición, y la comparación de píxeles mide eso en vez del diseño.
  const browser = await chromium.launch({ args: ["--disable-lcd-text"] });
  return {
    browser,
    async close() {
      await browser.close();
      server.kill();
      if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
    },
  };
}

/**
 * Desbordamientos a 1024 px que ya tiene notascan-ui original (medidos el 2026-10-01 en la
 * referencia, mismo DOM y CSS). Pendientes de decisión de Diego: se informan como NOTA mientras
 * midan lo mismo; si cambian o aparecen otros, fallan.
 */
export const DS_OVERFLOW_1024 = {}; // 2026-10-01: los dos casos medidos se corrigieron con amendments.css

export function checkOverflow(report, hash, over, width = 1024) {
  if (over <= 0) { report.check(`Sin desbordamiento horizontal ${hash} a ${width}px`, true); return; }
  // ±1 px: la entrada animada deja medidas fraccionarias que redondean distinto según el instante.
  if (width === 1024 && DS_OVERFLOW_1024[hash] !== undefined && Math.abs(DS_OVERFLOW_1024[hash] - over) <= 1) {
    console.log(`NOTA  ${hash} a 1024px: ${over}px de desbordamiento heredado del sistema (pendiente de decisión)`);
    return;
  }
  report.check(`Sin desbordamiento horizontal ${hash} a ${width}px`, false, `${over}px de más`);
}

/**
 * Aplica a una página de referencia del sistema las enmiendas aprobadas (anexo, Excepciones
 * fechadas), para comparar contra «sistema + enmiendas» y no contra un estado ya descartado.
 */
export async function applyAmendments(page) {
  await page.addStyleTag({ path: join(ROOT, "src/styles/amendments.css") });
  await page.evaluate(() => {
    // 2026-10-01 · color del resumen del perfil: #d9cfbd → --ivory-deep.
    const fix = () => document.querySelectorAll(".ns-profile-grid .ns-block--navy > span[style]:last-child").forEach((el) => { el.style.color = "var(--ivory-deep)"; });
    fix();
    new MutationObserver(fix).observe(document.body, { childList: true, subtree: true });
  });
}

/** Recoge errores y avisos de consola de una página. */
export function watchConsole(page) {
  const messages = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") messages.push(m.text()); });
  page.on("pageerror", (e) => messages.push(String(e)));
  return messages;
}

const lum = ([r, g, b]) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/**
 * Contraste medido sobre los píxeles renderizados de un elemento con texto:
 * fondo = color más frecuente; texto = píxel con mayor contraste contra ese fondo.
 */
export async function sampleTextContrast(page, locator) {
  // Recorte del recuadro exacto con animaciones congeladas: no espera la «estabilidad» del
  // elemento, que nunca llega si un ancestro tiene movimiento ambiental.
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const png = await page.screenshot({ animations: "disabled", clip: { x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height) } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const freq = new Map();
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; freq.set(k, (freq.get(k) || 0) + 1); }
    const bgKey = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const bg = [bgKey >> 16, (bgKey >> 8) & 255, bgKey & 255];
    const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const lb = L(bg);
    let best = bg, bestR = 1;
    for (const k of freq.keys()) {
      const px = [k >> 16, (k >> 8) & 255, k & 255];
      const l = L(px);
      const r = (Math.max(l, lb) + 0.05) / (Math.min(l, lb) + 0.05);
      if (r > bestR && freq.get(k) >= 3) { bestR = r; best = px; }
    }
    return { ratio: bestR, fg: best, bg };
  }, png.toString("base64"));
}

/** Abre NotaScanApp original del sistema (con las enmiendas aprobadas) en `hash`. */
export async function openReference(ctx, hash) {
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/dev/tokens", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.head.querySelectorAll("style,link[rel=stylesheet]:not([href*=fonts])").forEach((n) => n.remove());
    const m = document.createElement("div"); m.id = "ref"; document.body.replaceChildren(m);
  });
  await page.addStyleTag({ path: join(DS, "css/tokens.css") });
  await page.addStyleTag({ path: join(DS, "css/notascan.css") });
  await applyAmendments(page);
  await page.addScriptTag({ path: join(DS, "vendor/react.production.min.js") });
  await page.addScriptTag({ path: join(DS, "vendor/react-dom.production.min.js") });
  await page.evaluate((h) => history.replaceState(null, "", h), hash);
  await page.addScriptTag({ path: join(DS, "js/notascan.js") });
  await page.evaluate(() => ReactDOM.createRoot(document.getElementById("ref")).render(React.createElement(NotaScan.NotaScanApp)));
  return { page, cons };
}

/** DOM serializado sin ids generados ni estilos de posición, para comparar estructura y textos. */
export const normalizeDom = (loc) => loc.evaluate((root) => {
  const walk = (el) => {
    if (el.nodeType === 3) return el.textContent.trim() ? `"${el.textContent.trim()}"` : "";
    if (el.nodeType !== 1) return "";
    const attrs = [...el.attributes]
      .filter((a) => !["id", "aria-labelledby", "aria-describedby", "aria-controls", "aria-activedescendant", "for", "name"].includes(a.name))
      .map((a) => `${a.name}=${a.value}`).sort().join(" ");
    return `<${el.tagName.toLowerCase()} ${attrs}>${[...el.childNodes].map(walk).join("")}</${el.tagName.toLowerCase()}>`;
  };
  return walk(root);
});

/** % de píxeles distintos, tolerando 1 px de suavizado. */
export function pixelDiff(page, a, b) {
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

/** Compara una ruta de la app con la misma ruta del sistema: DOM del contenido y del menú, y píxeles del contenido. */
export async function compareRoute(browser, report, hash, label, shotPrefix) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const { page: ref, cons: rc } = await openReference(ctx, hash);
  const mine = await ctx.newPage();
  const mc = watchConsole(mine);
  await mine.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await Promise.all([ref.waitForTimeout(1200), mine.waitForTimeout(1200)]);
  for (const [sel, part] of [[".ns-app-main", "contenido"], [".ns-sidebar", "menú"]]) {
    const [r, m] = await Promise.all([normalizeDom(ref.locator(sel)), normalizeDom(mine.locator(sel))]);
    let at = 0;
    while (at < r.length && r[at] === m[at]) at++;
    report.check(`${label} · ${part}: DOM idéntico al sistema`, r === m, r === m ? "" : `…${r.slice(Math.max(0, at - 60), at + 90)}… vs …${m.slice(Math.max(0, at - 60), at + 90)}…`);
  }
  const a = await ref.locator(".ns-app-main").screenshot({ animations: "disabled" });
  const b = await mine.locator(".ns-app-main").screenshot({ animations: "disabled", path: join(OUT, `${shotPrefix}-${label.replace(/[/?=]/g, "-")}.png`) });
  const d = await pixelDiff(mine, a, b);
  report.check(`${label} · contenido: píxeles iguales al sistema (≤ 0.5 %)`, d.pct <= 0.5, `${d.size}, ${d.pct.toFixed(3)} %`);
  report.check(`${label}: consola sin errores (ambos lados)`, rc.length === 0 && mc.length === 0, [...rc, ...mc].join(" | "));
  await ctx.close();
}
