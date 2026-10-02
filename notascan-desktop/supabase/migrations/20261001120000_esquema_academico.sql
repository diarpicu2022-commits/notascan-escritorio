-- NotaScan · esquema académico (paso 6a, 2026-10-01).
-- Sigue el modelo de dominio de notascan-ui (types/index.d.ts) y sus reglas:
--   · La IA detecta, el docente verifica, el sistema guarda: una nota solo queda «verificada» con
--     valor 1.0–5.0 y con quién la verificó.
--   · La nota original nunca se sobrescribe: cada cambio de valor queda en grade_audit.
--   · Datos sensibles (salud) solo para Secretaría y Rectoría.
-- Los permisos por rol están en la migración siguiente (RLS).

-- ---------- Tipos ----------
create type public.app_role as enum ('teacher', 'admin', 'principal', 'student', 'guardian');
create type public.enrollment_status as enum ('active', 'pending', 'retired', 'archived');
create type public.record_status as enum ('active', 'draft', 'archived');
create type public.review_status as enum ('pending', 'verified', 'needs-review');
create type public.eval_kind as enum ('examen', 'taller', 'actividad');
create type public.eval_status as enum ('borrador', 'en-revision', 'cerrada');
create type public.period_status as enum ('draft', 'open', 'closed');
create type public.attendance_state as enum ('present', 'absent', 'late', 'excused');
create type public.observation_type as enum ('positive', 'neutral', 'attention');
create type public.concept_state as enum ('empty', 'ai', 'teacher', 'reviewed');
create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.report_card_status as enum ('pending', 'generated', 'blocked');

