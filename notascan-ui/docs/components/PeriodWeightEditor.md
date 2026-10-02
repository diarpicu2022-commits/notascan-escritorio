# PeriodWeightEditor

Editor de la distribución de la nota de un periodo: barra apilada visual, un control deslizante y un campo numérico por componente, y el **total configurado**. Si no suma 100% muestra "La distribución de porcentajes debe sumar 100%." y el espacio faltante rayado en `burgundy`; quien lo use debe deshabilitar Guardar.

Props: `items: [{ name, weight }]` · `onChange(items)`.
