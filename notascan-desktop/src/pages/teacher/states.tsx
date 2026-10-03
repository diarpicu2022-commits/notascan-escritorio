import { useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { EmptyState } from "../../components/organisms/EmptyState";
import { ErrorState, LoadingBlocks } from "../../components/organisms/QueryState";
import { pickAssignment, useMyAssignments, type Assignment } from "../../services/teacher";

/* Estados compartidos por las pantallas del Docente (piezas del sistema: .ns-skel, EmptyState). */

/** Asignación elegida (curso + materia del periodo abierto). */
export function useAssignmentPick() {
  const aq = useMyAssignments();
  const [key, setKey] = useState<string | null>(null);
  const current = pickAssignment(aq.data, key);
  return { aq, list: aq.data ?? [], current, setKey };
}

/** Antes de los datos propios: cursos del docente cargando, con error o sin ninguno. */
export function assignmentsState(aq: UseQueryResult<Assignment[]>, loadingLabel: string): ReactNode | undefined {
  if (aq.isPending && !aq.data) return <LoadingBlocks label={loadingLabel} />;
  if (aq.isError && !aq.data) return <ErrorState title="No pudimos cargar tus cursos." onRetry={() => aq.refetch()} />;
  if (!aq.data?.length) return <EmptyState icon="students" title="No tienes cursos asignados en el periodo abierto." message="Secretaría arma la malla curricular; cuando te asigne un curso aparecerá aquí." />;
  return undefined;
}

/** Datos de la pantalla: carga o error (el vacío lo decide cada pantalla). */
export function queryState(q: UseQueryResult<unknown>, loadingLabel: string, errorTitle: string): ReactNode | undefined {
  if (q.isPending && !q.data) return <LoadingBlocks label={loadingLabel} />;
  if (q.isError && !q.data) return <ErrorState title={errorTitle} onRetry={() => q.refetch()} />;
  return undefined;
}

export const NO_STUDENTS = <EmptyState icon="students" title="Este curso no tiene estudiantes activos." message="Cuando Secretaría matricule estudiantes en el curso, aparecerán aquí." />;
export const courseOption = (a: Assignment) => ({ value: a.key, label: a.courseId + " · " + a.subject });
