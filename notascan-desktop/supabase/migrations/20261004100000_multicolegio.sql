-- NotaScan · multicolegio (paso 7a, 2026-10-04). Decisiones de Diego (2026-10-03):
--   · Una sola base; cada fila pertenece a un colegio y el RLS impide ver otro colegio.
--   · Diego (rol «platform») da de alta los colegios, carga su identidad y ve cifras agregadas y uso, **nunca datos
--     personales de estudiantes**: el rol platform no pasa las políticas de los datos de los colegios.
--   · Un colegio suspendido no puede entrar.
-- Los datos existentes (el colegio de demostración) quedan en el primer colegio.
--
-- Cómo se separa: cada tabla de un colegio lleva institution_id (por defecto, el del usuario) y una política
-- RESTRICTIVA «solo mi colegio» que se suma a las políticas por rol que ya existen, sin reescribirlas.
-- Las tablas cuyo id es un código legible (grado «7», curso «7A», materia «mat», periodo «2026-p3») pasan a clave
-- (institution_id, id): dos colegios pueden tener su 7A. El código estudiantil sigue siendo único en la plataforma.

-- ---------- Colegios ----------
create table public.institutions (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  short_name       text not null default '' check (char_length(short_name) <= 3),   -- iniciales del escudo si no hay logo
  city             text not null default '',
  department       text not null default '',
  resolution       text not null default '',
  dane             text not null default '' check (dane = '' or dane ~ '^[0-9]{12}$'),
  logo_path        text,                       -- objeto en el bucket público institution-logos
  status           text not null default 'implementation' check (status in ('implementation', 'active', 'suspended')),
  plan             text not null default '',
  contract_until   date,
  created_at       timestamptz not null default now()
);

-- El colegio de demostración recibe todos los datos que ya existen.
insert into public.institutions (id, name, short_name, city, department, resolution, dane, status)
values ('00000000-0000-4000-8000-000000000001', 'Colegio Los Andes', 'LA', 'Pasto', 'Nariño', 'Resolución 0123 de 2015', '152001000000', 'active');

-- Quién administra la plataforma (se registra a mano, por SQL: nadie se asigna este rol desde la app).
create table public.platform_admins (
  email       text primary key check (email = lower(email)),
  full_name   text not null,
  created_at  timestamptz not null default now()
);

-- ---------- Perfiles y directorio ----------
alter table public.profiles add column institution_id uuid references public.institutions (id);
update public.profiles set institution_id = '00000000-0000-4000-8000-000000000001' where role <> 'platform';

alter table public.staff_directory add column institution_id uuid references public.institutions (id);
update public.staff_directory set institution_id = '00000000-0000-4000-8000-000000000001';
alter table public.staff_directory alter column institution_id set not null;

-- Colegio del usuario actual (null para la plataforma y sin sesión).
create or replace function public.current_institution()
returns uuid language sql stable security definer set search_path = '' as $$
  select institution_id from public.profiles where id = (select auth.uid()) and status = 'active'
$$;

-- Rol del usuario: nulo si su cuenta o su colegio no están activos (un colegio suspendido no entra).
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p left join public.institutions i on i.id = p.institution_id
  where p.id = (select auth.uid()) and p.status = 'active' and (p.role = 'platform' or i.status <> 'suspended')
$$;

-- Colegio por defecto al insertar: el del usuario; sin sesión (semilla, mantenimiento) y con un solo colegio en la
-- base, ese colegio. Con varios colegios y sin sesión hay que indicarlo: nunca se adivina.
create or replace function public.default_institution()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_institution(),
    case when (select auth.uid()) is null and (select count(*) from public.institutions) = 1 then (select id from public.institutions limit 1) end)
$$;

alter table public.staff_directory alter column institution_id set default public.default_institution();

-- Alta de perfiles: la plataforma desde platform_admins; el personal desde el directorio de su colegio.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.staff_directory; pa public.platform_admins;
begin
  select * into pa from public.platform_admins where email = lower(new.email);
  if found then
    insert into public.profiles (id, email, full_name, role, institution_id) values (new.id, lower(new.email), pa.full_name, 'platform', null);
    return new;
  end if;
  select * into d from public.staff_directory where email = lower(new.email);
  if not found then
    raise exception 'Esta cuenta no está registrada por la institución. Solicita acceso a tu coordinación.';
  end if;
  insert into public.profiles (id, email, full_name, role, institution_id) values (new.id, lower(new.email), d.full_name, d.role, d.institution_id);
  return new;
