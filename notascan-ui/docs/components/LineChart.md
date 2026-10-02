# LineChart

Líneas de 2.5px con marcadores, etiqueta directa en el último punto, retícula recesiva, umbral opcional (p. ej. "Mínimo 3.0") y mira al pasar el cursor. Máximo dos series: `navy` (actual) y `gold` discontinua (comparación), siempre con leyenda. Una sola escala, nunca doble eje.

Props: `title` · `subtitle` · `labels` · `series: [{ name, points, tone?, dashed? }]` · `min` · `max` · `ticks` · `threshold` · `thresholdLabel` · `height` · `format`.
