# GradeInputGroup

`GradeInput` + la línea que explica el origen de la nota. Es la molécula donde se hace visible el principio **La IA detecta · el docente verifica**.

- Sin cambios: "✦ La IA detectó esta calificación".
- Con cambios: "✎ Corregida por el docente · la IA detectó 3.8" en `gold-ink`.
- Sin detección: "La IA no detectó una nota: ingreso manual".

## Props
`detected` (número de la IA, o `NaN`) · `value` · `onChange` · `label` ("Calificación detectada") · `actions` (botones Editar/Confirmar opcionales) · `autoFocus` · `onKeyDown`.

El consumidor deshabilita "Confirmar" mientras `validateGrade(value).valid` sea falso.
