-- NotaScan · funciones, disparadores y permisos por rol (RLS) (paso 6a, 2026-10-01).
-- El proyecto se creó con «Enable automatic RLS» y sin exponer tablas automáticamente:
-- aquí se activa RLS de forma explícita (por si acaso) y se conceden los permisos uno a uno.

-- ---------- Funciones auxiliares (security definer: leen profiles sin depender de su RLS) ----------
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and status = 'active'
$$;

-- Correo del usuario actual (enlaza la cuenta con el directorio de personal).
create or replace function public.current_email()
returns text language sql stable security definer set search_path = '' as $$
  select email from public.profiles where id = (select auth.uid()) and status = 'active'
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('teacher', 'admin', 'principal'), false)
$$;

create or replace function public.is_admin_or_principal()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('admin', 'principal'), false)
$$;

-- ¿El docente actual dicta en este curso?
create or replace function public.teaches_course(p_course text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teaching_assignments a where a.teacher_email = public.current_email() and a.course_id = p_course)
$$;

-- ¿La asignación (docente + materia + curso + periodo) es del docente actual?
create or replace function public.owns_assignment(p_assignment bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teaching_assignments a where a.id = p_assignment and a.teacher_email = public.current_email())
$$;

create or replace function public.owns_evaluation(p_evaluation bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.evaluations e join public.teaching_assignments a on a.id = e.assignment_id
    where e.id = p_evaluation and a.teacher_email = public.current_email()
  )
$$;

-- ¿El estudiante está en un curso del docente actual?
create or replace function public.teaches_student(p_student text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s join public.teaching_assignments a on a.course_id = s.course_id
    where s.id = p_student and a.teacher_email = public.current_email()
  )
$$;

-- ---------- Alta de perfiles: solo personal registrado por la institución ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.staff_directory;
begin
  select * into d from public.staff_directory where email = lower(new.email);
  if not found then
    raise exception 'Esta cuenta no está registrada por la institución. Solicita acceso a tu coordinación.';
  end if;
  insert into public.profiles (id, email, full_name, role) values (new.id, lower(new.email), d.full_name, d.role);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Integridad de notas ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create trigger grades_touch before update on public.grades for each row execute function public.touch_updated_at();
create trigger concepts_touch before update on public.period_concepts for each row execute function public.touch_updated_at();
create trigger medical_touch before update on public.student_medical for each row execute function public.touch_updated_at();

-- La nota original nunca se sobrescribe: cada cambio de valor queda en el historial.
create or replace function public.audit_grade_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.value is distinct from old.value then
    insert into public.grade_audit (grade_id, old_value, new_value, changed_by) values (old.id, old.value, new.value, (select auth.uid()));
  end if;
  return new;
end $$;

create trigger grades_audit after update on public.grades for each row execute function public.audit_grade_change();

-- Con la evaluación cerrada, una nota solo cambia por solicitud aprobada (Rectoría).
create or replace function public.block_closed_evaluation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() = 'teacher' and exists (select 1 from public.evaluations e where e.id = new.evaluation_id and e.status = 'cerrada') then
    raise exception 'La evaluación está cerrada. Solicita el cambio de nota a Rectoría.';
  end if;
  return new;
end $$;

create trigger grades_closed before insert or update on public.grades for each row execute function public.block_closed_evaluation();

