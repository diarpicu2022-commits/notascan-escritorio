import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Button } from "../atoms/Button";
import { Icon, type IconName } from "../atoms/Icon";

type ToastTone = "success" | "error" | "info";
const TOAST_ICON: Record<ToastTone, IconName> = { success: "check", error: "error", info: "ai" };

export interface ToastData { tone?: ToastTone; title: ReactNode; message?: ReactNode }

/** Aviso breve: role="status" (o "alert" si es un error) y cierre manual. */
export function Toast({ tone = "success", title, message, onClose, className }: ToastData & { onClose?: () => void; className?: string }) {
  return (
    <div className={cx("ns-toast", "ns-toast--" + tone, className)} role={tone === "error" ? "alert" : "status"}>
      <span className="ns-toast-icon" aria-hidden><Icon name={TOAST_ICON[tone]} size={16} strokeWidth={2.5} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ns-toast-title">{title}</div>
        {message ? <div className="ns-toast-text">{message}</div> : null}
      </div>
      {onClose ? <Button variant="ghost" size="sm" className="ns-btn--icon" aria-label="Cerrar aviso" onClick={onClose}><Icon name="close" size={16} /></Button> : null}
    </div>
  );
}

/** Muestra un aviso 3,8 s en la región de avisos; devuelve [mostrar, nodo]. */
export function useToast(): [(t: ToastData) => void, ReactNode] {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = useCallback((t: ToastData) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 3800);
  }, []);
  const node = toast ? <div className="ns-toast-region"><Toast {...toast} onClose={() => setToast(null)} /></div> : null;
  return [show, node];
}
