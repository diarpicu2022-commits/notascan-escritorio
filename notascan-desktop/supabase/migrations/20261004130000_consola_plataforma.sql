-- NotaScan · consola de la plataforma (paso 7d, 2026-10-04).
--   · Dar de alta un colegio crea el colegio (en implementación) y registra su primera cuenta de Secretaría en el
--     directorio de ese colegio. La plataforma no puede escribir en el directorio de un colegio (política «solo mi
--     colegio»): lo hace esta función, que primero comprueba que quien llama es la plataforma.
--   · Las cifras por colegio suman cuántas cuentas de Secretaría tiene registradas (para «Requiere atención»).

create or replace function public.create_institution(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; mail text := lower(trim(coalesce(p ->> 'admin_email', '')));
begin
  if public.current_app_role() is distinct from 'platform' then raise exception 'Solo la plataforma da de alta colegios.'; end if;
  if coalesce(trim(p ->> 'name'), '') = '' then raise exception 'Escribe el nombre del colegio.'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Escribe un correo válido para la cuenta de Secretaría.'; end if;
  if coalesce(trim(p ->> 'admin_name'), '') = '' then raise exception 'Escribe el nombre de la persona de Secretaría.'; end if;
  if exists (select 1 from public.staff_directory where email = mail) or exists (select 1 from public.platform_admins where email = mail) then
    raise exception 'El correo % ya está registrado en NotaScan.', mail;
  end if;
  insert into public.institutions (name, short_name, city, department, plan, contract_until, status)
  values (trim(p ->> 'name'), upper(left(trim(coalesce(p ->> 'short_name', '')), 3)), trim(coalesce(p ->> 'city', '')), trim(coalesce(p ->> 'department', '')),
          trim(coalesce(p ->> 'plan', '')), nullif(p ->> 'contract_until', '')::date, 'implementation')
  returning id into new_id;
  insert into public.staff_directory (email, full_name, role, area, institution_id)
  values (mail, trim(p ->> 'admin_name'), 'admin', 'Secretaría académica', new_id);
  return new_id;
end $$;

-- platform_stats con una columna más: cuentas de Secretaría registradas.
drop function public.platform_stats();
create function public.platform_stats()
returns table (
  institution_id uuid, students integer, teachers integer, secretaries integer, accounts integer, last_seen timestamptz,
  grades_7d integer, grades_30d integer, attendance_7d integer, observations_30d integer, weekly jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'platform' then raise exception 'Solo la plataforma consulta estas cifras.'; end if;
  return query
  select i.id,
    (select count(*)::int from public.students s where s.institution_id = i.id and s.status = 'active'),
    (select count(*)::int from public.staff_directory d where d.institution_id = i.id and d.role = 'teacher'),
    (select count(*)::int from public.staff_directory d where d.institution_id = i.id and d.role = 'admin'),
    (select count(*)::int from public.profiles p where p.institution_id = i.id and p.status = 'active'),
    (select max(p.last_seen_at) from public.profiles p where p.institution_id = i.id),
    (select count(*)::int from public.grades g where g.institution_id = i.id and g.status = 'verified' and g.verified_at >= now() - interval '7 days'),
    (select count(*)::int from public.grades g where g.institution_id = i.id and g.status = 'verified' and g.verified_at >= now() - interval '30 days'),
    (select count(*)::int from public.attendance a where a.institution_id = i.id and a.class_date >= current_date - 7),
    (select count(*)::int from public.observations o where o.institution_id = i.id and o.created_at >= now() - interval '30 days'),
    (select jsonb_agg(w.n order by w.k) from (
       select k, (select count(*) from public.grades g where g.institution_id = i.id and g.status = 'verified'
                    and g.verified_at >= date_trunc('week', now()) - make_interval(weeks => k) and g.verified_at < date_trunc('week', now()) - make_interval(weeks => k - 1))
               + (select count(*) from public.attendance a where a.institution_id = i.id
                    and a.class_date >= (date_trunc('week', now()) - make_interval(weeks => k))::date and a.class_date < (date_trunc('week', now()) - make_interval(weeks => k - 1))::date) as n
       from generate_series(7, 0, -1) k) w)
  from public.institutions i;
end $$;

revoke execute on function public.create_institution(jsonb), public.platform_stats() from public, anon;
grant execute on function public.create_institution(jsonb), public.platform_stats() to authenticated;
