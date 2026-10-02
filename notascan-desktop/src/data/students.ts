import type { Student } from "../types/domain";

/**
 * Datos simulados de notascan-ui: 72 estudiantes en 6A–8B, generados con la misma
 * semilla que el sistema para que los nombres e IDs coincidan en ambas versiones.
 */
const FIRST = ["María Fernanda", "Juan Sebastián", "Valentina", "Carlos Andrés", "Laura Camila", "Santiago", "Daniela Alejandra", "Andrés Felipe", "Isabella", "Sebastián", "Sara Lucía", "Mateo", "Gabriela", "Nicolás", "Mariana", "Samuel", "Luciana", "Tomás", "Antonella", "Emiliano", "Valeria", "Juan José", "Salomé", "David Esteban"];
const LAST = ["López", "Martínez", "Guerrero", "Rodríguez", "Benavides", "Muñoz", "Pantoja", "Erazo", "Chamorro", "Delgado", "Ortiz", "Burbano", "Rosero", "Villota", "Cabrera", "Ordóñez", "Insuasty", "Bravo", "Narváez", "Enríquez", "Paz", "Zambrano", "Riascos", "Mora"];
export const COURSES = ["6A", "6B", "7A", "7B", "8A", "8B"];

export interface StudentRecord extends Student {
  subjectsPassed: number;
  library: boolean;
  fees: boolean;
  documents: boolean;
}

export function seeded(i: number): number {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export const ALL_STUDENTS: StudentRecord[] = (() => {
  const out: StudentRecord[] = [];
  let n = 0;
  COURSES.forEach((c, ci) => {
    for (let k = 0; k < 12; k++) {
      let f = FIRST[(k * 2 + ci * 4) % FIRST.length];
      let l1 = LAST[(k * 5 + ci * 7) % LAST.length];
      let l2 = LAST[(k * 11 + ci * 3 + 13) % LAST.length];
      if (l2 === l1) l2 = LAST[(k * 11 + ci * 3 + 14) % LAST.length];
      if (ci === 2 && k === 0) { f = "María Fernanda"; l1 = "López"; l2 = "Rosero"; }
      if (ci === 2 && k === 1) { f = "Juan Sebastián"; l1 = "Martínez"; l2 = "Paz"; }
      const r = seeded(++n);
      const r2 = seeded(n * 31 + 7), r3 = seeded(n * 17 + 3);
      const avg = Math.round((2.7 + r * 2.2) * 10) / 10;
      const status = n % 23 === 0 ? "retired" : n % 17 === 0 ? "archived" : n % 11 === 0 ? "pending" : "active";
      out.push({
        id: String(20261000 + n * 7), name: f + " " + l1 + " " + l2, first: f, last: l1 + " " + l2,
        document: "TI " + (1084000000 + Math.round(r * 899999)), docType: "Tarjeta de identidad",
        grade: c.charAt(0), course: c, guardian: (k % 2 ? "Gloria " : "Jorge ") + l1, guardianRel: k % 2 ? "Madre" : "Padre",
        guardianPhone: "31" + (2000000 + Math.round(r * 7999999)), status,
        enrolled: (1 + (n % 27)) + " ene 2026", avg, attendance: Math.round(86 + r * 14), subjectsPassed: avg >= 3 ? 6 : Math.max(2, Math.round(r * 6)),
        library: r2 > 0.05, fees: r3 > 0.09, documents: seeded(n * 5 + 1) > 0.06,
      });
    }
  });
  return out;
})();

export function findStudent(id?: string): StudentRecord {
  return ALL_STUDENTS.find((s) => s.id === id) ?? ALL_STUDENTS[24];
}
