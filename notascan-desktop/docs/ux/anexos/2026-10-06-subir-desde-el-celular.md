# Subir desde el celular — anexo de diseño (2026-10-06)

Pedido de Diego: tomar las fotos de los exámenes con el celular y que lleguen solas a la evaluación abierta en la app
de escritorio, sin pasar archivos a mano. Contrato visual: el sistema `../notascan-ui/` (sin estilos nuevos fuera de él).

## 1. Usuarios y comunicación

- **Quién:** docente de colegio público o privado en Colombia, 25–60 años, maneja WhatsApp y la cámara del celular con
  soltura; poca paciencia para configurar. Califica en la sala de profesores o en casa, con el computador encendido y
  un fajo de 20–40 hojas.
- **Tarea dominante:** fotografiar hoja por hoja rápido y saber, sin mirar el computador a cada rato, que cada foto
  llegó. **Lectura obligada** (no voluntaria): el punto de entrada es la tarea; nada decorativo entre la persona y la
  cámara.
- **Comunicación:** el computador dice qué hacer en 3 pasos y muestra las fotos a medida que llegan; el celular solo
  tiene un botón grande «Tomar foto» y un contador.

## 2. Investigación (fuentes del tipo de pieza: pantalla)

| Fuente | Observación → decisión → límite |
|---|---|
| WhatsApp Web — enlazar dispositivo ([wati.io](https://www.wati.io/en/blog/whatsapp-web-qr-code/), [splashifypro](https://splashifypro.com/blog/whatsapp-web-login-qr-code-guide)) | QR con pasos numerados al lado; el código es temporal y se renueva cada vez → panel con QR + 3 pasos y código que vence (15 min) y se renueva solo → no copio su verde ni su ilustración. |
| Adobe Scan — tomar escaneos ([adobe.com](https://www.adobe.com/devnet-docs/adobescan/android/en/scan.html)) | Superficie plana e iluminada, fondo que contraste, celular justo encima; mensajes de estado cortos («Buscando el documento…», «Mantén firme») → en el celular, 3 consejos antes de la primera foto y estado por foto (subiendo / lista / falló, reintentar) → no hago detección de bordes en vivo (usa la cámara del sistema). |
| Quick Pic para Google Docs ([Workspace Marketplace](https://workspace.google.com/marketplace/app/quick_pic/852160844413)) | Escaneas un QR y las fotos del celular «aparecen al instante» donde estás trabajando → las fotos entran solas a la lista de la evaluación en el computador, sin botón de «actualizar» → no requiere instalar nada en el celular. |
| PairDrop ([pairdrop.net](https://pairdrop.net/)) | «No setup, no signup»: transferir sin cuenta en el otro dispositivo → la página del celular no pide iniciar sesión; el QR lleva un permiso de un solo uso, limitado a esa evaluación y a subir fotos → no expongo nada más que subir. |
| Emil Kowalski — Sonner ([emilkowal.ski](https://emilkowal.ski/ui/building-a-toast-component)) | Entradas con transiciones (no keyframes), ~400 ms, solo `transform`, interrumpibles → cada foto que llega entra a la lista con translateY + opacidad, 400 ms, y nada si `prefers-reduced-motion` → no apilo ni escalo como un toast. |
| Aceternity — File Upload ([ui.aceternity.com](https://ui.aceternity.com/components/file-upload)) | Su componente es solo «arrastra o haz clic» → confirma que el QR debe ser un **segundo camino al lado** del recuadro de arrastrar, no reemplazarlo → no copio su rejilla de fondo ni sus microinteracciones. |

No accesibles (2026-10-06): Mobbin (403, pide sesión), Pinterest (pide sesión). Consultadas sin aporte para esta pieza
(no cuentan): Refero Styles (biblioteca de estilos; el estilo ya lo fija el sistema), Taste Skill (marco sin reglas
concretas para un panel de emparejamiento), motionsites.ai (no se consultó: el movimiento aquí es mínimo).

## 3. Direcciones (falta la elección de Diego)

El diseño visible es el mismo en las tres (panel con QR en Calificaciones, página móvil con un botón grande); lo que
cambia es **por dónde viaja la foto**, que decide si funciona en el colegio real.

- **A · Misma red Wi-Fi.** La app de escritorio abre un pequeño servidor en la red local; el QR apunta a él. Sin
  hosting ni cuentas; las fotos van del celular al computador directamente. Riesgo real: muchas redes de colegio
  aíslan los dispositivos entre sí (no se ven) y Windows pide permiso de firewall la primera vez; con datos móviles
  no funciona.
- **B · Por internet (recomendada).** El QR lleva un permiso de un solo uso (15 min, solo esa evaluación, solo subir
  fotos) creado por la base; el celular abre una página pública de NotaScan y sube a Supabase; el computador ve llegar
  cada foto en tiempo real. Funciona con cualquier red y con datos móviles. Necesita publicar la página móvil: un
  repositorio **público** aparte en tu GitHub con GitHub Pages (solo la página; sin claves secretas — la clave
  publicable de Supabase es pública por diseño).
- **C · Por internet, guiada por estudiante.** Igual que B, pero el celular muestra la lista del curso y fotografías
  a cada estudiante en orden («Siguiente: María Fernanda López»). Menos errores de identificación; más lenta si las
  hojas no están ordenadas por lista.

## 4. Contrato de diseño (elegida: B · por internet, 2026-10-06)

Diego pidió no gastar en más investigación y usar el sistema tal cual. Contrato: piezas y tokens de `../notascan-ui/`.
- **Escritorio:** botón secundario «Subir desde el celular» (icono `qr`) debajo del recuadro de arrastrar; `Modal`
  tamaño documento con el QR a la izquierda (papel, borde 2 px navy, sombra dura, 232 px, navy sobre papel, sin logo
  encima), 3 pasos con la marca numerada del stepper (28 px), y línea de estado (`StatusDot`: esperando / N fotos
  recibidas) con la cuenta regresiva; vencido → «Generar otro». Mientras el permiso vive: «Celular conectado · N
  fotos» + «Terminar». Las fotos entran a la misma cola que las arrastradas («Foto del celular N»).
- **Celular** (`mobile-subir/index.html`, publicado en https://diarpicu2022-commits.github.io/notascan-subir/): marfil,
  Fraunces + Inter, logo con el punto dorado; evaluación como titular; 3 consejos antes de la primera foto; «Tomar foto»
  dorado de ancho completo (76 px, sombra dura) que abre la cámara trasera; «Elegir de la galería»; contador grande de
  fotos que llegaron; lista con miniatura y estado (enviando / llegó / falló + Reintentar). Estados: vencido, inválido,
  sin conexión.
- **Seguridad:** permiso de 20 min, 64 hex, uno por docente (abrir otro cierra el anterior), solo esa evaluación y solo
  subir; la función valida JPEG real ≤ 4 MB y máximo 80 fotos por permiso; la foto va a la carpeta del docente (se
  borra al cerrar el periodo con las demás); el celular no ve nada más que el nombre de la evaluación.

## 5. Verificación

- `verify:db` 172/172 (nuevas: permiso de 20 min con código largo; no para evaluación ajena, ni Secretaría, ni sin
  sesión; abrir otro cierra el anterior; cada docente ve solo lo suyo; solo marca «recogida»; cerrar lo cierra).
- `verify:teacher-data` 65/65 (nuevas: el botón abre el QR con los 3 pasos y la cuenta regresiva; la foto que llega se
  marca, entra a la lista y se lee sin volver a subirla; «Terminar» cierra el permiso). Arreglo de paso: la cola dejaba
  «En cola» para siempre lo que llegaba durante una lectura; ahora un solo lector sigue mientras haya pendientes.
- `verify:phone-page` 10/10 a 390 px (titular de la evaluación, consejos, botón de 358×76, cámara trasera, contraste
  4,98:1, JPEG con el permiso, contador, Reintentar, sin desbordes, vencido, enlace inválido).
- **Producción, de punta a punta:** en la app de escritorio (Ana Lucía, 7A · Parcial 2) se abrió el QR; se leyó el QR de
  la pantalla (OpenCV) → la página publicada mostró «Matemáticas · 7A · Parcial 2»; se subió una hoja de prueba → «1
  foto llegó al computador» y en el escritorio «1 foto recibida» y «Foto del celular 1» en la cola (la lectura espera la
  clave de Anthropic). «Terminar» → el código responde 410 «venció». Función `phone-upload` sin JWT: responde sus
  propios errores (404 código inválido) y el preflight CORS (204).


## 6. Primera lectura con la clave real (2026-10-06)

Con `ANTHROPIC_API_KEY` guardada, la foto ya no da «falta la clave», pero Anthropic responde 400 y la app lo mostraba
como «formato o tamaño». Causa medida en la consola: **la cuenta tiene 0,00 US$ de créditos** (Anthropic responde 400
también por saldo). `read-exam` (publicada, `afe920ddfaf8`) ahora distingue el saldo («La cuenta de Anthropic no tiene
saldo. Carga créditos en … Billing») y devuelve el motivo en `detail`; la cola se detiene con ese aviso en vez de
gastar intentos. Pendiente de Diego: cargar créditos (mínimo 5 US$) y repetir la prueba.
