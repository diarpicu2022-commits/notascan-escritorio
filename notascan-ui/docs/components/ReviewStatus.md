# ReviewStatus

Icono + texto que describen la **decisión del docente** sobre una calificación. Tipo: `ReviewStatus = 'pending' | 'verified' | 'needs-review'`.

- `pending` — reloj, `navy`: "Pendiente de revisión".
- `verified` — check, `sage-ink`: "Verificada".
- `needs-review` — advertencia, `burgundy`: "Requiere revisión".

Props: `status` · `label` (sustituye el texto). Independiente de la confianza de la IA.
