// Ícono de la app de escritorio (paso 6h): la marca «N» del sistema (.ns-logo-mark: dorado, borde navy, Fraunces)
// dibujada a 1024 px con los estilos de la app compilada. El borde y la esquina se engrosan para que se lea a 16 px.
// Uso: npm run build && node scripts/make-icon.mjs && npx tauri icon src-tauri/icons/app-icon.png
import { join } from "node:path";
import { ROOT, URL_BASE, startPreview } from "./harness.mjs";

const { browser, close } = await startPreview();
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.goto(URL_BASE + "#/login", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const box = document.createElement("div");
    box.id = "ico";
    Object.assign(box.style, { width: "1024px", height: "1024px", display: "grid", placeItems: "center", background: "transparent" });
    const logo = document.createElement("span");
    logo.className = "ns-logo";
    logo.style.fontSize = "1000px";
    const mark = document.createElement("span");
    mark.className = "ns-logo-mark";
    Object.assign(mark.style, { margin: "0", width: "1024px", height: "1024px", boxSizing: "border-box", fontSize: "640px", fontWeight: "800", borderWidth: "72px", borderRadius: "220px", boxShadow: "none", lineHeight: "1" });
    mark.textContent = "N";
    logo.appendChild(mark);
    box.appendChild(logo);
    document.body.replaceChildren(box);
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.locator("#ico").screenshot({ path: join(ROOT, "src-tauri/icons/app-icon.png"), omitBackground: true });
  console.log("src-tauri/icons/app-icon.png");
} finally {
  await close();
}
