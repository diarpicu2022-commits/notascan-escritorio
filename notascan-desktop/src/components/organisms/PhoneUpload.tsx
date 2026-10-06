import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { StatusDot } from "../atoms/StatusDot";
import { Modal } from "./Overlays";
import { phoneLink, type PhoneSession } from "../../services/phoneUpload";

/*
 * Subir desde el celular · ventana del QR (2026-10-06). Piezas del sistema: Modal, Button, StatusDot, iconos de la
 * familia. Referentes del anexo 2026-10-06-subir-desde-el-celular.md: pasos numerados al lado del QR y código que vence
 * (WhatsApp Web); las fotos entran solas a la lista (Quick Pic). Lectura obligada: nada decorativo junto al QR.
 */

function useCountdown(expiresAt: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  if (!expiresAt) return { left: 0, label: "" };
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return { left, label: m + ":" + String(s).padStart(2, "0") };
}

export function PhoneUploadDialog({ open, session, received, evaluationName, onClose, onRenew, onFinish, error }: {
  open: boolean; session: PhoneSession | null; received: number; evaluationName: string; error?: string | null;
  onClose: () => void; onRenew: () => void; onFinish: () => void;
}) {
  const [svg, setSvg] = useState<string>("");
  const { left, label } = useCountdown(session?.expiresAt);
  useEffect(() => {
    if (!session) { setSvg(""); return; }
    // Colores del sistema (navy sobre papel); el QR no lleva logo encima para que lo lea cualquier cámara.
    void QRCode.toString(phoneLink(session.token), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1b2a4a", light: "#fffdf8" } }).then(setSvg);
  }, [session?.token]);
  const expired = !!session && left === 0;
  return (
    <Modal open={open} onClose={onClose} size="doc" title="Toma las fotos con el celular"
      description={"Las fotos llegan solas a «" + evaluationName + "» y la IA las lee como las que arrastras."}
      actions={[
        <Button key="c" variant="secondary" onClick={onClose}>Cerrar ventana</Button>,
        <Button key="f" icon="check" onClick={onFinish}>Terminar</Button>,
      ]}>
      <div className="ns-phone-pair">
        <div className="ns-phone-qr" aria-label="Código QR para abrir la página de fotos en el celular" role="img">
          {error ? <span className="ns-caption"><Icon name="error" size={16} /> {error}</span>
            : expired ? (
              <div className="ns-phone-qr-expired">
                <strong>El código venció</strong>
                <Button variant="secondary" icon="refresh" onClick={onRenew}>Generar otro</Button>
              </div>
            ) : svg ? <img src={"data:image/svg+xml;utf8," + encodeURIComponent(svg)} alt="" width={232} height={232} /> : <span className="ns-caption">Generando el código…</span>}
        </div>
        <div className="ns-col" style={{ gap: 16 }}>
          <ol className="ns-phone-steps">
            <li><span>1</span><div><strong>Apunta la cámara del celular al código.</strong><small>Se abre la página de NotaScan; no hay que instalar nada ni iniciar sesión.</small></div></li>
            <li><span>2</span><div><strong>Toca «Tomar foto» por cada hoja.</strong><small>Hoja completa, con luz y sin sombras; el código y el nombre a la vista.</small></div></li>
            <li><span>3</span><div><strong>Revisa aquí.</strong><small>Cada foto aparece en la lista y la IA la lee; tú confirmas cada nota.</small></div></li>
          </ol>
          <div className="ns-phone-status" aria-live="polite">
            <StatusDot status={received ? "success" : expired ? "warning" : "processing"}
              label={received ? (received === 1 ? "1 foto recibida" : received + " fotos recibidas") : expired ? "Sin fotos" : "Esperando fotos"} />
            {session && !expired ? <span className="ns-caption">{"El código vence en " + label}</span> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
