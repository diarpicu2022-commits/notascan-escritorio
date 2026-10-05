import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { useAuth } from "../../app/AuthContext";
import { DEMO } from "../../lib/supabase";
import { Select } from "../../components/atoms/Field";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Modal } from "../../components/organisms/Overlays";
import { ErrorState, LoadingBlocks } from "../../components/organisms/QueryState";
import { PrintReport, type ReportData } from "../../components/organisms/ReportDocument";
import { useToast } from "../../components/organisms/Toast";
import { useMyInstitution } from "../../services/institution";
import {
  FORMAT_LABEL, buildCourseReport, buildEvaluationReport, buildStudentReport, downloadCsv, downloadXlsx, useCourseEvaluations, useCourseStudents,
  useReportHistory, useReportScope, useSaveReportHistory, type ReportFormat, type ReportKind,
} from "../../services/reports";
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
  return DEMO ? <DemoReportsPage /> : <RealReportsPage />;
}

const REPORT_TYPES: Array<{ kind: "course" | "student" | "evaluation"; t: string; d: string; tone: "navy" | "sage" | "gold"; icon: IconName }> = [
  { kind: "course", t: "Consolidado por curso", d: "Notas definitivas y promedio ponderado de cada estudiante.", tone: "navy", icon: "reports" },
  { kind: "student", t: "Por estudiante", d: "Historial de calificaciones y observaciones de un estudiante.", tone: "sage", icon: "user" },
  { kind: "evaluation", t: "Por evaluación", d: "Distribución de notas, confianza de IA y correcciones manuales.", tone: "gold", icon: "evaluations" },
];

