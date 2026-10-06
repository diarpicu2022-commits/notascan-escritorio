// NotaScan · a quién pertenece una foto de examen (paso 6d, 2026-10-06). Lógica pura (sin Deno ni red) para poder
// probarla aparte. Decisión de Diego: el estudiante escribe su código estudiantil completo (8 dígitos) y su nombre;
// el código manda y el nombre se compara SIEMPRE, para detectar también un código claro pero equivocado.
// El modelo solo lee; quién es el estudiante lo decide este código contra la lista del curso.

export type Clarity = "clear" | "doubtful" | "unreadable";

/** Lo que el modelo leyó en la hoja. `code` trae «?» en cada dígito que no se entiende. */
export interface Reading {
  code: string | null;
  code_clarity: Clarity;
  name: string | null;
  grade: number | null;
  grade_clarity: Clarity;
}

export interface RosterEntry { id: string; name: string }

export interface MatchResult {
  studentId: string | null;
  studentName: string | null;
  /** code: código exacto · code-near: un dígito dudoso o distinto · name: solo por el nombre · none: sin estudiante. */
  how: "code" | "code-near" | "name" | "none";
  /** ¿El nombre escrito coincide con el del estudiante elegido? null si no se escribió nombre. */
  nameAgrees: boolean | null;
  detected: number | null;
  confidence: number | null;
  status: "pending" | "needs-review";
  note: string;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-zñ\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);

/** Parte del nombre escrito que aparece en el nombre de la lista (palabra igual o que empieza igual, 4+ letras). */
export function nameScore(written: string | null, listed: string): number {
  const a = norm(written ?? ""), b = norm(listed);
  if (!a.length) return 0;
  const hit = (w: string) => b.some((x) => x === w || (w.length >= 4 && (x.startsWith(w) || w.startsWith(x)) && x.length >= 4));
  return a.filter(hit).length / a.length;
}

const agrees = (written: string | null, listed: string) => (norm(written ?? "").length ? nameScore(written, listed) >= 0.5 : null);

/** Dígitos distintos entre dos códigos del mismo largo («?» cuenta como distinto). */
function distance(read: string, id: string): number {
  if (read.length !== id.length) return Infinity;
  let d = 0;
  for (let i = 0; i < read.length; i++) if (read[i] !== id[i]) d++;
  return d;
}

/** Nota válida de la escala colombiana 1.0–5.0 con un decimal; «45» se entiende como 4.5. */
export function normalizeGrade(g: number | null): number | null {
  if (g === null || !isFinite(g)) return null;
  let v = g;
  if (v > 5 && v <= 50 && Number.isInteger(v)) v = v / 10;
  v = Math.round(v * 10) / 10;
  return v >= 1 && v <= 5 ? v : null;
}

export function matchReading(r: Reading, roster: RosterEntry[]): MatchResult {
  const detected = r.grade_clarity === "unreadable" ? null : normalizeGrade(r.grade);
  const gradeConf = detected === null ? null : r.grade_clarity === "clear" ? 96 : 72;
  const code = (r.code ?? "").replace(/[^0-9?]/g, "");
  let pick: RosterEntry | undefined, how: MatchResult["how"] = "none";

  const exact = code && !code.includes("?") ? roster.find((s) => s.id === code) : undefined;
  if (exact) { pick = exact; how = "code"; }
  else if (code.length >= 6) {
    const near = roster.filter((s) => distance(code, s.id) <= 1);
    // Un dígito dudoso: solo vale si hay un único candidato y el nombre lo respalda.
    const backed = near.filter((s) => agrees(r.name, s.name) === true);
    if (backed.length === 1) { pick = backed[0]; how = "code-near"; }
  }
  if (!pick) {
    const scored = roster.map((s) => ({ s, v: nameScore(r.name, s.name) })).filter((x) => x.v >= 0.6).sort((a, b) => b.v - a.v);
    if (scored.length && (scored.length === 1 || scored[0].v > scored[1].v)) { pick = scored[0].s; how = "name"; }
  }

  if (!pick) {
    return { studentId: null, studentName: null, how, nameAgrees: null, detected, confidence: gradeConf, status: "needs-review",
      note: code ? "El código " + code + " no es de un estudiante del curso" + (r.name ? " y el nombre «" + r.name + "» tampoco coincide." : ".") : "No se leyó el código del estudiante." };
  }
  const nameOk = agrees(r.name, pick.name);
  let confidence = gradeConf;
  const notes: string[] = [];
  if (how === "code" && nameOk === false) { confidence = Math.min(confidence ?? 60, 60); notes.push("El nombre escrito («" + r.name + "») no coincide con el del código."); }
  if (how === "code" && nameOk === null) notes.push("Sin nombre escrito para confirmar el código.");
  if (how === "code-near") { confidence = Math.min(confidence ?? 65, 65); notes.push("Un dígito del código no se leyó bien; se confirmó con el nombre."); }
  if (how === "name") { confidence = Math.min(confidence ?? 60, 60); notes.push("Identificado solo por el nombre: el código no se leyó."); }
  if (detected === null) notes.push(r.grade_clarity === "unreadable" ? "No se pudo leer la nota." : "La nota leída no está entre 1.0 y 5.0.");
  else if (r.grade_clarity === "doubtful") notes.push("La nota se leyó con dudas.");
  const clean = how === "code" && nameOk !== false && detected !== null && (confidence ?? 0) >= 80;
  return { studentId: pick.id, studentName: pick.name, how, nameAgrees: nameOk, detected, confidence, status: clean ? "pending" : "needs-review", note: notes.join(" ") };
}
