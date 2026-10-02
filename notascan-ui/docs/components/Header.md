# Header

Encabezado de página y punto de partida de la **navegación local**: eyebrow editorial (contexto: evaluación · asignatura · curso, con una regla `gold`), título en `display`, descripción en `subtitle` y la acción primaria alineada a la derecha. Opcionalmente, tabs locales.

Admite `highlight`: una palabra del título subrayada con un trazo `gold` de marcador ("Revisión de **calificaciones**"), y `sticker`: un `Sticker` junto al eyebrow ("IA + docente").

## Props
`highlight` · `sticker` · `eyebrow` · `title` · `description` · `actions` (máx. una primaria + una secundaria) · `tabs: [{ value, label }]` · `tab` · `onTab`.

## Reglas
- Un `h1` por página, siempre desde este componente.
- El título dice qué hace el docente aquí ("Revisión de calificaciones"), no el nombre del módulo técnico.
