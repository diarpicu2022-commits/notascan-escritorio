# StudentProfilePage

Perfil completo y reutilizable del estudiante: cabecera (avatar, nombre, ID, curso, estado de matrícula) y pestañas **Resumen · Calificaciones · Asistencia · Observador · Boletines · Información**. Lo visible depende del rol: Información (y la nota médica) solo para Secretaría y Rectoría; los boletines se bloquean si no hay paz y salvo.

Props: `studentId` · `role` · `tab` · `onNavigate`.
