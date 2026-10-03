import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEMO } from "../../../lib/supabase";
import { adminMessage, useArchiveStructure, useSaveStructure, useStructure, type StructureData, type StructureItem, type StructureKind } from "../../../services/admin";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction, SegmentedTabs } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import type { IconName } from "../../atoms/Icon";
import { DataGrid, type GridColumn } from "../DataGrid";
import { ConfirmAction, Drawer } from "../Overlays";
import { useToast } from "../Toast";

type Kind = StructureKind;
type Item = StructureItem;
type DrawerItem = (Partial<Item> & { _new?: boolean }) | null;

const ST: Record<string, [string, BadgeTone, IconName]> = { active: ["Activo", "verified", "check"], draft: ["Sin cursos", "pending", "clock"], archived: ["Archivado", "neutral", "archive"] };
const badge = (s: string) => { const x = ST[s]; return <Badge tone={x[1]} icon={x[2]}>{x[0]}</Badge>; };

/** Grados, cursos y materias de la institución: crear, editar y archivar. */
export function AcademicStructureManager({ tab: initialTab = "grades" }: { tab?: Kind }) {
  const q = useStructure();
  const saveMut = useSaveStructure();
  const archiveMut = useArchiveStructure();
  const [tab, setTab] = useState<Kind>(initialTab);
  const [drawer, setDrawer] = useState<DrawerItem>(null);
  const [archive, setArchive] = useState<Item | null>(null);
  const [showToast, toastNode] = useToast();
  const [data, setData] = useState<StructureData | undefined>(q.data);
  const lastData = useRef(q.data);
  // Datos nuevos de la base: la tabla se recarga (en demostración los cambios quedan solo en pantalla).
  useEffect(() => { if (lastData.current !== q.data) { lastData.current = q.data; setData(q.data); } }, [q.data]);
  const grades = data?.grades ?? [], courses = data?.courses ?? [], subjects = data?.subjects ?? [];
  const setList = (k: Kind, list: Item[]) => setData((d) => (d ? { ...d, [k]: list } : d));

  const cfg: Record<Kind, { label: string; rows: Item[]; cols: GridColumn<Item>[] }> = {
    grades: { label: "grado", rows: grades, cols: [{ key: "name", label: "Grado", header: true, sortable: true }, { key: "level", label: "Nivel" }, { key: "courses", label: "Cursos", numeric: true }, { key: "status", label: "Estado", render: (r) => badge(r.status) }] },
    courses: { label: "curso", rows: courses, cols: [{ key: "name", label: "Curso", header: true, sortable: true, render: (r) => <span className="ns-course-tag">{r.name}</span> }, { key: "grade", label: "Grado", sortable: true }, { key: "director", label: "Director de grupo", sortable: true }, { key: "students", label: "Estudiantes", numeric: true, sortable: true }, { key: "status", label: "Estado", render: (r) => badge(r.status) }] },
    subjects: { label: "materia", rows: subjects, cols: [{ key: "name", label: "Materia", header: true, sortable: true }, { key: "code", label: "Código", className: "ns-mono" }, { key: "category", label: "Categoría", sortable: true }, { key: "status", label: "Estado", render: (r) => badge(r.status) }] },
  };
  const c = cfg[tab];

  function save(form: Partial<Item>) {
    const list = c.rows.slice(), i = list.findIndex((x) => x.id === form.id);
    saveMut.mutateAsync({ kind: tab, item: form as Item, isNew: i < 0, data: data! }).then(
      () => {
        if (DEMO) { if (i >= 0) list[i] = form as Item; else list.push({ id: "n" + Date.now(), status: "active", ...form } as Item); setList(tab, list); }
        setDrawer(null);
        showToast({ tone: "success", title: i >= 0 ? "Cambios guardados" : "Creado correctamente", message: (form.name || "") + "" });
      },
      (e) => showToast({ tone: "error", title: "No pudimos guardar", message: adminMessage(e) }),
    );
  }

  return (
    <>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <SegmentedTabs label="Elemento de la estructura" value={tab} onChange={(v) => setTab(v as Kind)}
          tabs={[{ value: "grades", label: "Grados", icon: "layers", count: grades.length }, { value: "courses", label: "Cursos", icon: "students", count: courses.length }, { value: "subjects", label: "Materias", icon: "book", count: subjects.length }]} />
        <Button icon="plus" disabled={!data} onClick={() => setDrawer({ _new: true })}>{"Crear " + c.label}</Button>
      </div>
      <DataGrid<Item>
        caption={"Estructura académica · " + c.label + "s"} rows={c.rows} paginate={false} density="compact" columns={c.cols} resetKey={tab} emptyTitle="No hay elementos configurados."
        loading={q.isPending && !data} error={q.isError && !data ? "No pudimos cargar la estructura académica." : undefined} onRetry={() => q.refetch()}
        rowActions={(r) => [
          <IconAction key="e" icon="edit" label={"Editar " + r.name} onClick={() => setDrawer(r)} />,
          <IconAction key="a" icon="archive" label={"Archivar " + r.name} disabled={r.status === "archived"} onClick={() => setArchive(r)} />,
        ]}
      />
      <StructureDrawer kind={tab} item={drawer} data={data} saving={saveMut.isPending} onClose={() => setDrawer(null)} onSave={save} />
      <ConfirmAction
        open={!!archive} onCancel={() => setArchive(null)} icon="archive" title={archive ? "¿Archivar " + archive.name + "?" : ""} loading={archiveMut.isPending}
        description="Dejará de aparecer al crear asignaciones y matrículas. El historial se conserva." confirmLabel="Archivar"
        onConfirm={() => {
          const r = archive!;
          archiveMut.mutateAsync({ kind: tab, id: r.id }).then(
            () => {
              if (DEMO) setList(tab, c.rows.map((x) => (x.id === r.id ? { ...x, status: "archived" } : x)));
              setArchive(null);
              showToast({ tone: "success", title: "Archivado", message: r.name });
            },
            (e) => { setArchive(null); showToast({ tone: "error", title: "No pudimos archivar", message: adminMessage(e) }); },
          );
        }}
      />
      {toastNode}
    </>
  );
}

