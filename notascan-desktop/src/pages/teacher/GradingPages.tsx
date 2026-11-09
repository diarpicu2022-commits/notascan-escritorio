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
import { VisionError, readExamPhoto, readUploadedPhoto, type ExamResult } from "../../services/vision";
import { useI18n } from "../../i18n/I18nProvider";
import type { Messages } from "../../i18n/es";
import { closePhoneUpload, pickPhonePhotos, startPhoneUpload, type PhoneSession } from "../../services/phoneUpload";
import { PhoneUploadDialog } from "../../components/organisms/PhoneUpload";
import { assignmentsState, queryState } from "./states";

/* 02 · Calificar: ¿qué detectó la IA y es correcto? Carga → procesamiento → revisión. */

/** Nota de cada foto de la demostración: el texto se pone al pintar, en el idioma de la app. */
type DemoNote = { k: "read"; who: string; grade: number | null } | { k: "detecting" } | { k: "waiting" };
type FileItem = { name: string; status: "success" | "processing" | "warning"; note: DemoNote };

export function UploadPage() {
  return DEMO ? <DemoUploadPage /> : <RealUploadPage />;
}

/**
 * Cada foto guarda datos (estado, resultado, mensaje del servicio) y no el texto: así la lista cambia de idioma con la
 * app. Las notas que escribe la función read-exam llegan en español y se muestran tal cual (idiomas, paso 3).
 */
type QueueItem = { key: string; file?: File; path?: string; name: string; phoneN?: string; state: "queued" | "reading" | "done" | "review" | "unassigned" | "error"; error?: string; result?: ExamResult };
const QUEUE_DOT: Record<QueueItem["state"], "success" | "processing" | "warning" | "error"> = {
  queued: "warning", reading: "processing", done: "success", review: "warning", unassigned: "warning", error: "error",
};

