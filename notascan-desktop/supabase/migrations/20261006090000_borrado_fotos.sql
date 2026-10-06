-- NotaScan · borrar las fotos al cerrar el periodo (paso 6e, 2026-10-06).
-- La evaluación cerrada protege la NOTA (valor, lectura y estado), no la referencia a la foto: al cerrar el periodo
-- se borran los archivos y se quita photo_path de las notas, que se conservan. Antes el disparador bloqueaba cualquier
-- cambio en una nota de evaluación cerrada, también el borrado de esa referencia.
create or replace function public.block_closed_evaluation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.current_app_role() is distinct from 'principal'
     and exists (select 1 from public.evaluations e where e.id = new.evaluation_id and e.status = 'cerrada')
     and (tg_op = 'INSERT'
          or new.value is distinct from old.value
          or new.detected is distinct from old.detected
          or new.status is distinct from old.status
          or new.student_id is distinct from old.student_id
          or new.evaluation_id is distinct from old.evaluation_id
          or (new.photo_path is not null and new.photo_path is distinct from old.photo_path)) then
    raise exception 'La evaluación está cerrada. Solicita el cambio de nota a Rectoría.';
  end if;
  return new;
end $$;
revoke execute on function public.block_closed_evaluation() from public, anon, authenticated;
