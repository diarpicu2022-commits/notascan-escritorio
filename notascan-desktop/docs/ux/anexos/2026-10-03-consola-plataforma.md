# Anexo · Consola de la plataforma (Paso 7) · 2026-10-03

Pedido de Diego (2026-10-03): «un modo admin para mí donde doy ingreso a los colegios que compren mi servicio, veo su
comportamiento, uso y estadísticas por colegio, y ahí les coloco logo, resolución y demás, que se vean en cada colegio,
en los boletines y en los estudiantes».

## 1. Usuario y tarea

- **Quién:** Diego, dueño y operador de NotaScan. Un solo usuario (más adelante, quizá soporte). Técnico, en escritorio,
  sesiones cortas y frecuentes; revisa varios colegios a la vez.
- **Tareas, en orden de frecuencia:** (1) ver qué colegios usan bien el servicio y cuáles se están cayendo; (2) dar de
  alta un colegio que compró y dejarlo listo (identidad, primera cuenta de Secretaría); (3) corregir la identidad
  (logo, resolución, DANE) que sale en la app del colegio y en sus boletines; (4) suspender o reactivar.
- **Registro:** producto, lectura obligada (consola operativa). El punto de entrada es la tarea: nada decorativo entre
  Diego y el colegio que necesita atención.

## 2. Referentes (fuentes de pantalla del protocolo + dos de producto multiorganización)