/** Mensaje de error de la lectura: el código propio se traduce; el del servicio llega escrito y se deja igual. */
function errorText(m: Messages, e: unknown, fallback: string): string {
  if (e instanceof VisionError) return m.tch.upload[e.code];
  return e instanceof Error && e.message ? e.message : fallback;
}

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
  const { t, shownGrade, grade: fmtGrade } = useI18n();
  const u = t.tch.upload;
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
      setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, state: "reading" } : x)));
      try {
        const r = it.path ? await readUploadedPhoto(evaluationId, it.path) : await readExamPhoto(profile.id, evaluationId, it.file!, i);
        const state: QueueItem["state"] = !r.studentId ? "unassigned" : !r.saved || r.status === "needs-review" ? "review" : "done";
        setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, state, result: r } : x)));
      } catch (e) {
        const msg = errorText(t, e, u.readFailed);
        setQueue((q) => q.map((x) => (x.key === it.key ? { ...x, state: "error", error: msg } : x)));
        // Sin servicio configurado no tiene sentido seguir con las demás (el servicio responde en español).
        if (/no está configurado|clave|no tiene saldo/.test(msg)) {
          showToast({ tone: "error", title: u.serviceNotReady, message: msg });
          pending.current.forEach((x) => setQueue((q) => q.map((y) => (y.key === x.key ? { ...y, state: "error", error: msg } : y))));
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
    try { setPhone(await startPhoneUpload(curEval.id)); setPhoneCount(0); } catch (e) { setPhoneErr(errorText(t, e, u.codeFailed)); }
  }
  async function renewPhone() { setPhone(null); if (curEval) { try { setPhone(await startPhoneUpload(curEval.id)); } catch (e) { setPhoneErr(errorText(t, e, u.codeFailed)); } } }
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
    const fresh = paths.map((path, i) => ({ key: Date.now() + "-m" + i, path, name: path, phoneN: path.split("-").pop()!.replace(".jpg", ""), state: "queued" as const }));
    setQueue((q) => q.concat(fresh));
    void run(fresh);
  }

  function add(files: File[]) {
    const fresh = files.map((f, i) => ({ key: Date.now() + "-" + i + "-" + f.name, file: f, name: f.name, state: "queued" as const }));
    setQueue((q) => q.concat(fresh));
    void run(fresh);
  }

  const nameOf = (f: QueueItem) => (f.phoneN ? u.fromPhone(f.phoneN) : f.name);
  function noteOf(f: QueueItem): string {
    if (f.state === "queued") return f.phoneN ? u.notePhone : u.noteWaiting;
    if (f.state === "reading") return u.noteReading;
    if (f.state === "error") return f.error ?? u.readFailed;
    const r = f.result!;
    if (!r.studentId) return u.notSaved(r.note);
    return r.studentName + " · " + (r.detected === null ? u.noGrade : shownGrade(r.detected)) + (r.note ? " · " + r.note : "");
  }
  const reading = queue.findIndex((x) => x.state === "reading");
  const lastDone = [...queue].reverse().find((x) => x.result);
  const finished = queue.filter((x) => x.state !== "queued" && x.state !== "reading").length;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, u.loading, u.error);
  return (
    <PageShell active="grade">
      <Header
        eyebrow={u.eyebrow} title={u.title} highlight={u.highlight}
        description={u.desc}
        actions={<Button size="lg" iconRight="arrow" disabled={!curEval} onClick={() => curEval && go("review", { id: String(curEval.id) })}>{u.toReview}</Button>}
      />
      <ReviewStepper current={3} />
      {state ?? (
        <div className="ns-upload-grid">
          <div className="ns-col" style={{ gap: 24 }}>
            <Block label={u.evaluation}>
              <BlockTitle>{u.step1}</BlockTitle>
              <div className="ns-row">
                <FilterGroup as="select" label={t.tch.f.subject} value={curSubject} onChange={setSubject} options={subjects.map((s) => ({ value: s, label: s }))} />
                <FilterGroup as="select" label={t.tch.f.course} value={curCourse} onChange={setCourse} options={courses.map((c) => ({ value: c, label: c }))} />
                {evals.length ? <FilterGroup as="select" label={t.tch.f.evaluation} value={curEval ? String(curEval.id) : undefined} onChange={setEvalId} options={evals.map((e) => ({ value: String(e.id), label: e.name }))} /> : null}
              </div>
              {evals.length ? null : <EmptyState icon="evaluations" title={u.noOpenTitle} message={u.noOpenText} action={<Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>{t.tch.states.goEvaluations}</Button>} />}
            </Block>
            <Block label={u.photos}>
              <BlockTitle>{u.step2}</BlockTitle>
              {curEval ? <UploadZone hint={u.hint} onFiles={add} /> : null}
              {curEval ? (
                <div className="ns-phone-live">
                  <Button variant="secondary" icon="qr" onClick={() => void openPhone()}>{phone ? u.phoneShow : u.phoneStart}</Button>
                  {phone ? <StatusDot status="processing" label={u.phoneLive(phoneCount)} /> : <span className="ns-caption">{u.phoneHint}</span>}
                  {phone ? <Button variant="ghost" size="sm" onClick={finishPhone}>{u.finish}</Button> : null}
                </div>
              ) : null}
              {queue.length ? (
                <ul className="ns-list" style={{ marginTop: 16 }}>
                  {queue.map((f) => (
                    <li key={f.key} className="ns-list-item">
                      <span className="ns-file-icon" aria-hidden><Icon name="file" size={18} /></span>
                      <div className="ns-list-main"><strong>{nameOf(f)}</strong><span className="ns-caption">{noteOf(f)}</span></div>
                      <StatusDot status={QUEUE_DOT[f.state]} label={u.queue[f.state]} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </Block>
          </div>
          {queue.length ? (
            <ProcessingPanel simulate={false} step={reading >= 0 ? 1 : 3} index={reading >= 0 ? reading + 1 : finished} total={queue.length}
              file={reading >= 0 ? nameOf(queue[reading]) : lastDone ? nameOf(lastDone) : undefined}
              studentName={lastDone?.result?.studentName ?? u.noStudent} detected={lastDone?.result?.detected === null || !lastDone?.result ? "—" : shownGrade(lastDone.result.detected)}
              confidence={lastDone?.result?.studentId ? lastDone.result.confidence : null}
              doneTitle={lastDone?.result?.studentId ? u.identified : u.notIdentified} grade={lastDone?.result?.detected === null || !lastDone?.result ? "—" : fmtGrade(lastDone.result.detected)} />
          ) : (
            <Block><EmptyState icon="camera" title={u.noPhotosTitle} message={u.noPhotosText} /></Block>
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
  const { t, shownGrade } = useI18n();
  const u = t.tch.upload;
  const [files, setFiles] = useState<FileItem[]>([
    { name: "parcial2_programacion_05.jpg", status: "success", note: { k: "read", who: "Valentina Guerrero", grade: 4.2 } },
    { name: "parcial2_programacion_06.jpg", status: "success", note: { k: "read", who: "Santiago Muñoz", grade: null } },
    { name: "parcial2_programacion_07.jpg", status: "processing", note: { k: "detecting" } },
    { name: "parcial2_programacion_08.jpg", status: "warning", note: { k: "waiting" } },
  ]);
  const noteOf = (n: DemoNote) => (n.k === "read" ? n.who + " · " + (n.grade === null ? u.noDetection : shownGrade(n.grade)) : n.k === "detecting" ? u.noteDetecting : u.noteWaiting);
  return (
    <PageShell active="grade">
      <Header
        eyebrow={u.eyebrow} title={u.title} highlight={u.highlight}
        description={u.descDemo}
        actions={<Button size="lg" iconRight="arrow" onClick={() => go("review")}>{u.toReview}</Button>}
      />
      <ReviewStepper current={3} />
      <div className="ns-upload-grid">
        <div className="ns-col" style={{ gap: 24 }}>
          <Block label={u.evaluation}>
            <BlockTitle>{u.step1}</BlockTitle>
            <div className="ns-row">
              <FilterGroup as="select" label={t.tch.f.subject} options={[{ value: "p", label: "Matemáticas" }, { value: "f", label: "Física" }, { value: "t", label: "Tecnología" }]} />
              <FilterGroup as="select" label={t.tch.f.course} options={[{ value: "5a", label: "7A" }, { value: "5b", label: "7B" }]} />
              <FilterGroup as="select" label={t.tch.f.evaluation} options={EVALUATIONS.map((e) => ({ value: e.id, label: e.name }))} />
            </div>
          </Block>
          <Block label={u.photos}>
            <BlockTitle>{u.step2}</BlockTitle>
            <UploadZone onFiles={(list) => setFiles(files.concat(list.map((f) => ({ name: f.name, status: "warning" as const, note: { k: "waiting" as const } }))))} />
            <ul className="ns-list" style={{ marginTop: 16 }}>
              {files.map((f, i) => (
                <li key={f.name + i} className="ns-list-item">
                  <span className="ns-file-icon" aria-hidden><Icon name="file" size={18} /></span>
                  <div className="ns-list-main"><strong>{f.name}</strong><span className="ns-caption">{noteOf(f.note)}</span></div>
                  <StatusDot status={f.status} label={f.status === "success" ? u.queue.done : f.status === "processing" ? u.queue.reading : u.queue.queued} />
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
  const { t } = useI18n();
  const v = t.tch.rev;
  useEffect(() => () => timers.current.forEach((x) => window.clearTimeout(x)), []);
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
  const showToast = (d: ToastData) => {
    setToast(d);
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
        showToast({ tone: "success", title: v.saved(verified), message: v.updated(ev ? ev.name + " · " + ev.subject : null) });
      },
      (e) => {
        setDlg(false);
        showToast({ tone: "error", title: v.saveError, message: saveMessage(e, t) + v.keepOnScreen });
      },
    );
  }

  const waiting = loading || (query.isPending && !query.data);
  let body: ReactNode;
  if (waiting) body = <div className="ns-grid">{[0, 1, 2].map((i) => <StudentGradeCardSkeleton key={i} />)}</div>;
  else if (query.isError && !query.data) body = <ErrorState title={v.loadError} onRetry={() => query.refetch()} />;
  else if (!ev) body = <EmptyState title={v.noneTitle} message={v.noneText} action={<Button variant="secondary" icon="upload" onClick={() => go("grade")}>{t.tch.dash.gradeOne}</Button>} />;
  else if (!rows.length) body = <EmptyState title={v.emptyTitle} message={v.emptyText} action={<Button variant="secondary" icon="upload" onClick={() => go("grade")}>{v.uploadPhotos}</Button>} />;

  return (
    <PageShell
      active="grade"
      overlay={<>
        <ConfirmDialog open={dlg} count={verified} loading={saveMut.isPending} note={pending + review > 0 ? v.unverified(pending + review) : null} onCancel={() => setDlg(false)} onConfirm={save} />
        {toast ? <div className="ns-toast-region"><Toast {...toast} onClose={() => setToast(null)} /></div> : null}
      </>}
    >
      <Header
        eyebrow={ev ? ev.name + " · " + ev.subject + " · " + ev.course : v.eyebrow} title={v.title} highlight={v.highlight} sticker={v.sticker}
        description={v.desc}
        actions={<>
          <Button variant="secondary" icon="upload" onClick={() => go("grade")}>{v.uploadMore}</Button>
          <Button size="lg" icon="lock" disabled={verified === 0} onClick={() => setDlg(true)}>{v.confirmSave}</Button>
        </>}
      />
      <Marquee />
      <ReviewStepper current={5} />
      {body && !loading ? body : (
        <>
          <ReviewSummary total={rows.length} verified={verified} pending={pending} review={review} evaluation={ev?.name} />
          <div>
            <FiltersBar
              search={search} onSearch={setSearch} count={t.tch.studentsCount(visible.length, rows.length)}
              groups={[{
                label: t.tch.f.state, value: filter, onChange: setFilter, options: [
                  { value: "all", label: t.tch.f.all, count: rows.length },
                  { value: "needs-review", label: v.filter.needsReview, count: review },
                  { value: "pending", label: v.filter.pending, count: pending },
                  { value: "verified", label: v.filter.verified, count: verified }],
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
              : <EmptyState title={v.noMatchTitle} message={v.noMatchText} action={<Button variant="secondary" onClick={() => { setFilter("all"); setSearch(""); }}>{t.tch.states.seeAll}</Button>} />}
        </>
      )}
    </PageShell>
  );
}
