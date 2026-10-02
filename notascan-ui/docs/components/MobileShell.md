# MobileShell

Marco de la app móvil (Flutter): barra de estado, cabecera con logo, campana con conteo y avatar, contenido desplazable y navegación inferior de 5 pestañas. En pantallas de menos de 480px ocupa la pantalla completa, sin marco.

- **Estudiante:** Inicio · Notas · Rendimiento · Logros · Simulador (+ Notificaciones y Observador desde la cabecera).
- **Acudiente:** Inicio · Calificaciones · Asistencia · Observador · Boletines (+ Notificaciones).

Bajo el logotipo se muestra siempre el grado y el curso ("7A · Séptimo"), para que el estudiante y el acudiente sepan qué año se está cursando.

Props: `role` · `active` · `onNavigate` · `title` · `back` · `unread` · `onLogout`.
