import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ReportCardView, type ReportCardData } from "./ReportCardDocument";

/**
 * Imprime boletines, uno por página, con la misma vista del sistema. El PDF lo produce el diálogo de impresión
 * («Guardar como PDF»), en la app de escritorio (WebView2) y en el navegador.
 * Se monta fuera de la app (portal en body); print.css oculta todo lo demás al imprimir.
 */
export function PrintDocuments({ docs, onDone }: { docs: ReportCardData[]; onDone: () => void }) {
  // La impresión se abre una sola vez por montaje, aunque cambie la función de cierre.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const done = () => onDoneRef.current();
    window.addEventListener("afterprint", done, { once: true });
    // Un cuadro para que el navegador pinte los documentos antes de abrir el diálogo.
    const t = window.setTimeout(() => window.print(), 50);
    return () => { window.clearTimeout(t); window.removeEventListener("afterprint", done); };
  }, []);
  return createPortal(
    <div className="ns-print-root" aria-hidden>
      {docs.map((d, i) => <ReportCardView key={i} data={d} />)}
    </div>,
    document.body,
  );
}
