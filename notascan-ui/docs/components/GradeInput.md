# GradeInput

El control de entrada de nota: un número grande en `display` (Fraunces) dentro de una caja brutalista, con la escala "DE 5.0" pegada al lado.

## Comportamiento
- Acepta `4.5` o `4,5`; filtra letras y limita a 4 caracteres; `inputMode="decimal"` abre el teclado numérico.
- Valida el rango **1.0 — 5.0**. Fuera de rango muestra: "La calificación debe estar entre 1.0 y 5.0." en `burgundy`, marca `aria-invalid` y el consumidor NO debe permitir confirmar (`validateGrade(v).valid`).
- Controlado (`value` + `onChange(value, check)`) o no controlado (`defaultValue`).

## Props
`label` · `value` / `defaultValue` · `onChange(raw, { valid, value, message })` · `hint` · `disabled` · `readOnly` · `autoFocus` · `onKeyDown` (Enter confirma y Escape cancela dentro de `StudentGradeCard`).

## Helper
`NotaScan.validateGrade(v)` devuelve `{ valid, value, message }` — úsalo en cualquier lugar donde se guarde una nota.
