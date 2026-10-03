import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Icon, type IconName } from "../../components/atoms/Icon";
import { FilterGroup } from "../../components/molecules/Filters";
import { DataTable } from "../../components/organisms/DataGrid";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { Toast, type ToastData } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";

/** 05 · ¿Qué puedo consultar o exportar? Solo calificaciones verificadas. */
export function ReportsPage() {
  const [fmt, setFmt] = useState("pdf");
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function gen(name: string) {
    setToast({ tone: "success", title: "Reporte listo", message: name + " · " + fmt.toUpperCase() });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }
  const types: Array<{ t: string; d: string; tone: "navy" | "sage" | "gold"; icon: IconName }> = [
    { t: "Consolidado por curso", d: "Notas definitivas y promedio ponderado de cada estudiante.", tone: "navy", icon: "reports" },
    { t: "Por estudiante", d: "Historial de calificaciones y observaciones de un estudiante.", tone: "sage", icon: "user" },
    { t: "Por evaluación", d: "Distribución de notas, confianza de IA y correcciones manuales.", tone: "gold", icon: "evaluations" },
  ];
  return (
    <PageShell active="reports" overlay={toast ? <div className="ns-toast-region"><Toast {...toast} /></div> : null}>
      <Header eyebrow="Consultar · exportar · revisar" title="Reportes" highlight="Reportes" description="Genera reportes solo con calificaciones verificadas por ti." />
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <FilterGroup label="Formato" value={fmt} onChange={setFmt} options={[{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }, { value: "csv", label: "CSV" }]} />
        <div className="ns-row">
          <FilterGroup as="select" label="Curso" options={[{ value: "5a", label: "7A" }, { value: "5b", label: "7B" }]} />
          <FilterGroup as="select" label="Periodo" options={[{ value: "2026-2", label: "2026-2" }, { value: "2026-1", label: "2026-1" }]} />
        </div>
      </div>
      <div className="ns-report-grid">
        {types.map((r) => (
          <article key={r.t} className={cx("ns-block ns-report", "ns-block--" + r.tone)}>
            <span className="ns-bento-icon" aria-hidden><Icon name={r.icon} size={18} strokeWidth={2.5} /></span>
            <h3 className="ns-report-title">{r.t}</h3>
            <p className="ns-report-text">{r.d}</p>
            <Button variant={r.tone === "navy" ? "primary" : "secondary"} icon="download" onClick={() => gen(r.t)}>Generar</Button>
          </article>
        ))}
      </div>
      <Block label="Reportes recientes">
        <BlockTitle>Recientes</BlockTitle>
        <DataTable
          caption="Reportes generados recientemente"
          rows={[
            { id: 1, name: "Consolidado 7A · corte 2", date: "29 sep 2026", f: "PDF", by: "Ana Lucía Rosero" },
            { id: 2, name: "Parcial 1 · Matemáticas", date: "2 sep 2026", f: "Excel", by: "Ana Lucía Rosero" },
            { id: 3, name: "María Fernanda López", date: "30 ago 2026", f: "PDF", by: "Ana Lucía Rosero" },
          ]}
          columns={[
            { key: "name", label: "Reporte", render: (r) => <strong style={{ color: "var(--navy)" }}>{r.name}</strong> },
            { key: "date", label: "Fecha" },
            { key: "f", label: "Formato", render: (r) => <Badge tone="neutral" icon="file">{r.f}</Badge> },
            { key: "by", label: "Generado por" },
            { key: "a", label: "Acción", render: (r) => <Button variant="ghost" size="sm" icon="download" aria-label={"Descargar " + r.name}>Descargar</Button> },
          ]}
        />
      </Block>
    </PageShell>
  );
}
