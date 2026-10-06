// Paso 6d · a quién pertenece cada foto (lógica pura de supabase/functions/read-exam/match.ts; Node 24 quita los tipos).
import { createReport } from "./harness.mjs";
import { matchReading, nameScore, normalizeGrade } from "../supabase/functions/read-exam/match.ts";

const report = createReport();
const ROSTER = [
  { id: "20261175", name: "María Fernanda López Rosero" },
  { id: "20261182", name: "Juan Sebastián Martínez Paz" },
  { id: "20261189", name: "Valentina Guerrero Ortiz" },
  { id: "20261190", name: "María José Bravo Paz" },
];
const read = (o) => ({ code: null, code_clarity: "clear", name: null, grade: null, grade_clarity: "clear", ...o });

let m = matchReading(read({ code: "20261182", name: "Juan Martínez", grade: 4.5 }), ROSTER);
report.check("Código exacto + nombre que coincide + nota clara → estudiante, 4.5, 96 %, por verificar", m.how === "code" && m.studentId === "20261182" && m.detected === 4.5 && m.confidence === 96 && m.status === "pending" && m.nameAgrees === true, JSON.stringify(m));

m = matchReading(read({ code: "20261182", name: "Valentina Guerrero", grade: 3.8 }), ROSTER);
report.check("Código claro pero el nombre es de otro → se marca para revisar (60 %) y lo dice", m.studentId === "20261182" && m.status === "needs-review" && m.confidence === 60 && m.nameAgrees === false && m.note.includes("no coincide"), JSON.stringify(m));

m = matchReading(read({ code: "2026118?", code_clarity: "doubtful", name: "Valentina Guerrero O.", grade: 4 }), ROSTER);
report.check("Un dígito dudoso: vale solo si el nombre respalda a un único candidato (code-near, 65 %, revisar)", m.how === "code-near" && m.studentId === "20261189" && m.confidence === 65 && m.status === "needs-review", JSON.stringify(m));

m = matchReading(read({ code: "2026118?", code_clarity: "doubtful", name: "Pedro Pérez", grade: 4 }), ROSTER);
report.check("Un dígito dudoso sin nombre que lo respalde → sin estudiante (no se adivina)", m.how === "none" && m.studentId === null && m.status === "needs-review", JSON.stringify(m));

m = matchReading(read({ code: null, code_clarity: "unreadable", name: "Valentina Guerrero", grade: 2.9 }), ROSTER);
report.check("Sin código pero con nombre único → por nombre (60 %, revisar)", m.how === "name" && m.studentId === "20261189" && m.confidence === 60 && m.note.includes("solo por el nombre"), JSON.stringify(m));

m = matchReading(read({ code: null, code_clarity: "unreadable", name: "María", grade: 4 }), ROSTER);
report.check("Solo «María» con dos Marías en el curso → sin estudiante", m.how === "none", JSON.stringify(m));

m = matchReading(read({ code: "20269999", name: "Ana Torres", grade: 4 }), ROSTER);
report.check("Código y nombre de alguien que no es del curso → sin estudiante, con el código leído en la nota", m.how === "none" && m.note.includes("20269999"), m.note);

m = matchReading(read({ code: "20261175", name: "María Fernanda López", grade: null, grade_clarity: "unreadable" }), ROSTER);
report.check("Nota ilegible → estudiante identificado, sin nota detectada, para revisar", m.studentId === "20261175" && m.detected === null && m.confidence === null && m.status === "needs-review" && m.note.includes("No se pudo leer la nota"), JSON.stringify(m));

m = matchReading(read({ code: "20261175", name: "María López", grade: 4.2, grade_clarity: "doubtful" }), ROSTER);
report.check("Nota dudosa → 72 %, para revisar", m.confidence === 72 && m.status === "needs-review", JSON.stringify(m));

report.check("Escala: 45 → 4.5, 4,46 → 4.5, 7 → no válida, 0.5 → no válida",
  normalizeGrade(45) === 4.5 && normalizeGrade(4.46) === 4.5 && normalizeGrade(7) === null && normalizeGrade(0.5) === null);
report.check("Nombres: tildes y mayúsculas no importan; un apellido parcial cuenta", nameScore("MARIA FERNANDA LOPEZ", "María Fernanda López Rosero") === 1 && nameScore("Juan Martin", "Juan Sebastián Martínez Paz") === 1);

process.exit(report.print() ? 1 : 0);
