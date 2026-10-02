import { useEffect, useState, type ReactNode } from "react";
import { GRADE_NAME, SUBJECTS, TEACHERS } from "../../../data/academic";
import { ALL_STUDENTS, COURSES } from "../../../data/students";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction, SegmentedTabs } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import type { IconName } from "../../atoms/Icon";
import { DataGrid, type GridColumn } from "../DataGrid";
import { ConfirmAction, Drawer } from "../Overlays";
import { useToast } from "../Toast";

type Kind = "grades" | "courses" | "subjects";
type Item = { id: string; name: string; status: string; level?: string; courses?: number; grade?: string; director?: string; students?: number; code?: string; category?: string };
type DrawerItem = (Partial<Item> & { _new?: boolean }) | null;

const ST: Record<string, [string, BadgeTone, IconName]> = { active: ["Activo", "verified", "check"], draft: ["Sin cursos", "pending", "clock"], archived: ["Archivado", "neutral", "archive"] };
const badge = (s: string) => { const x = ST[s]; return <Badge tone={x[1]} icon={x[2]}>{x[0]}</Badge>; };

/** Grados, cursos y materias de la institución: crear, editar y archivar. */
export function AcademicStructureManager({ tab: initialTab = "grades" }: { tab?: Kind }) {
  const [tab, setTab] = useState<Kind>(initialTab);
  const [drawer, setDrawer] = useState<DrawerItem>(null);
  const [archive, setArchive] = useState<Item | null>(null);
  const [showToast, toastNode] = useToast();
  const [grades, setGrades] = useState<Item[]>(() => ["6", "7", "8", "9", "10", "11"].map((g, i) => ({ id: g, name: GRADE_NAME[g], level: i < 4 ? "Básica secundaria" : "Media", courses: i < 3 ? 2 : 0, status: i < 3 ? "active" : "draft" })));
  const [courses, setCourses] = useState<Item[]>(() => COURSES.map((c, i) => ({ id: c, grade: GRADE_NAME[c.charAt(0)], name: c, director: TEACHERS[i % TEACHERS.length].name, students: ALL_STUDENTS.filter((s) => s.course === c && s.status !== "retired").length, status: "active" })));
  const [subjects, setSubjects] = useState<Item[]>(() => [...SUBJECTS.map((s) => ({ status: "active", ...s })), { id: "is", name: "Ingeniería de Software", code: "ISW-07", category: "Tecnología e informática", status: "archived" }]);

  const cfg: Record<Kind, { label: string; data: [Item[], (v: Item[]) => void]; cols: GridColumn<Item>[] }> = {
    grades: { label: "grado", data: [grades, setGrades], cols: [{ key: "name", label: "Grado", header: true, sortable: true }, { key: "level", label: "Nivel" }, { key: "courses", label: "Cursos", numeric: true }, { key: "status", label: "Estado", render: (r) => badge(r.status) }] },
    courses: { label: "curso", data: [courses, setCourses], cols: [{ key: "name", label: "Curso", header: true, sortable: true, render: (r) => <span className="ns-course-tag">{r.name}</span> }, { key: "grade", label: "Grado", sortable: true }, { key: "director", label: "Director de grupo", sortable: true }, { key: "students", label: "Estudiantes", numeric: true, sortable: true }, { key: "status", label: "Estado", render: (r) => badge(r.status) }] },
    subjects: { label: "materia", data: [subjects, setSubjects], cols: [{ key: "name", label: "Materia", header: true, sortable: true }, { key: "code", label: "Código", className: "ns-mono" }, { key: "category", label: "Categoría", sortable: true }, { key: "status", label: "Estado", render: (r) => badge(r.status) }] },
  };
  const c = cfg[tab];

  function save(form: Partial<Item>) {
    const [data, setData] = c.data;
    const list = data.slice(), i = list.findIndex((x) => x.id === form.id);
    if (i >= 0) list[i] = form as Item; else list.push({ id: "n" + Date.now(), status: "active", ...form } as Item);
    setData(list);
    setDrawer(null);
    showToast({ tone: "success", title: i >= 0 ? "Cambios guardados" : "Creado correctamente", message: (form.name || "") + "" });
  }

  return (
    <>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <SegmentedTabs label="Elemento de la estructura" value={tab} onChange={(v) => setTab(v as Kind)}
          tabs={[{ value: "grades", label: "Grados", icon: "layers", count: grades.length }, { value: "courses", label: "Cursos", icon: "students", count: courses.length }, { value: "subjects", label: "Materias", icon: "book", count: subjects.length }]} />
        <Button icon="plus" onClick={() => setDrawer({ _new: true })}>{"Crear " + c.label}</Button>
      </div>
      <DataGrid<Item>
        caption={"Estructura académica · " + c.label + "s"} rows={c.data[0]} paginate={false} density="compact" columns={c.cols} resetKey={tab} emptyTitle="No hay elementos configurados."
        rowActions={(r) => [
          <IconAction key="e" icon="edit" label={"Editar " + r.name} onClick={() => setDrawer(r)} />,
          <IconAction key="a" icon="archive" label={"Archivar " + r.name} disabled={r.status === "archived"} onClick={() => setArchive(r)} />,
        ]}
      />
      <StructureDrawer kind={tab} item={drawer} onClose={() => setDrawer(null)} onSave={save} />
      <ConfirmAction
        open={!!archive} onCancel={() => setArchive(null)} icon="archive" title={archive ? "¿Archivar " + archive.name + "?" : ""}
        description="Dejará de aparecer al crear asignaciones y matrículas. El historial se conserva." confirmLabel="Archivar"
        onConfirm={() => { const r = archive!; c.data[1](c.data[0].map((x) => (x.id === r.id ? { ...x, status: "archived" } : x))); setArchive(null); showToast({ tone: "success", title: "Archivado", message: r.name }); }}
      />
      {toastNode}
    </>
  );
}

