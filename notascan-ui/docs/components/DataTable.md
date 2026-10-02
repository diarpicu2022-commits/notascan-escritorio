# DataTable

Tabla para datos densos (Estudiantes, Evaluaciones, Reportes). **Legibilidad > vidrio**: superficie sólida `paper`, cabecera `ivory-deep` con `overline` y regla `navy` de 2px, filas separadas por `hairline`, números alineados a la derecha con `tabular-nums`, notas en Fraunces.

Props: `caption` (obligatorio; se lee en lectores de pantalla) · `columns: [{ key, label, numeric?, render? }]` · `rows`.

El contenedor es desplazable horizontalmente y enfocable con teclado en pantallas estrechas.
