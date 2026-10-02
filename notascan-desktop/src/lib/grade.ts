/**
 * Reglas de dominio de NotaScan, portadas tal cual de notascan-ui (js/notascan.js).
 * La escala 1.0–5.0 y los umbrales de confianza son del sistema: no se reescriben.
 */
import type { ConfidenceLevel, GradeCheck, ReviewStatus } from "../types/domain";

export const GRADE_MIN = 1;
export const GRADE_MAX = 5;

export function parseGrade(v: unknown): number {
  if (typeof v === "number") return v;
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  return parseFloat(s);
}

export function validateGrade(v: unknown): GradeCheck {
  const n = parseGrade(v);
  if (String(v).trim() === "") return { valid: false, value: NaN, message: "Escribe una calificación." };
  if (isNaN(n) || n < GRADE_MIN || n > GRADE_MAX) return { valid: false, value: n, message: "La calificación debe estar entre 1.0 y 5.0." };
  return { valid: true, value: Math.round(n * 10) / 10, message: "" };
}

export function formatGrade(n: number): string {
  return isNaN(n) ? "—" : (Math.round(n * 10) / 10).toFixed(1);
}

/** ≥90 alta · 75–89 media · <75 baja. */
export function confidenceLevel(pct: number): ConfidenceLevel {
  return pct >= 90 ? "high" : pct >= 75 ? "medium" : "low";
}

export const LEVEL_LABEL: Record<ConfidenceLevel, string> = { high: "Alta confianza", medium: "Confianza media", low: "Baja confianza" };
export const STATUS_LABEL: Record<ReviewStatus, string> = { pending: "Pendiente de revisión", verified: "Verificada", "needs-review": "Requiere revisión" };
