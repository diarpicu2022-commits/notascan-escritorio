// Paso 5a · verificación medida de las pantallas del Docente.
// 1) Fidelidad: cada ruta del docente contra NotaScanApp original en la misma ruta (DOM y píxeles
//    del área principal y del menú). 2) Flujos con teclado y ratón. 3) Contraste. 4) Consola y anchos.
import { join } from "node:path";
import { DS, DS_LITERALS, OUT, URL_BASE, checkOverflow, createReport, findOffSystemValues, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";
import { applyAmendments } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));
console.log(`NOTA  Literales del sistema aceptados como excepción: ${DS_LITERALS.join(", ") || "ninguno"}`);

async function openReference(ctx, hash) {
  const ref = await ctx.newPage();
  const cons = watchConsole(ref);
  await ref.goto(URL_BASE + "#/dev/tokens", { waitUntil: "networkidle" });
  await ref.evaluate(() => {
    document.head.querySelectorAll("style,link[rel=stylesheet]:not([href*=fonts])").forEach((n) => n.remove());
    const m = document.createElement("div"); m.id = "ref"; document.body.replaceChildren(m);
  });
  await ref.addStyleTag({ path: join(DS, "css/tokens.css") });
  await ref.addStyleTag({ path: join(DS, "css/notascan.css") });
  await applyAmendments(ref);
  await ref.addScriptTag({ path: join(DS, "vendor/react.production.min.js") });
  await ref.addScriptTag({ path: join(DS, "vendor/react-dom.production.min.js") });
  await ref.evaluate((h) => history.replaceState(null, "", h), hash);
  await ref.addScriptTag({ path: join(DS, "js/notascan.js") });
  await ref.evaluate(() => ReactDOM.createRoot(document.getElementById("ref")).render(React.createElement(NotaScan.NotaScanApp)));
  return { page: ref, cons };
}

