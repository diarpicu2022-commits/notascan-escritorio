import { useState } from "react";
import { useShell } from "../../app/ShellContext";
import { cx } from "../../lib/cx";
import { formatGrade } from "../../lib/grade";
import { DEMO } from "../../lib/supabase";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Progress, SegmentedTabs } from "../../components/atoms/Controls";
import { Input } from "../../components/atoms/Field";
import { Sticker } from "../../components/atoms/Sticker";
import { FilterGroup, FiltersBar } from "../../components/molecules/Filters";
import { ReviewStatus } from "../../components/molecules/ReviewStatus";
import { UserProfile } from "../../components/molecules/UserProfile";
import { DataTable } from "../../components/organisms/DataGrid";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Header } from "../../components/organisms/Header";
import { Block } from "../../components/organisms/Layout";
import { Drawer } from "../../components/organisms/Overlays";
import { useToast } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import { EVAL_STATUS, KIND, type EvalKind, type EvaluationItem, type TeacherStudent } from "../../data/academic";
import { saveMessage } from "../../services/teacher";
import { evaluationRows, studentRows, useCreateEvaluation, useOverview } from "../../services/teacherOverview";
import { assignmentsState, courseOption, queryState, useAssignmentPick } from "./states";

/* Docente · estudiantes de sus cursos y evaluaciones del periodo, con datos de la base (6b.2b). */

