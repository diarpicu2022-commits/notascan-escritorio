import { useEffect, useRef, useState, type ReactNode } from "react";
import { useShell } from "../../app/ShellContext";
import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { StatusDot } from "../../components/atoms/StatusDot";
import { UploadZone } from "../../components/molecules/DropZones";
import { FilterGroup, FiltersBar } from "../../components/molecules/Filters";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { ConfirmDialog } from "../../components/organisms/Overlays";
import { Marquee, ProcessingPanel, ReviewStepper, ReviewSummary } from "../../components/organisms/ReviewFlow";
import { StudentGradeCard, StudentGradeCardSkeleton } from "../../components/organisms/StudentGradeCard";
import { Toast, type ToastData } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import { EVALUATIONS } from "../../data/academic";
import { ErrorState } from "../../components/organisms/QueryState";
import { saveMessage, useReview, useSaveReview, type ReviewRow } from "../../services/teacher";

/* 02 · Calificar: ¿qué detectó la IA y es correcto? Carga → procesamiento → revisión. */

type FileItem = { name: string; status: "success" | "processing" | "warning"; note: string };

export function UploadPage() {
  const { navigate: go } = useShell();
  const [files, setFiles] = useState<FileItem[]>([
    { name: "parcial2_programacion_05.jpg", status: "success", note: "Valentina Guerrero · 4.2" },
    { name: "parcial2_programacion_06.jpg", status: "success", note: "Santiago Muñoz · sin detección" },
    { name: "parcial2_programacion_07.jpg", status: "processing", note: "Detectando calificación…" },
    { name: "parcial2_programacion_08.jpg", status: "warning", note: "En espera" },
  ]);
  return (
    <PageShell active="grade">
      <Header
        eyebrow="Paso 1 a 4 · la IA trabaja, tú esperas" title="Calificar una evaluación" highlight="evaluación"
        description="Elige la evaluación, sube las fotografías y NotaScan identificará a cada estudiante por su código QR."
        actions={<Button size="lg" iconRight="arrow" onClick={() => go("review")}>Ir a revisión</Button>}
      />
      <ReviewStepper current={3} />
      <div className="ns-upload-grid">
        <div className="ns-col" style={{ gap: 24 }}>
          <Block label="Evaluación">
            <BlockTitle>1 · Evaluación</BlockTitle>
            <div className="ns-row">
              <FilterGroup as="select" label="Asignatura" options={[{ value: "p", label: "Matemáticas" }, { value: "f", label: "Física" }, { value: "t", label: "Tecnología" }]} />
              <FilterGroup as="select" label="Curso" options={[{ value: "5a", label: "7A" }, { value: "5b", label: "7B" }]} />
              <FilterGroup as="select" label="Evaluación" options={EVALUATIONS.map((e) => ({ value: e.id, label: e.name }))} />
            </div>
          </Block>
          <Block label="Fotografías">
            <BlockTitle>2 · Fotografías</BlockTitle>
            <UploadZone onFiles={(list) => setFiles(files.concat(list.map((f) => ({ name: f.name, status: "warning" as const, note: "En espera" }))))} />
            <ul className="ns-list" style={{ marginTop: 16 }}>
              {files.map((f, i) => (
                <li key={f.name + i} className="ns-list-item">
                  <span className="ns-file-icon" aria-hidden><Icon name="file" size={18} /></span>
                  <div className="ns-list-main"><strong>{f.name}</strong><span className="ns-caption">{f.note}</span></div>
                  <StatusDot status={f.status} label={f.status === "success" ? "Listo" : f.status === "processing" ? "Procesando" : "En cola"} />
                </li>
              ))}
            </ul>
          </Block>
        </div>
        <ProcessingPanel index={7} total={24} />
      </div>
    </PageShell>
  );
}

type Row = ReviewRow;

