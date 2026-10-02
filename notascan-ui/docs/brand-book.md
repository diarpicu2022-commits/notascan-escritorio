**La IA detecta. El docente verifica. El sistema guarda.** NotaScan es una herramienta académica para revisar calificaciones manuscritas reconocidas por IA. Todo en este sistema existe para que un docente lea una nota, entienda cuánto confía la IA en ella y decida con control total.

Tres lenguajes visuales conviven, cada uno con un trabajo distinto — y la accesibilidad por encima de los tres:

| Lenguaje | Trabajo | Dónde |
|---|---|---|
| **Neo-brutalismo vivo** (voz principal) | estructura, interacción, energía | Bloques de color pleno, borde 2px `navy`, sombras sólidas, stickers rotados, bento, cinta `Marquee`, chips en píldora |
| **Editorial académico** | identidad, conocimiento | Fraunces 800 en títulos y notas, marcador `gold` en la palabra clave, numeración "Nº 03", itálicas en la cinta, sello de verificación |
| **Vidrio** (acento) | profundidad de lo que flota | Modales, dropdowns, `ProcessingPanel`. Nunca en contenido ni en el sidebar |

Nunca los tres en el mismo elemento.

## Contenido y voz

- Todo el texto visible va en **español**, directo, humano y académico. Tutea al docente: "Verifica las calificaciones antes de guardarlas."
- La IA **detecta**; nunca califica. Escribe "Calificación detectada: 4.5" o "La IA detectó 4.5". Nunca "La IA calificó al estudiante".
- Botones con verbos: "Confirmar", "Confirmar y guardar", "Subir fotografía", "Editar", "Introducir".
- Estados con palabras fijas: **Pendiente de revisión** · **Verificada** · **Requiere revisión**. Niveles de IA: **Alta confianza** · **Confianza media** · **Baja confianza**. No mezclar estado y confianza en una misma etiqueta.
- Errores sin tecnicismos y con salida: "No pudimos detectar una calificación. Puedes introducirla manualmente." / "La calificación debe estar entre 1.0 y 5.0."
- Vacíos con una acción: "No hay calificaciones pendientes. Carga una evaluación para comenzar la revisión."
- Datos de ejemplo creíbles (María Fernanda López, 20261045, Matemáticas · 7A). Nunca "User 1" ni "John Doe". Sin emoji, sin frases motivacionales.

## Color

La paleta es cerrada: **marfil + navy + dorado + salvia + burdeos**. Sin morados, cian, neón, degradados azul-violeta ni fondos negros.

- Lienzo en `ivory`; datos y tarjetas en `paper`; zonas hundidas (cabeceras de tabla, pistas) en `ivory-deep`.
- Texto principal, bordes, iconos y sombras en `navy`. Texto secundario en `charcoal`; metadata e IDs en `muted`.
- `gold` es relleno de la acción primaria, del estado activo y de los acentos. **Nunca texto dorado sobre marfil**: usa `gold-ink`. Sobre `gold`, el texto va en `navy`.
- `sage` significa alta confianza / verificada; como texto usa `sage-ink`, como fondo `sage-soft`.
- `burgundy` significa baja confianza / error / requiere revisión; fondo `burgundy-soft`.
- Umbrales de confianza: ≥90% alta (`sage`), 75–89% media (`gold`), <75% baja (`burgundy`). Usa `NotaScan.confidenceLevel()`; no reescribas los números.
- El color nunca va solo: cada estado lleva además icono y palabra, y `StatusDot` cambia de forma (círculo, rombo, cuadrado, anillo).

## Tipografía

- `display` (Fraunces, alternativa Playfair Display) para el logotipo, títulos (`display`, `heading`, `title`), la nota (`grade`) y cifras editoriales (`stat`).
- `ui` (Inter, alternativa Work Sans) para todo lo operativo: `label` en botones, navegación y nombres; `body` para texto; `caption` para IDs y metadata; `overline` en mayúsculas espaciadas para eyebrows y numeración; `numeric` en tablas.
- Números siempre con `font-variant-numeric: lining-nums tabular-nums`. La nota se escribe con un decimal: `4.5`, `3.0`.

