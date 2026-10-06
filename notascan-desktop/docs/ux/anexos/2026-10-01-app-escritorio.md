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

6b.3b aprobado por Diego el 2026-10-03. Migración de matrícula aplicada en el proyecto real ese día (SQL Editor, una
transacción, contenido cotejado): `enroll_student` y `enroll_students` con security invoker, sin ejecución para anon.
Las tres decisiones de 6b.3b (xlsx, PDF y mensaje del director, CSV del ranking) siguen abiertas para 6b.3c.

### Paso 6b.3c · Boletines, mensaje del director y Excel (2026-10-03)

Decisiones de Diego (2026-10-03): **el PDF sale del diálogo de impresión** (también para Reportes), **el mensaje del
director lo escribe el director de grupo** con la IA como borrador, y se agrega **`read-excel-file`** (MIT, 9.3.10;
`npm audit` sin vulnerabilidades) para importar .xlsx.

- **Boletines**: la vista previa y el documento impreso usan la misma pieza del sistema (`ReportCardView`, separada de
  sus datos; en demostración dibuja lo mismo que antes). Solo entra lo que una persona confirmó: notas verificadas por
  materia y periodo, acumulado con el peso de cada periodo, conceptos escritos o revisados por el docente y el mensaje
  escrito o revisado por el director (sin mensaje, la sección no aparece). El puesto en el curso se calcula con los
  promedios del periodo. Rector y director salen del directorio. «Generar» abre la impresión con un boletín por página
  (`print.css`: solo se imprime el documento, A4) y marca el boletín como generado en la base (quién y cuándo los pone
  la base). Los bloqueados por paz y salvo se omiten.
- **Faltas por materia**: la asistencia se toma por curso, no por materia; la columna muestra «—» y el total va en
  el pie y en «Asistencia».
- **Mensaje del director** (Docente → Conceptos): si el docente dirige un grupo aparece la pestaña «Mensajes de
  director · 6A» con el mismo editor de conceptos (borrador de IA, aprobar, enviar). El resumen del grupo (materias,
  promedio y faltas del periodo) llega por `director_overview`, que comprueba que es el director sin abrirle las tablas
  de notas de otras materias.
- **Excel**: la importación lee la primera hoja de un .xlsx (fechas de celda y documentos numéricos) o un CSV; los .xls
  antiguos se rechazan con instrucciones. La zona de carga vuelve a ser la del sistema.

Migración `20261003230000_boletines.sql`: `director_messages` con RLS (escribe el director; leen Secretaría, Rectoría
y el director), `directs_student`, `director_overview`, firmas de mensaje y de boletín generado.

**Pendiente que debe decidir Diego**: el encabezado del boletín lleva nombre, ciudad, resolución y DANE del colegio de
demostración («Colegio Los Andes · Resolución 0123 de 2015 · DANE 152001000000»). Antes de imprimir boletines reales
hace falta guardar los datos de la institución (propuesta: una pantalla pequeña en Secretaría → Configuración).

Verificación: `verify:admin-data` 36/36 (boletín con datos reales, impresión de 1 boletín y «Generar todos» solo con
los habilitados, marca de generado; .xlsx real generado con openpyxl en `scripts/fixtures/matricula.xlsx`),
`verify:teacher-data` 33/33 (pestaña del director, borrador con notas reales, guardado sin firma, sin notas no hay
borrador), `verify:db` 86/86, `verify:states` con Boletines. Regresión:
auth 20/20, data 8/8, teacher-data 33/33, admin-data 36/36, tokens 26/26, card 51/51, shell 62/62, components 121/121,
admin 102/102, principal 76/76, teacher 123/123, states 77/77, db 86/86.
Fallos propios corregidos: la prueba de Excel navegaba a la misma URL en la que estaba (la pantalla no se volvía a
montar); el efecto de impresión dependía de la función de cierre y habría abierto el diálogo en cada render (se fijó
con una referencia antes de probarlo).

6b.3c aprobado por Diego el 2026-10-03. Migración de boletines aplicada en el proyecto real ese día (una transacción,
contenido cotejado). Sobre los datos de la institución, Diego pide un **modo administrador de la plataforma**: él da de
alta los colegios clientes, carga su logo, resolución y DANE (que aparecen en el colegio, en boletines y en
estudiantes) y ve uso y estadísticas por colegio. Se diseña como Paso 7.

### Paso 6b.4a · Rectoría: solicitudes con cambio de nota real y observador (2026-10-05)

Diego aprueba 7e y decide el servicio de visión (**A · modelo multimodal tipo GPT-4o / Claude con visión**, para el
paso de Subir fotografías). Pide arrancar 6b.4 por Rectoría. Se entrega por partes: 6b.4a solicitudes y observador;
6b.4b panorama (indicadores), analítica, seguimiento docente y perfil.

Sin dirección nueva: pantallas del sistema (C3, Paso 5c) conectadas a la base. Registro **producto, lectura obligada**:
el punto de entrada es la decisión, sin adornos.

- **Hallazgo de 6b.2 corregido** (migración `20261005090000_solicitudes.sql`): la solicitud no decía qué nota
  cambiar. Ahora lleva `grade_id`; `decide_grade_request` al aprobar cambia la nota en la misma transacción
  (`grade_audit` guarda la original) y **no aplica a ciegas**: si la nota ya no es la «desde» de la solicitud, avisa
  «La nota cambió desde la solicitud (ahora es 4.0). Recházala y pide una nueva.» y la deja pendiente. Las solicitudes
  viejas sin nota enlazable se pueden rechazar, no aprobar. La política `requests_create` exige que la nota sea del
  docente, del mismo estudiante, curso y materia, y que su valor actual sea el «desde» (`request_fits_grade`).
  Efecto conocido: si la nota estaba verificada, la firma de verificación pasa a quien aprobó (disparador
  `stamp_grade_verification`); la auditoría deja claro el cambio.
- **Solicitudes**: bandeja con datos de la base (docente por su perfil, porque Rectoría no lee el directorio de personal),
  historial «Creada por…» + eventos de la base, aprobar/rechazar por la función con «Guardando…», el error de la base
  en el aviso y la bandeja sin cambios.
