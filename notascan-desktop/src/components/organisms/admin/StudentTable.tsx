import { Fragment, useEffect, useState } from "react";
import { GRADE_NAME } from "../../../data/academic";
import { COURSES, type StudentRecord } from "../../../data/students";
import { clock } from "../../../services/client";
import { useSetStudentStatus, useStudents, useUpdateStudent } from "../../../services/students";
import type { EnrollmentStatus } from "../../../types/domain";
import { Avatar } from "../../atoms/Avatar";
import { Button } from "../../atoms/Button";
import { IconAction } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import { EnrollBadge } from "../../molecules/EnrollBadge";
import { FilterGroup, SearchField } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { Block } from "../Layout";
import { ConfirmAction, Drawer } from "../Overlays";
import { useToast } from "../Toast";
import { useI18n } from "../../../i18n/I18nProvider";
import { shortDayYear } from "../../../i18n/dates";
import type { Lang } from "../../../i18n/format";

/** Fecha de matrícula: en español la forma de siempre; en inglés y portugués, con Intl. */
export const enrolledText = (lang: Lang, s: StudentRecord) => (lang === "es" || !s.enrolledOn ? s.enrolled : shortDayYear(lang, s.enrolledOn));

type DrawerStudent = StudentRecord & { _edit?: boolean };
type Ask = { kind: "retire" | "archive"; rows: StudentRecord[]; clear?: () => void; title: string; description: string };