end $$;

-- ---------- institution_id en cada tabla de un colegio ----------
do $$
declare t text;
begin
  foreach t in array array[
    'grade_levels', 'courses', 'subjects', 'academic_periods', 'period_components', 'students', 'guardians', 'student_medical',
    'teaching_assignments', 'evaluations', 'grades', 'grade_audit', 'recoveries', 'attendance', 'observations', 'period_concepts',
    'grade_change_requests', 'request_events', 'report_cards', 'director_messages'
  ] loop
    execute format('alter table public.%I add column institution_id uuid references public.institutions (id)', t);
    execute format('update public.%I set institution_id = %L', t, '00000000-0000-4000-8000-000000000001');
    execute format('alter table public.%I alter column institution_id set not null', t);
    execute format('alter table public.%I alter column institution_id set default public.default_institution()', t);
    execute format('create index on public.%I (institution_id)', t);
  end loop;
end $$;

-- ---------- Códigos legibles: clave (colegio, código) ----------
-- Primero se quitan las referencias, luego las claves, y se vuelven a crear con el colegio.
alter table public.courses drop constraint courses_grade_level_id_fkey;
alter table public.students drop constraint students_course_id_fkey;
alter table public.teaching_assignments drop constraint teaching_assignments_course_id_fkey;
alter table public.teaching_assignments drop constraint teaching_assignments_subject_id_fkey;
alter table public.teaching_assignments drop constraint teaching_assignments_period_id_fkey;
alter table public.attendance drop constraint attendance_course_id_fkey;
alter table public.grade_change_requests drop constraint grade_change_requests_course_id_fkey;
alter table public.grade_change_requests drop constraint grade_change_requests_subject_id_fkey;
alter table public.period_components drop constraint period_components_period_id_fkey;
alter table public.report_cards drop constraint report_cards_period_id_fkey;
alter table public.director_messages drop constraint director_messages_period_id_fkey;

alter table public.grade_levels drop constraint grade_levels_pkey, add primary key (institution_id, id);
alter table public.courses drop constraint courses_pkey, add primary key (institution_id, id);
alter table public.subjects drop constraint subjects_pkey, add primary key (institution_id, id);
alter table public.academic_periods drop constraint academic_periods_pkey, add primary key (institution_id, id);

alter table public.courses add foreign key (institution_id, grade_level_id) references public.grade_levels (institution_id, id);
alter table public.students add foreign key (institution_id, course_id) references public.courses (institution_id, id);
alter table public.teaching_assignments add foreign key (institution_id, course_id) references public.courses (institution_id, id);
alter table public.teaching_assignments add foreign key (institution_id, subject_id) references public.subjects (institution_id, id);
alter table public.teaching_assignments add foreign key (institution_id, period_id) references public.academic_periods (institution_id, id);
alter table public.attendance add foreign key (institution_id, course_id) references public.courses (institution_id, id);
alter table public.grade_change_requests add foreign key (institution_id, course_id) references public.courses (institution_id, id);
alter table public.grade_change_requests add foreign key (institution_id, subject_id) references public.subjects (institution_id, id);
alter table public.period_components add foreign key (institution_id, period_id) references public.academic_periods (institution_id, id) on delete cascade;
alter table public.report_cards add foreign key (institution_id, period_id) references public.academic_periods (institution_id, id);
alter table public.director_messages add foreign key (institution_id, period_id) references public.academic_periods (institution_id, id) on delete cascade;

-- Únicos que pasan a ser por colegio.
alter table public.subjects drop constraint subjects_name_key, add unique (institution_id, name);
alter table public.subjects drop constraint subjects_code_key, add unique (institution_id, code);
alter table public.academic_periods drop constraint academic_periods_year_position_key, add unique (institution_id, year, position);
alter table public.students drop constraint students_document_key, add unique (institution_id, document);
alter table public.teaching_assignments drop constraint teaching_assignments_course_id_subject_id_period_id_key, add unique (institution_id, course_id, subject_id, period_id);
drop index public.academic_periods_one_open;
create unique index academic_periods_one_open on public.academic_periods (institution_id) where status = 'open';

