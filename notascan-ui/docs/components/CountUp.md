# CountUp

Cifra que cuenta desde 0 hasta su valor al aparecer (600ms, `ease-out`). Conserva decimales, separadores y sufijo: `"3.8"`, `"9%"`, `"112"`. Úsala en KPIs, bento y resúmenes, nunca en celdas de tabla ni en campos editables.

Lectores de pantalla oyen el valor final (`aria-label`); con `prefers-reduced-motion` la cifra aparece sin contar.

Props: `value` · `animate` (por defecto `true`).
