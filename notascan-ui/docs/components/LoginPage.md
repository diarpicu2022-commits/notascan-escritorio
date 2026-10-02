# LoginPage

Acceso docente con lenguaje **orgánico**, distinto al resto de la app a propósito: es la puerta de entrada y debe sentirse amable.

## Escritorio
- **Izquierda (marfil)**: logotipo arriba; al centro una ilustración propia en capas de manchas orgánicas (`sage-soft` → `sage` → `ivory-deep`) con burbujas, un círculo `gold`, la hoja del examen con QR y la nota manuscrita "4,5" encerrada en `burgundy`, un lápiz y un teléfono que la escanea y muestra "4.5 · IA 98%" con un sello `sage` de verificación. Abajo, un indicador editorial "01 —— 03 · La IA detecta · **tú verificas** · el sistema guarda".
- **Borde ondulado**: el panel `navy` entra con una curva SVG, sin línea recta entre las dos mitades.
- **Derecha (navy)**: "¡Hola**!**" en Fraunces 800 (el signo en `gold`), "Bienvenido de nuevo a NotaScan", y el formulario con campos en **píldora** translúcidos con icono dentro (`mail`, `lock`), foco con borde `gold` y halo, botón "Entrar" en píldora `gold`, "o entra con" → "Cuenta institucional", y "¿Primera vez? Solicita acceso a tu coordinación".

## Móvil (< 820px)
Cabecera `navy` con logo y "¡Hola!", y el formulario en una **hoja marfil** con esquinas superiores de 32px que sube sobre la cabecera; campos `paper`, botón `navy` con sombra `gold`.

## Roles
"Entrar como": Docente, Secretaría o Rectoría (escritorio). Estudiantes y acudientes tienen su propio acceso en la app móvil (`MobileLoginPage`), enlazado con "¿Eres estudiante o acudiente? Entra a la app móvil".

## Comportamiento
Labels reales, validación al enviar con mensajes accionables, mostrar/ocultar contraseña (`aria-pressed`), estado "Entrando…". Props: `onLogin`.

Referencias de inspiración (solo principios, nada copiado): división orgánica en dos mitades, manchas en capas con burbujas, saludo grande en cabecera de color con hoja inferior en móvil, campos en píldora con icono, círculo de color detrás del motivo principal.
