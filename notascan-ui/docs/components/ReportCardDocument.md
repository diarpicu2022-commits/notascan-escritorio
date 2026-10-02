# ReportCardDocument

El boletín como **documento académico real**, no como tarjeta de dashboard:

1. **Identidad del colegio**: escudo, nombre, resolución y DANE; título "Informe académico" y periodo.
2. **Datos del estudiante**: nombre, documento, grado, curso, director de grupo y puesto en el curso.
3. **Un boletín por periodo.** Para el periodo N se muestran todas las materias, cada una con su docente, las notas de los periodos anteriores ya cursados (P1 … PN−1), la **nota del periodo** (PN) resaltada, el **acumulado** (promedio ponderado de P1 a PN con los pesos que configura Secretaría en Periodos Académicos), el desempeño del periodo y las faltas. En el Periodo 1 solo aparecen la nota del periodo y el acumulado.
4. Debajo de cada materia, el **concepto del docente**: por qué obtuvo esa nota según el logro de la materia, su evolución y sus faltas (lo redacta cada docente en `ConceptEditor`, con ayuda opcional de la IA).
5. Promedio del periodo, asistencia y escala de valoración (Decreto 1290 de 2009).
6. **Mensaje del director de grupo**: personalizado con fortalezas, la materia a reforzar, la asistencia y el compromiso con la familia.
7. **Firmas** del director(a) de grupo y del rector, con nombre y cargo, y el sello de verificación NotaScan.

Props: `student` · `period` ("Periodo 1" … "Periodo 4") · `compact`.