- **Panorama · «Esperan tu decisión»** con las pendientes reales. Sus estados van sobre el bloque navy: el `EmptyState`
  del sistema no tiene versión inversa (medido: 1.14:1), así que se usan piezas del sistema para fondo oscuro —
  `ns-list--inverse` para vacío y error (título 12.86:1, mensaje 9.22:1) y «Reintentar» en el lugar del botón del bloque.
- **Número del menú** «Solicitudes»: sale de la base en todas las páginas de Rectoría (antes, 3 fijo).
- **Observador** de toda la institución con datos reales (el RLS ya lo permitía a Rectoría), con carga, error y vacío.

Verificación: `verify:db` 127/127 (9 nuevas: crear sobre su nota, no a nombre de otro, «desde» = nota actual, sin nota
no, no sobre notas ajenas, solicitud vieja no se aprueba, aprobar cambia 4.3 → 4.6 con auditoría, nota cambiada no se
aplica, rechazar no toca la nota), `verify:principal-data` 13/13 (nuevo), `verify:states` 90/90 (Solicitudes, Panorama
y Observador de Rectoría), `verify:principal` 76/76 (fidelidad intacta).
Fallos propios: la etiqueta «0 solicitudes» se veía mientras cargaba (oculta hasta tener datos); los estados del bloque navy salieron ilegibles en la primera versión (1.14:1, encontrado por la
comprobación); un comando de edición se quedó esperando entrada y la primera corrida de `verify:db` no tenía las pruebas
nuevas; en la base, la prueba de «nota cambiada» intentó cambiar una nota con la evaluación cerrada y la base lo impidió
(se reabre la evaluación en la prueba).

**Migración pendiente de aplicar**: quedó cargada en el SQL Editor del proyecto real (cotejada por SHA-1
`c400c9cc5da0fed088721fa62026f917f817a663`, finales de línea LF, dentro de `begin; … commit;`); el permiso de ejecutarla
lo da Diego. Hasta aplicarla, aprobar en la app real no cambia la nota.

**Decisiones para Diego (6b.4a)**:
1. **Formulario del docente para pedir el cambio** de una nota cerrada: el sistema no lo trae (solo el mensaje «Solicita
   el cambio de nota a Rectoría»). Propuesta: en la planilla, sobre la celda cerrada, un `Modal` del sistema con nota
   nueva, motivo (lista corta) y detalle. Sin él, las solicitudes solo llegan por la semilla.
2. **Las 3 solicitudes pendientes de la semilla** no tienen nota enlazable en la base real: solo se pueden rechazar.
   Propuesta: dejarlas (sirven para probar el rechazo) o borrarlas al pasar a datos reales.

Medios: 1024 y 1440 px (390/768 no aplican, ventana Tauri con `minWidth` 1024) sin desbordamiento en panorama
(normal, vacío, cargando), solicitudes y observador; teclado: «Aprobar» a 4 tabulaciones desde la solicitud, foco visible
(contorno sólido de 2 px más sombra), Enter abre la confirmación con el foco dentro y Escape la cierra
(`scripts/verify-6b4a-viewports.mjs`, 14/14). Observado sin corregir, anterior a este paso: a 768 px el botón del
encabezado y el primer indicador del panorama se salen 17 px (fuera del rango de la ventana). Regresión: auth 20/20,
data 8/8, teacher-data 33/33, admin-data 37/37, platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62,
components 121/121, teacher 123/123, admin 102/102, principal 76/76, states 90/90, identity 25/25, platform 26/26.

### Paso 6b.4b · Rectoría: indicadores, analítica y seguimiento docente con datos reales (2026-10-05)

Diego responde «continua» tras 6b.4a: se toma como visto bueno de 6b.4a; sus dos decisiones siguen abiertas. El perfil
del estudiante (vista de Rectoría y compartida) se separa como **6b.4c** por tamaño.

Sin dirección nueva: `InstitutionalAnalytics` y `TeacherMonitoringPanel` del sistema (Paso 5c) reciben los datos como
propiedad opcional; sin ella pintan las cifras del sistema (la fidelidad en demostración no cambia: 76/76).

**Reglas de cálculo** (las mismas del Ranking de 6b.3b para no tener dos verdades):
- Nota de un estudiante en una materia y periodo: promedio ponderado (peso de la evaluación) de sus notas **verificadas**.
- Promedio del estudiante: media de sus materias; promedio institucional y por grado: media de los estudiantes con notas.
- Reprobación: estudiantes con al menos una materia por debajo de 3.0, sobre los que tienen notas. Diferencia en puntos
  frente al periodo anterior con notas; sin anterior, «Primer periodo con notas verificadas».
- Inasistencia: ausencias / registros de asistencia del rango del periodo, por grado (función `attendance_by_grade`).
- Evolución: periodos del año que ya tienen notas; la serie del año anterior aparece solo si tiene notas en esos mismos
  periodos (hoy no hay 2025 en la base, así que la línea va sola y la pregunta «¿Mejoramos frente al año pasado?» aún no
  se responde).
- Seguimiento: en el periodo abierto, por docente, notas verificadas sobre las esperadas (estudiantes activos del curso ×
  evaluaciones con fecha cumplida); evaluación pendiente = vencida y sin todas sus notas verificadas. Verde 100 %,
  amarillo ≥ 80 %, rojo < 80 % (los cortes de color de la barra del sistema). «Última actualización»: la nota más
  reciente que tocó, en «Hoy, 09:20» / «Ayer, 17:10» / «Hace 9 días» / «Sin registros».

Migración `20261005120000_rectoria_lectura.sql`: Rectoría lee el directorio de personal de su colegio (nombres de los
docentes sin cuenta todavía; sin escritura) y `attendance_by_grade(desde, hasta)` agrega la asistencia en la base
(security invoker). SHA-1 (LF) `f872f7b0774255e94dca5d58db090361f8d649ad`.

