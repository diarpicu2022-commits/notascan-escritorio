# Button

Botón táctil neo-brutalista: borde `navy` de 2px, `radius-md`, sombra sólida `shadow-md`. Al pasar el cursor se desplaza 2px y la sombra baja a `shadow-sm`; al presionar se hunde 4px y la sombra desaparece (`shadow-pressed`). Debe sentirse como un objeto físico.

Altura 48px (`lg` 58px con `shadow-lg`), `radius-md`, texto 700. El secundario se tiñe de `gold-soft` al pasar el cursor.

## Variantes (`variant`)
- `primary` — relleno `gold`, texto `navy`. Una acción primaria por vista: "Confirmar y guardar", "Confirmar".
- `secondary` — relleno `paper`. Acciones de apoyo: "Subir fotografía", "Editar".
- `ghost` — sin borde ni sombra hasta el hover. Acciones terciarias dentro de tarjetas y cancelar.
- `danger` — relleno `burgundy`, texto `ivory`. Solo acciones destructivas.
- `icon` — cuadrado de 44px; **requiere** `aria-label`.

## Props
`size` (`sm` 32px · `md` 44px · `lg` 56px) · `icon` / `iconRight` (nombre de `Icon`) · `loading` (muestra "Guardando…" con tres puntos, `aria-busy`) · `success` + `successText` · `disabled` · `block` · `state` (solo documentación: fuerza `hover`/`active`/`focus`).

## Reglas
- El texto es un verbo en infinitivo o una acción clara: "Confirmar", "Subir fotografía". Nunca "OK" ni "Enviar".
- `loading` nunca depende solo de una animación: siempre dice qué está pasando.
- El foco visible es el anillo del sistema: 2px `navy` + halo `gold`.
