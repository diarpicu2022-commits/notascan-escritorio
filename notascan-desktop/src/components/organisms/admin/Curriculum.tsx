import { scrollToTop } from "../../../lib/scroll";
import { useEffect, useRef, useState } from "react";
import type { Assignment } from "../../../data/admin";
import { DEMO } from "../../../lib/supabase";
import { adminMessage, useCurriculum, useDeleteAssignment, useSaveAssignment, type CurriculumData } from "../../../services/admin";
import { Avatar } from "../../atoms/Avatar";
import { Button } from "../../atoms/Button";
import { IconAction, SegmentedTabs } from "../../atoms/Controls";
import { Select } from "../../atoms/Field";
import { Icon } from "../../atoms/Icon";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { EmptyState } from "../EmptyState";
import { Block, BlockTitle } from "../Layout";
import { ErrorState, LoadingBlocks } from "../QueryState";
import { ConfirmAction } from "../Overlays";
import { useToast } from "../Toast";
import { useI18n } from "../../../i18n/I18nProvider";

type AssignForm = Omit<Assignment, "id">;
interface Options { teachers: string[]; subjects: string[]; courses: string[]; periods: string[] }

/** Docente + Materia + Curso + Periodo en una sola línea. */
export function AcademicAssignmentSelector({ value: v, onChange, onSubmit, error, editing, options: o, busy }: { value: AssignForm; onChange: (v: AssignForm) => void; onSubmit: () => void; error?: string | null; editing?: boolean; options: Options; busy?: boolean }) {
  const set = (k: keyof AssignForm) => (x: string) => onChange({ ...v, [k]: x });
  const { t } = useI18n();
  const c = t.adm.cur, f = t.adm.f;
  return (
    <div className="ns-assign">
      <div className="ns-assign-fields">
        <Select label={c.teacher} required value={v.teacher} onChange={set("teacher")} placeholder={f.choose} options={o.teachers} />
        <span className="ns-assign-plus" aria-hidden>+</span>
        <Select label={f.subject} required value={v.subject} onChange={set("subject")} placeholder={f.choose} options={o.subjects} />
        <span className="ns-assign-plus" aria-hidden>+</span>
        <Select label={f.course} required value={v.course} onChange={set("course")} placeholder={f.choose} options={o.courses} />
        <span className="ns-assign-plus" aria-hidden>+</span>
        <Select label={f.period} required value={v.period} onChange={set("period")} options={o.periods.map((p) => ({ value: p, label: t.tch.periodName(p) }))} />
        <Button icon={editing ? "check" : "link"} loading={busy} onClick={onSubmit} className="ns-assign-btn">{editing ? c.saveChanges : c.assign}</Button>
      </div>
      {error ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{error}</span> : null}
    </div>
  );
}

