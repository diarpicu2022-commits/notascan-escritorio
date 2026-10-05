-- NotaScan · lectura de Rectoría para analítica y seguimiento docente (paso 6b.4b, 2026-10-05).

-- Rectoría supervisa al personal: lee el directorio (correo, nombre, rol, área) de su colegio, sin escribirlo.
-- La política restrictiva staff_directory_mi_colegio sigue limitando la lectura al propio colegio.
create policy staff_directory_principal_read on public.staff_directory for select to authenticated
  using (public.current_app_role() = 'principal');

-- Inasistencia por grado en un rango de fechas, agregada en la base (sin traer cada registro al cliente).
-- Security invoker: devuelve solo lo que el RLS de quien consulta le deja leer.
create or replace function public.attendance_by_grade(p_from date, p_to date)
returns table (grade_level_id text, records integer, absences integer)
language sql stable security invoker set search_path = '' as $$
  select c.grade_level_id, count(*)::int, count(*) filter (where a.state = 'absent')::int
  from public.attendance a
  join public.courses c on c.id = a.course_id and c.institution_id = a.institution_id
  where a.class_date between p_from and p_to
  group by c.grade_level_id
$$;
revoke execute on function public.attendance_by_grade(date, date) from public, anon;
grant execute on function public.attendance_by_grade(date, date) to authenticated;