-- ---------- Personas y acceso ----------
-- La institución registra al personal (correo + rol) antes de que cree su acceso.
-- Nadie se asigna un rol a sí mismo.
create table public.staff_directory (
  email       text primary key check (email = lower(email)),
  full_name   text not null,
  role        public.app_role not null check (role in ('teacher', 'admin', 'principal')),
  area        text,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique check (email = lower(email)),
  full_name     text not null,
  role          public.app_role not null,
  status        text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- Estructura académica ----------
create table public.grade_levels (
  id      text primary key,                 -- '6', '7', … '11'
  name    text not null,                    -- 'Sexto'
  level   text not null check (level in ('Básica primaria', 'Básica secundaria', 'Media')),
  status  public.record_status not null default 'active'
);

create table public.courses (
  id              text primary key,         -- '7A'
  grade_level_id  text not null references public.grade_levels (id),
  name            text not null,
  -- Enlazado al directorio de personal: Secretaría lo asigna aunque el docente aún no tenga cuenta.
  director_email  text references public.staff_directory (email) on update cascade on delete set null,
  capacity        smallint not null default 35 check (capacity > 0),
  status          public.record_status not null default 'active'
);

create table public.subjects (
  id        text primary key,               -- 'mat'
  name      text not null unique,
  code      text not null unique,           -- 'MAT-01'
  category  text not null,
  status    public.record_status not null default 'active'
);

create table public.academic_periods (
  id            text primary key,           -- '2026-p3'
  year          smallint not null,
  position      smallint not null check (position between 1 and 6),
  name          text not null,              -- 'Periodo 3'
  open_date     date not null,
  close_date    date not null,
  status        public.period_status not null default 'draft',
  final_weight  numeric(5, 2) not null default 25 check (final_weight between 0 and 100),
  unique (year, position),
  check (close_date > open_date)
);

-- Cómo se compone la nota de cada periodo (Actividades 40 %, Exámenes 30 %…).
create table public.period_components (
  id         bigint generated always as identity primary key,
  period_id  text not null references public.academic_periods (id) on delete cascade,
  name       text not null,
  weight     numeric(5, 2) not null check (weight between 0 and 100),
  position   smallint not null default 1
);

-- ---------- Estudiantes ----------
create table public.students (
  id             text primary key,          -- código estudiantil, p. ej. '20261175'
  first_names    text not null,
  last_names     text not null,
  full_name      text generated always as (first_names || ' ' || last_names) stored,
  doc_type       text not null,
  document       text not null unique,
  birth_date     date,
  course_id      text references public.courses (id),
  status         public.enrollment_status not null default 'active',
  enrolled_on    date not null default current_date,
  -- Paz y salvos: si alguno falta, boletines y reportes quedan bloqueados para el acudiente.
  library_ok     boolean not null default true,
  fees_ok        boolean not null default true,
  documents_ok   boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.guardians (
  id            bigint generated always as identity primary key,
  student_id    text not null references public.students (id) on delete cascade,
  full_name     text not null,
  relationship  text not null,
  document      text,
  phone         text not null,
  email         text check (email is null or email = lower(email)),
  is_primary    boolean not null default true
);

-- Dato sensible (salud): tabla aparte para poder restringirla solo a Secretaría y Rectoría.
create table public.student_medical (
  student_id         text primary key references public.students (id) on delete cascade,
  allergies          text,
  conditions         text,
  notes              text,
  emergency_contact  text,
  emergency_phone    text,
  updated_at         timestamptz not null default now()
);

-- ---------- Docencia ----------
-- Malla curricular: Docente + Materia + Curso + Periodo, sin choques. El docente se enlaza por su
-- correo del directorio: la malla se arma antes de que active su cuenta.
create table public.teaching_assignments (
  id             bigint generated always as identity primary key,
  teacher_email  text not null references public.staff_directory (email) on update cascade,
  subject_id  text not null references public.subjects (id),
  course_id   text not null references public.courses (id),
  period_id   text not null references public.academic_periods (id),
  unique (course_id, subject_id, period_id)
);

create table public.evaluations (
  id             bigint generated always as identity primary key,
  assignment_id  bigint not null references public.teaching_assignments (id) on delete cascade,
  name           text not null,
  kind           public.eval_kind not null,
  weight         numeric(5, 2) not null check (weight > 0 and weight <= 100),
  status         public.eval_status not null default 'borrador',
  due_date       date,
  created_at     timestamptz not null default now()
);

create table public.grades (
  id             bigint generated always as identity primary key,
  evaluation_id  bigint not null references public.evaluations (id) on delete cascade,
  student_id     text not null references public.students (id),
  detected       numeric(2, 1) check (detected is null or detected between 1 and 5),   -- lo que leyó la IA
  confidence     smallint check (confidence between 0 and 100),
  value          numeric(2, 1) check (value is null or value between 1 and 5),         -- la nota vigente
  status         public.review_status not null default 'pending',
  photo_path     text,                       -- objeto en el bucket privado exam-photos
  verified_by    uuid references public.profiles (id),
  verified_at    timestamptz,
  updated_at     timestamptz not null default now(),
  unique (evaluation_id, student_id),
  -- La IA detecta; el docente verifica: «verificada» exige nota válida y quién la verificó.
  constraint verified_needs_teacher check (status <> 'verified' or (value is not null and verified_by is not null and verified_at is not null))
);

-- La nota original nunca se sobrescribe: historial de cada cambio de valor.
create table public.grade_audit (
  id          bigint generated always as identity primary key,
  grade_id    bigint not null references public.grades (id) on delete cascade,
  old_value   numeric(2, 1),
  new_value   numeric(2, 1),
  changed_by  uuid references public.profiles (id),
  changed_at  timestamptz not null default now()
);

create table public.recoveries (
  id             bigint generated always as identity primary key,
  student_id     text not null references public.students (id),
  assignment_id  bigint not null references public.teaching_assignments (id) on delete cascade,
  original       numeric(2, 1) not null check (original between 1 and 5),
  recovery       numeric(2, 1) check (recovery is null or recovery between 1 and 5),
  result         text not null default 'pending' check (result in ('pending', 'passed', 'failed')),
  recorded_by    uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  unique (student_id, assignment_id)
);

create table public.attendance (
  id           bigint generated always as identity primary key,
  course_id    text not null references public.courses (id),
  student_id   text not null references public.students (id),
  class_date   date not null,
  slot         smallint not null default 1,   -- hora de clase del día
  state        public.attendance_state not null,
  note         text,
  recorded_by  uuid references public.profiles (id),
  unique (student_id, course_id, class_date, slot)
);

create table public.observations (
  id          bigint generated always as identity primary key,
  student_id  text not null references public.students (id),
  type        public.observation_type not null,
  title       text not null,
  context     text,
  author_id   uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

-- Concepto del periodo: la IA propone un borrador; el docente decide el texto final.
create table public.period_concepts (
  id             bigint generated always as identity primary key,
  student_id     text not null references public.students (id),
  assignment_id  bigint not null references public.teaching_assignments (id) on delete cascade,
  text           text not null default '',
  state          public.concept_state not null default 'empty',
  reviewed_by    uuid references public.profiles (id),
  updated_at     timestamptz not null default now(),
  unique (student_id, assignment_id)
);

-- ---------- Rectoría: cambios de nota después del cierre ----------
create table public.grade_change_requests (
  id             bigint generated always as identity primary key,
  teacher_email  text not null references public.staff_directory (email) on update cascade,
  student_id     text not null references public.students (id),
  subject_id     text not null references public.subjects (id),
  course_id      text not null references public.courses (id),
  from_value     numeric(2, 1) not null check (from_value between 1 and 5),
  to_value       numeric(2, 1) not null check (to_value between 1 and 5),
  reason         text not null,
  detail         text,
  status         public.request_status not null default 'pending',
  decided_by     uuid references public.profiles (id),
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now(),
  -- Rechazar exige motivo.
  constraint rejection_needs_reason check (status <> 'rejected' or coalesce(trim(decision_note), '') <> '')
);

create table public.request_events (
  id          bigint generated always as identity primary key,
  request_id  bigint not null references public.grade_change_requests (id) on delete cascade,
  description text not null,
  actor_id    uuid references public.profiles (id),
  at          timestamptz not null default now()
);

-- ---------- Boletines ----------
create table public.report_cards (
  id            bigint generated always as identity primary key,
  student_id    text not null references public.students (id),
  period_id     text not null references public.academic_periods (id),
  status        public.report_card_status not null default 'pending',
  generated_by  uuid references public.profiles (id),
  generated_at  timestamptz,
  file_path     text,
  unique (student_id, period_id)
);

-- ---------- Privacidad (Ley 1581 de 2012) ----------
create table public.privacy_policies (
  version       text primary key,           -- '2026.1'
  published_on  date not null,
  url           text not null
);

create table public.consents (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  policy_version  text not null references public.privacy_policies (version),
  accepted_at     timestamptz not null default now(),
  unique (user_id, policy_version)
);

-- ---------- Índices de las consultas frecuentes ----------
create index on public.students (course_id);
create index on public.teaching_assignments (teacher_email);
create index on public.evaluations (assignment_id);
create index on public.grades (student_id);
create index on public.attendance (course_id, class_date);
create index on public.observations (student_id, created_at desc);
create index on public.grade_change_requests (status, created_at desc);
