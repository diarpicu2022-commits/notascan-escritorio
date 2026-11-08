import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../app/AuthContext";
import { useShell } from "../../app/ShellContext";
import { Button } from "../../components/atoms/Button";
import { SegmentedTabs } from "../../components/atoms/Controls";
import { Input, Select, Textarea } from "../../components/atoms/Field";
import { FilterGroup } from "../../components/molecules/Filters";
import { ConceptEditor } from "../../components/organisms/ConceptEditor";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Gradebook } from "../../components/organisms/Gradebook";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { ObserverTimeline } from "../../components/organisms/Observer";
import { AttendancePanel, RecoveryTable } from "../../components/organisms/TeacherPanels";
import { useToast } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import type { ObsType, ObservationItem } from "../../data/academic";
import { DEMO } from "../../lib/supabase";
import {
  saveMessage, todayIso, useAddObservation, useAttendance, useConcepts, useGradebook,
  useMyStudents, useObservations, useSaveAttendance, useSaveConcepts, useSaveGradeCell,
} from "../../services/teacher";
import { useI18n } from "../../i18n/I18nProvider";
import { weekdayDay } from "../../i18n/dates";
import { useRecoveries, useSaveRecovery } from "../../services/teacherOverview";
import { draftDirectorMessage, useDirectorGroup, useSaveDirectorMessages } from "../../services/reportCards";
import { NO_STUDENTS, assignmentsState, courseOption, queryState, useAssignmentPick } from "./states";

/* Productividad docente: planilla, conceptos, recuperaciones, asistencia y comportamiento.
   Los datos vienen de la base según el RLS del docente; en modo demostración, los del sistema. */

/** «Periodo 3» → número 3, para la nota anterior del concepto («Periodo 2»). */
const periodNumber = (name: string) => parseInt(name.replace(/\D/g, ""), 10);

export function GradebookPage() {
  const { navigate } = useShell();
  const qc = useQueryClient();
  const { aq, list, current, setKey } = useAssignmentPick();
  const q = useGradebook(current);
  const save = useSaveGradeCell();
  const d = q.data;
  const { t } = useI18n();
  const g = t.tch.gb;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, g.loading, g.error)
    ?? (!d?.rows.length ? NO_STUDENTS
      : !d.columns.length ? <EmptyState title={g.noEvalsTitle} message={g.noEvalsText} action={<Button variant="secondary" icon="plus" onClick={() => navigate("evaluations")}>{t.tch.states.goEvaluations}</Button>} />
        : undefined);
  return (
    <PageShell active="gradebook" counts={{ grades: 8 }}>
      <Header eyebrow={current ? current.subject + " · " + t.tch.periodName(current.periodName) : g.eyebrow} title={g.title} highlight={g.highlight} description={g.desc} />
      <Gradebook
        courses={list.map(courseOption)} course={current?.key ?? ""} onCourse={setKey} period={t.tch.periodName(current?.periodName ?? "Periodo")} data={d} state={state}
        onSave={(studentId, column, value) => save.mutateAsync({ studentId, column, value }).then(() => {
          // La planilla ya muestra el cambio: la caché queda marcada como vieja y se relee al volver al curso.
          if (!DEMO) qc.invalidateQueries({ queryKey: ["gradebook"], refetchType: "none" });
        })}
      />
    </PageShell>
  );
}

