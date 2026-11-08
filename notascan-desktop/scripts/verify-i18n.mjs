// Idiomas, paso 1 (anexo 2026-11-08-idiomas): infraestructura, panel Preferencias y login en tres idiomas.
// Requiere `npm run build:demo` antes.
import { createReport, startPreview, watchConsole, URL_BASE, OUT, sampleTextContrast, checkOverflow } from "./harness.mjs";
import { join } from "node:path";

const report = createReport();
const { browser, close } = await startPreview();

const EXPECT = {
  es: { title: "Iniciar sesión", submit: "Entrar", lang: "Español", prefs: "Preferencias" },
  en: { title: "Sign in", submit: "Sign in", lang: "English", prefs: "Preferences" },
  pt: { title: "Entrar", submit: "Entrar", lang: "Português", prefs: "Preferências" },
};
// Palabras que delatan español sin traducir. No cuentan las de I6 (marca, nombres de idioma, escala).
const SPANISH = /\b(Iniciar sesión|Correo|Contraseña|Recordarme|Olvidaste|Entrar como|Bienvenido|Cuenta institucional|Docente\b(?!s)|Secretaría|Rectoría|Cerrar|Preferencias|Política de tratamiento|Como el sistema|o entra con)\b/;

async function open(pref, locale = "es-CO", hash = "#/login", width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, locale, reducedMotion: "reduce" });
  if (pref) await ctx.addInitScript((p) => { try { localStorage.setItem("notascan.idioma", p); } catch {} }, pref);
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  return { ctx, page, cons };
}

// 1. Login en cada idioma.
for (const lang of ["es", "en", "pt"]) {
  for (const width of [1024, 1440]) {
    const { ctx, page, cons } = await open(lang, "es-CO", "#/login", width);
    const e = EXPECT[lang];
    if (width === 1440) {
      report.check(`${lang}: <html lang="${lang}">`, (await page.getAttribute("html", "lang")) === lang);
      report.check(`${lang}: título «${e.title}»`, (await page.locator(".ns-auth-form h2").textContent()) === e.title);
      report.check(`${lang}: botón «${e.submit}»`, (await page.locator(".ns-auth-submit").textContent()).trim() === e.submit);
      report.check(`${lang}: selector del login muestra «${e.lang}»`, await page.getByRole("button", { name: new RegExp(`: ${e.lang}$`) }).count() === 1);
      if (lang !== "es") {
        const text = await page.locator(".ns-auth").innerText();
        // «Entrar como» y «Docente» también son portugués.
        const hit = text.replace(lang === "pt" ? /Entrar como|Docente/g : /$^/, "").match(SPANISH);
        report.check(`${lang}: sin español suelto en el login`, !hit, hit ? `«${hit[0]}»` : "");
      }
      await page.screenshot({ path: join(OUT, `i18n-login-${lang}.png`) });
    }
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    checkOverflow(report, `#/login (${lang})`, over, width);
    // Textos recortados: botones y etiquetas cuyo contenido no cabe.
    const clipped = await page.locator(".ns-auth button, .ns-auth label, .ns-auth a").evaluateAll((els) =>
      els.filter((el) => el.offsetParent && (el.scrollWidth - el.clientWidth > 1)).map((el) => el.textContent.trim().slice(0, 30)));
    report.check(`${lang} a ${width}px: ningún texto recortado en el login`, clipped.length === 0, clipped.join(" | "));
    report.check(`${lang} a ${width}px: consola limpia`, cons.length === 0, cons.join(" | "));
    await ctx.close();
  }
}

// 2. «Como el sistema» según el idioma del equipo.
for (const [locale, want] of [["en-US", "en"], ["pt-BR", "pt"], ["es-CO", "es"], ["fr-FR", "es"]]) {
  const { ctx, page } = await open(null, locale);
  report.check(`Sin preferencia, equipo en ${locale} → ${want}`, (await page.getAttribute("html", "lang")) === want);
  await ctx.close();
}

