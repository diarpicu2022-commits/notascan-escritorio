import { useState } from "react";
import { INITIAL_ASSIGN, PERIODS, type Assignment } from "../../../data/admin";
import { SUBJECTS, TEACHERS } from "../../../data/academic";
import { COURSES } from "../../../data/students";
import { Avatar } from "../../atoms/Avatar";
import { Button } from "../../atoms/Button";
import { IconAction, SegmentedTabs } from "../../atoms/Controls";
import { Select } from "../../atoms/Field";
import { Icon } from "../../atoms/Icon";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { Block, BlockTitle } from "../Layout";
import { ConfirmAction } from "../Overlays";
import { useToast } from "../Toast";

type AssignForm = Omit<Assignment, "id">;

/** Docente + Materia + Curso + Periodo en una sola línea. */
export function AcademicAssignmentSelector({ value: v, onChange, onSubmit, error, editing }: { value: AssignForm; onChange: (v: AssignForm) => void; onSubmit: () => void; error?: string | null; editing?: boolean }) {
  const set = (k: keyof AssignForm) => (x: string) => onChange({ ...v, [k]: x });
  return (
    <div className="ns-assign">
      <div className="ns-assign-fields">
        <Select label="Docente" required value={v.teacher} onChange={set("teacher")} placeholder="Selecciona" options={TEACHERS.map((t) => t.name)} />
        <span className="ns-assign-plus" aria-hidden>+</span>
        <Select label="Materia" required value={v.subject} onChange={set("subject")} placeholder="Selecciona" options={SUBJECTS.map((s) => s.name)} />
        <span className="ns-assign-plus" aria-hidden>+</span>
        <Select label="Curso" required value={v.course} onChange={set("course")} placeholder="Selecciona" options={COURSES} />
        <span className="ns-assign-plus" aria-hidden>+</span>
        <Select label="Periodo" required value={v.period} onChange={set("period")} options={PERIODS} />
        <Button icon={editing ? "check" : "link"} onClick={onSubmit} className="ns-assign-btn">{editing ? "Guardar cambios" : "Asignar"}</Button>
      </div>
      {error ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{error}</span> : null}
    </div>
  );
}

/** Malla curricular: matriz curso × materia o lista, sin choques de asignación. */
export function CurriculumManager() {
  const [list, setList] = useState<Assignment[]>(INITIAL_ASSIGN);
  const [form, setForm] = useState<AssignForm>({ teacher: "", subject: "", course: "", period: "Periodo 3" });
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [del, setDel] = useState<Assignment | null>(null);
  const [view, setView] = useState("matrix");
  const [courseF, setCourseF] = useState("all");
  const [showToast, toastNode] = useToast();

  function submit() {
    const v = form;
    if (!v.teacher || !v.subject || !v.course) { setErr("Completa docente, materia y curso."); return; }
    const clash = list.find((a) => a.course === v.course && a.subject === v.subject && a.period === v.period && a.id !== editing);
    if (clash) { setErr("Ya existe una asignación de " + v.subject + " en " + v.course + " (" + clash.teacher + "). Edítala o elimínala primero."); return; }
    if (editing) setList(list.map((a) => (a.id === editing ? { ...a, ...v } : a)));
    else setList(list.concat([{ id: "a" + Date.now(), ...v }]));
    showToast({ tone: "success", title: editing ? "Asignación actualizada" : "Docente asignado", message: v.teacher + " · " + v.subject + " · " + v.course });
    setErr(null); setEditing(null); setForm({ teacher: "", subject: "", course: "", period: v.period });
  }
  function edit(a: Assignment) {
    setEditing(a.id); setForm({ teacher: a.teacher, subject: a.subject, course: a.course, period: a.period }); setErr(null);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }
  const cellFor = (c: string, s: string) => list.find((a) => a.course === c && a.subject === s && a.period === form.period);
  const courses = courseF === "all" ? COURSES : [courseF];

  return (
    <>
      <Block tone="gold" label={editing ? "Editar asignación" : "Nueva asignación"}>
        <BlockTitle action={editing ? <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setForm({ teacher: "", subject: "", course: "", period: form.period }); }}>Cancelar edición</Button> : null}>
          {editing ? "Editar asignación" : "Asignar docente"}
        </BlockTitle>
        <AcademicAssignmentSelector value={form} onChange={(v) => { setForm(v); setErr(null); }} onSubmit={submit} error={err} editing={!!editing} />
      </Block>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <SegmentedTabs label="Vista de la malla" value={view} onChange={setView} tabs={[{ value: "matrix", label: "Malla por curso", icon: "layers" }, { value: "list", label: "Lista de asignaciones", icon: "menu" }]} />
        <FilterGroup as="select" label="Curso" value={courseF} onChange={setCourseF} options={[{ value: "all", label: "Todos" }, ...COURSES.map((c) => ({ value: c, label: c }))]} />
      </div>
      {view === "matrix" ? (
        <div className="ns-table-wrap ns-matrix-wrap" role="region" aria-label="Malla curricular por curso y materia" tabIndex={0}>
          <table className="ns-table ns-matrix">
            <caption className="ns-sr">{"¿Qué docente dicta qué materia en qué curso? " + form.period}</caption>
            <thead><tr><th scope="col">{"Curso · " + form.period}</th>{SUBJECTS.map((s) => <th key={s.id} scope="col">{s.name}</th>)}</tr></thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c}>
                  <th scope="row"><span className="ns-course-tag">{c}</span></th>
                  {SUBJECTS.map((s) => {
                    const a = cellFor(c, s.name);
                    return (
                      <td key={s.id}>
                        {a ? (
                          <button type="button" className="ns-assign-chip" onClick={() => edit(a)} aria-label={"Editar: " + a.teacher + " dicta " + s.name + " en " + c}>
                            <Avatar name={a.teacher} size="sm" /><span>{a.teacher.split(" ").slice(0, 2).join(" ")}</span>
                          </button>
                        ) : (
                          <button type="button" className="ns-assign-empty" onClick={() => { setForm({ ...form, course: c, subject: s.name, teacher: "" }); setEditing(null); }} aria-label={"Asignar docente a " + s.name + " en " + c}>
                            <Icon name="plus" size={14} />Sin docente
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DataGrid<Assignment>
          caption="Asignaciones" rows={list.filter((a) => courseF === "all" || a.course === courseF)} pageSize={12} density="compact" initialSort={{ key: "course", dir: "asc" }}
          columns={[
            { key: "teacher", label: "Docente", sortable: true, header: true, render: (a) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={a.teacher} size="sm" />{a.teacher}</div> },
            { key: "subject", label: "Materia", sortable: true },
            { key: "course", label: "Curso", sortable: true, render: (a) => <span className="ns-course-tag">{a.course}</span> },
            { key: "period", label: "Periodo" },
          ]}
          rowActions={(a) => [
            <IconAction key="e" icon="edit" label="Editar asignación" onClick={() => edit(a)} />,
            <IconAction key="d" icon="trash" tone="danger" label="Eliminar asignación" onClick={() => setDel(a)} />,
          ]}
        />
      )}
      <ConfirmAction
        open={!!del} danger icon="trash" onCancel={() => setDel(null)} title="¿Eliminar asignación?"
        description={del ? del.teacher + " dejará de dictar " + del.subject + " en " + del.course + ". Las calificaciones registradas se conservan." : ""}
        confirmLabel="Eliminar asignación"
        onConfirm={() => { const a = del!; setList(list.filter((x) => x.id !== a.id)); setDel(null); showToast({ tone: "success", title: "Asignación eliminada" }); }}
      />
      {toastNode}
    </>
  );
}
