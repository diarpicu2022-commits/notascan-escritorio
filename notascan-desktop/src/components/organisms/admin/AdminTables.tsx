import { useState } from "react";
import { formatGrade } from "../../../lib/grade";
import { GRADE_NAME, SUBJECTS, subjectGrades } from "../../../data/academic";
import { PERIODS, exportCSV } from "../../../data/admin";
import { ALL_STUDENTS, COURSES, type StudentRecord } from "../../../data/students";
import { Avatar } from "../../atoms/Avatar";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction } from "../../atoms/Controls";
import type { IconName } from "../../atoms/Icon";
import { Switch } from "../../atoms/Switch";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { ConfirmAction, Modal } from "../Overlays";
import { ReportCardDocument } from "../ReportCardDocument";
import { useToast } from "../Toast";

/* ---------- Boletines ---------- */

type RcState = "pending" | "generated" | "blocked";
type RcRow = StudentRecord & { rc: RcState };
const RC: Record<RcState, [string, BadgeTone, IconName]> = { pending: ["Pendiente", "pending", "clock"], generated: ["Generado", "verified", "check"], blocked: ["Bloqueado · paz y salvo", "review", "lock"] };

/** Previsualiza y genera boletines; los estudiantes sin paz y salvo quedan bloqueados. */
export function ReportCardManager() {
  const [course, setCourse] = useState("7A");
  const [period, setPeriod] = useState("Periodo 3");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<RcRow | null>(null);
  const [showToast, toastNode] = useToast();
  const [confirmAll, setConfirmAll] = useState(false);
  const [gen, setGen] = useState<Record<string, true>>({});
  const rows: RcRow[] = ALL_STUDENTS.filter((s) => s.course === course && s.status !== "retired").map((s) => {
    const blocked = !(s.library && s.fees && s.documents);
    return { ...s, rc: (blocked ? "blocked" : gen[s.id] ? "generated" : "pending") as RcState };
  }).filter((s) => status === "all" || s.rc === status);
  function generate(list: RcRow[]) {
    const o = { ...gen };
    let n = 0;
    list.forEach((s) => { if (s.rc !== "blocked") { o[s.id] = true; n++; } });
    setGen(o);
    showToast({ tone: "success", title: n + (n === 1 ? " boletín generado" : " boletines generados"), message: "PDF listos para descargar · " + period });
  }
  return (
    <>
      <DataGrid<RcRow>
        caption="Boletines por estudiante" rows={rows} selectable pageSize={12} density="compact" resetKey={course + status}
        toolbar={<>
          <FilterGroup as="select" label="Grado" value={course.charAt(0)} onChange={(g) => setCourse(g + "A")} options={["6", "7", "8"].map((g) => ({ value: g, label: GRADE_NAME[g] }))} />
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={COURSES.filter((c) => c.charAt(0) === course.charAt(0)).map((c) => ({ value: c, label: c }))} />
          <FilterGroup as="select" label="Periodo" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ value: p, label: p }))} />
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
        description="Los estudiantes con paz y salvo bloqueado se omiten automáticamente." confirmLabel="Generar todos" onConfirm={() => { setConfirmAll(false); generate(rows); }} />
      <Modal
        open={!!preview} onClose={() => setPreview(null)} size="doc" title="Vista previa del boletín" description={preview ? preview.name + " · " + period : ""}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setPreview(null)} data-autofocus>Cerrar</Button>,
          preview && preview.rc !== "blocked"
            ? <Button key="g" icon="download" onClick={() => { generate([preview]); setPreview(null); }}>Generar PDF</Button>
            : <Badge key="b" tone="review" icon="lock">Bloqueado por paz y salvo</Badge>,
        ]}
      >
        {preview ? <div className="ns-paper-scroll"><ReportCardDocument student={preview} period={period} /></div> : null}
      </Modal>
      <div className="ns-sticky-cta"><Button size="lg" icon="book" onClick={() => setConfirmAll(true)}>Generar todos</Button></div>
      {toastNode}
    </>
  );
}

/* ---------- Paz y Salvos ---------- */

type ClearKey = "library" | "fees" | "documents";

