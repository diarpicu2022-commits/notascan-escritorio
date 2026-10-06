import { useState } from "react";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Field";
import { SegmentedTabs } from "../atoms/Controls";
import { Modal } from "./Overlays";
import { LEGAL, LegalDocument } from "./LegalDocument";
import { usePolicyConsent } from "../../services/privacy";

/**
 * Aceptación de la política de datos y los términos (paso 6g). Si la persona no aceptó la versión vigente, no puede
 * seguir hasta aceptarla o cerrar sesión; la aceptación queda en la base con la versión y la fecha.
 */
export function ConsentGate({ onLogout }: { onLogout: () => void }) {
  const { q, accept } = usePolicyConsent();
  const [checked, setChecked] = useState(false);
  const [doc, setDoc] = useState<"resumen" | "politica" | "terminos">("resumen");
  const [err, setErr] = useState(false);
  if (!q.data || q.data.accepted) return null;
  return (
    <Modal open size="doc" onClose={() => { /* no se puede cerrar sin aceptar o salir */ }} icon="lock" title="Política de tratamiento de datos"
      description={"Antes de usar NotaScan, lee y acepta la política de datos (versión " + q.data.version + ") y los términos de uso."}
      actions={[
        <Button key="s" variant="secondary" onClick={onLogout}>Cerrar sesión</Button>,
        <Button key="a" icon="check" disabled={!checked} loading={accept.isPending} onClick={() => { setErr(false); accept.mutateAsync().catch(() => setErr(true)); }}>Aceptar y continuar</Button>,
      ]}>
      <SegmentedTabs label="Documento" value={doc} onChange={(v) => setDoc(v as typeof doc)}
        tabs={[{ value: "resumen", label: "Resumen" }, { value: "politica", label: "Política completa" }, { value: "terminos", label: "Términos de uso" }]} />
      <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 8 }} tabIndex={0} aria-label="Texto del documento">
        {doc === "resumen" ? (
          <ul style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6 }}>
            <li>El colegio es el responsable de los datos; NotaScan los trata por su cuenta y solo para la gestión académica.</li>
            <li>Los datos de salud y de los acudientes solo los ven Secretaría y Rectoría.</li>
            <li>Las fotografías de los exámenes se leen con Anthropic (EE. UU.) solo para obtener la nota, que siempre verifica un docente, y se borran al cerrar el periodo.</li>
            <li>Tu cuenta es personal: NotaScan registra quién verifica notas, toma asistencia o decide solicitudes.</li>
            <li>Los titulares pueden conocer, corregir, exportar y pedir la supresión de sus datos en Secretaría.</li>
          </ul>
        ) : <LegalDocument text={doc === "politica" ? LEGAL.policy : LEGAL.terms} />}
      </div>
      <Checkbox label="Leí y acepto la política de tratamiento de datos y los términos de uso" checked={checked} onChange={setChecked} />
      {err ? <span className="ns-field-error" role="alert">No pudimos guardar tu aceptación. Revisa tu conexión e inténtalo de nuevo.</span> : null}
    </Modal>
  );
}
