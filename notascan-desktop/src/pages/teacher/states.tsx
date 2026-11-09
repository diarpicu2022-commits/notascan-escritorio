import { useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState } from "../../components/organisms/EmptyState";
import { ErrorState, LoadingBlocks } from "../../components/organisms/QueryState";
import { useI18n } from "../../i18n/I18nProvider";
import { pickAssignment, useMyAssignments, type Assignment } from "../../services/teacher";

/* Estados compartidos por las pantallas del Docente (piezas del sistema: .ns-skel, EmptyState). */

/** Asignación elegida (curso + materia del periodo abierto). */
export function useAssignmentPick() {
  const aq = useMyAssignments();
  const [key, setKey] = useState<string | null>(null);
  const current = pickAssignment(aq.data, key);
  return { aq, list: aq.data ?? [], current, setKey };
}

/* Piezas con texto en el idioma de la app (idiomas, paso 3): mismos elementos de antes, el texto sale del diccionario. */
function CoursesError({ onRetry }: { onRetry: () => void }) {
  return <ErrorState title={useI18n().t.tch.states.coursesError} onRetry={onRetry} />;
}
function NoCourses() {
  const s = useI18n().t.tch.states;
  return <EmptyState icon="students" title={s.noCoursesTitle} message={s.noCoursesText} />;
}
function NoStudents() {
  const s = useI18n().t.tch.states;
  return <EmptyState icon="students" title={s.noStudentsTitle} message={s.noStudentsText} />;
}

/** Antes de los datos propios: cursos del docente cargando, con error o sin ninguno. */
export function assignmentsState(aq: UseQueryResult<Assignment[]>, loadingLabel: string): ReactNode | undefined {
  if (aq.isPending && !aq.data) return <LoadingBlocks label={loadingLabel} />;
  if (aq.isError && !aq.data) return <CoursesError onRetry={() => aq.refetch()} />;
  if (!aq.data?.length) return <NoCourses />;
  return undefined;
}

/** Datos de la pantalla: carga o error (el vacío lo decide cada pantalla). */
export function queryState(q: UseQueryResult<unknown>, loadingLabel: string, errorTitle: string): ReactNode | undefined {
  if (q.isPending && !q.data) return <LoadingBlocks label={loadingLabel} />;
  if (q.isError && !q.data) return <ErrorState title={errorTitle} onRetry={() => q.refetch()} />;
  return undefined;
}

export const NO_STUDENTS = <NoStudents />;
export const courseOption = (a: Assignment) => ({ value: a.key, label: a.courseId + " · " + a.subject });
