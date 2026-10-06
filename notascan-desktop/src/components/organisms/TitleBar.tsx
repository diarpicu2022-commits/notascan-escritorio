import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Icon } from "../atoms/Icon";
import { Logo } from "../atoms/Logo";

/*
 * Barra de título de la app de escritorio (paso 6h, pedido de Diego: ventana sin bordes de Windows, más limpia).
 * Solo existe dentro de Tauri: en el navegador y en las pruebas la app es la misma de siempre.
 * Arrastrar la barra mueve la ventana; doble clic maximiza; los botones minimizan, maximizan/restauran y cierran.
 */

/** ¿Estamos dentro de la app de escritorio (Tauri) y no en un navegador? */
export const IN_DESKTOP = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function TitleBar() {
  const [max, setMax] = useState(false);
  useEffect(() => {
    if (!IN_DESKTOP) return;
    const w = getCurrentWindow();
    let off: (() => void) | undefined;
    const sync = () => { void w.isMaximized().then(setMax); };
    sync();
    void w.onResized(sync).then((f) => { off = f; });
    return () => off?.();
  }, []);
  if (!IN_DESKTOP) return null;
  const w = getCurrentWindow();
  return (
    <header className="ns-titlebar" data-tauri-drag-region>
      <span className="ns-titlebar-brand" data-tauri-drag-region>
        <Logo size={13} markOnly />
        <span data-tauri-drag-region>NotaScan</span>
      </span>
      <div className="ns-titlebar-controls">
        <button type="button" className="ns-titlebar-btn" aria-label="Minimizar" title="Minimizar" onClick={() => { void w.minimize(); }}><Icon name="minus" size={14} /></button>
        <button type="button" className="ns-titlebar-btn" aria-label={max ? "Restaurar" : "Maximizar"} title={max ? "Restaurar" : "Maximizar"} onClick={() => { void w.toggleMaximize(); }}>
          <Icon name={max ? "restore" : "maximize"} size={14} />
        </button>
        <button type="button" className="ns-titlebar-btn ns-titlebar-btn--close" aria-label="Cerrar" title="Cerrar" onClick={() => { void w.close(); }}><Icon name="close" size={14} /></button>
      </div>
    </header>
  );
}
