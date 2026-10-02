import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/atoms/Button";
import { SegmentedTabs } from "../../components/atoms/Controls";
import { Input, Select, Textarea } from "../../components/atoms/Field";
import { ConceptEditor } from "../../components/organisms/ConceptEditor";
import { Gradebook } from "../../components/organisms/Gradebook";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { ObserverTimeline } from "../../components/organisms/Observer";
import { AttendancePanel, RecoveryTable } from "../../components/organisms/TeacherPanels";
import { useToast } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import { OBS, type ObsType, type ObservationItem } from "../../data/academic";
import { ALL_STUDENTS } from "../../data/students";

/* Productividad docente: planilla, conceptos, recuperaciones, asistencia y comportamiento. */

export function GradebookPage() {
  return (
    <PageShell active="gradebook" counts={{ grades: 8 }}>
      <Header eyebrow="Matemáticas · Periodo 3" title="Planilla de Calificaciones" highlight="Calificaciones" description="Escribe sin soltar el teclado. El promedio se calcula solo con los porcentajes del periodo." />
      <Gradebook />
    </PageShell>
  );
}

export function ConceptsPage() {
  return (
    <PageShell active="concepts">
      <Header eyebrow="Matemáticas · 7A · Periodo 3" title="Conceptos del periodo" highlight="Conceptos" description="El concepto que acompaña la nota de cada estudiante en el boletín. La IA te ayuda con el primer borrador." />
      <ConceptEditor />
    </PageShell>
  );
}

export function RecoveriesPage() {
  return (
    <PageShell active="recoveries" counts={{ grades: 8 }}>
      <Header eyebrow="Periodo 2 · actividades de recuperación" title="Recuperaciones" highlight="Recuperaciones" description="Solo aparecen los estudiantes con una materia por debajo de 3.0." />
      <RecoveryTable />
    </PageShell>
  );
}

export function AttendancePage() {
  return (
    <PageShell active="attendance" counts={{ grades: 8 }}>
      <Header eyebrow="Jueves 1 de octubre · 2.ª hora" title="Asistencia" highlight="Asistencia" description="Marca a todos en segundos. Agrega observaciones solo cuando haga falta." />
      <AttendancePanel />
    </PageShell>
  );
}

type BehaviorForm = { student: string; type: ObsType; title: string; context: string };

export function BehaviorPage() {
  const [items, setItems] = useState<ObservationItem[]>(() => OBS.slice());
  const [v, setV] = useState<BehaviorForm>({ student: "", type: "positive", title: "", context: "" });
  const [tried, setTried] = useState(false);
  const [showToast, toastNode] = useToast();
  const [drafting, setDrafting] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function add() {
    setTried(true);
    if (!v.student || !v.title.trim()) return;
    setItems([{ date: "1 de octubre", type: v.type, title: v.title, context: v.context || "Matemáticas", by: "Ana Lucía Rosero", student: v.student, course: "7A" }, ...items]);
    setV({ student: "", type: v.type, title: "", context: "" });
    setTried(false);
    showToast({ tone: "success", title: "Observación registrada", message: "Se notificó al acudiente." });
  }
  function draftWithAI() {
    setDrafting(true);
    // Sin servicio de IA en esta fase: el borrador sale de la misma regla del sistema.
    timer.current = window.setTimeout(() => {
      setDrafting(false);
      const who = v.student ? v.student.split(" ")[0] : "El estudiante";
      const base = v.context.trim() ? v.context.trim().replace(/\.$/, "") : v.title.trim().toLowerCase();
      const txt = v.type === "positive" ? who + " se destacó durante la clase: " + base + ". Se reconoce su compromiso y se le anima a mantener esta actitud."
        : v.type === "attention" ? "Durante la clase, " + who + " presentó la siguiente situación: " + base + ". Se dialogó con el estudiante y se acordó un compromiso de mejora."
          : "Se informa que " + who + ": " + base + ".";
      setV((cur) => ({ ...cur, context: txt }));
    }, 800);
  }

  return (
    <PageShell active="behavior" counts={{ grades: 8 }}>
      <Header eyebrow="Observador del estudiante · 7A" title="Comportamiento" highlight="Comportamiento" description="Registra anotaciones positivas, informativas o de atención. El acudiente las ve en su aplicación." />
      <div className="ns-behavior">
        <Block tone="gold" label="Nueva observación">
          <BlockTitle>Nueva observación</BlockTitle>
          <div className="ns-form-grid ns-form-grid--1">
            <Select label="Estudiante" required value={v.student} placeholder="Selecciona" onChange={(x) => setV({ ...v, student: x })}
              options={ALL_STUDENTS.filter((s) => s.course === "7A").map((s) => s.name)} error={tried && !v.student ? "Selecciona un estudiante." : undefined} />
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
        </Block>
        <Block>
          <BlockTitle>Anotaciones recientes</BlockTitle>
          <ObserverTimeline items={items} showStudent />
        </Block>
      </div>
      {toastNode}
    </PageShell>
  );
}
