/*
 * Casos de prueba del paso 4. Este archivo se ejecuta tal cual en dos sitios:
 *  - en la app (#/dev/components) con `h` = React.createElement y `C` = componentes portados;
 *  - en la referencia del sistema con `h` y `C` = window.NotaScan (notascan-ui original).
 * JavaScript plano y sin imports para que sirva en ambos lados sin compilar.
 * Los diálogos usan `inline` para renderizarse en su sitio y poder compararse.
 */
export function buildSpecs(h, C) {
  const noop = function () {};
  const rows = [
    { id: "20261175", name: "María Fernanda López Rosero", course: "7A", avg: 4.6, status: "Activo" },
    { id: "20261182", name: "Juan Sebastián Martínez Paz", course: "7A", avg: 3.1, status: "Activo" },
    { id: "20261189", name: "Valentina Guerrero Ortiz", course: "7A", avg: 4.2, status: "Pendiente" },
    { id: "20261196", name: "Carlos Andrés Rodríguez Bravo", course: "7A", avg: 2.8, status: "Activo" },
    { id: "20261203", name: "Laura Camila Benavides Paz", course: "7A", avg: 4.9, status: "Activo" },
    { id: "20261210", name: "Santiago Muñoz Delgado", course: "7A", avg: 3.5, status: "Retirado" },
    { id: "20261217", name: "Daniela Alejandra Pantoja Mora", course: "7A", avg: 3.9, status: "Activo" },
  ];
  const gridCols = [
    { key: "name", label: "Estudiante", sortable: true, header: true },
    { key: "course", label: "Curso" },
    { key: "avg", label: "Promedio", numeric: true, sortable: true, render: function (r) { return r.avg.toFixed(1); } },
    { key: "status", label: "Estado", render: function (r) { return h(C.Badge, { tone: r.status === "Activo" ? "verified" : r.status === "Pendiente" ? "pending" : "review" }, r.status); } },
  ];
  const fmt1 = function (v) { return Number(v).toFixed(1); };

  return [
    ["Input", h(C.Input, { label: "Nombres", hint: "Como aparece en el documento.", defaultValue: "María Fernanda", required: true })],
    ["Input con error", h(C.Input, { label: "Correo del acudiente", defaultValue: "gloria.lopez@", error: "Escribe un correo válido." })],
    ["Input con éxito", h(C.Input, { label: "Documento", defaultValue: "TI 1084512345", success: "Documento disponible." })],
    ["Select", h(C.Select, { label: "Curso", placeholder: "Elige un curso", options: ["6A", "6B", "7A", "7B"], defaultValue: "7A", required: true })],
    ["Select con error", h(C.Select, { label: "Periodo", placeholder: "Elige un periodo", options: [{ value: "p1", label: "Periodo 1" }, { value: "p2", label: "Periodo 2" }], defaultValue: "", error: "Elige el periodo." })],
    ["Textarea", h(C.Textarea, { label: "Observación", rows: 3, defaultValue: "Participa activamente y entrega a tiempo.", hint: "Máximo 300 caracteres." })],
    ["Checkbox", h("div", { className: "ns-row" },
      h(C.Checkbox, { label: "Recordarme", checked: true, onChange: noop }),
      h(C.Checkbox, { label: "Seleccionar todos", hideLabel: true, checked: false, indeterminate: true, onChange: noop }),
      h(C.Checkbox, { label: "Deshabilitado", checked: false, disabled: true, onChange: noop }))],
    ["Switch", h("div", { className: "ns-row" },
      h(C.Switch, { label: "Paz y salvo de biblioteca", checked: true, onChange: noop, onText: "Al día", offText: "Pendiente" }),
      h(C.Switch, { label: "Trabajar sin conexión", checked: false, onChange: noop }))],
    ["ProgressBar", h("div", { className: "ns-col" },
      h(C.ProgressBar, { label: "Revisadas", value: 18, total: 24, showValue: true }),
      h(C.ProgressBar, { label: "Asistencia", value: 22, total: 24, tone: "sage", showValue: true, valueText: "22 de 24" }),
      h(C.ProgressBar, { label: "En riesgo", value: 5, total: 24, tone: "burgundy", showValue: true }))],
    ["IconAction", h("div", { className: "ns-row" },
      h(C.IconAction, { icon: "edit", label: "Editar estudiante", onClick: noop }),
      h(C.IconAction, { icon: "userx", tone: "danger", label: "Retirar estudiante", onClick: noop }),
      h(C.IconAction, { icon: "chevright", label: "Página siguiente", disabled: true, onClick: noop }))],
    ["SegmentedTabs", h(C.SegmentedTabs, { label: "Vista", value: "list", onChange: noop, tabs: [{ value: "list", label: "Lista", icon: "menu", count: 24 }, { value: "grid", label: "Tarjetas", icon: "dashboard" }, { value: "chart", label: "Gráfico", icon: "reports" }] })],
    ["Divider", h("div", { className: "ns-col" }, h(C.Divider, {}), h(C.Divider, { variant: "strong" }), h(C.Divider, { variant: "ornament", label: "Periodo 3" }))],
    ["StatusDot y Sticker", h("div", { className: "ns-row" },
      h(C.StatusDot, { status: "success" }), h(C.StatusDot, { status: "warning" }), h(C.StatusDot, { status: "error" }),
      h(C.Sticker, { tone: "gold", icon: "ai" }, "IA + docente"), h(C.Sticker, { tone: "sage", rotate: 3, icon: "check" }, "Verificada"))],
    ["SearchField", h(C.SearchField, { value: "María", onChange: noop })],
    ["FilterGroup", h(C.FilterGroup, { label: "Estado", value: "pending", onChange: noop, options: [{ value: "all", label: "Todas", count: 9 }, { value: "pending", label: "Pendientes", count: 4 }, { value: "verified", label: "Verificadas", count: 3 }] })],
    ["FilterGroup select", h(C.FilterGroup, { label: "Curso", as: "select", value: "7A", onChange: noop, options: [{ value: "6A", label: "6A" }, { value: "7A", label: "7A" }, { value: "8A", label: "8A" }] })],
    ["FiltersBar", h(C.FiltersBar, { search: "", onSearch: noop, count: "9 de 9 estudiantes", groups: [{ label: "Estado", value: "all", onChange: noop, options: [{ value: "all", label: "Todas", count: 9 }, { value: "needs-review", label: "Requiere revisión", count: 3 }] }] })],
    ["UploadZone", h(C.UploadZone, { onFiles: noop })],
    ["ImportFileZone", h(C.ImportFileZone, { onFile: noop, onError: noop })],
    ["ReviewStepper", h(C.ReviewStepper, { current: 5 })],
    ["ReviewSummary", h(C.ReviewSummary, { total: 9, verified: 3, pending: 3, review: 3, evaluation: "Parcial 2" })],
    ["Marquee", h(C.Marquee, {})],
    ["ProcessingPanel", h(C.ProcessingPanel, { step: 2, simulate: false })],
    ["ProcessingPanel listo", h(C.ProcessingPanel, { step: 3, simulate: false, index: 8, total: 24, studentName: "Valentina Guerrero", detected: "4.2", confidence: 94 })],
    ["ConfirmDialog", h("div", { style: { position: "relative", height: 380 } }, h(C.ConfirmDialog, { open: true, inline: true, count: 6, note: "3 sin verificar quedarán pendientes", onCancel: noop, onConfirm: noop }))],
    ["Modal", h("div", { style: { position: "relative", height: 360 } }, h(C.Modal, {
      open: true, inline: true, onClose: noop, alert: true, icon: "warning", tone: "burgundy", title: "¿Retirar a Juan Sebastián Martínez?",
      description: "El estudiante deja de aparecer en listas y planillas. Su historial se conserva.",
      actions: [h(C.Button, { key: "c", variant: "secondary", onClick: noop }, "Cancelar"), h(C.Button, { key: "o", variant: "danger", icon: "userx", onClick: noop }, "Retirar estudiante")],
    }))],
    ["Drawer", h("div", { style: { position: "relative", height: 420 } }, h(C.Drawer, {
      open: true, inline: true, onClose: noop, eyebrow: "Estudiante · 7A", title: "María Fernanda López Rosero",
      footer: [h(C.Button, { key: "c", variant: "secondary", onClick: noop }, "Cerrar"), h(C.Button, { key: "e", icon: "edit", onClick: noop }, "Editar datos")],
    }, h("p", { className: "ns-caption" }, "ID 20261175 · TI 1084084246"), h(C.ProgressBar, { label: "Asistencia", value: 96, total: 100, tone: "sage", showValue: true })))],
    ["PasswordResetDialog", h("div", { style: { position: "relative", height: 400 } }, h(C.PasswordResetDialog, { open: true, inline: true, onClose: noop, user: { name: "Carlos Pérez", email: "carlos.perez@ucc.edu.co" } }))],
    ["Toast", h("div", { className: "ns-col" },
      h(C.Toast, { tone: "success", title: "6 calificaciones guardadas", message: "Parcial 2 · Matemáticas quedó actualizado.", onClose: noop }),
      h(C.Toast, { tone: "error", title: "No pudimos guardar", message: "Revisa tu conexión. Tus cambios siguen en este equipo." }),
      h(C.Toast, { tone: "info", title: "Borrador de IA listo", message: "Revisa el concepto antes de publicarlo." }))],
    ["EmptyState", h(C.EmptyState, { title: "No hay calificaciones pendientes.", message: "Carga una evaluación para comenzar la revisión.", action: h(C.Button, { icon: "upload", onClick: noop }, "Subir fotografía") })],
    ["EmptyState error", h(C.EmptyState, { tone: "error", title: "No pudimos cargar los estudiantes.", message: "Revisa tu conexión e inténtalo de nuevo." })],
    ["DataTable", h(C.DataTable, { caption: "Evaluaciones del periodo", columns: [{ key: "name", label: "Evaluación" }, { key: "weight", label: "Peso", numeric: true }], rows: [{ id: "e1", name: "Parcial 2", weight: "25%" }, { id: "e2", name: "Taller 3 · Ecuaciones", weight: "15%" }] })],
    ["DataGrid", h(C.DataGrid, {
      caption: "Estudiantes de 7A", columns: gridCols, rows: rows, pageSize: 5, selectable: true, densityToggle: true,
      toolbar: h(C.SearchField, { value: "", onChange: noop }),
      rowActions: function (r) { return [h(C.IconAction, { key: "e", icon: "edit", label: "Editar a " + r.name, onClick: noop })]; },
    })],
    ["DataGrid cargando", h(C.DataGrid, { caption: "Cargando estudiantes", columns: gridCols, rows: [], loading: true })],
    ["DataGrid error", h(C.DataGrid, { caption: "Error", columns: gridCols, rows: [], error: "No pudimos cargar los estudiantes.", onRetry: noop })],
    ["DataGrid vacío", h(C.DataGrid, { caption: "Sin resultados", columns: gridCols, rows: [], emptyTitle: "No hay estudiantes con este filtro.", emptyMessage: "Prueba con otro curso." })],
    ["BarChart", h(C.BarChart, { title: "Promedio por curso", subtitle: "¿Qué cursos están por debajo de la meta?", data: [{ label: "6A", value: 3.9 }, { label: "6B", value: 3.4 }, { label: "7A", value: 4.1 }, { label: "7B", value: 2.9, note: "En riesgo" }, { label: "8A", value: 3.7 }], max: 5, ticks: [0, 2.5, 5], target: 3.5, targetLabel: "Meta", seriesLabel: "Promedio", lowBelow: 3, format: fmt1 })],
    ["LineChart", h(C.LineChart, { title: "Evolución del promedio", subtitle: "¿Mejora 7A periodo a periodo?", labels: ["P1", "P2", "P3", "P4"], series: [{ name: "7A", points: [3.6, 3.8, 4.1, 4.0] }, { name: "Institución", points: [3.5, 3.6, 3.7, 3.8], tone: "gold", dashed: true }], min: 1, max: 5, ticks: [1, 3, 5], threshold: 3, format: fmt1 })],
    ["DonutChart", h(C.DonutChart, { title: "Estado de la revisión", subtitle: "¿Cuánto falta por verificar?", data: [{ label: "Verificadas", value: 18, tone: "sage" }, { label: "Pendientes", value: 4, tone: "gold" }, { label: "Revisión", value: 2, tone: "navy" }], centerValue: "75%", centerLabel: "verificado" })],
  ];
}
