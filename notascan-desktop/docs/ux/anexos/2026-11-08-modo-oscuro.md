# Anexo de diseño · Modo oscuro de NotaScan escritorio

Fecha: 2026-11-08 · Fase: contrato firmado y pasos 1 a 5 hechos. Diego eligió la dirección B · Campo marino el 2026-11-08. El contrato está en la sección 11 y lo hecho en los pasos 1 a 5, con sus mediciones, en las secciones 12 a 16. Las secciones 3 a 10 son la investigación que llevó a esa elección y no se reescriben.

Origen del pedido. El profesor pidió el 2026-10-07 modo claro y oscuro a elección de la persona (Claro, Oscuro, Como el sistema), guardado en el dispositivo. Diego decidió el 2026-10-08 que el oscuro se deriva del sistema NotaScan, que no es otra marca, que se mide el contraste y que se ven capturas antes de aplicarlo en todo.

## 1. Usuarios

| Rol | Quién | Cuándo usa el oscuro | Qué no puede fallar |
|---|---|---|---|
| Docente | Profesor de básica y media en Nariño, 25 a 60 años, habilidad técnica media o baja | De noche en la casa, en el portátil del colegio o el propio, revisando 30 o 40 notas seguidas | Leer la nota que detectó la IA sin dudar y ver de un vistazo si la confianza es alta, media o baja |
| Secretaría | Personal administrativo, jornada completa frente a tablas | Tardes largas de matrícula y cierre de periodo | Tablas legibles y filas que no se pierdan al pasar el ratón |
| Rectoría | Rector o coordinador, uso semanal | Revisión de solicitudes fuera de horario | Las dos cifras del cambio de nota (actual y solicitada) con contraste AAA |

Condiciones que mandan sobre la estética. La pantalla se mira de noche y por mucho rato, con brillo bajo y a veces con la luz de la habitación apagada. Hay personas mayores de 50 años con presbicia, así que el texto marfil no puede quedar tan tenue que obligue a acercarse. Muchos no saben qué es «modo oscuro». Por eso la tercera opción se llama «Como el sistema» y no «Automático». Los boletines y reportes se imprimen siempre en claro.

## 2. Análisis de la comunicación

Qué tiene que decir la pantalla en oscuro es lo mismo que en claro. «La IA detecta. El docente verifica. El sistema guarda.» La decisión dominante sigue siendo confirmar o corregir una nota. Lo que cambia es el costo de cada superficie clara, porque de noche un bloque marfil grande deslumbra y cansa.

Lo que el oscuro tiene que conservar:

- La cifra de la nota en Fraunces, con contraste AAA (7:1 o más).
- Los tres estados de confianza con icono y palabra, no solo con color.
- La identidad del sistema, que vive en los bordes de 2 px, la sombra dura desplazada, el dorado como acción y el navy como marca.
- La barra de título propia, que también pasa a oscuro.

Lo que no va en el oscuro:

- Degradados, brillos de neón y vidrio esmerilado.
- Un azul eléctrico nuevo o cualquier color que no salga de la paleta clara.
- Un fundido animado de colores al cambiar de tema.
- El oscuro en impresión.

## 3. Lo que se encontró en el sistema antes de diseñar

Esto condiciona las tres direcciones, así que va primero. Se leyó `src/styles/notascan.css` con un script (`scripts/verify-dark-directions.mjs`, función `parseRules`).

1. **`--navy` hace cuatro trabajos a la vez.** Es la tinta de todo el texto (`body { color: var(--navy) }`) y el color de casi todos los bordes (186 declaraciones). También es la sombra dura, que 42 reglas escriben como `Npx Npx 0 var(--navy)` sin pasar por `--shadow-*`. Y es el fondo de los bloques invertidos (32 reglas con fondo navy y texto marfil o dorado). En oscuro la tinta tiene que ser clara y el campo de marca tiene que seguir siendo navy. Con un solo token no se puede.
2. **`--ivory` también hace dos trabajos.** Es el fondo de la página y el texto que va encima de los bloques navy.
3. **Hay unos 100 colores escritos a mano** en `notascan.css`. Los que rompen en oscuro son fondos claros pensados para una página marfil. Están en la fila al pasar el ratón (`#fbf7ef`), el ítem del menú al pasar el ratón (`rgba(255,253,248,.8)`), el aviso sin leer (`#fffaf0`) y el diálogo (`rgba(255,253,248,.9)`). Se suman la flecha del selector (`#1b2a4a`) y 18 textos `#d9cfbd` hechos para ir sobre navy.
4. **El dorado lleva tinta navy encima en 55 reglas.** Si la tinta pasa a marfil, el texto de «Calificar», «Confirmar» o la cabecera de las tablas queda marfil sobre dorado a 1.9:1. Esto lo encontró la medición y no la vista (sección 8).

Consecuencia para la implementación. Ninguna dirección se resuelve solo con cambiar los valores de `tokens.css` bajo `[data-theme="dark"]`. Todas necesitan además una capa de parches, que en las maquetas se genera leyendo `notascan.css`, así que no hay que escribirla a mano. La técnica es volver a declarar los tokens dentro de cada contenedor invertido (por ejemplo `--navy` e `--ivory` dentro de `.ns-block--navy`). Así esa misma regla del sistema, que no se edita, pinta el campo con los valores nuevos.

## 4. Referentes

Formato de cada uno: observación → decisión aplicable → límite que no se copia. Las imágenes están en `docs/ux/anexos/ref/`.

### styles.refero.design
URL: https://styles.refero.design/style/3b6a17f0-3bdf-418c-a95e-0b89e5a8b2f8 (Raycast) · captura `ref/2026-11-08-refero-raycast.png`

Raycast separa sus superficies con escalones casi invisibles (`#040506` página, `#07080a` tarjeta, `#111214` hundido) y define los componentes con borde fino más que con sombra. El color de acento sale solo en logo, IA y llamada principal → en las tres direcciones la tarjeta es apenas más clara que la página (contraste 1.09 a 1.10 entre `--paper` e `--ivory`). El borde de 2 px hace el trabajo de separar, y el dorado queda solo para acción, activo y la marca de la cabecera → no se copia el negro casi puro ni el gris neutro de Raycast. NotaScan es cálido y escolar, y un negro de herramienta de programador lo vuelve otra marca.

### motionsites.ai
URL: https://motionsites.ai/ (galería, filtro «Dashboards» del menú, que no tiene URL propia) · captura `ref/2026-11-08-motionsites-dashboards.png`

Las dos piezas de la galería que se leen como «de noche y cómodas» son «Reading Library» y «ADHD Planner». Usan fondos pardos y oliva muy oscuros con texto crema, sin azul ni negro neutro → de ahí sale la dirección C (fondo sepia `#1a1713`, tinta marfil atenuada `#ddd3c1`) → no se copia su fotografía de fondo ni su movimiento de entrada. NotaScan es una herramienta que se usa cien veces al día.

### Pinterest
URL: https://co.pinterest.com/search/pins/?q=warm%20dark%20mode%20dashboard%20ui%20navy · captura `ref/2026-11-08-pinterest-dark-dashboards.jpg`

La búsqueda «warm dark mode dashboard ui navy» devuelve casi solo paneles azul medianoche con resplandores, degradados violeta y anillos que brillan. Es justo el oscuro de fábrica → se usa como antirreferente. Ninguna dirección lleva brillo, degradado ni azul saturado, y el navy aparece solo como el navy de marca → no hay nada que tomar en positivo. Una segunda búsqueda («neobrutalism dark mode ui») cargó, pero el navegador no pudo tomar la captura (tiempo agotado tres veces, 2026-11-08). Solo se leyeron los títulos, así que no cuenta como referente.

### ui.aceternity.com
URL: https://ui.aceternity.com/components/sidebar · capturas `ref/2026-11-08-aceternity-sidebar-dark.png` y `ref/2026-11-08-aceternity-sidebar-light.png`

Se midió su botón «Toggle theme» con Playwright. El fondo pasa de `rgb(0,0,0)` a `rgb(255,255,255)` en el primer muestreo (0 ms) y no cambia durante 380 ms, así que el tema cambia sin fundido. Además fija `color-scheme: dark` en `<html>` → el selector de NotaScan cambia el tema en el acto y declara `color-scheme` en cada tema. Así las barras de desplazamiento y los controles nativos de WebView2 y WKWebView siguen el tema → no se copia su estética negra con bordes blancos al 10 %.

### Emil Kowalski, *You don't need animations*
URL: https://emilkowal.ski/ui/you-dont-need-animations · captura `ref/2026-11-08-emil-no-animations.png`

Dice que lo que se usa muchas veces al día no se anima, y que las acciones que salen del teclado nunca se animan. El artículo no habla de temas → el cambio de tema no lleva animación de color. Eso además lo exige C6 del contrato (solo `transform` y `opacity`). Lo único que se mueve es el indicador del control segmentado, que ya existe en el sistema, y se apaga con `prefers-reduced-motion` → no se toma de Kowalski ninguna técnica de animación, solo el criterio de cuándo no animar.

