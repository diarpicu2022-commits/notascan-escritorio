# Correo propio y primera cuenta (2026-10-06)

- **SMTP:** Brevo (`smtp-relay.brevo.com:587`, remitente verificado `diarpicu2025@gmail.com`, nombre «NotaScan»).
  Diego creó la cuenta y pegó la clave SMTP; el resto de los campos y las 3 plantillas (invitación, código,
  restablecer) los cargó el asistente desde `supabase/templates/`, comprobadas recargando cada una.
- **Primera cuenta:** Diego registró `diarpicu2025@gmail.com` en `platform_admins` y se envió la invitación desde
  Supabase. **El correo llegó a la bandeja de entrada** (no a spam) con el asunto «Tu acceso a NotaScan», remitente
  NotaScan vía Brevo, y el código bien visible.
- **Fallo encontrado con el correo real:** el proyecto envía códigos de **8 dígitos** y la app solo aceptaba 6
  (`LoginPage.tsx`): la persona invitada no habría podido activar su cuenta. Ahora se aceptan códigos de 6 a 10 dígitos
  (el rango que Supabase permite) y los textos dicen «el código del correo» en vez de un número fijo. `verify:invite`
  15/15 (nueva comprobación: admite hasta 10 dígitos), `verify:auth` 20/20. Instaladores recompilados y reemplazados en
  la Release v0.1.0.

## Secretaría de cada colegio desde la consola (2026-10-06, pedido de Diego)

Diego, con razón: agregar o cambiar la Secretaría de un colegio no puede exigir el SQL Editor. Además el botón
«Enviar invitación a Secretaría» invitaba a **todas** las secretarías pendientes de un colegio: en Los Andes habría
escrito a tres correos ficticios del sembrado (`claudia@`, `patricia@`, `ruben@losandes.edu.co`) y dañado la reputación
de envío en Brevo.

- **Bloque «Secretaría»** en la ficha del colegio (después de Servicio), con las piezas del directorio de usuarios: avatar,
  nombre y correo, insignia de estado (Activa / Invitación enviada / Sin invitar / Desactivada), sobre para invitar o
  reenviar **a esa persona**, y papelera solo para quien nunca recibió invitación (con confirmación). «Agregar cuenta
  de Secretaría» abre un panel lateral (nombre + correo) que registra y envía la invitación. Estado vacío explicado.
  «Requiere atención» lleva aquí («Ir a Secretaría») cuando falta Secretaría o nadie ha entrado. Se quitó el botón
  que invitaba a todas.
- La columna de acciones reserva siempre el ancho de dos botones (`.ns-sec-actions`, 70 px) para que las insignias
  queden alineadas: medido, mismo borde derecho (1282 px) en las dos filas.
- **Migración `20261006150000_secretaria_plataforma.sql`** (aplicada, cotejada `80ce3bd70dbe`; catálogo: 3 funciones,
  definer, sin acceso anónimo): `platform_secretaries`, `platform_add_secretary`, `platform_remove_secretary` (solo
  plataforma; no quita a quien ya recibió invitación o tiene cuenta).
- **`invite-staff`** (publicada, cotejada `e5cc03b6c72e`): la plataforma invita a una persona con `{ institution_id, email }`.

Verificación: `verify:db` 161/161 (lista solo Secretaría y con estado; un colegio no la consulta; agrega con correo en
minúsculas; rechaza duplicado, inválido o si lo pide un colegio; quita solo a quien nunca fue invitado),
`verify:platform` 30/30 (orden de bloques, vacío, validación, aviso), `verify:platform-auth` 15/15 (invita solo a esa
persona, agrega y después invita, quitar pide confirmación y envía colegio + correo). Fallo propio: la primera prueba
de quitar usaba una cuenta que otra prueba necesitaba más adelante.
