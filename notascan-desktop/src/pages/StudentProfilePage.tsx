import { Fragment, useState, type ReactNode } from "react";
import { useShell } from "../app/ShellContext";
import { formatGrade } from "../lib/grade";
import { Avatar } from "../components/atoms/Avatar";
import { Button } from "../components/atoms/Button";
import { ProgressBar, SegmentedTabs } from "../components/atoms/Controls";
import { Icon } from "../components/atoms/Icon";
import { EnrollBadge } from "../components/molecules/EnrollBadge";
import { LineChart } from "../components/organisms/Charts";
import { DataTable } from "../components/organisms/DataGrid";
import { EmptyState } from "../components/organisms/EmptyState";
import { Block } from "../components/organisms/Layout";
import { AttendanceCalendar, ObserverTimeline } from "../components/organisms/Observer";
import { ReportCardDocument } from "../components/organisms/ReportCardDocument";
import { PageShell } from "../components/templates/PageShell";
import { OBS, PERF, subjectGrades } from "../data/academic";
import { findStudent, type StudentRecord } from "../data/students";
import { DEMO } from "../lib/supabase";
import { ErrorState, LoadingBlocks } from "../components/organisms/QueryState";
import { ReportCardView } from "../components/organisms/ReportCardDocument";
import { cardOf, useReportCards } from "../services/reportCards";
import { useStudentProfile, type ProfileData } from "../services/studentProfile";
import { exportStudentData, privacyMessage, useAuthorizations, useRegisterAuthorization, useRevokeAuthorization } from "../services/privacy";
import { Checkbox, Input, Select, Textarea } from "../components/atoms/Field";
import { Modal } from "../components/organisms/Overlays";
import { useToast } from "../components/organisms/Toast";

/* Enmienda 2026-10-01 (anexo): notascan-ui pintaba este texto con un color propio fuera de
   tokens.json. Diego eligió pasarlo a un token; --ivory-deep es el más cercano al original. */
const PROFILE_MUTED_ON_NAVY = "var(--ivory-deep)";

/** Perfil completo del estudiante; las pestañas y los datos sensibles dependen del rol. */
export function StudentProfilePage(props: { studentId?: string; tab?: string }) {
  return DEMO ? <DemoProfile {...props} /> : <RealProfile {...props} />;
}

