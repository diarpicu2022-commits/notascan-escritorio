import type { ReviewStatus } from "../types/domain";

/** Lecturas simuladas de una evaluación (MOCK_ROWS de notascan-ui). Sin backend en esta fase. */
export interface ReviewRow {
  student: { name: string; id: string; course: string };
  detected: number;
  confidence: number;
  status?: ReviewStatus;
}

export const REVIEW_ROWS: ReviewRow[] = [
  { student: { name: "María Fernanda López", id: "20261045", course: "7A" }, detected: 4.5, confidence: 98, status: "verified" },
  { student: { name: "Juan Sebastián Martínez", id: "20261051", course: "7A" }, detected: 3.8, confidence: 62 },
  { student: { name: "Valentina Guerrero", id: "20261063", course: "7A" }, detected: 4.2, confidence: 94 },
  { student: { name: "Carlos Andrés Rodríguez", id: "20261070", course: "7A" }, detected: 2.9, confidence: 81 },
  { student: { name: "Laura Camila Benavides", id: "20261078", course: "7A" }, detected: 4.8, confidence: 97 },
  { student: { name: "Santiago Muñoz", id: "20261082", course: "7A" }, detected: NaN, confidence: 0 },
  { student: { name: "Daniela Alejandra Pantoja", id: "20261089", course: "7A" }, detected: 3.5, confidence: 91 },
  { student: { name: "Andrés Felipe Erazo", id: "20261094", course: "7A" }, detected: 4.0, confidence: 88 },
  { student: { name: "Isabella Chamorro", id: "20261101", course: "7A" }, detected: 1.9, confidence: 69 },
];