export function PazYSalvosTable() {
  const [rows, setRows] = useState<StudentRecord[]>(() => ALL_STUDENTS.filter((s) => s.status === "active" || s.status === "pending"));
  const [course, setCourse] = useState("7A");
  const [only, setOnly] = useState("all");
  const [showToast, toastNode] = useToast();
  const upd = (id: string, k: ClearKey, v: boolean) => setRows(rows.map((r) => (r.id !== id ? r : { ...r, [k]: v })));
  const list = rows.filter((r) => { const ok = r.library && r.fees && r.documents; return (course === "all" || r.course === course) && (only === "all" || (only === "blocked" ? !ok : ok)); });
  const blocked = rows.filter((r) => r.course === course && !(r.library && r.fees && r.documents)).length;
  const sw = (r: StudentRecord, k: ClearKey, label: string) => <Switch ariaLabel={label + " de " + r.name} checked={r[k]} onChange={(v) => upd(r.id, k, v)} onText="Al día" offText="Pendiente" />;
  return (
    <>
      <DataGrid<StudentRecord>
        caption="Paz y salvos por estudiante" rows={list} selectable pageSize={12} density="compact" resetKey={course + only}
        toolbar={<>
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={[{ value: "all", label: "Todos" }, ...COURSES.map((c) => ({ value: c, label: c }))]} />
          <FilterGroup label="Acceso" value={only} onChange={setOnly} options={[{ value: "all", label: "Todos" }, { value: "blocked", label: "Bloqueado", count: blocked }, { value: "ok", label: "Habilitado" }]} />
        </>}
        bulkActions={(sel, clear) => [
          <Button key="d" size="sm" variant="secondary" icon="check" onClick={() => {
            setRows(rows.map((r) => (sel.some((x) => x.id === r.id) ? { ...r, documents: true } : r)));
            clear();
            showToast({ tone: "success", title: "Documentos al día", message: sel.length + " estudiantes actualizados." });
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

type RankRow = StudentRecord & { score: number; pos: number };

export function RankingTable() {
  const [grade, setGrade] = useState("all");
  const [course, setCourse] = useState("all");
  const [period, setPeriod] = useState("Periodo 3");
  const [subject, setSubject] = useState("all");
  const [showToast, toastNode] = useToast();
  const list: RankRow[] = ALL_STUDENTS.filter((s) => s.status === "active" && (grade === "all" || s.grade === grade) && (course === "all" || s.course === course))
    .map((s) => ({ ...s, score: subject === "all" ? s.avg : subjectGrades(s).filter((x) => x.subject === subject)[0].grade, pos: 0 }))
    .sort((a, b) => b.score - a.score)
    .map((s, i) => ({ ...s, pos: i + 1 }));
  const ST = (s: RankRow): [string, BadgeTone, IconName] => (s.score >= 4.6 ? ["Destacado", "high", "star"] : s.score >= 3 ? ["Aprobado", "verified", "check"] : ["En riesgo", "review", "warning"]);
  return (
    <>
      <DataGrid<RankRow>
        caption="Ranking académico" rows={list} pageSize={15} densityToggle density="compact" initialSort={{ key: "pos", dir: "asc" }} resetKey={grade + course + subject + period}
        toolbar={<>
          <FilterGroup as="select" label="Año" value="2026" options={[{ value: "2026", label: "2026" }, { value: "2025", label: "2025" }]} />
          <FilterGroup as="select" label="Periodo" value={period} onChange={setPeriod} options={[...PERIODS.map((p) => ({ value: p, label: p })), { value: "Año", label: "Acumulado anual" }]} />
          <FilterGroup as="select" label="Grado" value={grade} onChange={(v) => { setGrade(v); setCourse("all"); }} options={[{ value: "all", label: "Todos" }, { value: "6", label: "Sexto" }, { value: "7", label: "Séptimo" }, { value: "8", label: "Octavo" }]} />
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={[{ value: "all", label: "Todos" }, ...COURSES.filter((c) => grade === "all" || c.charAt(0) === grade).map((c) => ({ value: c, label: c }))]} />
          <FilterGroup as="select" label="Materia" value={subject} onChange={setSubject} options={[{ value: "all", label: "Todas" }, ...SUBJECTS.map((s) => ({ value: s.name, label: s.name }))]} />
          <Button size="sm" variant="secondary" icon="download" onClick={() => {
            exportCSV("ranking_" + period.replace(" ", "_") + ".csv", ["Posición", "Estudiante", "Curso", "Promedio", "Materias aprobadas", "Estado"], list.map((s) => [s.pos, s.name, s.course, formatGrade(s.score), s.subjectsPassed + "/6", ST(s)[0]]));
            showToast({ tone: "success", title: "Ranking exportado a Excel", message: list.length + " estudiantes · " + period });
          }}>Exportar a Excel</Button>
        </>}
        columns={[
          { key: "pos", label: "Posición", numeric: true, sortable: true, render: (s) => (s.pos <= 3 ? <span className={"ns-medal ns-medal--" + s.pos} aria-label={"Puesto " + s.pos}>{s.pos}</span> : <span className="ns-pos">{s.pos}</span>) },
          { key: "name", label: "Estudiante", sortable: true, header: true, render: (s) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={s.name} size="sm" />{s.name}</div> },
          { key: "course", label: "Curso", sortable: true, render: (s) => <span className="ns-course-tag">{s.course}</span> },
          { key: "score", label: subject === "all" ? "Promedio" : "Nota en " + subject, numeric: true, sortable: true, render: (s) => <span className="ns-table-grade">{formatGrade(s.score)}</span> },
          { key: "subjectsPassed", label: "Materias aprobadas", numeric: true, sortable: true, render: (s) => s.subjectsPassed + " / 6" },
          { key: "state", label: "Estado", sortValue: (s) => s.score, sortable: true, render: (s) => { const x = ST(s); return <Badge tone={x[1]} icon={x[2]}>{x[0]}</Badge>; } },
        ]}
      />
      {toastNode}
    </>
  );
}
