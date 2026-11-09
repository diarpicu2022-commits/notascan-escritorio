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
import { useI18n } from "../../../i18n/I18nProvider";
import type { Messages } from "../../../i18n/es";

type Kind = StructureKind;
type Item = StructureItem;
type DrawerItem = (Partial<Item> & { _new?: boolean }) | null;

/** Tono e icono de cada estado; la palabra sale del diccionario (t.adm.structStatus). */
const ST: Record<string, [BadgeTone, IconName]> = { active: ["verified", "check"], draft: ["pending", "clock"], archived: ["neutral", "archive"] };
const badge = (t: Messages, s: string) => { const x = ST[s]; return <Badge tone={x[0]} icon={x[1]}>{t.adm.structStatus[s as keyof Messages["adm"]["structStatus"]]}</Badge>; };
/* Listas fijas: el valor se guarda en español y la etiqueta sale en el idioma de la app (t.adm.fixed). */
const LEVELS = ["Básica primaria", "Básica secundaria", "Media"];
const CATEGORIES = ["Ciencias exactas", "Ciencias naturales", "Humanidades", "Tecnología e informática", "Artes", "Educación física"];

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
  const { t } = useI18n();
  const s = t.adm.str, k = s.cols, fx = t.adm.fixed;

  const cfg: Record<Kind, { label: string; rows: Item[]; cols: GridColumn<Item>[] }> = {
    grades: { label: s.labels.grades, rows: grades, cols: [{ key: "name", label: k.grade, header: true, sortable: true, render: (r) => t.adm.gradeName(r.name) }, { key: "level", label: k.level, render: (r) => fx(r.level ?? "") }, { key: "courses", label: k.courses, numeric: true }, { key: "status", label: k.state, render: (r) => badge(t, r.status) }] },
    courses: { label: s.labels.courses, rows: courses, cols: [{ key: "name", label: k.course, header: true, sortable: true, render: (r) => <span className="ns-course-tag">{r.name}</span> }, { key: "grade", label: k.grade, sortable: true, render: (r) => t.adm.gradeName(r.grade ?? "") }, { key: "director", label: k.director, sortable: true }, { key: "students", label: k.students, numeric: true, sortable: true }, { key: "status", label: k.state, render: (r) => badge(t, r.status) }] },
    subjects: { label: s.labels.subjects, rows: subjects, cols: [{ key: "name", label: k.subject, header: true, sortable: true }, { key: "code", label: k.code, className: "ns-mono" }, { key: "category", label: k.category, sortable: true, render: (r) => fx(r.category ?? "") }, { key: "status", label: k.state, render: (r) => badge(t, r.status) }] },
  };
  const c = cfg[tab];

  function save(form: Partial<Item>) {
    const list = c.rows.slice(), i = list.findIndex((x) => x.id === form.id);
    saveMut.mutateAsync({ kind: tab, item: form as Item, isNew: i < 0, data: data! }).then(
      () => {
        if (DEMO) { if (i >= 0) list[i] = form as Item; else list.push({ id: "n" + Date.now(), status: "active", ...form } as Item); setList(tab, list); }
        setDrawer(null);
        showToast({ tone: "success", title: i >= 0 ? s.saved : s.created, message: (form.name || "") + "" });
      },
      (e) => showToast({ tone: "error", title: s.saveError, message: adminMessage(e, t) }),
    );
  }

  return (
    <>
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <SegmentedTabs label={s.element} value={tab} onChange={(v) => setTab(v as Kind)}
          tabs={[{ value: "grades", label: s.tabs.grades, icon: "layers", count: grades.length }, { value: "courses", label: s.tabs.courses, icon: "students", count: courses.length }, { value: "subjects", label: s.tabs.subjects, icon: "book", count: subjects.length }]} />
        <Button icon="plus" disabled={!data} onClick={() => setDrawer({ _new: true })}>{s.create(c.label)}</Button>
      </div>
      <DataGrid<Item>
        caption={s.caption(s.plurals[tab])} rows={c.rows} paginate={false} density="compact" columns={c.cols} resetKey={tab} emptyTitle={s.empty}
        loading={q.isPending && !data} error={q.isError && !data ? s.loadError : undefined} onRetry={() => q.refetch()}
        rowActions={(r) => [
          <IconAction key="e" icon="edit" label={s.editOf(r.name)} onClick={() => setDrawer(r)} />,
          <IconAction key="a" icon="archive" label={s.archiveOf(r.name)} disabled={r.status === "archived"} onClick={() => setArchive(r)} />,
        ]}
      />
      <StructureDrawer kind={tab} item={drawer} data={data} saving={saveMut.isPending} onClose={() => setDrawer(null)} onSave={save} />
      <ConfirmAction
        open={!!archive} onCancel={() => setArchive(null)} icon="archive" title={archive ? s.archiveTitle(archive.name) : ""} loading={archiveMut.isPending}
        description={s.archiveText} confirmLabel={s.archive}
        onConfirm={() => {
          const r = archive!;
          archiveMut.mutateAsync({ kind: tab, id: r.id }).then(
            () => {
              if (DEMO) setList(tab, c.rows.map((x) => (x.id === r.id ? { ...x, status: "archived" } : x)));
              setArchive(null);
              showToast({ tone: "success", title: s.archived, message: r.name });
            },
            (e) => { setArchive(null); showToast({ tone: "error", title: s.archiveError, message: adminMessage(e, t) }); },
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
  const { t } = useI18n();
  const s = t.adm.str, fx = t.adm.fixed;
  const label = s.labels[kind];
  const str = (k: keyof Item) => v[k] as string | undefined;
  const gradeNames = (data?.grades ?? []).filter((g) => g.status !== "archived").map((g) => g.name);
  let fields: ReactNode[];
  if (kind === "grades") {
    fields = [
      <Input key={1} label={s.gradeName} required value={str("name") || ""} onChange={set("name")} error={tried && !v.name ? s.gradeNameError : null} placeholder={s.gradePh} />,
      <Select key={2} label={s.level} value={str("level") || "Básica secundaria"} onChange={set("level")} options={LEVELS.map((x) => ({ value: x, label: fx(x) }))} />,
    ];
  } else if (kind === "courses") {
    fields = [
      <Select key={1} label={s.cols.grade} required value={str("grade") || gradeNames[0] || ""} onChange={set("grade")} options={gradeNames.map((x) => ({ value: x, label: t.adm.gradeName(x) }))} />,
      <Input key={2} label={s.courseName} required value={str("name") || ""} onChange={set("name")} placeholder="9A" error={tried && !v.name ? s.courseNameError : null} />,
      <Select key={3} label={s.director} value={str("director") || ""} placeholder={s.unassigned} onChange={set("director")} options={(data?.teachers ?? []).map((x) => x.name)} />,
      <Input key={4} label={s.capacity} type="number" value={v.capacity ?? 35} onChange={(e) => setV({ ...v, capacity: Math.max(1, Number(e.target.value) || 0) })} />,
    ];
  } else {
    fields = [
      <Input key={1} label={s.subjectName} required value={str("name") || ""} onChange={set("name")} error={tried && !v.name ? s.subjectNameError : null} />,
      <Input key={2} label={s.code} value={str("code") || ""} onChange={set("code")} placeholder="MAT-01" />,
      <Select key={3} label={s.category} value={str("category") || "Ciencias exactas"} onChange={set("category")} options={CATEGORIES.map((x) => ({ value: x, label: fx(x) }))} />,
    ];
  }
  return (
    <Drawer
      open={!!item} onClose={onClose} eyebrow={s.eyebrow} title={(isNew ? s.create : s.edit)(label)} closeLabel={t.prefs.close}
      footer={[
        <Button key="c" variant="secondary" onClick={onClose}>{s.cancel}</Button>,
        <Button key="s" icon="check" loading={saving} onClick={() => {
          setTried(true); if (!v.name) return;
          const o = { ...v }; delete o._new;
          if (kind === "courses" && !o.grade) o.grade = gradeNames[0];
          onSave(o); setTried(false);
        }}>{isNew ? s.create(label) : s.saveChanges}</Button>,
      ]}
    >
      <div className="ns-form-grid ns-form-grid--1">{fields}</div>
    </Drawer>
  );
}
