// Desplazamiento en la app de escritorio y barras del sistema (enmienda 8, 2026-10-06, pedida por Diego).
// Se mide en Microsoft Edge (motor de WebView2) con la clase que pone la app dentro de Tauri (.ns-in-desktop).
// Uso: npm run build:demo && node scripts/verify-desktop-scroll.mjs
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright";
import { ROOT, OUT, URL_BASE, createReport } from "./harness.mjs";

const report = createReport();
const server = spawn(process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "preview", "--port", "4173", "--strictPort"], { cwd: ROOT });
await new Promise((res) => server.stdout.on("data", (d) => { if (String(d).includes("4173")) res(); }));
// Sin --hide-scrollbars (Playwright las oculta por defecto): aquí se mide justo la barra.
const browser = await chromium.launch({ channel: "msedge", ignoreDefaultArgs: ["--hide-scrollbars"] });
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 816 } });
  await page.goto(URL_BASE + "#/admin/dashboard", { waitUntil: "networkidle" });
  // La app la pone al arrancar dentro de Tauri (main.tsx); aquí se pone con la página ya cargada.
  await page.evaluate(() => document.documentElement.classList.add("ns-in-desktop"));
  await page.waitForTimeout(600);

  const m = await page.evaluate(() => {
    const root = document.getElementById("root"), r = root.getBoundingClientRect();
    return {
      docScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      top: r.top, bottom: r.bottom, vh: innerHeight, right: r.right, vw: innerWidth,
      overflow: root.scrollHeight - root.clientHeight, bar: root.offsetWidth - root.clientWidth,
    };
  });
  report.check("La ventana no se desplaza: lo hace el contenido", m.docScroll === 0 && m.overflow > 0, JSON.stringify(m));
  report.check("La barra de desplazamiento empieza debajo de la barra de título (32 px) y termina en el borde de la ventana", m.top === 32 && m.bottom === m.vh && m.right === m.vw, JSON.stringify(m));
  report.check("La barra del contenido mide 12 px (cápsula del sistema, no la de Windows)", m.bar === 12, String(m.bar));

  const side = await page.evaluate(() => { const el = document.querySelector(".ns-app-side .ns-sidebar"); return { sw: el.scrollWidth, cw: el.clientWidth, bar: el.offsetWidth - el.clientWidth - 4, overflowY: el.scrollHeight > el.clientHeight }; });
  report.check("Menú lateral: barra delgada (8 px) y sin barra horizontal, aunque no quepa de alto", side.overflowY && side.bar === 8 && side.sw <= side.cw, JSON.stringify(side));

  const sideBefore = await page.locator(".ns-app-side").boundingBox();
  await page.locator("#root").evaluate((el) => el.scrollTo(0, 600));
  await page.waitForTimeout(200);
  const sideAfter = await page.locator(".ns-app-side").boundingBox();
  report.check("Al desplazar, el menú lateral queda fijo debajo de la barra de título", Math.round(sideAfter.y) === Math.round(sideBefore.y) && Math.round(sideAfter.y) >= 32, JSON.stringify({ sideBefore: sideBefore.y, sideAfter: sideAfter.y }));
  await page.screenshot({ path: join(OUT, "enmienda8-desplazado-1536.png") });

  await page.locator(".ns-nav-item", { hasText: "Estudiantes" }).first().click();
  await page.waitForTimeout(500);
  report.check("Al cambiar de pantalla vuelve arriba", await page.locator("#root").evaluate((el) => el.scrollTop) === 0);

  // La barra no se dibuja con el estilo de Windows: la imagen de la columna de la barra cambia al quitar el estilo.
  await page.locator("#root").evaluate((el) => el.scrollTo(0, 300));
  const clip = { x: m.vw - 12, y: 40, width: 12, height: 400 };
  const styled = await page.screenshot({ clip });
  await page.addStyleTag({ content: "::-webkit-scrollbar { all: unset !important; } ::-webkit-scrollbar-thumb { all: unset !important; }" });
  await page.waitForTimeout(200);
  const native = await page.screenshot({ clip });
  report.check("La barra usa el estilo del sistema (difiere de la de Windows)", !styled.equals(native));
  await page.evaluate(() => document.querySelector("style:last-of-type").remove());

  await page.emulateMedia({ media: "print" });
  const pr = await page.evaluate(() => ({ pos: getComputedStyle(document.getElementById("root")).position, ov: getComputedStyle(document.body).overflow }));
  report.check("Al imprimir el contenido no queda recortado por el contenedor", pr.pos === "static" && pr.ov === "visible", JSON.stringify(pr));
} finally {
  await browser.close();
  server.kill();
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
}
process.exitCode = report.print() ? 1 : 0;
