# CONTINUAR · NotaScan escritorio

Lo primero que se lee al retomar.

## Estado

- Contrato de diseño: design system `../notascan-ui/` (no se sale de él). Anexo: `docs/ux/anexos/2026-10-01-app-escritorio.md`.
- Paso 1 · Tokens: hecho y aprobado (2026-10-01).
- Paso 2 · `StudentGradeCard`: hecho y aprobado (2026-10-01); botones de 36 px aceptados como excepción.
- Paso 3 · esqueleto: hecho y aprobado (2026-10-01); sidebar y enlace móvil como el sistema.
- Paso 4 · infraestructura compartida: hecho y aprobado (2026-10-01).
- Paso 5a · pantallas del Docente: hecho y aprobado (2026-10-01) con enmiendas 1b (color a `--ivory-deep`) y 2a (`src/styles/amendments.css`).
- Paso 5b · Secretaría: hecho y aprobado (2026-10-01), con la ampliación de 2a en Periodos confirmada.
- Paso 5c · Rectoría: hecho y aprobado (2026-10-01), con la enmienda 3a (contraste del cambio de nota).
- Paso 6a · backend Supabase: hecho y aprobado (2026-10-02).
  - Proyecto `notascan` (org NotaScan, Free, sa-east-1, `https://urasrpjslggoknjcxdfp.supabase.co`), RLS automático.
  - 3 migraciones aplicadas desde el SQL Editor + semilla (72 estudiantes, 35 asignaciones…). `verify:db` 34/34 en PGlite.
  - Security Advisor: 0 errores; 11 avisos intencionales (funciones que usan las políticas; `rls_auto_enable` de la plataforma).
  - Login con Supabase Auth: rol del perfil, «Entrar como» valida, «Cuenta institucional» avisa que aún no está,
    «¿Olvidaste tu contraseña?» envía el correo, vista «Sin permiso», nombre real en el marco. `verify:auth` 20/20.
  - Dos modos: `npm run build` (Supabase real) y `npm run build:demo` (datos simulados, para `verify:*` y la sustentación).
  - **Pendiente de Diego:** crear cuentas de prueba en Authentication → Add user (Auto Confirm) con correos del
    `staff_directory`: `ana.lucia@losandes.edu.co` (Docente), `patricia@losandes.edu.co` (Secretaría),
    `hernando@losandes.edu.co` (Rectoría). La contraseña la escribe él.
  - **Pendiente técnico:** página de destino del enlace de restablecimiento (Supabase redirige a la Site URL; no trae
    formulario propio). Opciones: deep link `notascan://` en Tauri o una página web pequeña.
- **Paso 6b · datos reales y estados: en curso.** Se entrega por partes.
  - **6b.1 (hecho 2026-10-02, esperando visto bueno):** capa `src/services/` (TanStack Query; demo con `?estado=cargando|error|vacio`),
    vista `student_overview` aplicada en Supabase, Estudiantes y Matrículas (Secretaría y Rectoría) con datos reales,
    estados, reintento, guardado optimista con reversión y aviso de dato viejo. `verify:db` 39/39, `verify:states` 9/9,
    `verify:data` 8/8, fidelidad Secretaría 102/102 y Rectoría 76/76.
  - **6b.1 aprobado (2026-10-03).**
  - **6b.2 (hecho y aprobado 2026-10-03, con sus tres decisiones):** Docente con datos reales — revisión de notas, planilla,
    asistencia, observador y conceptos, con estados. Migración `20261003090000_registro_docente.sql` (la base firma
    quién verifica/registra/revisa). `verify:teacher` 123/123, `verify:states` 29/29, `verify:teacher-data` 19/19,
    `verify:db` 51/51; regresión completa en verde. Tres decisiones esperan a Diego (anexo, Paso 6b.2).
  - **6b.2b (hecho y aprobado 2026-10-03, con el formulario «Nueva evaluación»):** Inicio, Estudiantes (con exportar CSV), Evaluaciones
    (con «Nueva evaluación») y Recuperaciones del Docente con datos reales. Migración `20261003120000_recuperaciones.sql`.
    `verify:teacher-data` 29/29, `verify:states` 45/45, `verify:db` 57/57; regresión en verde.
    - Migraciones `20261003090000_registro_docente.sql` y `20261003120000_recuperaciones.sql` **aplicadas en Supabase**
      el 2026-10-03 desde el SQL Editor, en una transacción (contenido cotejado byte a byte con el repositorio por SHA-1).
      Comprobado en la base: 4 disparadores activos, funciones de firma no ejecutables por anon ni authenticated,
      `observations.author_id` con valor por defecto `auth.uid()`, orden en grades `closed > stamp > touch`.
    - Siguen con datos de demostración: Reportes y Subir fotografías (decisiones de formato y de servicio de visión).
    - La cola sin conexión de la planilla sigue simulada (SyncContext). La asistencia usa una clase por día (hora 1).
    - El encabezado del observador dice «El acudiente las ve en su aplicación.»: aún no es cierto (sin acceso del
      acudiente en la base); se cumple cuando exista la app móvil con su política.
  - **6b.3a (hecho y aprobado 2026-10-03, con sus cuatro decisiones):** Secretaría · Estructura, Malla, Periodos y Usuarios con datos
    reales. Migración `20261003170000_secretaria_configuracion.sql` (asignación con evaluaciones no se elimina, un
    solo periodo abierto, `save_period`, `touch_last_seen`). `verify:admin-data` 18/18, `verify:states` 61/61,
    `verify:db` 69/69; regresión en verde.
    - Migración `20261003170000_secretaria_configuracion.sql` **aplicada en Supabase** el 2026-10-03 (SQL Editor, una
      transacción, cotejada por SHA-1). Supabase la marcó como «destructiva» por el `delete` dentro de `save_period`
      (solo corre al guardar un periodo). Comprobado: disparador `assignments_keep_grades` activo, índice
      `academic_periods_one_open`, `save_period` y `touch_last_seen` solo para authenticated.
    - Sin forma de reactivar usuarios desactivados (tampoco en el sistema).
  - **6b.3b (hecho y aprobado 2026-10-03):** Secretaría · registro de matrícula, importación CSV (todo o
    nada), Paz y salvo, Ranking e Inicio con datos reales. Migración `20261003200000_matricula.sql` (`enroll_student`,
    `enroll_students`). `verify:admin-data` 29/29, `verify:states` 73/73, `verify:db` 77/77. Tres decisiones esperan a
    Diego (anexo, Paso 6b.3b).
    - Migración `20261003200000_matricula.sql` **aplicada en Supabase** el 2026-10-03 (una transacción, cotejada por
      SHA-1). Comprobado: `enroll_student` y `enroll_students` con security invoker, solo para authenticated. El próximo
      código estudiantil será 20261505.
    - **Pendiente legal:** autorización del acudiente (Ley 1581) antes de matricular con datos reales.
  - Siguientes: 6b.3c Boletines (con la decisión del PDF, el mensaje del director y el puesto en el curso);
    6b.4 Rectoría (panorama, analítica, seguimiento, solicitudes con decide_grade_request) y perfil.
  - Verificación: `npm run build:demo` antes de `verify:tokens|card|shell|components|teacher|admin|principal|states`;
    `npm run build` antes de `verify:auth|data|teacher-data|admin-data`.
  - Hallazgo para 6b.4: `decide_grade_request` aprueba la solicitud pero no cambia la nota en `grades`.
