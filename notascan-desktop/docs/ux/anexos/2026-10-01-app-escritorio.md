# Anexo de diseño · App de escritorio NotaScan

Fecha: 2026-10-01 · Pieza: app de escritorio (Tauri + React + TypeScript + Tailwind + Framer Motion)

## 1. Usuarios y tarea (vista de cliente)

| Rol | Quién | Tarea dominante | Lectura |
|---|---|---|---|
| Docente | Profesor de básica/media, uso diario, experiencia técnica media, con prisa entre clases | Verificar la nota que detectó la IA y guardarla sin errores | Obligada → el punto de entrada es la tarea |
| Secretaría | Personal administrativo, uso intensivo, tablas y formularios | Matricular, importar, generar boletines y paz y salvos | Obligada, densidad alta |
| Rectoría | Rector/coordinador, uso semanal | Entender el estado institucional y decidir solicitudes | Analítica, densidad equilibrada |

Estudiante y acudiente usan la app móvil (Flutter); no entran en esta app.
Registro: **producto**. Principio rector del sistema: «La IA detecta. El docente verifica. El sistema guarda.»

## 2. Contrato de diseño

**El contrato es el design system `notascan-ui` v0.4.0** (`../notascan-ui/`), fijado por Diego el
2026-10-01: «ese debes utilizarlo y no puedes salir de él». Por eso no se presentaron
direcciones alternativas ni se hizo una investigación nueva de referentes: la dirección visual
ya está decidida y documentada en `notascan-ui/docs/explicacion.md` (v1→v9) y
`notascan-ui/docs/brand-book.md`.

Cláusulas que se citan en cada paso:

- **C1 · Tokens.** `tokens.json` es la fuente única. `tokens.css` y `notascan.css` se copian sin editar a `src/styles/`. Ningún color, tamaño, radio, sombra, duración ni curva fuera de ellos.
- **C2 · Tailwind solo mapea tokens** (`docs/implementacion.md`). Nunca `bg-[#…]` ni valores arbitrarios. Tailwind se usa para disposición (grid, flex, gap, márgenes); las superficies (bordes, sombras, bloques) salen de las clases `ns-*`, porque con el preflight desactivado la utilidad `border` no define `border-style`.
- **C3 · Componentes.** Cada componente del sistema se porta a TSX con el mismo marcado y las mismas clases `ns-*`, y los mismos textos. Atomic Design: `components/{atoms,molecules,organisms,templates}`. Si un patrón aparece dos veces, es un componente.
- **C4 · Paleta y semántica** (brand book §Color). gold = acción/activo, sage = alta confianza/verificada, burgundy = baja confianza/error, nunca gold como texto sobre ivory. El color nunca va solo.
- **C5 · Tipografía.** Fraunces (títulos, nota, cifras) + Inter (interfaz). Números tabulares, nota con un decimal.
- **C6 · Movimiento** (brand book §Interacción + `implementacion.md` §Framer Motion). Tres ritmos: entrada, respuesta, ambiente. Solo `transform` y `opacity`. `<MotionConfig reducedMotion="user">`. Nada se mueve en tablas ni formularios mientras se lee o escribe.
- **C7 · Voz.** Español, tutea al docente, «la IA detecta», estados con palabras fijas, sin emoji.
- **C8 · Accesibilidad.** AA de piso, AAA en cifras que deciden, foco visible, teclado completo, `aria-*`, controles ≥ 44 px (`--control-md`).
- **C9 · Iconos.** Solo el set `Icon` del sistema (retícula 24, trazo 2). No se añade `lucide-react` ni otro banco.

Cualquier cambio a este contrato necesita permiso explícito y queda fechado aquí.

### Excepciones fechadas

- **2026-10-01 · Botones `size="sm"` de 36 px.** Diego elige mantener el tamaño del sistema
  (`.ns-btn--sm`, 36 px) aunque su mínimo global de toque es 44 px. Motivo: app de escritorio con
  ratón y la orden de no salir del sistema. Cumple WCAG 2.2 AA 2.5.8 (24 px). Las comprobaciones
  siguen midiendo los 44 px y lo reportan como excepción aceptada, no como fallo.
- **2026-10-01 · Sidebar con desplazamiento propio.** Diego acepta la recomendación: se conserva el
  sidebar del sistema (100vh, se desplaza por dentro). Por debajo de ~860 px de alto «Cerrar sesión»
  queda fuera de vista pero alcanzable con rueda y teclado. No se sube `minHeight` de la ventana
  (700 px) para no excluir portátiles de 1366×768.
- **2026-10-01 · Enmienda 3a: contraste del cambio de nota en Solicitudes.** Diego elige la opción a.
  En `amendments.css`: nota actual en `--charcoal`; el recuadro del valor solicitado pasa a `--paper`
  con borde `--gold` y `--shadow-gold`; su rótulo en `--navy`. Corrige un rótulo que no llegaba a AA
  (2.07:1) y lleva a AAA las dos cifras con las que Rectoría decide.
- **2026-10-01 · Enlace a la app móvil.** Se conserva tal cual del sistema; en escritorio lleva al
  login porque estudiante y acudiente usan la app Flutter.