export function ConceptsPage() {
  const { aq, list, current, setKey } = useAssignmentPick();
  const q = useConcepts(current);
  const save = useSaveConcepts();
  // Mensaje del director (6b.3c): solo si el docente dirige un grupo. En demostración, la pantalla del sistema.
  const dq = useDirectorGroup();
  const saveMsg = useSaveDirectorMessages();
  const [view, setView] = useState("subject");
  const director = !DEMO && !!dq.data?.rows.length;
  const group = [...new Set(dq.data?.rows.map((r) => r.course) ?? [])].join(", ");
  const showDirector = director && view === "director";
  const { t } = useI18n();
  const x = t.tch.concept;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, x.loading, x.error)
    ?? (!q.data?.length ? NO_STUDENTS : undefined);
  // Con más de un curso, el selector va en el encabezado (en demostración el sistema muestra solo 7A).
  const picker = !showDirector && !DEMO && list.length > 1 ? <FilterGroup as="select" label={t.tch.f.course} value={current?.key} onChange={setKey} options={list.map(courseOption)} /> : undefined;
  const byId = new Map((dq.data?.rows ?? []).map((r) => [r.id, r]));
  const period = dq.data?.period;
  return (
    <PageShell active="concepts">
      <Header
        eyebrow={showDirector ? x.eyebrowDirector(group, t.tch.periodName(period?.name ?? "")) : current ? current.subject + " · " + current.courseId + " · " + t.tch.periodName(current.periodName) : x.eyebrow}
        title={showDirector ? x.titleDirector : x.title} highlight={showDirector ? x.highlightDirector : x.highlight}
        description={showDirector ? x.descDirector : x.desc}
        actions={picker} />
      {director ? (
        <SegmentedTabs label={x.whatToWrite} value={view} onChange={setView}
          tabs={[{ value: "subject", label: x.tabSubject, icon: "book" }, { value: "director", label: x.tabDirector(group), icon: "students" }]} />
      ) : null}
      {showDirector && period ? (
        <ConceptEditor
          key={"dir:" + dq.dataUpdatedAt} subject="" course={group} period={period.name}
          data={dq.data!.rows.map((r) => ({ id: r.id, name: r.name, grade: r.avg, prev: NaN, absences: r.absences, text: r.text, state: r.state }))}
          draft={(r) => draftDirectorMessage(byId.get(r.id)!)}
          copy={{
            banner: x.bannerDirector,
            meta: (r) => { const d = byId.get(r.id); return x.metaDirector(d ? d.subjects.length : 0, r.absences); },
            sentTitle: x.sentTitleDirector,
            sentMessage: (n) => x.sentTextDirector(n, group, t.tch.periodName(period.name)),
            allReady: (n) => x.allReadyDirector(t.tch.periodName(period.name), n),
          }}
          onSave={(rows) => saveMsg.mutateAsync({ period: period.id, rows })}
        />
      ) : state ?? (current && q.data ? (
        <ConceptEditor
          key={current.key + ":" + q.dataUpdatedAt} subject={current.subject} course={current.courseId} period={current.periodName} prevPeriod={x.prevPeriod(periodNumber(current.periodName))}
          data={q.data} onSave={(rows) => save.mutateAsync({ assignment: current, rows })}
        />
      ) : null)}
    </PageShell>
  );
}

export function RecoveriesPage() {
  const { aq, q, rq } = useRecoveries();
  const save = useSaveRecovery();
  const period = aq.data?.[0]?.periodName;
  const { t } = useI18n();
  const x = t.tch.rec;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, t.tch.states.loadingCourses, x.error)
    ?? queryState(rq, x.loading, x.error);
  return (
    <PageShell active="recoveries" counts={{ grades: 8 }}>
      <Header eyebrow={x.eyebrow(t.tch.periodName(DEMO ? "Periodo 2" : period ?? "Periodo"))} title={x.title} highlight={x.title} description={x.desc} />
      {state ?? <RecoveryTable data={rq.data ?? []} onSave={(r, value) => save.mutateAsync({ ...r, value })} />}
    </PageShell>
  );
}

export function AttendancePage() {
  const { aq, list } = useAssignmentPick();
  // La asistencia es por curso: una opción por curso aunque el docente dicte dos materias en él.
  // En demostración el sistema muestra solo 7A.
  const courses = list.filter((a, i) => list.findIndex((b) => b.courseId === a.courseId) === i && (!DEMO || a.courseId === "7A"))
    .map((a) => ({ value: a.courseId, label: a.courseId + " · " + a.subject }));
  const [course, setCourse] = useState<string | null>(null);
  const [date, setDate] = useState(DEMO ? "2026-10-01" : todayIso());
  const courseId = course ?? courses[0]?.value;
  const q = useAttendance(courseId, date);
  const save = useSaveAttendance();
  const { t, lang } = useI18n();
  const x = t.tch.att;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, x.loading, x.error)
    ?? (!q.data?.length ? NO_STUDENTS : undefined);
  return (
    <PageShell active="attendance" counts={{ grades: 8 }}>
      <Header eyebrow={DEMO ? x.eyebrowDemo(weekdayDay(lang, "2026-10-01")) : weekdayDay(lang, date)} title={x.title} highlight={x.title} description={x.desc} />
      <AttendancePanel
        courses={courses} course={courseId ?? ""} onCourse={setCourse} date={date} onDate={setDate} data={q.data} state={state}
        onSave={(rows) => save.mutateAsync({ courseId: courseId!, date, rows })}
      />
    </PageShell>
  );
}

type BehaviorForm = { student: string; type: ObsType; title: string; context: string };

