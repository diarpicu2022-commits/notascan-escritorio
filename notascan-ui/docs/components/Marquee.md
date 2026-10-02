# Marquee

Franja de principio: una píldora `paper` con borde `navy` de 2px y `shadow-sm`, contenida en el ancho del contenido (sin rotar ni salir de la página). A la izquierda, una etiqueta fija en `gold` ("✦ Principio"); a la derecha, el texto se desplaza despacio (45s por vuelta) con bordes desvanecidos y puntos de color (`sage`, `gold`, `burgundy`) como separadores.

Por defecto dice: **La IA detecta · El docente verifica · El sistema guarda · Precisión con control humano**.

## Props
`items` (textos) · `label` ("Principio") · `tone` (`navy` = papel, `gold` = `gold-soft`) · `className`.

## Reglas
- Una sola franja por página, entre el `Header` y el contenido.
- Es contexto, no información nueva. Se expone como `role="note"` con el texto completo; la pista animada queda `aria-hidden`.
- Se pausa al pasar el cursor y se detiene con `prefers-reduced-motion`.
