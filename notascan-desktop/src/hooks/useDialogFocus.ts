import { useEffect, type RefObject } from "react";

/**
 * Foco de diálogo del sistema: enfoca [data-autofocus] (o el primer control), atrapa Tab,
 * cierra con Escape y devuelve el foco a donde estaba al cerrar.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement>, onClose?: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node && (node.querySelector<HTMLElement>("[data-autofocus]") || node.querySelector<HTMLElement>("input,select,textarea,button"));
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && node) {
        const f = node.querySelectorAll<HTMLElement>("button:not([disabled]),input,select,textarea,a[href]");
        if (!f.length) return;
        const a = f[0], b = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
    // Igual que el sistema: solo depende de `open`.
  }, [open]);
}
