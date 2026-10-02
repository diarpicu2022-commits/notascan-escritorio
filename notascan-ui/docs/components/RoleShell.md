# RoleShell

`AppShell` configurado por rol: navegación propia, usuario, contexto del pie (año lectivo, institución o periodo), densidad y herramientas superiores (chip del rol, búsqueda global para Secretaría/Rectoría/Docente y conectividad para Docente).

## Navegación por rol
- **Administración:** Dashboard · Estudiantes · Matrículas · Usuarios · Estructura académica · Mallas curriculares · Periodos · Boletines · Paz y Salvos · Ranking académico
- **Rectoría:** Dashboard · Analítica · Seguimiento docente · Solicitudes · Estudiantes · Observador · Reportes
- **Docente:** Dashboard · Calificaciones · Planilla · Conceptos · Recuperaciones · Asistencia · Comportamiento · Estudiantes · Reportes

Props: `role` (`admin` · `principal` · `teacher`) · `active` · `onNavigate(página, params)` · `onLogout` · `counts` · `overlay`.
