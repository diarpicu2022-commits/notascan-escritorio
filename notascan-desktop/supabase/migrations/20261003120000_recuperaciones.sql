-- NotaScan · recuperaciones del docente (paso 6b.2b, 2026-10-03).
-- Igual que en la asistencia y las notas: quién registró la recuperación lo pone la base con la sesión.
-- El resultado se deriva de la nota de recuperación (≥ 3.0 aprueba) para que no dependa del cliente.

create or replace function public.stamp_recovery()
returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  new.result := case when new.recovery is null then 'pending' when new.recovery >= 3.0 then 'passed' else 'failed' end;
  if me is not null then new.recorded_by := me; end if;
  return new;
end $$;

create trigger recoveries_stamp before insert or update on public.recoveries
  for each row execute function public.stamp_recovery();

revoke execute on function public.stamp_recovery() from public, anon, authenticated;