**Hallazgo corregido (afectaba pasos anteriores):** el API de Supabase devuelve como máximo 1000 filas por petición y
varias lecturas no paginaban: estudiantes del colegio (Secretaría y Rectoría), conteo de estudiantes de la estructura,
notas del Ranking, asistencia y notas del boletín (un curso de 35 en un periodo pasa de 2000 registros de asistencia),
notas de la planilla, de los conceptos y del inicio del docente. Ahora pasan por `allRows` (de 1000 en 1000, con orden
estable por id).

Estados: Analítica (carga, error, vacío «Aún no hay notas verificadas.»), Seguimiento (vacío «Aún no hay asignaciones en
el periodo abierto.») y, en el panorama, «Docentes con pendientes» con «Todos los docentes están al día.»; la
inasistencia sin registros lo dice en su bloque.

Verificación: `verify:principal-data` 25/25 con un juego de datos calculado a mano (3.3 · +0.3; 33 % · +33 puntos ·
1 estudiante; 8 % · Octavo; Sexto 3.3 y Octavo 3.4; Carlos 50 % retraso con 1 pendiente hace 9 días, Ana 100 %; cambio a
Periodo 2: 3.0, 0 %, asistencia pedida con 2026-04-06 → 2026-06-19), `verify:db` 132/132 (Rectoría lee el directorio y
no lo edita; el docente no lo lee; `attendance_by_grade` agrega y respeta el RLS; sin sesión no se llama),
`verify:states` 98/98, `verify:principal` 76/76, `verify:principal-viewports` 18/18 en 1024 y 1440 px. Regresión completa en verde: auth 20/20, data 8/8, teacher-data 33/33, admin-data 37/37, platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62, components 121/121, teacher 123/123, admin 102/102, identity 25/25, platform 26/26.
Fallos propios: la etiqueta decía «1 solicitudes» (corregido a singular, con comprobación); la primera medición de
visibilidad dio opacidad 0 porque se tomó a los 16 ms, dentro de la entrada escalonada del sistema — medido de nuevo a
1,5 s: 1. Observado sin cambiar (sistema): con `prefers-reduced-motion` la duración de la entrada se anula, pero el
retardo escalonado se mantiene, así que los bloques aparecen con unas décimas de segundo de diferencia.

**Decisiones para Diego (6b.4b)**:
1. **«Enviar recordatorio»** no tiene canal real: en la app conectada se oculta (en demostración sigue como el sistema).
   Propuesta: tabla de recordatorios que el docente ve como aviso en su Inicio; o correo cuando haya SMTP propio.
2. **«Exportar informe»** de Analítica no hace nada (tampoco en el sistema): se resuelve con Reportes.
3. **Meta institucional 3.5** (línea del gráfico) viene del sistema: ¿es la del colegio o la configura Secretaría?

#### Paso 6b.4b · decisiones de Diego y enmienda 5 (2026-10-05)

- **Cambio de nota de una evaluación cerrada:** sin formulario en la app; el docente lo gestiona **personalmente** con
  Rectoría. Se mantiene el mensaje de la planilla («Solicita el cambio de nota a Rectoría.») y la bandeja de
  Solicitudes con su corrección de 6b.4a (sirve para las que existan). Las 3 solicitudes pendientes de la semilla
  quedan como están (sin respuesta de Diego sobre ellas).
- **Meta institucional: la configura Secretaría** → **enmienda 5** al contrato: bloque «Meta institucional» al final de
  Secretaría → Periodos (configuración académica), solo con piezas del sistema (`Block`, `BlockTitle` con botón como
  «Guardar pesos», `Input` con ayuda y error). 3.5 por defecto (el valor del sistema), entre 1.0 y 5.0, un decimal.
  Rectoría la ve como línea «Meta» del promedio por grado y los grados por debajo se resaltan con ella.
  Migración `20261005150000_meta_institucional.sql`: `institutions.performance_goal` y `set_performance_goal` (solo
  Secretaría, la tabla de colegios sigue siendo de la plataforma). La comprobación de fidelidad de Periodos compara la
  pantalla sin ese bloque (`compareRoute` con `omit`) y el bloque tiene sus propias comprobaciones.
  Verificación: `verify:db` 136/136 (por defecto 3.5; ni docente ni Rectoría la cambian; fuera de rango no; 3.84 → 3.8;
  Secretaría no escribe la tabla de colegios; sin sesión no), `verify:admin` 105/105, `verify:admin-data` 38/38
  (envía 3.8 a `set_performance_goal`), `verify:principal-data` 26/26 (línea «Meta 3.3» con la meta de la base).
  Fallo propio en la prueba: intentaba escribir «3,84» en un campo numérico, que el navegador no admite; se prueba 3.84.

#### Paso 6b.4b · aprobado y recordatorio real (2026-10-05)

Diego aprueba 6b.4b y las propuestas: **recordatorio** que el docente ve en su Inicio, y **«Exportar informe»** junto
con Reportes. Pide subir los commits a GitHub a medida que se cierran los pasos.

- **Recordatorio** (migración `20261005180000_recordatorios.sql`, tabla `teacher_reminders`): Rectoría lo envía desde
  Seguimiento docente («Enviar recordatorio» vuelve a la app conectada) con el avance real del docente en el periodo
  abierto: «Tienes 1 evaluación con notas sin verificar en el Periodo 3 (50 % registrado). Ponte al día, por favor.».
  Aviso: «Carlos Pérez lo verá en su Inicio.». La base firma quién envía y solo deja enviar a docentes del directorio;
  el docente solo ve los suyos y los marca con `mark_reminder_seen` (no hay política de edición).
- **En el Inicio del docente** el recordatorio es el primer elemento de «Requieren tu atención» (fila de lista del
  sistema con el avatar de quien lo envía y un botón «Entendido»); sin recordatorios, el bloque queda como antes y en
  demostración no cambia nada.
- De paso: «1 notas por verificar» del Inicio pasa a singular («1 nota por verificar»).

