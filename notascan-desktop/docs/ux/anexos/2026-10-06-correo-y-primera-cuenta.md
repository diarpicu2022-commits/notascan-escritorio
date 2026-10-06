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