/** Estudiantes y matrículas: tabla avanzada con acciones en lote y vista rápida en drawer. */
export function StudentTable({ readOnly: ro = false, onNavigate }: { readOnly?: boolean; onNavigate?: (page: string, params?: { id?: string }) => void }) {
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState("all");
  const query = useStudents();
  const rows = query.data ?? [];
  const setStatusMut = useSetStudentStatus();
  const updateMut = useUpdateStudent();
  const [drawer, setDrawer] = useState<DrawerStudent | null>(null);
  const [confirm, setConfirm] = useState<Ask | null>(null);
  const [showToast, toastNode] = useToast();
  const { t: tr, lang } = useI18n();
  const x = tr.adm.stu;
  // Dato viejo: si la recarga falla pero hay datos de antes, se siguen mostrando y se avisa desde cuándo.
  useEffect(() => {
    if (query.isRefetchError) showToast({ tone: "error", title: x.refreshError, message: x.refreshErrorText(clock(query.dataUpdatedAt)) });
  }, [query.isRefetchError, query.dataUpdatedAt, showToast]);
  const saveError = () => showToast({ tone: "error", title: x.saveError, message: x.saveErrorText });
  const t = q.trim().toLowerCase();
  const list = rows.filter((s) =>
    (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0 || s.document.toLowerCase().indexOf(t) >= 0) && (course === "all" || s.course === course) && (status === "all" || s.status === status));
  const setRowStatus = (ids: string[], st: EnrollmentStatus) => setStatusMut.mutateAsync({ ids, status: st });
  function ask(kind: Ask["kind"], list2: StudentRecord[], clear?: () => void) {
    const many = list2.length > 1;
    setConfirm({
      kind, rows: list2, clear,
      title: (kind === "retire" ? x.retireTitle : x.archiveTitle)(many ? String(list2.length) : list2[0].first, many),
      description: kind === "retire" ? x.retireText : x.archiveText,
    });
  }
  const counts: Record<string, number> = { all: rows.length };
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

  return (
    <>
      <DataGrid<StudentRecord>
        caption={x.caption} rows={list} selectable={!ro} densityToggle density="compact" pageSize={12} resetKey={t + course + status}
        initialSort={{ key: "name", dir: "asc" }}
        loading={query.isPending} error={query.isError && !query.data ? x.loadError : undefined} onRetry={() => query.refetch()}
        emptyTitle={rows.length ? x.noResults : x.none} emptyMessage={x.noResultsText} emptyIcon="students"
        toolbar={<>
          <SearchField value={q} onChange={setQ} placeholder={x.searchPh} label={x.search} />
          <FilterGroup as="select" label={tr.adm.f.course} value={course} onChange={setCourse} options={[{ value: "all", label: tr.adm.f.all }, ...COURSES.map((c) => ({ value: c, label: c }))]} />
          <FilterGroup label={tr.adm.f.state} value={status} onChange={setStatus} options={[
            { value: "all", label: tr.adm.f.all, count: counts.all }, { value: "active", label: tr.enroll.active, count: counts.active || 0 }, { value: "pending", label: tr.enroll.pending, count: counts.pending || 0 },
            { value: "retired", label: tr.enroll.retired, count: counts.retired || 0 }, { value: "archived", label: tr.enroll.archived, count: counts.archived || 0 }]} />
        </>}
        bulkActions={(sel, clear) => [
          <Button key="x" size="sm" variant="secondary" icon="download" onClick={() => showToast({ tone: "success", title: x.exported, message: x.exportedText(sel.length) })}>{x.export}</Button>,
          <Button key="b" size="sm" variant="secondary" icon="book" onClick={() => showToast({ tone: "info", title: x.queued, message: x.queuedText(sel.length) })}>{x.generate}</Button>,
          <Button key="a" size="sm" icon="archive" onClick={() => ask("archive", sel, clear)}>{x.archive}</Button>,
        ]}
        columns={[
          { key: "name", label: x.cols.name, sortable: true, header: true, render: (r) => <button type="button" className="ns-cell-link" onClick={() => setDrawer(r)}><Avatar name={r.name} size="sm" /><span>{r.name}</span></button> },
          { key: "document", label: x.cols.document, sortable: true },
          { key: "id", label: x.cols.id, sortable: true, className: "ns-mono" },
          { key: "grade", label: x.cols.grade, sortable: true, render: (r) => tr.adm.gradeName(GRADE_NAME[r.grade]) },
          { key: "course", label: x.cols.course, sortable: true, render: (r) => <span className="ns-course-tag">{r.course}</span> },
          { key: "guardian", label: x.cols.guardian, sortable: true },
          { key: "status", label: x.cols.state, sortable: true, render: (r) => <EnrollBadge status={r.status} /> },
          { key: "enrolled", label: x.cols.enrolled, render: (r) => enrolledText(lang, r) },
        ]}
        rowActions={(r) => [
          <IconAction key="v" icon="eye" label={x.viewProfile(r.name)} onClick={() => setDrawer(r)} />,
          ro ? null : <IconAction key="e" icon="edit" label={x.edit(r.name)} onClick={() => setDrawer({ _edit: true, ...r })} />,
          ro ? null : <IconAction key="a" icon="archive" label={x.archiveOf(r.name)} disabled={r.status === "archived"} onClick={() => ask("archive", [r])} />,
          ro ? null : <IconAction key="r" icon="userx" tone="danger" label={x.retireOf(r.name)} disabled={r.status === "retired"} onClick={() => ask("retire", [r])} />,
        ]}
      />
      <StudentDrawer
        student={drawer} readOnly={ro} onClose={() => setDrawer(null)}
        onOpenProfile={(s) => { setDrawer(null); onNavigate?.("profile", { id: s.id }); }}
        onSave={(s) => {
          setDrawer(null);
          updateMut.mutateAsync(s).then(
            () => showToast({ tone: "success", title: x.saved, message: x.savedText(s.name) }),
            saveError,
          );
        }}
      />
      <ConfirmAction
        open={!!confirm} onCancel={() => setConfirm(null)} title={confirm?.title} description={confirm?.description} danger={confirm?.kind === "retire"}
        icon={confirm?.kind === "retire" ? "userx" : "archive"} confirmLabel={confirm?.kind === "retire" ? x.retire : x.archive}
        onConfirm={() => {
          const c = confirm!;
          c.clear?.();
          setConfirm(null);
          setRowStatus(c.rows.map((r) => r.id), c.kind === "retire" ? "retired" : "archived").then(
            () => showToast({ tone: "success", title: c.kind === "retire" ? x.retired : x.archived, message: x.updated(c.rows.length) }),
            saveError,
          );
        }}
      />
      {toastNode}
    </>
  );
}

