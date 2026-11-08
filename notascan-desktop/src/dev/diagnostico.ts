/*
 * Diagnóstico de la barra de título, solo en la compilación de la CI de macOS (VITE_DIAG=1).
 * En el Mac de GitHub la franja de la barra sale vacía y no hay un Mac a mano para mirar: este panel escribe en
 * pantalla lo que ve la app, y la captura de la CI lo trae. No entra en ninguna otra compilación.
 */
export function startDiagnostic() {
  const box = document.createElement("pre");
  box.id = "ns-diag";
  box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;margin:0;padding:8px 10px;max-width:70vw;"
    + "background:#fff;color:#000;border:2px solid #c00;font:12px/1.35 Menlo,monospace;white-space:pre-wrap;pointer-events:none";
  document.documentElement.appendChild(box);
  const describe = (el: Element | null) => el ? el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "") : "null";
  const update = () => {
    const h = document.querySelector(".ns-titlebar");
    const cs = h ? getComputedStyle(h) : null;
    const r = h?.getBoundingClientRect();
    const root = document.getElementById("root")?.getBoundingClientRect();
    const vv = window.visualViewport;
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;top:0;padding-top:env(safe-area-inset-top);visibility:hidden";
    document.body.appendChild(probe);
    const safeTop = getComputedStyle(probe).paddingTop;
    probe.remove();
    box.textContent = [
      "UA " + navigator.userAgent,
      "html.class=" + document.documentElement.className + " tauri=" + ("__TAURI_INTERNALS__" in window),
      "inner " + innerWidth + "x" + innerHeight + " dpr " + devicePixelRatio + " vv.top " + (vv ? vv.offsetTop + " h " + vv.height : "-") + " safeTop " + safeTop,
      "header " + (h ? describe(h) + " rect " + [r!.x, r!.y, r!.width, r!.height].map(Math.round).join(",") : "NO EXISTE"),
      cs ? "  display " + cs.display + " vis " + cs.visibility + " op " + cs.opacity + " z " + cs.zIndex + " pos " + cs.position + " bg " + cs.backgroundColor + " transform " + cs.transform : "",
      "root rect " + (root ? [root.x, root.y, root.width, root.height].map(Math.round).join(",") : "-"),
      "punto(200,8) " + describe(document.elementFromPoint(200, 8)),
      "punto(200,16) " + describe(document.elementFromPoint(200, 16)),
      "punto(200,40) " + describe(document.elementFromPoint(200, 40)),
      "body.children " + [...document.body.children].map(describe).join(" | "),
    ].join("\n");
  };
  update();
  setInterval(update, 1000);
}