/** Descarga un CSV (UTF-8 con BOM y punto y coma, para que Excel en español respete tildes y columnas). */
function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => { const t = String(v); return /[";\n]/.test(t) ? "\"" + t.replace(/"/g, "\"\"") + "\"" : t; };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STATUS_NAME: Record<string, string> = { verified: "Verificada", pending: "Pendiente", "needs-review": "Requiere revisión" };
const SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** 03 · ¿Cómo va cada estudiante? */
export function StudentsPage() {
  const [q, setQ] = useState("");
  const [c, setC] = useState("all");
  const [st, setSt] = useState("all");
  const { aq, q: oq } = useOverview();
  const all = oq.data ? studentRows(oq.data) : [];
  const assignments = aq.data ?? [];
  const subjects = [...new Set(assignments.map((a) => a.subject))].join(", ") || "Matemáticas";
  const courses = DEMO ? ["7A", "7B"] : [...new Set(assignments.map((a) => a.courseId))];
  const rows = all.filter((s) => {
    const t = q.trim().toLowerCase();
    return (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0) && (c === "all" || s.course === c) && (st === "all" || s.status === st);
  });
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(oq, "Cargando tus estudiantes", "No pudimos cargar tus estudiantes.")
    ?? (!all.length ? <EmptyState title="No tienes estudiantes en tus cursos." message="Cuando Secretaría matricule estudiantes en tus cursos, aparecerán aquí." icon="students" /> : undefined);
  const exportList = () => downloadCsv("estudiantes-" + (c === "all" ? "todos" : c) + ".csv", [
    ["ID", "Estudiante", "Curso", "Promedio", "Última evaluación", "Estado"],
    ...rows.map((r) => [r.id, r.name, r.course, isNaN(r.avg) ? "" : formatGrade(r.avg), r.last, STATUS_NAME[r.status] ?? r.status]),
  ]);
  return (
    <PageShell active="students">
      <Header eyebrow={DEMO ? "Matemáticas · Periodo 3 · 2026" : subjects + " · " + (assignments[0]?.periodName ?? "") + " · " + new Date().getFullYear()} title="Estudiantes" highlight="Estudiantes"
        description="Consulta el desempeño de cada estudiante y el estado de su última calificación."
        actions={<Button variant="secondary" icon="download" disabled={!rows.length} onClick={exportList}>Exportar lista</Button>} />
      {state ?? <>
        <FiltersBar
          search={q} onSearch={setQ} count={rows.length + " de " + all.length + " estudiantes"}
          groups={[
            { label: "Curso", value: c, onChange: setC, options: [{ value: "all", label: "Todos" }, ...courses.map((x) => ({ value: x, label: x }))] },
            { label: "Estado", as: "select", value: st, onChange: setSt, options: [{ value: "all", label: "Todos" }, { value: "verified", label: "Verificada" }, { value: "pending", label: "Pendiente" }, { value: "needs-review", label: "Requiere revisión" }] },
          ]}
        />
        {rows.length ? (
          <DataTable<TeacherStudent & Record<string, unknown>>
            caption={"Estudiantes de " + subjects} rows={rows as Array<TeacherStudent & Record<string, unknown>>}
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
      </>}
    </PageShell>
  );
}

type EvalForm = { name: string; kind: EvalKind; weight: string; date: string };
const EMPTY_FORM: EvalForm = { name: "", kind: "examen", weight: "", date: "" };

/** 04 · ¿Qué exámenes, talleres y actividades existen? */
export function EvaluationsPage() {
  const { navigate } = useShell();
  const [tab, setTab] = useState("all");
  const { list: assignments, current, setKey } = useAssignmentPick();
  const { aq, q } = useOverview();
  const create = useCreateEvaluation();
  const [form, setForm] = useState<EvalForm | null>(null);
  const [tried, setTried] = useState(false);
  const [showToast, toastNode] = useToast();
  const [added, setAdded] = useState<EvaluationItem[]>([]);
  const all = (q.data ? evaluationRows(q.data, current?.key) : []).concat(added);
  const list = all.filter((e) => tab === "all" || e.kind === tab);
  const assigned = all.reduce((a, e) => a + e.weight, 0);
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando las evaluaciones", "No pudimos cargar las evaluaciones.");

  const f = form ?? EMPTY_FORM;
  const w = Number(f.weight.replace(",", "."));
  const errors = {
    name: !f.name.trim() ? "Escribe el nombre de la evaluación." : undefined,
    weight: !f.weight.trim() || isNaN(w) || w <= 0 || w > 100 ? "Escribe un porcentaje entre 1 y 100."
      : assigned + w > 100 ? "Con esta evaluación el periodo sumaría " + (assigned + w) + " %. El máximo es 100 %." : undefined,
  };
  const open = () => { setForm(EMPTY_FORM); setTried(false); };
  function submit() {
    setTried(true);
    if (errors.name || errors.weight || !current) return;
    const v = { assignmentKey: current.key, name: f.name, kind: f.kind, weight: w, dueDate: f.date };
    create.mutateAsync(v).then(
      () => {
        // En demostración no hay base: la tarjeta se agrega solo en pantalla.
        if (DEMO) setAdded((cur) => cur.concat({ id: "n" + cur.length, name: v.name.trim(), subject: current.subject, kind: v.kind, weight: w, status: "borrador", reviewed: 0, total: 24, date: v.dueDate ? Number(v.dueDate.slice(8)) + " " + SHORT[Number(v.dueDate.slice(5, 7)) - 1] : "Sin fecha" }));
        setForm(null); setTried(false);
        showToast({ tone: "success", title: "Evaluación creada", message: v.name.trim() + " · " + w + " % · " + current.courseId + ". Queda en borrador hasta que la califiques." });
      },
      (e) => showToast({ tone: "error", title: "No pudimos crear la evaluación", message: saveMessage(e) }),
    );
  }
  // Con más de un curso, el selector va en el encabezado (decisión aprobada en 6b.2; en demostración, solo 7A).
  const picker = !DEMO && assignments.length > 1 ? <FilterGroup as="select" label="Curso" value={current?.key} onChange={setKey} options={assignments.map(courseOption)} /> : null;

  return (
    <PageShell active="evaluations">
      <Header eyebrow={current ? current.subject + " · " + current.courseId : "Evaluaciones"} title="Evaluaciones" highlight="Evaluaciones"
        description="Exámenes, talleres y actividades del periodo con su porcentaje y estado de revisión."
        actions={<>{picker}<Button size="lg" icon="plus" disabled={!current} onClick={open}>Nueva evaluación</Button></>}
        tabs={[{ value: "all", label: "Todas" }, { value: "examen", label: "Exámenes" }, { value: "taller", label: "Talleres" }, { value: "actividad", label: "Actividades" }]}
        tab={tab} onTab={setTab} />
      {state ?? <>
        <Block tone="gold" className="ns-weight">
          <div>
            <span className="ns-overline" style={{ color: "var(--navy)" }}>Porcentaje asignado</span>
            <div className="ns-weight-value">{assigned}<small>% de 100%</small></div>
          </div>
          <div className="ns-weight-bar" role="img" aria-label="Distribución de porcentajes">
            {all.map((e) => <span key={e.id} className={"ns-weight-seg ns-weight-seg--" + e.kind} style={{ flex: e.weight }} title={e.name + " " + e.weight + "%"}>{e.weight + "%"}</span>)}
          </div>
        </Block>
        {list.length ? (
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
                    <Button variant={e.status === "en-revision" ? "primary" : "secondary"} size="sm" iconRight="arrow" onClick={() => (e.status === "borrador" ? navigate("grade") : navigate("review", DEMO ? undefined : { id: e.id }))}>
                      {e.status === "en-revision" ? "Revisar" : e.status === "borrador" ? "Calificar" : "Ver"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : all.length
          ? <EmptyState title="No hay evaluaciones de este tipo." message="Prueba con otra pestaña." action={<Button variant="secondary" onClick={() => setTab("all")}>Ver todas</Button>} />
          : <EmptyState title="Este curso aún no tiene evaluaciones." message="Crea los exámenes, talleres y actividades del periodo con su porcentaje." action={<Button variant="secondary" icon="plus" onClick={open}>Nueva evaluación</Button>} />}
      </>}
      <Drawer
        open={!!form} onClose={() => setForm(null)} eyebrow={current ? current.subject + " · " + current.courseId : undefined} title="Nueva evaluación"
        footer={[<Button key="c" variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>, <Button key="s" icon="check" loading={create.isPending} onClick={submit}>Crear evaluación</Button>]}
      >
        <div className="ns-form-grid ns-form-grid--1">
          <Input label="Nombre" required value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} placeholder="Parcial 3" error={tried ? errors.name : undefined} />
          <div className="ns-field">
            <span className="ns-field-label">Tipo</span>
            <SegmentedTabs label="Tipo de evaluación" value={f.kind} onChange={(x) => setForm({ ...f, kind: x as EvalKind })}
              tabs={[{ value: "examen", label: "Examen" }, { value: "taller", label: "Taller" }, { value: "actividad", label: "Actividad" }]} />
          </div>
          <Input label="Porcentaje" required inputMode="decimal" value={f.weight} onChange={(e) => setForm({ ...f, weight: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5) })}
            placeholder="20" hint={"Asignado hasta ahora: " + assigned + " % de 100 %."} error={tried ? errors.weight : undefined} />
          <Input label="Fecha de entrega" type="date" value={f.date} onChange={(e) => setForm({ ...f, date: e.target.value })} />
        </div>
      </Drawer>
      {toastNode}
    </PageShell>
  );
}
