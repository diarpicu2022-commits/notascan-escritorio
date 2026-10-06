// Impresión de boletines y reportes (2026-10-06, pedido de Diego): sin la fecha ni el título que pone el navegador.
// Imprime a PDF de verdad (Chromium, como WebView2) una hoja del sistema con una tabla larga y la mide con Python:
// A4, varias páginas, relleno de 14 mm también en la segunda página, nada fuera del papel y encabezado repetido.
// Uso: npm run build:demo && node scripts/verify-print.mjs
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { OUT, URL_BASE, createReport, startPreview } from "./harness.mjs";

const report = createReport();
const { browser, close } = await startPreview();
const pdf = join(OUT, "impresion-reporte-largo.pdf");
try {
  const page = await browser.newPage();
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  const margin = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; } // hojas de otro origen (Google Fonts)
      for (const r of rules) if (r instanceof CSSMediaRule && r.conditionText === "print")
        for (const x of r.cssRules) if (x instanceof CSSPageRule) return x.style.margin;
    }
    return null;
  });
  report.check("La página impresa no tiene márgenes (el navegador no tiene dónde poner fecha ni título)", margin === "0px", String(margin));
  await page.evaluate(() => {
    const root = document.createElement("div"); root.className = "ns-print-root";
    const paper = document.createElement("article"); paper.className = "ns-paper";
    const h = document.createElement("h2"); h.textContent = "Consolidado por curso · prueba de varias páginas"; paper.appendChild(h);
    const t = document.createElement("table"); t.className = "ns-paper-table";
    const head = t.createTHead().insertRow(); for (const c of ["Estudiante", "Matemáticas", "Promedio", "Desempeño"]) { const th = document.createElement("th"); th.textContent = c; head.appendChild(th); }
    const body = t.createTBody();
    for (let i = 1; i <= 60; i++) { const r = body.insertRow(); for (const v of ["Estudiante de prueba número " + i, "4.0", "4.0", "Alto"]) r.insertCell().textContent = v; }
    paper.appendChild(t); root.appendChild(paper); document.body.appendChild(root);
  });
  await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
} finally {
  await close();
}

const py = `
import json, pymupdf
d = pymupdf.open(r"""${pdf}""")
out = []
for p in d:
    words = p.get_text("words")
    xs0 = min(w[0] for w in words); xs1 = max(w[2] for w in words); ys0 = min(w[1] for w in words); ys1 = max(w[3] for w in words)
    out.append({"w": round(p.rect.width), "h": round(p.rect.height), "left": round(xs0), "right": round(p.rect.width - xs1), "top": round(ys0), "bottom": round(p.rect.height - ys1), "head": "Estudiante" in p.get_text()})
print(json.dumps(out))
`;
const res = spawnSync("python", ["-c", py], { encoding: "utf8" });
const pages = res.status === 0 ? JSON.parse(res.stdout) : [];
const mm14 = 14 * 72 / 25.4; // ≈ 39.7 pt
report.check("Sale en A4 (595 × 842 pt)", pages.length > 0 && pages.every((p) => p.w === 595 && p.h === 842), JSON.stringify(pages[0] ?? res.stderr));
report.check("Un reporte largo ocupa varias páginas", pages.length >= 2, String(pages.length));
report.check("Todas las páginas conservan 14 mm de aire a cada lado (también la segunda, arriba)",
  pages.length >= 2 && pages.every((p) => p.left >= mm14 - 2 && p.right >= mm14 - 2 && p.top >= mm14 - 2), JSON.stringify(pages.map((p) => [p.left, p.right, p.top])));
report.check("El encabezado de la tabla se repite en cada página", pages.length >= 2 && pages.every((p) => p.head));
process.exitCode = report.print() ? 1 : 0;
