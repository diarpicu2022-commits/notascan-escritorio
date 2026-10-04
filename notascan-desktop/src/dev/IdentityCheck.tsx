import { useEffect, useState } from "react";
import { IdentityEditor, IdentityPreview } from "../components/organisms/InstitutionIdentity";
import { Block, BlockTitle } from "../components/organisms/Layout";
import { DEMO_INSTITUTION, type Institution } from "../services/institution";

/**
 * Vista temporal del paso 7b (solo demostración): editor de identidad del colegio y su vista previa en vivo, el
 * componente clave de la consola de la plataforma. El logo se ve al instante con una URL local; subirlo es del 7d.
 */
export function IdentityCheck() {
  const [v, setV] = useState<Institution>(DEMO_INSTITUTION);
  const [tried] = useState(true);
  useEffect(() => () => { if (v.logoUrl?.startsWith("blob:")) URL.revokeObjectURL(v.logoUrl); }, [v.logoUrl]);
  return (
    <main className="ns ns-canvas" style={{ minHeight: "100vh", padding: "var(--space-7)" }}>
      <p className="ns-overline">Paso 7b · Componente clave</p>
      <h1 className="ns-serif" style={{ font: "800 40px/44px var(--font-display)", margin: "var(--space-2) 0 var(--space-6)" }}>Identidad del colegio</h1>
      <div className="ns-identity-grid">
        <Block label="Datos del colegio">
          <BlockTitle>Datos del colegio</BlockTitle>
          <IdentityEditor value={v} onChange={setV} tried={tried} onLogo={(f) => setV((cur) => ({ ...cur, logoUrl: f ? URL.createObjectURL(f) : null }))} />
        </Block>
        <IdentityPreview institution={v} />
      </div>
    </main>
  );
}
