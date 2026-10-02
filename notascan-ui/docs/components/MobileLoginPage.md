# MobileLoginPage

Inicio de sesión de la app móvil (Flutter), compartido por **Estudiante** y **Acudiente**. Cabecera `navy` con el logotipo, una ilustración pequeña en manchas (hoja con la nota manuscrita y un círculo `gold`) y el saludo "¡Hola!" en Fraunces 800. Debajo, una hoja `ivory` con esquinas de 32px que sube sobre la cabecera:

- Pestañas **Soy estudiante / Soy acudiente**. El campo de usuario cambia: código estudiantil o correo / documento o correo.
- Contraseña con mostrar/ocultar, "¿Olvidaste tu contraseña?", botón **Entrar** `navy` con sombra `gold`.
- Validación al enviar con mensajes accionables y estado "Entrando…".

En la app se llega por `#/movil`; cerrar sesión en el móvil vuelve aquí. Props: `onLogin(rol)` · `defaultRole`.
