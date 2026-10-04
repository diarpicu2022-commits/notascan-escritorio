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