Verificación: `verify:db` 141/141 (Rectoría envía; un docente no; no a quien no es docente; no a nombre de otro; la base
firma; cada docente ve los suyos; solo su docente lo marca como visto y una vez; nadie edita la tabla; sin sesión no se
lee), `verify:principal-data` 27/27 (envío con el texto y el aviso), `verify:teacher-data` 35/35 (aparece primero,
«Entendido» llama a `mark_reminder_seen` y desaparece).

### Paso 6b.4c · Perfil del estudiante con datos reales (2026-10-05)

Diego aprueba lo propuesto y «lo que sigue», y pide ir subiendo los commits a GitHub. Sin dirección nueva: el perfil
del sistema (Paso 5) en sus seis pestañas, ahora con la base en la app conectada; en demostración no cambia
(`verify:admin` 105/105, `verify:principal` 76/76 y `verify:teacher` 123/123 comparan el perfil con el sistema).

- **Resumen:** promedio del periodo abierto con la regla del Ranking (materias con notas verificadas), «Alto · 1 de 1
  materia aprobada», asistencia de la vista, paz y salvo, y evolución con los periodos del año que tienen notas
  (sin notas, el bloque lo dice).
- **Calificaciones:** las materias del curso en el periodo con su docente; sin notas, «—» y «Sin notas». La columna
  «Faltas» se quita: la asistencia se toma por curso, no por materia (misma decisión que el boletín). El docente ve
  solo las notas de sus materias (RLS) y la pantalla lo dice.
- **Asistencia:** el calendario del sistema recibe el mes real (el del último registro), con el día de la semana
  correcto. Con varias clases el mismo día manda la más grave; la excusa se pinta como asistencia (así cuenta en el
  porcentaje) con la etiqueta «Excusa»; día hábil sin registro: «Sin registro».
- **Observador:** las anotaciones del estudiante. **Boletines:** el del periodo abierto con las reglas de Secretaría
  (6b.3c); bloqueado si no está a paz y salvo; el docente no ve el boletín completo (tiene notas de todas las materias)
  y la pantalla se lo explica.
- **Información** (Secretaría y Rectoría): acudiente y salud reales (alergias, condiciones, notas y contacto de
  emergencia), marcados como sensibles; sin registro, «Sin registrar».
- **Estados:** carga, error con «Reintentar» y «No encontramos a este estudiante.» (no existe o el RLS no lo deja ver)
  con «Volver a Estudiantes».

**Hallazgo corregido (venía de pasos anteriores):** la tarjeta de contexto del menú mostraba en la app conectada los
textos fijos de demostración: Rectoría veía «Institución · Colegio Los Andes» sea cual fuera su colegio (y duplicado
con el escudo del colegio), Secretaría «2026 · Calendario A» y el docente «Matemáticas · 7A». Ahora: Rectoría sin esa
tarjeta (el colegio ya va con su escudo), Secretaría «Año lectivo · 2026 · Periodo 3» y el docente el periodo abierto
con sus materias y cursos («Periodo 3 · 2026 · Matemáticas · 7A, 7B»). En demostración, la del sistema.

Verificación: `verify:principal-data` 37/37 (resumen 4.5 y evolución P2 3.0 → P3 4.5; materias con «Sin notas»;
calendario de septiembre con inasistencia, tarde, excusa, sin clase y sin registro, un día de relleno; observador;
boletín «Periodo 3 de 4»; salud y acudiente; no encontrado; error con reintento; menú sin «Institución»),
`verify:teacher-data` 40/40 (sin pestaña Información, aviso de sus materias, boletín para Secretaría y Rectoría,
asistencia vacía, menú con sus cursos), `verify:admin-data` 39/39 (menú con el año y el periodo abierto).
Fallos propios en las pruebas: los datos simulados no imitaban la base (periodos sin `position`, asistencia sin
fecha, `profiles` devolviendo una fila donde la base devuelve una lista) y un selector confundía el escudo del colegio
con la tarjeta de contexto; capturas tomadas durante la entrada escalonada (se espera 1,2 s).

### Paso 6c · Reportes en PDF, Excel y CSV, y «Exportar informe» (2026-10-05)

Diego decide: los reportes salen **en PDF y en Excel** (el CSV del sistema se conserva), y autoriza que ejecute las
migraciones en Supabase. Sin dirección nueva: la pantalla Reportes del sistema (tres tipos, formato, curso y periodo,
recientes) con datos reales; en demostración no cambia (`verify:teacher` 123/123).

**Migraciones aplicadas en producción** el 2026-10-05 por mí, con autorización expresa de Diego (SQL Editor, cada una en
su transacción, cotejada por SHA-1 antes de ejecutar y comprobada después en el catálogo): `20261005090000_solicitudes`
(Supabase la marcó «destructiva» por reemplazar la política `requests_create` y rellenar `grade_id`; confirmado),
`20261005120000_rectoria_lectura`, `20261005150000_meta_institucional`, `20261005180000_recordatorios` y
`20261005210000_reportes` (`389d9c79…`).

- **Consolidado por curso:** estudiantes × materias del periodo (promedio ponderado de notas verificadas), promedio,
  desempeño, fila de promedios y ficha (estudiantes, materias, promedio del curso, cuántos con alguna materia bajo 3.0).
  El docente obtiene solo sus materias y el documento lo dice; Rectoría, todas.
- **Por estudiante:** materias × periodos del año con el acumulado ponderado por los pesos de Secretaría y el
  observador. Se elige el estudiante en un `Modal` del sistema con `Select`.
- **Por evaluación:** ficha (verificadas, promedio, mínima y máxima, confianza promedio de la IA, corregidas por el
  docente), distribución por desempeño y la tabla nota leída por la IA / confianza / nota final / estado.
- **Informe de Analítica** («Exportar informe» de Rectoría): indicadores, promedio por grado frente a la meta, evolución
  e inasistencia por grado; `Modal` con el formato.
