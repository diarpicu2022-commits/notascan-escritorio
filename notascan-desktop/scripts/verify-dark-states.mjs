// Modo oscuro · paso 5 (anexo 2026-11-08-modo-oscuro, sección 16): estados en oscuro y la ilustración del login.
//
//   npm run build:demo && npm run verify:dark-states
//
// Usa las mismas pantallas que scripts/verify-states.mjs (las lee de ese archivo) con los estados forzados de la
// demostración (?estado=cargando, ?estado=vacio, ?estado=error), con el tema oscuro guardado y a 1440 px. Mide con la
// auditoría de scripts/dark-audit.mjs: texto AA, cifras a 7:1, texto sobre dorado, superficies claras sueltas. Además:
//   - esqueletos de carga visibles pero oscuros (no se vuelven bloques claros)
//   - el sello del estado vacío y del error con su icono a 3:1
//   - dato viejo: el modo sin conexión de la píldora de conexión y su panel con la última sincronización
//   - la hoja del examen del login en claro (O5) con la nota a mano legible, y el teléfono en oscuro
//   - consola limpia
// «Sin permiso» usa el mismo EmptyState de error y solo se ve con una sesión real (verify:auth, build sin demostración):
// aquí se mide el componente, no la ruta.
// Cuatro capturas: error, vacío, carga y login, en verify-out/oscuro-estado-*.png.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, ROOT, URL_BASE, createReport, startPreview, watchConsole, contrast } from "./harness.mjs";
import { audit } from "./dark-audit.mjs";

const report = createReport();
const HASHES = [...readFileSync(join(ROOT, "scripts/verify-states.mjs"), "utf8").matchAll(/hash: "([^"]+)"/g)].map((m) => m[1]);
const DECISION = ".ns-card-grade, .ns-bento-value, .ns-kpi strong, .ns-change-big strong, .ns-donut-value, .ns-gcell, .ns-gb-avg, .ns-grade-big";
const SHOT = { "error|#/admin/students": "error", "vacio|#/teacher/review": "vacio", "cargando|#/teacher/gradebook": "cargando" };
const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const consoleLog = [];

async function open(browser, hash, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { try { localStorage.setItem("notascan.theme", "dark"); } catch {} });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  return { ctx, page, cons };
}

const { browser, close } = await startPreview();
const textFails = [], brightFails = [], decisionFails = [], goldFails = [], skel = [], seals = [];
let texts = 0, loads = 0;
try {
  for (const hash of HASHES) for (const estado of ["cargando", "vacio", "error"]) {
    const { ctx, page, cons } = await open(browser, `${hash}?estado=${estado}`);
    loads++;
    const a = await page.evaluate(audit, DECISION);
    texts += a.texts.length;
    textFails.push(...a.texts.filter((t) => t.r < t.min && !t.dim).map((t) => ({ ...t, where: `${estado} ${hash}` })));
    brightFails.push(...a.bright.filter((b) => b.area >= 1500).map((b) => ({ ...b, where: `${estado} ${hash}` })));
    decisionFails.push(...a.decision.filter((d) => d.r < 7).map((d) => ({ ...d, where: `${estado} ${hash}` })));
    goldFails.push(...a.golds.filter((g) => g.r < 4.5 || !g.dark).map((g) => ({ ...g, where: `${estado} ${hash}` })));
    if (estado === "cargando") {
      // Esqueleto: se ve contra lo que tiene detrás, pero sigue siendo oscuro.
      skel.push(...(await page.evaluate(() => {
        const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        const L = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        return [...document.querySelectorAll(".ns-skel, .ns-card--skeleton")].slice(0, 3).map((el) => {
          const own = parse(getComputedStyle(el).backgroundColor);
          let n = el.parentElement, bg = null;
          while (n && !bg) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) bg = c.slice(0, 3); n = n.parentElement; }
          return { cls: el.className, own: own.slice(0, 3), bg, lum: L(own), alpha: own[3] ?? 1 };
        });
      })).map((s) => ({ ...s, where: hash })));
    } else {
      const seal = page.locator(".ns-empty-seal").first();
      if (await seal.count()) {
        const s = await seal.evaluate((el) => {
          const parse = (x) => (x.match(/[\d.]+/g) || []).map(Number);
          return { fg: parse(getComputedStyle(el).color).slice(0, 3), bg: parse(getComputedStyle(el).backgroundColor).slice(0, 3), border: parse(getComputedStyle(el).borderTopColor).slice(0, 3) };
        });
        seals.push({ where: `${estado} ${hash}`, r: contrast(s.fg, s.bg), fg: s.fg, bg: s.bg });
      }
    }
    const shot = SHOT[`${estado}|${hash}`];
    if (shot) await page.screenshot({ path: join(OUT, `oscuro-estado-${shot}.png`), animations: "disabled" });
    consoleLog.push({ where: `${estado} ${hash}`, cons: [...cons] });
    await ctx.close();
  }

  // Dato viejo: modo sin conexión y panel con la última sincronización.
  {
    const { ctx, page, cons } = await open(browser, "#/teacher/dashboard");
    await page.locator(".ns-conn-pill").click();
    await page.getByRole("switch").first().click();
    await page.waitForTimeout(300);
    const pill = await page.locator(".ns-conn-pill").evaluate((el) => {
      const parse = (x) => (x.match(/[\d.]+/g) || []).map(Number);
      let n = el, bg = null;
      while (n && !bg) { const c = parse(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) bg = c.slice(0, 3); n = n.parentElement; }
      return { txt: el.textContent.trim(), fg: parse(getComputedStyle(el).color).slice(0, 3), bg };
    });
    const pr = contrast(pill.fg, pill.bg);
    report.check(`Dato viejo · píldora «${pill.txt}» ≥ 4.5:1`, pr >= 4.5 && /offline/i.test(pill.txt), `${pr.toFixed(2)}:1 ${hex(pill.fg)} sobre ${hex(pill.bg)}`);
    const a = await page.evaluate(audit, DECISION);
    const pop = a.texts.filter((t) => /ns-conn|Última|pendiente|offline/i.test(t.el + t.txt));
    const popBad = a.texts.filter((t) => t.r < t.min);
    report.check(`Dato viejo · panel de conexión (${pop.length} textos, con «Última sincronización») y toda la pantalla con AA`, pop.length > 0 && popBad.length === 0,
      popBad.map((t) => `${t.el} «${t.txt}» ${t.r.toFixed(2)}:1`).join("; "));
    consoleLog.push({ where: "dato viejo", cons: [...cons] });
    await ctx.close();
  }

  // Ilustración del login: la hoja es papel (en claro), el teléfono es pantalla (en oscuro).
  for (const width of [1024, 1440]) {
    const { ctx, page, cons } = await open(browser, "#/login", width);
    const ill = await page.evaluate(() => {
      const parse = (x) => (x.match(/[\d.]+/g) || []).map(Number);
      const q = (s) => document.querySelector(s);
      const sheet = q(".ns-auth-illus .a-paper rect.f-paper.s-navy"), hand = q(".ns-auth-illus .a-paper .t-hand"), screen = q(".ns-auth-illus .a-phone .f-ivory");
      return sheet && hand && screen ? { sheet: parse(getComputedStyle(sheet).fill).slice(0, 3), hand: parse(getComputedStyle(hand).fill).slice(0, 3), screen: parse(getComputedStyle(screen).fill).slice(0, 3) } : null;
    });
    if (!ill) report.check(`Login ${width} · ilustración encontrada`, false);
    else {
      report.check(`Login ${width} · la hoja del examen es papel claro (O5)`, hex(ill.sheet) === "#fffdf8", hex(ill.sheet));
      const hr = contrast(ill.hand, ill.sheet);
      report.check(`Login ${width} · la nota a mano sobre la hoja ≥ 4.5:1`, hr >= 4.5, `${hr.toFixed(2)}:1 ${hex(ill.hand)} sobre ${hex(ill.sheet)}`);
      report.check(`Login ${width} · la pantalla del teléfono sigue en oscuro`, hex(ill.screen) === "#161513", hex(ill.screen));
    }
    const a = await page.evaluate(audit, DECISION);
    const bad = a.texts.filter((t) => t.r < t.min);
    report.check(`Login ${width} · todo el texto con AA`, bad.length === 0, bad.map((t) => `${t.el} «${t.txt}» ${t.r.toFixed(2)}`).join("; "));
    if (width === 1440) await page.screenshot({ path: join(OUT, "oscuro-estado-login.png"), animations: "disabled" });
    consoleLog.push({ where: `login ${width}`, cons: [...cons] });
    await ctx.close();
  }
} finally {
  await close();
}

