# Logo

El logotipo de NotaScan es tipográfico: la palabra **NotaScan** en `display` (Fraunces 600) seguida de un punto dorado con borde `navy`. El punto es la firma: el "punto final" de una nota verificada.

## Props
- `size` (px, por defecto 28): tamaño de la palabra; el punto escala con ella.
- `mark` (bool): antepone el monograma "N" sobre `gold` con `shadow-sm`, para el sidebar reducido y la barra móvil.

## BrandTile
`NotaScan.BrandTile` es la firma de marca del `Sidebar`: la portada del sistema en miniatura. Una franja con retícula de puntos y bloques `gold`, `navy` (con "4.5" en Fraunces 800), `sage` y `burgundy`, y debajo el logotipo a 34px con el lema "La IA detecta. Tú verificas." Va directamente sobre el menú, sin recuadro propio; una línea discontinua `navy` lo separa de la navegación. Props: `size`, `tagline`.

## Uso
- Una vez por vista: en el `Sidebar` o en la barra superior móvil.
- Siempre `navy` sobre `ivory`, `paper` o vidrio. Nunca sobre `gold` ni fotografías.
- No reconstruir el punto como carácter "." — es un elemento gráfico con borde.
