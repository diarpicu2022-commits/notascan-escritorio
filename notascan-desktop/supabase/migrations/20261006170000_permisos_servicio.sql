-- NotaScan · permisos del rol de servicio para las funciones del servidor (2026-10-06).
-- Encontrado con la primera invitación real desde la consola: «No pudimos consultar el directorio». En este proyecto
-- el rol service_role no tenía permisos sobre las tablas de public (has_table_privilege → false), así que las
-- funciones que usan la clave de servicio fallaban: invite-staff (directorio y perfiles) y purge-exam-photos
-- (asignaciones, evaluaciones, perfiles y la ruta de la foto en las notas). Se concede solo lo que cada una usa.
-- read-exam no se toca: trabaja con la sesión del docente.

grant select on public.staff_directory, public.profiles, public.teaching_assignments, public.evaluations to service_role;
grant select, update (photo_path) on public.grades to service_role;