/** El perfil del sistema con sus datos de demostración (sin cambios). */
function DemoProfile({ studentId, tab: initialTab }: { studentId?: string; tab?: string }) {
  const { role, navigate } = useShell();
  const s = findStudent(studentId);
  const canInfo = role === "admin" || role === "principal";
  const TABS: Array<[string, string]> = [["summary", "Resumen"], ["grades", "Calificaciones"], ["attendance", "Asistencia"], ["observer", "Observador"], ["reportcards", "Boletines"], ...(canInfo ? [["info", "Información"] as [string, string]] : [])];
  const map: Record<string, string> = { profile: "summary", history: "grades" };
  const [tab, setTab] = useState((initialTab && map[initialTab]) || initialTab || "summary");
  const t = TABS.some((x) => x[0] === tab) ? tab : "summary";
  const rows = subjectGrades(s);
  const clear = s.library && s.fees && s.documents;

  let body: ReactNode;
  if (t === "summary") {
    body = (
      <div className="ns-profile-grid">
        <Block tone="navy">
          <span className="ns-overline" style={{ color: "var(--gold)" }}>Promedio · Periodo 3</span>
          <strong className="ns-big-ivory">{formatGrade(s.avg)}</strong>
          <span style={{ color: PROFILE_MUTED_ON_NAVY, fontWeight: 600 }}>{PERF(s.avg) + " · " + s.subjectsPassed + " de 6 materias aprobadas"}</span>
        </Block>
        <Block tone="sage"><span className="ns-overline">Asistencia</span><strong className="ns-big">{s.attendance + "%"}</strong><ProgressBar value={s.attendance} total={100} tone="sage" label="Asistencia" /></Block>
        <Block tone={clear ? "paper" : "burgundy"}>
          <span className="ns-overline">Paz y salvo</span>
          <strong className="ns-big">{clear ? "Al día" : "Pendiente"}</strong>
          <span className="ns-caption">{"Biblioteca " + (s.library ? "✓" : "×") + " · Pensiones " + (s.fees ? "✓" : "×") + " · Documentos " + (s.documents ? "✓" : "×")}</span>
        </Block>
        <Block className="ns-span-3">
          <LineChart title="Evolución del promedio" subtitle="Periodos 1 a 3" labels={["P1", "P2", "P3"]} min={1} max={5} ticks={[1, 3, 5]} threshold={3} thresholdLabel="Mínimo 3.0" height={200}
            series={[{ name: "Promedio", points: [Math.max(1, s.avg - 0.3), Math.max(1, s.avg - 0.1), s.avg] }]} format={(v) => v.toFixed(1)} />
        </Block>
      </div>
    );
  } else if (t === "grades") {
    body = (
      <DataTable
        caption="Calificaciones por materia" rows={rows.map((r, i) => ({ id: i, ...r }))}
        columns={[
          { key: "subject", label: "Materia" }, { key: "teacher", label: "Docente" },
          { key: "grade", label: "Nota", numeric: true, render: (r) => <span className="ns-table-grade">{formatGrade(r.grade)}</span> },
          { key: "perf", label: "Desempeño", render: (r) => <span className={"ns-perf ns-perf--" + PERF(r.grade).toLowerCase()}>{PERF(r.grade)}</span> },
          { key: "absences", label: "Faltas", numeric: true },
        ]}
      />
    );
  } else if (t === "attendance") {
    body = <Block><AttendanceCalendar attendance={s.attendance} /></Block>;
  } else if (t === "observer") {
    body = <Block><ObserverTimeline items={OBS.filter((o) => o.student.indexOf(s.first) === 0).concat(OBS.slice(0, 2))} /></Block>;
  } else if (t === "reportcards") {
    body = clear
      ? <Block><div className="ns-paper-scroll"><ReportCardDocument student={s} compact /></div></Block>
      : <EmptyState tone="error" icon="lock" title="Boletines bloqueados" message="El estudiante tiene obligaciones pendientes en Paz y Salvos." />;
  } else {
    body = (
      <Block>
        <dl className="ns-dl ns-dl--2">
          {[["Documento", s.document], ["Fecha de matrícula", s.enrolled], ["Acudiente", s.guardian + " (" + s.guardianRel + ")"], ["Teléfono del acudiente", s.guardianPhone]].map((x) => (
            <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>
          ))}
        </dl>
        {canInfo ? <p className="ns-sensitive"><Icon name="lock" size={16} />Información médica: sin alergias registradas. Visible solo para Secretaría y Rectoría.</p> : null}
      </Block>
    );
  }

  return (
    <PageShell active="students" counts={null}>
      <div className="ns-profile-head">
        <Button variant="ghost" size="sm" icon="chevleft" onClick={() => navigate("students")}>Estudiantes</Button>
        <div className="ns-profile-id">
          <Avatar name={s.name} size="lg" />
          <div>
            <h1 className="ns-header-title" style={{ fontSize: 40 }}>{s.name}</h1>
            <div className="ns-row" style={{ gap: 8 }}><span className="ns-course-tag">{s.course}</span><span className="ns-caption">{"ID " + s.id}</span><EnrollBadge status={s.status} /></div>
          </div>
        </div>
      </div>
      <SegmentedTabs label="Secciones del perfil" value={t} onChange={setTab} tabs={TABS.map((x) => ({ value: x[0], label: x[1] }))} />
      {body}
    </PageShell>
  );
}

const TAB_ALIAS: Record<string, string> = { profile: "summary", history: "grades" };

/** Encabezado del perfil (nombre, curso, ID y estado de matrícula). */
function ProfileHead({ s, onBack }: { s: StudentRecord; onBack: () => void }) {
  return (
    <div className="ns-profile-head">
      <Button variant="ghost" size="sm" icon="chevleft" onClick={onBack}>Estudiantes</Button>
      <div className="ns-profile-id">
        <Avatar name={s.name} size="lg" />
        <div>
          <h1 className="ns-header-title" style={{ fontSize: 40 }}>{s.name}</h1>
          <div className="ns-row" style={{ gap: 8 }}><span className="ns-course-tag">{s.course}</span><span className="ns-caption">{"ID " + s.id}</span><EnrollBadge status={s.status} /></div>
        </div>
      </div>
    </div>
  );
}