- **2026-10-01 · Enmienda 1b: color del perfil a token.** El resumen del perfil usaba `#d9cfbd`, que no
  está en `tokens.json`. Diego eligió pasarlo a un token: `--ivory-deep` (#efe8dc), el más cercano al
  original. Contraste medido 11.68:1 sobre navy.
- **2026-10-01 · Enmienda 2a: maquetación a 1024 px.** Diego autoriza una corrección mínima en
  `src/styles/amendments.css` (cargado después de `notascan.css`, que no se edita):
  `.ns-app-main { grid-template-columns: minmax(0, 1fr) }` para que la Planilla se desplace dentro de
  su caja en vez de ensanchar la página (171 px), y, por debajo de 1180 px, la etiqueta de cada cifra
  del Inicio en su propia línea (se salía 25–34 px del bloque; desborde de 8–9 px).
  Las comparaciones contra el sistema aplican estas mismas enmiendas a la referencia.
  Ampliación dentro del alcance de 2a (2026-10-01, paso 5b): Periodos se salía 38 px a 1024; se usa
  desde 1180 px el apilado que el sistema ya aplica por debajo de 900 px. Confirmada por Diego el
  2026-10-01 («sigue» tras la consulta).

## 3. Plan de implementación (un paso por vez, con visto bueno)

1. **Tokens** — hecho 2026-10-01, aprobado (ver §4).
2. **Componente clave** — hecho 2026-10-01, aprobado: `StudentGradeCard` y los átomos/moléculas que la componen (Icon, Button, Avatar, Badge, ConfidenceIndicator, ConfidenceBadge, GradeInput, GradeInputGroup, ReviewStatus, CountUp, sello «Verificada»).
3. **Esqueleto** — hecho 2026-10-01, aprobado: Login, `RoleShell` (Sidebar + Header), rutas `#/<rol>/<página>`, búsqueda Ctrl+K.
4. **Resto de componentes** — hecho 2026-10-01, aprobado: la infraestructura compartida
   (formularios, tablas, superposiciones, avisos, gráficos, flujo de revisión). Los organismos propios de
   cada rol (Gradebook, matrícula, boletín…) se portan en el paso 5 con su pantalla y sus datos.
5. **Pantallas completas**, por rol: 5a Docente — hecho y aprobado 2026-10-01 (enmiendas 1b y 2a); 5b Secretaría — hecho y aprobado 2026-10-01; 5c Rectoría — hecho y aprobado 2026-10-01 (enmienda 3a).
6. **Estados:** cargando, vacío, error, sin permiso, sin conexión/dato viejo.

## 4. Verificación

### Paso 1 · Tokens (2026-10-01)

`npm run build && npm run verify:tokens` (`scripts/verify-tokens.mjs`, Playwright + Chromium):

- 59/59 tokens de `tokens.json` iguales a lo que el navegador resuelve (comparación por valor).
- Tailwind `bg-gold`, `text-navy`, `shadow-brutal`, `rounded-md`, `p-4`, `font-display` resuelven a sus variables.
- Fraunces e Inter cargadas (`document.fonts.check`).
- Color muestreado sobre la captura renderizada: los 16 tokens opacos coinciden (±2).
- Contraste con píxeles del render: navy/ivory 12.86, navy/paper 13.99, navy/gold 4.91, gold-ink/ivory 5.42, sage-ink/sage-soft 5.52, muted/ivory-deep 5.67, burgundy/burgundy-soft 7.36, ivory/burgundy 8.41. gold/ivory 2.62 (sigue prohibido como texto).
- Sin literales de color ni valores arbitrarios de Tailwind en `src/` fuera de los archivos del sistema.
- Consola limpia. Capturas: `verify-out/paso1-tokens-1440.png`, `paso1-tokens-1024.png`.

Fallos encontrados y corregidos (del comprobador, no del sistema): comparación textual de tokens que el
minificador reescribe (`0.16`→`.16`, `120ms`→`.12s`), aviso de consola provocado por el propio muestreo
con canvas y servidor de vista previa que quedaba vivo.

Pendiente: anchos 390/768 no aplican (ventana Tauri con `minWidth` 1024); se verifica en 1024 y 1440.
La ventana nativa de Tauri no se ha probado: falta instalar Rust en el equipo.

### Paso 2 · Componente clave `StudentGradeCard` (2026-10-01)

Portados a TSX con el mismo marcado y clases (C3): `Icon` (60 iconos extraídos sin cambios de
`notascan.js`), `Button`, `Badge`, `Avatar`, `ConfidenceIndicator`, `GradeInput`, `CountUp`,
`ConfidenceBadge`, `ReviewStatus`, `GradeInputGroup`, `StudentGradeCard`, `StudentGradeCardSkeleton`;
hook `useCountUp`; datos simulados `REVIEW_ROWS` (los del sistema). El movimiento de la tarjeta
(entrada, hundimiento, sello, pulso de revisión) lo pone `notascan.css`; no se duplicó con
Framer Motion (C6).

La propuesta original hablaba de «voltear tarjeta» al confirmar; el sistema lo resolvió con el sello
«Verificada» (explicacion.md v2). Manda el sistema.

`npm run build && npm run verify:card` (`scripts/verify-card.mjs`): **51/52**.

- Fidelidad: la tarjeta original de `notascan-ui` (su CSS, su React y su `notascan.js`) renderizada
  en el mismo navegador con los mismos datos. DOM normalizado idéntico en las 6 variantes;
  diferencia de píxeles 0.000–0.007 %.
- Teclado: Enter edita y enfoca; «7» muestra «La calificación debe estar entre 1.0 y 5.0.» y
  deshabilita Confirmar; Enter no verifica una nota inválida; Escape cancela; «4,3» + Enter verifica,
  cae el sello 4.3 y el rótulo pasa a «Calificación corregida». Sin detección → «Introducir» → 3.6
  queda como «Introducida por el docente». Foco visible 2px.
- Count-up registrado fotograma a fotograma: 24 valores de 0.0 a 4.2. Con movimiento reducido la nota
  aparece final y la tarjeta en revisión no late.
- Contraste muestreado sobre el render: nota 14.18:1 (AAA), nota verificada 11.69:1, insignia media
  4.94:1, botón Confirmar 4.98:1; los 16 textos medidos ≥ 4.5:1.
- Sin desbordamiento a 1024 px; consola limpia.
- **Falla:** los botones de la tarjeta miden **36 px** (`.ns-btn--sm`, `notascan.css` l. 390). Cumplen
  WCAG 2.2 AA 2.5.8 (24 px) pero no el mínimo de toque de 44 px de Diego. No se cambió: decide Diego.

Fallos del comprobador corregidos: leía la nota cuando el conteo ya había terminado o a mitad de
conteo tras corregir.

### Paso 3 · Esqueleto (2026-10-01)

Portados (C3): `Logo`, `BrandTile`, `Sticker`, `StatusDot`, `Switch`, `NavigationItem`, `UserProfile`,
`ConnectivityStatus`, `EnrollBadge`, `GlobalSearch`, `Sidebar`, `Header`, `EmptyState`, `AppShell`,
`RoleShell`, `LoginPage` (con su ilustración); hook `useDialogFocus`; datos `ROLES` y los 72
estudiantes simulados con la misma semilla del sistema; enrutador `#/<rol>/<página>[/<id>][?tab=]`
y contexto de sincronización. Cada ruta muestra por ahora `Header` + `EmptyState` («Vista en
construcción») hasta el paso 5. Las vistas de verificación pasaron a `#/dev/tokens`, `#/dev/card`.

Decisión de alcance: `#/movil` (estudiante y acudiente) cae en el login de escritorio; el enlace
«¿Eres estudiante o acudiente? Entra a la app móvil» se conserva tal cual del sistema.

`npm run build && npm run verify:shell` (`scripts/verify-shell.mjs`): **62/62**.

- Fidelidad contra `NotaScanApp` original en la misma ruta: DOM idéntico y 0.000 % de píxeles
  distintos en login completo, sidebar de los tres roles, herramientas de los tres roles, búsqueda
  Ctrl+K abierta con consulta y panel de conexión.
- Comportamiento: errores del login con `role=alert`; orden de Tab radio → correo → contraseña → ver
  contraseña → recordarme → olvidaste → Entrar; Secretaría entra a `#/admin/dashboard`; navegar
  cambia ruta, `aria-current` y título; Ctrl+K enfoca el campo, «7A» da 7 resultados, flecha abajo y
  Enter abren el perfil; Escape cierra; modo sin conexión desactiva «Sincronizar ahora»; sincronizar
  pasa por «Sincronizando…» y vuelve a «Conectado»; cerrar sesión vuelve al login.
- Contraste medido sobre el render: 17 textos del shell y del login ≥ 4.5:1 (mínimo 4.91:1).
- Sin desbordamiento a 1024 y 1440; consola limpia; con movimiento reducido el ambiente del login
  queda quieto.

Fallos del comprobador corregidos: buscaba el ítem activo en el perfil (que no tiene); texto del orden
de Tab recortado; el panel de conexión es vidrio y dejaba ver contenido distinto detrás; Chromium
alternaba suavizado LCD/gris según la capa de composición (ahora `--disable-lcd-text` en todas las
comparaciones; la diferencia de píxeles además tolera 1 px de suavizado).

**Hallazgo del sistema (pendiente de decisión):** el sidebar ocupa 100vh y se desplaza por dentro.
Medido a 1024 px de ancho: «Cerrar sesión» queda fuera de vista a 700 y 768 px de alto (docente y
secretaría) y a 800 px (secretaría, 10 ítems); se ve desde ~860 px. Sigue alcanzable con rueda y
teclado. La ventana Tauri tiene `minHeight` 700.

### Paso 4 · Infraestructura compartida (2026-10-01)

Alcance: lo que el sistema declara reutilizable (`explicacion.md` §6: «una sola DataGrid, un Modal y un
Drawer, un sistema de formularios»). Portados (C3):

- Átomos: `FieldShell`, `Input`, `Select`, `Textarea`, `Checkbox`, `Progress`, `ProgressBar`,
  `IconAction`, `SegmentedTabs`, `Divider`.
- Moléculas: `SearchField`, `FilterGroup`, `UploadZone`, `ImportFileZone`.
- Organismos: `FiltersBar`, `ReviewStepper`, `ReviewSummary`, `Marquee`, `ProcessingPanel`,
  `ConfirmDialog`, `Modal`, `Drawer`, `ConfirmAction`, `PasswordResetDialog`, `Toast` + `useToast`,
  `EmptyState`, `DataTable`, `DataGrid`, `BarChart`, `LineChart`, `DonutChart`, `Block`, `BlockTitle`,
  `PageGrid`.
- Los tonos se tiparon con las variantes que existen en `notascan.css` (p. ej. `IconAction` solo
  `danger`, `Progress` `sage`/`burgundy`/`inverse`), así el tipado impide inventar una.

Método: `src/dev/specs.js` define 39 casos en JavaScript plano; se ejecutan tal cual con los
componentes portados (`#/dev/components`) y con `window.NotaScan` original.

`npm run build && npm run verify:components`: **121/121**.

- 39/39 casos con DOM idéntico y píxeles iguales (≤ 0.5 %, tolerancia de 1 px de suavizado).
- DataGrid: ordenar (aria-sort, desc → asc), paginar («Mostrando 1–5 de 7», aria-current), seleccionar
  todos → barra «5 seleccionados», casilla indeterminada, limpiar, densidad compacta, `th scope=row`.
- Diálogos: foco en la acción segura al abrir y Tab atrapado. Gráficos: tooltip con nota, barra baja
  en `ns-bar--low`, tabla oculta en los tres. Chips con `aria-pressed`.
- Contraste medido sobre el render: 23 textos ≥ 4.5:1 (mínimo 4.92:1 cabecera de tabla gold; ejes de
  gráfico 6.24:1, umbral gold-ink 5.42:1).
- Sin desbordamiento a 1024 px; consola limpia. Pasos 1–3 vuelven a pasar (26/26, 51/51, 62/62).

Fallos encontrados y corregidos: la página de prueba se ensanchaba a 2118 px porque su rejilla usaba
una columna `auto` y la cinta (`Marquee`) es infinita (fallo de la página de prueba, no del sistema;
`minmax(0, 1fr)` en ambos lados); el script pasaba el ratón por un rectángulo tapado por la barra.

### Paso 5a · Pantallas del Docente (2026-10-01)

Portadas (C3) con sus organismos y datos: Dashboard, Calificar (`UploadPage`), Revisión
(`GradeReviewDashboard`), Evaluaciones, Planilla (`Gradebook` + `GradeCell`), Conceptos
(`ConceptEditor`), Recuperaciones (`RecoveryTable`), Asistencia (`AttendancePanel` + `AttendanceRow`),
Comportamiento, Estudiantes, Reportes y el Perfil del estudiante (compartido, según rol) con
`ObserverTimeline`, `AttendanceCalendar` y `ReportCardDocument`. Datos académicos del sistema en
`src/data/academic.ts`. Cada página monta su marco con `PageShell` (rol del contexto, mismo alias de
ítem activo que el sistema). Las rutas de Secretaría y Rectoría siguen con la página provisional.

`npm run build && npm run verify:teacher`: **117/117**.

- Fidelidad: 16 rutas (11 pantallas + 5 pestañas del perfil) contra `NotaScanApp` original en la
  misma ruta: DOM idéntico del contenido y del menú, y píxeles iguales del contenido (el panel de
  procesamiento de Calificar avanza solo y se enmascara en ambos lados).
- Flujos: confirmar una tarjeta sube el resumen; filtro y búsqueda vacía; guardar muestra
  «¿Confirmar 2 calificaciones?», avisa «7 sin verificar quedarán pendientes» y termina en aviso.
  Planilla: foco inicial, flechas, «7» + Enter da el error del sistema, «4» + Enter guarda y baja;
  sin conexión deja punto pendiente y contador en la píldora. Conceptos: borrador de IA → aprobar →
  envío avisa los que faltan. Recuperaciones: 3.4 «Aprobada» conservando la original; 9 «Revisar» y
  Guardar deshabilitado. Asistencia: tecla T, guardar bloqueado hasta marcar todos. Comportamiento:
  errores de validación, «Redactar con IA», alta al inicio del observador. Perfil: el docente no ve
  «Información»; flechas entre pestañas.
- Contraste medido sobre el render: 17 textos ≥ 4.5:1; promedio del perfil 12.86:1 (AAA).
- Consola limpia en todos los flujos.

**Corrección de comportamiento (no visual):** el perfil del sistema solo leía `?tab=` al montarse; al
abrir otra pestaña del mismo estudiante desde Ctrl+K no cambiaba. Aquí el perfil se vuelve a montar
cuando cambia el estudiante o la pestaña de la ruta.

**Excepción fechada (pendiente de confirmar):** el resumen del perfil usa en el sistema el color
`#d9cfbd` (texto sobre navy), que no está en `tokens.json`. Se conserva marcado `ds-literal` para no
salir del sistema; contraste medido 9.22:1. Los scripts lo informan en cada ejecución.

**Hallazgos del sistema (pendientes de decisión):** a 1024 px (ancho mínimo de la ventana) el sistema
original ya se desborda: Dashboard 8–9 px y Planilla 171 px (la tabla ensancha toda la columna
principal hasta 1195 px). Medido igual en la referencia y en la app. Los scripts lo informan como NOTA
mientras mida lo mismo.

Fallos del comprobador corregidos: selectores (curso tomado como resultado, etiqueta «Estudiante *»),
la medida de contraste esperaba «estabilidad» del elemento (ahora recorta su recuadro con animaciones
congeladas), `verify-tokens` no conocía la marca `ds-literal` y `verify-shell` medía el aviso
provisional que el dashboard ya no tiene.

#### Paso 5a · enmiendas aplicadas (2026-10-01)

- 1b y 2a aplicadas (ver Excepciones fechadas). Ya no queda ningún literal fuera de los tokens en `src/`.
- Al quitar el desborde apareció un fallo de comportamiento de la Planilla que el desborde ocultaba:
  al moverse con flechas, `focus()` no desplazaba la caja y la celda «Actitudinal» quedaba a medias.
  Corregido: la celda activa se trae a la vista sin quedar bajo la columna fija de nombres.
- `verify:teacher` **123/123**: Planilla a 1024 px se desplaza dentro de su caja (887 px de tabla en
  692 px), la celda activa queda visible a la derecha y a la izquierda; ninguna cifra del Dashboard se
  sale de su bloque; sin desbordes horizontales en las 11 pantallas. Resto: tokens 26/26, tarjeta
  51/51, esqueleto 62/62, componentes 121/121.
- Fallo del comprobador corregido: el parche de la referencia cambiaba también el rótulo dorado.

### Paso 5b · Pantallas de Secretaría (2026-10-01)

Portadas (C3) con sus organismos y datos (`src/data/admin.ts`): Dashboard, Estudiantes y Matrículas
(`StudentTable` + `StudentDrawer`, compartida con Rectoría en solo lectura), Matrículas
(`StudentRegistrationForm` por secciones + `BulkImportPanel` de 6 pasos), Usuarios (`UserDirectory`
+ `PasswordResetDialog`), Estructura Académica (`AcademicStructureManager` + drawer), Malla Curricular
(`CurriculumManager` + `AcademicAssignmentSelector`), Periodos (`PeriodConfigurator` +
`PeriodWeightEditor`), Boletines (`ReportCardManager`), Paz y Salvos (`PazYSalvosTable`) y Ranking
(`RankingTable` con exportación CSV). El perfil del estudiante muestra a Secretaría la pestaña
«Información» con el aviso de datos sensibles.

**Corrección de comportamiento (no visual):** el sistema no pasaba `?tab=` a las páginas, así que
«Importar estudiantes» abría «Registrar estudiante». Ahora la pestaña de la ruta llega a la página.

`npm run build && npm run verify:admin`: **102/102**.

- Fidelidad: 11 rutas contra `NotaScanApp` original: DOM idéntico del contenido y del menú, píxeles
  iguales del contenido, consola limpia.
- Flujos: búsqueda, selección en lote, archivar con confirmación, vista rápida y edición en drawer,
  abrir perfil; matrícula con obligatorios, correo inválido, sección médica sensible y resumen;
  importación completa (vista previa → 7 filas a revisar → «Resuelve 4 errores» → corregir 3 y omitir
  1 → confirmar → completada); restablecer contraseña sin mostrarla, desactivar usuario, pestaña de
  acudientes; crear grado con validación; choque de asignación explicado y hueco 8B · Inglés asignado;
  periodo al 95 % bloqueado y al 100 % habilitado, periodo cerrado en solo lectura; boletín en modal y
  «Generar todos» omitiendo bloqueados; paz y salvo al día habilita boletines; medallas del ranking y
  filtro por materia.
- Contraste medido sobre el render: 11 textos ≥ 4.5:1 (mínimo 4.91:1); promedio en tabla 13.99:1 (AAA).
- Sin desbordamiento a 1024 px en las 11 rutas (tras la ampliación de 2a en Periodos).
- Regresión de los pasos anteriores: 26/26, 51/51, 62/62, 121/121, 123/123.

Fallos del comprobador corregidos: selectores ambiguos (avatar dentro del enlace, «Boletines» también
en «Ir a Generar boletines», `aria-current` del paginador) y el orden del flujo de Paz y Salvos (con el
filtro «Bloqueado» la fila desaparece al ponerse al día).

### Paso 5c · Pantallas de Rectoría (2026-10-01)

Portadas (C3): Panorama Institucional (`InstitutionalAnalytics` sin filtros + bloque de decisiones +
docentes con pendientes), Analítica (KPI + 4 gráficos con su pregunta), Seguimiento Docente
(`TeacherMonitoringPanel` con resumen verde/amarillo/rojo y `TeacherStatus`), Solicitudes
(`AuthorizationInbox`), Estudiantes (la tabla de Secretaría en solo lectura), Observador y Reportes
(compartida con el docente). Datos en `src/data/principal.ts`. Con los tres roles completos se retiró
la página provisional del paso 3.

`npm run build && npm run verify:principal`: **73/74**.

- Fidelidad: 8 rutas (incluido el perfil con «Información») con DOM idéntico y píxeles iguales.
- Flujos: 3 solicitudes en el panorama y en el menú; aprobar #244 con confirmación («la nota original
  queda en el historial») y aviso; rechazar exige motivo y el motivo queda en el historial; seguimiento
  ordenado por menor avance (48 %), filtro «Rojo» y recordatorio; estudiantes sin selección, sin
  editar/archivar/retirar y sin registrar; tooltip «Octavo · 3.4» y 4 tablas ocultas; filtro del
  observador; reporte en Excel; perfil con aviso de datos sensibles.
