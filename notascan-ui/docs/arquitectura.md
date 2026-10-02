# Arquitectura de información

## Navegación global — `Sidebar`

Seis destinos, en este orden y sin agregar módulos:

| Nº | Sección | Pregunta que responde | Contenido principal |
|---|---|---|---|
| 01 | Dashboard | ¿Qué tengo pendiente hoy? | Evaluaciones en revisión, `ReviewSummary` por curso, acceso a "Calificar" |
| 02 | Calificar | ¿Qué detectó la IA y es correcto? | `ReviewStepper`, `UploadZone` → `ProcessingPanel` → `GradeReviewDashboard` |
| 03 | Estudiantes | ¿Cómo va cada estudiante? | `DataTable`: nombre, ID, curso, desempeño/estado, última evaluación |
| 04 | Evaluaciones | ¿Qué exámenes, talleres y actividades existen? | `DataTable`: tipo, asignatura, porcentaje, estado |
| 05 | Reportes | ¿Qué puedo consultar o exportar? | Filtros por asignatura/curso/periodo + exportar |
| 06 | Design System | ¿Con qué está construido NotaScan? | Foundations → Átomos → Moléculas → Organismos → Plantillas |

El sidebar solo navega. No lleva filtros, títulos ni acciones de página.

## Navegación por rol (`RoleShell` / `MobileShell`)

| Rol | Navegación |
|---|---|
| Administración | Dashboard · Estudiantes · Matrículas · Usuarios · Estructura académica · Mallas curriculares · Periodos · Boletines · Paz y Salvos · Ranking académico |
| Rectoría | Dashboard · Analítica · Seguimiento docente · Solicitudes · Estudiantes · Observador · Reportes |
| Docente | Dashboard · Calificaciones · Planilla · Conceptos · Recuperaciones · Asistencia · Comportamiento · Estudiantes · Reportes |
| Estudiante (móvil) | Acceso: `MobileLoginPage` (`#/movil`) · Inicio (con `WidgetBoard` personalizable) · Notas · Rendimiento · Logros · Simulador (+ Notificaciones y Observador en la cabecera) |
| Acudiente (móvil) | Inicio (resumen en widgets) · Calificaciones · Asistencia · Observador · Boletines (+ Notificaciones) |

Rutas: `#/<rol>/<página>[/<id>][?tab=]`, por ejemplo `#/admin/enrollment`, `#/principal/profile/20261168?tab=observer`, `#/student/achievements`.

Herramientas globales del shell: **búsqueda de estudiantes** (Ctrl + K) para Secretaría, Rectoría y Docente, que lleva al perfil y sus pestañas; **estado de conexión** para el Docente.

## Navegación local — `Header` + `FiltersBar`

Cada página gestiona su propio contexto: eyebrow (evaluación · asignatura · curso), título, descripción, tabs, búsqueda, filtros y acción primaria. Una sola acción primaria por vista.

## Jerarquía en la revisión

1. Calificación → 2. Estudiante → 3. Confianza de IA → 4. Estado → 5. Acciones → 6. Metadata.

## Flujo principal del docente

Dashboard → Seleccionar evaluación → Cargar fotografías → Procesamiento → Notas detectadas → Revisión → Corrección manual si es necesaria → Confirmación → Guardado.

`ReviewStepper` materializa los siete pasos técnicos: Cargar fotografía · Detectar estudiante · Detectar calificación · Calcular confianza · **Revisar** · Confirmar · Guardar. La IA opera en los pasos 2–4; los pasos 5–7 son siempre del docente.

## Atomic Design

| Nivel | Componentes |
|---|---|
| Átomos | Logo, Sticker, Icon, Button, Input, GradeInput, Badge, Avatar, Divider, StatusDot, ConfidenceIndicator, **Switch, Checkbox, Select, Textarea, ProgressBar, IconAction, SegmentedTabs** |
| Moléculas | NavigationItem, GradeInputGroup, ConfidenceBadge, UserProfile, SearchField, FilterGroup, ReviewStatus, UploadZone, **ImportFileZone, PasswordResetDialog, AcademicAssignmentSelector, PeriodWeightEditor, NotificationItem, AttendanceRow, AchievementCard, ConnectivityStatus, GlobalSearch** |
| Organismos | Sidebar, Header, ReviewSummary, FiltersBar, StudentGradeCard, ReviewStepper, Marquee, ProcessingPanel, ConfirmDialog, Toast, EmptyState, DataTable, **DataGrid, Modal, Drawer, BottomSheet, BarChart, LineChart, DonutChart, StudentTable, StudentRegistrationForm, BulkImportPanel, UserDirectory, AcademicStructureManager, CurriculumManager, PeriodConfigurator, ReportCardDocument, ReportCardManager, PazYSalvosTable, RankingTable, InstitutionalAnalytics, TeacherMonitoringPanel, AuthorizationInbox, ObserverTimeline, Gradebook, RecoveryTable, AttendancePanel, GamifiedHome, AchievementGallery, PerformanceChart, GradeSimulator, NotificationFeed, ConceptEditor** |
| Widgets móviles | MobileWidget (molécula), WidgetBoard (organismo), HomeScreenWidgets (widgets del sistema operativo) |
| Plantillas | AppShell, **RoleShell, MobileShell**, GradeReviewDashboard |
| Páginas | Login · Docente (Dashboard, Calificar, Revisión, Planilla, Recuperaciones, Asistencia, Comportamiento, Estudiantes, Evaluaciones, Reportes) · Administración (10) · Rectoría (7 + Perfil del estudiante) · StudentApp · ParentApp · todo unido en NotaScanApp |

Los átomos no dependen de moléculas ni organismos. `StudentGradeCard` se compone de Avatar + ConfidenceBadge + ConfidenceIndicator + GradeInputGroup + ReviewStatus + Button; `Sidebar` de Logo + NavigationItem + UserProfile.

Adiciones justificadas respecto al brief: `Logo` (el logotipo es un componente, no una imagen), `UploadZone` (paso 1 del flujo), `ReviewStepper` y `ProcessingPanel` (secciones 23–24), `ConfirmDialog` y `Toast` (feedback, 46–47), `EmptyState` (43–44) y `DataTable` (tablas densas, 42).
