# ProcessingPanel

La experiencia de procesamiento de IA, académica y funcional: vista de la fotografía con marcas punteadas de lo que se va detectando (QR del estudiante, nota manuscrita) y una lista de tres pasos — Identificando estudiante · Detectando calificación · Calculando confianza — con el resultado de cada uno a la derecha.

- Vidrio, porque flota sobre el lienzo.
- Barra de progreso rayada `gold` con `role="progressbar"`.
- Cierra siempre con: "La IA solo detecta. Tú revisas y confirmas cada nota."

Props: `step` (0–3; si se omite, simula el recorrido en bucle) · `simulate` · `file` · `index` / `total` · `studentName` · `detected` · `confidence` · `grade` (texto manuscrito de la vista previa).

Con `prefers-reduced-motion` desaparece la línea de escaneo; el progreso sigue anunciándose.
