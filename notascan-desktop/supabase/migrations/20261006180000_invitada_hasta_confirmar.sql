-- NotaScan · una cuenta invitada queda «invitada» hasta que confirma con el código (2026-10-06).
-- Encontrado con la primera invitación real desde la consola: la cuenta de firux386@gmail.com quedó «active» sin haber
-- confirmado. Supabase crea el usuario y marca invited_at en un paso posterior, así que al insertarlo invited_at aún
-- está vacío y handle_new_user la daba por activa. Ahora el criterio es el que importa: si el correo no está
-- confirmado, la cuenta está invitada; al confirmar, activate_invited_profile (sin cambios) la activa.
-- Las cuentas creadas ya confirmadas (Supabase → Add user con confirmación automática) entran activas como antes.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare d public.staff_directory; pa public.platform_admins;
  st text := case when new.email_confirmed_at is null then 'invited' else 'active' end;
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

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Corrige las cuentas que ya quedaron activas sin haber confirmado su correo.
update public.profiles p set status = 'invited'
from auth.users u
where u.id = p.id and u.email_confirmed_at is null and p.status = 'active';
