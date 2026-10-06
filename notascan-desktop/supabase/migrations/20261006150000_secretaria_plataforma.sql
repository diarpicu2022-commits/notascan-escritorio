-- NotaScan · la plataforma gestiona las cuentas de Secretaría de cada colegio (2026-10-06, pedido de Diego).
-- Antes solo se registraba la primera Secretaría al dar de alta el colegio; agregar otra o cambiarla exigía SQL.
--   · platform_secretaries: quiénes son, su correo y en qué estado está su cuenta (sin invitar, invitada, activa,
--     desactivada). Solo personal de Secretaría: la plataforma sigue sin ver docentes, estudiantes ni notas.
--   · platform_add_secretary: registra una cuenta de Secretaría en el directorio del colegio.
--   · platform_remove_secretary: quita del directorio a quien nunca activó su cuenta (p. ej. un correo mal escrito o
--     las cuentas ficticias de prueba). Una cuenta ya activa no se borra desde aquí: la desactiva su colegio.
-- La plataforma no puede escribir en el directorio de un colegio (política «solo mi colegio»): lo hacen estas
-- funciones, que primero comprueban que quien llama es la plataforma.

create or replace function public.platform_secretaries(p_institution uuid)
returns table (email text, full_name text, account text, last_seen timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'platform' then raise exception 'Solo la plataforma consulta las cuentas de Secretaría.'; end if;
  return query
  select d.email, d.full_name,
    case when p.id is null then 'none' when p.status = 'active' then 'active' when p.status = 'invited' then 'invited' else 'inactive' end,
    p.last_seen_at
  from public.staff_directory d
  left join public.profiles p on p.email = d.email
  where d.institution_id = p_institution and d.role = 'admin'
  order by d.full_name;
end $$;

create or replace function public.platform_add_secretary(p_institution uuid, p_email text, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare mail text := lower(trim(coalesce(p_email, '')));
begin
  if public.current_app_role() is distinct from 'platform' then raise exception 'Solo la plataforma registra cuentas de Secretaría.'; end if;
  if not exists (select 1 from public.institutions where id = p_institution) then raise exception 'No encontramos el colegio.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Escribe el nombre de la persona de Secretaría.'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Escribe un correo válido para la cuenta de Secretaría.'; end if;
  if exists (select 1 from public.staff_directory where email = mail) or exists (select 1 from public.platform_admins where email = mail) then
    raise exception 'El correo % ya está registrado en NotaScan.', mail;
  end if;
  insert into public.staff_directory (email, full_name, role, area, institution_id)
  values (mail, trim(p_name), 'admin', 'Secretaría académica', p_institution);
end $$;

create or replace function public.platform_remove_secretary(p_institution uuid, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare mail text := lower(trim(coalesce(p_email, '')));
begin
  if public.current_app_role() is distinct from 'platform' then raise exception 'Solo la plataforma quita cuentas de Secretaría.'; end if;
  if not exists (select 1 from public.staff_directory where email = mail and institution_id = p_institution and role = 'admin') then
    raise exception 'Esa cuenta no es de la Secretaría de este colegio.';
  end if;
  if exists (select 1 from public.profiles where email = mail) then
    raise exception 'Esa persona ya recibió su invitación o activó su cuenta: no se quita desde aquí. Si ya no trabaja allí, la desactiva su colegio.';
  end if;
  delete from public.staff_directory where email = mail and institution_id = p_institution;
end $$;

revoke execute on function public.platform_secretaries(uuid), public.platform_add_secretary(uuid, text, text), public.platform_remove_secretary(uuid, text) from public, anon;
grant execute on function public.platform_secretaries(uuid), public.platform_add_secretary(uuid, text, text), public.platform_remove_secretary(uuid, text) to authenticated;
