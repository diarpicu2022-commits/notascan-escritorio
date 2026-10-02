# WidgetBoard

Tablero de widgets en el Inicio de la app móvil, en una retícula de dos columnas.

**Estudiante:** Clase de hoy (en vivo: cuenta regresiva mm:ss, barra de avance de la clase y las cinco clases del día), Mi promedio (anillo + tendencia P1→P3), Racha (llama animada), Asistencia (semana con puntos), Próxima entrega. Se pueden añadir Próximo logro y Última nota.

**Acudiente:** versión calmada, sin llama ni rebote: Promedio, Asistencia y Próximo en el colegio (entrega de boletines). Se pueden añadir Última nota y Clase de hoy.

**Personalizar:** "Editar" o mantener presionado un widget activa el modo edición. Los widgets se mecen, cada uno muestra "Quitar" y abajo aparecen los que se pueden añadir. "Listo" cierra el modo.

## Ritmos de movimiento

| Tipo | Elementos |
|---|---|
| Permanente | Punto "en vivo" que late, cuenta regresiva, barra rayada de la clase en curso, llama de la racha y día de hoy parpadeando en la asistencia |
| De vez en cuando | Reloj de la píldora que se mece |
| Al entrar | Rebote escalonado de los widgets, anillos que se llenan, cifras que cuentan, tendencia que se dibuja y puntos que aparecen |

Con `prefers-reduced-motion` todo queda quieto y el modo edición se marca con un borde punteado.

Props: `role` (`student` · `parent`) · `title` · `initial` (ids) · `editing` · `onNavigate`.
