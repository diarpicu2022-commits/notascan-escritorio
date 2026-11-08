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
import { useI18n } from "../../i18n/I18nProvider";
import { shortDayYear } from "../../i18n/dates";

/** 05 · ¿Qué puedo consultar o exportar? Solo calificaciones verificadas. */
export function ReportsPage() {
  return DEMO ? <DemoReportsPage /> : <RealReportsPage />;
}

/** Tipos de reporte: el título y la descripción salen del diccionario (t.tch.rep.types). El documento sale en español (I7). */
const REPORT_TYPES: Array<{ kind: "course" | "student" | "evaluation"; tone: "navy" | "sage" | "gold"; icon: IconName }> = [
  { kind: "course", tone: "navy", icon: "reports" },
  { kind: "student", tone: "sage", icon: "user" },
  { kind: "evaluation", tone: "gold", icon: "evaluations" },
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
  const { t, lang, date, time } = useI18n();
  const x = t.tch.rep;
  const periods = scope.data?.periods ?? [];
  const courses = scope.data?.courses ?? [];
  const curCourse = course ?? courses[0];
  const curPeriod = periods.find((p) => p.id === periodId) ?? periods.find((p) => p.status === "open") ?? periods[periods.length - 1];
  const students = useCourseStudents(pick === "student" ? curCourse : undefined);
  const evals = useCourseEvaluations(pick === "evaluation" ? curCourse : undefined, curPeriod?.id);
  const teacherOnly = profile?.role === "teacher" ? profile.email : null;

  async function run(kind: ReportKind, format: ReportFormat, params: Record<string, unknown>, save = true) {
    if (!school || !profile) {
      showToast({ tone: "error", title: x.error, message: x.noSchool });
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
      showToast({ tone: "success", title: x.ready, message: x.readyText(d.title, FORMAT_LABEL[format], format === "pdf") });
    } catch (e) {
      showToast({ tone: "error", title: x.error, message: e instanceof Error && /No encontramos/.test(e.message) ? x.notFound(e.message) : t.common.retryHint });
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
  if (scope.isPending && !scope.data) content = <LoadingBlocks rows={3} height={120} label={x.loading} />;
  else if (scope.isError && !scope.data) content = <ErrorState title={x.loadError} onRetry={() => scope.refetch()} />;
  else if (!courses.length || !curPeriod) content = <EmptyState icon="reports" title={courses.length ? x.noPeriods : x.noCourses} message={x.noneText} />;
  else content = (
    <>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <FilterGroup label={t.tch.f.format} value={fmt} onChange={(v) => setFmt(v as ReportFormat)} options={[{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }, { value: "csv", label: "CSV" }]} />
        <div className="ns-row">
          <FilterGroup as="select" label={t.tch.f.course} value={curCourse} onChange={setCourse} options={courses.map((c) => ({ value: c, label: c }))} />
          <FilterGroup as="select" label={t.tch.f.period} value={curPeriod.id} onChange={setPeriodId} options={periods.map((p) => ({ value: p.id, label: t.tch.periodName(p.name) + " · " + p.year }))} />
        </div>
      </div>
      <div className="ns-report-grid">
        {REPORT_TYPES.map((r) => (
          <article key={r.kind} className={cx("ns-block ns-report", "ns-block--" + r.tone)}>
            <span className="ns-bento-icon" aria-hidden><Icon name={r.icon} size={18} strokeWidth={2.5} /></span>
            <h3 className="ns-report-title">{x.types[r.kind][0]}</h3>
            <p className="ns-report-text">{x.types[r.kind][1]}</p>
            <Button variant={r.tone === "navy" ? "primary" : "secondary"} icon="download" loading={r.kind === "course" && !!busy?.startsWith("course")} loadingText={x.generating} onClick={() => generate(r.kind)}>{x.generate}</Button>
          </article>
        ))}
      </div>
      <Block label={x.recentLabel}>
        <BlockTitle>{x.recent}</BlockTitle>
        {history.isPending && !history.data ? <LoadingBlocks rows={3} height={40} label={x.historyLoading} />
          : history.isError && !history.data ? <ErrorState title={x.historyError} onRetry={() => history.refetch()} />
            : !history.data?.length ? <EmptyState icon="file" title={x.historyEmptyTitle} message={x.historyEmptyText} />
              : (
                <DataTable
                  caption={x.caption}
                  rows={history.data}
                  columns={[
                    { key: "title", label: x.cols.report, render: (r) => <strong style={{ color: "var(--navy)" }}>{r.title}</strong> },
                    // En español, la fecha como la escribe el servicio; en inglés y portugués, con Intl.
                    { key: "at", label: x.cols.date, render: (r) => (lang === "es" || !r.created ? r.at : date(new Date(r.created)) + ", " + time(new Date(r.created))) },
                    { key: "format", label: x.cols.format, render: (r) => <Badge tone="neutral" icon="file">{FORMAT_LABEL[r.format]}</Badge> },
                    { key: "by", label: x.cols.by, render: () => profile?.fullName ?? "" },
                    { key: "a", label: x.cols.action, render: (r) => <Button variant="ghost" size="sm" icon="download" aria-label={x.downloadAria(r.title)} loading={busy === r.kind + JSON.stringify(r.params) + r.format} loadingText={x.generating} onClick={() => run(r.kind, r.format, r.params, false)}>{x.download}</Button> },
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
      <Header eyebrow={x.eyebrow} title={x.title} highlight={x.title}
        description={teacherOnly ? x.descTeacher : x.descAll} />
      {content}
      <Modal
        open={!!pick} onClose={() => setPick(null)} icon={pick === "student" ? "user" : "evaluations"}
        title={pick === "student" ? x.byStudent : x.byEvaluation}
        description={pick === "student" ? x.studentDesc(String(curPeriod?.year ?? ""), curCourse ?? "") : x.evaluationDesc(curCourse ?? "", t.tch.periodName(curPeriod?.name ?? ""))}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setPick(null)}>{t.common.cancel}</Button>,
          <Button key="g" icon="download" disabled={!choice} loading={!!busy} loadingText={x.generating} onClick={() => {
            const kind = pick!;
            setPick(null);
            run(kind, fmt, kind === "student" ? { studentId: choice, year: curPeriod?.year } : { evaluationId: Number(choice) });
          }}>{x.generateFmt(FORMAT_LABEL[fmt])}</Button>,
        ]}
      >
        {loadingOptions ? <LoadingBlocks rows={1} height={44} label={x.loadingOptions} />
          : options.length ? <Select label={pick === "student" ? t.tch.f.student : t.tch.f.evaluation} required value={choice} placeholder={t.tch.f.choose} onChange={setChoice} options={options} />
            : <EmptyState icon="file" title={pick === "student" ? x.noStudents : x.noEvaluations} message={x.otherCourse} />}
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
  const { t, lang } = useI18n();
  const x = t.tch.rep;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  function gen(name: string) {
    setToast({ tone: "success", title: x.ready, message: name + " · " + fmt.toUpperCase() });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }
  const types = REPORT_TYPES.map((r) => ({ ...r, t: x.types[r.kind][0], d: x.types[r.kind][1] }));
  return (
    <PageShell active="reports" overlay={toast ? <div className="ns-toast-region"><Toast {...toast} /></div> : null}>
      <Header eyebrow={x.eyebrow} title={x.title} highlight={x.title} description={x.descTeacher} />
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <FilterGroup label={t.tch.f.format} value={fmt} onChange={setFmt} options={[{ value: "pdf", label: "PDF" }, { value: "xlsx", label: "Excel" }, { value: "csv", label: "CSV" }]} />
        <div className="ns-row">
          <FilterGroup as="select" label={t.tch.f.course} options={[{ value: "5a", label: "7A" }, { value: "5b", label: "7B" }]} />
          <FilterGroup as="select" label={t.tch.f.period} options={[{ value: "2026-2", label: "2026-2" }, { value: "2026-1", label: "2026-1" }]} />
        </div>
      </div>
      <div className="ns-report-grid">
        {types.map((r) => (
          <article key={r.t} className={cx("ns-block ns-report", "ns-block--" + r.tone)}>
            <span className="ns-bento-icon" aria-hidden><Icon name={r.icon} size={18} strokeWidth={2.5} /></span>
            <h3 className="ns-report-title">{r.t}</h3>
            <p className="ns-report-text">{r.d}</p>
            <Button variant={r.tone === "navy" ? "primary" : "secondary"} icon="download" onClick={() => gen(r.t)}>{x.generate}</Button>
          </article>
        ))}
      </div>
      <Block label={x.recentLabel}>
        <BlockTitle>{x.recent}</BlockTitle>
        {/* Los nombres son títulos de documentos, que salen en español (I7); la fecha va en el idioma. */}
        <DataTable
          caption={x.caption}
          rows={[
            { id: 1, name: "Consolidado 7A · corte 2", date: "2026-09-29", f: "PDF", by: "Ana Lucía Rosero" },
            { id: 2, name: "Parcial 1 · Matemáticas", date: "2026-09-02", f: "Excel", by: "Ana Lucía Rosero" },
            { id: 3, name: "María Fernanda López", date: "2026-08-30", f: "PDF", by: "Ana Lucía Rosero" },
          ]}
          columns={[
            { key: "name", label: x.cols.report, render: (r) => <strong style={{ color: "var(--navy)" }}>{r.name}</strong> },
            { key: "date", label: x.cols.date, render: (r) => shortDayYear(lang, r.date) },
            { key: "f", label: x.cols.format, render: (r) => <Badge tone="neutral" icon="file">{r.f}</Badge> },
            { key: "by", label: x.cols.by },
            { key: "a", label: x.cols.action, render: (r) => <Button variant="ghost" size="sm" icon="download" aria-label={x.downloadAria(r.name)}>{x.download}</Button> },
          ]}
        />
      </Block>
    </PageShell>
  );
}
