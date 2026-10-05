-- NotaScan · meta institucional (paso 6b.4b, decisión de Diego del 2026-10-05).
-- Promedio que el colegio espera de cada grado. Lo configura Secretaría; Rectoría lo ve como línea de referencia en
-- la analítica. La tabla de colegios solo la escribe la plataforma, así que Secretaría la cambia por una función.

alter table public.institutions add column performance_goal numeric(2, 1) not null default 3.5
  check (performance_goal between 1 and 5);

create or replace function public.set_performance_goal(p_goal numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría configura la meta institucional.'; end if;
  if p_goal is null or p_goal < 1 or p_goal > 5 then raise exception 'La meta debe estar entre 1.0 y 5.0.'; end if;
  update public.institutions set performance_goal = round(p_goal, 1) where id = public.current_institution();
end $$;
revoke execute on function public.set_performance_goal(numeric) from public, anon;
grant execute on function public.set_performance_goal(numeric) to authenticated;
