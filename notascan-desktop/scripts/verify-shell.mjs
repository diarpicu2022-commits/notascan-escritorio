// Paso 3 · verificación medida del esqueleto (Login, RoleShell, rutas, Ctrl+K, conexión).
// Fidelidad: el NotaScanApp original de notascan-ui se renderiza en el mismo navegador y en
// la misma ruta; se comparan DOM normalizado y píxeles de cada pieza del esqueleto.
import { join } from "node:path";
import { DS, OUT, URL_BASE, checkOverflow, createReport, findOffSystemValues, startPreview, watchConsole, sampleTextContrast } from "./harness.mjs";
import { applyAmendments } from "./harness.mjs";

const report = createReport();
const offenders = findOffSystemValues();
report.check("Sin colores ni valores arbitrarios fuera de los tokens en src/", offenders.length === 0, offenders.join("; "));

/** Abre la referencia del sistema en `hash` (React, CSS y notascan.js originales). */
async function openReference(ctx, hash) {
  const ref = await ctx.newPage();
  const cons = watchConsole(ref);
  await ref.goto(URL_BASE + "#/dev/tokens", { waitUntil: "networkidle" });
  await ref.evaluate(() => {
    document.head.querySelectorAll("style,link[rel=stylesheet]:not([href*=fonts])").forEach((n) => n.remove());
    const mount = document.createElement("div");
    mount.id = "ref";
    document.body.replaceChildren(mount);
  });
  await ref.addStyleTag({ path: join(DS, "css/tokens.css") });
  await ref.addStyleTag({ path: join(DS, "css/notascan.css") });
  await applyAmendments(ref);
  await ref.addScriptTag({ path: join(DS, "vendor/react.production.min.js") });
  await ref.addScriptTag({ path: join(DS, "vendor/react-dom.production.min.js") });
  await ref.evaluate((h) => { history.replaceState(null, "", h); }, hash);
  await ref.addScriptTag({ path: join(DS, "js/notascan.js") });
  await ref.evaluate(() => { ReactDOM.createRoot(document.getElementById("ref")).render(React.createElement(NotaScan.NotaScanApp)); });
  await ref.waitForTimeout(700);
  return { page: ref, cons };
}

const normalize = (page, selector) => page.locator(selector).first().evaluate((root) => {
  const walk = (el) => {
    if (el.nodeType === 3) return el.textContent.trim() ? `"${el.textContent.trim()}"` : "";
    if (el.nodeType !== 1) return "";
    const attrs = [...el.attributes]
      .filter((a) => !["id", "aria-labelledby", "aria-describedby", "aria-controls", "aria-activedescendant", "for", "style", "name"].includes(a.name))
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
    const da = read(ia), db = read(ib);
    // Tolerante al suavizado: un píxel distinto no cuenta si su igual está a ≤ 1 px en la otra imagen.
    const w = ia.width, hgt = ia.height;
    const near = (src, p, dst) => {
      const x = (p / 4) % w, y = Math.floor(p / 4 / w);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= hgt) continue;
        const q = (yy * w + xx) * 4;
        if (Math.abs(src[p] - dst[q]) + Math.abs(src[p + 1] - dst[q + 1]) + Math.abs(src[p + 2] - dst[q + 2]) <= 24) return true;
      }
      return false;
    };
    let off = 0, raw = 0;
    for (let p = 0; p < da.length; p += 4) {
      if (Math.abs(da[p] - db[p]) + Math.abs(da[p + 1] - db[p + 1]) + Math.abs(da[p + 2] - db[p + 2]) <= 24) continue;
      raw++;
      if (!near(da, p, db) || !near(db, p, da)) off++;
    }
    return { size: `${w}x${hgt}`, pct: (off / (da.length / 4)) * 100, raw: (raw / (da.length / 4)) * 100 };
  }, [a.toString("base64"), b.toString("base64")]);
}