- **PDF:** la hoja del boletín del sistema (`.ns-paper`, encabezado con el escudo, ficha, `.ns-paper-table`) impresa con
  el mismo mecanismo que los boletines; el encabezado del boletín acepta ahora el tipo de informe (sin cambiar el del
  boletín). **Excel:** `write-excel-file` (MIT, del mismo autor que `read-excel-file`): ficha, tablas con encabezado en
  negrita y notas como **números con un decimal** (se pueden ordenar y promediar). **CSV:** BOM y punto y coma.
- **Recientes:** tabla `generated_reports` (tipo, formato, título y parámetros; no el archivo). «Descargar» vuelve a
  generarlo con los datos del momento, para que un reporte nunca muestre notas que ya no son las vigentes. Cada persona
  ve los suyos.

Verificación: `verify:db` 144/144 (historial: guardan docente y Rectoría; nadie a nombre de otro; tipo válido; cada
quien ve los suyos; sin sesión no), `verify:teacher-data` 47/47 (Excel abierto con `read-excel-file`: «Consolidado 7A ·
Periodo 3.xlsx» con 4 como número y «Alto»; PDF impreso con colegio, estudiantes, autor y la nota de «solo sus
materias»; CSV de la evaluación con BOM y la lectura de la IA; Excel por estudiante; «Descargar» desde Recientes sin
duplicar el historial), `verify:principal-data` 41/41 (Excel de Analítica con indicadores y meta; consolidado de
Rectoría con todas las materias y notas «2.0»).
Fallos propios: si el colegio no había cargado, «Generar» no hacía nada y en silencio (ahora lo avisa); las notas
enteras salían «2» en vez de «2.0» (columnas de nota marcadas: un decimal en PDF, CSV y formato «0.0» en Excel); en las
pruebas, variable duplicada, lectura del .xlsx (la librería devuelve hojas) y caché del historial (se recarga la página).

Regresión completa en verde: auth 20/20, data 8/8, teacher-data 47/47, admin-data 39/39, principal-data 41/41,
platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62, components 121/121, teacher 123/123,
admin 105/105, principal 76/76, states 98/98, identity 25/25, platform 26/26, principal-viewports 18/18.

### Paso 6d · Subir fotografías con lectura por IA (2026-10-06)

Decisiones de Diego: servicio de visión **Claude Haiku 4.5** (el más barato de los comparados: ≈ $0,003 por foto, frente a
≈ $0,005 de GPT-4o y ≈ $0,006 de Claude Sonnet 5.5); la clave del proveedor va como **secreto de la función en Supabase**
y la pega él (nunca en la app); las fotos van al **bucket privado** y se **borran al cerrar el periodo** (declararlo en
la política de datos). Para identificar al estudiante: escribe en la hoja su **código estudiantil completo (8 dígitos)**
y su **nombre**; el código manda y el nombre se compara **siempre**.
GitHub Models (gratuito, usado por Diego en otro proyecto) **ya no existe**: GitHub lo retiró el 30 de julio de 2026
([docs](https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models)). Probar con Haiku cuesta
centavos (20 fotos ≈ $0,06).

Sin dirección nueva: el flujo «Calificar una evaluación» del sistema (pasos, evaluación, zona de carga, lista de
fotos, `ProcessingPanel`) con datos reales; en demostración no cambia (`verify:teacher` 123/123).

- **Función `read-exam`** (Edge Function, publicada desde el editor de Supabase con `index.ts` y `match.ts` cotejados
  por SHA-1: `ae5f03c2…` y `0275fdf9…`; sin sesión responde 401). Con la sesión del docente (RLS): comprueba que la
  evaluación es suya y no está cerrada, toma la lista del curso, descarga la foto de SU carpeta, la manda a
  `claude-haiku-4-5` con respuesta de forma fija (`output_config.format` con `json_schema`: código, nombre, nota y la
  claridad de cada uno; la respuesta se valida antes de usarla) y guarda la lectura en `grades` con los permisos del
  docente (detectada, confianza, estado, foto). Una nota ya verificada nunca se reemplaza. Sin clave: 503 explicado.
- **El modelo solo lee; quién es el estudiante lo decide `match.ts`** contra la lista del curso: código exacto; un dígito
  dudoso solo vale si el nombre respalda a un único candidato; sin código, el nombre si es único; si no, «sin
  estudiante» (no se adivina). El nombre se compara siempre: un código claro pero de otro estudiante queda «Revisar»
  con el motivo. Confianza: 96 % nota clara, 72 % dudosa, máximo 60–65 % si el código o el nombre no cuadran; «por
  verificar» solo con código exacto, nombre que no contradice y nota clara. Escala: «45» se entiende 4.5; fuera de
  1.0–5.0 no se toma.
- **En la app:** cada foto se reduce en el equipo (JPEG, lado mayor 1568 px: más píxeles no leen mejor y cuestan más),
  se sube a `exam-photos/<docente>/<evaluación>/` y se lee de a una; cada fila dice el resultado (Listo · Revisar con
  el motivo · Sin estudiante: «anótala a mano en la planilla» · No se leyó con el porqué). Sin clave configurada, avisa
  una vez y no sigue gastando. «Ir a revisión» abre la revisión de esa evaluación.
- **`ProcessingPanel`**: dos opciones nuevas para no mostrar datos falsos —título al terminar («Sin estudiante
  identificado») y confianza vacía («—»)—; sin ellas, el del sistema (antes ponía 98 % cuando no había confianza).

Verificación: `verify:read-exam` 11/11 (lógica de identificación: exacto, nombre que no coincide, dígito dudoso con y
sin respaldo, solo nombre, dos «María», código de otro curso, nota ilegible y dudosa, escala, tildes), función
compilada contra `@anthropic-ai/sdk` 0.131.0 sin errores de tipos, `verify:teacher-data` 53/53 (subida a la carpeta del
docente y de la evaluación como JPEG, lectura en orden, resultado por foto, panel con datos reales, sin clave avisa y
no sigue).
Fallos propios: el panel decía «Estudiante identificado» y 96 % con la última foto sin estudiante (corregido); en las
pruebas, ruta equivocada (`grade` en vez de `grades`), selector ambiguo y un PNG mal formado.

