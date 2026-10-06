/**
 * Sube al inicio de la pantalla. En la app de escritorio el contenido se desplaza dentro de #root (debajo de la barra
 * de título propia, enmienda 8); en el navegador, la ventana.
 */
export function scrollToTop(smooth = false) {
  const desktop = document.documentElement.classList.contains("ns-in-desktop");
  const target: Element | Window | null = desktop ? document.getElementById("root") : window;
  target?.scrollTo?.({ top: 0, behavior: smooth ? "smooth" : "auto" });
}
