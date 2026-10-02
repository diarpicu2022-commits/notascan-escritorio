import { useEffect, useRef, useState } from "react";
import { useShell } from "../../app/ShellContext";
import { cx } from "../../lib/cx";
import { formatGrade } from "../../lib/grade";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Progress } from "../../components/atoms/Controls";
import { Icon, type IconName } from "../../components/atoms/Icon";
import { Sticker } from "../../components/atoms/Sticker";
import { FilterGroup, FiltersBar } from "../../components/molecules/Filters";
import { ReviewStatus } from "../../components/molecules/ReviewStatus";
import { UserProfile } from "../../components/molecules/UserProfile";
import { DataTable } from "../../components/organisms/DataGrid";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { Toast, type ToastData } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import { EVALUATIONS, EVAL_STATUS, KIND, STUDENTS, type TeacherStudent } from "../../data/academic";

/** 03 · ¿Cómo va cada estudiante? */
export function StudentsPage() {
  const [q, setQ] = useState("");
  const [c, setC] = useState("all");
  const [st, setSt] = useState("all");
  const rows = STUDENTS.filter((s) => {
    const t = q.trim().toLowerCase();
    return (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0) && (c === "all" || s.course === c) && (st === "all" || s.status === st);
  });
  return (
    <PageShell active="students">
      <Header eyebrow="Matemáticas · Periodo 3 · 2026" title="Estudiantes" highlight="Estudiantes"
        description="Consulta el desempeño de cada estudiante y el estado de su última calificación."
        actions={<Button variant="secondary" icon="download">Exportar lista</Button>} />
      <FiltersBar
        search={q} onSearch={setQ} count={rows.length + " de " + STUDENTS.length + " estudiantes"}
        groups={[
          { label: "Curso", value: c, onChange: setC, options: [{ value: "all", label: "Todos" }, { value: "7A", label: "7A" }, { value: "7B", label: "7B" }] },
          { label: "Estado", as: "select", value: st, onChange: setSt, options: [{ value: "all", label: "Todos" }, { value: "verified", label: "Verificada" }, { value: "pending", label: "Pendiente" }, { value: "needs-review", label: "Requiere revisión" }] },
        ]}
      />
      {rows.length ? (
        <DataTable<TeacherStudent & Record<string, unknown>>
          caption="Estudiantes de Matemáticas" rows={rows as Array<TeacherStudent & Record<string, unknown>>}
          columns={[
            { key: "name", label: "Estudiante", render: (r) => <UserProfile name={r.name} role={"ID " + r.id} /> },
            { key: "course", label: "Curso", render: (r) => <Sticker tone={r.course === "7A" ? "gold" : "sage"} rotate={0}>{r.course}</Sticker> },
            { key: "avg", label: "Promedio", numeric: true, render: (r) => <span className="ns-table-grade">{formatGrade(r.avg)}</span> },
            { key: "perf", label: "Desempeño", render: (r) => (isNaN(r.avg) ? <span className="ns-caption">Sin datos</span> : <div style={{ minWidth: 120 }}><Progress value={r.avg - 1} total={4} tone={r.avg >= 4 ? "sage" : r.avg >= 3 ? "gold" : "burgundy"} label={"Desempeño de " + r.name} /></div>) },
            { key: "last", label: "Última evaluación" },
            { key: "status", label: "Estado", render: (r) => <ReviewStatus status={r.status} /> },
          ]}
        />
      ) : <EmptyState title="Ningún estudiante coincide." message="Prueba con otro nombre, ID o curso." icon="students" />}
    </PageShell>
  );
}

/** 04 · ¿Qué exámenes, talleres y actividades existen? */
export function EvaluationsPage() {
  const { navigate } = useShell();
  const [tab, setTab] = useState("all");
  const list = EVALUATIONS.filter((e) => tab === "all" || e.kind === tab);
  const assigned = EVALUATIONS.reduce((a, e) => a + e.weight, 0);
  return (
    <PageShell active="evaluations">
      <Header eyebrow="Matemáticas · 7A" title="Evaluaciones" highlight="Evaluaciones"
        description="Exámenes, talleres y actividades del periodo con su porcentaje y estado de revisión."
        actions={<Button size="lg" icon="plus">Nueva evaluación</Button>}
        tabs={[{ value: "all", label: "Todas" }, { value: "examen", label: "Exámenes" }, { value: "taller", label: "Talleres" }, { value: "actividad", label: "Actividades" }]}
        tab={tab} onTab={setTab} />
      <Block tone="gold" className="ns-weight">
        <div>
          <span className="ns-overline" style={{ color: "var(--navy)" }}>Porcentaje asignado</span>
          <div className="ns-weight-value">{assigned}<small>% de 100%</small></div>
        </div>
        <div className="ns-weight-bar" role="img" aria-label="Distribución de porcentajes">
          {EVALUATIONS.map((e) => <span key={e.id} className={"ns-weight-seg ns-weight-seg--" + e.kind} style={{ flex: e.weight }} title={e.name + " " + e.weight + "%"}>{e.weight + "%"}</span>)}
        </div>
      </Block>
      <div className="ns-eval-grid">
        {list.map((e, i) => {
          const st = EVAL_STATUS[e.status];
          return (
            <article key={e.id} className={cx("ns-eval", "ns-eval--" + e.kind)}>
              <div className="ns-eval-head"><Sticker tone={KIND[e.kind][1]} rotate={i % 2 ? 3 : -3}>{KIND[e.kind][0]}</Sticker><Badge tone={st[1]}>{st[0]}</Badge></div>
              <div className="ns-eval-body">
                <div><h3 className="ns-eval-title">{e.name}</h3><span className="ns-caption">{e.subject + " · " + e.date}</span></div>
                <div className="ns-eval-weight">{e.weight}<small>%</small></div>
              </div>
              <div className="ns-eval-foot">
                <div style={{ flex: 1, display: "grid", gap: 6 }}>
                  <span className="ns-caption">{e.reviewed + " de " + e.total + " verificadas"}</span>
                  <Progress value={e.reviewed} total={e.total} tone={e.status === "cerrada" ? "sage" : "gold"} label={"Avance de " + e.name} />
                </div>
                <Button variant={e.status === "en-revision" ? "primary" : "secondary"} size="sm" iconRight="arrow" onClick={() => navigate(e.status === "borrador" ? "grade" : "review")}>
                  {e.status === "en-revision" ? "Revisar" : e.status === "borrador" ? "Calificar" : "Ver"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}

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