async function compare(label, ref, mine, selector, shotName) {
  const [r, m] = await Promise.all([normalize(ref, selector), normalize(mine, selector)]);
  let at = 0;
  while (at < r.length && r[at] === m[at]) at++;
  report.check(`${label}: DOM idéntico al del sistema`, r === m, r === m ? "" : `…${r.slice(Math.max(0, at - 50), at + 70)}… vs …${m.slice(Math.max(0, at - 50), at + 70)}…`);
  const a = await ref.locator(selector).first().screenshot({ animations: "disabled" });
  const b = await mine.locator(selector).first().screenshot({ animations: "disabled", path: join(OUT, `paso3-${shotName}.png`) });
  const d = await pixelDiff(mine, a, b);
  report.check(`${label}: píxeles iguales al sistema (≤ 0.5 %)`, d.pct <= 0.5, `${d.size}, ${d.pct.toFixed(3)} % distinto (${d.raw.toFixed(3)} % sin tolerancia de 1 px)`);
}

const { browser, close } = await startPreview();
try {
  // Comparaciones con movimiento reducido: congela el ambiente del login en ambos lados.
  const still = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

  // ---------- 1. Login ----------
  {
    const { page: ref, cons } = await openReference(still, "#/login");
    const mine = await still.newPage();
    const mc = watchConsole(mine);
    await mine.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
    await mine.waitForTimeout(700);
    await compare("Login", ref, mine, ".ns-auth", "login-1440");
    report.check("Consola sin errores (login, ambos lados)", cons.length === 0 && mc.length === 0, [...cons, ...mc].join(" | "));
    await ref.close(); await mine.close();
  }

  // ---------- 2. Shell por rol ----------
  for (const role of ["teacher", "admin", "principal"]) {
    const { page: ref } = await openReference(still, `#/${role}/dashboard`);
    const mine = await still.newPage();
    await mine.goto(URL_BASE + `#/${role}/dashboard`, { waitUntil: "networkidle" });
    await mine.waitForTimeout(700);
    await compare(`Sidebar ${role}`, ref, mine, ".ns-sidebar", `sidebar-${role}`);
    await compare(`Herramientas ${role}`, ref, mine, ".ns-app-tools", `tools-${role}`);
    if (role === "teacher") {
      // Búsqueda global abierta con Ctrl+K y una consulta.
      for (const p of [ref, mine]) { await p.keyboard.press("Control+k"); await p.keyboard.type("María"); await p.waitForTimeout(150); }
      await compare("Búsqueda Ctrl+K", ref, mine, ".ns-gsearch", "busqueda");
      // El panel es vidrio: se oculta el contenido de página que queda detrás para comparar solo el panel.
      for (const p of [ref, mine]) {
        await p.keyboard.press("Escape");
        await p.addStyleTag({ content: ".ns-app-main > :not(.ns-app-tools) { visibility: hidden !important; }" });
        await p.locator(".ns-conn-pill").click(); await p.waitForTimeout(100);
      }
      await compare("Panel de conexión", ref, mine, ".ns-conn-pop", "conexion");
    }
    await mine.screenshot({ path: join(OUT, `paso3-shell-${role}-1440.png`) });
    await ref.close(); await mine.close();
  }
  await still.close();

  // ---------- 3. Comportamiento ----------
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cons = watchConsole(page);
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Entrar" }).click();
  const errs = await page.locator(".ns-auth-error").allTextContents();
  report.check("Login vacío muestra los dos errores del sistema", errs.join("|") === "Escribe tu correo institucional completo.|La contraseña tiene al menos 6 caracteres.", errs.join(" | "));
  report.check("El primer error queda anunciado (role=alert, aria-invalid)", (await page.locator("#auth-email").getAttribute("aria-invalid")) === "true");

  // Orden de tabulación del formulario.
  await page.locator("input[name=ns-role]:checked").focus();
  const order = [];
  for (let i = 0; i < 7; i++) {
    order.push(await page.evaluate(() => { const a = document.activeElement; return a.id || a.getAttribute("aria-label") || a.textContent.trim().slice(0, 24) || a.type; }));
    await page.keyboard.press("Tab");
  }
  report.check("Orden de teclado lógico en el login", order.join(" › ") === "radio › auth-email › auth-pass › Mostrar contraseña › checkbox › ¿Olvidaste tu contraseña › Entrar", order.join(" › "));

  await page.getByText("Secretaría", { exact: true }).click();
  await page.locator("#auth-email").fill("patricia.ortega@ucc.edu.co");
  await page.locator("#auth-pass").fill("secreto1");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  report.check("Ver contraseña cambia el tipo y aria-pressed", (await page.locator("#auth-pass").getAttribute("type")) === "text" && (await page.getByRole("button", { name: "Ocultar contraseña" }).getAttribute("aria-pressed")) === "true");
  await page.getByRole("button", { name: "Entrar" }).click();
  report.check("Mientras entra, el botón queda ocupado", (await page.locator(".ns-auth-submit").getAttribute("aria-busy")) === "true");
  await page.waitForURL(/#\/admin\/dashboard$/, { timeout: 3000 });
  report.check("Entrar como Secretaría lleva a #/admin/dashboard", page.url().endsWith("#/admin/dashboard"));

  await page.getByRole("button", { name: "Boletines", exact: true }).click();
  await page.waitForTimeout(100);
  report.check("Navegar cambia la ruta y aria-current", page.url().endsWith("#/admin/reportcards") && (await page.locator(".ns-nav-item[aria-current=page]").textContent()).startsWith("Boletines"));
  report.check("El título de la página sigue la ruta", (await page.locator(".ns-header-title").textContent()) === "Boletines");

  await page.goto(URL_BASE + "#/teacher/dashboard");
  await page.waitForTimeout(300);
  report.check("Docente: Calificaciones muestra 8 pendientes", (await page.locator(".ns-nav-item-count").getAttribute("aria-label")) === "8 pendientes");
  const trigger = page.getByRole("button", { name: "Buscar estudiante (Ctrl + K)" });
  await trigger.focus();
  await page.keyboard.press("Control+k");
  report.check("Ctrl+K abre la búsqueda con el foco en el campo", await page.locator(".ns-gsearch input").evaluate((el) => el === document.activeElement));
  await page.keyboard.type("7A");
  const n7a = await page.locator(".ns-gs-results li").count();
  report.check("Buscar «7A» devuelve 7 estudiantes (límite del sistema)", n7a === 7, String(n7a));
  await page.keyboard.press("ArrowDown");
  report.check("Flecha abajo mueve la selección", (await page.locator(".ns-gs-results li[aria-selected=true]").count()) === 1 && (await page.locator(".ns-gs-results li").nth(1).getAttribute("aria-selected")) === "true");
  const chosen = await page.locator(".ns-gs-results li").nth(1).locator("strong").textContent();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  report.check("Enter abre el perfil del estudiante elegido", /#\/teacher\/profile\/\d+\?tab=profile$/.test(page.url()) && (await page.locator(".ns-header-title").textContent()) === chosen, `${page.url()} · ${chosen}`);

  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  report.check("Escape cierra la búsqueda", (await page.locator(".ns-gsearch").count()) === 0);

  await page.locator(".ns-conn-pill").click();
  await page.getByRole("switch", { name: "Trabajar sin conexión (demostración)" }).click();
  report.check("Modo sin conexión cambia la píldora y desactiva Sincronizar", (await page.locator(".ns-conn-pill").textContent()).includes("Modo offline") && await page.getByRole("button", { name: "Sincronizar ahora" }).isDisabled());
  await page.getByRole("switch").click();
  await page.getByRole("button", { name: "Sincronizar ahora" }).click();
  report.check("Sincronizar muestra «Sincronizando…»", (await page.locator(".ns-conn-pop .ns-btn").textContent()).includes("Sincronizando"));
  await page.waitForTimeout(1400);
  report.check("Tras sincronizar vuelve a «Conectado»", (await page.locator(".ns-conn-pill").textContent()).includes("Conectado"));
  await page.locator(".ns-conn-pill").click();

  // Contraste del shell, medido sobre el render (en el dashboard: el perfil no tiene ítem activo).
  await page.goto(URL_BASE + "#/teacher/dashboard");
  await page.waitForTimeout(700);
  const targets = [
    [".ns-nav-item[aria-current=page]", 4.5, "ítem activo del menú"],
    [".ns-nav-item:not([aria-current]) >> nth=2", 4.5, "ítem del menú"],
    [".ns-nav-item-count", 4.5, "contador de pendientes"],
    [".ns-sidebar-course", 4.5, "curso del sidebar"],
    [".ns-profile-text", 4.5, "usuario"],
    [".ns-role-chip", 4.5, "chip de rol"],
    [".ns-gsearch-trigger", 4.5, "botón de búsqueda"],
    [".ns-conn-pill", 4.5, "píldora de conexión"],
    [".ns-header-title", 4.5, "título"],
    [".ns-header-desc", 4.5, "descripción"],
    [".ns-home-hero-title", 4.5, "título del bloque principal"],
  ];
  for (const [sel, min, label] of targets) {
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste ${label} ≥ ${min}:1`, r.ratio >= min, `${r.ratio.toFixed(2)}:1`);
  }

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForTimeout(150);
  report.check("Cerrar sesión vuelve al login", page.url().endsWith("#/login") && (await page.locator(".ns-auth").count()) === 1);

  await page.goto(URL_BASE + "#/movil");
  await page.waitForTimeout(150);
  report.check("#/movil (app móvil) cae en el login de escritorio", (await page.locator(".ns-auth").count()) === 1);
  for (const [sel, label] of [[".ns-auth-hello h1", "«¡Hola!»"], [".ns-auth-form h2", "«Iniciar sesión»"], [".ns-auth-field label", "etiqueta de campo"], [".ns-auth-submit", "botón Entrar"], [".ns-auth-mobile-link", "enlace app móvil"], [".ns-auth-steps p", "lema del panel"]]) {
    const r = await sampleTextContrast(page, page.locator(sel).first());
    report.check(`Contraste login ${label} ≥ 4.5:1`, r.ratio >= 4.5, `${r.ratio.toFixed(2)}:1`);
  }

  // Anchos de ventana (mínimo de Tauri: 1024).
  for (const [w, h] of [[1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const hash of ["#/login", "#/teacher/dashboard"]) {
      await page.goto(URL_BASE + hash);
      await page.waitForTimeout(400);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      checkOverflow(report, hash, over, w);
      await page.screenshot({ path: join(OUT, `paso3-${hash.replace(/[#/]+/g, "-").slice(1)}-${w}.png`) });
    }
  }
  report.check("Consola de la app sin errores ni avisos", cons.length === 0, cons.join(" | "));

  // Movimiento reducido: el ambiente del login se detiene.
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rp = await rm.newPage();
  await rp.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  const moving = await rp.locator(".ns-auth .a-blob, .ns-auth .a-phone, .ns-auth .ns-scanline, .ns-auth-submit").evaluateAll((els) => els.filter((e) => getComputedStyle(e).animationName !== "none" && parseFloat(getComputedStyle(e).animationDuration) > 0.01).length);
  report.check("Con movimiento reducido el ambiente del login no se mueve", moving === 0, `${moving} elementos animados`);
  await rm.close();
} catch (e) {
  report.check("El script terminó sin excepciones", false, String(e).split(/\r?\n/)[0]);
} finally {
  await close();
}
process.exit(report.print() ? 1 : 0);
