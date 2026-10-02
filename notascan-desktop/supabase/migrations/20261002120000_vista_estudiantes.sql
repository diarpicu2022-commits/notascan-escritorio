-- NotaScan · vista de estudiantes para la app (paso 6b.1, 2026-10-02).
-- Reúne en una fila lo que muestran las tablas de estudiantes: datos de matrícula, acudiente principal,
-- promedio (solo notas verificadas: la IA detecta, el docente verifica) y porcentaje de asistencia.
-- security_invoker: se aplica el RLS de quien consulta (el docente no ve acudientes ni notas ajenas).

create view public.student_overview with (security_invoker = true) as
select
  s.id,
  s.first_names,
  s.last_names,
  s.full_name,
  s.doc_type,
  s.document,
  s.course_id,
  c.grade_level_id,
  s.status,
  s.enrolled_on,
  s.library_ok,
  s.fees_ok,
  s.documents_ok,
  g.full_name     as guardian_name,
  g.relationship  as guardian_rel,
  g.phone         as guardian_phone,
  (select round(avg(gr.value), 1) from public.grades gr where gr.student_id = s.id and gr.status = 'verified') as avg_grade,
  (select round(100.0 * count(*) filter (where a.state in ('present', 'late', 'excused')) / nullif(count(*), 0))
     from public.attendance a where a.student_id = s.id) as attendance_pct
from public.students s
left join public.courses c on c.id = s.course_id
left join lateral (
  select gd.full_name, gd.relationship, gd.phone from public.guardians gd
  where gd.student_id = s.id order by gd.is_primary desc, gd.id limit 1
) g on true;

revoke all on public.student_overview from anon;
grant select on public.student_overview to authenticated;
