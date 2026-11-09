// Fuentes empaquetadas (multiplataforma, 2026-11-08).
// 1. Sin internet, Fraunces e Inter cargan desde la app y ninguna petición sale a Google.
// 2. Lo que se ve es igual a la versión anterior, que las pedía a Google Fonts (comparación de píxeles).
// Requiere `npm run build:demo` antes.
import { PNG } from "pngjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createReport, startPreview, watchConsole, URL_BASE, OUT } from "./harness.mjs";

const GOOGLE_CSS = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@400;500;600;700;800&display=swap";
const SCREENS = ["#/login", "#/teacher/dashboard", "#/admin/dashboard", "#/principal/dashboard"];
const report = createReport();
const { browser, close } = await startPreview();

async function shot(mode, hash) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const external = [];
  const cons = watchConsole(page);
  await page.route("**/*", (route) => {
    const url = route.request().url();
    const local = url.startsWith("http://localhost:4173/");
    if (mode === "ahora") {
      if (!local) { external.push(url); return route.abort(); } // sin internet
      return route.continue();
    }
    // «antes»: las fuentes de la app no existen y se piden a Google, como hasta hoy.
    // «sin-fuentes»: control, ni las de la app ni las de Google (lo que vería un equipo sin internet antes del cambio).
    if (local && url.endsWith(".woff2")) return route.abort();
    if (!local) external.push(url);
    if (mode === "sin-fuentes" && !local) return route.abort();
    return route.continue();
  });
  if (mode !== "ahora") await page.addInitScript((href) => {
    document.addEventListener("DOMContentLoaded", () => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
    });
  }, GOOGLE_CSS);
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const faces = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")));
  const png = await page.screenshot({ animations: "disabled" });
  await ctx.close();
  return { png, faces, external, cons };
}

for (const hash of SCREENS) {
  const ahora = await shot("ahora", hash);
  const antes = await shot("antes", hash);
  const name = hash.replace(/[#/]+/g, "-").replace(/^-/, "");
  report.check(`${hash}: sin internet carga Fraunces`, ahora.faces.includes("Fraunces"), ahora.faces.join(", "));
  report.check(`${hash}: sin internet carga Inter`, ahora.faces.includes("Inter"));
  const fontReq = ahora.external.filter((u) => /fonts\.(googleapis|gstatic)/.test(u));
  report.check(`${hash}: ninguna petición a Google Fonts`, fontReq.length === 0, fontReq.slice(0, 2).join(" "));
  report.check(`${hash}: consola sin errores de fuentes`, !ahora.cons.some((m) => /font|woff/i.test(m)), ahora.cons.filter((m) => /font|woff/i.test(m)).join(" | "));

  report.check(`${hash}: control «antes» descarga las fuentes de Google`, antes.external.some((u) => /fonts\.gstatic\.com/.test(u)) && antes.faces.includes("Fraunces"));
  const pctOf = (x, y) => { const p = PNG.sync.read(x), q = PNG.sync.read(y); let n = 0;
    for (let i = 0; i < p.data.length; i += 4) if (Math.max(Math.abs(p.data[i] - q.data[i]), Math.abs(p.data[i + 1] - q.data[i + 1]), Math.abs(p.data[i + 2] - q.data[i + 2])) > 24) n++;
    return (100 * n) / (p.width * p.height); };
  const control = await shot("sin-fuentes", hash);
  const pctControl = pctOf(antes.png, control.png);
  report.check(`${hash}: control sin fuentes sí se detecta como distinto`, pctControl > 0.5, `${pctControl.toFixed(2)} % distinto`);
  const a = PNG.sync.read(antes.png), b = PNG.sync.read(ahora.png);
  let diff = 0;
  const out = new PNG({ width: a.width, height: a.height });
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    const hit = d > 24;
    if (hit) diff++;
    out.data[i] = hit ? 255 : a.data[i] * 0.3 + 178; out.data[i + 1] = hit ? 0 : a.data[i + 1] * 0.3 + 178;
    out.data[i + 2] = hit ? 0 : a.data[i + 2] * 0.3 + 178; out.data[i + 3] = 255;
  }
  const pct = (100 * diff) / (a.width * a.height);
  writeFileSync(join(OUT, `fuentes-${name}-ahora.png`), ahora.png);
  writeFileSync(join(OUT, `fuentes-${name}-diferencia.png`), PNG.sync.write(out));
  // Tolerancia 0,2 %: la versión de Google y la de Fontsource son el mismo archivo variable, pero Google puede servir
  // una revisión distinta y el suavizado varía en bordes de letra.
  report.check(`${hash}: igual a la versión con Google Fonts`, pct <= 0.2, `${pct.toFixed(3)} % de píxeles distintos`);
}

await close();
process.exit(report.print() ? 1 : 0);
