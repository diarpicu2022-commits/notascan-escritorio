# Sidebar

Navegación global: logotipo, las seis secciones y el perfil del docente. Bloque sólido `paper` con borde `navy`, `radius-lg` y una sombra discreta de 3px; el ítem activo se rellena de `gold` con `shadow-md` y el curso activo va en un bloque `sage-soft`. El vidrio queda para lo que flota: modales, dropdowns y el panel de procesamiento.

Arriba lleva el `BrandTile` (la portada en miniatura); en modo rail, solo el monograma.

## Secciones (fijas)
Dashboard · Calificar · Estudiantes · Evaluaciones · Reportes · Design System. No agregar módulos fuera de este alcance.

## Responsive
- **≥ 1100px** — completo (`sidebar-width` 264px) con numeración y curso activo.
- **720–1099px** — `collapsed` (rail de `sidebar-rail` 80px, solo iconos con `aria-label`).
- **< 720px** — oculto; la barra superior abre el mismo Sidebar como drawer (`onClose` muestra el botón cerrar).

## Props
`active` (id) · `onNavigate(id)` · `items` (por defecto `NotaScan.NAV`; admite `count`) · `collapsed` · `course` · `user: { name, role }` · `onClose`.

El sidebar no contiene filtros, títulos de página ni acciones: eso es navegación local (`Header`, `FiltersBar`).