/** Malla curricular: matriz curso × materia o lista, sin choques de asignación. */
export function CurriculumManager() {
  const q = useCurriculum();
  const saveMut = useSaveAssignment();
  const delMut = useDeleteAssignment();
  const d = q.data;
  const [list, setList] = useState<Assignment[]>(() => d?.list ?? []);
  const lastData = useRef(d);
  useEffect(() => { if (lastData.current !== d) { lastData.current = d; setList(d?.list ?? []); } }, [d]);
  const [form, setForm] = useState<AssignForm>({ teacher: "", subject: "", course: "", period: d?.current ?? "Periodo 3" });
  // Al llegar los datos por primera vez, el formulario toma el periodo abierto.
  useEffect(() => { if (d?.current) setForm((f) => (f.period && d.periods.some((p) => p.name === f.period) ? f : { ...f, period: d.current })); }, [d]);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [del, setDel] = useState<Assignment | null>(null);
  const [view, setView] = useState("matrix");
  const [courseF, setCourseF] = useState("all");
  const [showToast, toastNode] = useToast();
  const { t } = useI18n();
  const c = t.adm.cur, pn = t.tch.periodName;
  const opts: Options = { teachers: (d?.teachers ?? []).map((t) => t.name), subjects: (d?.subjects ?? []).map((s) => s.name), courses: d?.courses ?? [], periods: (d?.periods ?? []).map((p) => p.name) };

  function submit() {
    const v = form;
    if (!v.teacher || !v.subject || !v.course) { setErr(c.complete); return; }
    const clash = list.find((a) => a.course === v.course && a.subject === v.subject && a.period === v.period && a.id !== editing);
    if (clash) { setErr(c.clash(v.subject, v.course, clash.teacher)); return; }
    saveMut.mutateAsync({ id: editing, v, data: d as CurriculumData }).then(
      () => {
        if (DEMO) { if (editing) setList(list.map((a) => (a.id === editing ? { ...a, ...v } : a))); else setList(list.concat([{ id: "a" + Date.now(), ...v }])); }
        showToast({ tone: "success", title: editing ? c.updated : c.assigned, message: v.teacher + " · " + v.subject + " · " + v.course });
        setErr(null); setEditing(null); setForm({ teacher: "", subject: "", course: "", period: v.period });
      },
      (e) => setErr(adminMessage(e, t)),
    );
  }
  function edit(a: Assignment) {
    setEditing(a.id); setForm({ teacher: a.teacher, subject: a.subject, course: a.course, period: a.period }); setErr(null);
    scrollToTop(true);
  }
  const cellFor = (c: string, s: string) => list.find((a) => a.course === c && a.subject === s && a.period === form.period);
  const courses = courseF === "all" ? opts.courses : [courseF];

  if (q.isPending && !d) return <LoadingBlocks label={c.loading} />;
  if (q.isError && !d) return <ErrorState title={c.loadError} onRetry={() => q.refetch()} />;
  const empty = !opts.courses.length || !opts.subjects.length;

  return (
    <>
      <Block tone="gold" label={editing ? c.editLabel : c.newLabel}>
        <BlockTitle action={editing ? <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setForm({ teacher: "", subject: "", course: "", period: form.period }); }}>{c.cancelEdit}</Button> : null}>
          {editing ? c.editLabel : c.assignTitle}
        </BlockTitle>
        <AcademicAssignmentSelector value={form} onChange={(v) => { setForm(v); setErr(null); }} onSubmit={submit} error={err} editing={!!editing} options={opts} busy={saveMut.isPending} />
      </Block>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <SegmentedTabs label={c.view} value={view} onChange={setView} tabs={[{ value: "matrix", label: c.matrix, icon: "layers" }, { value: "list", label: c.list, icon: "menu" }]} />
        <FilterGroup as="select" label={t.adm.f.course} value={courseF} onChange={setCourseF} options={[{ value: "all", label: t.adm.f.all }, ...opts.courses.map((y) => ({ value: y, label: y }))]} />
      </div>
      {empty ? <EmptyState icon="layers" title={c.emptyTitle} message={c.emptyText} /> : view === "matrix" ? (
        <div className="ns-table-wrap ns-matrix-wrap" role="region" aria-label={c.region} tabIndex={0}>
          <table className="ns-table ns-matrix">
            <caption className="ns-sr">{c.caption(pn(form.period))}</caption>
            <thead><tr><th scope="col">{c.coursePeriod(pn(form.period))}</th>{(d?.subjects ?? []).map((s) => <th key={s.id} scope="col">{s.name}</th>)}</tr></thead>
            <tbody>
              {courses.map((co) => (
                <tr key={co}>
                  <th scope="row"><span className="ns-course-tag">{co}</span></th>
                  {(d?.subjects ?? []).map((s) => {
                    const a = cellFor(co, s.name);
                    return (
                      <td key={s.id}>
                        {a ? (
                          <button type="button" className="ns-assign-chip" onClick={() => edit(a)} aria-label={c.editChip(a.teacher, s.name, co)}>
                            <Avatar name={a.teacher} size="sm" /><span>{a.teacher.split(" ").slice(0, 2).join(" ")}</span>
                          </button>
                        ) : (
                          <button type="button" className="ns-assign-empty" onClick={() => { setForm({ ...form, course: co, subject: s.name, teacher: "" }); setEditing(null); }} aria-label={c.assignChip(s.name, co)}>
                            <Icon name="plus" size={14} />{c.noTeacher}
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
          caption={c.listCaption} rows={list.filter((a) => courseF === "all" || a.course === courseF)} pageSize={12} density="compact" initialSort={{ key: "course", dir: "asc" }}
          columns={[
            { key: "teacher", label: c.teacher, sortable: true, header: true, render: (a) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={a.teacher} size="sm" />{a.teacher}</div> },
            { key: "subject", label: t.adm.f.subject, sortable: true },
            { key: "course", label: t.adm.f.course, sortable: true, render: (a) => <span className="ns-course-tag">{a.course}</span> },
            { key: "period", label: t.adm.f.period, render: (a) => pn(a.period) },
          ]}
          rowActions={(a) => [
            <IconAction key="e" icon="edit" label={c.editAssign} onClick={() => edit(a)} />,
            <IconAction key="d" icon="trash" tone="danger" label={c.deleteAssign} onClick={() => setDel(a)} />,
          ]}
        />
      )}
      <ConfirmAction
        open={!!del} danger icon="trash" onCancel={() => setDel(null)} title={c.deleteTitle} loading={delMut.isPending}
        description={del ? c.deleteText(del.teacher, del.subject, del.course) : ""}
        confirmLabel={c.deleteAssign}
        onConfirm={() => {
          const a = del!;
          delMut.mutateAsync(a.id).then(
            () => { if (DEMO) setList(list.filter((x) => x.id !== a.id)); setDel(null); showToast({ tone: "success", title: c.deleted }); },
            (e) => { setDel(null); showToast({ tone: "error", title: c.deleteError, message: adminMessage(e, t) }); },
          );
        }}
      />
      {toastNode}
    </>
  );
}