- Sin desbordamiento a 1024 px en las 8 rutas; consola limpia.

**Hallazgo del sistema (pendiente de decisión):** el bloque «Nota actual → Cambio solicitado» de
Solicitudes (`.ns-change-big`), medido sobre el render:
- rótulo «CAMBIO SOLICITADO», `gold-ink` sobre `gold`, 11 px: **2.07:1** (no cumple AA);
- nota solicitada, `navy` sobre `gold`: 4.92:1 (AA, no AAA para cifra que decide);
- nota actual, `muted` sobre `ivory`: 6.24:1 (AA, no AAA para cifra que decide).

#### Paso 5c · enmienda 3a aplicada (2026-10-01)

Medido sobre el render: rótulo «Cambio solicitado» 13.99:1 (antes 2.07:1), nota solicitada 13.99:1
(antes 4.92:1), nota actual 12.80:1 (antes 6.24:1). `verify:principal` **76/76**; la referencia del
sistema se compara con la enmienda aplicada. Regresión: esqueleto 62/62, Secretaría 102/102.

### Paso 6a · Backend Supabase y acceso (2026-10-02)

Decisiones de Diego: Supabase como backend (más robusto y escalable: Postgres estándar, RLS, un solo backend
para escritorio y móvil); vista «Sin permiso»; selector «Entrar como» se mantiene y valida; «Cuenta
institucional» avisa que aún no está; restablecimiento por correo de Supabase.

