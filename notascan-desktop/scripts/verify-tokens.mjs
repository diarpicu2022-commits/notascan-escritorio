// Paso 1 · verificación medida de tokens.
// Compara tokens.json (fuente única del sistema) contra lo que el navegador
// resuelve de verdad, muestrea los colores sobre la captura renderizada, calcula
// contraste con esos píxeles y busca valores fuera del sistema en src/.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "verify-out");
mkdirSync(OUT, { recursive: true });
const tokens = JSON.parse(readFileSync(join(ROOT, "src/styles/tokens.json"), "utf8"));
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); };

// ---------- 1. Valores fuera del sistema en el código propio ----------
const OWN_EXT = new Set([".ts", ".tsx", ".css"]);
const SYSTEM_FILES = new Set(["tokens.css", "notascan.css"]);
function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const offenders = [];
for (const file of walk(join(ROOT, "src"))) {
  const base = file.split(/[\\/]/).pop();
  if (!OWN_EXT.has(extname(file)) || SYSTEM_FILES.has(base) || base.endsWith(".d.ts")) continue;
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (line.includes("// ds-literal")) return; // excepción del sistema, informada por harness.mjs
    if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /rgba?\(/.test(line)) offenders.push(`${base}:${i + 1} color literal`);
    if (/\b[a-z-]+-\[[^\]]+\]/.test(line)) offenders.push(`${base}:${i + 1} valor arbitrario de Tailwind`);
  });
}
check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

// ---------- 2. Servidor de vista previa ----------
const server = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--port", "4173", "--strictPort"], { cwd: ROOT });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error("vite preview no arrancó")), 30000);
  server.stdout.on("data", (d) => { if (String(d).includes("4173")) { clearTimeout(t); res(); } });
  server.stderr.on("data", (d) => { if (/in use|error/i.test(String(d))) { clearTimeout(t); rej(new Error(String(d))); } });
});

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const inPage = (fn, arg) => page.evaluate(fn, arg);
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.goto("http://localhost:4173/#/dev/tokens", { waitUntil: "networkidle" });
  await inPage(() => document.fonts.ready);

  // ---------- 3. Cada token resuelto en el navegador ----------
  const groups = ["color", "spacing", "radius", "shadow", "border", "size", "duration", "easing", "zIndex"];
  const expected = groups.flatMap((g) => tokens[g].tokens.map((t) => [t.name, t.value]));
  const resolved = await inPage((names) => {
    const cs = getComputedStyle(document.documentElement);
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(`--${n}`).trim()]));
  }, expected.map(([n]) => n));
  // El minificador reescribe 0.16 → .16 y 120ms → .12s: se compara por valor, no por texto.
  const norm = (v) => String(v).toLowerCase()
    .replace(/(\d*\.?\d+)ms\b/g, (_, n) => `${parseFloat(n) / 1000}s`)
    .replace(/\d*\.?\d+/g, (n) => String(parseFloat(n)))
    .replace(/\s+/g, " ").trim();
  const mismatches = expected.filter(([n, v]) => {
    if (v === "{navy}") return norm(resolved[n]) !== norm(resolved["navy"]);
    return norm(resolved[n]) !== norm(v);
  }).map(([n, v]) => `${n}: json=${v} css=${resolved[n]}`);
  check(`${expected.length} tokens de tokens.json iguales en el navegador`, mismatches.length === 0, mismatches.join("; "));

  // ---------- 4. Tailwind resuelve a los tokens ----------
  const probe = await page.locator("[data-tw-probe]").evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, fg: s.color, shadow: s.boxShadow, font: s.fontFamily, radius: s.borderRadius, pad: s.paddingTop };
  });
  check("Tailwind bg-gold → --gold", probe.bg === "rgb(184, 146, 75)", probe.bg);
  check("Tailwind text-navy → --navy", probe.fg === "rgb(27, 42, 74)", probe.fg);
  check("Tailwind shadow-brutal → --shadow-md", /4px 4px 0px/.test(probe.shadow), probe.shadow);
  check("Tailwind rounded-md → --radius-md (10px)", probe.radius === "10px", probe.radius);
  check("Tailwind p-4 → --space-4 (16px)", probe.pad === "16px", probe.pad);
  check("Tailwind font-display → Fraunces", probe.font.startsWith("Fraunces"), probe.font);

  // ---------- 5. Fuentes cargadas de verdad ----------
  const fonts = await inPage(() => ({
    fraunces: document.fonts.check('800 40px "Fraunces"'),
    inter: document.fonts.check('600 14px "Inter"'),
  }));
  check("Fraunces cargada", fonts.fraunces);
  check("Inter cargada", fonts.inter);

  // ---------- 6. Color muestreado sobre el render ----------
  const shot = await page.screenshot({ fullPage: true, path: join(OUT, "paso1-tokens-1440.png") });
  const boxes = await page.locator("[data-token]").evaluateAll((els) => els.map((el) => {
    const r = el.querySelector("[data-swatch]").getBoundingClientRect();
    return { name: el.dataset.token, expected: el.dataset.expected, x: Math.round(r.left + r.width / 2 + scrollX), y: Math.round(r.top + r.height / 2 + scrollY) };
  }));
  const sampled = await inPage(async ({ b64, boxes }) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    return boxes.map((b) => ({ ...b, rgb: Array.from(ctx.getImageData(b.x, b.y, 1, 1).data.slice(0, 3)) }));
  }, { b64: shot.toString("base64"), boxes });
  const hex = (s) => { const m = s.match(/^#([0-9a-f]{6})$/i); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
  const pix = Object.fromEntries(sampled.map((s) => [s.name, s.rgb]));
  const drift = sampled.filter((s) => hex(s.expected)).filter((s) => {
    const e = hex(s.expected);
    return s.rgb.some((v, i) => Math.abs(v - e[i]) > 2);
  }).map((s) => `${s.name}: esperado ${s.expected} renderizado rgb(${s.rgb})`);
  check("Colores opacos renderizados = token (±2)", drift.length === 0, drift.join("; "));

  // ---------- 7. Contraste de los pares del brand book, con píxeles del render ----------
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const pairs = [["navy", "ivory", 4.5], ["navy", "paper", 4.5], ["navy", "gold", 4.5], ["gold-ink", "ivory", 4.5], ["gold-ink", "paper", 4.5],
    ["sage-ink", "sage-soft", 4.5], ["muted", "ivory-deep", 4.5], ["charcoal", "ivory", 4.5], ["burgundy", "burgundy-soft", 4.5], ["ivory", "burgundy", 4.5],
    ["navy", "gold-soft", 4.5], ["ivory", "navy", 7], ["navy", "paper", 7]];
  for (const [fg, bg, min] of pairs) {
    const r = ratio(pix[fg], pix[bg]);
    check(`Contraste ${fg} sobre ${bg} ≥ ${min}:1`, r >= min, `${r.toFixed(2)}:1`);
  }
  // Prohibición del brand book: gold como texto sobre ivory no llega.
  const goldOnIvory = ratio(pix["gold"], pix["ivory"]);
  check("gold como texto sobre ivory sigue prohibido (< 4.5:1 → se usa gold-ink)", goldOnIvory < 4.5, `${goldOnIvory.toFixed(2)}:1`);

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ fullPage: true, path: join(OUT, "paso1-tokens-1024.png") });

  check("Consola sin errores ni avisos", consoleErrors.length === 0, consoleErrors.join(" | "));
} finally {
  await browser.close();
  server.kill();
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "OK   " : "FALLA"} ${r.name}${r.detail ? "  — " + r.detail : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} comprobaciones superadas`);
process.exit(failed ? 1 : 0);
