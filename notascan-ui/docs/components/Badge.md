# Badge

Etiqueta compacta con borde de 2px del mismo color que su texto, `radius-sm` (no es una píldora) e icono siempre presente: el color nunca es la única señal.

## Tonos (`tone`)
| Familia | Tono | Colores | Icono |
|---|---|---|---|
| Confianza de IA | `high` (≥90%) | `sage-ink` sobre `sage-soft` | check |
| | `medium` (75–89%) | `gold-ink` sobre `gold-soft` | ai |
| | `low` (<75%) | `burgundy` sobre `burgundy-soft` | warning |
| Estado de revisión | `verified` | `sage-ink` sobre `sage-soft` | check |
| | `pending` | `navy`, borde discontinuo | clock |
| | `review` | `burgundy` | warning |
| Otros | `neutral`, `solid` | `navy` / `gold` | opcional |

## Regla clave
**Confianza** (lo que opina la IA) y **Estado** (lo que decidió el docente) son conceptos distintos: nunca los combines en un mismo badge. Para confianza usa `ConfidenceBadge`; para estado usa `ReviewStatus`.
