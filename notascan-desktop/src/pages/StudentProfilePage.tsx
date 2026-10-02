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
import { findStudent } from "../data/students";

/* Enmienda 2026-10-01 (anexo): notascan-ui pintaba este texto con un color propio fuera de
   tokens.json. Diego eligió pasarlo a un token; --ivory-deep es el más cercano al original. */
const PROFILE_MUTED_ON_NAVY = "var(--ivory-deep)";

/** Perfil completo del estudiante; las pestañas y los datos sensibles dependen del rol. */
export function StudentProfilePage({ studentId, tab: initialTab }: { studentId?: string; tab?: string }) {
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
    <PageShell active="students" counts={role === "principal" ? { requests: 3 } : null}>
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
