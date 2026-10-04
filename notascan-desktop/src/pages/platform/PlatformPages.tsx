import { useState } from "react";
import { useShell } from "../../app/ShellContext";
import { Button } from "../../components/atoms/Button";
import { SegmentedTabs } from "../../components/atoms/Controls";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { LoadingBlocks } from "../../components/organisms/QueryState";
import { PageShell } from "../../components/templates/PageShell";

/*
 * Consola de la plataforma (paso 7c · esqueleto). Contrato del anexo 2026-10-03-consola-plataforma.md:
 * dirección A · Registro de colegios. Las regiones están en su sitio y en su orden; los datos llegan en 7d.
 */

const STATUS_TABS = [{ value: "active", label: "Activos" }, { value: "implementation", label: "Implementación" }, { value: "suspended", label: "Suspendidos" }];

/** Lista de colegios: pestañas por estado y la tabla (una sola acción primaria: dar de alta). */
export function PlatformSchoolsPage() {
  const [tab, setTab] = useState("active");
  return (
    <PageShell active="dashboard">
      <Header eyebrow="Plataforma NotaScan" title="Colegios" highlight="Colegios"
        description="Los colegios que usan NotaScan: su estado, cómo lo están usando y su identidad."
        actions={<Button size="lg" icon="plus" disabled>Dar de alta un colegio</Button>} />
      <SegmentedTabs label="Estado del colegio" value={tab} onChange={setTab} tabs={STATUS_TABS} />
      <Block label="Colegios">
        <LoadingBlocks rows={6} label="Lista de colegios: colegio, ciudad, estudiantes, uso de 7 días y adopción" />
      </Block>
    </PageShell>
  );
}

/** Detalle de un colegio: «Requiere atención» primero, luego el uso y la identidad con su vista previa. */
export function PlatformSchoolPage(_props: { id?: string }) {
  const { navigate } = useShell();
  return (
    <PageShell active="dashboard">
      <Header eyebrow="Colegios" title="Colegio" description="Lo que requiere atención, su uso y su identidad."
        actions={<>
          <Button variant="secondary" icon="chevleft" onClick={() => navigate("dashboard")}>Todos los colegios</Button>
          <Button size="lg" icon="check" disabled>Guardar identidad</Button>
        </>} />
      <Block tone="gold" label="Requiere atención">
        <BlockTitle>Requiere atención</BlockTitle>
        <LoadingBlocks rows={2} height={36} label="Alertas del colegio" />
      </Block>
      <Block label="Uso">
        <BlockTitle>Uso</BlockTitle>
        <LoadingBlocks rows={3} height={64} label="Uso del colegio" />
      </Block>
      <Block label="Identidad">
        <BlockTitle>Identidad</BlockTitle>
        <LoadingBlocks rows={4} label="Identidad del colegio y vista previa" />
      </Block>
    </PageShell>
  );
}
