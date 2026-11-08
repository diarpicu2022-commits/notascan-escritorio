// Idiomas (anexo 2026-11-08-idiomas): paso 1 (infraestructura, Preferencias y login), paso 2 (marco común), paso 3 (Docente) y paso 4 (Secretaría).
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

// 7. Paso 3 · Docente: todas las pantallas del docente en inglés y portugués, a 1024 y 1440 px.
{
  const ID = "20261175";
  const SCREENS = [
    ["dashboard", "#/teacher/dashboard"], ["calificar", "#/teacher/grades"], ["revision", "#/teacher/review"], ["evaluaciones", "#/teacher/evaluations"],
    ["planilla", "#/teacher/gradebook"], ["conceptos", "#/teacher/concepts"], ["recuperaciones", "#/teacher/recoveries"], ["asistencia", "#/teacher/attendance"],
    ["comportamiento", "#/teacher/behavior"], ["estudiantes", "#/teacher/students"], ["reportes", "#/teacher/reports"],
    ...["profile", "grades", "attendance", "observer", "reportcards"].map((t) => [`perfil-${t}`, `#/teacher/profile/${ID}?tab=${t}`]),
  ];
  // Palabras de interfaz en español que no deben quedar. No entran las de I6 (nombres, evaluaciones como «Parcial 2» o
  // «Examen final», materias, cursos, observaciones, conceptos, la escala) ni las que también son portuguesas.
  const COMMON = ["Calificar", "Calificaciones", "calificaciones", "calificación", "Revisión", "revisión", "Evaluaciones", "evaluaciones", "Evaluación", "evaluación",
    "Planilla", "Conceptos", "concepto", "Recuperaciones", "recuperación", "Asistencia", "asistencia", "Estudiantes", "estudiantes", "Estudiante", "Guardar",
    "Pendiente", "pendientes", "Verificadas", "verificadas", "Verificada", "Requiere", "requieren", "Promedio", "promedio", "Desempeño", "Periodo", "Buenos días",
    "Tienes", "Continúa", "Subir", "Fotografías", "fotografías", "Agregar", "Observación", "Anotaciones", "Reportes", "Generar", "Descargar", "Fecha", "Acción",
    "Resumen", "Boletines", "Observador", "Inasistencia", "Excusa", "Sin detección", "Baja confianza", "Confianza", "Nueva", "septiembre", "octubre", "Paso",
    "Atajos", "sin marcar", "Mensajes", "Recientes", "Por estudiante", "Por evaluación", "por curso", "Porcentaje", "Exámenes", "Talleres", "Actividades",
    "Borrador", "En revisión", "Cerrada", "Paz y salvo", "Al día", "Evolución", "Materia", "Sin nota", "Revisar", "Editar", "Procesando", "En espera"];
  const ONLY_EN = ["Presente", "Tarde", "tarde", "Confirmar", "Cancelar", "Todas", "Todos", "Buscar", "Formato", "Nota", "Docente", "Escala", "Mínimo", "Faltas",
    "Exportar", "Marcar", "Enviar", "Sugerir", "Continuar", "Positiva", "Informativa", "Atención", "Biblioteca", "Ver todas", "Curso", "Ver"];
  const words = (lang) => (lang === "en" ? COMMON.concat(ONLY_EN) : COMMON.filter((w) => !["Revisar", "Editar", "Procesando"].includes(w)).concat(["Curso"]));
  const spanishRe = (lang) => new RegExp(`(?<![\\p{L}])(${words(lang).join("|")})(?![\\p{L}])|\\b\\d{1,2} (sep|dic|ene|abr)\\b`, "u");
  /** Texto visible del contenido, sin lo que no se traduce: el boletín impreso (D2) y lo que escribió el colegio en el observador (I6). */
  const mainText = (page) => page.evaluate(() => {
    const root = document.querySelector(".ns-app-main").cloneNode(true);
    root.querySelectorAll(".ns-paper-scroll, .ns-tl-item strong, .ns-tl-item .ns-caption, [aria-hidden=true], .ns-marquee-track").forEach((n) => n.remove());
    const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) out.push(w.currentNode.textContent);
    // Lo que se ve dentro de los diálogos abiertos (van fuera de .ns-app-main).
    document.querySelectorAll("[role=dialog], [role=alertdialog]").forEach((d) => out.push(d.innerText));
    return out.join(" | ");
  });
  // Los rótulos solo para lectores de pantalla (.ns-sr, 1 px de ancho a propósito) no cuentan como recortados.
  const CLIP = ".ns-app-main button, .ns-app-main [role=tab], .ns-app-main .ns-badge, .ns-app-main .ns-sticker, .ns-app-main th, .ns-app-main label, .ns-app-main .ns-chip, .ns-app-main .ns-status, .ns-app-main .ns-step-label, .ns-app-main .ns-overline, .ns-app-main .ns-bento-label, [role=dialog] button, [role=alertdialog] button";
  const clippedIn = (page) => page.locator(CLIP).evaluateAll((els) => els.filter((el) => el.offsetParent && el.getClientRects().length && el.clientWidth > 1 && !el.closest(".ns-sr") && el.scrollWidth - el.clientWidth > 1)
    .map((el) => `${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 40)}» ${el.scrollWidth}>${el.clientWidth}`));
  async function measure(page, lang, tag) {
    const text = await mainText(page);
    const hit = text.match(spanishRe(lang));
    report.check(`${tag}: sin español de interfaz`, !hit, hit ? `«${hit[0]}» en …${text.slice(Math.max(0, hit.index - 50), hit.index + 40).replace(/\s+/g, " ")}…` : "");
    const clipped = await clippedIn(page);
    report.check(`${tag}: ningún botón, pestaña, insignia, encabezado o etiqueta recortado`, clipped.length === 0, clipped.join(" | "));
  }

  const DASH = {
    en: { eyebrow: /^Tuesday, September 30 · Term 3 · 2026$/, title: "Good morning, Ana Lucía", avg: "3.9", scale: "Colombia's national grading scale" },
    pt: { eyebrow: /^Terça-feira, 30 de setembro · Período 3 · 2026$/, title: "Bom dia, Ana Lucía", avg: "3,9", scale: "escala nacional de avaliação da Colômbia" },
  };
  for (const lang of ["en", "pt"]) {
    for (const width of [1024, 1440]) {
      for (const [name, hash] of SCREENS) {
        const { ctx, page, cons } = await open(lang, "es-CO", hash, width);
        await page.waitForTimeout(900); // conteos ascendentes y entrada animada
        const tag = `Docente ${lang} · ${name} a ${width}px`;
        if (width === 1440) report.check(`${tag}: <html lang="${lang}">`, (await page.getAttribute("html", "lang")) === lang);
        await measure(page, lang, tag);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        checkOverflow(report, `${hash} (${lang})`, over, width);
        if (width === 1440) {
          await page.screenshot({ path: join(OUT, `i18n-docente-${name}-${lang}.png`), fullPage: true });
          const d = DASH[lang];
          if (name === "dashboard") {
            report.check(`${tag}: fecha del encabezado en el idioma`, d.eyebrow.test(((await page.locator(".ns-header-eyebrow .ns-overline").textContent()) ?? "").trim()), await page.locator(".ns-header-eyebrow .ns-overline").textContent());
            report.check(`${tag}: saludo «${d.title}»`, ((await page.locator(".ns-header-title").textContent()) ?? "") === d.title);
            report.check(`${tag}: promedio «${d.avg}» con el separador del idioma`, (await page.locator(".ns-home-stat .ns-countup").nth(2).getAttribute("aria-label")) === d.avg
              && ((await page.locator(".ns-home-stat .ns-countup").nth(2).textContent()) ?? "") === d.avg);
          }
          if (name === "perfil-profile" || name === "conceptos") report.check(`${tag}: línea de la escala nacional (D3)`, (await page.locator(".ns-app-main").innerText()).includes(d.scale));
          if (name === "conceptos") report.check(`${tag}: aviso de que los conceptos van en español (D2)`, (await page.locator(".ns-app-main").innerText()).includes(lang === "en" ? "stay in Spanish" : "ficam em espanhol"));
          if (name === "perfil-profile" || name === "perfil-grades") report.check(`${tag}: la escala sigue sin traducir (Superior, Alto, Básico, Bajo)`, /\b(Superior|Alto|Básico|Bajo)\b/.test(await page.locator(".ns-app-main").innerText()));
        }
        report.check(`${tag}: consola limpia`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
    }

    // Diálogos y estados principales.
    const L = lang === "en"
      ? { confirm: "Confirm and save", send: "Send to report cards", newEval: "New assessment", edit: /^Edit$/, cancel: "Cancel" }
      : { confirm: "Confirmar e salvar", send: "Enviar para os boletins", newEval: "Nova avaliação", edit: /^Editar$/, cancel: "Cancelar" };
    for (const width of [1024, 1440]) {
      const { ctx, page, cons } = await open(lang, "es-CO", "#/teacher/review", width);
      await page.waitForTimeout(600);
      // Revisión: editar una tarjeta muestra el campo de nota y su escala.
      await page.locator(".ns-card:not(.ns-card--verified) .ns-card-actions button").filter({ hasText: L.edit }).first().click();
      await measure(page, lang, `Docente ${lang} · revisión editando a ${width}px`);
      if (width === 1440) await page.screenshot({ path: join(OUT, `i18n-docente-revision-editando-${lang}.png`) });
      await page.keyboard.press("Escape");
      // Confirmar guardado.
      await page.getByRole("button", { name: L.confirm }).first().click();
      const dlg = page.locator("[role=alertdialog]");
      report.check(`Docente ${lang} a ${width}px: abre la confirmación de guardado`, await dlg.isVisible());
      await measure(page, lang, `Docente ${lang} · confirmar guardado a ${width}px`);
      if (width === 1440) await page.screenshot({ path: join(OUT, `i18n-docente-confirmar-${lang}.png`) });
      await dlg.getByRole("button", { name: L.confirm }).click();
      await page.waitForTimeout(1300);
      const toast = await page.locator(".ns-toast-region").innerText().catch(() => "");
      report.check(`Docente ${lang} a ${width}px: aviso de guardado en el idioma`, toast.length > 0 && !spanishRe(lang).test(toast), toast.replace(/\n/g, " · "));
      report.check(`Docente ${lang} a ${width}px: consola limpia (revisión)`, cons.length === 0, cons.join(" | "));
      await ctx.close();

      const c2 = await open(lang, "es-CO", "#/teacher/concepts", width);
      await c2.page.getByRole("button", { name: L.send }).last().click();
      report.check(`Docente ${lang} a ${width}px: abre «enviar a boletines»`, await c2.page.locator("[role=alertdialog]").isVisible());
      await measure(c2.page, lang, `Docente ${lang} · enviar conceptos a ${width}px`);
      if (width === 1440) await c2.page.screenshot({ path: join(OUT, `i18n-docente-enviar-conceptos-${lang}.png`) });
      report.check(`Docente ${lang} a ${width}px: consola limpia (conceptos)`, c2.cons.length === 0, c2.cons.join(" | "));
      await c2.ctx.close();

      const c3 = await open(lang, "es-CO", "#/teacher/evaluations", width);
      await c3.page.getByRole("button", { name: L.newEval }).first().click();
      const drawer = c3.page.getByRole("dialog", { name: L.newEval });
      report.check(`Docente ${lang} a ${width}px: abre «${L.newEval}»`, await drawer.isVisible());
      await drawer.getByRole("button", { name: lang === "en" ? "Create assessment" : "Criar avaliação" }).click();
      await measure(c3.page, lang, `Docente ${lang} · nueva evaluación con errores a ${width}px`);
      if (width === 1440) await c3.page.screenshot({ path: join(OUT, `i18n-docente-nueva-evaluacion-${lang}.png`) });
      report.check(`Docente ${lang} a ${width}px: consola limpia (evaluaciones)`, c3.cons.length === 0, c3.cons.join(" | "));
      await c3.ctx.close();
    }
  }

  // En español no aparece nada nuevo: ni la línea de la escala ni el aviso de los conceptos.
  {
    const { ctx, page } = await open("es", "es-CO", "#/teacher/concepts");
    const text = await page.locator(".ns-app-main").innerText();
    report.check("es: conceptos sin líneas nuevas (escala y aviso D2 solo en inglés y portugués)", !/escala nacional|Decreto 1290/.test(text));
    await ctx.close();
  }
}

// 8. Paso 4 · Secretaría: todas las pantallas de Secretaría y el perfil desde Secretaría, en inglés y portugués.
{
  const ID = "20261175";
  const SCREENS = [
    ["dashboard", "#/admin/dashboard"], ["estudiantes", "#/admin/students"], ["matricula", "#/admin/enrollment"], ["importacion", "#/admin/enrollment?tab=import"],
    ["usuarios", "#/admin/users"], ["estructura", "#/admin/structure"], ["malla", "#/admin/curriculum"], ["periodos", "#/admin/periods"],
    ["boletines", "#/admin/reportcards"], ["pazysalvos", "#/admin/clearances"], ["ranking", "#/admin/ranking"],
    ...["profile", "grades", "attendance", "observer", "reportcards", "info"].map((t) => [`perfil-${t}`, `#/admin/profile/${ID}?tab=${t}`]),
  ];
  // Palabras de interfaz en español que no deben quedar. No entran las de I6 (nombres, cursos, materias, componentes
  // de la nota como «Actividades» o «Exámenes») ni las que también son portuguesas («Matrículas», «Todos», «Editar»…).
  const COMMON = ["Estudiantes", "estudiantes", "Estudiante", "Acudiente", "acudiente", "Acudientes", "Curso", "Grado", "Grados", "Periodo", "Boletines", "boletines",
    "Generar", "Pendiente", "Bloqueado", "Habilitado", "Pensiones", "Paz y salvo", "paz y salvo", "Al día", "Registrar", "Importar", "Validación", "Corregir",
    "Siguiente", "Anterior", "Guardar", "Nombre completo", "Fecha", "Correo", "Usuarios", "Rol", "Último acceso", "Docentes", "Directivos", "Asignar",
    "Asignación", "Malla", "Materia", "Materias", "Cursos", "Nivel", "Categoría", "Cupo", "Director de grupo", "Crear", "Archivar", "Retirar", "Desactivar",
    "Seleccionar", "Previsualizar", "Vista previa", "Cerrar", "Abierto", "Cerrado", "Borrador", "Pesos", "Distribución", "Promedio", "Posición", "Aprobado",
    "En riesgo", "Año lectivo", "Secretaría", "Rectoría", "Hoy", "Ayer", "Activo", "Invitación", "Sin cuenta", "Desactivado", "registros", "requieren",
    "Advertencia", "Omitir", "Detalle", "Madre", "Padre", "Tarjeta de identidad", "Básica", "Ciencias exactas", "Séptimo", "Octavo", "Tareas", "Resumen",
    "Información", "Teléfono", "Autorización", "obligatorio", "Opcional", "Sección", "Tipo de documento", "Alergias", "Parentesco", "Biblioteca"];
  const ONLY_EN = ["Destacado", "Nunca", "Todos", "Buscar", "Exportar", "Editar", "Documento", "Componente", "Duplicado", "Resultado", "Humanidades", "Sexto",
    "Acumulado anual", "Meta institucional", "Matrículas", "Matrícula", "Docente", "Mostrar", "Confirmar", "Cancelar", "Continuar"];
  // También son portuguesas y solo cuentan en inglés.
  const ALSO_PT = ["Biblioteca", "Importar", "Opcional", "Docentes", "Bloqueado", "registros", "Tipo de documento", "Anterior", "Registrar"];
  const words = (lang) => (lang === "en" ? COMMON.concat(ONLY_EN) : COMMON.filter((w) => !ALSO_PT.includes(w)));
  const spanishRe = (lang) => new RegExp(`(?<![\\p{L}_])(${words(lang).join("|")})(?![\\p{L}_])|\\b\\d{1,2} (sep|dic|ene|abr)\\b`, "u");
  /** Texto visible del contenido y de los diálogos, sin lo que no se traduce: los documentos impresos (D2) y el observador (I6). */
  const shownText = (page) => page.evaluate(() => {
    const out = [];
    for (const src of [document.querySelector(".ns-app-main"), ...document.querySelectorAll("[role=dialog], [role=alertdialog]")]) {
      if (!src) continue;
      const root = src.cloneNode(true);
      root.querySelectorAll(".ns-paper-scroll, .ns-paper, .ns-tl-item strong, .ns-tl-item .ns-caption, [aria-hidden=true], .ns-marquee-track, input, select option:not(:checked)").forEach((n) => n.remove());
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) out.push(w.currentNode.textContent);
    }
    return out.join(" | ");
  });
  // Los rótulos solo para lectores de pantalla (.ns-sr, 1 px a propósito) no cuentan como recortados.
  const CLIP = ".ns-app-main button, .ns-app-main [role=tab], .ns-app-main .ns-badge, .ns-app-main .ns-sticker, .ns-app-main th, .ns-app-main label, .ns-app-main .ns-chip, .ns-app-main .ns-step-label, .ns-app-main .ns-overline, .ns-app-main .ns-bento-label, .ns-app-main .ns-course-tag, [role=dialog] button, [role=dialog] label, [role=alertdialog] button";
  const clippedIn = (page) => page.locator(CLIP).evaluateAll((els) => els.filter((el) => el.offsetParent && el.getClientRects().length && el.clientWidth > 1 && !el.closest(".ns-sr") && el.scrollWidth - el.clientWidth > 1)
    .map((el) => `${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 40)}» ${el.scrollWidth}>${el.clientWidth}`));
  async function measure(page, lang, tag) {
    const text = await shownText(page);
    const hit = text.match(spanishRe(lang));
    report.check(`${tag}: sin español de interfaz`, !hit, hit ? `«${hit[0]}» en …${text.slice(Math.max(0, hit.index - 50), hit.index + 40).replace(/\s+/g, " ")}…` : "");
    const clipped = await clippedIn(page);
    report.check(`${tag}: ningún botón, pestaña, insignia, encabezado o etiqueta recortado`, clipped.length === 0, clipped.join(" | "));
  }
  const shot = (page, name) => page.screenshot({ path: join(OUT, `i18n-secretaria-${name}.png`) }); // tamaño de la ventana, no página completa

  for (const lang of ["en", "pt"]) {
    for (const width of [1024, 1440]) {
      for (const [name, hash] of SCREENS) {
        const { ctx, page, cons } = await open(lang, "es-CO", hash, width);
        await page.waitForTimeout(800);
        const tag = `Secretaría ${lang} · ${name} a ${width}px`;
        if (width === 1440) report.check(`${tag}: <html lang="${lang}">`, (await page.getAttribute("html", "lang")) === lang);
        await measure(page, lang, tag);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        checkOverflow(report, `${hash} (${lang})`, over, width);
        if (width === 1440) await shot(page, `${name}-${lang}`);
        report.check(`${tag}: consola limpia`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
    }

    const L = lang === "en"
      ? { next: "Next", invite: "Invite user", createAll: "Create all", preview: "Preview", saveTerm: "Save term", closed: "Closed", sample: "Use sample file", validate: "Validate file", fix: "Fix errors", grade: "7th grade", mother: /Mother|Father/, task: "Close Term 3", closeOn: /^Closing scheduled for October 15$/ }
      : { next: "Próximo", invite: "Convidar usuário", createAll: "Gerar todos", preview: "Visualizar", saveTerm: "Salvar período", closed: "Fechado", sample: "Usar arquivo de exemplo", validate: "Validar arquivo", fix: "Corrigir erros", grade: "7º ano", mother: /Mãe|Pai/, task: "Fechar Período 3", closeOn: /^Fechamento previsto para 15 de outubro$/ };
    for (const width of [1024, 1440]) {
      const big = width === 1440;
      // Inicio: la tarea de cierre con la fecha en el idioma.
      {
        const { ctx, page } = await open(lang, "es-CO", "#/admin/dashboard", width);
        const task = page.locator(".ns-list-item").filter({ hasText: L.task });
        report.check(`Secretaría ${lang} a ${width}px: tarea «${L.task}» con la fecha en el idioma`, (await task.count()) === 1 && L.closeOn.test(((await task.locator(".ns-caption").textContent()) ?? "").trim()));
        await ctx.close();
      }
      // Nueva matrícula: avanzar sin datos muestra los errores; el grado y el parentesco salen en el idioma.
      {
        const { ctx, page, cons } = await open(lang, "es-CO", "#/admin/enrollment", width);
        await page.getByRole("button", { name: L.next }).click();
        await measure(page, lang, `Secretaría ${lang} · matrícula con errores a ${width}px`);
        if (big) await shot(page, `matricula-errores-${lang}`);
        report.check(`Secretaría ${lang} a ${width}px: consola limpia (matrícula)`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
      // Importar: archivo de ejemplo → vista previa → validación → corrección.
      {
        const { ctx, page, cons } = await open(lang, "es-CO", "#/admin/enrollment?tab=import", width);
        await page.getByRole("button", { name: L.sample }).click();
        await measure(page, lang, `Secretaría ${lang} · importar vista previa a ${width}px`);
        await page.getByRole("button", { name: L.validate }).click();
        await page.waitForTimeout(1200);
        await measure(page, lang, `Secretaría ${lang} · importar validación a ${width}px`);
        if (big) await shot(page, `importar-validacion-${lang}`);
        await page.locator(".ns-reg-actions").getByRole("button", { name: L.fix }).click();
        await measure(page, lang, `Secretaría ${lang} · importar corregir a ${width}px`);
        report.check(`Secretaría ${lang} a ${width}px: consola limpia (importar)`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
      // Invitar usuario.
      {
        const { ctx, page, cons } = await open(lang, "es-CO", "#/admin/users", width);
        await page.getByRole("button", { name: L.invite }).first().click();
        await page.waitForTimeout(400); // entrada del panel
        report.check(`Secretaría ${lang} a ${width}px: abre «${L.invite}»`, await page.getByRole("dialog").isVisible());
        await measure(page, lang, `Secretaría ${lang} · invitar usuario a ${width}px`);
        if (big) await shot(page, `invitar-${lang}`);
        report.check(`Secretaría ${lang} a ${width}px: consola limpia (usuarios)`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
      // Cerrar periodo: el abierto pasa a cerrado y se guarda.
      {
        const { ctx, page, cons } = await open(lang, "es-CO", "#/admin/periods", width);
        await page.locator(".ns-period-item").nth(2).click();
        await page.locator(".ns-period-editor select").nth(1).selectOption("closed");
        await page.getByRole("button", { name: L.saveTerm }).click();
        await page.waitForTimeout(400);
        await measure(page, lang, `Secretaría ${lang} · cerrar periodo a ${width}px`);
        if (big) await shot(page, `cerrar-periodo-${lang}`);
        report.check(`Secretaría ${lang} a ${width}px: consola limpia (periodos)`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
      // Generar boletines y vista previa (el boletín sale en español, D2, y una línea lo dice).
      {
        const { ctx, page, cons } = await open(lang, "es-CO", "#/admin/reportcards", width);
        await page.getByRole("button", { name: L.createAll }).last().click();
        report.check(`Secretaría ${lang} a ${width}px: abre «${L.createAll}»`, await page.locator("[role=alertdialog]").isVisible());
        await measure(page, lang, `Secretaría ${lang} · generar boletines a ${width}px`);
        if (big) await shot(page, `generar-boletines-${lang}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300); // salida de la confirmación
        await page.getByRole("button", { name: L.preview }).first().click();
        await page.waitForTimeout(500); // entrada de la vista previa
        const dlg = page.getByRole("dialog");
        report.check(`Secretaría ${lang} a ${width}px: la vista previa está abierta al capturar`, (await page.locator(".ns-modal .ns-paper-scroll").count()) === 1);
        report.check(`Secretaría ${lang} a ${width}px: la vista previa avisa que el boletín sale en español`, (await dlg.innerText()).includes(lang === "en" ? "printed in Spanish" : "impresso em espanhol"));
        await measure(page, lang, `Secretaría ${lang} · vista previa del boletín a ${width}px`);
        if (big) await shot(page, `vista-previa-${lang}`);
        report.check(`Secretaría ${lang} a ${width}px: consola limpia (boletines)`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
      // Vista rápida de un estudiante: grado y parentesco de la lista fija en el idioma.
      {
        const { ctx, page, cons } = await open(lang, "es-CO", "#/admin/students", width);
        await page.locator(".ns-cell-link").first().click();
        const dlg = page.getByRole("dialog");
        const txt = await dlg.innerText();
        report.check(`Secretaría ${lang} a ${width}px: vista rápida con el parentesco en el idioma`, L.mother.test(txt), txt.replace(/\n/g, " · ").slice(0, 160));
        await measure(page, lang, `Secretaría ${lang} · vista rápida a ${width}px`);
        if (big) await shot(page, `vista-rapida-${lang}`);
        report.check(`Secretaría ${lang} a ${width}px: consola limpia (vista rápida)`, cons.length === 0, cons.join(" | "));
        await ctx.close();
      }
    }
    // Grado de la lista fija en el idioma (el valor guardado sigue en español).
    {
      const { ctx, page } = await open(lang, "es-CO", "#/admin/students");
      report.check(`Secretaría ${lang}: el grado se muestra «${L.grade}»`, (await page.locator(".ns-app-main td").filter({ hasText: L.grade }).count()) > 0);
      await ctx.close();
    }
  }
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