-- Aprobar una solicitud aplica la nota nueva y deja constancia; el historial conserva la anterior.
create or replace function public.decide_grade_request(p_request bigint, p_decision public.request_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.grade_change_requests;
begin
  if public.current_app_role() <> 'principal' then raise exception 'Solo Rectoría decide las solicitudes.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decisión no válida.'; end if;
  select * into r from public.grade_change_requests where id = p_request for update;
  if not found or r.status <> 'pending' then raise exception 'La solicitud no está pendiente.'; end if;
  update public.grade_change_requests
     set status = p_decision, decided_by = (select auth.uid()), decided_at = now(), decision_note = p_note
   where id = p_request;
  insert into public.request_events (request_id, description, actor_id)
  values (p_request, case when p_decision = 'approved' then 'Aprobada' else 'Rechazada' end
                     || ' por ' || (select full_name from public.profiles where id = (select auth.uid()))
                     || coalesce(': ' || nullif(trim(p_note), ''), ''), (select auth.uid()));
end $$;

-- ---------- Permisos: nadie anónimo; el rol autenticado pasa por RLS ----------
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'staff_directory', 'profiles', 'grade_levels', 'courses', 'subjects', 'academic_periods', 'period_components',
    'students', 'guardians', 'student_medical', 'teaching_assignments', 'evaluations', 'grades', 'grade_audit',
    'recoveries', 'attendance', 'observations', 'period_concepts', 'grade_change_requests', 'request_events',
    'report_cards', 'privacy_policies', 'consents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant execute on function public.decide_grade_request(bigint, public.request_status, text) to authenticated;
grant execute on function public.current_app_role(), public.current_email(), public.is_staff(), public.is_admin_or_principal() to authenticated;

-- ---------- Políticas ----------
-- Directorio de personal: solo Secretaría lo gestiona.
create policy staff_directory_admin on public.staff_directory for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Perfiles: el personal ve nombres y roles; cada quien su propio perfil; Secretaría gestiona.
create policy profiles_read on public.profiles for select to authenticated using (public.is_staff() or id = (select auth.uid()));
create policy profiles_admin on public.profiles for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Estructura académica: lectura para el personal; escritura para Secretaría.
create policy grade_levels_read on public.grade_levels for select to authenticated using (public.is_staff());
create policy grade_levels_admin on public.grade_levels for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy courses_read on public.courses for select to authenticated using (public.is_staff());
create policy courses_admin on public.courses for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy subjects_read on public.subjects for select to authenticated using (public.is_staff());
create policy subjects_admin on public.subjects for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy periods_read on public.academic_periods for select to authenticated using (public.is_staff());
create policy periods_admin on public.academic_periods for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy components_read on public.period_components for select to authenticated using (public.is_staff());
create policy components_admin on public.period_components for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy assignments_read on public.teaching_assignments for select to authenticated using (public.is_staff());
create policy assignments_admin on public.teaching_assignments for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Estudiantes: Secretaría y Rectoría ven todos; el docente, solo los de sus cursos. Escribe Secretaría.
create policy students_read on public.students for select to authenticated using (public.is_admin_or_principal() or public.teaches_student(id));
create policy students_admin on public.students for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Acudientes: Secretaría y Rectoría.
create policy guardians_read on public.guardians for select to authenticated using (public.is_admin_or_principal());
create policy guardians_admin on public.guardians for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Salud: solo Secretaría y Rectoría (el docente nunca).
create policy medical_read on public.student_medical for select to authenticated using (public.is_admin_or_principal());
create policy medical_admin on public.student_medical for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Evaluaciones: el docente gestiona las de sus asignaciones; Secretaría y Rectoría consultan.
create policy evaluations_read on public.evaluations for select to authenticated using (public.is_admin_or_principal() or public.owns_assignment(assignment_id));
create policy evaluations_teacher on public.evaluations for all to authenticated using (public.owns_assignment(assignment_id)) with check (public.owns_assignment(assignment_id));

-- Notas: el docente las registra y verifica en sus evaluaciones; no se borran.
create policy grades_read on public.grades for select to authenticated using (public.is_admin_or_principal() or public.owns_evaluation(evaluation_id));
create policy grades_insert on public.grades for insert to authenticated with check (public.owns_evaluation(evaluation_id));
create policy grades_update on public.grades for update to authenticated using (public.owns_evaluation(evaluation_id)) with check (public.owns_evaluation(evaluation_id));

-- Historial de notas: solo lectura (lo escribe el disparador).
create policy grade_audit_read on public.grade_audit for select to authenticated
  using (public.is_admin_or_principal() or exists (select 1 from public.grades g where g.id = grade_id and public.owns_evaluation(g.evaluation_id)));

-- Recuperaciones, conceptos: del docente de la asignación; consulta para Secretaría y Rectoría.
create policy recoveries_read on public.recoveries for select to authenticated using (public.is_admin_or_principal() or public.owns_assignment(assignment_id));
create policy recoveries_teacher on public.recoveries for all to authenticated using (public.owns_assignment(assignment_id)) with check (public.owns_assignment(assignment_id));
create policy concepts_read on public.period_concepts for select to authenticated using (public.is_admin_or_principal() or public.owns_assignment(assignment_id));
create policy concepts_teacher on public.period_concepts for all to authenticated using (public.owns_assignment(assignment_id)) with check (public.owns_assignment(assignment_id));

-- Asistencia: el docente del curso la toma; consulta para Secretaría y Rectoría.
create policy attendance_read on public.attendance for select to authenticated using (public.is_admin_or_principal() or public.teaches_course(course_id));
create policy attendance_teacher on public.attendance for all to authenticated using (public.teaches_course(course_id)) with check (public.teaches_course(course_id));

-- Observador: lo escribe el personal (el docente, sobre sus estudiantes) y lo lee según su alcance.
create policy observations_read on public.observations for select to authenticated using (public.is_admin_or_principal() or public.teaches_student(student_id));
create policy observations_write on public.observations for insert to authenticated
  with check (author_id = (select auth.uid()) and (public.is_admin_or_principal() or public.teaches_student(student_id)));

-- Solicitudes de cambio de nota: el docente crea y ve las suyas; Rectoría decide (función); Secretaría consulta.
create policy requests_read on public.grade_change_requests for select to authenticated using (public.is_admin_or_principal() or teacher_email = public.current_email());
create policy requests_create on public.grade_change_requests for insert to authenticated
  with check (teacher_email = public.current_email() and status = 'pending' and public.teaches_student(student_id));
create policy request_events_read on public.request_events for select to authenticated
  using (public.is_admin_or_principal() or exists (select 1 from public.grade_change_requests r where r.id = request_id and r.teacher_email = public.current_email()));

-- Boletines: Secretaría los genera; Rectoría consulta.
create policy report_cards_read on public.report_cards for select to authenticated using (public.is_admin_or_principal());
create policy report_cards_admin on public.report_cards for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Privacidad: todos leen la política vigente; cada quien registra su propio consentimiento.
create policy policies_read on public.privacy_policies for select to authenticated using (true);
create policy consents_own on public.consents for select to authenticated using (user_id = (select auth.uid()));
create policy consents_insert on public.consents for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------- Fotos de exámenes: bucket privado ----------
insert into storage.buckets (id, name, public) values ('exam-photos', 'exam-photos', false) on conflict (id) do nothing;

-- Cada docente sube y lee solo dentro de su carpeta (<uid>/…); Rectoría y Secretaría consultan.
create policy exam_photos_teacher_write on storage.objects for insert to authenticated
  with check (bucket_id = 'exam-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy exam_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'exam-photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin_or_principal()));