Copia nueva (patrón `ns-auth-error` del sistema, voz C7): «Correo o contraseña incorrectos.», «Tu cuenta está
registrada como {rol}.», «Tu cuenta no tiene acceso a la app de escritorio. Solicita acceso a tu coordinación.»,
«El acceso con cuenta institucional aún no está disponible. Entra con tu correo.», aviso «Revisa tu correo».
«Sin permiso»: `EmptyState` de error con candado (mismo patrón que «Boletines bloqueados») dentro del marco del
propio rol, con «Ir a mi inicio».

Verificación: `verify:db` 34/34 (PGlite + Supabase simulado: permisos por rol, historial de notas, cierre de
evaluaciones, solicitudes, fotos); en el proyecto real, conteos de la semilla, 0 tablas sin RLS, anónimo sin
lectura ni ejecución de funciones; Security Advisor de 26 a 11 avisos (los 11 intencionales). `verify:auth`
20/20 (contra Supabase real sin cuenta y con sesión simulada). Regresión en modo demo: login idéntico al sistema.

Fallos propios encontrados y corregidos: funciones `security definer` ejecutables por PUBLIC y comparación de
rol con `<>` que dejaba pasar a anónimos en `decide_grade_request` (hallado por el Advisor); carrera entre el
evento `SIGNED_IN` y la validación del rol que borraba el mensaje de error del login (hallado por `verify:auth`).
Corrección de lo que le dije a Diego: el enlace de restablecimiento no trae formulario de Supabase; falta la
página de destino.

