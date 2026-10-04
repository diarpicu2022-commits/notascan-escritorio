-- NotaScan · rol de la plataforma (paso 7a, 2026-10-04).
-- Va solo: PostgreSQL no permite usar un valor de enum nuevo en la misma transacción que lo crea, y la migración
-- siguiente (multicolegio) lo usa en funciones y políticas.
alter type public.app_role add value if not exists 'platform';
