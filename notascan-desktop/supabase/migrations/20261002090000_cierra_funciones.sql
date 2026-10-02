-- NotaScan · corrección de seguridad (paso 6a, 2026-10-02).
-- Hallazgo del Security Advisor de Supabase: PostgreSQL concede EXECUTE a PUBLIC en cada función nueva,
-- así que las funciones security definer se podían llamar sin sesión. Además, decide_grade_request
-- comparaba el rol con «<> 'principal'»: sin sesión el rol es NULL, la comparación da NULL y no se
-- lanzaba el error, de modo que alguien anónimo podía decidir solicitudes. Se corrigen ambas cosas.

-- 1. Nada es ejecutable por defecto en el esquema público (también para funciones futuras).
alter default privileges in schema public revoke execute on functions from public, anon;

-- 2. Funciones de disparador: nadie las llama directamente (los disparadores no necesitan EXECUTE).
revoke execute on function public.handle_new_user(), public.audit_grade_change(), public.block_closed_evaluation(), public.touch_updated_at()
  from public, anon, authenticated;

-- 3. Funciones que usan las políticas y la app: solo usuarios con sesión.
revoke execute on function
  public.current_app_role(), public.current_email(), public.is_staff(), public.is_admin_or_principal(),
  public.teaches_course(text), public.owns_assignment(bigint), public.owns_evaluation(bigint), public.teaches_student(text),
  public.decide_grade_request(bigint, public.request_status, text)
  from public, anon;
grant execute on function
  public.current_app_role(), public.current_email(), public.is_staff(), public.is_admin_or_principal(),
  public.teaches_course(text), public.owns_assignment(bigint), public.owns_evaluation(bigint), public.teaches_student(text),
  public.decide_grade_request(bigint, public.request_status, text)
  to authenticated;

-- 4. La comprobación de rol no puede depender de NULL: sin rol, se rechaza.
create or replace function public.decide_grade_request(p_request bigint, p_decision public.request_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.grade_change_requests;
begin
  if public.current_app_role() is distinct from 'principal' then raise exception 'Solo Rectoría decide las solicitudes.'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Decisión no válida.'; end if;
  select * into r from public.grade_change_requests where id = p_request for update;
  if not found or r.status <> 'pending' then raise exception 'La solicitud no está pendiente.'; end if;
  update public.grade_change_requests
     set status = p_decision, decided_by = (select auth.uid()), decided_at = now(), decision_note = p_note
   where id = p_request;
  insert into public.request_events (request_id, description, actor_id)
  values (p_request, case when p_decision = 'approved' then 'Aprobada' else 'Rechazada' end
                     || ' por ' || (select full_name from public.profiles where id = (select auth.uid()))
                     || coalesce(': ' || nullif(trim(p_note), ''), ''), (select auth.uid()));
end $$;

-- 5. Con evaluación cerrada solo cambia la nota Rectoría por solicitud; cualquier otro rol (o ninguno) se detiene.
create or replace function public.block_closed_evaluation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'principal'
     and exists (select 1 from public.evaluations e where e.id = new.evaluation_id and e.status = 'cerrada') then
    raise exception 'La evaluación está cerrada. Solicita el cambio de nota a Rectoría.';
  end if;
  return new;
end $$;
revoke execute on function public.block_closed_evaluation() from public, anon, authenticated;
