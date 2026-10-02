# Apps móviles · Flutter

El diseño de las apps de **Estudiante** y **Acudiente** está en `StudentApp` y `ParentApp` (ver `design-system/index.html`, secciones *Estudiante · móvil* y *Acudiente · móvil*). Este directorio trae el punto de partida para implementarlas en Flutter con la misma identidad:

- `notascan_theme.dart`: colores, espaciado, radios, sombra sólida, movimiento y `ThemeData` generados desde `tokens/tokens.json`.

## Mapeo de componentes

| Diseño (web) | Flutter |
|---|---|
| `MobileShell` (navegación inferior de 5 pestañas) | `Scaffold` + `NavigationBar` (indicador `navy`, icono activo `gold`) |
| `XPBar` | `TweenAnimationBuilder` sobre `LinearProgressIndicator`, `NsMotion.slow` |
| `AchievementCard` / `AchievementGallery` | `GridView.count(crossAxisCount: 2)` + tarjetas con `nsShadow(3)` |
| `BottomSheet` | `showModalBottomSheet` con `bottomSheetTheme` |
| `Celebration` | `AnimatedScale` con `NsMotion.stamp` + paquete `confetti`, desactivado si `MediaQuery.disableAnimations` |
| `GradeSimulator` | `Slider` + `IconButton` (−/+) + resultado con la etiqueta «Proyección» |
| `NotificationFeed` | `ListView` de tarjetas con estado sin leer (borde 2px + punto `gold`) |
| `ObserverTimeline` | `ListView` agrupado por fecha; tipo por icono, forma y palabra |
| `MobileWidget` / `WidgetBoard` | `GridView` de 2 columnas; tamaño `m` con `StaggeredGridTile.fit(crossAxisCellCount: 2)`. Entrada con `TweenAnimationBuilder` (escala .6 → 1, `Curves.elasticOut` corto); modo edición con `LongPressGestureDetector` + `RotationTransition` en bucle (±1.1°) |
| Anillo del promedio | `CustomPainter` con `drawArc` animado por `AnimationController` (1.1 s) |
| Clase en vivo | `Stream.periodic(Duration(seconds: 1))` para la cuenta regresiva; punto "en vivo" con `AnimatedContainer` pulsante |

## Widgets en la pantalla de inicio

Paquete [`home_widget`](https://pub.dev/packages/home_widget): Flutter guarda los datos (`HomeWidget.saveWidgetData`) y cada plataforma dibuja el widget nativo.

- **iOS (WidgetKit + SwiftUI):** pequeño = promedio (`Gauge`), pequeño = clase actual con `Text(timerInterval:)` para la cuenta regresiva sin gastar batería, mediano = últimas notas, grande = horario de hoy. Las transiciones entre estados con `.contentTransition(.numericText())`.
- **Android (Jetpack Glance):** mismos tamaños; se actualiza con `WorkManager` cada 30 min y en cada nota nueva (notificación push → `HomeWidget.updateWidget`). La cuenta regresiva usa `Chronometer`.
- Colores y tipografías del tema (`navy`, `gold`, `sage-soft`; Fraunces para cifras, Inter para el texto) y la firma "NotaScan" abajo a la izquierda.
- Acudiente: "Llegó 6:52" (entrada registrada hoy), notas del hijo o hija y horario. Sin gamificación.

Reglas: toda la interfaz en español, objetivos táctiles de al menos 48 px, semántica (`Semantics`) en gráficos y estados, y respetar *reducir movimiento*.