/** Reportes con datos de la base (paso 6c): PDF por impresión, Excel y CSV; el historial guarda qué se generó. */
function RealReportsPage() {
  const { profile } = useAuth();
  const school = useMyInstitution().data;
  const scope = useReportScope();
  const history = useReportHistory();
  const saveHistory = useSaveReportHistory();
  const [fmt, setFmt] = useState<ReportFormat>("pdf");
  const [course, setCourse] = useState<string | undefined>();
  const [periodId, setPeriodId] = useState<string | undefined>();
  const [pick, setPick] = useState<"student" | "evaluation" | null>(null);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [printing, setPrinting] = useState<ReportData | null>(null);
  const [showToast, toastNode] = useToast();
  const periods = scope.data?.periods ?? [];
  const courses = scope.data?.courses ?? [];
  const curCourse = course ?? courses[0];
  const curPeriod = periods.find((p) => p.id === periodId) ?? periods.find((p) => p.status === "open") ?? periods[periods.length - 1];
  const students = useCourseStudents(pick === "student" ? curCourse : undefined);
  const evals = useCourseEvaluations(pick === "evaluation" ? curCourse : undefined, curPeriod?.id);
  const teacherOnly = profile?.role === "teacher" ? profile.email : null;

  async function run(kind: ReportKind, format: ReportFormat, params: Record<string, unknown>, save = true) {
    if (!school || !profile) {
      showToast({ tone: "error", title: "No pudimos generar el reporte", message: "Faltan los datos del colegio. Recarga la página e inténtalo de nuevo." });
      return;
    }
    const ctx = { school, me: profile.fullName };
    const key = kind + JSON.stringify(params) + format;
    setBusy(key);
    try {
      const p = periods.find((x) => x.id === params.periodId);
      const d = kind === "course" ? await buildCourseReport(ctx, String(params.course), p!, teacherOnly)
        : kind === "student" ? await buildStudentReport(ctx, String(params.studentId), periods, Number(params.year), teacherOnly)
          : await buildEvaluationReport(ctx, Number(params.evaluationId), periods);
      if (format === "pdf") setPrinting(d);
      else if (format === "xlsx") await downloadXlsx(d);
      else downloadCsv(d);
      if (save) saveHistory.mutate({ kind, format, title: d.title, params });
      showToast({ tone: "success", title: "Reporte listo", message: d.title + " · " + FORMAT_LABEL[format] + (format === "pdf" ? ". Elige «Guardar como PDF» en el diálogo de impresión." : ".") });
    } catch (e) {
      showToast({ tone: "error", title: "No pudimos generar el reporte", message: e instanceof Error && /No encontramos/.test(e.message) ? e.message : "Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  function generate(kind: "course" | "student" | "evaluation") {
    if (kind === "course") return run("course", fmt, { course: curCourse, periodId: curPeriod?.id });
    setChoice("");
    setPick(kind);
  }

  let content: ReactNode;
  if (scope.isPending && !scope.data) content = <LoadingBlocks rows={3} height={120} label="Cargando cursos y periodos" />;
  else if (scope.isError && !scope.data) content = <ErrorState title="No pudimos cargar los cursos y periodos." onRetry={() => scope.refetch()} />;
  else if (!courses.length || !curPeriod) content = <EmptyState icon="reports" title={courses.length ? "Aún no hay periodos en el año lectivo." : "No tienes cursos asignados."} message="Los reportes usan los cursos de la malla curricular y los periodos que configura Secretaría." />;
  else content = (
    <>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <FilterGroup label="Formato" value={fmt} onChange={(v) => setFmt(v as ReportFormat)} options={[{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }, { value: "csv", label: "CSV" }]} />
        <div className="ns-row">
          <FilterGroup as="select" label="Curso" value={curCourse} onChange={setCourse} options={courses.map((c) => ({ value: c, label: c }))} />
          <FilterGroup as="select" label="Periodo" value={curPeriod.id} onChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: p.name + " · " + p.year }))} />
        </div>
      </div>
      <div className="ns-report-grid">
        {REPORT_TYPES.map((r) => (
          <article key={r.t} className={cx("ns-block ns-report", "ns-block--" + r.tone)}>
            <span className="ns-bento-icon" aria-hidden><Icon name={r.icon} size={18} strokeWidth={2.5} /></span>
            <h3 className="ns-report-title">{r.t}</h3>
            <p className="ns-report-text">{r.d}</p>
            <Button variant={r.tone === "navy" ? "primary" : "secondary"} icon="download" loading={r.kind === "course" && !!busy?.startsWith("course")} loadingText="Generando…" onClick={() => generate(r.kind)}>Generar</Button>
          </article>
        ))}
      </div>
      <Block label="Reportes recientes">
        <BlockTitle>Recientes</BlockTitle>
        {history.isPending && !history.data ? <LoadingBlocks rows={3} height={40} label="Cargando el historial" />
          : history.isError && !history.data ? <ErrorState title="No pudimos cargar el historial." onRetry={() => history.refetch()} />
            : !history.data?.length ? <EmptyState icon="file" title="Aún no has generado reportes." message="Cada reporte que generes quedará aquí para volver a descargarlo con los datos del momento." />
              : (
                <DataTable
                  caption="Reportes generados recientemente"
                  rows={history.data}
                  columns={[
                    { key: "title", label: "Reporte", render: (r) => <strong style={{ color: "var(--navy)" }}>{r.title}</strong> },
                    { key: "at", label: "Fecha" },
                    { key: "format", label: "Formato", render: (r) => <Badge tone="neutral" icon="file">{FORMAT_LABEL[r.format]}</Badge> },
                    { key: "by", label: "Generado por", render: () => profile?.fullName ?? "" },
                    { key: "a", label: "Acción", render: (r) => <Button variant="ghost" size="sm" icon="download" aria-label={"Descargar " + r.title} loading={busy === r.kind + JSON.stringify(r.params) + r.format} loadingText="Generando…" onClick={() => run(r.kind, r.format, r.params, false)}>Descargar</Button> },
                  ]}
                />
              )}
      </Block>
    </>
  );

  const options = pick === "student" ? (students.data ?? []).map((s) => ({ value: s.id, label: s.full_name })) : (evals.data ?? []).map((e) => ({ value: String(e.id), label: e.label }));
  const loadingOptions = pick === "student" ? students.isPending : evals.isPending;
  return (
    <PageShell active="reports">
      <Header eyebrow="Consultar · exportar · revisar" title="Reportes" highlight="Reportes"
        description={teacherOnly ? "Genera reportes solo con calificaciones verificadas por ti." : "Genera reportes con las calificaciones verificadas de la institución."} />
      {content}
      <Modal
        open={!!pick} onClose={() => setPick(null)} icon={pick === "student" ? "user" : "evaluations"}
        title={pick === "student" ? "Reporte por estudiante" : "Reporte por evaluación"}
        description={pick === "student" ? "Historial del año " + (curPeriod?.year ?? "") + " y observaciones de un estudiante de " + curCourse + "." : "Evaluaciones de " + curCourse + " en " + (curPeriod?.name ?? "") + "."}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setPick(null)}>Cancelar</Button>,
          <Button key="g" icon="download" disabled={!choice} loading={!!busy} loadingText="Generando…" onClick={() => {
            const kind = pick!;
            setPick(null);
            run(kind, fmt, kind === "student" ? { studentId: choice, year: curPeriod?.year } : { evaluationId: Number(choice) });
          }}>{"Generar " + FORMAT_LABEL[fmt]}</Button>,
        ]}
      >
        {loadingOptions ? <LoadingBlocks rows={1} height={44} label="Cargando opciones" />
          : options.length ? <Select label={pick === "student" ? "Estudiante" : "Evaluación"} required value={choice} placeholder="Selecciona" onChange={setChoice} options={options} />
            : <EmptyState icon="file" title={pick === "student" ? "El curso no tiene estudiantes activos." : "No hay evaluaciones en este curso y periodo."} message="Elige otro curso o periodo." />}
      </Modal>
      {printing ? <PrintReport data={printing} onDone={() => setPrinting(null)} /> : null}
      {toastNode}
    </PageShell>
  );
}

/** El Reportes del sistema (demostración, sin cambios). */
function DemoReportsPage() {
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