const normalize = (loc) => loc.evaluate((root) => {
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

async function pixelDiff(page, a, b) {
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

const ROUTES = [
  "#/teacher/dashboard", "#/teacher/grades", "#/teacher/review", "#/teacher/evaluations", "#/teacher/gradebook", "#/teacher/concepts",
  "#/teacher/recoveries", "#/teacher/attendance", "#/teacher/behavior", "#/teacher/students", "#/teacher/reports",
  "#/teacher/profile/20261175?tab=profile", "#/teacher/profile/20261175?tab=grades", "#/teacher/profile/20261175?tab=attendance",
  "#/teacher/profile/20261175?tab=observer", "#/teacher/profile/20261175?tab=reportcards",
];

const { browser, close } = await startPreview();
try {
  // ---------- 1. Fidelidad por ruta ----------
  for (const hash of ROUTES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const { page: ref, cons: rc } = await openReference(ctx, hash);
    const mine = await ctx.newPage();
    const mc = watchConsole(mine);
    await mine.goto(URL_BASE + hash, { waitUntil: "networkidle" });
    // La foto en proceso avanza sola: se congela el panel en ambos lados antes de comparar.
    await Promise.all([ref.waitForTimeout(1200), mine.waitForTimeout(1200)]);
    const label = hash.replace("#/teacher/", "");
    for (const [sel, part] of [[".ns-app-main", "contenido"], [".ns-sidebar", "menú"]]) {
      const frozen = ".ns-proc";
      const [r, m] = await Promise.all([normalize(ref.locator(sel)), normalize(mine.locator(sel))]);
      const strip = (x) => (label === "grades" ? x.replace(/<section [^>]*ns-proc[\s\S]*$/, "") : x);
      const [R, M] = [strip(r), strip(m)];
      let at = 0;
      while (at < R.length && R[at] === M[at]) at++;
      report.check(`${label} · ${part}: DOM idéntico al sistema`, R === M, R === M ? "" : `…${R.slice(Math.max(0, at - 60), at + 90)}… vs …${M.slice(Math.max(0, at - 60), at + 90)}…`);
      if (part === "contenido") {
        const mask = label === "grades" ? [ref.locator(frozen), mine.locator(frozen)] : [];
        const a = await ref.locator(sel).screenshot({ animations: "disabled", mask: mask.slice(0, 1) });
        const b = await mine.locator(sel).screenshot({ animations: "disabled", mask: mask.slice(1), path: join(OUT, `paso5-docente-${label.replace(/[/?=]/g, "-")}.png`) });
        const d = await pixelDiff(mine, a, b);
        report.check(`${label} · ${part}: píxeles iguales al sistema (≤ 0.5 %)`, d.pct <= 0.5, `${d.size}, ${d.pct.toFixed(3)} %`);
      }
    }
    report.check(`${label}: consola sin errores (ambos lados)`, rc.length === 0 && mc.length === 0, [...rc, ...mc].join(" | "));
    await ctx.close();
  }

  // ---------- 2. Flujos ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);

  // Revisión → verificar → guardar.
  await page.goto(URL_BASE + "#/teacher/review", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const verifiedTile = () => page.locator(".ns-bento-tile--sage .ns-bento-value").textContent();
  const before = await verifiedTile();
  await page.getByRole("button", { name: "Confirmar calificación de Valentina Guerrero" }).click();
  await page.waitForTimeout(900);
  report.check("Confirmar una tarjeta sube las verificadas del resumen (1 → 2)", before === "1" && (await verifiedTile()) === "2", `${before} → ${await verifiedTile()}`);
  await page.getByRole("button", { name: /Requiere revisión/ }).click();
  report.check("Filtro «Requiere revisión» deja solo esas tarjetas", (await page.locator(".ns-card").count()) === (await page.locator(".ns-card--needs-review").count()));
  await page.getByRole("button", { name: /^Todas/ }).click();
  await page.getByRole("button", { name: "Confirmar y guardar" }).click();
  const dlgTitle = await page.locator("[role=alertdialog] .ns-dialog-title").textContent();
  report.check("Guardar abre la confirmación con el recuento", dlgTitle === "¿Confirmar 2 calificaciones?", dlgTitle);
  report.check("La confirmación avisa de las pendientes", (await page.locator("[role=alertdialog] .ns-badge").textContent()) === "7 sin verificar quedarán pendientes");
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Confirmar y guardar" }).click();
  await page.waitForTimeout(1100);
  report.check("Tras guardar aparece el aviso «2 calificaciones guardadas»", (await page.locator(".ns-toast-title").textContent()) === "2 calificaciones guardadas");
  await page.getByRole("searchbox").fill("zzz");
  report.check("Búsqueda sin coincidencias muestra el vacío con salida", (await page.locator(".ns-empty-title").textContent()) === "No hay calificaciones con este filtro.");

  // Planilla con teclado.
  await page.goto(URL_BASE + "#/teacher/gradebook", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  report.check("La planilla enfoca la primera celda", await page.evaluate(() => document.activeElement?.classList.contains("ns-gcell")));
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  const active = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  report.check("Flechas mueven la celda activa (fila 2, Actividad 2)", /Actividad 2/.test(active), active);
  await page.keyboard.press("7");
  await page.keyboard.press("Enter");
  const err = await page.locator(".ns-gb-status").textContent();
  report.check("Escribir 7 + Enter muestra el error del sistema y no guarda", err.includes("La calificación debe estar entre 1.0 y 5.0."), err);
  await page.keyboard.press("Escape");
  await page.keyboard.press("4");
  await page.keyboard.press("Enter");
  const ok = await page.locator(".ns-gb-status").textContent();
  report.check("Escribir 4 + Enter guarda y baja de fila", /Guardado · .*Actividad 2: 4\.0/.test(ok), ok);
  await page.locator(".ns-conn-pill").click();
  await page.getByRole("switch").click();
  await page.locator(".ns-conn-pill").click();
  await page.locator(".ns-gcell").nth(0).dblclick();
  await page.keyboard.type("3.5");
  await page.keyboard.press("Enter");
  report.check("Sin conexión: el cambio queda pendiente (punto + contador en la píldora)",
    (await page.locator(".ns-gcell-dot").count()) === 1 && (await page.locator(".ns-conn-pill .ns-chip-count").textContent()) === "1");

  // Conceptos con IA: borrador → aprobar.
  await page.goto(URL_BASE + "#/teacher/concepts", { waitUntil: "networkidle" });
  const third = page.locator(".ns-concept").nth(2);
  await third.getByRole("button", { name: "Sugerir con IA" }).click();
  await page.waitForTimeout(900);
  report.check("Sugerir con IA deja un borrador marcado «Borrador de IA · revisar»", (await third.locator(".ns-badge").textContent()) === "Borrador de IA · revisar" && (await third.locator("textarea").inputValue()).length > 40);
  await third.getByRole("button", { name: "Aprobar borrador" }).click();
  report.check("Aprobar el borrador lo marca «Revisado»", (await third.locator(".ns-badge").textContent()) === "Revisado");
  await page.getByRole("button", { name: "Enviar a boletines" }).click();
  report.check("Enviar con conceptos sin revisar avisa cuántos faltan", /^Faltan \d+ conceptos por revisar$/.test(await page.locator("[role=alertdialog] .ns-dialog-title").textContent()));
  await page.keyboard.press("Escape");

  // Recuperaciones: la nota original se conserva.
  await page.goto(URL_BASE + "#/teacher/recoveries", { waitUntil: "networkidle" });
  const rec = page.locator("tbody tr").nth(2);
  await rec.locator("input").fill("3.4");
  report.check("Recuperación 3.4 → «Aprobada» conservando la original", (await rec.locator(".ns-badge").first().textContent()) === "Aprobada" && /original \d\.\d conservada/.test(await rec.locator(".ns-col .ns-caption").textContent()));
  await rec.locator("input").fill("9");
  report.check("Recuperación 9 → «Revisar» y Guardar deshabilitado", (await rec.locator(".ns-badge").first().textContent()) === "Revisar" && await rec.getByRole("button", { name: "Guardar" }).isDisabled());

  // Asistencia con atajos.
  await page.goto(URL_BASE + "#/teacher/attendance", { waitUntil: "networkidle" });
  const row2 = page.locator(".ns-att-row").nth(1);
  await row2.getByRole("radio", { name: /Presente/ }).focus();
  await page.keyboard.press("t");
  report.check("Tecla T marca «Tarde»", (await row2.getByRole("radio", { name: /Tarde/ }).getAttribute("aria-checked")) === "true");
  const saveBtn = page.locator(".ns-sticky-cta .ns-btn");
  report.check("Guardar bloqueado mientras falten filas", await saveBtn.isDisabled() && /^Faltan \d+ por marcar$/.test(await saveBtn.textContent()));
  await page.getByRole("button", { name: "Marcar el resto como presentes" }).click();
  await saveBtn.click();
  report.check("Marcar el resto y guardar confirma con aviso", (await page.locator(".ns-toast-title").textContent()) === "Asistencia guardada");

  // Comportamiento: validación y alta.
  await page.goto(URL_BASE + "#/teacher/behavior", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Agregar observación" }).click();
  const errs = await page.locator(".ns-field-error").allTextContents();
  report.check("Agregar vacío muestra los errores del sistema", errs.join("|") === "Selecciona un estudiante.|Escribe un título breve.", errs.join(" | "));
  await page.getByRole("combobox", { name: /^Estudiante/ }).selectOption({ index: 1 });
  await page.getByRole("textbox", { name: /^Título/ }).fill("Ayudó a un compañero");
  await page.getByRole("button", { name: "Redactar con IA" }).click();
  await page.waitForTimeout(1000);
  report.check("Redactar con IA propone una descripción editable", (await page.getByRole("textbox", { name: "Descripción" }).inputValue()).includes("se destacó durante la clase"));
  await page.getByRole("button", { name: "Agregar observación" }).click();
  report.check("La observación nueva aparece primera en el observador", (await page.locator(".ns-tl-item strong").first().textContent()) === "Ayudó a un compañero");

  // Perfil: pestañas por teclado y permisos.
  await page.goto(URL_BASE + "#/teacher/profile/20261175?tab=profile", { waitUntil: "networkidle" });
  report.check("El docente no ve la pestaña «Información» (datos sensibles)", (await page.getByRole("tab", { name: "Información" }).count()) === 0);
  await page.goto(URL_BASE + "#/teacher/profile/20261175?tab=attendance");
  await page.waitForTimeout(200);
  report.check("Cambiar ?tab= en la ruta abre esa pestaña (corrección respecto al sistema)", (await page.getByRole("tab", { name: "Asistencia" }).getAttribute("aria-selected")) === "true");
  await page.goto(URL_BASE + "#/teacher/profile/20261175?tab=profile");
  await page.waitForTimeout(200);
  await page.getByRole("tab", { name: "Resumen" }).focus();
  await page.keyboard.press("ArrowRight");
  report.check("Flecha derecha pasa a «Calificaciones»", (await page.getByRole("tab", { name: "Calificaciones" }).getAttribute("aria-selected")) === "true" && (await page.locator("table.ns-table").count()) === 1);

  // ---------- 3. Contraste ----------
  const checks = [
    ["#/teacher/dashboard", ".ns-home-hero-title", "título del bloque navy"],
    ["#/teacher/dashboard", ".ns-home-hero-meta", "detalle del bloque navy"],
    ["#/teacher/dashboard", ".ns-home-stat .ns-bento-label >> nth=0", "etiqueta de cifra"],
    ["#/teacher/evaluations", ".ns-eval-weight >> nth=0", "peso de evaluación"],
    ["#/teacher/evaluations", ".ns-weight-seg >> nth=0", "segmento de pesos"],
    ["#/teacher/gradebook", ".ns-gb thead th >> nth=1", "cabecera de planilla"],
    ["#/teacher/gradebook", ".ns-gcell.is-low >> nth=0", "nota baja en planilla"],
    ["#/teacher/gradebook", ".ns-gb-keys", "atajos"],
    ["#/teacher/concepts", ".ns-ai-banner", "aviso de IA"],
    ["#/teacher/concepts", ".ns-concept-grade >> nth=0", "nota del concepto"],
    ["#/teacher/recoveries", ".ns-orig >> nth=0", "nota original"],
    ["#/teacher/attendance", ".ns-att-btn.is-on >> nth=0", "estado de asistencia marcado"],
    ["#/teacher/behavior", ".ns-tl-type >> nth=0", "tipo de anotación"],
    ["#/teacher/reports", ".ns-report-text >> nth=0", "texto de reporte en navy"],
    ["#/teacher/profile/20261175?tab=profile", ".ns-big-ivory", "promedio del perfil (cifra que decide, AAA)", 7],
    ["#/teacher/profile/20261175?tab=profile", ".ns-profile-grid .ns-block--navy > span:last-child", "texto --ivory-deep sobre navy (enmienda 1b)"],
    ["#/teacher/profile/20261175?tab=reportcards", ".ns-paper-concept td >> nth=0", "concepto del boletín"],
  ];
  for (const [hash, sel, label, min = 4.5] of checks) {
    await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ ${min}:1`, r.ratio >= min, `${r.ratio.toFixed(2)}:1`);
  }

  // ---------- 4. Anchos ----------
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const hash of ROUTES.slice(0, 11)) {
    await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    checkOverflow(report, hash, over);
  }
  // Enmienda 2a: la planilla se desplaza dentro de su caja y sigue entera y operable a 1024 px.
  await page.goto(URL_BASE + "#/teacher/gradebook", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const gb = await page.locator(".ns-gb-wrap").evaluate((el) => ({ cw: el.clientWidth, sw: el.scrollWidth }));
  report.check("Planilla a 1024 px: la tabla se desplaza dentro de su caja", gb.sw > gb.cw, `${gb.sw}px de tabla en ${gb.cw}px de caja`);
  const inView = () => page.evaluate(() => {
    const a = document.activeElement.getBoundingClientRect(), w = document.querySelector(".ns-gb-wrap").getBoundingClientRect();
    const st = document.querySelector(".ns-gb thead .ns-gb-sticky").getBoundingClientRect().width;
    return a.right <= w.right + 1 && a.left >= w.left + st - 1;
  });
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
  report.check("Planilla a 1024 px: con flechas la celda activa se desplaza a la vista (Actitudinal)", await inView());
  await page.screenshot({ path: join(OUT, "paso5-docente-gradebook-1024-derecha.png") });
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  report.check("Planilla a 1024 px: al volver, la celda no queda bajo la columna fija (Actividad 1)", await inView());
  await page.screenshot({ path: join(OUT, "paso5-docente-gradebook-1024.png") });
  await page.goto(URL_BASE + "#/teacher/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const stats = await page.locator(".ns-home-stat").evaluateAll((els) => els.map((e) => e.scrollWidth - e.clientWidth));
  report.check("Dashboard a 1024 px: ninguna cifra se sale de su bloque", stats.every((x) => x <= 0), stats.join(", "));
  await page.screenshot({ path: join(OUT, "paso5-docente-dashboard-1024.png") });
  await page.goto(URL_BASE + "#/teacher/review", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ fullPage: true, path: join(OUT, "paso5-docente-review-1024.png") });
  report.check("Consola de la app sin errores ni avisos en los flujos", cons.length === 0, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
