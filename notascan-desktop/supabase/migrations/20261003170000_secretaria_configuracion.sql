-- NotaScan · configuración de Secretaría (paso 6b.3a, 2026-10-03).
-- Estructura, malla, periodos y usuarios pasan a la base. Reglas que no pueden depender del cliente:
--   · Una asignación con evaluaciones no se elimina (borraría notas en cascada): se cambia el docente.
--   · Solo un periodo abierto a la vez (las asignaciones del docente salen del periodo abierto).
--   · Guardar un periodo (fechas, estado y componentes de la nota) es una sola operación.
--   · Cada persona deja constancia de su último acceso, sin poder tocar el resto de su perfil.

-- ---------- Malla: no se pierden notas por eliminar una asignación ----------
create or replace function public.block_assignment_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.evaluations e where e.assignment_id = old.id) then
    raise exception 'Esta asignación ya tiene evaluaciones. Cambia el docente en lugar de eliminarla.';
  end if;
  return old;
end $$;

create trigger assignments_keep_grades before delete on public.teaching_assignments
  for each row execute function public.block_assignment_delete();

-- ---------- Periodos: uno abierto a la vez ----------
create unique index academic_periods_one_open on public.academic_periods ((true)) where status = 'open';

-- ---------- Guardar un periodo de una vez (RLS de quien llama: solo Secretaría escribe) ----------
create or replace function public.save_period(p_id text, p_open date, p_close date, p_status public.period_status, p_components jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare total numeric;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría configura los periodos.'; end if;
  select coalesce(sum((c ->> 'weight')::numeric), 0) into total from jsonb_array_elements(p_components) c;
  if total <> 100 then raise exception 'La distribución de porcentajes debe sumar 100%%.'; end if;
  update public.academic_periods set open_date = p_open, close_date = p_close, status = p_status where id = p_id;
  if not found then raise exception 'El periodo no existe.'; end if;
  delete from public.period_components where period_id = p_id;
  insert into public.period_components (period_id, name, weight, position)
  select p_id, c ->> 'name', (c ->> 'weight')::numeric, ord::smallint from jsonb_array_elements(p_components) with ordinality as t(c, ord);
end $$;

-- ---------- Último acceso: cada quien el suyo ----------
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = '' as $$
  update public.profiles set last_seen_at = now() where id = (select auth.uid()) and status = 'active'
$$;

revoke execute on function public.block_assignment_delete() from public, anon, authenticated;
revoke execute on function public.save_period(text, date, date, public.period_status, jsonb), public.touch_last_seen() from public, anon;
grant execute on function public.save_period(text, date, date, public.period_status, jsonb), public.touch_last_seen() to authenticated;
