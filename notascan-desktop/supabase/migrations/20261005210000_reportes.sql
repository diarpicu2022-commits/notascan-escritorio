-- NotaScan · historial de reportes generados (paso 6c, 2026-10-05).
-- Guarda qué se generó (tipo, formato, título y parámetros), no el archivo: «Descargar» lo vuelve a generar con los
-- datos de ese momento, así un reporte nunca muestra notas que ya no son las vigentes. Cada persona ve los suyos.

create table public.generated_reports (
  id              bigint generated always as identity primary key,
  institution_id  uuid not null default public.default_institution() references public.institutions (id),
  author_id       uuid not null default auth.uid() references public.profiles (id),
  kind            text not null check (kind in ('course', 'student', 'evaluation', 'analytics')),
  format          text not null check (format in ('pdf', 'xlsx', 'csv')),
  title           text not null check (char_length(trim(title)) between 1 and 200),
  params          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index generated_reports_author on public.generated_reports (author_id, created_at desc);

alter table public.generated_reports enable row level security;
grant select, insert on public.generated_reports to authenticated;

create policy generated_reports_mi_colegio on public.generated_reports as restrictive for all to authenticated
  using (institution_id = public.current_institution()) with check (institution_id = public.current_institution());
create policy generated_reports_own_insert on public.generated_reports for insert to authenticated
  with check (author_id = (select auth.uid()) and public.current_app_role() in ('teacher', 'admin', 'principal'));
create policy generated_reports_own_read on public.generated_reports for select to authenticated
  using (author_id = (select auth.uid()));
