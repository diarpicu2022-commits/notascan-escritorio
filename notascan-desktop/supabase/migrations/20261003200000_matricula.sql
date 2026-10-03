-- NotaScan · matrícula desde la app (paso 6b.3b, 2026-10-03).
-- Registrar un estudiante toca tres tablas (estudiante, acudiente principal, información médica) y genera su código
-- estudiantil: se hace en una sola operación para que no queden matrículas a medias ni códigos repetidos.
-- La importación masiva usa la misma función y es todo o nada.
-- security invoker: se aplica el RLS de quien llama (solo Secretaría escribe estudiantes).

create or replace function public.enroll_student(p jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  yr text := coalesce(nullif(p ->> 'year', ''), extract(year from current_date)::text);
  new_id text;
  med boolean;
begin
  if public.current_app_role() is distinct from 'admin' then raise exception 'Solo Secretaría registra matrículas.'; end if;
  if coalesce(trim(p ->> 'first_names'), '') = '' or coalesce(trim(p ->> 'last_names'), '') = '' or coalesce(trim(p ->> 'document'), '') = '' then
    raise exception 'Faltan nombres, apellidos o documento.';
  end if;
  if exists (select 1 from public.students s where s.document = trim(p ->> 'document')) then
    raise exception 'Ya existe un estudiante con el documento %.', trim(p ->> 'document');
  end if;
  if not exists (select 1 from public.courses c where c.id = p ->> 'course_id' and c.status <> 'archived') then
    raise exception 'El curso % no existe en la estructura académica.', p ->> 'course_id';
  end if;

  -- Código estudiantil: año + consecutivo. El candado evita que dos matrículas simultáneas tomen el mismo.
  perform pg_advisory_xact_lock(hashtext('notascan.enroll'));
  select (coalesce(max(s.id::bigint), (yr || '0000')::bigint) + 1)::text into new_id
    from public.students s where s.id ~ ('^' || yr || '[0-9]{4}$');

  insert into public.students (id, first_names, last_names, doc_type, document, birth_date, course_id, status, enrolled_on)
  values (new_id, trim(p ->> 'first_names'), trim(p ->> 'last_names'), p ->> 'doc_type', trim(p ->> 'document'),
          nullif(p ->> 'birth_date', '')::date, p ->> 'course_id', coalesce(nullif(p ->> 'status', ''), 'active')::public.enrollment_status, current_date);

  if coalesce(trim(p ->> 'guardian_name'), '') <> '' then
    insert into public.guardians (student_id, full_name, relationship, document, phone, email, is_primary)
    values (new_id, trim(p ->> 'guardian_name'), coalesce(nullif(p ->> 'guardian_rel', ''), 'Acudiente'), nullif(trim(p ->> 'guardian_doc'), ''),
            coalesce(trim(p ->> 'guardian_phone'), ''), nullif(lower(trim(p ->> 'guardian_email')), ''), true);
  end if;

  med := coalesce(nullif(trim(p ->> 'allergies'), ''), nullif(trim(p ->> 'conditions'), ''), nullif(trim(p ->> 'medical_notes'), ''),
                  nullif(trim(p ->> 'emergency_contact'), ''), nullif(trim(p ->> 'emergency_phone'), '')) is not null;
  if med then
    insert into public.student_medical (student_id, allergies, conditions, notes, emergency_contact, emergency_phone)
    values (new_id, nullif(trim(p ->> 'allergies'), ''), nullif(trim(p ->> 'conditions'), ''), nullif(trim(p ->> 'medical_notes'), ''),
            nullif(trim(p ->> 'emergency_contact'), ''), nullif(trim(p ->> 'emergency_phone'), ''));
  end if;
  return new_id;
end $$;

-- Importación: todas las filas o ninguna (si una falla, la transacción entera se deshace).
create or replace function public.enroll_students(p jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare r jsonb; n integer := 0;
begin
  for r in select * from jsonb_array_elements(p) loop
    perform public.enroll_student(r);
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.enroll_student(jsonb), public.enroll_students(jsonb) from public, anon;
grant execute on function public.enroll_student(jsonb), public.enroll_students(jsonb) to authenticated;
