# MobileWidget

Contenedor base de los widgets de la app móvil: bloque redondeado (22px) con borde `navy`, cabecera en mayúsculas con icono y contenido libre. Tamaños `s` (una columna) y `m` (ancho completo). Tonos: `navy`, `gold`, `gold-soft`, `sage`, `burgundy` o `paper`.

Con `onClick` el widget entero es un botón que lleva a la vista de detalle (se levanta en hover y se hunde al presionar). Con `editing` se mece y muestra el botón "Quitar".

Movimiento: entra con un pequeño rebote; los anillos se llenan, las cifras cuentan (`CountUp`) y las líneas se dibujan. Con `prefers-reduced-motion` todo aparece quieto.

Props: `title` · `icon` · `size` · `tone` · `onClick` · `ariaLabel` · `editing` · `onRemove` · `children`.
