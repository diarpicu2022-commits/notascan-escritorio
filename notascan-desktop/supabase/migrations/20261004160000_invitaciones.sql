-- NotaScan · invitaciones por correo (paso 7e, 2026-10-04).
-- La función invite-staff (Edge Function) invita con la clave de servicio: Supabase crea el usuario de inmediato,
-- antes de que la persona acepte. Su perfil queda «invited» (sin rol: current_app_role exige «active») hasta que
-- confirme con el código del correo; entonces pasa a «active».

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.staff_directory; pa public.platform_admins;
  st text := case when new.invited_at is not null and new.email_confirmed_at is null then 'invited' else 'active' end;
begin
  select * into pa from public.platform_admins where email = lower(new.email);
  if found then
    insert into public.profiles (id, email, full_name, role, institution_id, status) values (new.id, lower(new.email), pa.full_name, 'platform', null, st);
    return new;
  end if;
  select * into d from public.staff_directory where email = lower(new.email);
  if not found then
    raise exception 'Esta cuenta no está registrada por la institución. Solicita acceso a tu coordinación.';
  end if;
  insert into public.profiles (id, email, full_name, role, institution_id, status) values (new.id, lower(new.email), d.full_name, d.role, d.institution_id, st);
  return new;
end $$;

-- Al confirmar la invitación (Supabase marca el correo como confirmado), el perfil queda activo.
create or replace function public.activate_invited_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set status = 'active' where id = new.id and status = 'invited';
  end if;
  return new;
end $$;

create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.activate_invited_profile();

revoke execute on function public.handle_new_user(), public.activate_invited_profile() from public, anon, authenticated;
