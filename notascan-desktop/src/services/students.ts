import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEMO, supabase } from "../lib/supabase";
import { ALL_STUDENTS, type StudentRecord } from "../data/students";
import type { EnrollmentStatus } from "../types/domain";
import { demoData, demoInitial, forcedState, allRows } from "./client";

/* Estudiantes: lectura de la vista student_overview (RLS de quien consulta) y cambios de Secretaría. */

// En demo el estado forzado forma parte de la clave: cada estado es una consulta distinta.
const key = () => ["students", forcedState()] as const;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface OverviewRow {
  id: string; first_names: string; last_names: string; full_name: string; doc_type: string; document: string;
  course_id: string | null; grade_level_id: string | null; status: EnrollmentStatus; enrolled_on: string;
  library_ok: boolean; fees_ok: boolean; documents_ok: boolean;
  guardian_name: string | null; guardian_rel: string | null; guardian_phone: string | null;
  avg_grade: number | null; attendance_pct: number | null;
}

/** Fila de la base → forma que usan los componentes del sistema. Sin dato: NaN (se muestra «—»). */
function toRecord(r: OverviewRow): StudentRecord {
  const [y, m, d] = r.enrolled_on.split("-").map(Number);
  return {
    id: r.id, name: r.full_name, first: r.first_names, last: r.last_names, document: r.document, docType: r.doc_type,
    grade: r.grade_level_id ?? (r.course_id ?? "").charAt(0), course: r.course_id ?? "",
    guardian: r.guardian_name ?? "", guardianRel: r.guardian_rel ?? "", guardianPhone: r.guardian_phone ?? "",
    status: r.status, enrolled: d + " " + MONTHS[m - 1] + " " + y,
    avg: r.avg_grade === null ? NaN : Number(r.avg_grade), attendance: r.attendance_pct === null ? NaN : Number(r.attendance_pct),
    subjectsPassed: NaN, library: r.library_ok, fees: r.fees_ok, documents: r.documents_ok,
  };
}

async function fetchStudents(): Promise<StudentRecord[]> {
  if (DEMO) return demoData(ALL_STUDENTS, []);
  const { data, error } = await allRows<OverviewRow>((from, to) => supabase().from("student_overview").select("*").order("full_name").order("id").range(from, to));
  if (error) throw error;
  return (data as OverviewRow[]).map(toRecord);
}

export function useStudents() {
  return useQuery({ queryKey: key(), queryFn: fetchStudents, initialData: demoInitial(ALL_STUDENTS) });
}

/** Cambio optimista: la tabla cambia al instante y vuelve atrás si la base lo rechaza. */
function useOptimistic<V>(apply: (rows: StudentRecord[], v: V) => StudentRecord[], save: (v: V) => Promise<void>) {
  const qc = useQueryClient();
  const KEY = key();
  return useMutation({
    mutationFn: async (v: V) => { if (!DEMO) await save(v); },
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: KEY });
      const before = qc.getQueryData<StudentRecord[]>(KEY);
      if (before) qc.setQueryData(KEY, apply(before, v));
      return { before };
    },
    onError: (_e, _v, ctx) => { if (ctx?.before) qc.setQueryData(KEY, ctx.before); },
    onSettled: () => { if (!DEMO) qc.invalidateQueries({ queryKey: KEY }); },
  });
}

/** Archivar o retirar (Secretaría). El historial académico se conserva: no se borra nada. */
export function useSetStudentStatus() {
  return useOptimistic<{ ids: string[]; status: EnrollmentStatus }>(
    (rows, v) => rows.map((r) => (v.ids.includes(r.id) ? { ...r, status: v.status } : r)),
    async (v) => {
      const { error } = await supabase().from("students").update({ status: v.status }).in("id", v.ids);
      if (error) throw error;
    },
  );
}

/** Editar datos básicos y el acudiente principal (Secretaría). */
export function useUpdateStudent() {
  return useOptimistic<StudentRecord>(
    (rows, s) => rows.map((r) => (r.id === s.id ? s : r)),
    async (s) => {
      const sb = supabase();
      const st = await sb.from("students").update({ first_names: s.first, last_names: s.last, course_id: s.course }).eq("id", s.id);
      if (st.error) throw st.error;
      const gd = await sb.from("guardians").update({ full_name: s.guardian, phone: s.guardianPhone }).eq("student_id", s.id).eq("is_primary", true);
      if (gd.error) throw gd.error;
    },
  );
}