/** Perfil con datos de la base (paso 6b.4c): lo que el RLS de quien consulta le deja ver, con carga, error y «no encontrado». */
function RealProfile({ studentId, tab: initialTab }: { studentId?: string; tab?: string }) {
  const { role, navigate } = useShell();
  const q = useStudentProfile(studentId);
  const [tab, setTab] = useState((initialTab && TAB_ALIAS[initialTab]) || initialTab || "summary");
  const back = () => navigate("students");
  let content: ReactNode;
  if (q.isPending && !q.data) content = <LoadingBlocks rows={4} height={96} label="Cargando el perfil del estudiante" />;
  else if (q.isError && !q.data) content = <ErrorState title="No pudimos cargar el perfil." onRetry={() => q.refetch()} />;
  else if (!q.data) content = <EmptyState icon="students" title="No encontramos a este estudiante." message="Puede que no esté en tus cursos o que el enlace ya no sea válido." action={<Button variant="secondary" icon="chevleft" onClick={back}>Volver a Estudiantes</Button>} />;
  else content = <RealProfileBody d={q.data} role={role} tab={tab} setTab={setTab} onBack={back} />;
  return <PageShell active="students" counts={null}>{content}</PageShell>;
}

function RealProfileBody({ d, role, tab, setTab, onBack }: { d: ProfileData; role: string; tab: string; setTab: (t: string) => void; onBack: () => void }) {
  const s = d.student;
  const canInfo = role === "admin" || role === "principal";
  const TABS: Array<[string, string]> = [["summary", "Resumen"], ["grades", "Calificaciones"], ["attendance", "Asistencia"], ["observer", "Observador"], ["reportcards", "Boletines"], ...(canInfo ? [["info", "Información"] as [string, string]] : [])];
  const t = TABS.some((x) => x[0] === tab) ? tab : "summary";
  const clear = s.library && s.fees && s.documents;
  const periodName = d.period?.name ?? "Periodo";
  const mark = (ok: boolean) => (ok ? "✓" : "×");

  let body: ReactNode;
  if (t === "summary") {
    body = (
      <div className="ns-profile-grid">
        <Block tone="navy">
          <span className="ns-overline" style={{ color: "var(--gold)" }}>{"Promedio · " + periodName}</span>
          <strong className="ns-big-ivory">{formatGrade(d.avg)}</strong>
          <span style={{ color: PROFILE_MUTED_ON_NAVY, fontWeight: 600 }}>{d.graded ? PERF(d.avg) + " · " + d.passed + " de " + d.graded + (d.graded === 1 ? " materia aprobada" : " materias aprobadas") : "Sin notas verificadas en el periodo"}</span>
        </Block>
        <Block tone="sage"><span className="ns-overline">Asistencia</span><strong className="ns-big">{isNaN(s.attendance) ? "—" : s.attendance + "%"}</strong><ProgressBar value={isNaN(s.attendance) ? 0 : s.attendance} total={100} tone="sage" label="Asistencia" /></Block>
        <Block tone={clear ? "paper" : "burgundy"}>
          <span className="ns-overline">Paz y salvo</span>
          <strong className="ns-big">{clear ? "Al día" : "Pendiente"}</strong>
          <span className="ns-caption">{"Biblioteca " + mark(s.library) + " · Pensiones " + mark(s.fees) + " · Documentos " + mark(s.documents)}</span>
        </Block>
        <Block className="ns-span-3">
          {d.evol.length ? (
            <LineChart title="Evolución del promedio" subtitle={"Periodos de " + (d.period?.year ?? "") + " con notas verificadas"} labels={d.evol.map((x) => x.label)} min={1} max={5} ticks={[1, 3, 5]} threshold={3} thresholdLabel="Mínimo 3.0" height={200}
              series={[{ name: "Promedio", points: d.evol.map((x) => x.value) }]} format={(v) => v.toFixed(1)} />
          ) : <EmptyState icon="reports" title="Aún no hay notas verificadas." message="La evolución aparece cuando el estudiante tenga notas verificadas en algún periodo." />}
        </Block>
      </div>
    );
  } else if (t === "grades") {
    body = (
      <>
        {role === "teacher" ? <p className="ns-caption" style={{ margin: 0 }}>Ves las notas de las materias que dictas; el resto las consultan Secretaría y Rectoría.</p> : null}
        {d.subjects.length ? (
          <DataTable
            caption={"Calificaciones por materia · " + periodName} rows={d.subjects.map((r, i) => ({ id: i, ...r }))}
            columns={[
              { key: "subject", label: "Materia" }, { key: "teacher", label: "Docente" },
              { key: "grade", label: "Nota", numeric: true, render: (r) => <span className="ns-table-grade">{formatGrade(r.grade)}</span> },
              { key: "perf", label: "Desempeño", render: (r) => (isNaN(r.grade) ? <span className="ns-caption">Sin notas</span> : <span className={"ns-perf ns-perf--" + PERF(r.grade).toLowerCase()}>{PERF(r.grade)}</span>) },
            ]}
          />
        ) : <EmptyState icon="reports" title="El curso no tiene materias en el periodo." message="Secretaría arma la malla curricular de cada curso." />}
      </>
    );
  } else if (t === "attendance") {
    body = <Block>{d.month ? <AttendanceCalendar attendance={s.attendance} month={d.month} /> : <EmptyState icon="calendar" title="Aún no hay asistencia registrada." message="Aparecerá cuando los docentes tomen asistencia en el curso." />}</Block>;
  } else if (t === "observer") {
    body = <Block>{d.observations.length ? <ObserverTimeline items={d.observations} /> : <EmptyState icon="eye" title="Aún no hay anotaciones." message="Las observaciones de los docentes aparecerán aquí en orden cronológico." />}</Block>;
  } else if (t === "reportcards") {
    body = !clear ? <EmptyState tone="error" icon="lock" title="Boletines bloqueados" message="El estudiante tiene obligaciones pendientes en Paz y Salvos." />
      : role === "teacher" ? <EmptyState icon="file" title="El boletín completo lo consultan Secretaría y Rectoría." message="Incluye las notas de todas las materias; tú ves las de tus materias en Calificaciones." />
        : d.period ? <ProfileReportCard studentId={s.id} course={s.course} period={d.period.name} /> : <EmptyState icon="file" title="Aún no hay periodos." message="Secretaría configura los periodos del año." />;
  } else {
    const m = d.medical;
    const parts = m ? [m.allergies ? "alergias: " + m.allergies : "sin alergias registradas", m.conditions ? "condiciones: " + m.conditions : "", m.notes, m.emergency ? "contacto de emergencia: " + m.emergency : ""].filter(Boolean) : ["sin información registrada"];
    body = (
      <Block>
        <dl className="ns-dl ns-dl--2">
          {[["Documento", s.document], ["Fecha de matrícula", s.enrolled], ["Acudiente", s.guardian ? s.guardian + (s.guardianRel ? " (" + s.guardianRel + ")" : "") : "Sin registrar"], ["Teléfono del acudiente", s.guardianPhone || "Sin registrar"]].map((x) => (
            <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>
          ))}
        </dl>
        <p className="ns-sensitive"><Icon name="lock" size={16} />{"Información médica: " + parts.join(" · ") + ". Visible solo para Secretaría y Rectoría."}</p>
        <AuthorizationPanel studentId={s.id} guardian={s.guardian} relationship={s.guardianRel} canEdit={role === "admin"} />
      </Block>
    );
  }
  return (
    <>
      <ProfileHead s={s} onBack={onBack} />
      <SegmentedTabs label="Secciones del perfil" value={t} onChange={setTab} tabs={TABS.map((x) => ({ value: x[0], label: x[1] }))} />
      {body}
    </>
  );
}