/** Plantilla de revisión: la IA detecta, el docente verifica cada tarjeta y solo entonces guarda. */
export function GradeReviewDashboard({ loading = false, evaluationId }: { loading?: boolean; evaluationId?: string }) {
  const { navigate: go } = useShell();
  const query = useReview(evaluationId);
  const saveMut = useSaveReview();
  const ev = query.data?.evaluation ?? null;
  const [rows, setRows] = useState<Row[]>(() => (query.data?.rows ?? []).map((r) => ({ ...r })));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dlg, setDlg] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const timers = useRef<number[]>([]);
  const dirty = useRef(false);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  // Al llegar datos nuevos de la base se recargan las tarjetas, salvo que haya cambios sin guardar.
  useEffect(() => { if (query.data && !dirty.current) setRows(query.data.rows.map((r) => ({ ...r }))); }, [query.data]);

  const update = (key: string, patch: Partial<Row>) => { dirty.current = true; setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))); };
  const counts = rows.reduce<Record<string, number>>((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  const verified = counts.verified || 0, review = counts["needs-review"] || 0, pending = counts.pending || 0;
  const visible = rows.filter((r) => {
    const okF = filter === "all" || r.status === filter;
    const s = search.trim().toLowerCase();
    const okS = !s || r.student.name.toLowerCase().indexOf(s) >= 0 || r.student.id.indexOf(s) >= 0;
    return okF && okS;
  });
  const showToast = (t: ToastData) => {
    setToast(t);
    timers.current.push(window.setTimeout(() => setToast(null), 4200));
  };

  function save() {
    // Solo viaja lo que cambió frente a la base (nota o estado).
    const base = new Map((query.data?.rows ?? []).map((r) => [r.key, r]));
    const same = (a: number, b: number) => (isNaN(a) && isNaN(b)) || a === b;
    const changed = rows.filter((r) => { const b = base.get(r.key); return !b || b.status !== r.status || !same(b.grade, r.grade); });
    saveMut.mutateAsync(changed).then(
      () => {
        dirty.current = false;
        setDlg(false);
        showToast({ tone: "success", title: verified + " calificaciones guardadas", message: (ev ? ev.name + " · " + ev.subject : "La evaluación") + " quedó actualizado." });
      },
      (e) => {
        setDlg(false);
        showToast({ tone: "error", title: "No pudimos guardar las calificaciones", message: saveMessage(e) + " Tus verificaciones siguen en pantalla." });
      },
    );
  }

  const waiting = loading || (query.isPending && !query.data);
  let body: ReactNode;
  if (waiting) body = <div className="ns-grid">{[0, 1, 2].map((i) => <StudentGradeCardSkeleton key={i} />)}</div>;
  else if (query.isError && !query.data) body = <ErrorState title="No pudimos cargar la revisión." onRetry={() => query.refetch()} />;
  else if (!ev) body = <EmptyState title="No tienes evaluaciones en revisión." message="Cuando la IA termine de leer las fotografías de una evaluación, sus notas aparecerán aquí para que las verifiques." action={<Button variant="secondary" icon="upload" onClick={() => go("grade")}>Calificar una evaluación</Button>} />;
  else if (!rows.length) body = <EmptyState title="Esta evaluación aún no tiene notas detectadas." message="Sube las fotografías para que la IA las lea." action={<Button variant="secondary" icon="upload" onClick={() => go("grade")}>Subir fotografías</Button>} />;

  return (
    <PageShell
      active="grade"
      overlay={<>
        <ConfirmDialog open={dlg} count={verified} loading={saveMut.isPending} note={pending + review > 0 ? pending + review + " sin verificar quedarán pendientes" : null} onCancel={() => setDlg(false)} onConfirm={save} />
        {toast ? <div className="ns-toast-region"><Toast {...toast} onClose={() => setToast(null)} /></div> : null}
      </>}
    >
      <Header
        eyebrow={ev ? ev.name + " · " + ev.subject + " · " + ev.course : "Evaluación en revisión"} title="Revisión de calificaciones" highlight="calificaciones" sticker="IA + docente"
        description="La IA terminó el reconocimiento. Verifica las calificaciones antes de guardarlas."
        actions={<>
          <Button variant="secondary" icon="upload" onClick={() => go("grade")}>Subir más fotos</Button>
          <Button size="lg" icon="lock" disabled={verified === 0} onClick={() => setDlg(true)}>Confirmar y guardar</Button>
        </>}
      />
      <Marquee />
      <ReviewStepper current={5} />
      {body && !loading ? body : (
        <>
          <ReviewSummary total={rows.length} verified={verified} pending={pending} review={review} evaluation={ev?.name} />
          <div>
            <FiltersBar
              search={search} onSearch={setSearch} count={visible.length + " de " + rows.length + " estudiantes"}
              groups={[{
                label: "Estado", value: filter, onChange: setFilter, options: [
                  { value: "all", label: "Todas", count: rows.length },
                  { value: "needs-review", label: "Requiere revisión", count: review },
                  { value: "pending", label: "Pendientes", count: pending },
                  { value: "verified", label: "Verificadas", count: verified }],
              }]}
            />
          </div>
          {loading
            ? body
            : visible.length
              ? (
                <div className="ns-grid">
                  {visible.map((r) => (
                    <StudentGradeCard key={r.key} index={r.index} student={r.student} detected={r.detected} confidence={r.confidence}
                      status={r.status} onStatusChange={(s) => update(r.key, { status: s })} onGradeChange={(g) => update(r.key, { grade: g })} />
                  ))}
                </div>
              )
              : <EmptyState title="No hay calificaciones con este filtro." message="Prueba con otro estado o limpia la búsqueda." action={<Button variant="secondary" onClick={() => { setFilter("all"); setSearch(""); }}>Ver todas</Button>} />}
        </>
      )}
    </PageShell>
  );
}
