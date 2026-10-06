-- NotaScan · autorización del acudiente y aceptación de la política (paso 6g, 2026-10-06).
-- Ley 1581 de 2012 (arts. 5–7) y Decreto 1377 de 2013 (art. 12): los datos de menores se tratan con autorización previa
-- de su representante legal, y los de salud (sensibles) con autorización explícita y facultativa. El colegio conserva
-- la prueba: Secretaría registra la autorización firmada con su versión, fecha y forma de entrega.
-- Reglas en la base (no solo en la pantalla): no se matricula sin autorización registrada y no se guardan datos de salud
-- sin autorización para ellos. Se comprueban al confirmar la transacción, así la matrícula y su autorización van juntas.

insert into public.privacy_policies (version, published_on, url)
values ('2026.1', '2026-10-06', 'docs/legal/politica-de-tratamiento-de-datos.md')
on conflict (version) do update set published_on = excluded.published_on, url = excluded.url;

-- Versión vigente de la política (la más reciente ya publicada).
create or replace function public.current_policy_version()
returns text language sql stable security definer set search_path = '' as $$
  select version from public.privacy_policies where published_on <= current_date order by published_on desc limit 1
$$;
revoke execute on function public.current_policy_version() from public, anon;
grant execute on function public.current_policy_version() to authenticated;

create table public.guardian_authorizations (
  id              bigint generated always as identity primary key,
  institution_id  uuid not null default public.default_institution() references public.institutions (id),
  student_id      text not null references public.students (id) on delete cascade,
  policy_version  text not null references public.privacy_policies (version),
  guardian_name   text not null check (char_length(trim(guardian_name)) between 1 and 160),
  relationship    text not null default 'Acudiente',
  health_data     boolean not null default false,          -- autorización explícita para datos de salud
  method          text not null default 'firma-fisica' check (method in ('firma-fisica', 'firma-digital')),
  received_on     date not null default current_date,
  recorded_by     uuid not null default auth.uid() references public.profiles (id),
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  revoked_reason  text,
  check (revoked_at is null or coalesce(trim(revoked_reason), '') <> '')
);
create index guardian_authorizations_student on public.guardian_authorizations (student_id) where revoked_at is null;

alter table public.guardian_authorizations enable row level security;
grant select, insert on public.guardian_authorizations to authenticated;
create policy guardian_authorizations_mi_colegio on public.guardian_authorizations as restrictive for all to authenticated
  using (institution_id = public.current_institution()) with check (institution_id = public.current_institution());
-- Secretaría registra (a su nombre); Secretaría y Rectoría consultan. Revocar solo por la función.
create policy guardian_authorizations_read on public.guardian_authorizations for select to authenticated
  using (public.is_admin_or_principal());
create policy guardian_authorizations_insert on public.guardian_authorizations for insert to authenticated
  with check (public.current_app_role() = 'admin' and recorded_by = (select auth.uid()) and revoked_at is null);

-- No se matricula sin autorización registrada (sin sesión —semilla, mantenimiento— no aplica).
create or replace function public.check_student_authorization()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return null; end if;
  if not exists (select 1 from public.guardian_authorizations a where a.student_id = new.id and a.revoked_at is null) then
    raise exception 'Falta la autorización del acudiente para matricular a % %.', new.first_names, new.last_names;
  end if;
  return null;
end $$;
create constraint trigger students_need_authorization after insert on public.students
  deferrable initially deferred for each row execute function public.check_student_authorization();

-- No se guardan datos de salud sin autorización explícita para ellos.
create or replace function public.check_health_authorization()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return null; end if;
  if not exists (select 1 from public.guardian_authorizations a where a.student_id = new.student_id and a.revoked_at is null and a.health_data) then
    raise exception 'Falta la autorización del acudiente para guardar datos de salud.';
  end if;
  return null;
end $$;
create constraint trigger student_medical_need_authorization after insert or update on public.student_medical
  deferrable initially deferred for each row execute function public.check_health_authorization();
revoke execute on function public.check_student_authorization(), public.check_health_authorization() from public, anon, authenticated;

-- Matricular con la autorización en el mismo paso. a = { received, guardian_name?, relationship?, health?, method?, received_on? }
create or replace function public.register_enrollment(p jsonb, a jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare new_id text; who text;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría registra matrículas.'; end if;
  if coalesce((a ->> 'received')::boolean, false) is not true then raise exception 'Falta la autorización firmada del acudiente.'; end if;
  who := coalesce(nullif(trim(a ->> 'guardian_name'), ''), nullif(trim(p ->> 'guardian_name'), ''));
  if who is null then raise exception 'Falta el nombre del acudiente que firma la autorización.'; end if;
  new_id := public.enroll_student(p);
  insert into public.guardian_authorizations (student_id, policy_version, guardian_name, relationship, health_data, method, received_on)
  values (new_id, public.current_policy_version(), who,
          coalesce(nullif(trim(a ->> 'relationship'), ''), nullif(trim(p ->> 'guardian_rel'), ''), 'Acudiente'),
          coalesce((a ->> 'health')::boolean, false), coalesce(nullif(a ->> 'method', ''), 'firma-fisica'),
          coalesce(nullif(a ->> 'received_on', '')::date, current_date));
  return new_id;
end $$;

-- Importación: una autorización por estudiante, con el acudiente de su fila. Datos de salud: nunca en lote.
create or replace function public.register_enrollments(p jsonb, a jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare r jsonb; n integer := 0;
begin
  for r in select * from jsonb_array_elements(p) loop
    perform public.register_enrollment(r, (a - 'guardian_name' - 'relationship') || jsonb_build_object('health', false));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.register_enrollment(jsonb, jsonb), public.register_enrollments(jsonb, jsonb) from public, anon;
grant execute on function public.register_enrollment(jsonb, jsonb), public.register_enrollments(jsonb, jsonb) to authenticated;

-- Revocar: queda en el historial con el motivo; si ya no hay autorización de salud vigente, se borran esos datos.
create or replace function public.revoke_guardian_authorization(p_id bigint, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.guardian_authorizations;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría revoca autorizaciones.'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Escribe el motivo de la revocatoria.'; end if;
  select * into r from public.guardian_authorizations where id = p_id and institution_id = public.current_institution() and revoked_at is null for update;
  if not found then raise exception 'La autorización no existe o ya estaba revocada.'; end if;
  update public.guardian_authorizations set revoked_at = now(), revoked_reason = trim(p_reason) where id = p_id;
  if not exists (select 1 from public.guardian_authorizations a where a.student_id = r.student_id and a.revoked_at is null and a.health_data) then
    delete from public.student_medical where student_id = r.student_id;
  end if;
end $$;
revoke execute on function public.revoke_guardian_authorization(bigint, text) from public, anon;
grant execute on function public.revoke_guardian_authorization(bigint, text) to authenticated;