/** Boletín del periodo con las mismas reglas de Secretaría (solo lo confirmado por una persona). */
function ProfileReportCard({ studentId, course, period }: { studentId: string; course: string; period: string }) {
  const q = useReportCards({ course, period });
  if (q.isPending && !q.data) return <LoadingBlocks rows={3} height={120} label="Cargando el boletín" />;
  if (q.isError && !q.data) return <ErrorState title="No pudimos cargar el boletín." onRetry={() => q.refetch()} />;
  const row = q.data?.rows.find((r) => r.id === studentId);
  if (!row) return <EmptyState icon="file" title="Aún no hay boletín para este periodo." message="Aparece cuando el estudiante tenga notas verificadas." />;
  return <Block><div className="ns-paper-scroll"><ReportCardView data={cardOf(row, period)} compact /></div></Block>;
}

const isoToday = () => { const d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
const dmy = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);

/** Autorización del acudiente y derechos del titular (paso 6g): registrar, revocar con motivo y exportar los datos. */
function AuthorizationPanel({ studentId, guardian, relationship, canEdit }: { studentId: string; guardian: string; relationship: string; canEdit: boolean }) {
  const q = useAuthorizations(studentId);
  const register = useRegisterAuthorization();
  const revoke = useRevokeAuthorization();
  const [showToast, toastNode] = useToast();
  const [form, setForm] = useState<null | { name: string; rel: string; health: boolean; on: string }>(null);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const active = (q.data ?? []).find((a) => !a.revokedAt);
  const history = (q.data ?? []).filter((a) => a.revokedAt);
  async function doExport() {
    setExporting(true);
    try {
      const { name, blob } = await exportStudentData(studentId);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      showToast({ tone: "success", title: "Datos exportados", message: name + ": todo lo que el colegio tiene de este estudiante." });
    } catch (e) {
      showToast({ tone: "error", title: "No pudimos exportar los datos", message: e instanceof Error && /No encontramos/.test(e.message) ? e.message : "Revisa tu conexión e inténtalo de nuevo." });
    } finally { setExporting(false); }
  }
  return (
    <section className="ns-col" style={{ gap: 12, marginTop: 16 }} aria-label="Autorización del acudiente">
      <h3 className="ns-subhead">Autorización del acudiente</h3>
      {q.isPending && !q.data ? <LoadingBlocks rows={1} height={40} label="Cargando la autorización" />
        : q.isError && !q.data ? <ErrorState title="No pudimos cargar la autorización." onRetry={() => q.refetch()} />
          : active ? (
            <dl className="ns-dl ns-dl--2">
              {[["Firmó", active.guardianName + " (" + active.relationship + ")"], ["Recibida", dmy(active.receivedOn) + " · " + (active.method === "firma-digital" ? "firma digital" : "firma física")],
                ["Política", "Versión " + active.policyVersion], ["Datos de salud", active.health ? "Autorizados" : "No autorizados"]].map((x) => (
                <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>
              ))}
            </dl>
          ) : <p className="ns-sensitive"><Icon name="warning" size={16} />Sin autorización registrada. El colegio debe tener la autorización firmada del acudiente para tratar estos datos.</p>}
      {history.length ? <span className="ns-caption">{"Revocadas: " + history.map((h) => dmy(h.revokedAt!.slice(0, 10)) + " — " + h.revokedReason).join(" · ")}</span> : null}
      <div className="ns-row">
        {canEdit && !active && q.data ? <Button size="sm" icon="check" onClick={() => setForm({ name: guardian, rel: relationship || "Acudiente", health: false, on: isoToday() })}>Registrar autorización</Button> : null}
        {canEdit && active ? <Button size="sm" variant="secondary" icon="close" onClick={() => { setReason(""); setRevoking(active.id); }}>Revocar autorización</Button> : null}
        <Button size="sm" variant="secondary" icon="download" loading={exporting} loadingText="Exportando…" onClick={doExport}>Exportar datos del estudiante</Button>
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} icon="check" title="Registrar autorización del acudiente"
        description="Registra la autorización firmada que entregó el acudiente (política vigente)."
        actions={[
          <Button key="c" variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>,
          <Button key="g" icon="check" disabled={!form?.name.trim()} loading={register.isPending} onClick={() => form && register.mutateAsync({ studentId, guardianName: form.name, relationship: form.rel, health: form.health, receivedOn: form.on }).then(
            () => { setForm(null); showToast({ tone: "success", title: "Autorización registrada", message: "Quedó con la versión vigente de la política y la fecha." }); },
            (e) => showToast({ tone: "error", title: "No se registró la autorización", message: privacyMessage(e) }),
          )}>Registrar</Button>,
        ]}>
        {form ? (
          <div className="ns-form-grid">
            <Input label="Quién firma" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!form.name.trim() ? "Escribe el nombre de quien firmó." : null} />
            <Select label="Parentesco" value={form.rel} onChange={(x) => setForm({ ...form, rel: x })} options={["Madre", "Padre", "Abuela", "Abuelo", "Tía", "Tío", "Tutor legal", "Acudiente"]} />
            <Input label="Fecha en que se recibió" type="date" value={form.on} onChange={(e) => setForm({ ...form, on: e.target.value })} />
            <Checkbox label="Autorizó expresamente los datos de salud" checked={form.health} onChange={(x) => setForm({ ...form, health: x })} />
          </div>
        ) : null}
      </Modal>
      <Modal open={revoking !== null} onClose={() => setRevoking(null)} alert icon="close" tone="burgundy" title="¿Revocar la autorización?"
        description="Queda en el historial con el motivo. Si ya no hay autorización para datos de salud, esos datos se borran; el registro académico se conserva."
        actions={[
          <Button key="c" variant="secondary" onClick={() => setRevoking(null)} data-autofocus>Cancelar</Button>,
          <Button key="r" variant="danger" icon="close" disabled={!reason.trim()} loading={revoke.isPending} onClick={() => revoke.mutateAsync({ id: revoking!, studentId, reason }).then(
            () => { setRevoking(null); showToast({ tone: "success", title: "Autorización revocada", message: "Quedó en el historial con el motivo." }); },
            (e) => showToast({ tone: "error", title: "No se revocó la autorización", message: privacyMessage(e) }),
          )}>Revocar</Button>,
        ]}>
        <Textarea label="Motivo" required value={reason} onChange={setReason} rows={2} hint="Obligatorio. Por ejemplo: «El acudiente retiró la autorización de salud»." />
      </Modal>
      {toastNode}
    </section>
  );
}
