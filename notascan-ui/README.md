# NotaScan.

> **La IA detecta. El docente verifica. El sistema guarda.**

Interfaz y Design System de **NotaScan**, un ecosistema académico para gestionar calificaciones a partir de fotografías de exámenes: identifica al estudiante por código QR, detecta la nota manuscrita, muestra el nivel de confianza de la IA y deja la decisión final al docente.

Proyecto de la asignatura **Diseño de Interfaces de Software** (5.º semestre). Demuestra Arquitectura de Información, Atomic Design y Design Tokens.

## Roles y rutas

En el login de escritorio elige **Entrar como** (Docente, Secretaría o Rectoría). Estudiantes y acudientes entran por la **app móvil** en `#/movil` (enlace en el login). En esta demo sirve cualquier usuario y una contraseña de 6+ caracteres. Las rutas siguen `#/<rol>/<página>[/<id>][?tab=]`.

| Rol | Páginas |
|---|---|
| **Secretaría** `#/admin/…` | `dashboard` · `students` (Estudiantes y Matrículas) · `enrollment` (registro e importación Excel/CSV) · `users` · `structure` · `curriculum` · `periods` · `reportcards` · `clearances` (Paz y Salvos) · `ranking` |
| **Rectoría** `#/principal/…` | `dashboard` (Panorama Institucional) · `analytics` · `teachers` (Seguimiento docente) · `requests` (Solicitudes) · `students` · `observer` · `reports` · `profile/<id>` |
| **Docente** `#/teacher/…` | `dashboard` · `grades` (Calificar con IA) · `review` · `gradebook` (Planilla) · `concepts` (Conceptos del periodo con IA) · `recoveries` · `attendance` · `behavior` · `students` · `evaluations` · `reports` · `system` |
| **Estudiante** `#/student/…` (móvil) | `home` · `grades` · `performance` · `achievements` · `simulator` · `notifications` · `observer` |
| **Acudiente** `#/parent/…` (móvil) | `home` · `grades` · `attendance` · `observer` · `reportcards` · `notifications` |

Atajos: **Ctrl + K** abre la búsqueda global de estudiantes (Secretaría, Rectoría, Docente). En la Planilla: flechas, Enter, Tab / Shift + Tab y Esc. En Asistencia: P, A, T, E.

Los datos son simulados (72 estudiantes en 6A–8B, 6 docentes, 6 materias). No hay backend en esta fase.

## Design System navegable

Abre **`design-system/index.html`**: portada, fundamentos (color, tipografía, espacio, radios y sombras leídos de los tokens) y los 113 componentes funcionando: Átomos, Moléculas, Organismos, Plantillas y Páginas, más las experiencias de Administración, Rectoría, Docente, Estudiante y Acudiente. Cada uno enlaza a su guía.

## Cómo verlo

No necesita compilación.

```bash
# opción 1: abrir index.html directamente en el navegador
# opción 2: servidor local
npm start        # http://localhost:5173
```

### Publicar en GitHub Pages

1. Sube esta carpeta a un repositorio.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. La app queda en `https://<usuario>.github.io/<repositorio>/`.

## Estructura

```text
notascan-ui/
├── index.html            ← la app (monta NotaScanApp)
├── design-system/
│   └── index.html        ← galería del Design System (Atomic Design completo)
├── css/
│   ├── tokens.css        ← variables CSS generadas desde tokens/tokens.json
│   └── notascan.css      ← estilos de componentes (solo usan tokens)
├── js/notascan.js        ← componentes (átomos → páginas) en window.NotaScan
├── tokens/tokens.json    ← fuente única de color, tipo, espacio, radios, sombras, motion
├── types/index.d.ts      ← tipos de dominio y props (Student, Grade, ReviewStatus…)
├── flutter/
│   ├── notascan_theme.dart ← tema Flutter generado desde los tokens
│   └── README.md         ← mapeo de componentes web → Flutter
├── docs/
│   ├── explicacion.md    ← sustentación: qué se diseñó y por qué
│   ├── brand-book.md     ← reglas de uso del sistema
│   ├── arquitectura.md   ← navegación global/local, flujo, Atomic Design
│   ├── implementacion.md ← migración a React + TS + Tailwind + Framer Motion
│   └── components/       ← guía de cada componente
└── vendor/               ← React 18 (UMD, licencia MIT)
```

## Design System

- **Paleta**: navy `#1B2A4A` · aged gold `#B8924B` · warm ivory `#F7F3EC` · charcoal `#2B2B2B` · sage `#6B8F71` · burgundy `#7A2E2E`.
- **Tipografía**: Fraunces (títulos, notas, cifras) + Inter (interfaz).
- **Roles**: Secretaría y Docente densos y productivos, Rectoría analítica, Estudiante motivador (XP y logros), Acudiente claro y tranquilo. Misma identidad, distinto layout.
- **Lenguaje**: neo-brutalismo vivo (bloques de color, bordes de 2px, sombras sólidas, stickers) + detalles editoriales académicos; vidrio solo en lo que flota.
- **Atomic Design**: 18 átomos, 17 moléculas, 42 organismos, 4 plantillas (AppShell, RoleShell, MobileShell, GradeReviewDashboard) y 42 vistas para 6 roles. Ver `docs/arquitectura.md`.
- **Accesibilidad**: contraste AA, foco visible, navegación por teclado, `aria-*` en controles, `prefers-reduced-motion`.

## Siguiente paso

`docs/implementacion.md` describe cómo pasar estos componentes a la app de escritorio (Tauri + React + TypeScript + Tailwind + Framer Motion) conservando los tokens.