**Pendiente:** (1) Diego crea la clave en console.anthropic.com y la pega en Supabase → Edge Functions → Secrets como
`ANTHROPIC_API_KEY`; después, prueba con ~20 fotos reales. (2) Borrado de fotos al cerrar el periodo (siguiente paso).
(3) Política de datos: transferencia de las fotos a Anthropic solo para leer la nota.

Regresión completa en verde: read-exam 11/11, auth 20/20, data 8/8, teacher-data 53/53, admin-data 39/39,
principal-data 41/41, platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62, components 121/121,
teacher 123/123, admin 105/105, principal 76/76, states 98/98, identity 25/25, platform 26/26, principal-viewports 18/18.

### Paso 6e · Borrar las fotos al cerrar el periodo (2026-10-06)

Diego aprueba 6d y autoriza ejecutar en Supabase. Pide además que cree la clave de Anthropic: **no lo hago** —crear
cuentas, cargar saldo con un medio de pago y copiar o pegar claves de API son acciones que me corresponde no hacer
aunque haya autorización; la clave da acceso a su dinero—; queda como pendiente suyo (tres pasos, ~5 min).

- **Función `purge-exam-photos`** (publicada desde el editor, cotejada `58359567…`; sin sesión, 401): solo Secretaría,
  solo un periodo de su colegio que ya esté **cerrado** (comprobado con su sesión). Con la clave de servicio (dentro de
  la función) borra la carpeta completa `<docente>/<evaluación>/` de cada evaluación del periodo —también las fotos que
  no se pudieron asignar— y quita `photo_path` de las notas. **Las notas se conservan.**
- **Migración `20261006090000_borrado_fotos.sql`** (aplicada, cotejada `c6cbb95b…`, comprobada en el catálogo): la
  evaluación cerrada protege la **nota** (valor, lectura, estado, estudiante) y no la referencia a la foto; antes el
  disparador bloqueaba cualquier cambio y el borrado habría fallado justo al cerrar el periodo. Poner otra foto en una
  evaluación cerrada sigue bloqueado.
- **En Secretaría → Periodos:** guardar un periodo como «Cerrado» borra sus fotos y lo dice («Se borraron 7 fotos de
  exámenes. Las notas se conservan.»). Si el borrado falla, el periodo cerrado ofrece «Borrar fotos de exámenes del
  periodo» para reintentar (botón secundario del sistema, solo en la app conectada; antes el aviso pedía «volver a
  guardar», imposible con el periodo bloqueado — corregido antes de entregar).

Verificación: `verify:db` 146/146 (quitar la foto de una nota cerrada sí; cambiar la nota o poner otra foto, no),
`verify:admin-data` 41/41 (cerrar llama a `purge-exam-photos` con el periodo y avisa cuántas; el reintento informa el
error), la función compila sin errores de tipos.
Fallo propio en Supabase: un intento de abrir el editor de funciones quedó bloqueado por cambios sin guardar en el SQL
Editor y el código de la función se cargó **en el editor SQL, sin ejecutarse**; se vació y se publicó desde una pestaña
nueva. La lista final tiene exactamente tres funciones.

Regresión completa en verde: read-exam 11/11, auth 20/20, data 8/8, teacher-data 53/53, admin-data 41/41,
principal-data 41/41, platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62, components 121/121,
teacher 123/123, admin 105/105, principal 76/76, states 98/98, identity 25/25, platform 26/26, principal-viewports 18/18.

### Paso 6f · Planilla sin conexión de verdad (2026-10-06)

Diego aprueba 6e. Hasta aquí la «cola sin conexión» era la simulación del sistema: un interruptor de demostración,
los pendientes en memoria (se perdían al recargar) y «Sincronizar» que esperaba un segundo sin enviar nada.
Sin dirección nueva: la píldora de conexión y la planilla del sistema; en demostración no cambia (`verify:teacher`
123/123, `verify:components` 121/121, `verify:shell` 62/62).

- **Cola en el equipo** (`services/offlineQueue.ts`): `localStorage` por docente, sobrevive a recargar y a cerrar la
  app; de cada celda se guarda la última nota escrita.
- **Conexión real:** la píldora sigue los eventos `online`/`offline` del equipo (sin el interruptor de demostración
  en la app conectada). Si un guardado falla por red estando «conectado», la nota pasa a la cola en vez de perderse
  o revertirse.
- **Sincronizar:** al volver la conexión, al abrir la app con pendientes o con «Sincronizar ahora», se envía cada nota
  con la misma escritura de la planilla (la firma de «verificada» la pone la base). Red caída → «Error de
  sincronización» y la cola se conserva. Regla de la base (evaluación cerrada, sin permiso) → se quita de la cola y
  se dice cuál, en la píldora y en la barra de la planilla. Al terminar se recargan la planilla y la revisión, y la
  «Última sincronización» es la hora real (antes, «08:42» fijo).
- **Planilla:** muestra las notas de la cola sobre lo que trae la base, con su marca de pendiente; la barra no se queda
  diciendo «se sincronizará» cuando ya se envió. De paso, «1 cambios pendientes» → «1 cambio pendiente».

Verificación: `verify:teacher-data` 61/61 con la red del navegador cortada de verdad (`context.setOffline`): la nota
queda en la cola sin enviarse y marcada; al reconectar con la red fallando, error y la cola intacta; tras recargar la
app la nota sigue pendiente en su celda; «Sincronizar ahora» la envía verificada y vacía la cola; un cambio que la base
rechaza se quita y se dice cuál.
Fallos propios: la barra de la planilla seguía diciendo «Se sincronizará al reconectar» después de un rechazo
(corregido); en la prueba, un clic que cerraba la ventana de la píldora y los errores de red del corte simulado que se
contaban como errores de la app.

Regresión completa en verde: read-exam 11/11, auth 20/20, data 8/8, teacher-data 61/61, admin-data 41/41,
principal-data 41/41, platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62, components 121/121,
teacher 123/123, admin 105/105, principal 76/76, states 98/98, identity 25/25, platform 26/26, principal-viewports 18/18.

