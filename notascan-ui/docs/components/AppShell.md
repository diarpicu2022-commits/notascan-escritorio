# AppShell

Plantilla base de todas las páginas internas: `Sidebar` (navegación global) + barra superior móvil con drawer + `<main>` con márgenes `space-7`, sobre el lienzo de puntos `.ns-canvas`.

## Props
`active` (id de NAV) · `onNavigate(id)` · `onLogout` · `pending` (conteo en "Calificar") · `course` · `overlay` (modales y toasts) · `children`.

Cada página aporta su navegación local (`Header`, `FiltersBar`, tabs) como hijos; el shell nunca la contiene.