## Espacio, forma y profundidad

- Escala de 4px: `space-1`…`space-8`. Tarjetas con `space-5` de padding; grid con `space-5` entre columnas y `space-6` entre filas; márgenes de página `space-7` en escritorio, `space-4` en móvil.
- Radios: `radius-sm` (6px) badges; `radius-md` (10px) botones, inputs, ítems de nav e iconos en bloque; `radius-lg` (16px) tarjetas, tiles, sidebar, barra de filtros, modales; `radius-full` chips, stickers, avatares, barras de progreso.
- **Bloques de color, no tarjetas blancas en serie.** Cada bloque lleva un relleno con significado: `gold-soft` pendiente, `sage-soft` verificado, `burgundy-soft` revisión, `navy` el dato principal, `gold` lo activo. El blanco (`paper`) se reserva para lo que se lee o se escribe: la nota, tablas, inputs.
- Uno o dos stickers por pantalla, rotados entre −6° y 6°. Una cinta `Marquee` por página como máximo.
- Bordes estructurales de `border-width` (2px) en `navy`; líneas editoriales de 1px en `hairline`.
- Sombras sólidas y físicas: `shadow-md` en reposo, `shadow-lg` en elevación, `shadow-sm` en hover, `shadow-pressed` al presionar. La única sombra difusa es `shadow-glass`.
- Vidrio = `glass` + `backdrop-filter: blur(14px)` + borde `glass-edge` + `shadow-glass`. **Legibilidad > vidrio**: nunca en tablas, inputs, texto largo ni tarjetas de estudiante.
- El lienzo es `ivory` con una retícula de puntos `navy` al 16% cada 22px (`.ns-canvas`): papel cuadriculado de cuaderno, nunca degradados.

## Interacción y movimiento

NotaScan se siente vivo, pero el movimiento siempre tiene un trabajo. Hay tres ritmos:

| Ritmo | Cuándo | Dónde | Duración |
|---|---|---|---|
| **Entrada** (una vez) | al llegar a una vista | bloques de la página escalonados cada `stagger` (60ms), filas de tabla (solo las primeras 8, sutil), menú lateral desde la izquierda, marcador dorado que se pinta bajo la palabra clave, cifras que cuentan desde 0 (`CountUp`), barras que crecen desde la base, líneas que se dibujan, donut que gira al entrar, barras de progreso que se llenan | `duration-entrance` 520ms, `ease-out` |
| **Respuesta** (al interactuar) | hover, foco, presión, cambio de pestaña | botones que se hunden, flecha que avanza 4px, pestaña móvil activa con rebote, sello de verificación | `duration-fast` 120ms – `duration-slow` 600ms |
| **Ambiente** (permanente y lento, o de vez en cuando) | solo en lo decorativo y lo que debe llamar la atención | login: manchas que respiran, burbujas a la deriva, hoja y teléfono que flotan en contrafase, línea de escaneo, lápiz que se balancea, sello que late; "¡Hola!" con la exclamación que se mueve cada 6s; brillo que cruza la acción primaria cada 6s; bloques de la marca flotando; stickers que se mecen; tarjeta "Requiere revisión" con un pulso cada 6s; campana con notificaciones sin leer; medallas desbloqueadas con destello | `duration-ambient` 5–13s |

- Botones: hover `translate(2px, 2px)` + `shadow-sm`; active `translate(4px, 4px)` + `shadow-pressed`, en `duration-fast`.
- Bloques (tarjetas, tiles, ítems de nav): en hover se **levantan** 2–3px y la sombra crece; la tarjeta además gira −0.3°.
- **Widgets móviles:** lo que está en vivo late o cuenta (clase en curso, cuenta regresiva, día de hoy); lo demás entra una sola vez. En modo edición los widgets se mecen. En el acudiente los widgets entran sin rebote y no hay llama.
- **Densidad manda:** en la planilla, tablas administrativas y formularios solo hay entradas sutiles; nada se mueve mientras el usuario escribe o lee datos. El ambiente vive en el login, la marca, los stickers y la app del estudiante.
- Las entradas usan las propiedades individuales `translate`, `scale` y `rotate` con `animation-fill-mode: backwards`, así nunca pisan el hover ni el `transform` propio de cada componente.
- Foco visible siempre: contorno `focus` de 2px con 3px de separación; subrayado `gold` en botones y navegación; barra interior `gold` en inputs.
- `prefers-reduced-motion: reduce` detiene todo el ambiente (manchas, brillo, stickers, campana, escaneo), reduce las entradas a 1ms, muestra las cifras finales sin contar y conserva el feedback (estados, textos, sello estático).

