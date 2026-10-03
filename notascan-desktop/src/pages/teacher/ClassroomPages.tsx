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
  longDate, saveMessage, todayIso, useAddObservation, useAttendance, useConcepts, useGradebook,
  useMyStudents, useObservations, useSaveAttendance, useSaveConcepts, useSaveGradeCell, weekdayDate,
} from "../../services/teacher";
import { useRecoveries, useSaveRecovery } from "../../services/teacherOverview";
import { NO_STUDENTS, assignmentsState, courseOption, queryState, useAssignmentPick } from "./states";

/* Productividad docente: planilla, conceptos, recuperaciones, asistencia y comportamiento.
   Los datos vienen de la base según el RLS del docente; en modo demostración, los del sistema. */

/** «Periodo 3» → «Periodo 2» para la nota anterior del concepto. */
const prevPeriod = (name: string) => { const n = parseInt(name.replace(/\D/g, ""), 10); return n > 1 ? "Periodo " + (n - 1) : "Periodo anterior"; };

export function GradebookPage() {
  const { navigate } = useShell();
  const qc = useQueryClient();
  const { aq, list, current, setKey } = useAssignmentPick();
  const q = useGradebook(current);
  const save = useSaveGradeCell();
  const d = q.data;
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando la planilla", "No pudimos cargar la planilla.")
    ?? (!d?.rows.length ? NO_STUDENTS
      : !d.columns.length ? <EmptyState title="Este curso aún no tiene evaluaciones." message="Crea las evaluaciones del periodo para registrar sus notas." action={<Button variant="secondary" icon="plus" onClick={() => navigate("evaluations")}>Ir a evaluaciones</Button>} />
        : undefined);
  return (
    <PageShell active="gradebook" counts={{ grades: 8 }}>
      <Header eyebrow={current ? current.subject + " · " + current.periodName : "Planilla"} title="Planilla de Calificaciones" highlight="Calificaciones" description="Escribe sin soltar el teclado. El promedio se calcula solo con los porcentajes del periodo." />
      <Gradebook
        courses={list.map(courseOption)} course={current?.key ?? ""} onCourse={setKey} period={current?.periodName ?? "Periodo"} data={d} state={state}
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
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando los conceptos", "No pudimos cargar los conceptos.")
    ?? (!q.data?.length ? NO_STUDENTS : undefined);
  // Con más de un curso, el selector va en el encabezado (en demostración el sistema muestra solo 7A).
  const picker = !DEMO && list.length > 1 ? <FilterGroup as="select" label="Curso" value={current?.key} onChange={setKey} options={list.map(courseOption)} /> : undefined;
  return (
    <PageShell active="concepts">
      <Header eyebrow={current ? current.subject + " · " + current.courseId + " · " + current.periodName : "Conceptos"} title="Conceptos del periodo" highlight="Conceptos" description="El concepto que acompaña la nota de cada estudiante en el boletín. La IA te ayuda con el primer borrador." actions={picker} />
      {state ?? (current && q.data ? (
        <ConceptEditor
          key={current.key + ":" + q.dataUpdatedAt} subject={current.subject} course={current.courseId} period={current.periodName} prevPeriod={prevPeriod(current.periodName)}
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
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando tus cursos", "No pudimos cargar las recuperaciones.")
    ?? queryState(rq, "Cargando las recuperaciones", "No pudimos cargar las recuperaciones.");
  return (
    <PageShell active="recoveries" counts={{ grades: 8 }}>
      <Header eyebrow={(DEMO ? "Periodo 2" : period ?? "Periodo") + " · actividades de recuperación"} title="Recuperaciones" highlight="Recuperaciones" description="Solo aparecen los estudiantes con una materia por debajo de 3.0." />
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
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando la lista del curso", "No pudimos cargar la asistencia.")
    ?? (!q.data?.length ? NO_STUDENTS : undefined);
  return (
    <PageShell active="attendance" counts={{ grades: 8 }}>
      <Header eyebrow={DEMO ? "Jueves 1 de octubre · 2.ª hora" : weekdayDate(date)} title="Asistencia" highlight="Asistencia" description="Marca a todos en segundos. Agrega observaciones solo cuando haga falta." />
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

  function add() {
    setTried(true);
    if (!v.student || !v.title.trim()) return;
    const who = opts.find((o) => o.value === v.student);
    const name = who?.label ?? v.student;
    // Aparece al instante; si la base la rechaza, se retira y se avisa.
    const item: ObservationItem = DEMO
      ? { date: "1 de octubre", type: v.type, title: v.title, context: v.context || "Matemáticas", by: "Ana Lucía Rosero", student: v.student, course: "7A" }
      : { date: longDate(todayIso()), type: v.type, title: v.title.trim(), context: v.context.trim(), by: me?.fullName ?? "", student: name, course: who?.course ?? "" };
    setItems((cur) => [item, ...cur]);
    const sent = { studentId: v.student, type: v.type, title: v.title, context: v.context };
    setV({ student: "", type: v.type, title: "", context: "" });
    setTried(false);
    addMut.mutateAsync(sent).then(
      () => showToast({ tone: "success", title: "Observación registrada", message: "Quedó en el observador de " + name.split(" ")[0] + "." }),
      (e) => { setItems((cur) => cur.filter((x) => x !== item)); showToast({ tone: "error", title: "No pudimos registrar la observación", message: saveMessage(e) }); },
    );
  }
  function draftWithAI() {
    setDrafting(true);
    // Sin servicio de IA en esta fase: el borrador sale de la misma regla del sistema.
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

  const timeline = queryState(q, "Cargando las anotaciones", "No pudimos cargar las anotaciones.")
    ?? (!items.length ? <EmptyState icon="eye" title="Aún no hay anotaciones." message="Las observaciones que registres aparecerán aquí en orden cronológico." /> : <ObserverTimeline items={items} showStudent />);
  const form = assignmentsState(aq, "Cargando tus cursos");
  return (
    <PageShell active="behavior" counts={{ grades: 8 }}>
      <Header eyebrow={"Observador del estudiante" + (courseIds.length ? " · " + (DEMO ? "7A" : courseIds.join(", ")) : "")} title="Comportamiento" highlight="Comportamiento" description="Registra anotaciones positivas, informativas o de atención. El acudiente las ve en su aplicación." />
      <div className="ns-behavior">
        <Block tone="gold" label="Nueva observación">
          <BlockTitle>Nueva observación</BlockTitle>
          {form ?? (
            <div className="ns-form-grid ns-form-grid--1">
              <Select label="Estudiante" required value={v.student} placeholder="Selecciona" onChange={(x) => setV({ ...v, student: x })}
                options={DEMO ? opts.map((o) => o.label) : opts.map((o) => ({ value: o.value, label: o.label + " · " + o.course }))} error={tried && !v.student ? "Selecciona un estudiante." : undefined} />
              <div className="ns-field">
                <span className="ns-field-label">Tipo</span>
                <SegmentedTabs label="Tipo de observación" value={v.type} onChange={(x) => setV({ ...v, type: x as ObsType })}
                  tabs={[{ value: "positive", label: "Positiva", icon: "check" }, { value: "neutral", label: "Informativa", icon: "file" }, { value: "attention", label: "Atención", icon: "warning" }]} />
              </div>
              <Input label="Título" required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Participación destacada" error={tried && !v.title.trim() ? "Escribe un título breve." : undefined} />
              <Textarea label="Descripción" value={v.context} onChange={(x) => setV({ ...v, context: x })} placeholder="El estudiante participó activamente durante la actividad." hint="Escribe notas cortas y deja que la IA las redacte; revisa antes de agregar." />
              <Button variant="ghost" size="sm" icon="ai" loading={drafting} loadingText="Redactando…" disabled={!v.title.trim() && !v.context.trim()} onClick={draftWithAI}>Redactar con IA</Button>
              <Button icon="plus" onClick={add}>Agregar observación</Button>
            </div>
          )}
        </Block>
        <Block>
          <BlockTitle>Anotaciones recientes</BlockTitle>
          {timeline}
        </Block>
      </div>
      {toastNode}
    </PageShell>
  );
}
