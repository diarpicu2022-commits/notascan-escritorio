# Explicación del proyecto

Documento de sustentación para **Diseño de Interfaces de Software** (5.º semestre). Explica qué se diseñó, por qué y dónde verlo en el repositorio.

## 1. El producto

**NotaScan** gestiona calificaciones a partir de fotografías de exámenes y talleres. El flujo completo es:

1. El docente sube la fotografía.
2. El sistema identifica al estudiante por su código QR o de barras.
3. La IA detecta la nota manuscrita y calcula su nivel de confianza.
4. El docente revisa, corrige si hace falta y confirma.
5. El sistema guarda solo lo que el docente confirmó.

El principio que guía toda la interfaz es **"La IA detecta. El docente verifica. El sistema guarda."** Por eso ninguna pantalla dice que la IA "calificó". Dice "Calificación detectada: 4.5", y la confirmación siempre es una acción explícita del docente: un botón y un sello de "Verificada".

## 2. Arquitectura de información

- **Navegación global:** el `Sidebar` tiene seis destinos fijos (Dashboard, Calificar, Estudiantes, Evaluaciones, Reportes y Design System), numerados del 01 al 06.
- **Navegación local:** cada página tiene su `Header` (contexto, título, descripción y una sola acción primaria), sus pestañas y su `FiltersBar`. El sidebar no contiene nada propio de una página.
- **Jerarquía en la revisión:** calificación → estudiante → confianza de la IA → estado → acciones → metadata. Por eso en `StudentGradeCard` la nota va en una baldosa grande en Fraunces y todo lo demás se ordena alrededor.
- **Rutas:** `#/login`, `#/dashboard`, `#/grade`, `#/review`, `#/students`, `#/evaluations`, `#/reports` y `#/system`.

Detalle completo en la sección Arquitectura de información.

## 3. Atomic Design

| Nivel | Cantidad | Ejemplos |
|---|---|---|
| Átomos | 18 | Button, GradeInput, Badge, Sticker, Switch, Checkbox, Select, ProgressBar, IconAction |
| Moléculas | 17 | GradeInputGroup, FilterGroup, ImportFileZone, PeriodWeightEditor, AttendanceRow, AchievementCard, ConnectivityStatus, GlobalSearch |
| Organismos | 42 | Sidebar, StudentGradeCard, DataGrid, Modal, Drawer, gráficos, Gradebook, BulkImportPanel, CurriculumManager, AuthorizationInbox, GradeSimulator |
| Plantillas | 4 | AppShell, RoleShell, MobileShell, GradeReviewDashboard |
| Páginas | 42 vistas | Login · 10 de Secretaría · 7 de Rectoría + Perfil del estudiante · 10 del Docente · app del Estudiante (7 vistas) · app del Acudiente (6 vistas) |

Los átomos no dependen de niveles superiores. Las páginas solo componen organismos dentro de `AppShell`. Todo se puede ver funcionando en este Design System y en `design-system/index.html` del repositorio.

## 4. Design Tokens

`tokens/tokens.json` es la **fuente única** de la identidad: color, tipografía, espacio, radios, bordes, sombras, tamaños, duraciones, curvas de animación y z-index. De ahí se genera `css/tokens.css`, y `css/notascan.css` solo usa esas variables. Para cambiar la identidad basta con cambiar el JSON.

**Paleta obligatoria:** navy `#1B2A4A`, aged gold `#B8924B`, warm ivory `#F7F3EC`, charcoal `#2B2B2B`, sage `#6B8F71` y burgundy `#7A2E2E`.

Además hay variantes derivadas, como `gold-ink` y `sage-ink`. Existen porque el dorado y el salvia oficiales no alcanzan el contraste mínimo como texto sobre marfil.

## 5. Dirección visual y su evolución

1. **v1 · Glass + brutalismo + editorial.** Funcionaba, pero se veía genérico.
2. **v2 · Neobrutal vivo.** Bloques de color con significado (dorado claro = pendiente, salvia = verificado, burdeos claro = revisión, navy = dato principal), stickers rotados, bento de resumen y sombras sólidas. El vidrio quedó solo para lo que flota (modales y el panel de procesamiento).
3. **v3 · Firma de marca en el sidebar.** La portada del sistema en miniatura, sin recuadro propio.
4. **v4 · Pantallas completas y ajustes.** Ítem activo del menú en bloque navy con texto marfil para que no se pierda sobre el dorado, sombra del menú más discreta y cifras del Inicio en filas compactas.
5. **v5 · Login orgánico.** A partir de las referencias del docente: pantalla dividida con borde ondulado, manchas en capas con burbujas, ilustración propia del flujo (hoja + teléfono escaneando), saludo "¡Hola!" grande, campos en píldora con icono, y en móvil una hoja marfil que sube sobre una cabecera navy.
6. **v6 · Ecosistema académico.** Seis roles con navegación, densidad y personalidad propias sobre el mismo sistema (ver sección siguiente).