-- ---------- Política restrictiva «solo mi colegio» (se suma a las que ya hay) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'staff_directory', 'grade_levels', 'courses', 'subjects', 'academic_periods', 'period_components', 'students', 'guardians', 'student_medical',
    'teaching_assignments', 'evaluations', 'grades', 'grade_audit', 'recoveries', 'attendance', 'observations', 'period_concepts',
    'grade_change_requests', 'request_events', 'report_cards', 'director_messages'
  ] loop
    execute format('create policy %I on public.%I as restrictive for all to authenticated using (institution_id = public.current_institution()) with check (institution_id = public.current_institution())', t || '_mi_colegio', t);
  end loop;
end $$;

-- Perfiles: los del propio colegio y el propio (la plataforma solo ve el suyo).
create policy profiles_mi_colegio on public.profiles as restrictive for all to authenticated
  using (id = (select auth.uid()) or institution_id = public.current_institution())
  with check (id = (select auth.uid()) or institution_id = public.current_institution());

-- ---------- Colegios: la plataforma los gestiona; cada colegio lee el suyo ----------
alter table public.institutions enable row level security;
alter table public.platform_admins enable row level security;
grant select, insert, update on public.institutions to authenticated;
create policy institutions_platform on public.institutions for all to authenticated
  using (public.current_app_role() = 'platform') with check (public.current_app_role() = 'platform');
create policy institutions_own on public.institutions for select to authenticated using (id = public.current_institution());
-- platform_admins: sin políticas para authenticated (solo SQL de mantenimiento).

-- ---------- Funciones que cruzan tablas: también por colegio ----------
create or replace function public.teaches_student(p_student text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s join public.teaching_assignments a on a.course_id = s.course_id and a.institution_id = s.institution_id
    where s.id = p_student and a.teacher_email = public.current_email()
  )
$$;

create or replace function public.directs_student(p_student text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s join public.courses c on c.id = s.course_id and c.institution_id = s.institution_id
    where s.id = p_student and c.director_email = public.current_email()
  )
$$;

create or replace function public.audit_grade_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.value is distinct from old.value then
    insert into public.grade_audit (grade_id, old_value, new_value, changed_by, institution_id) values (old.id, old.value, new.value, (select auth.uid()), old.institution_id);
  end if;
  return new;
end $$;

