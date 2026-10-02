# GradeReviewDashboard

Plantilla completa de la pantalla **Revisión de calificaciones**: compone Sidebar (navegación global) + Header, ReviewStepper, ReviewSummary, FiltersBar (navegación local) + grid de StudentGradeCard + ConfirmDialog + Toast, con datos simulados y estado real.

## Layout
- Lienzo `ivory` con retícula de puntos; cinta `Marquee` a sangre bajo el Header; resumen en bento; filtros en un bloque propio.
- Grid CSS: 3 columnas en escritorio, 2 bajo 1180px, 1 bajo 680px. Gap vertical `space-6` para que las etiquetas "Nº" respiren.
- Sidebar completo → rail → drawer, según el ancho.

## Flujo que demuestra
Filtrar "Requiere revisión" → Editar una nota (validación 1.0–5.0) → Confirmar (sello) → "Confirmar y guardar" → modal "¿Confirmar N calificaciones?" → toast de éxito.

## Props
`rows` (sustituye `NotaScan.MOCK_ROWS`) · `loading` (muestra skeletons) · `inlineDialog` (modal dentro del contenedor, para documentación) · `style`.

Las demás páginas (Dashboard, Estudiantes, Evaluaciones, Reportes, Design System) reutilizan el mismo shell `.ns-app` con Sidebar + Header y cambian solo el contenido.
