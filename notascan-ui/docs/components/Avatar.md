# Avatar

Círculo con borde `navy` de 2px y `shadow-sm`. Sin foto muestra iniciales (nombre + primer apellido) sobre un tinte cálido elegido de forma estable a partir del nombre (`gold-soft`, `sage-soft`, `ivory-deep`, `paper`).

## Props
`name` (obligatorio: da las iniciales y el `aria-label`) · `src` · `size` (`sm` 32 · `md` 40 · `lg` 56).

## Reglas
- No usar fotos de stock ni avatares ilustrados.
- Junto a un nombre visible, el avatar es redundante para lectores de pantalla pero se mantiene el `aria-label` por consistencia.