### Paso 6g · Legal: política, autorización del acudiente y derechos del titular (2026-10-06)

Diego aprueba 6f y pide seguir con lo legal mientras configura el SMTP. **Todos los textos son borradores técnicos** y
los revisa un abogado antes de usarse con datos reales (`docs/legal/README.md` lista lo que debe confirmar: roles
responsable/encargado, transmisión a Brasil y EE. UU., qué hace Anthropic con las imágenes, retención del registro
académico, RNBD y cómo documentar que se escuchó al menor).

- **Documentos** (`docs/legal/`): política de tratamiento de datos 2026.1 (colegio = responsable, NotaScan =
  encargado, Supabase / Anthropic / proveedor de correo = subencargados; inventario real de datos, finalidades,
  autorización de menores y de datos sensibles, dónde y cuánto tiempo, seguridad, derechos con los plazos de la Ley
  1581 —consultas 10 días hábiles, reclamos 15—), formato de autorización del acudiente (con la opción facultativa
  para salud y el aviso de las fotos) y términos de uso para el personal.
- **Migración `20261006120000_autorizaciones.sql`** (aplicada, cotejada `a9a5aad0…`, comprobada en el catálogo):
  `guardian_authorizations` (quién firma, parentesco, salud sí/no, forma, fecha, versión, quién la registró —lo pone la
  base—, revocatoria con motivo); **reglas en la base que se comprueban al confirmar**: no se matricula sin autorización
  registrada y no se guardan datos de salud sin autorización expresa para ellos (también si alguien llama a la base por
  fuera de la app); `register_enrollment(s)` matricula y registra la autorización en un solo paso; en lote nunca entran
  datos de salud; `revoke_guardian_authorization` exige motivo y, si ya no hay autorización de salud, borra esos datos;
  `current_policy_version()`.
- **En la app (solo la conectada; demostración igual):**
  - Matrícula: «Recibí la autorización firmada del acudiente» es obligatoria para guardar; en «Información médica», la
    autorización de salud es una casilla aparte y sin ella esos datos no se envían. Importación: la confirmación exige
    marcar que se tienen las autorizaciones firmadas.
  - Perfil → Información (Secretaría y Rectoría): estado de la autorización (quién firmó, fecha, versión, salud) y su
    historial; Secretaría la **registra** (estudiantes matriculados antes) o la **revoca** con motivo. **Exportar datos
    del estudiante** (JSON con todo lo que conserva el colegio: derecho de acceso).
  - El personal **acepta la política y los términos** al entrar si no aceptó la versión vigente (ventana que no se cierra
    sin aceptar o salir; resumen, política completa y términos leídos del repositorio); queda en `consents`.
  - Inicio de sesión: enlace «Política de tratamiento de datos».
  - Piezas del sistema: `Modal` (tamaño documento), `SegmentedTabs`, `Checkbox`, `ns-sensitive`, `ns-paper-table`,
    títulos de bloque. El texto legal se muestra desde `docs/legal/` (nunca se desincroniza).

Verificación: `verify:db` 155/155 (sin autorización no se matricula; la función vieja tampoco; salud sin autorización
no; quedó la versión, quién firma y quién registró; lote sin salud; Rectoría consulta y el docente no; revocar solo
Secretaría, con motivo, y borra la salud), `verify:admin-data` 51/51 (matrícula e importación exigen la autorización y
la envían en la misma llamada; las alergias sin autorización no salen; registrar y revocar en el perfil),
`verify:principal-data` 46/46 (la ventana de la política aparece, se lee completa, no deja seguir sin marcar y guarda la
versión; el perfil muestra la autorización sin dejar editar a Rectoría; exportar descarga el JSON completo).
Fallos propios: la ventana de aceptación aparecía cuando la base no devolvía una versión (tomaba cualquier respuesta como
versión; ahora solo un texto); la semilla duplicaba la versión de la política en una instalación desde cero; en las
pruebas, simuladores de `profiles` que devolvían una fila donde la base devuelve una lista.

**Pendiente (no se hace sin abogado):** supresión de los datos de un estudiante a pedido del acudiente (qué se borra y
qué se conserva por el deber legal del registro académico).

Regresión completa en verde: read-exam 11/11, auth 20/20, data 8/8, teacher-data 61/61, admin-data 51/51,
principal-data 46/46, platform-auth 9/9, invite 14/14, tokens 26/26, card 51/51, shell 62/62, components 121/121,
teacher 123/123, admin 105/105, principal 76/76, states 98/98, identity 25/25, platform 26/26, principal-viewports 18/18.

### Paso 6h · App de escritorio compilada con Tauri (2026-10-06)

Diego aprueba 6g y autoriza instalar las herramientas. **Rust 1.99** (rustup 1.29.1, `winget install Rustlang.Rustup`,
hash verificado por winget, desde static.rust-lang.org); las **Build Tools de C++ ya estaban** (Visual Studio Build
Tools 2026) y WebView2 viene con Windows 11 — no hubo que descargar los ~5 GB.

- **Ícono:** la marca «N» del sistema (`.ns-logo-mark`: dorado, borde navy, Fraunces) dibujada a 1024 px con los
  estilos de la app (`scripts/make-icon.mjs`), con el borde y la esquina engrosados y peso 800 para que se lea pequeña;
  `tauri icon` genera los tamaños (se quitaron los de Android e iOS). A 16 px el trazo fino de la «N» se pierde, pero
  el cuadro dorado con borde navy sigue siendo reconocible.
- **Ventana:** abre **maximizada** (en 1536×816 útiles —pantalla 1920×1080 al 125 %— una ventana de 900 px de alto no
  cabía); restaurada queda en 1280×760 (cabe en 1366×768); mínimo 1024×700 como antes.
- **Compilación:** `npm run tauri build` compila la app conectada a Supabase (`npm run build`) y produce
  `NotaScan_0.1.0_x64-setup.exe` (NSIS, 2,04 MB) y `NotaScan_0.1.0_x64_en-US.msi` (2,96 MB) en
  `src-tauri/target/release/bundle/` (no se suben al repositorio). Sin errores; solo el aviso de Vite por el tamaño del
  paquete JavaScript.

