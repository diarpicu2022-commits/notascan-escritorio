import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { Avatar } from "../atoms/Avatar";
import { Badge } from "../atoms/Badge";
import { Button } from "../atoms/Button";
import { IconAction } from "../atoms/Controls";
import { Icon, type IconName } from "../atoms/Icon";

/* Reglas del sistema: Modal para confirmar, aprobar, restablecer o destruir;
   Drawer para consultar, editar y filtrar sin salir de la tabla. Foco atrapado y Escape cierra. */

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  tone?: "sage" | "burgundy";
  alert?: boolean;
  inline?: boolean;
  size?: "doc";
  actions?: ReactNode;
  children?: ReactNode;
}

export function Modal({ open, onClose, title, description, icon, tone, alert, inline, size, actions, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useDialogFocus(open, ref, onClose);
  if (!open) return null;
  return (
    <div className={cx("ns-scrim", inline && "ns-scrim--inline")} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} className={cx("ns-dialog ns-modal", size && "ns-modal--" + size)} role={alert ? "alertdialog" : "dialog"} aria-modal aria-labelledby={tid}>
        {icon ? <span className={cx("ns-dialog-seal", tone && "ns-dialog-seal--" + tone)} aria-hidden><Icon name={icon} size={20} /></span> : null}
        <h2 id={tid} className="ns-dialog-title">{title}</h2>
        {description ? <p className="ns-dialog-text">{description}</p> : null}
        {children}
        {actions ? <div className="ns-dialog-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  onClose?: () => void;
  eyebrow?: string;
  title: ReactNode;
  inline?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
}

export function Drawer({ open, onClose, eyebrow, title, inline, footer, children }: DrawerProps) {
  const ref = useRef<HTMLElement>(null);
  const tid = useId();
  useDialogFocus(open, ref, onClose);
  if (!open) return null;
  return (
    <div className={cx("ns-scrim ns-scrim--drawer", inline && "ns-scrim--inline")} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <aside ref={ref} className="ns-drawer" role="dialog" aria-modal aria-labelledby={tid}>
        <header className="ns-drawer-head">
          <div>{eyebrow ? <span className="ns-overline">{eyebrow}</span> : null}<h2 id={tid}>{title}</h2></div>
          <IconAction icon="close" label="Cerrar panel" onClick={onClose} />
        </header>
        <div className="ns-drawer-body">{children}</div>
        {footer ? <footer className="ns-drawer-foot">{footer}</footer> : null}
      </aside>
    </div>
  );
}

interface ConfirmActionProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: string;
  confirmIcon?: IconName;
  icon?: IconName;
  tone?: "sage" | "burgundy";
  danger?: boolean;
  inline?: boolean;
  /** Mientras se guarda: el botón de confirmar muestra «Guardando…» y no se puede pulsar dos veces. */
  loading?: boolean;
  children?: ReactNode;
}

/** Confirmación de una acción con Cancelar enfocado por defecto. */
export function ConfirmAction({ open, onCancel, onConfirm, title, description, confirmLabel, confirmIcon, icon, tone, danger, inline, loading, children }: ConfirmActionProps) {
  return (
    <Modal
      open={open} onClose={onCancel} alert inline={inline} icon={icon || "warning"} tone={tone} title={title} description={description}
      actions={<>
        <Button variant="secondary" onClick={onCancel} data-autofocus>Cancelar</Button>
        <Button variant={danger ? "danger" : "primary"} icon={confirmIcon} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}
    >
      {children}
    </Modal>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  count?: number;
  title?: ReactNode;
  description?: ReactNode;
  note?: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  inline?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
}

/** Confirmación masiva al guardar: vidrio, sello y foco atrapado (role="alertdialog"). */
export function ConfirmDialog({ open, count, title, description, note, confirmLabel, loading, inline, onCancel, onConfirm }: ConfirmDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId(), descId = titleId + "-d";
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Tab" && node) {
        const f = node.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
    // Igual que el sistema: solo depende de `open`.
  }, [open]);
  if (!open) return null;
  return (
    <div className={cx("ns-scrim", inline && "ns-scrim--inline")} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}>
      <div ref={ref} className="ns-dialog ns-glass" role="alertdialog" aria-modal aria-labelledby={titleId} aria-describedby={descId}>
        <span className="ns-dialog-seal" aria-hidden><Icon name="lock" size={20} /></span>
        <h2 id={titleId} className="ns-dialog-title">{title || "¿Confirmar " + count + " calificaciones?"}</h2>
        <p id={descId} className="ns-dialog-text">{description || "Las calificaciones verificadas serán guardadas."}</p>
        {note ? <Badge tone="review">{note}</Badge> : null}
        <div className="ns-dialog-actions">
          <Button variant="secondary" onClick={onCancel} data-autofocus>Cancelar</Button>
          <Button variant="primary" icon="lock" loading={loading} onClick={onConfirm}>{confirmLabel || "Confirmar y guardar"}</Button>
        </div>
      </div>
    </div>
  );
}

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
  user?: { name: string; email?: string };
  inline?: boolean;
  /** Envía el enlace de restablecimiento. Sin él (demostración), se simula. */
  onSend?: () => Promise<void>;
}

/** Restablecer acceso: nunca muestra ni recupera la contraseña, genera un acceso nuevo. */
export function PasswordResetDialog({ open, onClose, user, inline, onSend }: PasswordResetDialogProps) {
  const [st, setSt] = useState<"ask" | "busy" | "done" | "error">("ask");
  const timer = useRef<number>();
  useEffect(() => { if (open) setSt("ask"); }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const u = user || { name: "" };
  function go() {
    setSt("busy");
    if (onSend) { onSend().then(() => setSt("done"), () => setSt("error")); return; }
    // Demostración: se simula la petición.
    timer.current = window.setTimeout(() => setSt("done"), 900);
  }
  const done = st === "done";
  return (
    <Modal
      open={open} inline={inline} onClose={onClose} alert icon={done ? "check" : "key"} tone={done ? "sage" : undefined}
      title={done ? "Solicitud enviada" : "Restablecer contraseña"}
      description={done ? "La solicitud de restablecimiento fue realizada correctamente." : "¿Deseas generar un nuevo acceso para este usuario?"}
      actions={done
        ? <Button onClick={onClose} data-autofocus>Entendido</Button>
        : <>
          <Button variant="secondary" onClick={onClose} data-autofocus>Cancelar</Button>
          <Button icon="key" loading={st === "busy"} loadingText="Generando…" onClick={go}>Restablecer contraseña</Button>
        </>}
    >
      <div className="ns-mini-profile"><Avatar name={u.name} size="sm" /><div><strong>{u.name}</strong><span className="ns-caption">{u.email}</span></div></div>
      {done
        ? <p className="ns-caption">{"Se envió un enlace de un solo uso a " + (u.email || "su correo") + ". NotaScan nunca muestra contraseñas."}</p>
        : st === "error"
          ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />No pudimos enviar el enlace. Revisa tu conexión e inténtalo de nuevo.</span>
          : <p className="ns-caption"><Icon name="lock" size={14} /> La contraseña actual no se muestra ni se recupera: se genera un acceso nuevo.</p>}
    </Modal>
  );
}