- Credencial de la base: la lectura de la contraseña desde el navegador fue bloqueada por permisos (bien). Diego la
  restablece en Settings → Database y aplica con `npx supabase db push --db-url "<cadena de conexión>"` o pega las migraciones en el SQL Editor.
- Vistas de prueba: `#/dev/tokens`, `#/dev/card`, `#/dev/card-static`, `#/dev/components`. Verificación (tras `npm run build`): `verify:tokens`, `verify:card`, `verify:shell`, `verify:components`, `verify:teacher`, `verify:admin`, `verify:principal`.

## Repositorio

- Privado: https://github.com/diarpicu2022-commits/notascan-escritorio (rama `main`), raíz en `App Escritorio/`.
- Un commit por paso al cerrarlo, a nombre de Diego y sin firmas de herramientas.
- Los pasos 1–5c se subieron el 2026-10-01 como un commit por paso, con cada archivo en su versión
  de ese día: los commits intermedios agrupan lo creado en cada paso, pero no compilan por separado.

## Cómo correrlo

```bash
npm install
npm run dev              # navegador en http://localhost:1420
npm run build && npm run verify:tokens
npm run tauri dev        # ventana nativa: requiere Rust (rustup) y, en Windows, MSVC Build Tools + WebView2
```

Rust no está instalado en este equipo (2026-10-01): `src-tauri/` está configurado pero no se ha compilado.

## Privacidad y legal (desde el diseño, aún sin hacer)

La app trata datos de **menores de edad** (estudiantes), de acudientes y de salud (`MedicalInfo`), además de
fotografías de exámenes. Marco: Ley 1581 de 2012, Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015);
el art. 7 de la Ley 1581 exige respetar el interés superior del menor.

- [ ] Política de tratamiento de datos con versión y fecha (`docs/legal/`), visible dentro de la app.
- [ ] Autorización del acudiente para los datos del estudiante; registro de la versión aceptada y la fecha.
- [ ] Datos sensibles (salud, observador) con acceso restringido por rol y explicación antes de pedirlos.
- [ ] Términos y condiciones (hay cuentas por rol).
- [ ] Derechos del titular: consultar, exportar, corregir y suprimir; y qué se conserva por obligación académica.
- [ ] Retención de las fotografías de exámenes: cuánto tiempo y cuándo se borran.
- [ ] Si se usa una API de visión externa (Google Cloud Vision / GPT-4o): transferencia a terceros declarada en la política.
- [ ] Cookies: no aplica a la app de escritorio (no hay rastreo); revisar si se publica una versión web.

Los textos legales que se redacten son borradores técnicos y los revisa un abogado antes de usarlos.
