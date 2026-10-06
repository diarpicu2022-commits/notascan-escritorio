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
import { useAuth } from "../../app/AuthContext";
import { DEMO } from "../../lib/supabase";
import { useToast } from "../../components/organisms/Toast";
import { useOverview } from "../../services/teacherOverview";
import { readExamPhoto, readUploadedPhoto, type ExamResult } from "../../services/vision";
import { closePhoneUpload, pickPhonePhotos, startPhoneUpload, type PhoneSession } from "../../services/phoneUpload";
import { PhoneUploadDialog } from "../../components/organisms/PhoneUpload";
import { assignmentsState, queryState } from "./states";

/* 02 · Calificar: ¿qué detectó la IA y es correcto? Carga → procesamiento → revisión. */

type FileItem = { name: string; status: "success" | "processing" | "warning"; note: string };

export function UploadPage() {
  return DEMO ? <DemoUploadPage /> : <RealUploadPage />;
}

type QueueItem = { key: string; file?: File; path?: string; name: string; state: "queued" | "reading" | "done" | "review" | "unassigned" | "error"; note: string; result?: ExamResult };
const QUEUE_DOT: Record<QueueItem["state"], ["success" | "processing" | "warning" | "error", string]> = {
  queued: ["warning", "En cola"], reading: ["processing", "Procesando"], done: ["success", "Listo"], review: ["warning", "Revisar"], unassigned: ["warning", "Sin estudiante"], error: ["error", "No se leyó"],
};