### Paso 6b.1 · Capa de datos y estados (2026-10-02)

- Estados con piezas del sistema, tal como las define: carga = filas `.ns-skel` de la `DataGrid`; error =
  `EmptyState` de error con «Reintentar»; vacío = `EmptyState` con su mensaje; dato viejo = `Toast` de error
  «No pudimos actualizar los estudiantes · Mostramos lo último que cargamos a las hh:mm.» manteniendo la tabla.
- Guardado optimista: la tabla cambia al instante y, si la base lo rechaza, vuelve atrás con el aviso
  «No pudimos guardar los cambios · Revisa tu conexión e inténtalo de nuevo. No se modificó ningún registro.»
- Sin dato real (sin notas verificadas o sin asistencia): «—» y «Sin registros», nunca un número inventado.
- Verificación: estados forzados en demo 9/9 (contraste del error 11.21:1), capa de datos con API simulada 8/8,
  base 39/39, vista aplicada en el proyecto (72 filas, `security_invoker`, anónimo sin acceso); fidelidad intacta.
- Fallos propios corregidos: en demo el estado forzado no formaba parte de la clave de la consulta.

### Paso 6b.2 · Docente con datos reales (2026-10-03)

Pantallas conectadas: Revisión de calificaciones, Planilla, Asistencia, Comportamiento (observador) y Conceptos.
En modo demostración siguen idénticas al sistema (fidelidad del Docente 123/123).