## Iconografía

Iconos lineales en retícula de 24px, trazo de 2px y extremos redondeados, en el lenguaje de Lucide (en React: `lucide-react`). Heredan el color del texto. Siempre acompañan a una palabra; los botones solo-icono llevan `aria-label`. La IA se representa con un destello pequeño (`ai`), nunca robots, cerebros ni circuitos. Mapa completo en `Icon`.

## Logotipo

"NotaScan" en Fraunces 600 + un punto `gold` con borde `navy` — el punto final de una nota verificada. En el rail del sidebar se usa el monograma "N" sobre `gold`. No hay archivo de logotipo aparte: el componente `Logo` es la fuente.

## Accesibilidad (no negociable)

- Texto ≥ 4.5:1 sobre su fondo (verificado: `navy`/`ivory` 12.9:1, `navy`/`gold` 4.9:1, `gold-ink`/`ivory` 5.4:1, `sage-ink`/`sage-soft` 5.5:1, `muted`/`ivory-deep` 5.7:1). `sage` y `gold` puros solo como relleno, borde o icono.
- Labels reales en todos los campos, `aria-label` en botones de icono, `aria-current` en navegación, `role="meter"` en confianza, `role="alertdialog"` con foco atrapado en la confirmación masiva.
- Todo es operable con teclado: Enter confirma y Escape cancela la edición de una nota.
- Una nota fuera de 1.0–5.0 nunca se puede confirmar (`NotaScan.validateGrade`).

## Roles y densidad

NotaScan es un ecosistema con seis roles que comparten **la misma identidad, no el mismo layout**:

| Rol | Experiencia | Densidad | Personalidad |
|---|---|---|---|
| Administración / Secretaría | Escritorio | Alta: tablas `DataGrid` compactas, formularios por secciones, drawers y acciones en lote | Eficiente |
| Rectoría | Escritorio | Equilibrada: indicadores, gráficos que responden una pregunta, bandeja de decisiones | Analítica |
| Docente | Escritorio | Alta y orientada al teclado: planilla, asistencia, recuperaciones | Productiva |
| Estudiante | Móvil (Flutter) | Baja, visual, táctil | Motivadora: XP, niveles, logros |
| Acudiente | Móvil (Flutter) | Baja, calmada | Clara y confiable, sin gamificación |

- La gamificación vive solo en la experiencia del estudiante. Nunca en administración, rectoría, la planilla docente ni el acudiente.
- Modal para confirmar, aprobar, restablecer o destruir; `Drawer` para consultar, editar y filtrar sin salir de la tabla.
- Toda tabla administrativa usa `DataGrid` (ordenar, filtrar, paginar, seleccionar, acciones en lote, estados de carga, error y vacío).
- Gráficos: una sola escala, `navy` para la serie principal y `gold` (con borde y etiqueta) para comparación o meta; cada gráfico lleva un subtítulo con la pregunta que responde y una tabla oculta para lectores de pantalla.
- **IA solo donde ayuda al docente:** detectar notas en fotografías, sugerir el concepto del periodo (`ConceptEditor`) y redactar observaciones. Siempre como borrador marcado "Borrador de IA · revisar"; nada se publica sin revisión. La app del estudiante no usa IA.
- La nota original nunca se sobrescribe: recuperaciones y solicitudes de cambio conservan el historial.
- Todo el texto visible está en español; los identificadores de código pueden estar en inglés.

