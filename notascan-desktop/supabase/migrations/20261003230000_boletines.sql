-- NotaScan · boletines (paso 6b.3c, 2026-10-03).
--   · Mensaje del director de grupo: lo escribe el director (la IA solo propone un borrador que él revisa).
--     Solo llega al boletín si está escrito o revisado por él.
--   · El director ve un resumen de su grupo (promedio, materias y faltas del periodo) aunque no dicte todas las
--     materias: se entrega con una función que comprueba que es el director, sin abrirle las tablas de notas.
--   · Boletín generado: quién y cuándo lo pone la base.

-- ---------- ¿El docente actual dirige el curso de este estudiante? ----------
create or replace function public.directs_student(p_student text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s join public.courses c on c.id = s.course_id
    where s.id = p_student and c.director_email = public.current_email()
  )
$$;

-- ---------- Mensaje del director ----------
create table public.director_messages (
  id          bigint generated always as identity primary key,
  student_id  text not null references public.students (id) on delete cascade,
  period_id   text not null references public.academic_periods (id) on delete cascade,
  text        text not null default '',
  state       public.concept_state not null default 'empty',
  author_id   uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  unique (student_id, period_id)
);

alter table public.director_messages enable row level security;
grant select, insert, update on public.director_messages to authenticated;

create policy director_messages_read on public.director_messages for select to authenticated
  using (public.is_admin_or_principal() or public.directs_student(student_id));
create policy director_messages_write on public.director_messages for insert to authenticated
  with check (public.directs_student(student_id));
create policy director_messages_update on public.director_messages for update to authenticated
  using (public.directs_student(student_id)) with check (public.directs_student(student_id));

create or replace function public.stamp_director_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  new.updated_at := now();
  if me is not null then new.author_id := case when new.state in ('teacher', 'reviewed') then me end; end if;
  return new;
end $$;

create trigger director_messages_stamp before insert or update on public.director_messages
  for each row execute function public.stamp_director_message();

-- ---------- Resumen del grupo para el director (solo sus estudiantes) ----------
-- Por estudiante: nota de cada materia en el periodo (promedio ponderado de notas verificadas), faltas del periodo
-- y su mensaje si existe.
create or replace function public.director_overview(p_period text)
returns table (student_id text, full_name text, course_id text, subjects jsonb, absences integer, message text, message_state public.concept_state)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select s.id, s.full_name, s.course_id from public.students s join public.courses c on c.id = s.course_id
    where c.director_email = public.current_email() and s.status in ('active', 'pending')
  ), per as (select open_date, close_date from public.academic_periods where id = p_period),
  subj as (
    select g.student_id, sj.name subject, round(sum(g.value * e.weight) / nullif(sum(e.weight), 0), 1) grade
    from public.grades g
    join public.evaluations e on e.id = g.evaluation_id
    join public.teaching_assignments a on a.id = e.assignment_id
    join public.subjects sj on sj.id = a.subject_id
    where g.status = 'verified' and a.period_id = p_period and g.student_id in (select id from mine)
    group by g.student_id, sj.name
  )
  select m.id, m.full_name, m.course_id,
    coalesce((select jsonb_agg(jsonb_build_object('subject', x.subject, 'grade', x.grade) order by x.subject) from subj x where x.student_id = m.id), '[]'::jsonb),
    (select count(*)::int from public.attendance at, per where at.student_id = m.id and at.state = 'absent' and at.class_date between per.open_date and per.close_date),
    dm.text, dm.state
  from mine m left join public.director_messages dm on dm.student_id = m.id and dm.period_id = p_period
  order by m.course_id, m.full_name
$$;

-- ---------- Boletín generado: firma de la base ----------
create or replace function public.stamp_report_card()
returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if new.status = 'generated' and me is not null then new.generated_by := me; new.generated_at := now(); end if;
  return new;
end $$;

create trigger report_cards_stamp before insert or update on public.report_cards
  for each row execute function public.stamp_report_card();

revoke execute on function public.stamp_director_message(), public.stamp_report_card() from public, anon, authenticated;
revoke execute on function public.directs_student(text), public.director_overview(text) from public, anon;
grant execute on function public.directs_student(text), public.director_overview(text) to authenticated;