Verificación: el ejecutable abre la ventana «NotaScan.» con su ícono, se mantiene en ejecución (26 MB de memoria) y
muestra el inicio de sesión completo maximizado (captura a resolución física `verify-out/paso6h-tauri-maximizada.png`).
Fallo propio en la verificación: la primera captura salía cortada porque el script no tenía en cuenta la escala de
pantalla (125 %); con `SetProcessDPIAware` se ve completa. **Pendiente:** probar dentro de la app de escritorio el
inicio de sesión real, la impresión a PDF y las descargas (Excel, CSV, JSON) — requiere una cuenta de prueba.

#### Enmienda 6 (2026-10-06, pedida por Diego): ventana sin bordes de Windows

Diego aprueba 6h y pide la ventana sin la barra de Windows («se nota más elegante») con los botones propios.
- `decorations: false` (conserva la sombra y el redimensionado por los bordes que da Windows); permisos explícitos en
  `src-tauri/capabilities/default.json` (mover, minimizar, maximizar/restaurar, cerrar).
- **`TitleBar`** (solo dentro de Tauri; en el navegador y en las pruebas no existe): 32 px, `--paper` con filete
  `--ivory-deep`, marca «N» + «NotaScan» en `--muted`; botones de 46 px (ancho de Windows) con iconos de la familia —se
  añadieron `maximize` y `restore` con el mismo trazo—; hover `--ivory-deep`, y **cerrar en `--burgundy`** (el rojo del
  sistema, no el de Windows). Arrastrar mueve, doble clic maximiza; Windows 11 muestra su menú de acomodar ventanas al
  pasar por maximizar. Foco visible; no se imprime. El contenido baja 32 px (`desktop.css`, solo `.ns-in-desktop`).

Verificación medida con clics reales sobre la app compilada: abre maximizada → Restaurar (no maximizada) → Maximizar
(maximizada) → Minimizar (minimizada) → doble clic en la barra (restaura) → Cerrar (el proceso termina). Capturas
`verify-out/paso6h-sin-bordes-*.png`. Regresión web y demostración igual (auth 20, docente 61/123, Secretaría 51/105,
Rectoría 46/76, shell 62, componentes 121, estados 98). Fallo propio: el primer guion de clics no contaba el borde
invisible de redimensionado ni el menú de acomodar de Windows 11 y daba falsos negativos; corregido.

#### Enmienda 7 (2026-10-06, pedida por Diego): campos sin recuadro interior y sin el ojo de Edge

En la app de escritorio (WebView2 = motor de Edge) Diego vio dos defectos al escribir: un recuadro alrededor del campo
dentro de la cápsula, y en la contraseña un botón «mostrar» propio de Edge además del ojo del sistema.
- Causa del recuadro: la regla general `.ns input:focus-visible` (contorno navy) gana sobre el `outline: none` de los
  campos con envoltorio. La referencia del sistema (`notascan-ui`) tiene el mismo defecto. Ahora, como ya hacía
  `.ns-grade-input`, el campo interior no dibuja contorno y el foco lo marca el envoltorio: cápsula del login (borde
  dorado + halo, ya existente), porcentaje de evaluación (contorno de foco del sistema en el envoltorio) y búsqueda
  Ctrl+K (el panel abierto ya es el foco). Un borde dorado que probé en la búsqueda se quitó: no estaba en el contrato y
  la comparación con el sistema lo detectó.
- `input::-ms-reveal, input::-ms-clear { display: none }`: queda un solo control para mostrar la contraseña.

Verificación en Microsoft Edge (`verify:fields-edge`, 7/7): sin recuadro en correo y contraseña al escribir, la cápsula
marca el foco, el ojo de Edge se quita (la imagen del campo cambia al forzarlo), un solo botón de mostrar, y con
el teclado el foco sigue visible. `verify:shell` 62/62 (la referencia recibe la misma regla para la búsqueda; el resto
sigue comparado píxel a píxel); regresión completa en verde. Instaladores reemplazados en la Release v0.1.0.

#### Enmienda 8 (2026-10-06, pedida por Diego): barras de desplazamiento del sistema

Diego: la barra de Windows (gris, con flechas) «se ve horrible, no cuadra con el diseño», y la de la derecha «se sale
de la ventana». Medido: la ventana maximizada sí cabe (cliente 1920×1020 = área útil); lo que pasaba es que se
desplazaba la página entera y su barra corría por detrás de la barra de título propia. Además, con la barra vertical
el menú lateral quedaba en 248 px para un contenido de 250 y aparecía una barra horizontal.
- **Barra del sistema** (`notascan.css`): cápsula navy al 30 % sobre fondo transparente, sin flechas; navy-soft al pasar
  y navy al arrastrar; 12 px para agarrarla (6 px a la vista). En el menú lateral 8 px (4 a la vista) y sin
  desplazamiento horizontal. Firefox: `scrollbar-width: thin` con el mismo color.
- **Escritorio** (`desktop.css`): el contenido se desplaza dentro de `#root`, que empieza bajo la barra de título; la
  ventana no se desplaza. `scrollToTop()` (`src/lib/scroll.ts`) sube el contenedor correcto al cambiar de pantalla.
  Al imprimir se libera el contenedor.

Verificación en Microsoft Edge (`verify:desktop-scroll`, 8/8, con las barras visibles —Playwright las oculta por
defecto—): la ventana no se desplaza, la barra va de 32 px al borde inferior, mide 12 px, el menú usa 8 px y no tiene
barra horizontal, el menú queda fijo al desplazar, al cambiar de pantalla vuelve arriba, la barra no es la de Windows
y al imprimir no se recorta. Regresión de la demostración en verde (shell 62, componentes 121, Secretaría 105, docente
123, Rectoría 76, estados 98, plataforma 30). Fallos propios: la primera prueba ponía la clase antes de existir el
documento y medía con las barras ocultas; una regresión corrió mientras la compilación reemplazaba `dist` y se repitió.
