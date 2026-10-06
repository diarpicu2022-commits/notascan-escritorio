-- NotaScan · subir fotos de exámenes desde el celular (2026-10-06, dirección B elegida por Diego: por internet).
-- El docente abre en Calificaciones un código QR; el QR lleva un permiso de un solo uso, de 20 minutos, que solo sirve
-- para subir fotos a ESA evaluación. El celular no inicia sesión: la función phone-upload valida el permiso y guarda la
-- foto en la carpeta del docente (exam-photos/<docente>/<evaluación>/…), la misma que se borra al cerrar el periodo.
-- El computador ve las fotos nuevas y las manda a leer como si las hubiera arrastrado.

create table public.phone_upload_sessions (
  id             uuid primary key default gen_random_uuid(),
  token          text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  teacher_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  evaluation_id  bigint not null references public.evaluations (id) on delete cascade,
  expires_at     timestamptz not null default now() + interval '20 minutes',
  closed_at      timestamptz,
  created_at     timestamptz not null default now()
);

create table public.phone_uploads (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.phone_upload_sessions (id) on delete cascade,
  photo_path  text not null,
  created_at  timestamptz not null default now(),
  picked_at   timestamptz
);
create index phone_uploads_pending on public.phone_uploads (session_id) where picked_at is null;

alter table public.phone_upload_sessions enable row level security;
alter table public.phone_uploads enable row level security;
create policy phone_sessions_own on public.phone_upload_sessions for select to authenticated using (teacher_id = (select auth.uid()));
create policy phone_uploads_own_read on public.phone_uploads for select to authenticated
  using (exists (select 1 from public.phone_upload_sessions s where s.id = session_id and s.teacher_id = (select auth.uid())));
create policy phone_uploads_own_pick on public.phone_uploads for update to authenticated
  using (exists (select 1 from public.phone_upload_sessions s where s.id = session_id and s.teacher_id = (select auth.uid())))
  with check (picked_at is not null);
grant select on public.phone_upload_sessions to authenticated;
grant select, update (picked_at) on public.phone_uploads to authenticated;

-- Abre un permiso nuevo para una evaluación propia y no cerrada; cierra los anteriores del mismo docente.
create or replace function public.start_phone_upload(p_evaluation bigint)
returns table (session_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'teacher' then raise exception 'Solo un docente sube fotos desde el celular.'; end if;
  if not public.owns_evaluation(p_evaluation) then raise exception 'Esa evaluación no es tuya.'; end if;
  if exists (select 1 from public.evaluations e where e.id = p_evaluation and e.status = 'cerrada') then
    raise exception 'La evaluación está cerrada: ya no recibe fotos.';
  end if;
  update public.phone_upload_sessions s set closed_at = now() where s.teacher_id = (select auth.uid()) and s.closed_at is null;
  return query insert into public.phone_upload_sessions (evaluation_id) values (p_evaluation)
    returning phone_upload_sessions.id, phone_upload_sessions.token, phone_upload_sessions.expires_at;
end $$;

-- El docente cierra el permiso (al terminar o al cerrar la ventana del QR).
create or replace function public.close_phone_upload(p_session uuid)
returns void language sql security definer set search_path = '' as $$
  update public.phone_upload_sessions set closed_at = now()
  where id = p_session and teacher_id = (select auth.uid()) and closed_at is null;
$$;

revoke execute on function public.start_phone_upload(bigint), public.close_phone_upload(uuid) from public, anon;
grant execute on function public.start_phone_upload(bigint), public.close_phone_upload(uuid) to authenticated;

-- La función phone-upload (clave de servicio) valida el permiso y registra cada foto.
grant select on public.phone_upload_sessions, public.subjects to service_role;
grant select, insert on public.phone_uploads to service_role;
