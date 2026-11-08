import { Fragment, useState, type ReactNode } from "react";
import { useShell } from "../app/ShellContext";
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
import { useI18n } from "../i18n/I18nProvider";
import { enrolledText } from "../components/organisms/admin/StudentTable";

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
  const { t: tr, shownGrade, lang } = useI18n();
  const p = tr.tch.prof;
  const TABS: Array<[string, string]> = (["summary", "grades", "attendance", "observer", "reportcards", ...(canInfo ? ["info"] as const : [])] as const).map((k) => [k, p.tabs[k]]);
  const map: Record<string, string> = { profile: "summary", history: "grades" };
  const [tab, setTab] = useState((initialTab && map[initialTab]) || initialTab || "summary");
  const t = TABS.some((x) => x[0] === tab) ? tab : "summary";
  const rows = subjectGrades(s);
  const clear = s.library && s.fees && s.documents;

  let body: ReactNode;
  if (t === "summary") {
    body = (
      <>
      <div className="ns-profile-grid">
        <Block tone="navy">
          <span className="ns-overline" style={{ color: "var(--gold)" }}>{p.avgOf(tr.tch.periodName("Periodo 3"))}</span>
          <strong className="ns-big-ivory">{shownGrade(s.avg)}</strong>
          <span style={{ color: PROFILE_MUTED_ON_NAVY, fontWeight: 600 }}>{p.passedDemo(PERF(s.avg), s.subjectsPassed)}</span>
        </Block>
        <Block tone="sage"><span className="ns-overline">{p.attendance}</span><strong className="ns-big">{s.attendance + "%"}</strong><ProgressBar value={s.attendance} total={100} tone="sage" label={p.attendance} /></Block>
        <Block tone={clear ? "paper" : "burgundy"}>
          <span className="ns-overline">{p.clearance}</span>
          <strong className="ns-big">{clear ? p.clear : p.pending}</strong>
          <span className="ns-caption">{p.clearanceDetail(s.library ? "✓" : "×", s.fees ? "✓" : "×", s.documents ? "✓" : "×")}</span>
        </Block>
        <Block className="ns-span-3">
          <LineChart title={p.evolution} subtitle={p.periodsDemo} labels={[1, 2, 3].map(tr.tch.periodShort)} min={1} max={5} ticks={[1, 3, 5]} threshold={3} thresholdLabel={p.minimum} height={200}
            series={[{ name: p.average, points: [Math.max(1, s.avg - 0.3), Math.max(1, s.avg - 0.1), s.avg] }]} format={shownGrade} />
        </Block>
      </div>
      {tr.tch.scaleNote ? <p className="ns-caption" style={{ margin: 0 }}>{tr.tch.scaleNote}</p> : null}
      </>
    );
  } else if (t === "grades") {
    body = (
      <DataTable
        caption={p.gradesCaption} rows={rows.map((r, i) => ({ id: i, ...r }))}
        columns={[
          { key: "subject", label: p.cols.subject }, { key: "teacher", label: p.cols.teacher },
          { key: "grade", label: p.cols.grade, numeric: true, render: (r) => <span className="ns-table-grade">{shownGrade(r.grade)}</span> },
          { key: "perf", label: p.cols.perf, render: (r) => <span className={"ns-perf ns-perf--" + PERF(r.grade).toLowerCase()}>{PERF(r.grade)}</span> },
          { key: "absences", label: p.cols.absences, numeric: true },
        ]}
      />
    );
    if (tr.tch.scaleNote) body = <>{body}<p className="ns-caption" style={{ margin: 0 }}>{tr.tch.scaleNote}</p></>;
  } else if (t === "attendance") {
    body = <Block><AttendanceCalendar attendance={s.attendance} /></Block>;
  } else if (t === "observer") {
    body = <Block><ObserverTimeline items={OBS.filter((o) => o.student.indexOf(s.first) === 0).concat(OBS.slice(0, 2))} /></Block>;
  } else if (t === "reportcards") {
    body = clear
      ? <Block><div className="ns-paper-scroll"><ReportCardDocument student={s} compact /></div></Block>
      : <EmptyState tone="error" icon="lock" title={p.lockedTitle} message={p.lockedText} />;
  } else {
    body = (
      <Block>
        <dl className="ns-dl ns-dl--2">
          {[[tr.adm.info.document, s.document], [tr.adm.info.enrolled, enrolledText(lang, s)], [tr.adm.info.guardian, s.guardian + " (" + tr.adm.fixed(s.guardianRel) + ")"], [tr.adm.info.guardianPhone, s.guardianPhone]].map((x) => (
            <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>
          ))}
        </dl>
        {canInfo ? <p className="ns-sensitive"><Icon name="lock" size={16} />{tr.adm.info.demoMedical}</p> : null}
      </Block>
    );
  }

  return (
    <PageShell active="students" counts={null}>
      <div className="ns-profile-head">
        <Button variant="ghost" size="sm" icon="chevleft" onClick={() => navigate("students")}>{p.back}</Button>
        <div className="ns-profile-id">
          <Avatar name={s.name} size="lg" />
          <div>
            <h1 className="ns-header-title" style={{ fontSize: 40 }}>{s.name}</h1>
            <div className="ns-row" style={{ gap: 8 }}><span className="ns-course-tag">{s.course}</span><span className="ns-caption">{tr.tch.idOf(s.id)}</span><EnrollBadge status={s.status} /></div>
          </div>
        </div>
      </div>
      <SegmentedTabs label={p.tabsAria} value={t} onChange={setTab} tabs={TABS.map((x) => ({ value: x[0], label: x[1] }))} />
      {body}
    </PageShell>
  );
}

