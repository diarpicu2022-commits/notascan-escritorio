import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatGrade } from "../../../lib/grade";
import { GRADE_NAME } from "../../../data/academic";
import { PERIODS, exportCSV } from "../../../data/admin";
import { COURSES, type StudentRecord } from "../../../data/students";
import { DEMO } from "../../../lib/supabase";
import { rankRows, saveClearance, useAcademic, type ClearKey, type RankRow } from "../../../services/enrollment";
import { cardOf, useMarkGenerated, useReportCards, type RcRow, type RcState } from "../../../services/reportCards";
import { useStudents } from "../../../services/students";
import { Avatar } from "../../atoms/Avatar";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction } from "../../atoms/Controls";
import type { IconName } from "../../atoms/Icon";
import { Switch } from "../../atoms/Switch";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { ConfirmAction, Modal } from "../Overlays";
import { ReportCardView } from "../ReportCardDocument";
import { PrintDocuments } from "../PrintDocuments";
import { useToast } from "../Toast";

/* ---------- Boletines ---------- */

const RC: Record<RcState, [string, BadgeTone, IconName]> = { pending: ["Pendiente", "pending", "clock"], generated: ["Generado", "verified", "check"], blocked: ["Bloqueado · paz y salvo", "review", "lock"] };

/** Previsualiza y genera boletines; los estudiantes sin paz y salvo quedan bloqueados. El PDF sale de la impresión. */
export function ReportCardManager() {
  const [course, setCourse] = useState("7A");
  const [period, setPeriod] = useState("Periodo 3");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<RcRow | null>(null);
  const [showToast, toastNode] = useToast();
  const [confirmAll, setConfirmAll] = useState(false);
  const [gen, setGen] = useState<Record<string, true>>({});
  const [printing, setPrinting] = useState<RcRow[] | null>(null);
  const q = useReportCards({ course, period });
  const mark = useMarkGenerated();
  const d = q.data;
  // Modo normal: al llegar los datos, el curso y el periodo se ajustan a los que existen (el abierto por defecto).
  useEffect(() => {
    if (DEMO || !d) return;
    if (d.courses.length && !d.courses.some((c) => c.id === course)) setCourse(d.courses[0].id);
    if (d.periods.length && !d.periods.includes(period)) setPeriod(d.periods[d.periods.length - 1]);
  }, [d]);
  const rows: RcRow[] = (d?.rows ?? []).map((r) => (r.rc === "pending" && gen[r.id] ? { ...r, rc: "generated" as RcState } : r)).filter((s) => status === "all" || s.rc === status);
  const gradeOf = (c: string) => (DEMO ? c.charAt(0) : d?.courses.find((x) => x.id === c)?.gradeId ?? "");
  const grades = DEMO ? ["6", "7", "8"].map((g) => ({ value: g, label: GRADE_NAME[g] }))
    : (d?.courses ?? []).filter((c, i, all) => all.findIndex((x) => x.gradeId === c.gradeId) === i).map((c) => ({ value: c.gradeId, label: c.gradeName }));
  const courseIds = DEMO ? COURSES : (d?.courses ?? []).map((c) => c.id);
  function generate(list: RcRow[]) {
    const ok = list.filter((s) => s.rc !== "blocked");
    if (DEMO) {
      const o = { ...gen };
      ok.forEach((s) => { o[s.id] = true; });
      setGen(o);
      showToast({ tone: "success", title: ok.length + (ok.length === 1 ? " boletín generado" : " boletines generados"), message: "PDF listos para descargar · " + period });
      return;
    }
    if (!ok.length) { showToast({ tone: "info", title: "Nada que generar", message: "Los estudiantes seleccionados tienen el paz y salvo bloqueado." }); return; }
    setPrinting(ok);
  }
  function afterPrint() {
    const ok = printing ?? [];
    setPrinting(null);
    mark.mutateAsync({ ids: ok.map((r) => r.id), period }).then(
      () => showToast({ tone: "success", title: ok.length + (ok.length === 1 ? " boletín generado" : " boletines generados"), message: "Si elegiste «Guardar como PDF», el archivo quedó donde lo guardaste · " + period }),
      () => showToast({ tone: "error", title: "No pudimos marcar los boletines como generados", message: "La impresión se hizo; vuelve a intentarlo para registrar el estado." }),
    );
  }
  return (
    <>
      <DataGrid<RcRow>
        caption="Boletines por estudiante" rows={rows} selectable pageSize={12} density="compact" resetKey={course + status + period}
        loading={q.isPending && !d} error={q.isError && !d ? "No pudimos cargar los boletines." : undefined} onRetry={() => q.refetch()}
        emptyTitle={d?.rows.length ? "No hay boletines con este estado." : "No hay estudiantes activos en este curso."} emptyIcon="book"
        toolbar={<>
          <FilterGroup as="select" label="Grado" value={gradeOf(course)} onChange={(g) => setCourse(DEMO ? g + "A" : courseIds.find((c) => gradeOf(c) === g) ?? course)} options={grades} />
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={courseIds.filter((c) => gradeOf(c) === gradeOf(course)).map((c) => ({ value: c, label: c }))} />
          <FilterGroup as="select" label="Periodo" value={period} onChange={setPeriod} options={(d?.periods ?? PERIODS).map((p) => ({ value: p, label: p }))} />
          <FilterGroup label="Estado" value={status} onChange={setStatus} options={[{ value: "all", label: "Todos" }, { value: "pending", label: "Pendiente" }, { value: "generated", label: "Generado" }, { value: "blocked", label: "Bloqueado" }]} />
        </>}
        bulkActions={(sel, clear) => <Button size="sm" icon="book" onClick={() => { generate(sel); clear(); }}>Generar selección</Button>}
        columns={[
          { key: "name", label: "Estudiante", header: true, sortable: true, render: (r) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={r.name} size="sm" />{r.name}</div> },
          { key: "course", label: "Curso", render: (r) => <span className="ns-course-tag">{r.course}</span> },
          { key: "avg", label: "Promedio", numeric: true, sortable: true, render: (r) => <span className="ns-table-grade">{formatGrade(r.avg)}</span> },
          { key: "rc", label: "Estado", sortable: true, render: (r) => { const s = RC[r.rc]; return <Badge tone={s[1]} icon={s[2]}>{s[0]}</Badge>; } },
        ]}
        rowActions={(r) => [
          <Button key="p" size="sm" variant="ghost" icon="eye" onClick={() => setPreview(r)}>Previsualizar</Button>,
          <IconAction key="g" icon="download" label={"Generar PDF de " + r.name} disabled={r.rc === "blocked"} onClick={() => generate([r])} />,
        ]}
      />
      <ConfirmAction open={confirmAll} icon="book" onCancel={() => setConfirmAll(false)} title={"¿Generar todos los boletines de " + course + "?"}
        description={DEMO ? "Los estudiantes con paz y salvo bloqueado se omiten automáticamente." : "Se abrirá la impresión con un boletín por página: elige «Guardar como PDF». Los estudiantes con paz y salvo bloqueado se omiten."}
        confirmLabel="Generar todos" onConfirm={() => { setConfirmAll(false); generate(rows); }} />
      <Modal
        open={!!preview} onClose={() => setPreview(null)} size="doc" title="Vista previa del boletín" description={preview ? preview.name + " · " + period : ""}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setPreview(null)} data-autofocus>Cerrar</Button>,
          preview && preview.rc !== "blocked"
            ? <Button key="g" icon="download" onClick={() => { generate([preview]); setPreview(null); }}>Generar PDF</Button>
            : <Badge key="b" tone="review" icon="lock">Bloqueado por paz y salvo</Badge>,
        ]}
      >
        {preview ? <div className="ns-paper-scroll"><ReportCardView data={cardOf(preview, period)} /></div> : null}
      </Modal>
      <div className="ns-sticky-cta"><Button size="lg" icon="book" disabled={!rows.some((r) => r.rc !== "blocked")} onClick={() => setConfirmAll(true)}>Generar todos</Button></div>
      {printing ? <PrintDocuments docs={printing.map((r) => cardOf(r, period))} onDone={afterPrint} /> : null}
      {toastNode}
    </>
  );
}