- **Firmas en la base, no en el cliente** (migración `20261003090000_registro_docente.sql`): quién verificó una nota,
  quién tomó la asistencia, quién revisó un concepto y el autor de una observación los pone la base con la sesión.
  Una petición que mande otra firma se ignora (nota, asistencia, concepto) o se rechaza (observación).
- **Revisión**: abre `#/teacher/review/<id>` o la primera evaluación en revisión del docente; guarda solo las
  tarjetas que cambiaron. Si la base rechaza, las verificaciones siguen en pantalla y se avisa.
- **Planilla**: columnas = evaluaciones de la asignación con su peso; celdas = notas **verificadas** (una lectura de
  la IA sin verificar no aparece hasta que el docente la verifica en la revisión). Escribir una nota la guarda como
  verificada; si la base la rechaza, la celda vuelve a su valor y la barra de estado dice por qué
  («La evaluación está cerrada. Solicita el cambio de nota a Rectoría.»).
- **Asistencia**: por curso y fecha (hoy por defecto); una clase por día mientras no exista el horario (hora 1).
  En modo normal el encabezado es la fecha elegida, sin «2.ª hora».
- **Conceptos**: nota del periodo = promedio ponderado de las verificadas; faltas = inasistencias del periodo. Se
  guardan al salir del texto, al aprobar un borrador y al enviar. Sin nota verificada no hay borrador.
- Estados con piezas del sistema: carga = bloques `.ns-skel` (en revisión, las tarjetas esqueleto); error =
  `EmptyState` de error con «Reintentar»; vacíos con salida («No tienes evaluaciones en revisión.», «Este curso aún
  no tiene evaluaciones.» con «Ir a evaluaciones», «Este curso no tiene estudiantes activos.», «Aún no hay
  anotaciones.», «No tienes cursos asignados en el periodo abierto.»).

**Decisiones aprobadas por Diego el 2026-10-03** (no cambian el modo demostración):
1. Selector de curso en el encabezado de Conceptos cuando el docente tiene más de un curso (`FilterGroup` del
   sistema, igual que en Planilla). Sin él solo se podría ver el primer curso.
2. Copia corregida: el aviso del observador decía «Se notificó al acudiente.», que no es cierto (no hay
   notificaciones ni acceso del acudiente en la base); ahora dice «Quedó en el observador de {nombre}.».
   En Conceptos, un estudiante sin notas verificadas muestra «Sin nota» en vez de un desempeño calculado sobre nada.
3. `ConfirmAction` acepta `loading` (el botón muestra «Guardando…»), como ya lo hacía `ConfirmDialog`.

Verificación: `verify:teacher` 123/123 (demo), `verify:states` 29/29 (5 pantallas nuevas, contraste del error
11.26:1), `verify:teacher-data` 19/19 (API simulada: lectura, cuerpo de cada escritura sin firmas, rechazo de la
base), `verify:db` 51/51 (firmas no falsificables, RLS por curso y asignación). Regresión: tokens 26/26, card 51/51,
shell 62/62, components 121/121, admin 102/102, principal 76/76, auth 20/20, data 8/8.

Fallos propios encontrados y corregidos: al refactorizar la planilla se perdió el efecto que enfoca la celda activa
(6 fallos en `verify:teacher`); el comentario de `verify-db` decía que Ana dicta en 3 cursos y la semilla la tiene
en los 6. Hallazgo sin corregir (paso 6b.4): `decide_grade_request` marca la solicitud como aprobada pero no aplica
la nota nueva en `grades`.

### Paso 6b.2b · Docente: inicio, estudiantes, evaluaciones y recuperaciones (2026-10-03)

