import { Fragment, useEffect, useState } from "react";
import { formatGrade } from "../../../lib/grade";
import { GRADE_NAME } from "../../../data/academic";
import { ALL_STUDENTS, COURSES, type StudentRecord } from "../../../data/students";
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

type DrawerStudent = StudentRecord & { _edit?: boolean };
type Ask = { kind: "retire" | "archive"; rows: StudentRecord[]; clear?: () => void; title: string; description: string };

/** Estudiantes y matrículas: tabla avanzada con acciones en lote y vista rápida en drawer. */
export function StudentTable({ readOnly: ro = false, onNavigate }: { readOnly?: boolean; onNavigate?: (page: string, params?: { id?: string }) => void }) {
  const [q, setQ] = useState("");
  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<StudentRecord[]>(ALL_STUDENTS);
  const [drawer, setDrawer] = useState<DrawerStudent | null>(null);
  const [confirm, setConfirm] = useState<Ask | null>(null);
  const [showToast, toastNode] = useToast();
  const t = q.trim().toLowerCase();
  const list = rows.filter((s) =>
    (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0 || s.document.toLowerCase().indexOf(t) >= 0) && (course === "all" || s.course === course) && (status === "all" || s.status === status));
  const setRowStatus = (ids: string[], st: EnrollmentStatus) => setRows(rows.map((r) => (ids.indexOf(r.id) >= 0 ? { ...r, status: st } : r)));
  function ask(kind: Ask["kind"], list2: StudentRecord[], clear?: () => void) {
    const many = list2.length > 1;
    setConfirm({
      kind, rows: list2, clear,
      title: (kind === "retire" ? "¿Retirar " : "¿Archivar ") + (many ? list2.length + " estudiantes?" : "a " + list2[0].first + "?"),
      description: kind === "retire" ? "El estudiante deja de aparecer en listas de clase. Su historial académico se conserva." : "Los registros archivados se ocultan de la gestión diaria y pueden restaurarse.",
    });
  }
  const counts: Record<string, number> = { all: rows.length };
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

  return (
    <>
      <DataGrid<StudentRecord>
        caption="Estudiantes y matrículas" rows={list} selectable={!ro} densityToggle density="compact" pageSize={12} resetKey={t + course + status}
        initialSort={{ key: "name", dir: "asc" }}
        emptyTitle={rows.length ? "No hay resultados para esta búsqueda." : "No hay estudiantes registrados."} emptyMessage="Prueba con otro nombre, documento o curso." emptyIcon="students"
        toolbar={<>
          <SearchField value={q} onChange={setQ} placeholder="Nombre, documento o ID" label="Buscar estudiante" />
          <FilterGroup as="select" label="Curso" value={course} onChange={setCourse} options={[{ value: "all", label: "Todos" }, ...COURSES.map((c) => ({ value: c, label: c }))]} />
          <FilterGroup label="Estado" value={status} onChange={setStatus} options={[
            { value: "all", label: "Todos", count: counts.all }, { value: "active", label: "Activo", count: counts.active || 0 }, { value: "pending", label: "Pendiente", count: counts.pending || 0 },
            { value: "retired", label: "Retirado", count: counts.retired || 0 }, { value: "archived", label: "Archivado", count: counts.archived || 0 }]} />
        </>}
        bulkActions={(sel, clear) => [
          <Button key="x" size="sm" variant="secondary" icon="download" onClick={() => showToast({ tone: "success", title: "Exportación lista", message: sel.length + " estudiantes exportados a Excel." })}>Exportar</Button>,
          <Button key="b" size="sm" variant="secondary" icon="book" onClick={() => showToast({ tone: "info", title: "Boletines en cola", message: "Se generarán " + sel.length + " boletines." })}>Generar boletines</Button>,
          <Button key="a" size="sm" icon="archive" onClick={() => ask("archive", sel, clear)}>Archivar</Button>,
        ]}
        columns={[
          { key: "name", label: "Nombre completo", sortable: true, header: true, render: (r) => <button type="button" className="ns-cell-link" onClick={() => setDrawer(r)}><Avatar name={r.name} size="sm" /><span>{r.name}</span></button> },
          { key: "document", label: "Documento", sortable: true },
          { key: "id", label: "ID estudiantil", sortable: true, className: "ns-mono" },
          { key: "grade", label: "Grado", sortable: true, render: (r) => GRADE_NAME[r.grade] },
          { key: "course", label: "Curso", sortable: true, render: (r) => <span className="ns-course-tag">{r.course}</span> },
          { key: "guardian", label: "Acudiente", sortable: true },
          { key: "status", label: "Estado", sortable: true, render: (r) => <EnrollBadge status={r.status} /> },
          { key: "enrolled", label: "Fecha de matrícula" },
        ]}
        rowActions={(r) => [
          <IconAction key="v" icon="eye" label={"Ver perfil de " + r.name} onClick={() => setDrawer(r)} />,
          ro ? null : <IconAction key="e" icon="edit" label={"Editar " + r.name} onClick={() => setDrawer({ _edit: true, ...r })} />,
          ro ? null : <IconAction key="a" icon="archive" label={"Archivar " + r.name} disabled={r.status === "archived"} onClick={() => ask("archive", [r])} />,
          ro ? null : <IconAction key="r" icon="userx" tone="danger" label={"Retirar " + r.name} disabled={r.status === "retired"} onClick={() => ask("retire", [r])} />,
        ]}
      />
      <StudentDrawer
        student={drawer} readOnly={ro} onClose={() => setDrawer(null)}
        onOpenProfile={(s) => { setDrawer(null); onNavigate?.("profile", { id: s.id }); }}
        onSave={(s) => { setRows(rows.map((r) => (r.id === s.id ? s : r))); setDrawer(null); showToast({ tone: "success", title: "Cambios guardados", message: s.name + " fue actualizado." }); }}
      />
      <ConfirmAction
        open={!!confirm} onCancel={() => setConfirm(null)} title={confirm?.title} description={confirm?.description} danger={confirm?.kind === "retire"}
        icon={confirm?.kind === "retire" ? "userx" : "archive"} confirmLabel={confirm?.kind === "retire" ? "Retirar" : "Archivar"}
        onConfirm={() => {
          const c = confirm!;
          setRowStatus(c.rows.map((r) => r.id), c.kind === "retire" ? "retired" : "archived");
          c.clear?.();
          setConfirm(null);
          showToast({ tone: "success", title: c.kind === "retire" ? "Estudiante retirado" : "Registros archivados", message: c.rows.length + (c.rows.length === 1 ? " registro actualizado." : " registros actualizados.") });
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
  return (
    <Drawer
      open={!!s} onClose={onClose} eyebrow={edit ? "Editar estudiante" : "Vista rápida"} title={s ? s.name : ""}
      footer={s ? (edit
        ? [<Button key="c" variant="secondary" onClick={onClose}>Cancelar</Button>,
          <Button key="s" icon="check" onClick={() => { const o = { ...f }; delete o._edit; o.name = o.first + " " + o.last; onSave(o); }}>Guardar cambios</Button>]
        : [<Button key="p" variant="secondary" iconRight="arrow" onClick={() => onOpenProfile(s)}>Abrir perfil completo</Button>]) : null}
    >
      {s ? (edit ? (
        <div className="ns-form-grid">
          <Input label="Nombres" required value={f.first} onChange={(e) => setForm({ ...f, first: e.target.value })} />
          <Input label="Apellidos" required value={f.last} onChange={(e) => setForm({ ...f, last: e.target.value })} />
          <Input label="Documento" readOnly value={f.document} hint="El documento solo se corrige desde Matrículas." />
          <Select label="Curso" value={f.course} onChange={(v) => setForm({ ...f, course: v, grade: v.charAt(0) })} options={COURSES} />
          <Input label="Acudiente" value={f.guardian} onChange={(e) => setForm({ ...f, guardian: e.target.value })} />
          <Input label="Teléfono del acudiente" value={f.guardianPhone} onChange={(e) => setForm({ ...f, guardianPhone: e.target.value })} />
        </div>
      ) : (
        <div className="ns-col" style={{ gap: 18 }}>
          <div className="ns-row">
            <Avatar name={s.name} size="lg" />
            <div className="ns-col" style={{ gap: 4 }}><EnrollBadge status={s.status} /><span className="ns-caption">{"ID " + s.id + " · " + GRADE_NAME[s.grade] + " · " + s.course}</span></div>
          </div>
          <dl className="ns-dl">
            {[["Documento", s.document], ["Acudiente", s.guardian + " (" + s.guardianRel + ")"], ["Teléfono", s.guardianPhone], ["Fecha de matrícula", s.enrolled], ["Promedio actual", formatGrade(s.avg)], ["Asistencia", s.attendance + "%"]].map((x) => (
              <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>
            ))}
          </dl>
          <Block tone={clear ? "sage" : "burgundy"}>
            <strong>{clear ? "Paz y salvo al día" : "Paz y salvo con pendientes"}</strong>
            <span className="ns-caption">{"Biblioteca " + (s.library ? "✓" : "×") + " · Pensiones " + (s.fees ? "✓" : "×") + " · Documentos " + (s.documents ? "✓" : "×")}</span>
          </Block>
        </div>
      )) : null}
    </Drawer>
  );
}
