import { Button } from "../atoms/Button";
import { EmptyState } from "./EmptyState";

/* Estados de las pantallas sin tabla, con las mismas piezas que la DataGrid del sistema:
   carga = bloques .ns-skel; error = EmptyState de error con «Reintentar». */

/** Carga: bloques esqueleto, ocultos a lectores de pantalla; el anuncio va en la región de estado. */
export function LoadingBlocks({ rows = 5, height = 48, label }: { rows?: number; height?: number; label: string }) {
  return (
    <div className="ns-col" style={{ gap: 12 }} role="status" aria-busy="true">
      <span className="ns-sr">{label}</span>
      {Array.from({ length: rows }, (_, i) => <span key={i} aria-hidden className="ns-skel" style={{ display: "block", height, width: i % 2 ? "92%" : "100%" }} />)}
    </div>
  );
}

/** Error de carga: siempre con salida. */
export function ErrorState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <EmptyState tone="error" title={title} message="Revisa tu conexión e inténtalo de nuevo."
      action={<Button variant="secondary" icon="refresh" onClick={onRetry}>Reintentar</Button>} />
  );
}