function StructureDrawer({ kind, item, data, saving, onClose, onSave }: { kind: Kind; item: DrawerItem; data?: StructureData; saving?: boolean; onClose: () => void; onSave: (f: Partial<Item>) => void }) {
  const [v, setV] = useState<Partial<Item> & { _new?: boolean }>({});
  const [tried, setTried] = useState(false);
  useEffect(() => { setV(item ? { ...item } : {}); }, [item]);
  const set = (k: string) => (e: { target: { value: string } } | string) => setV({ ...v, [k]: typeof e === "string" ? e : e.target.value });
  const isNew = !!item && !!item._new;
  const label = { grades: "grado", courses: "curso", subjects: "materia" }[kind];
  const str = (k: keyof Item) => v[k] as string | undefined;
  const gradeNames = (data?.grades ?? []).filter((g) => g.status !== "archived").map((g) => g.name);
  let fields: ReactNode[];
  if (kind === "grades") {
    fields = [
      <Input key={1} label="Nombre del grado" required value={str("name") || ""} onChange={set("name")} error={tried && !v.name ? "Escribe el nombre del grado." : null} placeholder="Noveno" />,
      <Select key={2} label="Nivel" value={str("level") || "Básica secundaria"} onChange={set("level")} options={["Básica primaria", "Básica secundaria", "Media"]} />,
    ];
  } else if (kind === "courses") {
    fields = [
      <Select key={1} label="Grado" required value={str("grade") || gradeNames[0] || ""} onChange={set("grade")} options={gradeNames} />,
      <Input key={2} label="Nombre del curso" required value={str("name") || ""} onChange={set("name")} placeholder="9A" error={tried && !v.name ? "Escribe el nombre del curso." : null} />,
      <Select key={3} label="Director de grupo" value={str("director") || ""} placeholder="Sin asignar" onChange={set("director")} options={(data?.teachers ?? []).map((t) => t.name)} />,
      <Input key={4} label="Cupo máximo" type="number" value={v.capacity ?? 35} onChange={(e) => setV({ ...v, capacity: Math.max(1, Number(e.target.value) || 0) })} />,
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
        <Button key="s" icon="check" loading={saving} onClick={() => {
          setTried(true); if (!v.name) return;
          const o = { ...v }; delete o._new;
          if (kind === "courses" && !o.grade) o.grade = gradeNames[0];
          onSave(o); setTried(false);
        }}>{isNew ? "Crear " + label : "Guardar cambios"}</Button>,
      ]}
    >
      <div className="ns-form-grid ns-form-grid--1">{fields}</div>
    </Drawer>
  );
}