Diego aprueba 6b.2 y sus tres decisiones, y pide 6b.2b. Una sola lectura (evaluaciones de las asignaciones del
periodo abierto, sus notas y la lista de los cursos) alimenta Inicio, Estudiantes y Evaluaciones.

- **Inicio**: saludo según la hora con el nombre real; «Continúa donde quedaste» = primera evaluación en revisión
  con su avance (verificadas / estudiantes del curso) y abre esa evaluación; cifras: notas por verificar, verificadas
  este mes, promedio del curso (media de los promedios ponderados de cada estudiante). Sin evaluación en revisión, el
  bloque navy dice «No tienes revisiones pendientes» y ofrece «Calificar una evaluación». «Subido hace 2 horas»
  no se muestra en modo normal (la base no guarda la hora de subida todavía).
- **Estudiantes**: los de los cursos del docente, con promedio de notas verificadas y estado de la última nota;
  «Sin calificaciones» si no tiene ninguna. «Exportar lista» descarga un CSV (UTF-8 con BOM y punto y coma, para
  Excel en español) con lo que está filtrado.
- **Evaluaciones**: tarjetas de la base por asignación (selector de curso en el encabezado, decisión 1 de 6b.2).
  **Nueva evaluación** abre un `Drawer` del sistema con `Input`, `SegmentedTabs` e `Input` de fecha (mismo patrón
  que la edición de estudiante): nombre, tipo, porcentaje y fecha. No deja pasar del 100 % del periodo
  («Con esta evaluación el periodo sumaría 110 %. El máximo es 100 %.»). Se crea en borrador.
- **Recuperaciones**: estudiantes con promedio de la materia por debajo de 3.0 en el periodo abierto; una
  recuperación ya guardada conserva su nota original aunque la nota cambie. La base deriva el resultado
  (≥ 3.0 aprueba) y firma quien registra (migración `20261003120000_recuperaciones.sql`).

**Decisión aprobada por Diego el 2026-10-03**: el formulario de «Nueva evaluación» (el sistema tenía el botón sin acción).
Sin él, la planilla de un curso sin evaluaciones no tiene salida.

**Fuera de 6b.2b, con decisión pendiente**: Reportes (qué formatos: el sistema ofrece PDF, Excel y CSV; PDF y
Excel reales necesitan una librería o la impresión del sistema) y Subir fotografías (subir al bucket privado es
posible ya; leer la nota necesita el servicio de visión, que es transferencia a un tercero y debe ir en la política
de datos, con plazo de retención de las fotos).

Verificación: `verify:teacher` 123/123, `verify:states` 45/45 (4 pantallas más), `verify:teacher-data` 29/29
(10 nuevas: cifras del inicio, CSV descargado, tope del 100 %, cuerpo de cada escritura), `verify:db` 57/57.
Regresión: tokens 26/26, card 51/51, shell 62/62, components 121/121, admin 102/102, principal 76/76,
auth 20/20, data 8/8.

Fallo propio corregido: el promedio del inicio ponderaba todas las notas juntas (3.3 con 4.0 y 2.0); ahora es la
media de los promedios de cada estudiante (3.0). `verify:auth` falló (19/20) porque su sesión simulada no
respondía a las nuevas lecturas del inicio y salían 401 contra el proyecto real; la prueba ahora responde vacío
a la API que no simula.

Migraciones de 6b.2 y 6b.2b aplicadas en el proyecto real el 2026-10-03 (SQL Editor, una transacción, contenido
cotejado con el repositorio). Comprobación en la base: disparadores `grades_stamp`, `attendance_stamp`,
`concepts_stamp` y `recoveries_stamp` activos; `stamp_*` sin permiso de ejecución para anon ni authenticated;
`observations.author_id` por defecto `auth.uid()`.

### Paso 6b.3a · Secretaría: configuración con datos reales (2026-10-03)

6b.3 se divide en dos entregas: **6b.3a** configuración (Estructura, Malla, Periodos, Usuarios) y **6b.3b**
Matrícula, Boletines, Paz y salvo, Ranking e Inicio. En modo demostración todo sigue idéntico al sistema
(fidelidad de Secretaría 102/102).

- **Estructura académica**: grados, cursos y materias de la base. Crear un curso usa el id en mayúsculas
  («6B»), enlaza el director por su correo del directorio, guarda el cupo y deja activo su grado si estaba «Sin
  cursos». Archivar conserva el historial.
- **Malla curricular**: matriz y lista de la base en el periodo abierto. Cambiar el docente conserva evaluaciones y
  notas. **Una asignación con evaluaciones no se elimina** (la base lo impide: borraría notas en cascada) y se dice
  qué hacer.
- **Periodos**: guardar fechas, estado y componentes es una sola operación en la base (`save_period`, exige 100 %);
  solo un periodo abierto a la vez. «Crear periodo» crea el siguiente en borrador con la distribución base.
  «Guardar pesos» actualiza el peso final de cada periodo creado.
- **Usuarios**: personal del directorio con el estado real de su cuenta y su último acceso (la base lo registra al
  entrar); acudientes desde la matrícula. «Invitar usuario» registra a la persona en el directorio (es lo que la
  deja crear su acceso). Desactivar marca el perfil como inactivo. Restablecer pide a Supabase el enlace al correo.
  El correo de alguien que ya tiene cuenta no se cambia desde aquí.
- Estados: tablas con los de la `DataGrid`; malla y periodos con bloques `.ns-skel`, error con «Reintentar» y vacíos
  con salida.

**Decisiones aprobadas por Diego el 2026-10-03**:
1. Estado nuevo **«Sin cuenta»** (insignia neutra con icono de persona) para quien está registrado pero no ha creado su
   acceso, y para los acudientes. Mostrar «Invitación enviada» habría sido falso: no se envía ningún correo.
