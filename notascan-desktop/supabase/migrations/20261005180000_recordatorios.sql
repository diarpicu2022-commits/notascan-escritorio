-- NotaScan · recordatorios de Rectoría al docente (paso 6b.4b, propuesta aprobada por Diego el 2026-10-05).
-- Rectoría envía un recordatorio desde Seguimiento docente; el docente lo ve en su Inicio hasta marcarlo como visto.
-- Quién lo envía lo pone la base (sent_by = auth.uid()), nunca el cliente.

create table public.teacher_reminders (
  id              bigint generated always as identity primary key,
  institution_id  uuid not null default public.default_institution() references public.institutions (id),
  teacher_email   text not null,
  message         text not null check (char_length(trim(message)) between 1 and 500),
  sent_by         uuid not null default auth.uid() references public.profiles (id),
  created_at      timestamptz not null default now(),
  seen_at         timestamptz
);
create index teacher_reminders_unseen on public.teacher_reminders (institution_id, teacher_email) where seen_at is null;

alter table public.teacher_reminders enable row level security;
grant select, insert on public.teacher_reminders to authenticated;

create policy teacher_reminders_mi_colegio on public.teacher_reminders as restrictive for all to authenticated
  using (institution_id = public.current_institution()) with check (institution_id = public.current_institution());

-- Rectoría envía, a nombre propio, solo a docentes de su directorio.
create policy teacher_reminders_send on public.teacher_reminders for insert to authenticated
  with check (public.current_app_role() = 'principal' and sent_by = (select auth.uid()) and seen_at is null
              and exists (select 1 from public.staff_directory d where d.email = teacher_email and d.role = 'teacher'));

-- Rectoría ve los de su colegio; el docente, solo los suyos.
create policy teacher_reminders_read on public.teacher_reminders for select to authenticated
  using (public.current_app_role() = 'principal' or teacher_email = public.current_email());

-- El docente marca como visto un recordatorio suyo (sin política de update: solo esta función toca seen_at).
create or replace function public.mark_reminder_seen(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.teacher_reminders set seen_at = now()
   where id = p_id and teacher_email = public.current_email() and institution_id = public.current_institution() and seen_at is null;
  if not found then raise exception 'El recordatorio no existe o ya se marcó como visto.'; end if;
end $$;
revoke execute on function public.mark_reminder_seen(bigint) from public, anon;
grant execute on function public.mark_reminder_seen(bigint) to authenticated;