/** Subir fotografías con la base y el servicio de visión (paso 6d): una foto a la vez, cada una con su resultado. */
function RealUploadPage() {
  const { navigate: go } = useShell();
  const { profile } = useAuth();
  const { aq, q } = useOverview();
  const [subject, setSubject] = useState<string | undefined>();
  const [course, setCourse] = useState<string | undefined>();
  const [evalId, setEvalId] = useState<string | undefined>();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const running = useRef(false);
  const pending = useRef<QueueItem[]>([]);
  const [showToast, toastNode] = useToast();
  const assignments = aq.data ?? [];
  const subjects = [...new Set(assignments.map((a) => a.subject))];
  const curSubject = subject ?? subjects[0];
  const courses = assignments.filter((a) => a.subject === curSubject).map((a) => a.courseId);
  const curCourse = course && courses.includes(course) ? course : courses[0];
  const assignment = assignments.find((a) => a.subject === curSubject && a.courseId === curCourse);
  const evals = (q.data?.evals ?? []).filter((e) => e.assignmentKey === assignment?.key && e.status !== "cerrada");
  const curEval = evals.find((e) => String(e.id) === evalId) ?? evals[0];

  // La cola avanza de a una foto: así se respeta el límite del servicio y el panel muestra en qué va.
  async function run(items: QueueItem[]) {
    pending.current.push(...items);
    if (running.current || !curEval || !profile) return;
    running.current = true;
    const evaluationId = curEval.id;
    for (let i = 0; pending.current.length; i++) {
      const it = pending.current.shift()!;
      setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, state: "reading", note: "Leyendo código, nombre y nota…" } : x)));
      try {
        const r = it.path ? await readUploadedPhoto(evaluationId, it.path) : await readExamPhoto(profile.id, evaluationId, it.file!, i);
        const g = r.detected === null ? "sin nota" : r.detected.toFixed(1);
        const state: QueueItem["state"] = !r.studentId ? "unassigned" : !r.saved || r.status === "needs-review" ? "review" : "done";
        const note = !r.studentId ? r.note + " No se guardó: anótala a mano en la planilla."
          : r.studentName + " · " + g + (r.note ? " · " + r.note : "");
        setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, state, note, result: r } : x)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No pudimos leer la foto.";
        setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, state: "error", note: msg } : x)));
        // Sin servicio configurado no tiene sentido seguir con las demás.
        if (/no está configurado|clave/.test(msg)) {
          showToast({ tone: "error", title: "El servicio de lectura no está listo", message: msg });
          pending.current.forEach((x) => setQueue((q) => q.map((y) => (y.key === x.key ? { ...y, state: "error", note: msg } : y))));
          pending.current = [];
          break;
        }
      }
    }
    running.current = false;
  }

  // Subir desde el celular: permiso de 20 minutos; cada 2,5 s se recogen las fotos nuevas y entran a la misma cola.
  const [phone, setPhone] = useState<PhoneSession | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneCount, setPhoneCount] = useState(0);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  async function openPhone() {
    if (!curEval) return;
    setPhoneOpen(true); setPhoneErr(null);
    if (phone && new Date(phone.expiresAt).getTime() > Date.now()) return;
    try { setPhone(await startPhoneUpload(curEval.id)); setPhoneCount(0); } catch (e) { setPhoneErr(e instanceof Error ? e.message : "No pudimos generar el código."); }
  }
  async function renewPhone() { setPhone(null); if (curEval) { try { setPhone(await startPhoneUpload(curEval.id)); } catch (e) { setPhoneErr(e instanceof Error ? e.message : "No pudimos generar el código."); } } }
  function finishPhone() { if (phone) void closePhoneUpload(phone.id); setPhone(null); setPhoneOpen(false); }
  useEffect(() => {
    if (!phone) return;
    let stop = false;
    const tick = async () => {
      const paths = await pickPhonePhotos(phone.id);
      if (stop || !paths.length) return;
      setPhoneCount((n) => n + paths.length);
      addPaths(paths);
    };
    const t = window.setInterval(() => { if (new Date(phone.expiresAt).getTime() + 30000 < Date.now()) { window.clearInterval(t); return; } void tick(); }, 2500);
    return () => { stop = true; window.clearInterval(t); };
  }, [phone?.id]);
  // Cambiar de evaluación cierra el permiso: las fotos no pueden caer en otra.
  useEffect(() => { if (phone) { void closePhoneUpload(phone.id); setPhone(null); setPhoneOpen(false); } }, [curEval?.id]);

  function addPaths(paths: string[]) {
    const fresh = paths.map((path, i) => ({ key: Date.now() + "-m" + i, path, name: "Foto del celular " + path.split("-").pop()!.replace(".jpg", ""), state: "queued" as const, note: "Llegó del celular · en espera" }));
    setQueue((q) => q.concat(fresh));
    void run(fresh);
  }

  function add(files: File[]) {
    const fresh = files.map((f, i) => ({ key: Date.now() + "-" + i + "-" + f.name, file: f, name: f.name, state: "queued" as const, note: "En espera" }));
    setQueue((q) => q.concat(fresh));
    void run(fresh);
  }

  const reading = queue.findIndex((x) => x.state === "reading");
  const lastDone = [...queue].reverse().find((x) => x.result);
  const finished = queue.filter((x) => x.state !== "queued" && x.state !== "reading").length;
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando tus evaluaciones", "No pudimos cargar tus evaluaciones.");
  return (
    <PageShell active="grade">
      <Header
        eyebrow="Paso 1 a 4 · la IA trabaja, tú esperas" title="Calificar una evaluación" highlight="evaluación"
        description="Elige la evaluación y sube las fotografías. NotaScan identifica a cada estudiante por el código y el nombre que escribió en la hoja."
        actions={<Button size="lg" iconRight="arrow" disabled={!curEval} onClick={() => curEval && go("review", { id: String(curEval.id) })}>Ir a revisión</Button>}
      />
      <ReviewStepper current={3} />
      {state ?? (
        <div className="ns-upload-grid">
          <div className="ns-col" style={{ gap: 24 }}>
            <Block label="Evaluación">
              <BlockTitle>1 · Evaluación</BlockTitle>
              <div className="ns-row">
                <FilterGroup as="select" label="Asignatura" value={curSubject} onChange={setSubject} options={subjects.map((s) => ({ value: s, label: s }))} />
                <FilterGroup as="select" label="Curso" value={curCourse} onChange={setCourse} options={courses.map((c) => ({ value: c, label: c }))} />
                {evals.length ? <FilterGroup as="select" label="Evaluación" value={curEval ? String(curEval.id) : undefined} onChange={setEvalId} options={evals.map((e) => ({ value: String(e.id), label: e.name }))} /> : null}
              </div>
              {evals.length ? null : <EmptyState icon="evaluations" title="No hay evaluaciones abiertas en este curso." message="Crea la evaluación en Evaluaciones y vuelve para subir las fotos." action={<Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>Ir a evaluaciones</Button>} />}
            </Block>
            <Block label="Fotografías">
              <BlockTitle>2 · Fotografías</BlockTitle>
              {curEval ? <UploadZone hint="Arrastra las fotos del examen o haz clic. Una hoja por foto, con el código y el nombre del estudiante a la vista." onFiles={add} /> : null}
              {curEval ? (
                <div className="ns-phone-live">
                  <Button variant="secondary" icon="qr" onClick={() => void openPhone()}>{phone ? "Ver el código del celular" : "Subir desde el celular"}</Button>
                  {phone ? <StatusDot status="processing" label={"Celular conectado · " + (phoneCount === 1 ? "1 foto" : phoneCount + " fotos")} /> : <span className="ns-caption">Toma las fotos con el celular y llegan aquí solas.</span>}
                  {phone ? <Button variant="ghost" size="sm" onClick={finishPhone}>Terminar</Button> : null}
                </div>
              ) : null}
              {queue.length ? (
                <ul className="ns-list" style={{ marginTop: 16 }}>
                  {queue.map((f) => (
                    <li key={f.key} className="ns-list-item">
                      <span className="ns-file-icon" aria-hidden><Icon name="file" size={18} /></span>
                      <div className="ns-list-main"><strong>{f.name}</strong><span className="ns-caption">{f.note}</span></div>
                      <StatusDot status={QUEUE_DOT[f.state][0]} label={QUEUE_DOT[f.state][1]} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Block>
          </div>
          {queue.length ? (
            <ProcessingPanel simulate={false} step={reading >= 0 ? 1 : 3} index={reading >= 0 ? reading + 1 : finished} total={queue.length}
              file={reading >= 0 ? queue[reading].name : lastDone?.name}
              studentName={lastDone?.result?.studentName ?? "Sin estudiante"} detected={lastDone?.result?.detected === null || !lastDone?.result ? "—" : lastDone.result.detected.toFixed(1)}
              confidence={lastDone?.result?.studentId ? lastDone.result.confidence : null}
              doneTitle={lastDone?.result?.studentId ? "Estudiante identificado" : "Sin estudiante identificado"} grade={lastDone?.result?.detected === null || !lastDone?.result ? "—" : lastDone.result.detected.toFixed(1).replace(".", ",")} />
          ) : (
            <Block><EmptyState icon="camera" title="Aún no has subido fotografías." message="Cada foto se lee en unos segundos. La IA solo detecta: tú revisas y confirmas cada nota." /></Block>
          )}
        </div>
      )}
      {curEval ? <PhoneUploadDialog open={phoneOpen} session={phone} received={phoneCount} evaluationName={curEval.name} error={phoneErr}
        onClose={() => setPhoneOpen(false)} onRenew={() => void renewPhone()} onFinish={finishPhone} /> : null}
      {toastNode}
    </PageShell>
  );
}

/** El flujo del sistema con sus datos de demostración (sin cambios). */
function DemoUploadPage() {
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