7. **v7 · Boletín completo, conceptos con IA y acceso móvil.** Cada periodo tiene su propio boletín: todas las materias con las notas de los periodos ya cursados, la nota del periodo y el acumulado ponderado (los pesos de cada periodo los configura Secretaría), el concepto de cada docente, el mensaje del director de grupo y las firmas de dirección de grupo y rectoría. La IA ayuda al docente a redactar conceptos y observaciones (siempre revisados por él). Login propio para la app móvil y el grado visible en ella.

8. **v8 · Movimiento.** El sistema dejó de ser estático: entradas escalonadas en cada vista, cifras que cuentan, gráficos que crecen y se dibujan, un login con ambiente permanente (manchas que respiran, escaneo, hoja y teléfono flotando), brillo periódico en la acción principal y acentos que se mueven de vez en cuando (stickers, campana, revisión pendiente, medallas). Tres ritmos —entrada, respuesta y ambiente— y siempre respetando `prefers-reduced-motion`.

9. **v9 · Widgets móviles.** El Inicio del estudiante y del acudiente se arma con widgets: clase de hoy en vivo con cuenta regresiva, promedio en anillo con tendencia, racha, asistencia de la semana, próxima entrega y eventos del colegio. Se personalizan con "Editar" o manteniendo presionado (se mecen, se quitan y se añaden). También hay widgets para la pantalla de inicio del teléfono (pequeño, mediano y grande) que se implementan en Flutter con `home_widget`.

## 6. Ecosistema por roles (v6)

NotaScan pasó de una herramienta docente a un ecosistema académico completo, **sin crear un segundo lenguaje visual**: los módulos nuevos se construyeron sobre los mismos tokens y componentes.

- **Secretaría:** Estudiantes y Matrículas (tabla avanzada, acciones en lote, drawer), matrícula por secciones, importación Excel/CSV con validación por fila, Usuarios con restablecimiento de contraseña, Estructura Académica, Malla Curricular (matriz curso × materia), Periodos con validación del 100%, Boletines como documento académico real, Paz y Salvos y Ranking exportable.
- **Rectoría:** Panorama Institucional con gráficos que responden preguntas, Seguimiento Docente (verde/amarillo/rojo con forma y palabra), bandeja de Solicitudes con confirmación e historial, búsqueda global y perfil del estudiante según permisos.
- **Docente:** Conceptos del periodo con borradores de IA que el docente aprueba o edita, Planilla tipo hoja de cálculo manejada con el teclado, trabajo sin conexión con cambios pendientes, Recuperaciones que conservan la nota original, Asistencia rápida con atajos y Comportamiento.
- **Estudiante (móvil):** acceso propio (también para acudientes), Inicio con widgets personalizables, grado visible, nivel y XP animados, logros con hoja inferior y celebración breve, rendimiento, simulador etiquetado como *Proyección*, notificaciones y observador.
- **Acudiente (móvil):** experiencia separada y tranquila: avisos importantes, resumen, asistencia, observador, boletines y notificaciones.

La infraestructura se reutiliza: una sola `DataGrid` para todas las tablas, un `Modal` y un `Drawer` con reglas claras de uso, un sistema de formularios (label, ayuda, error, éxito, obligatorio, deshabilitado, solo lectura) y un único set de iconos.

## 7. Accesibilidad

- Contraste AA verificado para cada par de texto y fondo (ver el brand book).
- El color nunca va solo: cada estado lleva además icono, palabra y una forma distinta en `StatusDot`.
- Labels reales, foco visible, navegación completa con teclado (Enter confirma una nota y Escape cancela), `aria-current` en el menú, `role="meter"` en la confianza y un modal con el foco atrapado.
- Validación de notas entre 1.0 y 5.0: si la nota está fuera del rango, no se puede confirmar.
- `prefers-reduced-motion`: se detienen la cinta, el escaneo, el ambiente del login, el brillo de los botones y los desplazamientos; las cifras aparecen sin contar y el feedback se mantiene.

## 8. Qué falta para producción

- El backend (Spring Boot + PostgreSQL) y el reconocimiento real (OpenCV + CNN o una API de visión). Hoy los datos son simulados.
- Implementar las apps móviles en Flutter a partir de este diseño y del tema `flutter/notascan_theme.dart` del repositorio.
- Migrar los componentes a la app de escritorio (Tauri + React + TypeScript + Tailwind + Framer Motion) conservando los tokens. La guía está en la sección Implementación.