create or replace function public.decide_grade_request(p_request bigint, p_decision public.request_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.grade_change_requests;
begin
  if public.current_app_role() is distinct from 'principal' then raise exception 'Solo Rectoría decide las solicitudes.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decisión no válida.'; end if;
  select * into r from public.grade_change_requests where id = p_request and institution_id = public.current_institution() for update;
  if not found or r.status <> 'pending' then raise exception 'La solicitud no está pendiente.'; end if;
  update public.grade_change_requests
     set status = p_decision, decided_by = (select auth.uid()), decided_at = now(), decision_note = p_note
   where id = p_request;
  insert into public.request_events (request_id, description, actor_id, institution_id)
  values (p_request, case when p_decision = 'approved' then 'Aprobada' else 'Rechazada' end
                     || ' por ' || (select full_name from public.profiles where id = (select auth.uid()))
                     || coalesce(': ' || nullif(trim(p_note), ''), ''), (select auth.uid()), r.institution_id);
end $$;

create or replace function public.save_period(p_id text, p_open date, p_close date, p_status public.period_status, p_components jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare total numeric; inst uuid := public.current_institution();
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría configura los periodos.'; end if;
  select coalesce(sum((c ->> 'weight')::numeric), 0) into total from jsonb_array_elements(p_components) c;
  if total <> 100 then raise exception 'La distribución de porcentajes debe sumar 100%%.'; end if;
  update public.academic_periods set open_date = p_open, close_date = p_close, status = p_status where id = p_id and institution_id = inst;
  if not found then raise exception 'El periodo no existe.'; end if;
  delete from public.period_components where period_id = p_id and institution_id = inst;
  insert into public.period_components (period_id, name, weight, position, institution_id)
  select p_id, c ->> 'name', (c ->> 'weight')::numeric, ord::smallint, inst from jsonb_array_elements(p_components) with ordinality as t(c, ord);
end $$;

create or replace function public.enroll_student(p jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  yr text := coalesce(nullif(p ->> 'year', ''), extract(year from current_date)::text);
  inst uuid := public.current_institution();
  new_id text;
  med boolean;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría registra matrículas.'; end if;
  if coalesce(trim(p ->> 'first_names'), '') = '' or coalesce(trim(p ->> 'last_names'), '') = '' or coalesce(trim(p ->> 'document'), '') = '' then
    raise exception 'Faltan nombres, apellidos o documento.';
  end if;
  if exists (select 1 from public.students s where s.document = trim(p ->> 'document') and s.institution_id = inst) then
    raise exception 'Ya existe un estudiante con el documento %.', trim(p ->> 'document');
  end if;
  if not exists (select 1 from public.courses c where c.id = p ->> 'course_id' and c.institution_id = inst and c.status <> 'archived') then
    raise exception 'El curso % no existe en la estructura académica.', p ->> 'course_id';
  end if;
  -- El código estudiantil es único en toda la plataforma (candado: dos matrículas a la vez no toman el mismo).
  perform pg_advisory_xact_lock(hashtext('notascan.enroll'));
  new_id := public.next_student_code(yr);

  insert into public.students (id, first_names, last_names, doc_type, document, birth_date, course_id, status, enrolled_on, institution_id)
  values (new_id, trim(p ->> 'first_names'), trim(p ->> 'last_names'), p ->> 'doc_type', trim(p ->> 'document'),
          nullif(p ->> 'birth_date', '')::date, p ->> 'course_id', coalesce(nullif(p ->> 'status', ''), 'active')::public.enrollment_status, current_date, inst);

  if coalesce(trim(p ->> 'guardian_name'), '') <> '' then
    insert into public.guardians (student_id, full_name, relationship, document, phone, email, is_primary, institution_id)
    values (new_id, trim(p ->> 'guardian_name'), coalesce(nullif(p ->> 'guardian_rel', ''), 'Acudiente'), nullif(trim(p ->> 'guardian_doc'), ''),
            coalesce(trim(p ->> 'guardian_phone'), ''), nullif(lower(trim(p ->> 'guardian_email')), ''), true, inst);
  end if;

  med := coalesce(nullif(trim(p ->> 'allergies'), ''), nullif(trim(p ->> 'conditions'), ''), nullif(trim(p ->> 'medical_notes'), ''),
                  nullif(trim(p ->> 'emergency_contact'), ''), nullif(trim(p ->> 'emergency_phone'), '')) is not null;
  if med then
    insert into public.student_medical (student_id, allergies, conditions, notes, emergency_contact, emergency_phone, institution_id)
    values (new_id, nullif(trim(p ->> 'allergies'), ''), nullif(trim(p ->> 'conditions'), ''), nullif(trim(p ->> 'medical_notes'), ''),
            nullif(trim(p ->> 'emergency_contact'), ''), nullif(trim(p ->> 'emergency_phone'), ''), inst);
  end if;
  return new_id;
end $$;

-- Siguiente código estudiantil del año en toda la plataforma. Solo devuelve ese número: enroll_student corre con el
-- RLS de Secretaría y no vería los códigos de otros colegios.
create or replace function public.next_student_code(p_year text)
returns text language sql stable security definer set search_path = '' as $$
  select (coalesce(max(id::bigint), (p_year || '0000')::bigint) + 1)::text from public.students where id ~ ('^' || p_year || '[0-9]{4}$')
$$;

create or replace function public.director_overview(p_period text)
returns table (student_id text, full_name text, course_id text, subjects jsonb, absences integer, message text, message_state public.concept_state)
language sql stable security definer set search_path = '' as $$
  with inst as (select public.current_institution() id),
  mine as (
    select s.id, s.full_name, s.course_id from public.students s join public.courses c on c.id = s.course_id and c.institution_id = s.institution_id
    where c.director_email = public.current_email() and s.status in ('active', 'pending') and s.institution_id = (select id from inst)
  ), per as (select open_date, close_date from public.academic_periods where id = p_period and institution_id = (select id from inst)),
  subj as (
    select g.student_id, sj.name subject, round(sum(g.value * e.weight) / nullif(sum(e.weight), 0), 1) grade
    from public.grades g
    join public.evaluations e on e.id = g.evaluation_id
    join public.teaching_assignments a on a.id = e.assignment_id
    join public.subjects sj on sj.id = a.subject_id and sj.institution_id = a.institution_id
    where g.status = 'verified' and a.period_id = p_period and a.institution_id = (select id from inst) and g.student_id in (select id from mine)
    group by g.student_id, sj.name
  )
  select m.id, m.full_name, m.course_id,
    coalesce((select jsonb_agg(jsonb_build_object('subject', x.subject, 'grade', x.grade) order by x.subject) from subj x where x.student_id = m.id), '[]'::jsonb),
    (select count(*)::int from public.attendance at, per where at.student_id = m.id and at.state = 'absent' and at.class_date between per.open_date and per.close_date),
    dm.text, dm.state
  from mine m left join public.director_messages dm on dm.student_id = m.id and dm.period_id = p_period
  order by m.course_id, m.full_name
$$;

-- Vista de estudiantes: el curso se une dentro del mismo colegio.
create or replace view public.student_overview with (security_invoker = true) as
select
  s.id, s.first_names, s.last_names, s.full_name, s.doc_type, s.document, s.course_id, c.grade_level_id, s.status, s.enrolled_on,
  s.library_ok, s.fees_ok, s.documents_ok,
  g.full_name as guardian_name, g.relationship as guardian_rel, g.phone as guardian_phone,
  (select round(avg(gr.value), 1) from public.grades gr where gr.student_id = s.id and gr.status = 'verified') as avg_grade,
  (select round(100.0 * count(*) filter (where a.state in ('present', 'late', 'excused')) / nullif(count(*), 0))
     from public.attendance a where a.student_id = s.id) as attendance_pct
from public.students s
left join public.courses c on c.id = s.course_id and c.institution_id = s.institution_id
left join lateral (
  select gd.full_name, gd.relationship, gd.phone from public.guardians gd
  where gd.student_id = s.id order by gd.is_primary desc, gd.id limit 1
) g on true;

-- ---------- Estadísticas de la plataforma: solo cifras, por colegio ----------
-- Ningún nombre, documento ni nota individual sale de aquí (decisión de privacidad de Diego).
create or replace function public.platform_stats()
returns table (
  institution_id uuid, students integer, teachers integer, accounts integer, last_seen timestamptz,
  grades_7d integer, grades_30d integer, attendance_7d integer, observations_30d integer, weekly jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'platform' then raise exception 'Solo la plataforma consulta estas cifras.'; end if;
  return query
  select i.id,
    (select count(*)::int from public.students s where s.institution_id = i.id and s.status = 'active'),
    (select count(*)::int from public.staff_directory d where d.institution_id = i.id and d.role = 'teacher'),
    (select count(*)::int from public.profiles p where p.institution_id = i.id and p.status = 'active'),
    (select max(p.last_seen_at) from public.profiles p where p.institution_id = i.id),
    (select count(*)::int from public.grades g where g.institution_id = i.id and g.status = 'verified' and g.verified_at >= now() - interval '7 days'),
    (select count(*)::int from public.grades g where g.institution_id = i.id and g.status = 'verified' and g.verified_at >= now() - interval '30 days'),
    (select count(*)::int from public.attendance a where a.institution_id = i.id and a.class_date >= current_date - 7),
    (select count(*)::int from public.observations o where o.institution_id = i.id and o.created_at >= now() - interval '30 days'),
    -- Actividad de las últimas 8 semanas (notas verificadas + asistencia tomada), de la más antigua a la actual.
    (select jsonb_agg(w.n order by w.k) from (
       select k, (select count(*) from public.grades g where g.institution_id = i.id and g.status = 'verified'
                    and g.verified_at >= date_trunc('week', now()) - make_interval(weeks => k) and g.verified_at < date_trunc('week', now()) - make_interval(weeks => k - 1))
               + (select count(*) from public.attendance a where a.institution_id = i.id
                    and a.class_date >= (date_trunc('week', now()) - make_interval(weeks => k))::date and a.class_date < (date_trunc('week', now()) - make_interval(weeks => k - 1))::date) as n
       from generate_series(7, 0, -1) k) w)
  from public.institutions i;
end $$;

-- ---------- Logos: bucket público; solo la plataforma los sube ----------
insert into storage.buckets (id, name, public) values ('institution-logos', 'institution-logos', true) on conflict (id) do nothing;
create policy institution_logos_platform_write on storage.objects for insert to authenticated
  with check (bucket_id = 'institution-logos' and public.current_app_role() = 'platform');
create policy institution_logos_platform_update on storage.objects for update to authenticated
  using (bucket_id = 'institution-logos' and public.current_app_role() = 'platform');

-- ---------- Permisos de las funciones nuevas o reescritas ----------
revoke execute on function public.current_institution(), public.platform_stats(), public.next_student_code(text) from public, anon;
grant execute on function public.current_institution(), public.platform_stats(), public.next_student_code(text) to authenticated;
revoke execute on function public.default_institution() from public, anon;
grant execute on function public.default_institution() to authenticated;
revoke execute on function public.audit_grade_change(), public.handle_new_user() from public, anon, authenticated;
