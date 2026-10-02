# StudentGradeCard

El organismo central de NotaScan: una nota detectada por la IA, lista para que el docente la verifique.

## Jerarquía (no alterar)
1. **Calificación** — `grade` en Fraunces 72px, con count-up 0.0 → 4.5 (600ms, `ease-out`).
2. **Estudiante** — avatar, nombre, ID y curso.
3. **Confianza de IA** — `ConfidenceBadge` compacto en la cabecera + `ConfidenceIndicator` junto a la nota.
4. **Estado** — `ReviewStatus` en el pie.
5. **Acciones** — Editar (secundario) · Confirmar (primario).
6. **Metadata** — numeración editorial "Nº 03" en una etiqueta sobre el borde.

## Forma
Cabecera en bloque de color según estado (`gold-soft` pendiente, `burgundy-soft` requiere revisión, `sage-soft` verificada), la nota dentro de una **baldosa** `paper` con borde y `shadow-md`, índice "Nº 03" como sticker `navy` rotado sobre el borde y pie separado por una línea discontinua. En hover la tarjeta se levanta 3px y gira −0.3°.

## Estados
- **Pendiente** — pie `ivory`, sombra `navy`.
- **Requiere revisión** (confianza < 75%) — borde, sombra y pie en `burgundy`. Llama la atención sin ser una alerta invasiva.
- **Editando** — la nota se convierte en `GradeInputGroup`. Enter confirma, Escape cancela; "Confirmar" se deshabilita fuera de 1.0–5.0.
- **Verificada** — la tarjeta se hunde un instante (`shadow` → 0) y cae un **sello** circular `sage` con la nota, rotado −12°. El pie pasa a `sage-soft`.
- **Sin detección** — "No pudimos detectar una calificación. Puedes introducirla manualmente." + botón "Introducir".

## Props
`student: { name, id, course? }` · `detected` (número o `NaN`) · `confidence` (0–100) · `status` + `onStatusChange` (controlado) · `onGradeChange(n)` · `onConfirm(n)` · `index` · `animate` (false desactiva el count-up) · `editing`.

`StudentGradeCardSkeleton` es su estado de carga.

## Copy
Siempre "Calificación detectada: 4.5" o "La IA detectó 4.5". Nunca "La IA calificó al estudiante".
