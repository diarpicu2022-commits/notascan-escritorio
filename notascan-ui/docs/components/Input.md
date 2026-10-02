# Input

Campo de texto con label real siempre visible. Superficie `paper`, borde `navy` de 2px, `radius-sm`, altura `control-md`.

## Estados
- **Default / hover** — en hover aparece `shadow-sm`.
- **Focus** — subrayado interior `gold` de 4px + sombra; el indicador dorado es la marca de "estás escribiendo aquí".
- **Error** — borde y texto `burgundy` sobre `burgundy-soft`, mensaje con icono y `role="alert"`, `aria-invalid`.
- **Disabled** — borde discontinuo `muted` sobre `ivory-deep`.
- **Readonly** — borde punteado y fondo transparente.

## Props
`label` (obligatorio salvo que pases `hideLabel`) · `hint` · `error` · `id` · cualquier atributo de `<input>`.

## Reglas
- El mensaje de error dice qué hacer, no qué falló técnicamente.
- Nunca vidrio detrás de un input.