interface StudentDrawerProps {
  student: DrawerStudent | null;
  readOnly?: boolean;
  onClose: () => void;
  onOpenProfile: (s: StudentRecord) => void;
  onSave: (s: StudentRecord) => void;
}

/** Vista rápida (consultar) o edición (Secretaría) sin salir de la tabla. */
export function StudentDrawer({ student: s, readOnly, onClose, onOpenProfile, onSave }: StudentDrawerProps) {
  const [form, setForm] = useState<DrawerStudent | null>(null);
  useEffect(() => { setForm(s ? { ...s } : null); }, [s]);
  const edit = !!s && !!s._edit && !readOnly;
  const f = (form || s || {}) as DrawerStudent;
  const clear = s ? s.library && s.fees && s.documents : false;
  const { t, lang, shownGrade } = useI18n();
  const x = t.adm.stu;
  return (
    <Drawer
      open={!!s} onClose={onClose} eyebrow={edit ? x.editEyebrow : x.quickEyebrow} title={s ? s.name : ""} closeLabel={t.prefs.close}
      footer={s ? (edit
        ? [<Button key="c" variant="secondary" onClick={onClose}>{x.cancel}</Button>,
          <Button key="s" icon="check" onClick={() => { const o = { ...f }; delete o._edit; o.name = o.first + " " + o.last; onSave(o); }}>{x.saveChanges}</Button>]
        : [<Button key="p" variant="secondary" iconRight="arrow" onClick={() => onOpenProfile(s)}>{x.openProfile}</Button>]) : null}
    >
      {s ? (edit ? (
        <div className="ns-form-grid">
          <Input label={x.first} required value={f.first} onChange={(e) => setForm({ ...f, first: e.target.value })} />
          <Input label={x.last} required value={f.last} onChange={(e) => setForm({ ...f, last: e.target.value })} />
          <Input label={x.cols.document} readOnly value={f.document} hint={x.docHint} />
          <Select label={x.cols.course} value={f.course} onChange={(v) => setForm({ ...f, course: v, grade: v.charAt(0) })} options={COURSES} />
          <Input label={x.cols.guardian} value={f.guardian} onChange={(e) => setForm({ ...f, guardian: e.target.value })} />
          <Input label={x.guardianPhone} value={f.guardianPhone} onChange={(e) => setForm({ ...f, guardianPhone: e.target.value })} />
        </div>
      ) : (
        <div className="ns-col" style={{ gap: 18 }}>
          <div className="ns-row">
            <Avatar name={s.name} size="lg" />
            <div className="ns-col" style={{ gap: 4 }}><EnrollBadge status={s.status} /><span className="ns-caption">{x.idLine(s.id, t.adm.gradeName(GRADE_NAME[s.grade]), s.course)}</span></div>
          </div>
          <dl className="ns-dl">
            {[[x.cols.document, s.document], [x.cols.guardian, s.guardian + " (" + t.adm.fixed(s.guardianRel) + ")"], [x.phone, s.guardianPhone], [x.cols.enrolled, enrolledText(lang, s)], [x.avg, shownGrade(s.avg)], [x.attendance, isNaN(s.attendance) ? x.noRecords : s.attendance + "%"]].map((y) => (
              <Fragment key={y[0]}><dt>{y[0]}</dt><dd>{y[1]}</dd></Fragment>
            ))}
          </dl>
          <Block tone={clear ? "sage" : "burgundy"}>
            <strong>{clear ? x.clear : x.notClear}</strong>
            <span className="ns-caption">{t.tch.prof.clearanceDetail(s.library ? "✓" : "×", s.fees ? "✓" : "×", s.documents ? "✓" : "×")}</span>
          </Block>
        </div>
      )) : null}
    </Drawer>
  );
}