Complemento técnico, fuera de las seis fuentes. Paco Coursey (https://paco.me/writing/disable-theme-transitions) describe cómo cortar las transiciones al cambiar el tema. Se inyecta `* { transition: none !important }`, se cambia el atributo, se fuerza un cálculo de estilo y se quita la regla. NotaScan lo necesita porque `.ns-btn` y `.ns-titlebar-btn` tienen `transition: background-color`, y sin eso los botones harían un fundido de 120 ms al cambiar de tema.

### Taste Skill (tasteskill.dev, skill local `design-taste-frontend`)
Fuente: `~/.claude/skills/design-taste-frontend/SKILL.md`, §4.11 «Page Theme Lock» y §8 «Dark Mode Protocol»

Pide que una página oscura no tenga secciones claras metidas en medio, que el color de marca siga reconocible y que no haya negro ni blanco puros → es la razón medible contra la dirección A. Sus bloques invertidos se vuelven hojas marfil dentro de una página oscura, y el 18 % de la vista del panel docente queda clara frente al 4 % de B y C. Por la misma regla ninguna dirección usa `#000` ni `#fff` → no se adopta su recomendación de `zinc-950` ni de Tailwind `dark:`. NotaScan usa tokens CSS y su propia paleta.

### mobbin.com
No accesible el 2026-11-08. En Chrome no hay sesión iniciada y la búsqueda redirige a la portada sin resultados (`ref/2026-11-08-mobbin-sin-sesion.jpg`). No se usó.

Cuenta de fuentes con algo que aportar sobre el oscuro de una herramienta de trabajo. Son seis: Refero, MotionSites, Pinterest (como antirreferente), Aceternity, Kowalski y Taste. Mobbin no cuenta.

### Precedente de método (no de paleta)
`C:\dev\siscan\docs\ux\anexos\2026-10-12-invernadero-y-tema-por-hora.md` existe y se tomó solo como antecedente de que el oscuro se mide sobre el render y se aprueba con capturas. No se usó nada de su paleta.

## 5. Design Read

```text
Registro y audiencia: producto. Docentes, secretaría y rectoría de un colegio de Nariño, 25 a 60 años, habilidad media o baja.
Escena de uso: de noche, portátil con brillo bajo, sesiones de 40 notas o más, a veces con la habitación a oscuras.
Tesis visual: el mismo cuaderno NotaScan bajo una lámpara de escritorio. Cambia la luz, no el cuaderno.
Jerarquía y decisión dominante: la cifra de la nota y su estado de confianza. Confirmar o corregir.
Materiales: Fraunces y la Inter que ya trae la app, la paleta clara llevada a la noche, borde de 2 px y sombra dura cuando la dirección la conserva, sin movimiento nuevo.
Repertorio: el borde separa, la sombra dura eleva (o desaparece en C), el dorado marca la acción, el campo navy marca lo que se continúa, el burdeos y el salvia marcan el estado.
Puntos de entrada: lectura obligada. El punto de entrada es la tarea, sin adornos añadidos.
Riesgo que se evita: el panel oscuro de fábrica de azul medianoche con brillos (antirreferente de Pinterest).
```

## 6. Tres direcciones

Las tres comparten estas reglas:

- La tinta pasa a marfil y el dorado sigue llevando tinta oscura encima.
- El papel no se oscurece. `.ns-paper` (boletín en pantalla) y `.ns-photo` (foto del examen) quedan con los tokens claros.
- Todo va dentro de `@media screen`, así que la impresión resuelve los tokens claros aunque el tema oscuro esté puesto (medido).
- `color-scheme: dark` en `<html>`.

Las tres difieren en el fondo, en qué pasa con el campo navy y en la sombra dura.

### A · Pizarra

La noche es el navy de marca. La página es navy profundo y los bloques invertidos se vuelven hojas marfil con el sistema claro adentro. La sombra dura sigue siendo del color de la tinta, igual que en claro (borde y sombra del mismo color).

| Token | Claro | Pizarra |
|---|---|---|
| `--ivory` (página) | #f7f3ec | #0f1729 |
| `--paper` (tarjeta) | #fffdf8 | #152039 |
| `--ivory-deep` | #efe8dc | #1c2843 |
| `--navy` (tinta, borde) | #1b2a4a | #ece4d4 |
| `--navy-soft` | #33425f | #b9c0cf |
| `--charcoal` | #2b2b2b | #d9d2c5 |
| `--muted` | #5b5a56 | #a9afbd |
| `--hairline` | rgba(27,42,74,.16) | rgba(236,228,212,.18) |
| `--gold` | #b8924b | #c9a35e |
| `--gold-ink` | #7a5f2c | #dcbf86 |
| `--gold-soft` | #f3e8d2 | #33301f |
| `--sage` | #6b8f71 | #83a889 |
| `--sage-ink` | #3f6346 | #aed0b2 |
| `--sage-soft` | #e1eadf | #1b2e2c |
| `--burgundy` | #7a2e2e | #e38a80 |
| `--burgundy-soft` | #f3e1dd | #3a2128 |
| `--focus` | #1b2a4a | #dcbf86 |
| `--shadow-md` | 4px 4px 0 #1b2a4a | 4px 4px 0 #ece4d4 |
| Campo invertido | navy #1b2a4a | hoja marfil #ece4d4 con tokens claros dentro |

Capturas: `docs/ux/capturas/2026-11-08-oscuro-pizarra-login.png`, `…-pizarra-panel-docente.png`, `…-pizarra-revision.png`, `…-pizarra-tarjeta.png`, `…-pizarra-panel-rectoria.png`, `…-pizarra-panel-secretaria.png`, `…-pizarra-foco.png`.

Riesgos que gasta: color como campo (página navy entera), contraste de escala de la cifra que ya trae el sistema.

A favor. Es la más fiel al claro y la más reconocible como NotaScan. Ninguna regla de sombra necesita parche.

En contra. Las hojas marfil dejan claro el 18 % de la vista del panel docente y el 39 % del login, contra el 4 % y el 2 % de B y C. Es lo que Taste prohíbe (secciones claras en una página oscura) y lo que más cansa de noche. Además, la hoja del login vuelve marfil todo el formulario. Y necesita más parches a mano que las otras (229 líneas de hoja contra 182), porque dentro de cada hoja hay que reconstruir el tema claro.

### B · Campo marino (recomendada)

La noche es carbón cálido y el navy de marca sobrevive como campo. La página sale del carbón `#2b2b2b` oscurecido y la tinta es marfil. Los bloques invertidos («Continúa donde quedaste», el ítem activo del menú, el panel del login, la cifra «Promedio institucional») siguen siendo navy, levantado a `#22345c` para despegarse del carbón. La sombra dura deja de ser tinta y pasa a ser una repisa navy `#34497a`, el mismo gesto del claro.

| Token | Claro | Campo marino |
|---|---|---|
| `--ivory` (página) | #f7f3ec | #161513 |
| `--paper` (tarjeta) | #fffdf8 | #1f1e1b |
| `--ivory-deep` | #efe8dc | #2a2824 |
| `--navy` (tinta, borde) | #1b2a4a | #ece4d4 |
| `--navy-soft` | #33425f | #bdb5a6 |
| `--charcoal` | #2b2b2b | #d6cfc2 |
| `--muted` | #5b5a56 | #a8a194 |
| `--hairline` | rgba(27,42,74,.16) | rgba(236,228,212,.16) |
| `--gold` | #b8924b | #c9a35e |
| `--gold-ink` | #7a5f2c | #dcbf86 |
| `--gold-soft` | #f3e8d2 | #342c1e |
| `--sage` | #6b8f71 | #83a889 |
| `--sage-ink` | #3f6346 | #aed0b2 |
| `--sage-soft` | #e1eadf | #1e2a21 |
| `--burgundy` | #7a2e2e | #e38a80 |
| `--burgundy-soft` | #f3e1dd | #36211e |
| `--focus` | #1b2a4a | #dcbf86 |
| `--shadow-md` | 4px 4px 0 #1b2a4a | 4px 4px 0 #34497a |
| Campo invertido | navy #1b2a4a, texto #f7f3ec | navy #22345c, texto #f1eadc, `--muted` #c9c1b2 |
| Tinta sobre dorado | #1b2a4a | #161513 |

Capturas: `docs/ux/capturas/2026-11-08-oscuro-campo-marino-login.png`, `…-campo-marino-panel-docente.png`, `…-campo-marino-revision.png`, `…-campo-marino-tarjeta.png`, `…-campo-marino-panel-rectoria.png`, `…-campo-marino-panel-secretaria.png`, `…-campo-marino-foco.png`.

Riesgos que gasta: color como campo (el navy de marca en bloques grandes sobre carbón), superposición (repisa navy desplazada bajo cada tarjeta), contraste de escala de la cifra.

### C · Lámpara baja

La noche más tenue posible. El fondo es sepia y la tinta es marfil atenuado `#ddd3c1`, que es casi el `#d9cfbd` que el propio sistema usa para texto secundario sobre navy. Desaparecen todas las sombras neutras y la elevación queda solo en el escalón de superficie. Las únicas repisas que quedan son las de estado (burdeos en «requiere revisión», dorado, salvia), que así ganan significado.

| Token | Claro | Lámpara baja |
|---|---|---|
| `--ivory` (página) | #f7f3ec | #1a1713 |
| `--paper` (tarjeta) | #fffdf8 | #221f1a |
| `--ivory-deep` | #efe8dc | #2d2923 |
| `--navy` (tinta, borde) | #1b2a4a | #ddd3c1 |
| `--navy-soft` | #33425f | #b3aa9a |
| `--charcoal` | #2b2b2b | #cfc6b6 |
| `--muted` | #5b5a56 | #a0978a |
| `--hairline` | rgba(27,42,74,.16) | rgba(221,211,193,.14) |
| `--gold` | #b8924b | #b8924b (sin cambio) |
| `--gold-ink` | #7a5f2c | #d3b176 |
| `--gold-soft` | #f3e8d2 | #30281a |
| `--sage` | #6b8f71 | #7a9e80 |
| `--sage-ink` | #3f6346 | #a3c2a8 |
| `--sage-soft` | #e1eadf | #20271f |
| `--burgundy` | #7a2e2e | #d4827a |
| `--burgundy-soft` | #f3e1dd | #311e1b |
| `--focus` | #1b2a4a | #d3b176 |
| `--shadow-md` | 4px 4px 0 #1b2a4a | ninguna |
| Campo invertido | navy #1b2a4a | navy apagado #232c3e, texto #e6dccb |
| Tinta sobre dorado | #1b2a4a | #1a1713 |

Capturas: `docs/ux/capturas/2026-11-08-oscuro-lampara-login.png`, `…-lampara-panel-docente.png`, `…-lampara-revision.png`, `…-lampara-tarjeta.png`, `…-lampara-panel-rectoria.png`, `…-lampara-panel-secretaria.png`, `…-lampara-foco.png`.

Riesgos que gasta: color como campo (sepia entero), asimetría de elevación (solo los estados tienen repisa).

En contra. Quitar la sombra dura le quita a NotaScan su gesto más reconocible. Puesta al lado de B, la tarjeta de nota se lee más plana. Su `--muted` es el más justo de las tres (5.70:1 sobre tarjeta, pasa AA con poco margen).

### La recomendada es B · Campo marino

1. Es la que mejor cumple «se deriva del sistema, no es otra marca». El navy sigue siendo navy y no se vuelve tinta ni hoja. La sombra dura sigue siendo navy, como en claro.
2. Respeta la regla de Taste de no meter secciones claras. La superficie clara medida es del 2 % al 6 % según la pantalla, contra el 12 % a 39 % de A.
3. La cifra de la nota da 13.19:1 en las tarjetas pendientes y en revisión y 11.80:1 en la verificada. Las cifras de rectoría y secretaría dan 10.24:1. Todas superan AAA.
4. El carbón neutro deja que el salvia, el dorado y el burdeos de los estados se lean como en claro. Sobre el navy de A el salvia y el dorado se enfrían.
5. Su costo es la capa de parches (32 campos, 55 dorados, 42 repisas, más literales). Se genera desde `notascan.css` y no se escribe a mano.

C es la alternativa si Diego prioriza el cansancio visual por encima de la identidad. A solo tiene sentido si se quiere el oscuro más parecido al claro, aceptando el deslumbramiento.

Elige Diego. No se implementa nada hasta que lo haga.

## 7. Selector de tema

Decisión de Diego del 2026-11-08, que este anexo no cambia. El tema y el idioma viven juntos en un botón «Preferencias» en el pie de la barra lateral (`.ns-sidebar-user`, junto al nombre y a «Cerrar sesión»). Abre el `Drawer` del sistema con dos grupos, Tema e Idioma. El idioma lo resuelve el anexo `2026-11-08-idiomas.md`.

Grupo Tema dentro de Preferencias:

- **Control.** El control segmentado del sistema (`.ns-seg` con `.ns-seg-tab`, `role="radiogroup"`), con tres opciones en este orden: «Claro», «Oscuro», «Como el sistema». Cada opción lleva icono del set `Icon` del sistema (sol, luna, pantalla) y la palabra. No hay interruptor de dos estados porque la tercera opción no cabe en un interruptor.
- **Ayuda.** Debajo, una línea en `--muted`, «Como el sistema sigue el modo claro u oscuro que tengas en Windows o macOS.»
- **Teclado.** Las flechas mueven la selección dentro del grupo y el cambio se aplica al instante. No hace falta un botón «Guardar», porque el tema se ve en el momento y se deshace con otra flecha.
- **Login.** Sin selector de tema. Usa lo último guardado en el dispositivo y, si no hay nada, «Como el sistema».

Cómo se guarda:

- **Dónde.** `localStorage`, clave `notascan.theme`, valores `light`, `dark` o `system`. Se guarda en el dispositivo y no en la cuenta, así que un docente que usa el portátil del colegio y el de su casa elige en cada uno.
- **Cuándo se aplica.** Antes de que React pinte, con un script de cinco líneas en `index.html` que lee la clave y pone `data-theme` en `<html>`. Si no, la app abriría en claro y saltaría a oscuro (el destello que menciona la búsqueda sobre selectores de tema).
- **Como el sistema.** `matchMedia("(prefers-color-scheme: dark)")` con un oyente `change`, para que la app cambie sola cuando Windows o macOS pasan a modo oscuro al atardecer.
- **Barra de título.** Usa los mismos tokens (`--paper`, `--ivory-deep`, `--muted`, `--navy`, `--burgundy`), así que cambia con el tema sin código aparte. En macOS, Tauri tiene `setTheme` para que los tres botones nativos sigan el tema. Queda como pendiente de prueba en el Mac, porque no se pudo medir aquí.

Movimiento al cambiar de tema:

- **Sin fundido de color.** Animar `background-color` o `color` viola C6 (solo `transform` y `opacity`).
- **Cortar las transiciones del cambio.** `.ns-btn` y `.ns-titlebar-btn` ya traen `transition: background-color`, que haría un fundido de 120 ms. Se usa la técnica de Coursey, que inyecta `* { transition: none !important }`, cambia `data-theme`, lee un estilo calculado y quita la regla.
- **El indicador.** Lo único que se mueve es el indicador del control segmentado, con `transform`, y se apaga con `prefers-reduced-motion`.

## 8. Verificación medida

Script `scripts/verify-dark-directions.mjs`. Corre sobre el build de demostración (`npm run build:demo`) con `vite preview` en el puerto 4173 (`startPreview` de `scripts/harness.mjs`). Inyecta la hoja de cada dirección con Playwright y pone `data-theme="dark"`. No toca `src/`. Genera las hojas en `docs/ux/maquetas/2026-11-08-oscuro-<dirección>.css` y el informe en `verify-out/2026-11-08-oscuro-mediciones.md`. Ventana de 1440×900, `reducedMotion: "reduce"` para que la cifra quede en su valor final. La barra de título es una réplica estática del marcado de `TitleBar.tsx` con `.ns-in-desktop` en `<html>`, porque en el navegador la barra no existe.

Métodos:

- **Texto suelto.** `sampleTextContrast` sobre los píxeles del render.
- **Controles.** Para botones, insignias, ítems del menú y números de tarjeta se usa el color calculado contra el fondo opaco del propio elemento. En la primera pasada `sampleTextContrast` tomaba la esquina redondeada del botón (el color de la página) como el píxel de más contraste y daba 7.7:1 a un «Calificar» que en realidad estaba marfil sobre dorado a 1.9:1. Ese fallo era del comprobador y ocultaba uno del diseño. Los dos se corrigieron.
- **Bordes y foco.** Color calculado contra el primer fondo opaco detrás del elemento, con mínimo de 3:1. El foco se mide después de Tab y Shift+Tab sobre el primer ítem del menú.

Resultado final: claro 53/53, Pizarra 54/54, Campo marino 54/54, Lámpara baja 54/54. Consola sin errores ni avisos en las 20 cargas.

| Medición | Mínimo | Claro | A Pizarra | B Campo marino | C Lámpara |
|---|---|---|---|---|---|
| Login · titular «¡Hola!» | 4.5 | 12.86 | 11.25 | 10.24 | 10.30 |
| Login · bienvenida | 4.5 | 9.22 | 5.46 | 7.94 | 9.07 |
| Login · botón Entrar | 4.5 | 4.91 | 4.91 | 5.18 | 4.83 |
| Login · enlace «¿Olvidaste…?» | 4.5 | 4.91 | 4.75 | 5.18 | 4.83 |
| Login · la ola tiene el color del panel | sí | sí | sí | sí | sí |
| Barra de título · marca | 4.5 | 13.99 | 12.80 | 13.19 | 11.07 |
| Barra de título · icono | 3 | 3.04 | 4.20 | 4.29 | 3.81 |
| Panel docente · titular | 4.5 | 12.88 | 14.14 | 14.44 | 12.04 |
| Panel docente · descripción | 4.5 | 12.80 | 11.89 | 11.79 | 10.55 |
| Bloque invertido · título | 4.5 | 12.86 | 11.25 | 10.24 | 10.30 |
| Bloque invertido · meta (era #d9cfbd) | 4.5 | 9.22 | 5.46 | 7.94 | 9.07 |
| Botón primario «Calificar» | 4.5 | 4.91 | 7.56 | 7.72 | 6.17 |
| Botón dorado dentro del bloque invertido | 4.5 | 4.91 | 6.17 | 7.72 | 6.17 |
| Botón secundario | 4.5 | 13.99 | 12.80 | 13.19 | 11.07 |
| Menú · ítem activo | 4.5 | 12.86 | 11.25 | 10.24 | 10.30 |
| Menú · número «01» del activo | 4.5 | 4.91 | 4.75 | 5.18 | 4.83 |
| Enlace «Ver todas» | 4.5 | 13.99 | 12.80 | 13.19 | 11.07 |
| Texto `--muted` | 4.5 | 6.79 | 7.36 | 6.50 | 5.70 |
| Cifra «8 notas por verificar» | 7 | 11.70 | 10.49 | 10.89 | 9.81 |
| Borde de tarjeta | 3 | 12.86 | 14.14 | 14.44 | 12.04 |
| Borde del buscador | 3 | 12.86 | 14.14 | 14.44 | 12.04 |
| Foco visible | 3 | 13.99 | 9.12 | 9.40 | 8.07 |
| **Cifra de nota · verificada** | **7** | 11.69 | 11.27 | 11.80 | 10.33 |
| **Cifra de nota · requiere revisión** | **7** | 13.99 | 12.80 | 13.19 | 11.07 |
| **Cifra de nota · pendiente (3 tarjetas)** | **7** | 14.18 | 12.80 | 13.19 | 11.07 |
| Rótulo «Calificación detectada» | 4.5 | 6.79 | 7.36 | 6.50 | 5.70 |
| Cinta «Principio» · rótulo dorado | 4.5 | 4.91 | 7.56 | 7.72 | 6.17 |
| Nº de tarjeta · requiere revisión | 4.5 | 8.41 | 8.41 | 7.14 | 6.19 |
| Botón «Confirmar» de la tarjeta | 4.5 | 4.91 | 7.56 | 7.72 | 6.17 |
| Insignia IA · alta | 4.5 | 5.52 | 8.46 | 8.85 | 7.90 |
| Insignia IA · media | 4.5 | 4.94 | 7.48 | 7.76 | 7.15 |
| Insignia IA · baja | 4.5 | 7.36 | 5.75 | 5.90 | 5.46 |
| Nivel de confianza · baja | 4.5 | 9.15 | 6.33 | 6.52 | 5.69 |
| Confianza con icono y palabra (16 elementos) | sí | sí | sí | sí | sí |
| Cifra KPI rectoría y secretaría | 7 | 12.86 | 11.25 | 10.24 | 10.30 |
| Impresión con tema oscuro puesto da `--navy` #1b2a4a | sí | n/a | sí | sí | sí |

La tabla completa, con el color de cada muestra, está en `verify-out/2026-11-08-oscuro-mediciones.md`.

La tabla siguiente mide la superficie clara, como porcentaje de píxeles con luminancia relativa mayor que 0.5 en la vista de 1440×900.

| Pantalla | Claro | A | B | C |
|---|---|---|---|---|
| Login | 51.2 % | 39.3 % | 2.3 % | 2.2 % |
| Panel docente | 77.3 % | 18.4 % | 4.3 % | 4.0 % |
| Revisión | 82.3 % | 12.8 % | 5.6 % | 5.0 % |
| Panel rectoría | 73.1 % | 22.0 % | 4.1 % | 3.7 % |
| Panel secretaría | 83.0 % | 11.7 % | 5.2 % | 4.8 % |

Fallos encontrados y corregidos en las maquetas durante la medición, todos propios:

1. Marfil sobre dorado en «Calificar», «Confirmar» y la cabecera de tablas (1.9:1). Lo resuelve el parche DORADOS.
2. En A, el título del bloque invertido quedó marfil sobre marfil (1.01:1) y el foco del ítem activo navy sobre carbón (1.14:1). Se rehízo el alcance de la hoja.
3. El parche de dorados alcanzaba al ítem activo del menú, que el sistema repinta de navy más abajo (1.49:1). El generador ahora mira el último fondo de cada selector.
4. Con ese mismo error la cinta «Principio», que el sistema repinta de papel, salía como campo navy y su texto quedaba casi invisible. Se vio en la captura de B, después se midió y se corrigió.
5. La ola del login quedó marfil junto a un panel navy en B y C. Se le dio el campo navy y ahora se mide que tenga el mismo color que el panel.

Un hallazgo del modo claro actual que no se toca. El icono de la barra de título mide 3.04:1, en el límite del mínimo para elementos que no son texto.

Comparativa. En `docs/ux/anexos/ref/2026-11-08-comparativa.png` están las tres direcciones mezcladas con Raycast, la galería de Pinterest y MotionSites, sin rótulos. Las tres de NotaScan no se confunden con el panel de fábrica de Pinterest, porque tienen serif, borde de 2 px y sombra dura. Junto a Raycast se ven más densas, lo cual cuadra con una herramienta de verificación. Diego tiene que juzgarla. No se da por buena desde aquí.

Pendiente, no medido:

- Planilla, tablas largas, filas al pasar el ratón, `Drawer`, `Modal`, avisos (toasts), estados vacío, error y sin conexión, gráficas de Analítica (colores de serie) y el perfil del estudiante. Los parches cubren esas reglas, pero no se capturaron ni se midieron.
- Anchos de 1024 y 1366 px. Solo se midió 1440.
- La barra de título real dentro de Tauri (WebView2, WebKitGTK y WKWebView) y los botones nativos de macOS en oscuro.
- La ilustración del login. La hoja del examen dibujada pasa a oscura en las tres direcciones. Falta decidir si sigue la regla «el papel no se oscurece», lo que subiría la superficie clara del login.
- Recorrido completo por teclado en oscuro. Solo se midió el foco del menú.

## 9. Descartes

- **Negro casi puro al estilo Raycast.** Es frío y de programador, y Taste pide evitar el negro puro.
- **Azul medianoche con brillos y degradados.** Es el oscuro de fábrica que muestra Pinterest.
- **Invertir la paleta con `filter: invert()`.** Rompe las fotos de los exámenes y el dorado.
- **Interruptor claro u oscuro de dos estados.** No cabe «Como el sistema».
- **Fundido de color al cambiar de tema.** Viola C6 y Kowalski desaconseja animar acciones repetidas.
- **Un token nuevo tipo `--surface` o `--text-primary` como el que propone Taste.** Obligaría a reescribir `notascan.css`, que el contrato C1 prohíbe tocar. La técnica de volver a declarar los tokens dentro de cada contenedor logra lo mismo sin editarlo.
- **Boletín en oscuro.** Es un documento y se imprime en claro.

## 10. Legal

Línea para la política de tratamiento de datos (`docs/legal/`), en la sección de lo que se guarda en el dispositivo:

> «La preferencia de tema (claro, oscuro o como el sistema) se guarda solo en este dispositivo. No identifica a la persona, no se envía a NotaScan ni a terceros y se borra al borrar los datos de la aplicación.»

No es una cookie ni rastreo, no necesita consentimiento y no cambia la versión de la política por sí sola. Es un borrador técnico y lo revisa un abogado antes de publicarse para terceros.

## 11. Contrato de diseño (B · Campo marino, elegida por Diego el 2026-11-08)

Diego eligió la dirección B el 2026-11-08. Desde esa fecha este contrato manda sobre la implementación. Nada de color, tipografía, espaciado o efecto fuera de lo que dice. Si algo no funciona al implementarlo, se para y se dice con la alternativa concreta. Enmendarlo exige permiso de Diego y queda fechado aquí.

Los valores son los de la tabla de B en la sección 6. La maqueta medida, `docs/ux/maquetas/2026-11-08-oscuro-campo-marino.css`, trae además ocho tokens y un valor del campo invertido que esa tabla no lista. También entran en el contrato y son estos.

| Token | Claro | Campo marino |
|---|---|---|
| `--glass` | rgba(255,253,248,.64) | rgba(31,30,27,.78) |
| `--glass-edge` | rgba(255,255,255,.72) | rgba(236,228,212,.10) |
| `--scrim` | rgba(27,42,74,.28) | rgba(8,8,7,.62) |
| `--shadow-sm` y `--shadow-lg` | 2px y 6px, #1b2a4a | 2px y 6px, #34497a |
| `--shadow-gold` | 3px 3px 0 #b8924b | 3px 3px 0 #c9a35e |
| `--shadow-pressed` | 0 0 0 #1b2a4a | 0 0 0 #34497a |
| `--shadow-glass` | inset claro y difusa navy al 10 % | 0 10px 30px rgba(0,0,0,.4) |
| Campo invertido · `--hairline` | rgba(27,42,74,.16) | rgba(241,234,220,.22) |

- **O1 · Tokens.** Bloque `:root[data-theme="dark"]` con los mismos nombres de `tokens.css` y los valores de B, dentro de `@media screen`, con `color-scheme: dark`. Se añade a `tokens.json` como tema `dark` («Campo marino»). `tokens.css` sigue siendo copia del sistema y el bloque oscuro va en un archivo aparte, `src/styles/theme-dark.css`, cargado después de `amendments.css`.
- **O2 · Parches.** `theme-dark.css` incluye la capa generada por `scripts/generar-tema-oscuro.mjs` desde `notascan.css` (campos, dorados, repisas, literales y papel). No se escribe a mano. `notascan.css` no se edita. Cada grupo de parches lleva su comentario con lo que corrige, como en `amendments.css`.
- **O3 · Campo navy.** Los bloques invertidos conservan el navy de marca como campo, levantado a `#22345c`, con texto `#f1eadc` y `--muted` `#c9c1b2`. Se logra volviendo a declarar `--navy`, `--ivory`, `--muted` y `--hairline` dentro de cada bloque. La sombra dura pasa a ser una repisa navy `#34497a`.
- **O4 · Dorado.** Todo relleno dorado lleva tinta oscura encima. El dorado como texto solo va en su variante `--gold-ink`.
- **O5 · Papel.** Boletín, reportes y foto del examen en claro, en pantalla y al imprimir.
- **O6 · Cifras.** La nota y las cifras de decisión a 7:1 o más, medidas sobre el render en cada paso.
- **O7 · Movimiento.** El cambio de tema es instantáneo y sin transición de color. Solo se mueve el indicador del control segmentado, con `transform`, y se apaga con `prefers-reduced-motion`.
- **O8 · Selector.** En Preferencias (pie de la barra lateral), grupo Tema con «Claro · Oscuro · Como el sistema». Se guarda en `localStorage` con la clave `notascan.theme` y se aplica antes del primer pintado.
- **Fuera de alcance.** Modo oscuro de la app móvil Flutter, oscuro en impresión y temas de color adicionales.

Enmiendas del contrato:

- **2026-11-08 · O2, aprobada por Diego.** El generador lee también `amendments.css`, que se carga después de `notascan.css`. Si una enmienda repinta el fondo o la sombra de un selector, el parche sigue a la enmienda. Motivo: la nota solicitada de rectoría (`.ns-change-big .is-new`) perdía en oscuro la repisa dorada que le dio la enmienda de octubre (fallo 2 de la sección 12).
- **2026-11-08 · Forma del segmentado de Tema, aprobada por Diego.** Tres columnas iguales con el icono arriba y la palabra abajo, que puede partirse en dos líneas, y 56 px de alto. El contenedor usa `--radius-lg` y las opciones y el indicador `--radius-md`, en vez de la píldora de `.ns-seg` (decisión 1 de la sección 13).
- **2026-11-08 · Iconos sol, luna y pantalla, aprobada por Diego.** Se suman a `icons.ts` con la retícula de 24 y el trazo 2 del set (decisión 2 de la sección 13).
- **2026-11-08 · Lienzo previo en `index.html`, aprobada por Diego.** `#161513` escrito en `index.html` para el primer pintado en oscuro, antes de que carguen los tokens (decisión 3 de la sección 13).
- **2026-11-08 · `--burgundy` oscuro pasa a `#eea49a`, aprobada por Diego (decisión 1 del paso 4).** Con `#e38a80` las notas bajas de la Planilla daban 6.52:1 sobre papel y 5.75:1 en la fila marcada, por debajo de O6. Con `#eea49a` dan 8.27:1 sobre papel, 7.29:1 en la fila marcada, 9.05:1 sobre la página y 7.47:1 sobre `--burgundy-soft`. Los rellenos burdeos con tinta oscura ganan contraste.
- **2026-11-08 · Borde de los controles con estado sobre campo navy, aprobada por Diego (decisión 2 del paso 4).** El ítem activo del menú, los chips marcados, el periodo elegido, los pesos de evaluación, la casilla marcada y la bandeja de rectoría llevan borde de 2 px en la tinta `#ece4d4`. Los bloques grandes (hero, panel del login, KPI y paneles principales, marca, sellos, barra invertida y escudo) no cambian, porque los separan la repisa y el texto y no son controles.
- **2026-11-08 · Separación entre series de las gráficas, se queda como está (decisión 3 del paso 4).** En oscuro la serie navy pasa a marfil y la separación entre series baja (de 4.91:1 a 1.87:1 entre barras, de 2.37:1 a 1.40:1 entre líneas). Las series se distinguen por el tono, la línea de meta, el trazo punteado de 2025 y la leyenda, y en claro ya pasa lo mismo entre salvia y dorado (1.25:1).
- **2026-11-08 · La ilustración del login pasa al paso 5 (decisión 4 del paso 4).**

Plan de implementación una vez elegida la dirección, un paso por vez y con visto bueno en cada uno:

1. Tokens y parches en `theme-dark.css`, con `verify:dark` sobre las mismas pantallas de este anexo.
2. Selector en Preferencias con guardado y script previo al pintado.
3. Barra de título en los tres sistemas.
4. Resto de pantallas (Planilla, tablas, `Drawer`, `Modal`, gráficas).
5. Estados (vacío, error, sin conexión, carga, sin permiso, dato viejo).

## 12. Paso 1 · Tokens y parches

Hecho el 2026-11-08 en la rama `feature/modo-oscuro`. Lo respaldan las cláusulas O1, O2, O3, O4 y O5 del contrato. Todavía no hay selector, que es el paso 2. Para medir, Playwright pone `data-theme="dark"` en `<html>` antes del primer pintado.

### Qué se hizo

- **`src/styles/theme-dark.css`** (O1 y O2). Bloque `:root[data-theme="dark"]` con los 26 tokens de B y `color-scheme: dark`, más la capa de parches. Todo va dentro de `@media screen`. Cada grupo lleva su comentario con lo que corrige y la cabecera avisa que el archivo es generado y que no se edita a mano.
- **`scripts/generar-tema-oscuro.mjs`** (O2). Lee `notascan.css` y escribe `theme-dark.css`. Se corre con `npm run tema:oscuro`. Con `--check` falla si el archivo no coincide con lo generado. La lógica es la de la maqueta de B. `scripts/verify-dark-directions.mjs` queda intacto como registro de la investigación.
- **`src/main.tsx`**. Importa `theme-dark.css` al final, después de `index.css` (que trae `amendments.css`) y de las demás hojas.
- **`src/styles/tokens.json`**. Nuevo tema `dark` («Campo marino») en `color.themes`, con los valores, el campo navy, la tinta sobre dorado y la repisa. La lista `color.tokens` no cambia, así que `verify:tokens` sigue comparando el claro.
- **`scripts/harness.mjs` y `scripts/verify-tokens.mjs`**. `theme-dark.css` se suma a los archivos del sistema junto a `tokens.css` y `notascan.css`. Sin esto, la comprobación de colores a mano de siete verificaciones contaría cada renglón del tema como un literal fuera del sistema. A cambio, `verify:dark` comprueba que todo color de `theme-dark.css` sale del contrato o del propio `notascan.css`.
- **`scripts/verify-dark.mjs`** (`npm run verify:dark`). La medición de este paso, descrita abajo.
- `notascan.css` y `tokens.css` no se tocaron. `verify:dark` lo comprueba contra `HEAD`.

El generador produce estas capas.

| Grupo | Reglas | Qué corrige |
|---|---|---|
| Tokens | 1 bloque, 26 tokens | Valores de B con los nombres de `tokens.css` |
| Campos | 34 | Bloques invertidos que conservan el navy de marca (O3), la ola del login y el Nº de la tarjeta en revisión |
| Dorados | 56 | Tinta `#161513` sobre todo relleno dorado (O4) |
| Repisas | 42 | Sombras duras escritas con `var(--navy)` que pasan a `#34497a` |
| Literales | 8 | Fondos claros a mano (filas y menú al pasar el ratón, aviso sin leer, diálogo, esqueleto, flecha del selector, trama del lienzo) |
| Papel | 1 | Boletín y foto del examen con los tokens claros (O5) |

El resultado es la misma hoja que se midió en la maqueta de B. Comparadas línea por línea, solo cambian los saltos de línea.

### Regresión en claro

Corrida sobre `npm run build:demo` con el tema cargado y sin `data-theme`.

| Verificación | Línea base | Ahora |
|---|---|---|
| `verify:shell` | 61/62 | 61/62 |
| `verify:components` | 120/121 | 120/121 |
| `verify:card` | 50/51 | 50/51 |
| `verify:teacher` | 122/123 | 122/123 |
| `verify:admin` | 104/105 | 104/105 |
| `verify:principal` | 75/76 | 75/76 |
| `verify:print` | 5/5 | 5/5 |
| `verify:states` | 98/98 | 98/98 |
| `verify:i18n` | 75/75 | 75/75 |
| `verify:tokens` | sin dato | 25/26 |

La falla que queda en las seis primeras y en `verify:tokens` es la de siempre, los colores a mano de `PhoneUpload.tsx:33` y `print.css:12`. La primera corrida de `verify:shell` dio 60/62 porque la comparación de píxeles del login contra el sistema midió 1.91 % distinto. La segunda dio 61/62 sin tocar nada. La diferencia viene de la animación de entrada del login y no del tema. Además, `verify:dark` mide que el login sin atributo y con `data-theme="light"` pintan igual píxel a píxel.

### `verify:dark`

Mismas pantallas que la sección 8 (login, panel docente, revisión, panel de rectoría y panel de secretaría), más la solicitud de cambio de nota de rectoría, el boletín y la foto del examen. Anchos de 1024 y 1440 px, con `reducedMotion: "reduce"`. La barra de título es la réplica estática de la sección 8.

Pasaron 136 de 138 comprobaciones. Consola sin errores ni avisos en 28 cargas. Las cifras dan lo mismo a 1024 y a 1440.

| Medición | Mínimo | Campo marino |
|---|---|---|
| Cifra de nota · verificada | 7 | 11.80 |
| Cifra de nota · requiere revisión y pendientes | 7 | 13.19 |
| Cifra «notas por verificar» | 7 | 10.89 |
| Cifra KPI de rectoría y secretaría | 7 | 10.24 |
| Cambio de nota · cifra actual | 7 | 11.79 |
| Cambio de nota · cifra solicitada | 7 | 13.19 |
| Titular de página | 4.5 | 14.44 |
| Descripción del encabezado | 4.5 | 11.79 |
| Texto `--muted` | 4.5 | 6.50 |
| Bloque invertido · título y meta | 4.5 | 10.24 y 7.94 |
| Botón «Calificar», «Confirmar», cinta «Principio» | 4.5 | 7.72 |
| Botón Entrar del login (tinta del campo sobre dorado) | 4.5 | 5.18 |
| Menú · número del ítem activo | 4.5 | 5.18 |
| Insignia IA baja (la más justa de los estados) | 4.5 | 5.90 |
| Nº de tarjeta en revisión | 4.5 | 7.14 |
| Barra de título · marca e icono | 4.5 y 3 | 13.19 y 4.29 |
| Bordes de tarjeta y buscador | 3 | 14.44 |
| Foco · peor de 29 paradas de Tab en el panel docente | 3 | 6.91 |

Otras comprobaciones que pasan:

- **O4.** 96 textos sobre relleno dorado en las seis pantallas y los dos anchos. El más bajo da 5.18:1 y es la tinta navy del campo (`#22345c`) en el botón Entrar y en el rol del login. Todos los demás llevan `#161513` a 7.72:1.
- **O5.** El boletín y la foto del examen resuelven `--navy` `#1b2a4a` y `color-scheme: light`, con fondo renderizado claro. Al emular impresión con el tema oscuro puesto, `--navy` vuelve a `#1b2a4a`.
- **Confianza.** Icono y palabra en todas las insignias y niveles de las tres clases.
- **Claro intacto.** Sin atributo y con `data-theme="light"` pintan igual en las cinco rutas (0 píxeles distintos) y resuelven los tokens claros.
- **Generación.** `theme-dark.css` coincide con lo que genera el script, todo color sale del contrato o de `notascan.css` y `tokens.json` tiene los mismos valores.

### Fallos encontrados

1. **Propio, en el comprobador, corregido.** En la primera corrida el script de inicio de Playwright ponía `data-theme` cuando `<html>` todavía no existía. La consola mostró el error en las 28 cargas y varias mediciones se hicieron en claro sin que el informe lo dijera. Ahora espera a que exista `<html>`, y una comprobación confirma que el tema está puesto antes de medir.
2. **Propio, en el tema, sin corregir.** La enmienda de `amendments.css` le da a la cifra solicitada del cambio de nota (`.ns-change-big .is-new`) fondo papel y repisa dorada. La capa de repisas sale de `notascan.css`, donde esa regla tiene repisa navy, y como su selector pesa más pisa la enmienda. En oscuro la cifra nueva queda con repisa `#34497a` en vez de dorada. El contraste no cambia (13.19:1), pero el valor nuevo pierde su marca. `verify:dark` lo deja como falla a 1024 y 1440. Arreglarlo cambia cómo se genera la capa (que lea también `amendments.css`, o que salte los selectores que la enmienda repinta) y eso toca O2. Queda para que Diego decida. Es el único choque entre la capa y las demás hojas, revisado selector por selector.
3. **Del modo claro, no se toca.** En claro el foco del botón «Continuar revisión» es navy sobre el bloque navy (1.00:1). En oscuro el foco es dorado `#dcbf86` y da 6.91:1 o más. Lo encontró el recorrido por teclado de este paso.
4. **Observación de maquetación, no del tema.** A 1024 px el detalle de la solicitud de rectoría deja el nombre del estudiante por fuera del borde de su tarjeta. Pasa igual en claro, porque el tema no cambia medidas.

Capturas en `verify-out/`, con `oscuro-<pantalla>-1024.png` y `oscuro-<pantalla>-1440.png` para login, panel docente, revisión, panel de rectoría, panel de secretaría y solicitudes de rectoría. Además están `oscuro-tarjeta-*`, `oscuro-foco-*` y `oscuro-papel-*`. El informe completo, con la muestra de cada medición, está en `verify-out/oscuro-mediciones.md`.

### Pendiente

- El selector, el guardado y el script previo al pintado (paso 2).
- La barra de título real en Tauri y los botones nativos de macOS (paso 3).
- Planilla, tablas largas, `Drawer`, `Modal`, avisos y gráficas (paso 4). Los parches cubren esas reglas pero no se midieron.
- Los estados (paso 5).
- La decisión sobre el fallo 2.

El siguiente paso es el 2, el selector en Preferencias. No se empieza sin el visto bueno de Diego sobre este.

Diego aprobó el paso 1 el 2026-11-08.

## 13. Paso 2 · Selector de tema en Preferencias

Hecho el 2026-11-08 en la rama `feature/modo-oscuro`, después de integrar `feature/idiomas` (Preferencias ahora es una fila propia encima de la persona). Lo respaldan la sección 7 y las cláusulas O7 y O8 del contrato. Antes se aplicó la enmienda de O2 de la sección 11.

### Enmienda de O2 aplicada

`scripts/generar-tema-oscuro.mjs` lee `notascan.css` y después `amendments.css`. Un parche de fondo o de repisa solo sale si el último valor del selector, mirando las dos hojas, sigue siendo navy o dorado. Al regenerar cambiaron cuatro reglas.

- La nota solicitada de rectoría conserva su repisa dorada en oscuro y deja de recibir tinta para dorado, porque la enmienda la pasó a papel. `verify:dark` ya no marca el fallo 2.
- `.ns-marquee--gold` deja de recibir la repisa navy de 4 px. El propio `notascan.css` la repinta más abajo con `var(--shadow-sm)`, y la primera versión del generador no lo veía. Ahora sigue el token, que en oscuro es la repisa `#34497a` de 2 px.

Quedan campos 34 (más 2 del selector, abajo), dorados 55, repisas 40, literales 8 y papel 1.

### Qué se hizo

- **`src/lib/theme.ts`.** Guarda la preferencia en `localStorage` con la clave `notascan.theme` (`light`, `dark` o `system`), pone `data-theme` en `<html>` y escucha `prefers-color-scheme` para «Como el sistema». También escucha el evento `storage`, por si hay otra ventana de la app abierta. El cambio corta todas las transiciones con la técnica de Coursey, así que no hay fundido de color.
- **`index.html`.** Un script corto en `<head>` aplica la misma regla antes del primer pintado. Un `<style>` pone el lienzo en `#161513` (el `--ivory` de B) solo en pantalla y solo con el tema oscuro, para el instante en que la hoja de estilos todavía no llegó.
- **`src/main.tsx`.** Llama a `startTheme()` al arrancar.
- **`src/components/organisms/Preferences.tsx`.** Grupo Tema encima de Idioma, con el control segmentado del sistema (`.ns-seg`) como `role="radiogroup"`. Tiene tres opciones con icono y palabra. Las flechas, Inicio y Fin cambian el tema al instante, y solo la opción marcada es parada de Tab. Debajo va la línea de ayuda en `--muted`. `PreferencesDrawer` recibe `theme={false}` desde el login, que no lleva grupo Tema.
- **`src/styles/preferences.css`.** El segmentado en tres columnas iguales. El indicador navy es lo único que se mueve, con `transform` y `--duration-base`, y queda quieto con `prefers-reduced-motion`. Solo usa tokens.
- **`src/components/atoms/icons.ts`.** Sol, luna y pantalla, que el set no traía. Están hechos con la misma retícula de 24 y trazo 2.
- **`src/i18n/es.ts`, `en.ts` y `pt.ts`.** Grupo `theme` con «Tema», «Claro», «Oscuro», «Como el sistema» y la ayuda. El español es la fuente. El inglés y el portugués son borrador y usan para «Como el sistema» la misma frase que ya tenía el grupo Idioma («Same as this computer», «Igual ao computador»).
- **`scripts/generar-tema-oscuro.mjs`.** Suma dos campos a la lista fija, el indicador y la opción marcada. En oscuro quedan como campo navy `#22345c` con texto `#f1eadc`, igual que la pestaña elegida del segmentado del sistema.
- **`scripts/verify-theme.mjs`** (`npm run verify:theme`). Es nuevo. `verify:dark` ahora pone el tema por el camino real, guardando `notascan.theme` antes de cargar.

### Decisiones que Diego tiene que mirar

1. **Forma del segmentado.** La sección 7 pide `.ns-seg`, que es una píldora de una línea. «Como el sistema» no cabe en un tercio del panel (412 px útiles) en una línea con su icono. Por eso cada opción lleva el icono arriba y la palabra abajo, que puede partirse en dos líneas, con 56 px de alto. La píldora con dos líneas se deformaba, así que el contenedor usa `--radius-lg` y las opciones y el indicador `--radius-md`, que son radios del sistema. Si Diego prefiere la píldora, la alternativa concreta es acortar la etiqueta a «Sistema» en los tres idiomas.
2. **Iconos nuevos.** El set de `notascan-ui` no traía sol, luna ni pantalla. Se agregaron con su misma construcción. Si el set de referencia los publica después, se reemplazan.
3. **Un color en `index.html`.** El lienzo previo usa `#161513` escrito, porque en ese instante los tokens todavía no cargaron. Es el valor del contrato y no está en `src/`.

### Regresión

Corrida completa sobre `npm run build:demo`, en el puerto 4173.

| Verificación | Base | Ahora |
|---|---|---|
| `verify:shell` | 61/62 | 61/62 |
| `verify:components` | 120/121 | 120/121 |
| `verify:card` | 50/51 | 50/51 |
| `verify:teacher` | 122/123 | 122/123 |
| `verify:admin` | 104/105 | 104/105 |
| `verify:principal` | 75/76 | 75/76 |
| `verify:print` | 5/5 | 5/5 |
| `verify:states` | 98/98 | 98/98 |
| `verify:i18n` | 172/172 | 172/172 |
| `verify:tokens` | 25/26 | 25/26 |
| `verify:dark` | 136/138 | 138/138 |
| `verify:theme` | nuevo | 49/49 |

La falla que queda es la de siempre, `PhoneUpload.tsx:33` y `print.css:12`. Como en el paso 1, la primera corrida de `verify:shell` dio 60/62, con el login a 1.910 % de píxeles distintos contra el sistema. La segunda corrida dio 61/62. Es la misma cifra exacta las dos veces, siempre en la primera corrida después de compilar, así que parece un estado de carga en frío de la comparación y no del tema. Queda anotado para revisarlo aparte.

### `verify:theme`

| Medición | Mínimo | Claro | Oscuro |
|---|---|---|---|
| Opción marcada sobre el indicador | 4.5 | 12.86 | 10.24 |
| Opción sin marcar | 4.5 | 13.99 | 13.19 |
| Icono dorado de la opción marcada | 3 | 4.91 | 5.18 |
| Línea de ayuda | 4.5 | 6.79 | 6.50 |
| Borde del segmentado | 3 | 13.99 | 13.19 |
| Foco de la opción (contorno de 2 px) | 3 | 13.99 | 9.40 |

Otras comprobaciones que pasan:

- **Teclado.** Siete pulsaciones (flechas en las cuatro direcciones, Inicio y Fin). Cada una marca la opción, mueve el foco, guarda en `notascan.theme` y cambia `data-theme` en el acto.
- **Guardado.** Al recargar sigue en oscuro y el panel marca «Oscuro».
- **Sin destello.** Se retuvo el JavaScript de la app y se tomó el primer pintado. En oscuro el píxel central es `#161513` con la hoja de estilos y también sin ella. En claro queda como antes.
- **Como el sistema.** Con `colorScheme: "dark"` abre en oscuro. Con la app abierta sigue al equipo cuando pasa a claro y cuando vuelve. Con «Claro» elegido el cambio del equipo no la mueve.
- **Movimiento.** En el mismo instante del cambio, el fondo de un botón ya tiene su valor final. El indicador solo tiene transición de `transform` (220 ms) y con movimiento reducido queda en 1 ms, que es la regla general de `notascan.css`.
- **Toque.** Cada opción mide 133 por 56 px, y la fila Preferencias 44 px.
- **Desborde.** En español, inglés y portugués, en claro y en oscuro, a 1024 px, nada sale del panel ni del segmentado y ningún texto se recorta.
- **Login.** Su panel trae Idioma y no Tema, y abre con lo último guardado.
- **Consola.** Limpia en las 14 pestañas. Las dos pruebas del primer pintado que cortan la hoja a propósito no cuentan, porque el navegador anota ese corte.

Las capturas están en `verify-out/`. `oscuro-preferencias-panel-1440.png` muestra el panel con Tema e Idioma sobre la app en oscuro. Además están `oscuro-preferencias-1440.png`, `claro-preferencias-1440.png` y `oscuro-preferencias-pt-1024.png`.

### Fallos propios encontrados en este paso

1. El primer intento de medir el primer pintado reteniendo la hoja de estilos no daba captura. Una hoja retenida bloquea todo el pintado, así que la prueba se rehízo reteniendo el JavaScript.
2. `verify-theme` daba por fallo la consola de las pruebas que cortan la hoja a propósito. Esas dos pestañas se excluyen de la cuenta y el motivo queda en el código.
3. Con el script de `index.html`, `<html>` ya no queda sin `data-theme`. `verify:dark` ponía el atributo a mano y el script lo pisaba, así que ahora guarda la preferencia como lo haría la persona.

### Pendiente

- Barra de título en Tauri y los botones nativos de macOS con `setTheme` (paso 3).
- Planilla, tablas, `Drawer`, `Modal` y gráficas (paso 4), y los estados (paso 5).
- La línea de la política de datos de la sección 10 todavía no está en `docs/legal/`.
- Revisión nativa de los textos en inglés y portugués.
- Las tres decisiones de arriba.

El siguiente paso es el 3, la barra de título. No se empieza sin el visto bueno de Diego sobre este.

Diego aprobó el paso 2 y sus tres decisiones el 2026-11-08. Quedaron como enmiendas fechadas en la sección 11.

## 14. Paso 3 · Barra de título en los tres sistemas

Hecho el 2026-11-08 en la rama `feature/modo-oscuro`, después de integrar `feature/idiomas` (pantallas del Docente en tres idiomas). Lo respaldan la sección 7 («Barra de título») y las cláusulas O1 y O8.

### Qué se hizo

- **Windows y Linux.** La barra propia (`TitleBar.tsx`, `.ns-titlebar` en `desktop.css`) ya usa solo tokens (`--paper`, `--ivory-deep`, `--muted`, `--navy`, `--burgundy` y `--focus`), así que pasa a oscuro sin código aparte. No se tocó `desktop.css` ni `TitleBar.tsx`. Al pasar el ratón, el botón cerrar se pinta con el `--burgundy` del tema, que en oscuro es `#e38a80` con el icono en `--paper` oscuro. Es el rojo del contrato y no el rojo de Windows, porque el contrato no admite colores nuevos.
- **macOS.** `src/lib/theme.ts` le pide a Tauri `getCurrentWindow().setTheme()` para que los tres botones nativos sigan el tema. Recibe `"light"` o `"dark"` si la persona eligió Claro u Oscuro, y `null` para «Como el sistema», que devuelve la ventana a la apariencia del equipo. Al abrir solo se llama si hay Claro u Oscuro guardado, así que con «Como el sistema» la app arranca igual que antes. Eso cuida la captura de la CI de macOS, que no se tocó.
- **Windows y Linux sin `setTheme`.** La ventana no tiene marco nativo y la barra es de la app, así que no se llama. Se mide que no se llame.
- **Permiso.** `src-tauri/capabilities/default.json` suma `core:window:allow-set-theme`. `cargo check` lo valida contra el esquema de Tauri 2.12.1 y pasa.
- **`scripts/verify-titlebar.mjs`.** El arnés que simula `__TAURI_INTERNALS__` con el agente de usuario de cada sistema ahora anota también las llamadas a `set_theme` con su valor. Mide la barra en claro y en oscuro en los tres sistemas. La comparación píxel a píxel en claro ahora incluye macOS. La referencia se tomó con `--referencia` sobre el commit anterior a este paso.

### Mediciones

`verify:titlebar` pasa 89 de 89 comprobaciones. Las barras en claro de macOS, Windows y Linux quedan iguales a las de antes, con 0 píxeles distintos. Windows y Linux dan las mismas cifras.

| Medición | Mínimo | Claro | Oscuro |
|---|---|---|---|
| Marca «NotaScan» | 4.5 | 6.79 | 6.50 |
| Logo N sobre dorado | 4.5 | 4.91 | 7.72 |
| Iconos de minimizar, maximizar y cerrar en reposo | 3 | 13.99 | 13.19 |
| Minimizar y maximizar al pasar el ratón | 3 | 11.68 | 11.64 |
| Cerrar al pasar el ratón, sobre su rojo | 3 | 9.15 | 6.52 |
| Foco de los botones (contorno de 2 px) | 3 | 13.99 | 9.40 |

Otras comprobaciones que pasan:

- En macOS, al abrir con Oscuro guardado, `setTheme` recibe `"dark"`. Con «Como el sistema» no se llama. Al elegir Claro, Como el sistema y Oscuro recibe `"light"`, `null` y `"dark"`, en ese orden.
- En Windows y Linux nunca se llama `setTheme`, ni al abrir ni al cambiar.
- El primer Tab cae en «Minimizar» y su foco se ve en los dos temas.
- Consola limpia en las nueve cargas.

Las capturas están en `verify-out/`. `titlebar-ahora-windows.png` y `titlebar-oscuro-windows.png` muestran la barra en claro y en oscuro. También están las de macOS y Linux, `titlebar-oscuro-windows-cerrar-hover.png` y las de foco. La tabla completa está en `verify-out/titlebar-temas.md`.

### Regresión

Corrida completa sobre `npm run build:demo`, en el puerto 4173. Además, `npx tsc --noEmit -p .` y `cargo check` en `src-tauri` pasan sin errores.

| Verificación | Base | Ahora |
|---|---|---|
| `verify:shell` | 61/62 | 61/62 |
| `verify:components` | 120/121 | 120/121 |
| `verify:card` | 50/51 | 50/51 |
| `verify:teacher` | 122/123 | 122/123 |
| `verify:admin` | 104/105 | 104/105 |
| `verify:principal` | 75/76 | 75/76 |
| `verify:print` | 5/5 | 5/5 |
| `verify:states` | 98/98 | 98/98 |
| `verify:i18n` | 537/537 | 537/537 |
| `verify:tokens` | 25/26 | 25/26 |
| `verify:dark` | 138/138 | 138/138 |
| `verify:theme` | 49/49 | 49/49 |
| `verify:titlebar` | 21/21 | 89/89 |

La falla que queda es la de siempre, los colores a mano de `PhoneUpload.tsx` y `print.css:12`. `PhoneUpload.tsx` ahora aparece en la línea 34, porque la rama de idiomas sumó una línea. `verify:shell` volvió a dar 60/62 en la primera corrida después de compilar, con el login al mismo 1.910 %, y 61/62 en la segunda.

### Lo que solo se ve en un Mac real

Queda pendiente, sin medir. Faltan los tres botones nativos con `setTheme` en un Mac de verdad (WKWebView), que cambien en el acto y que con «Como el sistema» vuelvan a seguir al equipo. La CI de GitHub tampoco lo muestra todavía, porque su barra de Mac sale como una franja vacía con el color de fondo. Ese problema es anterior a este paso y no se tocó. Este paso no cambia lo que la CI dibuja, porque la CI abre sin preferencia guardada y en ese caso no se llama `setTheme`.

### Pendiente

- La prueba en un Mac real descrita arriba.
- El fondo nativo de la ventana al redimensionar en oscuro (`backgroundColor` de Tauri). En Windows puede dejar ver un instante de blanco, y no se midió.
- Pasos 4 (Planilla, tablas, `Drawer`, `Modal` y gráficas) y 5 (estados).

El siguiente paso es el 4. No se empieza sin el visto bueno de Diego sobre este.

Diego aprobó el paso 3 el 2026-11-08.

## 15. Paso 4 · Resto de pantallas en oscuro

Hecho el 2026-11-08 en la rama `feature/modo-oscuro`, después de integrar `feature/idiomas` (pantallas de Secretaría en tres idiomas). Lo respaldan las cláusulas O2 a O6. Este paso queda **parado en cuatro decisiones** que piden a Diego un color fuera del contrato o un cambio de forma. Están al final y no se aplicó ninguna.

### Recorrido

`scripts/verify-dark-screens.mjs` (`npm run verify:dark-screens`) recorre las 37 rutas de Docente, Secretaría, Rectoría y Plataforma, más el inicio de sesión y la vista de componentes (`#/dev/components`, que trae `Modal`, `Drawer`, `ConfirmDialog`, `ConfirmAction` y el diálogo de contraseña). Abre además cinco diálogos reales, que son Preferencias, la búsqueda Ctrl+K, la confirmación de guardado de la revisión, el alta de un colegio en Plataforma y el registro de un estudiante en Secretaría. Lo hace a 1024 y 1440 px con el tema guardado como lo haría la persona, y son 88 cargas en total. Las capturas son del tamaño de la ventana, sin página completa, y están en `verify-out/p4/`.

En cada carga mide sobre los estilos calculados de lo que se pinta.

- Todo el texto visible contra su fondo real, componiendo las capas semitransparentes. El mínimo es AA, y 3:1 en texto grande.
- Las cifras de decisión a 7:1 (O6). Son la nota de la tarjeta, las cifras del panel, los KPI, el cambio de nota, el centro de los anillos y las notas y promedios de la Planilla.
- O4, todo texto sobre relleno dorado con tinta oscura.
- Los bordes de 2 px a 3:1 contra lo que tienen detrás, o el relleno a 3:1.
- Las superficies claras sueltas (luminancia mayor que 0.5) fuera del papel de O5. Las líneas de 4 px o menos cuentan como tinta.
- El foco en las primeras 12 paradas de Tab de cada ruta a 1440.
- En las gráficas, cada serie a 3:1 contra el fondo, y la separación entre series comparada con la del claro.
- La consola.

### Qué se corrigió

Todo sale del generador (`scripts/generar-tema-oscuro.mjs`). `notascan.css` sigue sin tocarse.

1. **Superficies dentro de un campo navy.** Una insignia «Borrador» sobre el periodo elegido, el icono del panel principal o un botón secundario dentro de un bloque navy son superficies propias (papel, marfil o suaves). En claro son claras con tinta navy, pero en oscuro heredaban el `--navy` de campo y quedaban navy sobre papel (1.36:1). Una regla generada con `:is()` las devuelve a los tokens oscuros de B. Son 229 selectores leídos de `notascan.css` y `amendments.css`.
2. **Fondos claros escritos a mano.** El generador ya no depende solo de la lista hecha a mano. Encuentra los diez fondos claros literales y pasa cada uno al token claro más cercano, que en oscuro resuelve su par de B. Así se arreglaron la búsqueda Ctrl+K, que era casi blanca con texto marfil (1.14:1), la medalla de bronce de la clasificación (1.03:1) y el sello de verificado. La lista a mano sigue y gana donde elegía otro token.
3. **Dorados repintados.** La cabecera de fila de las tablas (`.ns-table th[scope="row"]`) es transparente con tinta navy, pero el parche dorado de `.ns-table th` le ponía tinta oscura sobre fondo oscuro (1.09:1, en Estructura de Secretaría). El generador ahora busca las variantes más específicas que el sistema repinta sin dorado y les devuelve su tinta.
4. **Escudo del boletín.** Dentro del papel (O5), los campos del sistema también resuelven los tokens claros. Las iniciales del escudo pasaron de 4.23:1 a las del claro.
5. **Resumen del perfil del estudiante.** El componente escribe `color: var(--ivory-deep)` sobre el bloque navy (enmienda de octubre). En oscuro quedaba oscuro sobre navy (1.20:1). Dentro de ese bloque ahora usa el `--muted` de campo.

6. **Foco dentro de un relleno dorado.** Los encabezados que ordenan la tabla de colegios de Plataforma viven en una cabecera dorada. El contorno de foco era el `--focus` dorado claro sobre el dorado (1.33:1). Dentro de un relleno dorado el foco lleva ahora la tinta `#161513` (7.72:1), igual que en claro lleva el navy. El botón dorado en sí no cambia, porque su contorno cae fuera, sobre la página.

Hubo además ajustes del propio comprobador.

- El foco de los campos que lo dibujan en su envoltorio (los roles y los campos del login) se mide en el envoltorio.
- Después de cada Tab espera 60 ms. Sin esa espera medía el contorno a mitad de su transición de 1 ms, y el de los roles del login salía navy sobre navy cuando en la captura se ve dorado.
- El separador fuerte de 2 px cuenta como tinta y no como superficie.
- Con `NS_ONLY` se repite una sola pantalla.

### Mediciones

`verify:dark-screens` pasa 7 de 10 comprobaciones. Las tres que fallan son las decisiones 1, 2 y 3 de abajo.

| Comprobación | Resultado |
|---|---|
| Texto con AA (3:1 en grande) | 9347 textos en 88 cargas, todos pasan |
| Texto sin medir (degradado o imagen detrás) | 6, en la foto del examen y la franja rayada de «sin peso» |
| Cifras de decisión a 7:1 (O6) | 254 cifras. Fallan solo las notas bajas de la Planilla, entre 5.75 y 6.52 (decisión 1) |
| O4, texto sobre dorado con tinta oscura | 142 textos, todos a 4.5:1 o más |
| Bordes de 2 px a 3:1 | 3254 bordes. Fallan los de los campos navy, entre 1.36 y 1.49 (decisión 2) |
| Superficies claras sueltas fuera del papel | ninguna |
| Foco en las primeras 12 paradas de Tab | 466 paradas, todas visibles a 3:1 o más |
| Gráficas, series contra el fondo | 28 series, todas a 3:1 o más |
| Gráficas, ejes y rótulos | el más bajo 6.50:1 |
| Gráficas, separación entre series | baja frente al claro (decisión 3) |
| Consola | limpia en las 88 cargas |

Los campos navy que fallan el borde se reparten así en las dos anchuras. Controles con estado son el ítem activo del menú (42), los chips marcados (13), el periodo elegido (2), el peso de la evaluación (2), la casilla marcada (1) y la bandeja de rectoría (1). Bloques y adornos son la marca del panel lateral (42), los bloques navy (7), los sellos navy (4), los paneles principales (6), la barra de progreso invertida (3) y el escudo del boletín en la lista (1).

La tabla completa, con la muestra de cada medición, está en `verify-out/oscuro-p4-mediciones.md`. Las 88 capturas están en `verify-out/p4/`.

### Regresión

Corrida completa sobre `npm run build:demo`, con `NS_PORT=4193`.

| Verificación | Base | Ahora |
|---|---|---|
| `verify:shell` | 61/62 | 61/62 |
| `verify:components` | 120/121 | 120/121 |
| `verify:card` | 50/51 | 50/51 |
| `verify:teacher` | 122/123 | entre 118 y 121 de 123 |
| `verify:admin` | 104/105 | 104/105 |
| `verify:principal` | 75/76 | 75/76 |
| `verify:print` | 5/5 | 5/5 |
| `verify:states` | 98/98 | 98/98 |
| `verify:i18n` | 965/965 | 965/965 |
| `verify:tokens` | 25/26 | 25/26 |
| `verify:dark` | 138/138 | 138/138 |
| `verify:theme` | 49/49 | 49/49 |
| `verify:titlebar` | 89/89 | 89/89 |
| `verify:dark-screens` | nuevo | 7/10 |

`verify:teacher` no es una regresión de este paso. Sus fallas extra son comparaciones de píxeles del claro contra el sistema (entre 3.8 % y 16 %) que cambian de pantalla en cada corrida. En la primera fallaron evaluaciones, conceptos y perfil, en la segunda el panel, y en la tercera evaluaciones, comportamiento y reportes. Para descartar el tema se compiló el commit anterior, sin los cambios de este paso, y dio 121/123 con la falla en reportes. Las capas nuevas solo actúan con `data-theme="dark"`, y `verify:dark` mide que el claro pinta igual píxel a píxel. El equipo estaba cargado con otras corridas de pruebas en paralelo (la compilación tardó 20 s en vez de 5 s), y eso mueve los tiempos de las animaciones que esas comparaciones capturan. Queda anotado para repetirlo con el equipo libre.

### Decisiones para Diego (el paso para aquí)

1. **Las notas bajas de la Planilla no llegan a 7:1.** `.ns-gcell.is-low` usa `--burgundy` `#e38a80`, que da 6.52:1 sobre papel y 5.75:1 en la fila marcada. Pasa AA pero no la cláusula O6. No se arregla sin cambiar el burdeos del contrato. La propuesta es `--burgundy` `#eea49a` en oscuro, que da 8.27:1 sobre papel, 7.29:1 en la fila marcada, 9.05:1 sobre la página y 7.47:1 sobre `--burgundy-soft`. Los rellenos burdeos con tinta oscura ganan contraste.
2. **El borde de los campos navy no se separa del carbón.** El campo `#22345c` contra la página `#161513` da 1.49:1, y contra el papel 1.36:1. Su borde es del mismo color del campo. En los bloques (Continúa donde quedaste, el panel del login, los KPI principales) lo separa la repisa y el texto, y no es un control. Pero en controles con estado sí cuenta para WCAG 1.4.11, y son el ítem activo del menú, los chips marcados, el periodo elegido, la casilla marcada y la bandeja de rectoría. La alternativa dentro del contrato es que, en oscuro, los campos que son controles lleven borde de 2 px en la tinta `#ece4d4` (13:1), sin tocar los bloques. Cambia el aspecto, así que necesita su visto bueno.
3. **Separación entre series en las gráficas.** Contra el fondo todas las series pasan, y mejor que en claro (el dorado pasa de 2.62:1 a 7.72:1). Entre ellas la separación baja, porque la serie navy pasa a marfil. Entre barras normales y bajas cae de 4.91:1 a 1.87:1, entre las líneas de 2026 y 2025 de 2.37:1 a 1.40:1, y entre las porciones navy y dorada del anillo de 4.91:1 a 1.87:1. Se siguen distinguiendo por tono, por la línea de meta, por el trazo punteado de 2025 y por la leyenda, que es lo mismo que pasa en claro entre salvia y dorado (1.25:1). Si Diego quiere más separación, la opción dentro del contrato es que la serie principal use el campo navy `#22345c` con borde marfil. Eso cambia el aspecto de todas las gráficas.
4. **La ilustración del login.** Sigue pendiente desde la sección 8. La hoja del examen dibujada pasa a oscura, y falta decidir si sigue la regla del papel.

### Pendiente

- Las cuatro decisiones de arriba.
- Paso 5 (estados).
- La prueba en un Mac real del paso 3.

El siguiente paso, cuando Diego decida, es aplicar lo que elija y volver a medir con `verify:dark-screens`.

### Cierre del paso 4 (2026-11-09)

Diego aceptó las decisiones 1 y 2, dejó la 3 como está y pasó la 4 al paso 5. Las cuatro quedaron como enmiendas fechadas en la sección 11.

- El generador pone `--burgundy` `#eea49a` y un borde en la tinta `#ece4d4` a los nueve selectores de controles con estado sobre campo navy. `tokens.json` lleva el mismo valor.
- En `verify:dark-screens` las cifras de decisión quedan en 7:1 o más, y la más baja es la nota baja de la Planilla en la fila marcada (7.29:1). Ningún control falla ya el borde. Los bordes que quedan bajo 3:1 son los bloques aceptados por la decisión 2, y la comprobación los anota sin fallar. La separación entre series se registra como decisión 3 y solo fallaría si apareciera un par nuevo por debajo de 1.10:1.
- La barra de título con el cerrar en el burdeos nuevo pasa 89 de 89.
- La auditoría de la página pasó a `scripts/dark-audit.mjs`, para compartirla con el paso 5.

## 16. Paso 5 · Estados e ilustración del login

Hecho el 2026-11-09 en la rama `feature/modo-oscuro`. Lo respaldan las cláusulas O1 a O6, y en la ilustración la O5 (el papel no se oscurece). Desde el 2026-11-09 Diego pidió una sola parada por proyecto, así que el paso 4 se cerró y el 5 se hizo seguido.

### Qué se hizo

- **Ilustración del login.** La hoja del examen dibujada (`.ns-auth-illus .a-paper`) resuelve los tokens claros, igual que la foto del examen. Queda en papel `#fffdf8` con su sombra navy y la nota «4,5» a mano en burdeos claro, que da 9.15:1 sobre la hoja. El teléfono sigue en oscuro porque es una pantalla, y su pantalla es `#161513`. Lo genera el generador como el resto del papel.
- **Estados.** No hizo falta ningún parche nuevo. Las capas de los pasos 1 a 4 ya cubren la carga (`.ns-skel` y las tarjetas esqueleto), el vacío y el error (`EmptyState` con su sello) y el modo sin conexión.
- **`scripts/verify-dark-states.mjs`** (`npm run verify:dark-states`). Recorre las 24 pantallas de `verify-states.mjs` con los tres estados forzados de la demostración, a 1440 y en oscuro, que son 72 cargas. Además mide el dato viejo y el login a 1024 y 1440. Usa la auditoría compartida de `scripts/dark-audit.mjs`.

### Mediciones

`verify:dark-states` pasa 17 de 17.

| Comprobación | Resultado |
|---|---|
| Texto con AA en carga, vacío y error | 3260 textos en 72 cargas, todos pasan |
| Cifras de decisión, O4 y superficies claras | sin fallas |
| Esqueletos de carga | 72, oscuros (luminancia 0.2 o menos) y distintos de su fondo |
| Sellos del vacío y del error | 48, el icono a 9.05:1 o más |
| Dato viejo, píldora «Modo offline» | 10.89:1, y el panel con «Última sincronización» con AA |
| Login, hoja del examen | papel `#fffdf8` a 1024 y 1440 |
| Login, nota a mano sobre la hoja | 9.15:1 |
| Consola | limpia |

### Regresión

Una sola corrida de cada prueba, de una en una, con `NS_PORT=4193`.

| Verificación | Base | Ahora |
|---|---|---|
| `verify:dark-screens` | 7/10 | 10/10 |
| `verify:dark` | 138/138 | 138/138 |
| `verify:theme` | 49/49 | 49/49 |
| `verify:titlebar` | 89/89 | 89/89 |
| `verify:shell` | 61/62 | 60/62 |
| `verify:components` | 120/121 | 120/121 |
| `verify:card` | 50/51 | 50/51 |
| `verify:teacher` | 122/123 | 121/123 |
| `verify:admin` | 104/105 | 104/105 |
| `verify:principal` | 75/76 | 75/76 |
| `verify:print` | 5/5 | 5/5 |
| `verify:states` | 98/98 | 98/98 |
| `verify:i18n` | 965/965 | 965/965 |
| `verify:tokens` | 25/26 | 25/26 |

`verify:dark-screens` queda en 10 de 10 después del cierre del paso 4. Las cifras de decisión dan 7.29:1 o más, ningún control falla el borde, y los bloques de campo y la separación entre series quedan anotados como decisiones.

Hay dos pruebas por debajo de la base y no se repitieron, como pidió Diego. `verify:shell` dio 60 de 62 por la comparación del login contra el sistema (la misma de los pasos 1 a 3, que pasa en la segunda corrida). `verify:teacher` dio 121 de 123 por una comparación de píxeles del claro, la misma inestabilidad de la sección 15. Las dos son comparaciones del modo claro, y las capas del tema solo actúan con `data-theme="dark"`.

### Fallos propios

- La primera corrida de `verify:dark-states` marcó la nota «4,5» a 1.96:1. Era el comprobador, que medía el texto de un SVG contra el panel y no contra la hoja en la que está dibujado. La ilustración se mide ahora aparte, contra su propia hoja.
- En el cierre del paso 4 `verify:dark` dio 137 de 138, porque el generador se había editado después de escribir `theme-dark.css`. Se regeneró, y la tabla de regresión de arriba es la de después.

### Pendiente

- **Sin permiso.** La vista usa el mismo `EmptyState` de error que se midió aquí, pero la ruta solo aparece con una sesión real (`verify:auth`, compilación sin demostración). No se recorrió en oscuro.
- **Error de sincronización.** El panel de conexión se midió en modo sin conexión. El estado de error de sincronización no se puede forzar en la demostración.
- **Mac real.** La prueba en un Mac real de los botones nativos con `setTheme` (paso 3).
- **`verify:teacher`.** Sus comparaciones de píxeles contra el sistema siguen variando entre corridas (sección 15).
- **Textos en inglés y portugués.** Falta su revisión nativa.
- **Política de datos.** Hecho el 2026-11-09: la fila de la preferencia de tema está en la sección 5 de las tres políticas.