function StructureDrawer({ kind, item, onClose, onSave }: { kind: Kind; item: DrawerItem; onClose: () => void; onSave: (f: Partial<Item>) => void }) {
  const [v, setV] = useState<Partial<Item> & { _new?: boolean }>({});
  const [tried, setTried] = useState(false);
  useEffect(() => { setV(item ? { ...item } : {}); }, [item]);
  const set = (k: string) => (e: { target: { value: string } } | string) => setV({ ...v, [k]: typeof e === "string" ? e : e.target.value });
  const isNew = !!item && !!item._new;
  const label = { grades: "grado", courses: "curso", subjects: "materia" }[kind];
  const str = (k: keyof Item) => v[k] as string | undefined;
  let fields: ReactNode[];
  if (kind === "grades") {
    fields = [
      <Input key={1} label="Nombre del grado" required value={str("name") || ""} onChange={set("name")} error={tried && !v.name ? "Escribe el nombre del grado." : null} placeholder="Noveno" />,
      <Select key={2} label="Nivel" value={str("level") || "Básica secundaria"} onChange={set("level")} options={["Básica primaria", "Básica secundaria", "Media"]} />,
    ];
  } else if (kind === "courses") {
    fields = [
      <Select key={1} label="Grado" required value={str("grade") || "Sexto"} onChange={set("grade")} options={Object.keys(GRADE_NAME).map((k) => GRADE_NAME[k])} />,
      <Input key={2} label="Nombre del curso" required value={str("name") || ""} onChange={set("name")} placeholder="9A" error={tried && !v.name ? "Escribe el nombre del curso." : null} />,
      <Select key={3} label="Director de grupo" value={str("director") || ""} placeholder="Sin asignar" onChange={set("director")} options={TEACHERS.map((t) => t.name)} />,
      <Input key={4} label="Cupo máximo" type="number" defaultValue={35} />,
    ];
  } else {
    fields = [
      <Input key={1} label="Nombre de la materia" required value={str("name") || ""} onChange={set("name")} error={tried && !v.name ? "Escribe el nombre de la materia." : null} />,
      <Input key={2} label="Código" value={str("code") || ""} onChange={set("code")} placeholder="MAT-01" />,
      <Select key={3} label="Categoría" value={str("category") || "Ciencias exactas"} onChange={set("category")} options={["Ciencias exactas", "Ciencias naturales", "Humanidades", "Tecnología e informática", "Artes", "Educación física"]} />,
    ];
  }
  return (
    <Drawer
      open={!!item} onClose={onClose} eyebrow="Estructura académica" title={(isNew ? "Crear " : "Editar ") + label}
      footer={[
        <Button key="c" variant="secondary" onClick={onClose}>Cancelar</Button>,
        <Button key="s" icon="check" onClick={() => { setTried(true); if (!v.name) return; const o = { ...v }; delete o._new; onSave(o); setTried(false); }}>{isNew ? "Crear " + label : "Guardar cambios"}</Button>,
      ]}
    >
      <div className="ns-form-grid ns-form-grid--1">{fields}</div>
    </Drawer>
  );
}