2. Formulario de **«Invitar usuario»**: el mismo `Drawer` de edición (nombre, correo y rol). Registra en el
   directorio; **no envía correo** (invitar por correo necesita una función de servidor con la clave de servicio).
3. Copia corregida en la malla: «Las calificaciones registradas se conservan.» era falsa (eliminar borraba notas en
   cascada); ahora dice «Si ya tiene evaluaciones no se puede eliminar: cambia el docente.».
4. «Crear periodo» en demostración avisa que los periodos son fijos (antes el botón no hacía nada).

Pendiente: no hay forma de **reactivar** a un usuario desactivado (el sistema tampoco la tiene). El enlace de
restablecimiento sigue sin página de destino (pendiente desde 6a).

Verificación: `verify:admin` 102/102 (demo), `verify:states` 61/61 (4 pantallas más), `verify:admin-data` 18/18
(API simulada: cuerpo de cada escritura, regla de la base mostrada al usuario, último acceso), `verify:db` 69/69.
Regresión: tokens 26/26, card 51/51, shell 62/62, components 121/121, principal 76/76, teacher 123/123, auth 20/20,
data 8/8, teacher-data 29/29.

Fallos propios encontrados y corregidos: «Crear periodo» numeraba contando los periodos del año en vez de tomar la
última posición (con huecos habría creado un periodo repetido); lo halló `verify:admin-data`. `verify:data` y
`verify:teacher-data` dieron un 401 porque la llamada nueva de último acceso salía al proyecto real; ahora esas pruebas
responden vacío a la API que no simulan.

Migración de 6b.3a aplicada en el proyecto real el 2026-10-03 (SQL Editor, una transacción, contenido cotejado con el
repositorio). Comprobación: disparador `assignments_keep_grades` activo, índice `academic_periods_one_open`,
`block_assignment_delete` sin permiso de ejecución, `save_period` y `touch_last_seen` solo para authenticated.

### Paso 6b.3b · Secretaría: matrícula, paz y salvo, ranking e inicio (2026-10-03)

Diego aprueba 6b.3a y pide 6b.3b. **Boletines queda fuera de esta entrega** a propósito: generar el PDF es la misma
decisión pendiente que los formatos de Reportes, y el boletín del sistema muestra un mensaje del director y un
puesto en el curso que hoy son texto generado, no datos (ver «Decisiones»).

- **Registro de matrícula**: grado y curso salen de la estructura de la base. Guardar es una sola operación
  (`enroll_student`): estudiante, acudiente principal y ficha médica (solo si se llenó algún dato médico); el código
  estudiantil lo genera la base (año + consecutivo, con candado para que no se repita). El documento se valida (8 a
  12 dígitos) y se guarda con su tipo («TI 1084512345»). La confirmación muestra el código asignado.
- **Importación masiva**: lee CSV («;» o «,», comillas, BOM de Excel). Valida cada fila contra la base: nombres,
  documento (vacío o corto), curso inexistente, fecha imposible, ya matriculado, repetida en el archivo y sin
  teléfono (advertencia). Corregir y omitir como en el sistema. Confirmar importa **todo o nada**
  (`enroll_students`). «Descargar plantilla» e «informe» bajan CSV reales. En modo normal se quita «Usar archivo de
  ejemplo» (importaría estudiantes inventados) y la zona de carga deja de prometer Excel.
- **Paz y salvo**: interruptores sobre la base con guardado optimista y reversión; acción en lote de documentos.
- **Ranking**: solo notas verificadas; por periodo (el abierto por defecto) o acumulado anual con el peso de cada
  periodo; materias aprobadas sobre las materias con nota («1 / 1»), no sobre 6 fijas. Sin notas, no se ubica a nadie.
- **Inicio**: cifras de la matrícula, pendientes reales y tareas calculadas: cierre del periodo abierto (o «Abrir un
  periodo» si no hay), boletines por generar del último periodo cerrado, paz y salvos bloqueados y el primer hueco
  de la malla. «Importar estudiantes» abre la pestaña de importación (la misma corrección que en Estudiantes).

**Decisiones que esperan visto bueno de Diego**:
1. Importación solo CSV por ahora. Leer .xlsx necesita una librería (propuesta: `read-excel-file`, MIT); hasta
   entonces el aviso explica cómo guardar como CSV desde Excel.
2. Boletines (6b.3c): cómo se produce el PDF (impresión del sistema a PDF o librería) — misma decisión que Reportes —
   y qué hacer con el **mensaje del director** y el **puesto en el curso**: el primero hoy lo redacta una regla, no una
   persona (propuesta: campo que escribe el director de grupo, con la IA como borrador, como los conceptos); el
   segundo se puede calcular de las notas.
3. El ranking exporta CSV con el botón «Exportar a Excel» (el aviso ahora dice «archivo CSV»).

Pendiente legal (Ley 1581): la matrícula guarda datos de menores y de salud **sin registrar la autorización del
acudiente**. Va en el paso de privacidad, antes de usar la app con datos reales.

Verificación: `verify:admin` 102/102 (demo), `verify:states` 73/73 (3 pantallas más), `verify:admin-data` 29/29 (11
nuevas: registro con código de la base, CSV con siete casos de validación, importación todo o nada, paz y salvo,
ranking, tareas del inicio), `verify:db` 77/77 (código consecutivo, documento repetido, curso inexistente, docente sin
permiso, lote todo o nada, sin ficha médica vacía).
Regresión: tokens 26/26, card 51/51, shell 62/62, components 121/121, principal 76/76, teacher 123/123, auth 20/20,
data 8/8, teacher-data 29/29. En la primera corrida `verify:teacher` se cortó con `ERR_NETWORK_IO_SUSPENDED` (el equipo
suspendió la red durante la prueba); repetida sola: 123/123.