const TAB_ALIAS: Record<string, string> = { profile: "summary", history: "grades" };

/** Encabezado del perfil (nombre, curso, ID y estado de matrícula). */
function ProfileHead({ s, onBack }: { s: StudentRecord; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="ns-profile-head">
      <Button variant="ghost" size="sm" icon="chevleft" onClick={onBack}>{t.tch.prof.back}</Button>
      <div className="ns-profile-id">
        <Avatar name={s.name} size="lg" />
        <div>
          <h1 className="ns-header-title" style={{ fontSize: 40 }}>{s.name}</h1>
          <div className="ns-row" style={{ gap: 8 }}><span className="ns-course-tag">{s.course}</span><span className="ns-caption">{t.tch.idOf(s.id)}</span><EnrollBadge status={s.status} /></div>
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
  const p = useI18n().t.tch.prof;
  let content: ReactNode;
  if (q.isPending && !q.data) content = <LoadingBlocks rows={4} height={96} label={p.loading} />;
  else if (q.isError && !q.data) content = <ErrorState title={p.error} onRetry={() => q.refetch()} />;
  else if (!q.data) content = <EmptyState icon="students" title={p.notFoundTitle} message={p.notFoundText} action={<Button variant="secondary" icon="chevleft" onClick={back}>{p.backToStudents}</Button>} />;
  else content = <RealProfileBody d={q.data} role={role} tab={tab} setTab={setTab} onBack={back} />;
  return <PageShell active="students" counts={null}>{content}</PageShell>;
}

function RealProfileBody({ d, role, tab, setTab, onBack }: { d: ProfileData; role: string; tab: string; setTab: (t: string) => void; onBack: () => void }) {
  const s = d.student;
  const canInfo = role === "admin" || role === "principal";
  const { t: tr, shownGrade, lang } = useI18n();
  const p = tr.tch.prof;
  const TABS: Array<[string, string]> = (["summary", "grades", "attendance", "observer", "reportcards", ...(canInfo ? ["info"] as const : [])] as const).map((k) => [k, p.tabs[k]]);
  const t = TABS.some((x) => x[0] === tab) ? tab : "summary";
  const clear = s.library && s.fees && s.documents;
  const periodName = tr.tch.periodName(d.period?.name ?? "Periodo");
  const mark = (ok: boolean) => (ok ? "✓" : "×");

  let body: ReactNode;
  if (t === "summary") {
    body = (
      <>
      <div className="ns-profile-grid">
        <Block tone="navy">
          <span className="ns-overline" style={{ color: "var(--gold)" }}>{p.avgOf(periodName)}</span>
          <strong className="ns-big-ivory">{shownGrade(d.avg)}</strong>
          <span style={{ color: PROFILE_MUTED_ON_NAVY, fontWeight: 600 }}>{d.graded ? p.passed(PERF(d.avg), d.passed, d.graded) : p.noVerified}</span>
        </Block>
        <Block tone="sage"><span className="ns-overline">{p.attendance}</span><strong className="ns-big">{isNaN(s.attendance) ? "—" : s.attendance + "%"}</strong><ProgressBar value={isNaN(s.attendance) ? 0 : s.attendance} total={100} tone="sage" label={p.attendance} /></Block>
        <Block tone={clear ? "paper" : "burgundy"}>
          <span className="ns-overline">{p.clearance}</span>
          <strong className="ns-big">{clear ? p.clear : p.pending}</strong>
          <span className="ns-caption">{p.clearanceDetail(mark(s.library), mark(s.fees), mark(s.documents))}</span>
        </Block>
        <Block className="ns-span-3">
          {d.evol.length ? (
            <LineChart title={p.evolution} subtitle={p.periodsOf(String(d.period?.year ?? ""))} labels={d.evol.map((x) => tr.tch.periodShort(Number(x.label.slice(1))))} min={1} max={5} ticks={[1, 3, 5]} threshold={3} thresholdLabel={p.minimum} height={200}
              series={[{ name: p.average, points: d.evol.map((x) => x.value) }]} format={shownGrade} />
          ) : <EmptyState icon="reports" title={p.noEvolTitle} message={p.noEvolText} />}
        </Block>
      </div>
      {tr.tch.scaleNote && d.graded ? <p className="ns-caption" style={{ margin: 0 }}>{tr.tch.scaleNote}</p> : null}
      </>
    );
  } else if (t === "grades") {
    body = (
      <>
        {role === "teacher" ? <p className="ns-caption" style={{ margin: 0 }}>{p.teacherNote}</p> : null}
        {d.subjects.length ? (
          <DataTable
            caption={p.gradesCaptionOf(periodName)} rows={d.subjects.map((r, i) => ({ id: i, ...r }))}
            columns={[
              { key: "subject", label: p.cols.subject }, { key: "teacher", label: p.cols.teacher },
              { key: "grade", label: p.cols.grade, numeric: true, render: (r) => <span className="ns-table-grade">{shownGrade(r.grade)}</span> },
              { key: "perf", label: p.cols.perf, render: (r) => (isNaN(r.grade) ? <span className="ns-caption">{p.noGrades}</span> : <span className={"ns-perf ns-perf--" + PERF(r.grade).toLowerCase()}>{PERF(r.grade)}</span>) },
            ]}
          />
        ) : <EmptyState icon="reports" title={p.noSubjectsTitle} message={p.noSubjectsText} />}
        {tr.tch.scaleNote && d.subjects.length ? <p className="ns-caption" style={{ margin: 0 }}>{tr.tch.scaleNote}</p> : null}
      </>
    );
  } else if (t === "attendance") {
    body = <Block>{d.month ? <AttendanceCalendar attendance={s.attendance} month={d.month} /> : <EmptyState icon="calendar" title={p.noAttendanceTitle} message={p.noAttendanceText} />}</Block>;
  } else if (t === "observer") {
    body = <Block>{d.observations.length ? <ObserverTimeline items={d.observations} /> : <EmptyState icon="eye" title={p.noObsTitle} message={p.noObsText} />}</Block>;
  } else if (t === "reportcards") {
    body = !clear ? <EmptyState tone="error" icon="lock" title={p.lockedTitle} message={p.lockedText} />
      : role === "teacher" ? <EmptyState icon="file" title={p.teacherCardTitle} message={p.teacherCardText} />
        : d.period ? <ProfileReportCard studentId={s.id} course={s.course} period={d.period.name} /> : <EmptyState icon="file" title={p.noPeriodsTitle} message={p.noPeriodsText} />;
  } else {
    const m = d.medical, n = tr.adm.info;
    // Lo que escribió el colegio (alergias, condiciones, notas) no se traduce (I6); sí los rótulos.
    const parts = m ? [m.allergies ? n.allergies(m.allergies) : n.noAllergies, m.conditions ? n.conditions(m.conditions) : "", m.notes, m.emergency ? n.emergency(m.emergency) : ""].filter(Boolean) : [n.noInfo];
    body = (
      <Block>
        <dl className="ns-dl ns-dl--2">
          {[[n.document, s.document], [n.enrolled, enrolledText(lang, s)], [n.guardian, s.guardian ? s.guardian + (s.guardianRel ? " (" + tr.adm.fixed(s.guardianRel) + ")" : "") : n.notRegistered], [n.guardianPhone, s.guardianPhone || n.notRegistered]].map((x) => (
            <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>
          ))}
        </dl>
        <p className="ns-sensitive"><Icon name="lock" size={16} />{n.medical(parts.join(" · "))}</p>
        <AuthorizationPanel studentId={s.id} guardian={s.guardian} relationship={s.guardianRel} canEdit={role === "admin"} />
      </Block>
    );
  }
  return (
    <>
      <ProfileHead s={s} onBack={onBack} />
      <SegmentedTabs label={p.tabsAria} value={t} onChange={setTab} tabs={TABS.map((x) => ({ value: x[0], label: x[1] }))} />
      {body}
    </>
  );
}

/** Boletín del periodo con las mismas reglas de Secretaría (solo lo confirmado por una persona). */
function ProfileReportCard({ studentId, course, period }: { studentId: string; course: string; period: string }) {
  const q = useReportCards({ course, period });
  const p = useI18n().t.tch.prof;
  if (q.isPending && !q.data) return <LoadingBlocks rows={3} height={120} label={p.cardLoading} />;
  if (q.isError && !q.data) return <ErrorState title={p.cardError} onRetry={() => q.refetch()} />;
  const row = q.data?.rows.find((r) => r.id === studentId);
  if (!row) return <EmptyState icon="file" title={p.noCardTitle} message={p.noCardText} />;
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
  const { t } = useI18n();
  const x = t.adm.auth, fx = t.adm.fixed;
  const active = (q.data ?? []).find((a) => !a.revokedAt);
  const history = (q.data ?? []).filter((a) => a.revokedAt);
  async function doExport() {
    setExporting(true);
    try {
      const { name, blob } = await exportStudentData(studentId);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      showToast({ tone: "success", title: x.exported, message: x.exportedText(name) });
    } catch (e) {
      showToast({ tone: "error", title: x.exportError, message: e instanceof Error && /No encontramos/.test(e.message) ? x.notFound(e.message) : t.common.retryHint });
    } finally { setExporting(false); }
  }
  return (
    <section className="ns-col" style={{ gap: 12, marginTop: 16 }} aria-label={x.title}>
      <h3 className="ns-subhead">{x.title}</h3>
      {q.isPending && !q.data ? <LoadingBlocks rows={1} height={40} label={x.loading} />
        : q.isError && !q.data ? <ErrorState title={x.loadError} onRetry={() => q.refetch()} />
          : active ? (
            <dl className="ns-dl ns-dl--2">
              {[[x.signed, active.guardianName + " (" + fx(active.relationship) + ")"], [x.received, dmy(active.receivedOn) + " · " + (active.method === "firma-digital" ? x.digital : x.physical)],
                [x.policy, x.version(active.policyVersion)], [x.health, active.health ? x.authorized : x.notAuthorized]].map((y) => (
                <Fragment key={y[0]}><dt>{y[0]}</dt><dd>{y[1]}</dd></Fragment>
              ))}
            </dl>
          ) : <p className="ns-sensitive"><Icon name="warning" size={16} />{x.none}</p>}
      {history.length ? <span className="ns-caption">{x.revoked(history.map((h) => dmy(h.revokedAt!.slice(0, 10)) + " — " + h.revokedReason).join(" · "))}</span> : null}
      <div className="ns-row">
        {canEdit && !active && q.data ? <Button size="sm" icon="check" onClick={() => setForm({ name: guardian, rel: relationship || "Acudiente", health: false, on: isoToday() })}>{x.register}</Button> : null}
        {canEdit && active ? <Button size="sm" variant="secondary" icon="close" onClick={() => { setReason(""); setRevoking(active.id); }}>{x.revoke}</Button> : null}
        <Button size="sm" variant="secondary" icon="download" loading={exporting} loadingText={x.exporting} onClick={doExport}>{x.export}</Button>
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} icon="check" title={x.registerTitle}
        description={x.registerText}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setForm(null)}>{x.cancel}</Button>,
          <Button key="g" icon="check" disabled={!form?.name.trim()} loading={register.isPending} onClick={() => form && register.mutateAsync({ studentId, guardianName: form.name, relationship: form.rel, health: form.health, receivedOn: form.on }).then(
            () => { setForm(null); showToast({ tone: "success", title: x.registered, message: x.registeredText }); },
            (e) => showToast({ tone: "error", title: x.registerError, message: privacyMessage(e, t) }),
          )}>{x.registerBtn}</Button>,
        ]}>
        {form ? (
          <div className="ns-form-grid">
            <Input label={x.who} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={!form.name.trim() ? x.whoError : null} />
            {/* Parentesco: se guarda en español (lista fija) y se muestra en el idioma de la app. */}
            <Select label={x.rel} value={form.rel} onChange={(y) => setForm({ ...form, rel: y })} options={["Madre", "Padre", "Abuela", "Abuelo", "Tía", "Tío", "Tutor legal", "Acudiente"].map((y) => ({ value: y, label: fx(y) }))} />
            <Input label={x.receivedOn} type="date" value={form.on} onChange={(e) => setForm({ ...form, on: e.target.value })} />
            <Checkbox label={x.healthCheck} checked={form.health} onChange={(y) => setForm({ ...form, health: y })} />
          </div>
        ) : null}
      </Modal>
      <Modal open={revoking !== null} onClose={() => setRevoking(null)} alert icon="close" tone="burgundy" title={x.revokeTitle}
        description={x.revokeText}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setRevoking(null)} data-autofocus>{x.cancel}</Button>,
          <Button key="r" variant="danger" icon="close" disabled={!reason.trim()} loading={revoke.isPending} onClick={() => revoke.mutateAsync({ id: revoking!, studentId, reason }).then(
            () => { setRevoking(null); showToast({ tone: "success", title: x.revokedOk, message: x.revokedOkText }); },
            (e) => showToast({ tone: "error", title: x.revokeError, message: privacyMessage(e, t) }),
          )}>{x.revokeBtn}</Button>,
        ]}>
        <Textarea label={x.reason} required value={reason} onChange={setReason} rows={2} hint={x.reasonHint} />
      </Modal>
      {toastNode}
    </section>
  );
}