/* ---------- Paz y Salvos ---------- */

/** Biblioteca, pensiones y documentos: si falta alguno, reportes y boletines quedan bloqueados para el acudiente. */
export function PazYSalvosTable() {
  const q = useStudents();
  const qc = useQueryClient();
  const [rows, setRows] = useState<StudentRecord[]>(() => (q.data ?? []).filter((s) => s.status === "active" || s.status === "pending"));
  const lastData = useRef(q.data);
  useEffect(() => { if (lastData.current !== q.data) { lastData.current = q.data; setRows((q.data ?? []).filter((s) => s.status === "active" || s.status === "pending")); } }, [q.data]);
  const [course, setCourse] = useState("7A");
  const [only, setOnly] = useState("all");
  const [showToast, toastNode] = useToast();
  const courses = DEMO ? COURSES : [...new Set(rows.map((r) => r.course))].filter(Boolean).sort();
  // Guardado optimista: el interruptor cambia al instante y vuelve atrás si la base lo rechaza.
  function change(ids: string[], k: ClearKey, v: boolean, done?: () => void) {
    const before = rows;
    setRows(rows.map((r) => (ids.includes(r.id) ? { ...r, [k]: v } : r)));
    saveClearance(ids, k, v).then(() => {
      // Las demás pantallas de estudiantes releerán al abrirse (aquí ya se ve el cambio).
      if (!DEMO) qc.invalidateQueries({ queryKey: ["students"], refetchType: "none" });
      done?.();
    }, () => {
      setRows(before);
      showToast({ tone: "error", title: "No pudimos guardar el paz y salvo", message: "Revisa tu conexión e inténtalo de nuevo. No se modificó ningún registro." });
    });
  }
  const list = rows.filter((r) => { const ok = r.library && r.fees && r.documents; return (course === "all" || r.course === course) && (only === "all" || (only === "blocked" ? !ok : ok)); });
  const blocked = rows.filter((r) => (course === "all" || r.course === course) && !(r.library && r.fees && r.documents)).length;
  const sw = (r: StudentRecord, k: ClearKey, label: string) => <Switch ariaLabel={label + " de " + r.name} checked={r[k]} onChange={(v) => change([r.id], k, v)} onText="Al día" offText="Pendiente" />;
  return (
    <>
      <DataGrid<StudentRecord>
        caption="Paz y salvos por estudiante" rows={list} selectable pageSize={12} density="compact" resetKey={course + only}
        loading={q.isPending && !q.data} error={q.isError && !q.data ? "No pudimos cargar los paz y salvos." : undefined} onRetry={() => q.refetch()}
        emptyTitle={rows.length ? "No hay estudiantes con este filtro." : "No hay estudiantes activos."} emptyIcon="shield"
        toolbar={<>
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={[{ value: "all", label: "Todos" }, ...courses.map((c) => ({ value: c, label: c }))]} />
          <FilterGroup label="Acceso" value={only} onChange={setOnly} options={[{ value: "all", label: "Todos" }, { value: "blocked", label: "Bloqueado", count: blocked }, { value: "ok", label: "Habilitado" }]} />
        </>}
        bulkActions={(sel, clear) => [
          <Button key="d" size="sm" variant="secondary" icon="check" onClick={() => {
            change(sel.map((x) => x.id), "documents", true, () => showToast({ tone: "success", title: "Documentos al día", message: sel.length + " estudiantes actualizados." }));
            clear();
          }}>Marcar documentos al día</Button>,
        ]}
        columns={[
          { key: "name", label: "Estudiante", header: true, sortable: true, render: (r) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={r.name} size="sm" /><span>{r.name}<small className="ns-caption" style={{ display: "block" }}>{r.course}</small></span></div> },
          { key: "library", label: "Biblioteca", render: (r) => sw(r, "library", "Biblioteca") },
          { key: "fees", label: "Pensiones", render: (r) => sw(r, "fees", "Pensiones") },
          { key: "documents", label: "Documentos", render: (r) => sw(r, "documents", "Documentos") },
          { key: "general", label: "Estado general", render: (r) => { const n = [r.library, r.fees, r.documents].filter(Boolean).length; return <span className="ns-caption" style={{ color: "var(--navy)", fontWeight: 700 }}>{n + " de 3 al día"}</span>; } },
          { key: "access", label: "Reportes y boletines", sortValue: (r) => (r.library && r.fees && r.documents ? 1 : 0), sortable: true, render: (r) => { const ok = r.library && r.fees && r.documents; return <Badge tone={ok ? "verified" : "review"} icon={ok ? "check" : "lock"}>{ok ? "Habilitado" : "Bloqueado"}</Badge>; } },
        ]}
      />
      {toastNode}
    </>
  );
}