// 3. Selector del login: abrir, elegir con teclado, guardar y recordar.
{
  const { ctx, page, cons } = await open(null, "es-CO");
  await page.getByRole("button", { name: /Idioma de la app: Español/ }).click();
  const dialog = page.getByRole("dialog", { name: "Preferencias" });
  report.check("El selector del login abre el panel Preferencias", await dialog.isVisible());
  const radios = dialog.getByRole("radio");
  report.check("Cuatro opciones: tres idiomas y «Como el sistema»", (await radios.count()) === 4,
    (await radios.allInnerTexts()).map((x) => x.replace(/\n/g, " / ")).join(" · "));
  report.check("Marcada «Como el sistema» (sin preferencia guardada)", (await dialog.getByRole("radio", { checked: true }).innerText()).startsWith("Como el sistema"));
  report.check("Los nombres de idioma van marcados con su idioma", (await dialog.locator("strong[lang=en]").textContent()) === "English");
  await dialog.getByRole("radio", { checked: true }).focus();
  await page.keyboard.press("ArrowUp"); // de «Como el sistema» a Português
  await page.waitForTimeout(150);
  report.check("Flecha arriba elige Português y cambia la app al instante", (await page.getAttribute("html", "lang")) === "pt"
    && (await page.getByRole("dialog").locator("h2").textContent()) === "Preferências");
  report.check("El foco sigue en la opción elegida", await page.evaluate(() => document.activeElement?.getAttribute("aria-checked") === "true"));
  const sel = page.getByRole("dialog").getByRole("radio", { checked: true });
  const c = (await sampleTextContrast(page, sel.locator("strong"))).ratio;
  report.check("Opción elegida: contraste AA del nombre", c >= 4.5, c.toFixed(2));
  const c2 = (await sampleTextContrast(page, sel.locator(".ns-caption"))).ratio;
  report.check("Opción elegida: contraste AA del saludo", c2 >= 4.5, c2.toFixed(2));
  const h = await sel.evaluate((el) => el.getBoundingClientRect().height);
  report.check("Cada opción mide al menos 44 px de alto", h >= 44, `${h}px`);
  await page.screenshot({ path: join(OUT, "i18n-panel-pt.png") });
  await page.keyboard.press("Escape");
  report.check("Escape cierra el panel", (await page.getByRole("dialog").count()) === 0);
  report.check("Se guarda en el equipo", (await page.evaluate(() => localStorage.getItem("notascan.idioma"))) === "pt");
  await page.reload({ waitUntil: "networkidle" });
  report.check("Al volver a abrir, sigue en portugués", (await page.locator(".ns-auth-form h2").textContent()) === "Entrar"
    && (await page.getAttribute("html", "lang")) === "pt");
  report.check("Consola limpia (selector)", cons.length === 0, cons.join(" | "));
  await ctx.close();
}

// 4. Preferencias desde la barra lateral, dentro de la app.
for (const role of ["teacher", "admin", "principal"]) {
  const { ctx, page, cons } = await open("en", "es-CO", `#/${role}/dashboard`);
  const btn = page.locator(".ns-sidebar-user").getByRole("button", { name: "Preferences" });
  report.check(`${role}: botón Preferences junto a cerrar sesión`, (await btn.count()) === 1);
  const over = await page.locator(".ns-sidebar-user").evaluate((el) => el.scrollWidth - el.clientWidth);
  report.check(`${role}: el pie de la barra lateral no se desborda`, over <= 0, `${over}px`);
  await btn.click();
  const dialog = page.getByRole("dialog", { name: "Preferences" });
  report.check(`${role}: abre el panel`, await dialog.isVisible());
  if (role === "teacher") await page.screenshot({ path: join(OUT, "i18n-panel-en-docente.png") });
  await dialog.getByRole("radio", { name: /^Español/ }).click();
  report.check(`${role}: elegir Español cambia el panel al instante`, (await page.getByRole("dialog").locator("h2").textContent()) === "Preferencias");
  await page.getByRole("button", { name: "Cerrar panel" }).click();
  report.check(`${role}: el botón cerrar (traducido) cierra el panel`, (await page.getByRole("dialog").count()) === 0);
  report.check(`${role}: consola limpia`, cons.length === 0, cons.join(" | "));
  await ctx.close();
}

// 5. Formatos (I5). Node 24 carga el .ts quitando los tipos.
const { formatGrade, formatDate, formatTime } = await import("../src/i18n/format.ts").catch((e) => { report.check("Se carga src/i18n/format.ts", false, String(e)); return {}; });
if (formatGrade) {
  report.check("Nota 4,5 en español", formatGrade("es", 4.5) === "4,5");
  report.check("Nota 4.5 en inglés", formatGrade("en", 4.5) === "4.5");
  report.check("Nota 4,5 en portugués", formatGrade("pt", 4.5) === "4,5");
  report.check("Nota 3 con un decimal: 3,0", formatGrade("es", 3) === "3,0");
  const d = new Date(2026, 10, 8, 15, 5);
  // La hora sigue la variante regional: Colombia y Estados Unidos en 12 h, Brasil en 24 h.
  report.check("Hora en 12 h con «p. m.» en español de Colombia", /^3:05\s?p\.\s?m\.$/.test(formatTime("es", d)), formatTime("es", d));
  report.check("Hora en 12 h en inglés", /3:05\s?PM/i.test(formatTime("en", d)), formatTime("en", d));
  report.check("Hora en 24 h en portugués de Brasil", formatTime("pt", d) === "15:05", formatTime("pt", d));
  report.check("Fecha en portugués con el mes en portugués", /nov/i.test(formatDate("pt", d)), formatDate("pt", d));
}

await close();
process.exit(report.print() ? 1 : 0);
