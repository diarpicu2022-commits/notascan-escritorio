# NavigationItem

Icono + label para la navegación global. Renderiza `<a>` si recibe `href`, si no `<button>`.

## Estados
- **Default** — sin borde; numeración editorial (`01`…`06`) en `muted` a la derecha.
- **Hover** — superficie `paper` translúcida y borde `hairline`.
- **Active** — bloque `navy` pleno, texto `ivory`, icono y numeración en `gold`, `shadow-gold`. Expone `aria-current="page"`. No se usa texto navy sobre dorado: a simple vista se pierde.
- **Disabled** — `muted`, `aria-disabled`.

## Props
`icon` · `label` · `active` · `disabled` · `count` (pendientes, sustituye la numeración) · `index` · `collapsed` (modo rail: solo icono, con `aria-label` y `title`) · `href` / `onClick`.