const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];
report.check(`Estados · ${texts} textos en ${loads} cargas (${HASHES.length} pantallas × cargando, vacío y error) con AA`, textFails.length === 0,
  uniq(textFails, (t) => t.el + t.txt).slice(0, 15).map((t) => `${t.where} ${t.el} «${t.txt}» ${t.r.toFixed(2)}:1 (${hex(t.fg)} sobre ${hex(t.bg)})`).join("; "));
report.check("Estados · cifras de decisión a 7:1", decisionFails.length === 0, uniq(decisionFails, (d) => d.el + d.txt).map((d) => `${d.where} ${d.el} «${d.txt}» ${d.r.toFixed(2)}`).join("; "));
report.check("Estados · texto sobre dorado con tinta oscura (O4)", goldFails.length === 0, uniq(goldFails, (g) => g.el + g.txt).map((g) => `${g.where} ${g.el} «${g.txt}» ${g.r.toFixed(2)}`).join("; "));
report.check("Estados · sin superficies claras sueltas mayores de 1500 px²", brightFails.length === 0, uniq(brightFails, (b) => b.el + b.where).map((b) => `${b.where} ${b.el} ${b.area}px² ${hex(b.bg)}`).join("; "));
const skelBright = skel.filter((s) => s.lum > 0.2 && s.alpha > 0.5);
const skelSeen = skel.filter((s) => s.bg && (s.alpha < 0.05 || contrast(s.own, s.bg) < 1.05));
report.check(`Carga · ${skel.length} esqueletos oscuros (luminancia ≤ 0.2) y distintos de su fondo`, skel.length > 0 && skelBright.length === 0 && skelSeen.length === 0,
  [...skelBright, ...skelSeen].map((s) => `${s.where} ${s.cls} ${hex(s.own)} sobre ${s.bg ? hex(s.bg) : "?"}`).join("; "));
const sealBad = seals.filter((s) => s.r < 3);
const sealMin = seals.length ? Math.min(...seals.map((s) => s.r)) : 0;
report.check(`Vacío y error · ${seals.length} sellos con el icono a 3:1 (el más bajo ${sealMin.toFixed(2)})`, seals.length > 0 && sealBad.length === 0,
  uniq(sealBad, (s) => s.where).map((s) => `${s.where} ${s.r.toFixed(2)}:1 ${hex(s.fg)} sobre ${hex(s.bg)}`).join("; "));
const noisy = consoleLog.filter((c) => c.cons.length);
report.check(`Consola sin errores ni avisos en ${consoleLog.length} cargas`, noisy.length === 0, noisy.slice(0, 5).map((c) => `${c.where}: ${c.cons[0]}`).join("; "));
process.exit(report.print() ? 1 : 0);
