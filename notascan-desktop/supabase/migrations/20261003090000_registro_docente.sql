-- NotaScan · registro del docente (paso 6b.2, 2026-10-03).
-- La app del docente guarda notas, asistencia, observaciones y conceptos. Quién verificó, quién tomó la
-- asistencia y quién revisó el concepto lo pone la base con la sesión (auth.uid()), nunca el cliente:
-- así nadie puede firmar a nombre de otro aunque mande el campo en la petición.

-- ---------- Notas: «verificada» lleva la firma de quien la verificó ----------
create or replace function public.stamp_grade_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then return new; end if;   -- semilla o mantenimiento sin sesión: se respeta lo enviado
  if new.status = 'verified' then
    if tg_op = 'INSERT' or old.status is distinct from 'verified' or new.value is distinct from old.value then
      new.verified_by := me;
      new.verified_at := now();
    else
      new.verified_by := old.verified_by;    -- sin cambio de nota, la firma anterior no se toca
      new.verified_at := old.verified_at;
    end if;
  end if;
  return new;
end $$;

create trigger grades_stamp before insert or update on public.grades
  for each row execute function public.stamp_grade_verification();

-- ---------- Asistencia: la registra quien tiene la sesión ----------
create or replace function public.stamp_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is not null then new.recorded_by := me; end if;
  return new;
end $$;

create trigger attendance_stamp before insert or update on public.attendance
  for each row execute function public.stamp_attendance();

-- ---------- Conceptos: escrito o revisado por el docente → su firma; borrador o vacío → sin firma ----------
create or replace function public.stamp_concept()
returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null then return new; end if;
  new.reviewed_by := case when new.state in ('teacher', 'reviewed') then me end;
  return new;
end $$;

create trigger concepts_stamp before insert or update on public.period_concepts
  for each row execute function public.stamp_concept();

-- ---------- Observador: el autor es quien escribe (la política ya lo exige) ----------
alter table public.observations alter column author_id set default auth.uid();

-- Funciones de disparador: nadie las llama directamente.
revoke execute on function public.stamp_grade_verification(), public.stamp_attendance(), public.stamp_concept()
  from public, anon, authenticated;
