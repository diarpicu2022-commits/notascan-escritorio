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
  const btn = page.locator(".ns-sidebar-foot").getByRole("button", { name: "Preferences" });
  report.check(`${role}: fila Preferences en el pie de la barra lateral`, (await btn.count()) === 1);
  const over = await page.locator(".ns-sidebar-user").evaluate((el) => el.scrollWidth - el.clientWidth);
  report.check(`${role}: el pie de la barra lateral no se desborda`, over <= 0, `${over}px`);
  // Encontrado en el paso 2: el botón Preferencias le quita espacio al nombre, que se corta con «…».
  const name = await page.locator(".ns-sidebar-user .ns-profile-name").evaluate((el) => ({ need: el.scrollWidth, has: el.clientWidth, text: el.textContent }));
  report.check(`${role}: el nombre de la persona se lee entero junto a los botones`, name.need <= name.has, `${name.text}: necesita ${name.need}px, tiene ${name.has}px`);
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

// 6. Paso 2 · Marco común: barra lateral, herramientas, búsqueda, conexión y avisos en cada idioma.
const FRAME = {
  en: { nav: { teacher: "Grades", admin: "Report cards", principal: "Analytics" }, chip: { teacher: "Teacher", admin: "Administration", principal: "Principal" },
    search: "Search student…", conn: "Online", logout: "Sign out", syncNow: "Sync now", results: /^Students · \d+$/, link: "Grades", cancel: "Cancel" },
  pt: { nav: { teacher: "Notas", admin: "Boletins", principal: "Análises" }, chip: { teacher: "Docente", admin: "Administração", principal: "Direção" },
    search: "Buscar estudante…", conn: "Conectado", logout: "Sair", syncNow: "Sincronizar agora", results: /^Estudantes · \d+$/, link: "Notas", cancel: "Cancelar" },
};
// Español del marco que no debe quedar en inglés ni en portugués. No cuentan lo del colegio (I6): nombres, cursos,
// materias, colegio y año lectivo de la demostración.
const SPANISH_FRAME = {
  en: /\b(Navegación|Calificaciones|Planilla|Conceptos|Recuperaciones|Asistencia|Comportamiento|Estudiantes|Reportes|Boletines|Matrículas|Usuarios|Periodos|Analítica|Solicitudes|Observador|Cerrar sesión|Buscar estudiante|Conectado|Periodo|Año lectivo|Institución|Secretaría|Rectoría|Administración|Docente|Rector)\b/,
  pt: /\b(Navegación|Calificaciones|Planilla|Conceptos|Recuperaciones|Asistencia|Estudiantes|Reportes|Boletines|Usuarios|Periodos|Analítica|Solicitudes|Observador|Cerrar sesión|Buscar estudiante|Periodo|Año lectivo|Institución|Secretaría|Rectoría|Administración|Rector)\b/,
};
for (const lang of ["en", "pt"]) {
  const f = FRAME[lang];
  for (const role of ["teacher", "admin", "principal"]) {
    for (const width of [1024, 1440]) {
      const { ctx, page, cons } = await open(lang, "es-CO", `#/${role}/dashboard`, width);
      const tag = `${lang} · ${role} a ${width}px`;
      if (width === 1440) {
        report.check(`${tag}: menú en su idioma («${f.nav[role]}»)`, (await page.locator(".ns-sidebar nav").getByText(f.nav[role], { exact: true }).count()) === 1);
        report.check(`${tag}: chip de rol «${f.chip[role]}»`, ((await page.locator(".ns-role-chip").textContent()) ?? "").trim() === f.chip[role]);
        report.check(`${tag}: búsqueda «${f.search}»`, ((await page.locator(".ns-gsearch-trigger span").textContent()) ?? "") === f.search);
        report.check(`${tag}: cerrar sesión «${f.logout}»`, (await page.locator(".ns-sidebar-user").getByRole("button", { name: f.logout }).count()) === 1);
        if (role === "teacher") report.check(`${tag}: conexión «${f.conn}»`, ((await page.locator(".ns-conn-pill > span:not(.ns-dot):not(.ns-chip-count)").first().textContent()) ?? "") === f.conn);
        const text = (await page.locator(".ns-sidebar").innerText()) + "\n" + (await page.locator(".ns-app-tools").innerText());
        const hit = text.match(SPANISH_FRAME[lang]);
        report.check(`${tag}: sin español suelto en el marco`, !hit, hit ? `«${hit[0]}»` : "");
        await page.screenshot({ path: join(OUT, `i18n-marco-${lang}-${role}.png`) });
      }
      // Recortes: ítems del menú, chip, búsqueda y píldora de conexión.
      const clipped = await page.locator(".ns-nav-item > span:not([aria-hidden]), .ns-role-chip, .ns-gsearch-trigger span, .ns-conn-pill, .ns-sidebar-course span, .ns-profile-role").evaluateAll((els) =>
        els.filter((el) => el.offsetParent && el.scrollWidth - el.clientWidth > 1).map((el) => el.textContent.trim().slice(0, 30)));
      report.check(`${tag}: ningún texto del marco recortado`, clipped.length === 0, clipped.join(" | "));
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      checkOverflow(report, `#/${role}/dashboard (${lang})`, over, width);
      report.check(`${tag}: consola limpia`, cons.length === 0, cons.join(" | "));
      await ctx.close();
    }
  }

  // Búsqueda global (Ctrl + K) y conexión del docente.
  {
    const { ctx, page, cons } = await open(lang, "es-CO", "#/teacher/dashboard");
    await page.keyboard.press("Control+k");
    const dlg = page.getByRole("dialog", { name: lang === "en" ? "Student search" : "Busca de estudantes" });
    report.check(`${lang}: Ctrl + K abre la búsqueda con su nombre traducido`, await dlg.isVisible());
    await page.keyboard.type("7A");
    await page.waitForTimeout(150);
    const head = ((await dlg.locator(".ns-overline").first().textContent()) ?? "").trim();
    report.check(`${lang}: resultados «${head}»`, f.results.test(head), head);
    report.check(`${lang}: accesos de la vista previa traducidos («${f.link}»)`, (await dlg.locator(".ns-gs-links").getByRole("button", { name: f.link, exact: true }).count()) === 1);
    const hit = (await dlg.innerText()).match(SPANISH_FRAME[lang]);
    report.check(`${lang}: sin español suelto en la búsqueda`, !hit, hit ? `«${hit[0]}»` : "");
    if (lang === "pt") await page.screenshot({ path: join(OUT, "i18n-busqueda-pt.png") });
    await page.keyboard.press("Escape");
    await page.locator(".ns-conn-pill").click();
    const pop = page.getByRole("dialog", { name: lang === "en" ? "Sync status" : "Estado da sincronização" });
    report.check(`${lang}: el panel de conexión abre con su nombre`, await pop.isVisible());
    report.check(`${lang}: botón «${f.syncNow}»`, (await pop.getByRole("button", { name: f.syncNow }).count()) === 1);
    const popHit = (await pop.innerText()).match(/Última sincronización|Sincronizar ahora|Trabajar sin conexión|cambios? pendientes?/);
    report.check(`${lang}: sin español suelto en el panel de conexión`, lang === "pt" ? !/Sincronizar ahora|Trabajar sin conexión|cambios? pendientes?/.test(await pop.innerText()) : !popHit, popHit ? `«${popHit[0]}»` : "");
    report.check(`${lang}: consola limpia (búsqueda y conexión)`, cons.length === 0, cons.join(" | "));
    await ctx.close();
  }

  // Piezas comunes en la vista de componentes: diálogos de confirmación, avisos y punto de estado.
  {
    const { ctx, page, cons } = await open(lang, "es-CO", "#/dev/components");
    report.check(`${lang}: botón «${f.cancel}» en las confirmaciones`, (await page.getByRole("button", { name: f.cancel, exact: true }).count()) >= 1);
    const closeNotice = lang === "en" ? "Close notice" : "Fechar aviso";
    report.check(`${lang}: cerrar aviso «${closeNotice}»`, (await page.getByRole("button", { name: closeNotice }).count()) >= 1);
    report.check(`${lang}: ningún «Cerrar aviso» en español`, (await page.getByRole("button", { name: "Cerrar aviso" }).count()) === 0);
    report.check(`${lang}: consola limpia (componentes)`, cons.length === 0, cons.join(" | "));
    await ctx.close();
  }
}

// En español el marco sigue diciendo lo mismo de antes.
{
  const { ctx, page } = await open("es", "es-CO", "#/teacher/dashboard");
  const items = (await page.locator(".ns-sidebar nav .ns-nav-item > span:not([aria-hidden]):not(.ns-nav-item-count)").allTextContents()).join(", ");
  report.check("es: el menú del docente es el de siempre", items === "Dashboard, Calificaciones, Planilla, Conceptos, Recuperaciones, Asistencia, Comportamiento, Estudiantes, Reportes", items);
  report.check("es: chip «Docente» y búsqueda «Buscar estudiante…»", ((await page.locator(".ns-role-chip").textContent()) ?? "").trim() === "Docente"
    && (await page.locator(".ns-gsearch-trigger span").textContent()) === "Buscar estudiante…");
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
