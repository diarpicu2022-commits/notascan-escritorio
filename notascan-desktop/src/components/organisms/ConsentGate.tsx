import { useState } from "react";
import { Button } from "../atoms/Button";
import { Checkbox } from "../atoms/Field";
import { SegmentedTabs } from "../atoms/Controls";
import { Modal } from "./Overlays";
import { LegalDocument, legalFor } from "./LegalDocument";
import { usePolicyConsent } from "../../services/privacy";
import { useI18n } from "../../i18n/I18nProvider";

/**
 * Aceptación de la política de datos y los términos (paso 6g). Si la persona no aceptó la versión vigente, no puede
 * seguir hasta aceptarla o cerrar sesión; la aceptación queda en la base con la versión y la fecha.
 */
export function ConsentGate({ onLogout }: { onLogout: () => void }) {
  const { q, accept } = usePolicyConsent();
  const [checked, setChecked] = useState(false);
  const [doc, setDoc] = useState<"resumen" | "politica" | "terminos">("resumen");
  const [err, setErr] = useState(false);
  const { t, lang } = useI18n();
  const x = t.adm.consent;
  const legal = legalFor(lang);
  if (!q.data || q.data.accepted) return null;
  return (
    <Modal open size="doc" onClose={() => { /* no se puede cerrar sin aceptar o salir */ }} icon="lock" title={x.title}
      description={x.desc(String(q.data.version))}
      actions={[
        <Button key="s" variant="secondary" onClick={onLogout}>{x.logout}</Button>,
        <Button key="a" icon="check" disabled={!checked} loading={accept.isPending} onClick={() => { setErr(false); accept.mutateAsync().catch(() => setErr(true)); }}>{x.accept}</Button>,
      ]}>
      <SegmentedTabs label={x.doc} value={doc} onChange={(v) => setDoc(v as typeof doc)}
        tabs={(["resumen", "politica", "terminos"] as const).map((k) => ({ value: k, label: x.tabs[k] }))} />
      <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 8 }} tabIndex={0} aria-label={x.textAria}>
        {doc === "resumen" ? (
          <ul style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6 }}>
            {x.summary.map((li) => <li key={li}>{li}</li>)}
          </ul>
        ) : (
          <>
            {/* Paso 6: el texto completo ya está en el idioma y dice al comienzo que rige el español. */}
            {x.fullNote ? <p className="ns-caption" style={{ margin: 0 }}>{x.fullNote}</p> : null}
            <LegalDocument text={doc === "politica" ? legal.policy : legal.terms} />
          </>
        )}
      </div>
      <Checkbox label={x.check} checked={checked} onChange={setChecked} />
      {err ? <span className="ns-field-error" role="alert">{x.error}</span> : null}
    </Modal>
  );
}