/* ---------- Ranking académico ---------- */

/** Ordena por promedio de notas verificadas; sin notas en el filtro, el estudiante no se ubica. */
export function RankingTable() {
  const q = useAcademic();
  const d = q.data;
  const [grade, setGrade] = useState("all");
  const [course, setCourse] = useState("all");
  const [period, setPeriod] = useState("Periodo 3");
  const [subject, setSubject] = useState("all");
  const [showToast, toastNode] = useToast();
  // En modo normal el periodo por defecto es el abierto.
  useEffect(() => { if (!DEMO && d) { const open = d.periods.find((p) => p.status === "open") ?? d.periods[d.periods.length - 1]; if (open) setPeriod(open.name); } }, [d]);
  const list: RankRow[] = d ? rankRows(d, { period, subject, grade, course }) : [];
  const grades = DEMO ? [["6", "Sexto"], ["7", "Séptimo"], ["8", "Octavo"]] : (d?.courses ?? []).filter((c, i, all) => all.findIndex((x) => x.gradeId === c.gradeId) === i).map((c) => [c.gradeId, c.gradeName]);
  const courseIds = DEMO ? COURSES : (d?.courses ?? []).map((c) => c.id);
  const gradeOfCourse = (c: string) => (DEMO ? c.charAt(0) : d?.courses.find((x) => x.id === c)?.gradeId ?? "");
  const ST = (s: RankRow): [string, BadgeTone, IconName] => (s.score >= 4.6 ? ["Destacado", "high", "star"] : s.score >= 3 ? ["Aprobado", "verified", "check"] : ["En riesgo", "review", "warning"]);
  const year = String(new Date().getFullYear());
  return (
    <>
      <DataGrid<RankRow>
        caption="Ranking académico" rows={list} pageSize={15} densityToggle density="compact" initialSort={{ key: "pos", dir: "asc" }} resetKey={grade + course + subject + period}
        loading={q.isPending && !d} error={q.isError && !d ? "No pudimos cargar el ranking." : undefined} onRetry={() => q.refetch()}
        emptyTitle="Aún no hay notas verificadas para este filtro." emptyMessage="El ranking usa solo notas que un docente verificó." emptyIcon="trophy"
        toolbar={<>
          <FilterGroup as="select" label="Año" value={DEMO ? "2026" : year} options={DEMO ? [{ value: "2026", label: "2026" }, { value: "2025", label: "2025" }] : [{ value: year, label: year }]} />
          <FilterGroup as="select" label="Periodo" value={period} onChange={setPeriod} options={[...(d?.periods ?? []).map((p) => ({ value: p.name, label: p.name })), { value: "Año", label: "Acumulado anual" }]} />
          <FilterGroup as="select" label="Grado" value={grade} onChange={(v) => { setGrade(v); setCourse("all"); }} options={[{ value: "all", label: "Todos" }, ...grades.map(([value, label]) => ({ value, label }))]} />
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={[{ value: "all", label: "Todos" }, ...courseIds.filter((c) => grade === "all" || gradeOfCourse(c) === grade).map((c) => ({ value: c, label: c }))]} />
          <FilterGroup as="select" label="Materia" value={subject} onChange={setSubject} options={[{ value: "all", label: "Todas" }, ...(d?.subjects ?? []).map((s) => ({ value: s, label: s }))]} />
          <Button size="sm" variant="secondary" icon="download" disabled={!list.length} onClick={() => {
            exportCSV("ranking_" + period.replace(" ", "_") + ".csv", ["Posición", "Estudiante", "Curso", "Promedio", "Materias aprobadas", "Estado"], list.map((s) => [s.pos, s.name, s.course, formatGrade(s.score), s.subjectsPassed + "/" + s.subjectsTotal, ST(s)[0]]));
            showToast({ tone: "success", title: "Ranking exportado a Excel", message: list.length + " estudiantes · " + (period === "Año" ? "Acumulado anual" : period) + " · archivo CSV" });
          }}>Exportar a Excel</Button>
        </>}
        columns={[
          { key: "pos", label: "Posición", numeric: true, sortable: true, render: (s) => (s.pos <= 3 ? <span className={"ns-medal ns-medal--" + s.pos} aria-label={"Puesto " + s.pos}>{s.pos}</span> : <span className="ns-pos">{s.pos}</span>) },
          { key: "name", label: "Estudiante", sortable: true, header: true, render: (s) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={s.name} size="sm" />{s.name}</div> },
          { key: "course", label: "Curso", sortable: true, render: (s) => <span className="ns-course-tag">{s.course}</span> },
          { key: "score", label: subject === "all" ? "Promedio" : "Nota en " + subject, numeric: true, sortable: true, render: (s) => <span className="ns-table-grade">{formatGrade(s.score)}</span> },
          { key: "subjectsPassed", label: "Materias aprobadas", numeric: true, sortable: true, render: (s) => s.subjectsPassed + " / " + s.subjectsTotal },
          { key: "state", label: "Estado", sortValue: (s) => s.score, sortable: true, render: (s) => { const x = ST(s); return <Badge tone={x[1]} icon={x[2]}>{x[0]}</Badge>; } },
        ]}
      />
      {toastNode}
    </>
  );
}
