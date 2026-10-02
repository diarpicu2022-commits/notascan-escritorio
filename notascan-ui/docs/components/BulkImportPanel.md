# BulkImportPanel

Importación masiva Excel/CSV en seis pasos: **Seleccionar archivo → Previsualizar → Validar → Corregir errores → Confirmar importación → Resultados**.

- Resumen: "245 registros encontrados · 238 válidos · 7 requieren revisión".
- Tabla de validación por fila con **Válido / Advertencia / Error / Duplicado** (icono + palabra).
- Los errores se corrigen en la misma tabla o la fila se omite; no se puede continuar con errores pendientes.
- Resultado: "Importación completada · 238 estudiantes fueron registrados correctamente."

Props: `initialStep` (documentación) · `onNavigate`.
