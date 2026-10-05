// Paso 5b · verificación medida de las pantallas de Secretaría.
// 1) Fidelidad de cada ruta contra NotaScanApp original. 2) Flujos completos. 3) Contraste. 4) Anchos.
import { join } from "node:path";
import { OUT, URL_BASE, checkOverflow, compareRoute, createReport, findOffSystemValues, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

const ROUTES = ["dashboard", "students", "enrollment", "users", "structure", "curriculum", "periods", "reportcards", "clearances", "ranking", "profile/20261175?tab=info"].map((p) => "#/admin/" + p);

const { browser, close } = await startPreview();
try {
  // ---------- 1. Fidelidad ----------
  // Enmienda 5 (2026-10-05, decisión de Diego): bloque «Meta institucional» en Periodos; se compara el resto.
  const OMIT = { "#/admin/periods": "[aria-label='Meta institucional']" };
  for (const hash of ROUTES) await compareRoute(browser, report, hash, hash.replace("#/admin/", ""), "paso5-secretaria", OMIT[hash] ?? null);

  // ---------- 2. Flujos ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  const go = async (p) => { await page.goto(URL_BASE + "#/admin/" + p, { waitUntil: "networkidle" }); await page.waitForTimeout(300); };
  const toast = () => page.locator(".ns-toast-title").last().textContent();

  // Meta institucional (enmienda 5): valor por defecto, validación y guardado.
  await go("periods");
  const goalBlock = page.locator("[aria-label='Meta institucional']");
  const goalInput = goalBlock.getByLabel("Promedio esperado por grado");
  const goalSave = goalBlock.getByRole("button", { name: "Guardar meta" });
  report.check("Meta institucional: 3.5 por defecto y «Guardar meta» deshabilitado sin cambios", (await goalInput.inputValue()) === "3.5" && (await goalSave.isDisabled()));
  await goalInput.fill("6");
  report.check("Meta fuera de 1.0–5.0: error en el campo y sin guardar", (await goalBlock.locator(".ns-field-error").textContent()) === "Escribe un valor entre 1.0 y 5.0." && (await goalSave.isDisabled()));
  await goalInput.fill("3.8");
  await goalSave.click();
  report.check("Guardar la meta avisa qué verá Rectoría", (await toast()) === "Meta institucional guardada" && (await page.locator(".ns-toast-text").last().textContent()) === "Rectoría verá 3.8 como referencia en la analítica.");

  // Estudiantes: búsqueda, lote, archivar, vista rápida y perfil.
  await go("students");
  await page.getByRole("searchbox", { name: "Buscar estudiante" }).fill("López");
  const found = await page.locator("tbody tr").count();
  report.check("Buscar «López» filtra la tabla", found > 0 && found < 12, `${found} filas`);
  await page.getByRole("searchbox", { name: "Buscar estudiante" }).fill("");
  await page.locator("tbody tr").nth(0).getByRole("checkbox").check();
  await page.locator("tbody tr").nth(1).getByRole("checkbox").check();
  report.check("Seleccionar 2 abre la barra «2 seleccionados»", (await page.locator(".ns-bulkbar strong").textContent()) === "2 seleccionados");
  await page.locator(".ns-bulkbar").getByRole("button", { name: "Archivar" }).click();
  report.check("Archivar en lote pide confirmación «¿Archivar 2 estudiantes?»", (await page.locator("[role=alertdialog] .ns-dialog-title").textContent()) === "¿Archivar 2 estudiantes?");
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Archivar" }).click();
  report.check("Confirmar archiva y avisa", (await toast()) === "Registros archivados" && (await page.locator(".ns-bulkbar").count()) === 0);
  const firstName = await page.locator("tbody tr").nth(2).locator(".ns-cell-link > span:last-child").textContent();
  await page.locator("tbody tr").nth(2).locator(".ns-cell-link").click();
  report.check("Clic en el nombre abre la vista rápida en el drawer", (await page.locator(".ns-drawer h2").textContent()) === firstName);
  await page.keyboard.press("Escape");
  report.check("Escape cierra el drawer", (await page.locator(".ns-drawer").count()) === 0);
  await page.getByRole("button", { name: "Editar " + firstName }).click();
  await page.getByRole("textbox", { name: /^Apellidos/ }).fill("Prueba Editada");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  report.check("Editar y guardar actualiza la fila", (await toast()) === "Cambios guardados" && (await page.locator("tbody").textContent()).includes("Prueba Editada"));
  await page.locator("tbody tr").nth(3).getByRole("button", { name: /^Ver perfil de/ }).click();
  await page.getByRole("button", { name: "Abrir perfil completo" }).click();
  await page.waitForTimeout(300);
  report.check("«Abrir perfil completo» lleva al perfil con la pestaña Información (Secretaría)", /#\/admin\/profile\/\d+$/.test(page.url()) && (await page.getByRole("tab", { name: "Información" }).count()) === 1);

  // Corrección: «Importar estudiantes» abre la pestaña de importación.
  await go("students");
  await page.getByRole("button", { name: "Importar estudiantes" }).click();
  await page.waitForTimeout(300);
  report.check("«Importar estudiantes» abre la pestaña de importación (corrección respecto al sistema)", (await page.getByRole("tab", { name: "Importación masiva" }).getAttribute("aria-selected")) === "true");

  // Matrícula por secciones.
  await go("enrollment");
  await page.getByRole("button", { name: "Siguiente" }).click();
  report.check("Siguiente sin datos marca los 4 obligatorios", (await page.locator(".ns-field-error").count()) === 4);
  await page.getByRole("textbox", { name: /^Nombres/ }).fill("Emilia");
  await page.getByRole("textbox", { name: /^Apellidos/ }).fill("Narváez Paz");
  await page.getByRole("textbox", { name: /^Número de documento/ }).fill("1084512345");
  await page.getByLabel(/^Fecha de nacimiento/).fill("2014-03-12");
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("emilia@");
  report.check("Correo mal escrito muestra «Escribe un correo válido.»", (await page.locator(".ns-field-error").textContent()) === "Escribe un correo válido.");
  await page.getByRole("textbox", { name: "Correo electrónico" }).fill("");
  await page.getByRole("button", { name: "Siguiente" }).click();
  report.check("Paso 2: información médica marcada como sensible", (await page.locator(".ns-sensitive").textContent()).includes("Información sensible"));
  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("textbox", { name: /^Nombre completo/ }).fill("Gloria Paz");
  await page.getByRole("combobox", { name: /^Parentesco/ }).selectOption("Madre");
  await page.getByRole("textbox", { name: /^Teléfono/ }).fill("3124567890");
  await page.getByRole("button", { name: "Siguiente" }).click();
  report.check("Paso 4: el resumen recoge lo escrito", (await page.locator(".ns-summary-card").textContent()).includes("Emilia Narváez Paz"));
  await page.getByRole("button", { name: "Guardar matrícula" }).click();
  report.check("Guardar matrícula confirma «Matrícula registrada»", (await page.locator(".ns-reg-done h2").textContent()) === "Matrícula registrada");

  // Importación masiva completa.
  await go("enrollment?tab=import");
  await page.getByRole("button", { name: "Usar archivo de ejemplo" }).click();
  report.check("Archivo de ejemplo → vista previa con 245 registros", (await page.locator(".ns-block-title h2").first().textContent()) === "245 registros encontrados");
  await page.getByRole("button", { name: "Validar archivo" }).click();
  await page.waitForTimeout(1100);
  report.check("Validar muestra 7 filas que requieren revisión", (await page.locator(".ns-import-summary .ns-bento-tile--burgundy .ns-bento-value").textContent()) === "7");
  await page.getByRole("button", { name: "Corregir errores" }).click();
  const cont = page.locator(".ns-reg-actions .ns-btn").last();
  report.check("Con errores, continuar queda bloqueado («Resuelve 4 errores»)", await cont.isDisabled() && (await cont.textContent()) === "Resuelve 4 errores");
  for (const name of ["Samuel Ortiz Bravo", "Gabriela Zambrano"]) {
    const inp = page.getByRole("textbox", { name: "Corregir documento de " + name });
    await inp.fill("TI 1084999888");
    await inp.blur();
  }
  await page.getByRole("combobox", { name: "Corregir curso de Luciana Paz Mora" }).selectOption("6B");
  await page.locator("tbody tr", { hasText: "Antonella Burbano" }).getByRole("button", { name: "Omitir fila" }).click();
  report.check("Corregir 3 y omitir 1 desbloquea «Continuar»", !(await cont.isDisabled()) && (await cont.textContent()) === "Continuar");
  await cont.click();
  await page.getByRole("button", { name: "Confirmar importación" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Confirmar importación" }).click();
  report.check("Confirmar termina en «Importación completada»", (await page.locator(".ns-reg-done h2").textContent()) === "Importación completada");

  // Usuarios: restablecer acceso y desactivar.
  await go("users");
  await page.getByRole("button", { name: "Restablecer contraseña de Carlos Pérez" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Restablecer contraseña" }).click();
  await page.waitForTimeout(1100);
  report.check("Restablecer contraseña termina en «Solicitud enviada» sin mostrar contraseñas", (await page.locator("[role=alertdialog] .ns-dialog-title").textContent()) === "Solicitud enviada");
  await page.getByRole("button", { name: "Entendido" }).click();
  await page.getByRole("button", { name: "Desactivar a Carlos Pérez" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Desactivar" }).click();
  report.check("Desactivar cambia el estado y deshabilita la acción", (await toast()) === "Usuario desactivado" && await page.getByRole("button", { name: "Desactivar a Carlos Pérez" }).isDisabled());
  await page.getByRole("tab", { name: /Acudientes/ }).click();
  report.check("Pestaña Acudientes filtra a 16", (await page.locator(".ns-pager .ns-caption").textContent()) === "Mostrando 1–10 de 16");

  // Estructura académica.
  await go("structure");
  await page.getByRole("button", { name: "Crear grado" }).click();
  await page.locator(".ns-drawer").getByRole("button", { name: "Crear grado" }).click();
  report.check("Crear grado vacío avisa «Escribe el nombre del grado.»", (await page.locator(".ns-drawer .ns-field-error").textContent()) === "Escribe el nombre del grado.");
  await page.getByRole("textbox", { name: /^Nombre del grado/ }).fill("Duodécimo");
  await page.locator(".ns-drawer").getByRole("button", { name: "Crear grado" }).click();
  report.check("Crear grado lo añade a la tabla", (await toast()) === "Creado correctamente" && (await page.locator("tbody").textContent()).includes("Duodécimo"));

  // Malla curricular: choque y asignación del hueco 8B · Inglés.
  await go("curriculum");
  await page.getByRole("combobox", { name: /^Docente/ }).selectOption("Laura Benavides");
  await page.getByRole("combobox", { name: /^Materia/ }).selectOption("Matemáticas");
  await page.getByRole("combobox", { name: /^Curso/ }).first().selectOption("7A");
  await page.getByRole("button", { name: "Asignar", exact: true }).click();
  report.check("Asignar algo que ya existe explica el choque", (await page.locator(".ns-assign .ns-field-error").textContent()).startsWith("Ya existe una asignación de Matemáticas en 7A"));
  await page.getByRole("button", { name: "Asignar docente a Inglés en 8B" }).click();
  await page.getByRole("combobox", { name: /^Docente/ }).selectOption("Jorge Insuasty");
  await page.getByRole("button", { name: "Asignar", exact: true }).click();
  report.check("Asignar el hueco 8B · Inglés llena la celda", (await toast()) === "Docente asignado" && (await page.getByRole("button", { name: "Editar: Jorge Insuasty dicta Inglés en 8B" }).count()) === 1);

  // Periodos: la suma debe dar 100 %.
  await go("periods");
  const editor = page.locator(".ns-period-editor");
  report.check("Periodo 4 al 95 % avisa y bloquea el guardado", (await editor.locator(".ns-weight-total").textContent()).includes("La distribución de porcentajes debe sumar 100%.") && await editor.getByRole("button", { name: "Guardar periodo" }).isDisabled());
  await editor.getByRole("spinbutton", { name: "Porcentaje de Actividades en números" }).fill("40");
  report.check("Corregir a 100 % habilita el guardado", (await editor.locator(".ns-weight-total strong").textContent()) === "100%" && !(await editor.getByRole("button", { name: "Guardar periodo" }).isDisabled()));
  await page.getByRole("tab", { name: /Periodo 1/ }).click();
  report.check("Un periodo cerrado se muestra en solo lectura", (await editor.locator(".ns-sensitive").textContent()).includes("Este periodo está cerrado"));

  // Boletines.
  await go("reportcards");
  await page.locator("tbody tr").nth(0).getByRole("button", { name: "Previsualizar" }).click();
  report.check("Previsualizar abre el boletín como documento", (await page.locator("[role=dialog] .ns-paper").count()) === 1);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.locator(".ns-sticky-cta").getByRole("button", { name: "Generar todos" }).click();
  await page.locator("[role=alertdialog]").getByRole("button", { name: "Generar todos" }).click();
  const generated = await toast();
  report.check("Generar todos omite los bloqueados y avisa cuántos", /^\d+ boletines generados$/.test(generated), generated);

  // Paz y salvos.
  await go("clearances");
  await page.getByRole("button", { name: /^Bloqueado/ }).click();
  const row = page.locator("tbody tr").first();
  const who = await row.locator(".ns-cell-link > span:last-child").evaluate((el) => el.firstChild.textContent);
  // Con el filtro «Bloqueado» la fila desaparece al ponerse al día: se cambia a «Todos» antes.
  await page.getByRole("button", { name: /^Todos/ }).first().click();
  for (const k of ["Biblioteca", "Pensiones", "Documentos"]) {
    const sw = page.getByRole("switch", { name: k + " de " + who });
    if ((await sw.getAttribute("aria-checked")) === "false") await sw.click();
  }
  report.check("Poner al día las tres obligaciones habilita reportes y boletines", (await page.locator("tbody tr", { hasText: who }).locator(".ns-badge").textContent()) === "Habilitado");

  // Ranking.
  await go("ranking");
  report.check("Los tres primeros llevan medalla", (await page.locator(".ns-medal").count()) === 3);
  await page.getByRole("combobox", { name: "Materia" }).selectOption("Física");
  report.check("Filtrar por materia cambia la columna a «Nota en Física»", (await page.locator("thead").textContent()).includes("Nota en Física"));

  // ---------- 3. Contraste ----------
  const checks = [
    ["dashboard", ".ns-bento-tile--lead .ns-bento-foot", "pie del resumen en navy"],
    ["students", ".ns-course-tag >> nth=0", "etiqueta de curso"],
    ["students", ".ns-badge >> nth=0", "estado de matrícula"],
    ["enrollment", ".ns-reg-step.is-on", "sección activa del formulario"],
    ["users", ".ns-chip-count >> nth=0", "contador de pestaña"],
    ["curriculum", ".ns-assign-empty >> nth=0", "celda sin docente"],
    ["periods", ".ns-weight-seg >> nth=0", "segmento de pesos"],
    ["reportcards", ".ns-sticky-cta .ns-btn", "acción fija"],
    ["clearances", ".ns-switch-state >> nth=0", "estado del interruptor"],
    ["ranking", ".ns-medal >> nth=0", "medalla"],
    ["ranking", ".ns-table-grade >> nth=0", "promedio en tabla (cifra que decide, AAA)", 7],
  ];
  for (const [p, sel, label, min = 4.5] of checks) {
    await go(p);
    await page.waitForTimeout(500);
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ ${min}:1`, r.ratio >= min, `${r.ratio.toFixed(2)}:1`);
  }

  // ---------- 4. Anchos ----------
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const hash of ROUTES) {
    await page.goto(URL_BASE + hash, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    checkOverflow(report, hash, await page.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  }
  await page.goto(URL_BASE + "#/admin/students", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "paso5-secretaria-students-1024.png") });
  report.check("Consola de la app sin errores ni avisos en los flujos", cons.length === 0, cons.join(" | "));
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
