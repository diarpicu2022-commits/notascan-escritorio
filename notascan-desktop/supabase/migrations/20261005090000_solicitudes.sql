-- NotaScan · solicitudes de cambio de nota (paso 6b.4a, 2026-10-05).
-- Hallazgo de 6b.2: decide_grade_request aprobaba la solicitud pero no cambiaba la nota, porque la solicitud
-- no decía cuál nota (solo estudiante, materia y curso). Ahora cada solicitud apunta a una nota concreta
-- (grade_id) y aprobarla la cambia en la misma transacción. El disparador de auditoría guarda la nota original.

alter table public.grade_change_requests add column grade_id bigint references public.grades (id) on delete restrict;
create index grade_change_requests_grade on public.grade_change_requests (grade_id);

-- Las solicitudes anteriores se enlazan solo cuando hay una única nota que coincide (estudiante, curso, materia
-- y nota actual). Las que no, quedan sin nota: se pueden rechazar, no aprobar.
update public.grade_change_requests r set grade_id = m.grade_id
from (
  select r2.id, min(g.id) as grade_id, count(*) as n
  from public.grade_change_requests r2
  join public.teaching_assignments a on a.course_id = r2.course_id and a.subject_id = r2.subject_id and a.institution_id = r2.institution_id
  join public.evaluations e on e.assignment_id = a.id
  join public.grades g on g.evaluation_id = e.id and g.student_id = r2.student_id and g.value = r2.from_value
  where r2.grade_id is null
  group by r2.id
) m
where m.id = r.id and m.n = 1;

-- Toda solicitud que crea un docente indica su nota (la política lo exige; la semilla, sin sesión, no pasa por ella).
-- La nota de la solicitud es del docente que la pide, del mismo estudiante, curso y materia, y su valor actual es
-- el «desde» de la solicitud. Security definer para leer la nota sin depender del RLS de quien inserta.
create or replace function public.request_fits_grade(p_grade bigint, p_student text, p_course text, p_subject text, p_from numeric)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.grades g
    join public.evaluations e on e.id = g.evaluation_id
    join public.teaching_assignments a on a.id = e.assignment_id
    where g.id = p_grade and g.student_id = p_student and a.course_id = p_course and a.subject_id = p_subject
      and g.value = p_from and a.teacher_email = public.current_email() and g.institution_id = public.current_institution()
  )
$$;
revoke execute on function public.request_fits_grade(bigint, text, text, text, numeric) from public, anon;
grant execute on function public.request_fits_grade(bigint, text, text, text, numeric) to authenticated;

drop policy requests_create on public.grade_change_requests;
create policy requests_create on public.grade_change_requests for insert to authenticated
  with check (teacher_email = public.current_email() and status = 'pending' and decided_by is null and decided_at is null
              and public.request_fits_grade(grade_id, student_id, course_id, subject_id, from_value));

-- Aprobar cambia la nota; si la nota ya no es la de la solicitud, no se aplica a ciegas.
create or replace function public.decide_grade_request(p_request bigint, p_decision public.request_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.grade_change_requests; cur numeric; who text;
begin
  if public.current_app_role() is distinct from 'principal' then raise exception 'Solo Rectoría decide las solicitudes.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decisión no válida.'; end if;
  select * into r from public.grade_change_requests where id = p_request and institution_id = public.current_institution() for update;
  if not found or r.status <> 'pending' then raise exception 'La solicitud no está pendiente.'; end if;
  if p_decision = 'approved' then
    if r.grade_id is null then raise exception 'La solicitud no indica qué nota cambiar. Recházala y pide al docente que la registre de nuevo.'; end if;
    select value into cur from public.grades where id = r.grade_id for update;
    if cur is distinct from r.from_value then
      raise exception 'La nota cambió desde la solicitud (ahora es %). Recházala y pide una nueva.', to_char(cur, 'FM0.0');
    end if;
    -- Rectoría puede cambiar una nota de evaluación cerrada (block_closed_evaluation); grade_audit guarda la original.
    update public.grades set value = r.to_value where id = r.grade_id;
  end if;
  update public.grade_change_requests
     set status = p_decision, decided_by = (select auth.uid()), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = p_request;
  who := (select full_name from public.profiles where id = (select auth.uid()));
  insert into public.request_events (request_id, description, actor_id, institution_id)
  values (p_request, case when p_decision = 'approved' then 'Aprobada' else 'Rechazada' end
                     || ' por ' || who || coalesce(': ' || nullif(trim(p_note), ''), ''), (select auth.uid()), r.institution_id);
end $$;
revoke execute on function public.decide_grade_request(bigint, public.request_status, text) from public, anon;
grant execute on function public.decide_grade_request(bigint, public.request_status, text) to authenticated;