| Fuente | Observación concreta | Decisión aplicable | Límite que no copiaré |
|---|---|---|---|
| [Refero · Linear](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1) | Bordes de 0,5 px, pesos 400–510, «nunca rejillas de tres tarjetas»; un solo acento para la acción principal de cada vista. | Una sola acción primaria por vista (alta de colegio / guardar identidad); lista de colegios en tabla, no en tarjetas. | Su paleta oscura y su tipografía: el contrato es notascan-ui. |
| [Stripe · Connected accounts](https://docs.stripe.com/connect/dashboard) | Pestañas por estado (Restricted / In review / Enabled) y una lista **«Actions required» arriba del detalle** de cada cuenta. | Pestañas de estado de colegio y, en el detalle, «Requiere atención» primero (sin Secretaría, sin logo, sin uso en 14 días). | La densidad financiera y los saldos. |
| [Clerk · Organizations](https://clerk.com/docs/organizations/overview) | Cada organización tiene perfil y metadatos; la analítica muestra cuáles «crecen, se mantienen o se caen». | Señal de adopción por colegio (crece / estable / se cae) calculada del uso semanal, como columna ordenable. | Su modelo de roles genérico: aquí los roles ya existen por colegio. |
| [Emil Kowalski · animaciones](https://emilkowal.ski/ui/great-animations) | Menos de 300 ms, `ease-out`, no animar acciones repetidas con teclado, solo `transform`/`opacity`. | Solo se anima la entrada del detalle y el cambio de logo en la vista previa; nada en la tabla. | Ninguno. |
| [Taste Skill](https://www.tasteskill.dev/) | «Restrained color, sharp structure, tighter hierarchy»; validar antes de entregar. | Color solo con significado (sage = sano, gold = atención, burgundy = suspendido o caído). | Su catálogo de estilos alternativos: no cambiamos de sistema. |
| [Aceternity · componentes](https://ui.aceternity.com/components) | Carga de archivo con arrastrar y soltar y micro-interacción; barra lateral expandible. | Carga del logo con arrastrar y soltar (pieza `UploadZone` del sistema) y vista previa inmediata. | Fondos de rejilla, globos y efectos decorativos. |
| [Mobbin](https://mobbin.com/explore/web/screens/admin-dashboard) | **No accesible** (HTTP 403, 2026-10-03). | — | — |
| [Pinterest](https://co.pinterest.com/search/pins/?q=multi%20tenant%20admin%20dashboard%20school) | **No accesible** (exige sesión, 2026-10-03). | — | — |
| [MotionSites](https://motionsites.ai/) | Plantillas de landing; nada sobre consolas. **No cuenta** como referente. | — | — |

## 3. Direcciones propuestas (dentro del contrato notascan-ui)

- **A · Registro de colegios (recomendada).** Tabla de colegios con pestañas de estado y señal de adopción; al abrir uno,
  página de detalle con «Requiere atención» arriba, el resumen de uso con el bento del sistema y la **identidad con
  vista previa en vivo del encabezado del boletín** (el momento memorable: Diego ve exactamente cómo saldrá el logo).
- **B · Torre de control.** Primero el panorama de toda la plataforma (bento + gráfico de uso por colegio) y desde ahí
  se baja al colegio. Mejor para mirar tendencias; más lenta para dar de alta y corregir.
- **C · Expediente por colegio.** Cada colegio como un documento (papel del sistema): contrato, identidad y un informe
  mensual de uso imprimible. Elegante y útil para enviar al colegio; la menos ágil para operar.

## 4. Arquitectura y privacidad (a decidir con Diego)

- **Multicolegio:** propuesta, una sola base con `institution_id` en cada tabla y RLS que separa colegios. Afecta a
  todas las tablas y políticas: es la migración más grande del proyecto.
- **Qué ve Diego:** propuesta, **cifras agregadas y uso, no datos personales de estudiantes**. Ante la Ley 1581 el
  colegio es el responsable del tratamiento y NotaScan el encargado: hace falta un contrato de transmisión con cada
  colegio y su política debe nombrarlo.
- **Dónde vive:** propuesta, rol nuevo «Plataforma» en la misma app, con su propio marco y sin acceso a las pantallas de
  los colegios.

## 5. Contrato de diseño (decidido por Diego el 2026-10-03)

- **Dirección A · Registro de colegios.** Tabla de colegios (`DataGrid` del sistema) con pestañas de estado
  (Implementación / Activos / Suspendidos) y columnas: colegio con su logo, ciudad, estudiantes, uso de 7 días,
  adopción (crece / estable / se cae). Detalle del colegio: «Requiere atención» primero, uso con el bento del sistema
  (`ReviewSummary`), identidad con **vista previa en vivo del encabezado del boletín**. Una sola acción primaria por
  vista: «Dar de alta un colegio» en la lista, «Guardar identidad» en el detalle.
- **Materiales:** solo los del sistema notascan-ui (tokens, `ns-*`, Fraunces/Inter del sistema, iconos del sistema).
  Color con significado: sage = sano, gold = atención, burgundy = suspendido o cayendo. Sin tokens nuevos.
- **Movimiento:** entrada del detalle y cambio de logo en la vista previa, < 300 ms, `transform`/`opacity`,
  `prefers-reduced-motion` respetado. La tabla no se anima.
- **Multicolegio:** una base; cada tabla con su colegio; RLS que separa colegios (políticas restrictivas). Un colegio
  suspendido no puede entrar.
- **Privacidad:** Diego ve **cifras agregadas y uso**, nunca nombres ni notas de estudiantes. El rol «Plataforma» no
  pasa las políticas de los datos de los colegios. Colegio = responsable; NotaScan = encargado (Ley 1581): contrato de
  transmisión y mención en la política de cada colegio (pendiente legal).
- **Identidad del colegio** (logo, nombre, ciudad, resolución, DANE) aparece en el marco de la app del colegio, en el
  boletín y en el perfil del estudiante.

## 6. Pasos (cada uno se muestra y espera visto bueno)

- **7a · Base multicolegio**: tabla de colegios, colegio en cada tabla, RLS, rol Plataforma, logos, estadísticas
  agregadas. Sin pantallas.
- **7b · Componente clave**: identidad del colegio (logo + encabezado del boletín) y su vista previa en vivo.
- **7c · Esqueleto**: marco del rol Plataforma y rutas.
- **7d · Pantallas**: lista de colegios, detalle, alta; después estados.

## 7. Paso 7a · Base multicolegio (2026-10-04)

Migraciones `20261004090000_rol_plataforma.sql` (el rol «platform», sola porque PostgreSQL no deja usar un valor de enum
en la transacción que lo crea) y `20261004100000_multicolegio.sql`:

- `institutions` (nombre, iniciales, ciudad, departamento, resolución, DANE de 12 dígitos, logo, estado
  implementación/activo/suspendido, plan, contrato hasta) y `platform_admins` (se registra por SQL; nadie se da el rol
  desde la app). El colegio de demostración recibe todos los datos existentes.
- `institution_id` en las 20 tablas de un colegio y en el directorio y los perfiles; por defecto, el colegio del usuario
  (sin sesión y con un solo colegio, ese colegio; con varios, hay que indicarlo).
- Grados, cursos, materias y periodos pasan a clave (colegio, código): dos colegios tienen su «7A». El código
  estudiantil sigue siendo único en la plataforma. Documento, nombre y código de materia, posición del periodo,
  asignación y «un periodo abierto» pasan a ser únicos por colegio.
- Una política **restrictiva** «solo mi colegio» en cada tabla, sumada a las que ya había (no se reescribió ninguna).
  Las funciones que cruzan tablas (`teaches_student`, `directs_student`, `director_overview`, `enroll_student`,
  `save_period`, `decide_grade_request`, la vista `student_overview`, el historial de notas) unen dentro del colegio.
- Rol «platform»: sin colegio, no pasa ninguna política de datos de colegios. Lee y edita `institutions`, sube logos
  (bucket público `institution-logos`) y consulta `platform_stats()`: por colegio, estudiantes activos, docentes,
  cuentas, último acceso, notas verificadas (7 y 30 días), asistencia (7 días), observaciones (30 días) y actividad de
  8 semanas. **Sin nombres, documentos ni notas individuales.**
- Colegio suspendido: `current_app_role()` devuelve nulo para sus cuentas (no entran); los demás siguen igual.

Verificación `verify:db` 108/108: todas las pruebas de 6a–6b.3c pasan sobre el esquema nuevo con la semilla cargada
antes de 7a (como en producción) y relleno al primer colegio; 20 pruebas nuevas (mismo «7A» en dos colegios, cada
Secretaría ve lo suyo, nadie escribe en otro colegio aunque mande el id, la plataforma ve colegios y cifras pero 0
estudiantes, notas, acudientes, fichas médicas u observaciones, las cifras no traen nombres, solo la plataforma sube
logos y edita la identidad, el colegio lee la suya, DANE inválido rechazado, suspendido sin acceso) e instalación desde
cero (`supabase db reset`).

Sin cambios en la app en este paso. Pendiente de comprobar en el proyecto real tras aplicar: que PostgREST resuelve las
relaciones con las claves compuestas (las consultas de la app con `subject:subjects(...)` y `academic_periods!inner`).

## 8. Paso 7b · Componente clave: identidad del colegio (2026-10-04)

Diego aprueba 7a («apruebo sigue»). Las migraciones de 7a **no se aplicaron**: falta su autorización expresa y su correo
de plataforma.

- `services/institution.ts`: identidad del colegio (nombre, iniciales, ciudad, departamento, resolución, DANE, logo).
  Cada colegio lee la suya (`useMyInstitution`); la línea legal solo muestra lo que existe (sin DANE no escribe «DANE»).
- `InstitutionIdentity.tsx`: `SchoolCrest` (el escudo del boletín del sistema; con logo, fondo papel y borde fino, logo
  **contenido** sin recortar ni deformar; sin logo, las iniciales), `InstitutionHeader` (encabezado del boletín),
  `SchoolBadge` (colegio en el menú), `IdentityEditor` (formulario con logo: PNG/JPG/SVG/WebP hasta 1 MB, DANE de 12
  dígitos, iniciales hasta 3) e `IdentityPreview` (vista previa en vivo del boletín y del menú). Lo usará la consola en 7d.
- El boletín usa `InstitutionHeader` con el colegio de la base (en demostración, el del sistema: mismo DOM). El menú de
  la app muestra el colegio de la sesión en modo normal (en demostración, el marco del sistema sin cambios).
- Movimiento: el logo entra con `ns-pop` del sistema (220 ms, `transform`/`opacity`); sin animación con movimiento
  reducido.

Verificación `verify:identity` 24/25 (vista `#/dev/identity`, solo demostración): iniciales y datos del colegio, vista
previa en vivo en boletín y menú, línea legal sin datos inventados, DANE incompleto, logos de prueba ancho (3:1) y alto
(1:3) generados con PIL **contenidos con su proporción** en ambos escudos, logo de más de 1 MB y archivo que no es imagen
rechazados conservando el anterior, quitar logo, contraste del nombre 14.10:1, línea legal 6.85:1, nombre en el menú
11.54:1, teclado con foco visible, sin desbordamiento a 1440/1024/768 (a 768 la vista previa baja), consola limpia,
movimiento reducido. Regresión: tokens 26/26, card 51/51, shell 62/62, components 121/121, admin 102/102, principal
76/76, teacher 123/123, states 77/77, auth 20/20, data 8/8, teacher-data 33/33, admin-data 36/36, db 108/108.

**Falla medida, del propio sistema (enmienda 4a propuesta, sin aplicar):** las iniciales del escudo salen gris sobre
navy, **2.06:1**, porque la regla del sistema `.ns-paper-head span { color: var(--muted) }` alcanza también al `span` del
escudo. El boletín original ya lo tiene. Propuesta: `.ns-paper-head .ns-paper-crest span { color: var(--gold); }` en
`amendments.css` (dorado sobre navy, texto grande ≈ 4.9:1). Espera el permiso de Diego.

Fallos propios encontrados y corregidos: el logo alto desbordaba el escudo (el escudo es una rejilla y la imagen alta la
estiraba; ahora es un bloque); el campo de resolución vacío mostraba «Resolución 0123 de 2015» como ejemplo, que parecía
un dato real; la vista previa del menú arrastraba la línea superior del pie.

**2026-10-04 · Diego aprueba 7b, la enmienda 4a y la aplicación de 7a, y pide registrarse con su correo y nombre.**

- Enmienda 4a aplicada en `amendments.css` (iniciales del escudo en dorado): `verify:identity` 25/25 (4.91:1); la
  referencia del sistema se compara con la enmienda: teacher 123/123, admin 102/102.
- Migraciones de 7a aplicadas en el proyecto real (SQL Editor, cada una en su transacción; la de multicolegio, 25 532
  bytes, copiada por partes y cotejada por SHA-1 con el repositorio; Supabase la marcó «destructiva» por quitar y
  recrear claves e índices y por el `UPDATE` de relleno, ambos previstos). Un intento de servir el archivo desde un
  servidor local fue bloqueado por los permisos de la sesión (exponer un servicio local) y no se usó.
- Comprobado en la base: 1 colegio con 72 de 72 estudiantes, 22 políticas restrictivas «solo mi colegio», clave
  (colegio, código) en cursos y llaves foráneas compuestas, bucket `institution-logos` público, `platform_stats` sin
  ejecución para anónimos, y Diego en `platform_admins` (Diego Armando Pinta Cuasquen).
- API: las consultas de la app con relaciones (`subjects`, `academic_periods!inner`, `teaching_assignments`, `students`,
  `profiles`, `grade_levels`) responden «permiso denegado» sin sesión, y una relación inexistente de control responde
  `PGRST200`: PostgREST resuelve las llaves compuestas.

## 9. Paso 7c · Esqueleto: marco del rol Plataforma (2026-10-04)

- Rol `platform` en la app (`DesktopRole`): menú con un solo ítem, «Colegios» (icono del sistema `building`); chip
  «Plataforma»; **sin búsqueda de estudiantes** (no ve datos personales); sin bloque de curso (el marco ya no inventa
  «Matemáticas · 7A» cuando un rol no tiene curso) y sin colegio en el menú.
- Entrada: la Plataforma **no aparece en «Entrar como»** (lo ven todos los colegios). La cuenta registrada en
  `platform_admins` entra con cualquier opción y la app la lleva a `#/platform/dashboard`; `signIn` devuelve el rol con
  el que entró.
- Rutas: `#/platform/dashboard` (lista) y `#/platform/school/<id>` (detalle). Esqueleto con las regiones del contrato en
  su orden: lista = pestañas de estado (Activos, Implementación, Suspendidos) + tabla, una sola acción primaria «Dar de
  alta un colegio» (deshabilitada hasta 7d); detalle = «Requiere atención» → Uso → Identidad, con «Todos los colegios» y
  «Guardar identidad».
- «Sin permiso» funciona en ambos sentidos: la plataforma no entra a pantallas de un colegio y un colegio no entra a la
  consola (la base también lo impide).

Verificación: `verify:platform` 11/11 (demo: menú, chip, sin búsqueda ni curso, pestañas, acción única, región anunciada
a lectores de pantalla, orden de regiones del detalle, volver a la lista, sin desbordamiento a 1440/1024/768, consola) y
`verify:platform-auth` 5/5 (modo normal: la cuenta de Diego entra eligiendo «Docente» y llega a su consola con su nombre;
«Sin permiso» en `#/admin/students` y para un docente en `#/platform/dashboard`). Regresión completa en verde (db 108/108).

Fallo propio de la prueba, corregido: las primeras capturas salieron a mitad de la animación de entrada del sistema; ahora
se toman con las animaciones congeladas.

## 10. Paso 7d · Pantallas de la consola (2026-10-04)

Diego aprueba 7c y pide crear su usuario de Supabase: **no se hizo** (crear cuentas y escribir contraseñas queda en
sus manos); se le dieron los pasos (Authentication → Add user, su correo, Auto Confirm).

- **Lista** (`DataGrid` del sistema): pestañas Activos / Implementación / Suspendidos con su cantidad; columnas colegio
  (escudo pequeño y nombre, abre la ficha), ciudad, estudiantes, uso de 7 días, **8 semanas** (barras pequeñas navy, la
  semana en curso en dorado), adopción (crece / estable / se cae / sin uso: últimas 4 semanas contra las 4 anteriores,
  ±20 %), cantidad de alertas y último acceso. Orden por defecto: primero los que se caen.
- **Dar de alta un colegio** (`Drawer`): colegio, iniciales, ciudad, departamento, plan, contrato y su **primera cuenta
  de Secretaría** (nombre y correo). Una sola función de la base (`create_institution`): colegio en implementación y
  la Secretaría registrada en el directorio de ese colegio; un correo ya usado en NotaScan se rechaza.
- **Ficha**: «Requiere atención» primero (contrato vencido o por vencer, sin uso en dos semanas, uso cayendo, sin
  cuenta de Secretaría o nadie ha entrado, sin logo, faltan resolución o DANE), cada alerta con su salida; **Uso** con
  cuatro cifras y el gráfico de barras del sistema (eje entero); **Identidad** con el editor y la vista previa en vivo
  de 7b; el logo se sube al bucket público en la carpeta del colegio al guardar.
- **Región nueva «Servicio»** (añadido al contrato, **espera visto bueno**): estado, plan y contrato; suspender pide
  confirmación y explica que nadie del colegio entra hasta reactivarlo, sin perder datos.
- Privacidad: solo cifras de `platform_stats`; la prueba comprueba que no aparece ningún nombre de estudiante.

Migración `20261004130000_consola_plataforma.sql`: `create_institution` (solo plataforma) y `platform_stats` con las
cuentas de Secretaría registradas. **Sin aplicar en Supabase.**

Verificación: `verify:platform` 26/26 (demo: marco, pestañas con cantidad, orden por adopción, barras, privacidad, alta
con errores y confirmación, ficha en su orden, alertas, uso, identidad en vivo y guardar solo con cambios, suspender con
confirmación, contraste: alerta, detalle, rótulo y cifra; sin desbordamiento a 1440/1024/768; colegio inexistente),
`verify:platform-auth` 8/8 (modo normal: alta en una llamada y abre la ficha, logo subido a `institution-logos/<id>/` y
ruta guardada con el DANE, suspensión guardada, «Sin permiso» en ambos sentidos), `verify:db` 114/114. Regresión en
verde.

Fallos propios encontrados y corregidos: el gráfico de uso marcaba el eje con decimales (172,5) y era demasiado alto;
al ensancharlo para bajarle la altura, sus textos quedaron diminutos a 1024 px; ahora usa el ancho del sistema dentro de
un contenedor de 640 px y un tope redondo par (marcas 0 / mitad / tope enteras).
