# FilterGroup

Grupo de filtros con leyenda en `overline`. Dos formas:

- **Chips** (por defecto) — `fieldset` + `legend` con botones `aria-pressed`. Chips en píldora (`radius-full`) con sombra sólida de 2px y conteo en su propia pastilla. El activo se invierte: `navy` con `shadow-gold` y conteo en `gold`. Para 2–5 opciones con conteo (estado).
- **Select** (`as: "select"`) — para listas más largas (asignatura, curso, evaluación, confianza).

Props: `label` · `options: [{ value, label, count? }]` · `value` / `defaultValue` · `onChange(value)` · `as`.
