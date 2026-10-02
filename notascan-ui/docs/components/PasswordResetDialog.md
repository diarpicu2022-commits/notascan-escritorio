# PasswordResetDialog

Modal reutilizable para restablecer contraseña. Pregunta "¿Deseas generar un nuevo acceso para este usuario?", muestra a quién afecta y, al confirmar, informa: "La solicitud de restablecimiento fue realizada correctamente."

**Nunca muestra una contraseña existente**: genera un enlace de un solo uso.

Props: `open` · `user: { name, email }` · `onClose` · `inline`.
