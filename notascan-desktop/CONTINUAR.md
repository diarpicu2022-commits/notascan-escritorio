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
  - **6b.3c (hecho y aprobado 2026-10-03):** Boletines con datos reales e impresión a PDF, mensaje del
    director (Docente → Conceptos → «Mensajes de director»), importación .xlsx con `read-excel-file`.
    Migración `20261003230000_boletines.sql`. `verify:admin-data` 36/36, `verify:teacher-data` 33/33, `verify:db` 86/86.
    - Migración `20261003230000_boletines.sql` **aplicada en Supabase** el 2026-10-03 (una transacción, cotejada por
      SHA-1). Comprobado: RLS en `director_messages` con 3 políticas, disparadores de firma, funciones solo para authenticated.
    - Datos de la institución: Diego decide (2026-10-03) un **modo administrador de la plataforma** (multicolegio):
      él da de alta los colegios que compran el servicio, les pone logo, resolución, DANE y demás, y ve uso y
      estadísticas por colegio. Paso 7 (en diseño).
- **Paso 7 · Consola de la plataforma (multicolegio).** Anexo `docs/ux/anexos/2026-10-03-consola-plataforma.md` con
  investigación, contrato (dirección A · Registro de colegios; una base separada por colegio; Diego ve solo cifras y uso).
  - **7a (hecho y aprobado 2026-10-04):** base multicolegio. Migraciones `20261004090000_rol_plataforma.sql`
    y `20261004100000_multicolegio.sql`. `verify:db` 108/108. **Aplicadas en Supabase el 2026-10-04** (cotejadas por SHA-1).
    Diego registrado en `platform_admins`. **Pendiente de Diego:** crear su usuario en Authentication → Add user con
    su correo (Auto Confirm); el perfil queda con rol «platform» y sin colegio.
  - **7b (hecho y aprobado 2026-10-04, con la enmienda 4a):** identidad del colegio (escudo con logo o iniciales, encabezado del
    boletín, colegio en el menú, editor con vista previa en vivo en `#/dev/identity`). `verify:identity` 25/25 con la
    enmienda 4a (iniciales del escudo en dorado, 4.91:1).
  - **7c (hecho y aprobado 2026-10-04):** marco del rol Plataforma (menú «Colegios», sin búsqueda de
    estudiantes, entrada con cualquier opción del selector) y esqueleto de lista y detalle. `verify:platform` 11/11,
    `verify:platform-auth` 5/5.
  - **7d (hecho y aprobado 2026-10-04, con la región «Servicio»; migración aplicada):** lista de colegios con adopción, alta con primera Secretaría,
    ficha (atención, uso, identidad con logo, servicio). `verify:platform` 26/26, `verify:platform-auth` 8/8, `verify:db`
    114/114. Región «Servicio» añadida al contrato: espera visto bueno.
    - **Pendiente de Diego:** crear su usuario (Authentication → Add user, su correo, Auto Confirm) y, para cada colegio
      nuevo, el acceso de su Secretaría (resuelto en 7e con invitaciones).
  - **7e (hecho y aprobado 2026-10-04):** invitaciones por correo (función `invite-staff` desplegada,
    migración `20261004160000_invitaciones.sql` aplicada) y activación con código en el login; también restablecer con
    código. `verify:invite` 14/14, regresión en verde.
    - **Pendiente de Diego:** pegar las plantillas de `supabase/templates/` en Authentication → Emails (o autorizarme), y
      configurar un SMTP propio: el correo por defecto solo entrega a miembros del equipo y 2 por hora.
  - Servicio de visión decidido (2026-10-05): **A · modelo multimodal (GPT-4o / Claude con visión)** para Subir
    fotografías. Implica declarar la transferencia a terceros en la política (las fotos son de menores).
- **Paso 6b.4 · Rectoría** (en curso, por partes).
  - **6b.4a (hecho y aprobado 2026-10-05, con «continua»; sus dos decisiones siguen abiertas):** Solicitudes con datos reales y cambio de nota real
    (migración `20261005090000_solicitudes.sql`: `grade_id`, `request_fits_grade`, `decide_grade_request` aplica la
    nota y no aplica a ciegas), «Esperan tu decisión» del panorama, número del menú desde la base y Observador.
    `verify:db` 127/127, `verify:principal-data` 13/13, `verify:states` 90/90, `verify:principal` 76/76.
    - **Pendiente de Diego:** ejecutar la migración: quedó cargada en el SQL Editor (pestaña «Untitled query»,
      SHA-1 LF `c400c9cc…`); el clasificador de permisos no me dejó pulsar «Run» en producción.
    - Dos decisiones en el anexo (Paso 6b.4a): formulario del docente para pedir el cambio y qué hacer con las 3
      solicitudes de la semilla.
  - **6b.4b (hecho y aprobado 2026-10-05, con recordatorio real):** indicadores y gráficos del panorama y de Analítica con
    datos reales (mismo modelo de notas que el Ranking), Seguimiento docente real, lecturas paginadas de 1000 en 1000 en
    toda la app (hallazgo: el API corta en 1000 filas). Migración `20261005120000_rectoria_lectura.sql` (directorio de
    personal para Rectoría, `attendance_by_grade`). `verify:principal-data` 25/25, `verify:db` 132/132, `verify:states` 98/98.
    - Decisiones de Diego (2026-10-05): **meta institucional la configura Secretaría** (enmienda 5: bloque en
      Periodos, migración `20261005150000_meta_institucional.sql`); **cambio de nota sin formulario**, el docente lo
      gestiona en persona. Aprobadas: recordatorio que el docente ve en su Inicio (migración
      `20261005180000_recordatorios.sql`) y «Exportar informe» junto con Reportes.
    - **Pendiente de Diego — migraciones en orden:** `20261005090000_solicitudes.sql` (cargada en el SQL Editor,
      SHA-1 LF `c400c9cc…`), `20261005120000_rectoria_lectura.sql` (`f872f7b0…`), `20261005150000_meta_institucional.sql` (`c4efe715…`),
      `20261005180000_recordatorios.sql` (`2b3359da…`). El clasificador de permisos no me deja ejecutar SQL en producción.
  - **6b.4c (siguiente):** perfil del estudiante con datos reales (Rectoría y compartido).
  - Después: Reportes del Docente y Subir fotografías.
  - Verificación: `npm run build:demo` antes de `verify:tokens|card|shell|components|teacher|admin|principal|states`;
    `npm run build` antes de `verify:auth|data|teacher-data|admin-data`.
- Credencial de la base: la lectura de la contraseña desde el navegador fue bloqueada por permisos (bien). Diego la
  restablece en Settings → Database y aplica con `npx supabase db push --db-url "<cadena de conexión>"` o pega las migraciones en el SQL Editor.
- Vistas de prueba: `#/dev/tokens`, `#/dev/card`, `#/dev/card-static`, `#/dev/components`. Verificación (tras `npm run build`): `verify:tokens`, `verify:card`, `verify:shell`, `verify:components`, `verify:teacher`, `verify:admin`, `verify:principal`.

## Repositorio

- Privado: https://github.com/diarpicu2022-commits/notascan-escritorio (rama `main`), raíz en `App Escritorio/`.
- Un commit por paso al cerrarlo, a nombre de Diego y sin firmas de herramientas. Desde 2026-10-05 Diego pide
  subirlos a GitHub (`git push origin main`) a medida que se cierran.
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
