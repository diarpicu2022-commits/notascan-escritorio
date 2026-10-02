# ConfidenceIndicator

Medidor de 10 segmentos que muestra cuánto confía la IA en su lectura. Combina porcentaje, segmentos, icono y nivel en palabras.

## Umbrales
- **≥ 90%** Alta confianza — `sage`.
- **75–89%** Confianza media — `gold`.
- **< 75%** Baja confianza — `burgundy`; la tarjeta pasa a "Requiere revisión".

La función `NotaScan.confidenceLevel(pct)` centraliza estos umbrales: no los repitas.

## Props
`value` (0–100) · `label` ("Confianza de IA") · `showLevel` (false oculta la línea de nivel).

Accesible como `role="meter"` con `aria-valuetext` que incluye el nivel.
