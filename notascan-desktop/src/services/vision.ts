import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/*
 * Subir fotografías (paso 6d): cada foto se reduce en el equipo, se guarda en la carpeta privada del docente
 * (bucket exam-photos) y la función read-exam la lee con Claude Haiku 4.5. La clave del servicio nunca está en la app.
 */

export interface ExamResult {
  saved: boolean;
  studentId: string | null;
  studentName: string | null;
  how: "code" | "code-near" | "name" | "none";
  detected: number | null;
  confidence: number | null;
  status: "pending" | "needs-review";
  note: string;
  reading: { code: string | null; name: string | null };
}

/** Lado mayor recomendado para imágenes de entrada: más píxeles no mejoran la lectura y cuestan más. */
const MAX_SIDE = 1568;

/** Reduce la foto a JPEG (lado mayor 1568 px); si ya es pequeña, solo la recomprime. */
export async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.85));
}

/** Mensaje de la función para la persona (sus errores ya vienen escritos para el docente). */
async function functionMessage(e: unknown): Promise<string> {
  if (e instanceof FunctionsHttpError) {
    try { const body = await e.context.json(); if (body?.error) return String(body.error); } catch { /* sin cuerpo */ }
  }
  return "No pudimos leer la foto. Revisa tu conexión e inténtalo de nuevo.";
}

/** Sube una foto a la carpeta del docente y la manda a leer. */
export async function readExamPhoto(userId: string, evaluationId: number, file: File, n: number): Promise<ExamResult> {
  const sb = supabase();
  let blob: Blob;
  try { blob = await shrink(file); } catch { throw new Error("Ese archivo no es una imagen que se pueda leer (usa JPG o PNG)."); }
  const path = userId + "/" + evaluationId + "/" + Date.now() + "-" + n + ".jpg";
  const up = await sb.storage.from("exam-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (up.error) throw new Error("No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.");
  const { data, error } = await sb.functions.invoke("read-exam", { body: { evaluation_id: evaluationId, photo_path: path } });
  if (error) throw new Error(await functionMessage(error));
  return data as ExamResult;
}
