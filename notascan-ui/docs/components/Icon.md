# Icon

Sistema de iconos lineales de NotaScan: retícula de 24px, trazo de 2px, extremos redondeados, dibujados en el lenguaje de Lucide. Heredan el color del texto (`currentColor`).

## Props
- `name`: `dashboard` · `grade` (Calificar) · `students` · `evaluations` · `reports` · `system` · `upload` · `download` · `check` · `warning` · `error` · `search` · `edit` · `lock` · `ai` · `arrow` · `settings` · `close` · `menu` · `camera` · `qr` · `file` · `clock` · `user` · `chevron` · `filter`.
- `size` (px, 20 por defecto; 16 en badges y botones pequeños, 24 en tarjetas de icono).
- `label`: si el icono comunica algo por sí solo, pásale texto — se expone como `role="img"`. Sin `label` queda `aria-hidden`.

## Reglas
- Un icono acompaña a una palabra; nunca la reemplaza salvo en botones de icono, que llevan `aria-label`.
- No mezclar trazos: nada de iconos rellenos ni de otra familia.
- En la app React usar `lucide-react` con el mismo nombre semántico (LayoutDashboard, ScanLine, Users, ClipboardList, BarChart3, Component, Upload, Check, TriangleAlert, CircleX, Search, Pencil, Lock, Sparkle, ArrowRight, SlidersHorizontal).
- La IA se representa con un destello pequeño (`ai`), nunca con robots o cerebros.
