# HomeScreenWidgets

Widgets de NotaScan **fuera de la app**, en la pantalla de inicio del teléfono (iOS WidgetKit / Android Glance, ambos desde Flutter con `home_widget`).

| Tamaño | Estudiante | Acudiente |
|---|---|---|
| Pequeño | Promedio del periodo (anillo) | "Llegó 6:52" (registro de entrada de hoy) |
| Pequeño | Clase actual o próxima, con cuenta regresiva | Igual, para seguir la jornada |
| Mediano | Últimas notas | Notas de María Fernanda |
| Grande | Horario de hoy con la clase en curso resaltada y su barra de avance | Igual |

Cada widget lleva la firma "NotaScan" y abre la vista correspondiente al tocarlo. El sistema operativo limita las animaciones de los widgets reales: en iOS solo hay transiciones al cambiar el contenido y en Android una actualización cada 15–30 minutos. Por eso aquí se anima solo la entrada y la cuenta regresiva (que en iOS se implementa con `Text(timerInterval:)`). El fondo del teléfono también se mueve, como referencia de ambiente.
