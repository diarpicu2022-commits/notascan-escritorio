# StatusDot

Indicador mínimo de estado de sistema. Cada estado cambia de **forma**, no solo de color:

- `processing` — anillo que gira con arco `gold` (`role="status"`).
- `success` — círculo `sage`.
- `warning` — rombo `gold`.
- `error` — cuadrado `burgundy`.

Props: `status` · `label` (sustituye el texto por defecto) · `hideLabel` (mantiene el texto solo para lectores de pantalla). Úsalo para procesos (reconocimiento, guardado), no para el estado de una calificación: para eso está `ReviewStatus`.