export function BehaviorPage() {
  const me = useAuth().profile;
  const { aq, list } = useAssignmentPick();
  const courseIds = [...new Set(list.map((a) => a.courseId))];
  const students = useMyStudents(courseIds);
  const q = useObservations();
  const addMut = useAddObservation();
  const [items, setItems] = useState<ObservationItem[]>(() => q.data?.slice() ?? []);
  const lastData = useRef(q.data);
  useEffect(() => { if (lastData.current !== q.data) { lastData.current = q.data; setItems(q.data?.slice() ?? []); } }, [q.data]);
  const [v, setV] = useState<BehaviorForm>({ student: "", type: "positive", title: "", context: "" });
  const [tried, setTried] = useState(false);
  const [showToast, toastNode] = useToast();
  const [drafting, setDrafting] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const opts = students.data ?? [];
  const { t } = useI18n();
  const b = t.tch.beh;

  function add() {
    setTried(true);
    if (!v.student || !v.title.trim()) return;
    const who = opts.find((o) => o.value === v.student);
    const name = who?.label ?? v.student;
    // Aparece al instante; si la base la rechaza, se retira y se avisa.
    const item: ObservationItem = DEMO
      ? { date: "2026-10-01", type: v.type, title: v.title, context: v.context || "Matemáticas", by: "Ana Lucía Rosero", student: v.student, course: "7A" }
      : { date: todayIso(), type: v.type, title: v.title.trim(), context: v.context.trim(), by: me?.fullName ?? "", student: name, course: who?.course ?? "" };
    setItems((cur) => [item, ...cur]);
    const sent = { studentId: v.student, type: v.type, title: v.title, context: v.context };
    setV({ student: "", type: v.type, title: "", context: "" });
    setTried(false);
    addMut.mutateAsync(sent).then(
      () => showToast({ tone: "success", title: b.toastOk, message: b.toastOkText(name.split(" ")[0]) }),
      (e) => { setItems((cur) => cur.filter((x) => x !== item)); showToast({ tone: "error", title: b.toastError, message: saveMessage(e, t) }); },
    );
  }
  function draftWithAI() {
    setDrafting(true);
    // Sin servicio de IA en esta fase: el borrador sale de la misma regla del sistema. Como los conceptos (D2), el
    // borrador queda en español: es lo que se guarda en el observador del estudiante.
    timer.current = window.setTimeout(() => {
      setDrafting(false);
      const label = opts.find((o) => o.value === v.student)?.label ?? v.student;
      const who = label ? label.split(" ")[0] : "El estudiante";
      const base = v.context.trim() ? v.context.trim().replace(/\.$/, "") : v.title.trim().toLowerCase();
      const txt = v.type === "positive" ? who + " se destacó durante la clase: " + base + ". Se reconoce su compromiso y se le anima a mantener esta actitud."
        : v.type === "attention" ? "Durante la clase, " + who + " presentó la siguiente situación: " + base + ". Se dialogó con el estudiante y se acordó un compromiso de mejora."
          : "Se informa que " + who + ": " + base + ".";
      setV((cur) => ({ ...cur, context: txt }));
    }, 800);
  }

  const timeline = queryState(q, b.loading, b.error)
    ?? (!items.length ? <EmptyState icon="eye" title={b.emptyTitle} message={b.emptyText} /> : <ObserverTimeline items={items} showStudent />);
  const form = assignmentsState(aq, t.tch.states.loadingCourses);
  return (
    <PageShell active="behavior" counts={{ grades: 8 }}>
      <Header eyebrow={b.eyebrow + (courseIds.length ? " · " + (DEMO ? "7A" : courseIds.join(", ")) : "")} title={b.title} highlight={b.title} description={b.desc} />
      <div className="ns-behavior">
        <Block tone="gold" label={b.newObs}>
          <BlockTitle>{b.newObs}</BlockTitle>
          {form ?? (
            <div className="ns-form-grid ns-form-grid--1">
              <Select label={t.tch.f.student} required value={v.student} placeholder={t.tch.f.choose} onChange={(x) => setV({ ...v, student: x })}
                options={DEMO ? opts.map((o) => o.label) : opts.map((o) => ({ value: o.value, label: o.label + " · " + o.course }))} error={tried && !v.student ? b.pickStudent : undefined} />
              <div className="ns-field">
                <span className="ns-field-label">{t.tch.f.type}</span>
                <SegmentedTabs label={b.typeAria} value={v.type} onChange={(x) => setV({ ...v, type: x as ObsType })}
                  tabs={[{ value: "positive", label: t.tch.obsType.positive, icon: "check" }, { value: "neutral", label: t.tch.obsType.neutral, icon: "file" }, { value: "attention", label: t.tch.obsType.attention, icon: "warning" }]} />
              </div>
              <Input label={b.titleLabel} required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder={b.titlePlaceholder} error={tried && !v.title.trim() ? b.titleError : undefined} />
              <Textarea label={b.descLabel} value={v.context} onChange={(x) => setV({ ...v, context: x })} placeholder={b.descPlaceholder} hint={b.descHint} />
              <Button variant="ghost" size="sm" icon="ai" loading={drafting} loadingText={b.writing} disabled={!v.title.trim() && !v.context.trim()} onClick={draftWithAI}>{b.draft}</Button>
              <Button icon="plus" onClick={add}>{b.add}</Button>
            </div>
          )}
        </Block>
        <Block>
          <BlockTitle>{b.recent}</BlockTitle>
          {timeline}
        </Block>
      </div>
      {toastNode}
    </PageShell>
  );
}
