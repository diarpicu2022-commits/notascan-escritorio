# DataGrid

**La** infraestructura de tablas de NotaScan: todas las tablas administrativas usan este componente.

Incluye ordenamiento por columna (`aria-sort`), paginación, selección por fila y por página (con estado parcial), barra de acciones en lote, acciones por fila, control de densidad (Cómoda/Compacta), barra de herramientas para filtros, y estados de carga (skeleton), error (con Reintentar) y vacío.

## Props
`caption` (obligatorio) · `columns: [{ key, label, sortable?, numeric?, header?, render?, sortValue?, width? }]` · `rows` · `rowKey` · `pageSize` · `paginate` · `selectable` · `bulkActions(seleccionados, limpiar)` · `rowActions(fila)` · `toolbar` · `densityToggle` · `density` · `initialSort` · `loading` · `error` + `onRetry` · `emptyTitle` · `emptyMessage` · `resetKey`.

Las acciones destructivas en lote siempre pasan por `Modal` de confirmación.
