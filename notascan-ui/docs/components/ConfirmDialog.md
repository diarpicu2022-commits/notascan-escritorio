# ConfirmDialog

Confirmación de la acción masiva "Confirmar y guardar". Modal de vidrio con borde `navy` y `shadow-lg`, sello `gold` con candado, título en `display`.

Copy por defecto:
> ¿Confirmar 18 calificaciones?
> Las calificaciones verificadas serán guardadas.

Botones: **Cancelar** (secundario, recibe el foco) · **Confirmar y guardar** (primario, con estado `loading`).

## Accesibilidad
`role="alertdialog"`, `aria-modal`, foco atrapado, Escape y clic en el velo cancelan, y el foco vuelve al disparador al cerrar.

## Props
`open` · `count` · `onCancel` · `onConfirm` · `loading` · `note` (p. ej. cuántas quedarán pendientes) · `title` · `description` · `confirmLabel` · `inline` (posición absoluta, para documentación).

Solo para acciones irreversibles o masivas. No uses modales para confirmar una sola tarjeta.
