import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { queryClient } from "./client";
import type { SyncStatus } from "../types/domain";

/*
 * Cola sin conexión de la planilla (paso 6f). Las notas que no se pueden enviar se guardan en ESTE equipo
 * (localStorage, por docente), sobreviven a recargar o cerrar la app y se envían al volver la conexión o con
 * «Sincronizar ahora». De cada celda se guarda la última nota escrita. Si la base rechaza una por una regla
 * (p. ej. la evaluación se cerró), se quita de la cola y se dice cuál; si falla la red, se queda para otro intento.
 */

export interface QueuedGrade { studentId: string; column: string; value: number; label: string; at: string }

const keyOf = (uid: string) => "notascan.cola-planilla." + uid;
const lastKeyOf = (uid: string) => "notascan.ultima-sincronizacion." + uid;
export const cellKey = (studentId: string, column: string) => studentId + "|" + column;

function read<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento lleno o bloqueado: la cola sigue en memoria */ }
}

/** ¿El error es de red (sin conexión) y no una regla de la base? */
export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e ?? "");
  return /Failed to fetch|NetworkError|Load failed|network|fetch failed/i.test(m);
}

/** Guarda una nota de la planilla (la misma escritura que en línea; la firma de «verificada» la pone la base). */
export async function sendGrade(v: { studentId: string; column: string; value: number }) {
  const r = await supabase().from("grades").upsert(
    { evaluation_id: Number(v.column), student_id: v.studentId, value: v.value, status: "verified" },
    { onConflict: "evaluation_id,student_id" },
  );
  if (r.error) throw r.error;
}

const hhmm = (d: Date) => ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

export interface RealSync {
  sync: SyncStatus;
  setSync: (s: SyncStatus) => void;
  onSync: () => void;
  queue: QueuedGrade[];
  enqueue: (g: QueuedGrade) => void;
  /** Resultado de la última sincronización que no pudo guardar todo (o null). */
  notice: string | null;
}

/** Estado de conexión y cola del docente con sesión. */
export function useRealSync(userId: string | undefined): RealSync {
  const uid = userId ?? "anon";
  const [queue, setQueue] = useState<QueuedGrade[]>(() => read(keyOf(uid), []));
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [last, setLast] = useState<string>(() => read(lastKeyOf(uid), "—"));
  const [notice, setNotice] = useState<string | null>(null);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const flushing = useRef(false);

  // Otro docente en el mismo equipo: su propia cola.
  useEffect(() => { setQueue(read(keyOf(uid), [])); setLast(read(lastKeyOf(uid), "—")); }, [uid]);
  const persist = useCallback((items: QueuedGrade[]) => { queueRef.current = items; setQueue(items); write(keyOf(uid), items); }, [uid]);

  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine || !queueRef.current.length) return;
    flushing.current = true; setBusy(true); setFailed(false);
    const rejected: string[] = [];
    let networkDown = false;
    for (const item of [...queueRef.current]) {
      try {
        await sendGrade(item);
        persist(queueRef.current.filter((x) => cellKey(x.studentId, x.column) !== cellKey(item.studentId, item.column) || x.at !== item.at));
      } catch (e) {
        if (isNetworkError(e)) { networkDown = true; break; }
        rejected.push(item.label);
        persist(queueRef.current.filter((x) => cellKey(x.studentId, x.column) !== cellKey(item.studentId, item.column)));
      }
    }
    flushing.current = false; setBusy(false);
    if (networkDown) { setFailed(true); return; }
    const now = hhmm(new Date());
    setLast(now); write(lastKeyOf(uid), now);
    // Lo enviado ya es de la base: las vistas que leen notas se recargan.
    void queryClient.invalidateQueries({ queryKey: ["gradebook"] });
    void queryClient.invalidateQueries({ queryKey: ["review"] });
    setNotice(rejected.length ? "La base no aceptó " + (rejected.length === 1 ? "1 cambio" : rejected.length + " cambios") + " (evaluación cerrada o sin permiso): " + rejected.join("; ") + "." : null);
  }, [persist, uid]);

  useEffect(() => {
    const up = () => { setOnline(true); void flush(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    // Al abrir la app con cambios pendientes y conexión, se envían.
    if (navigator.onLine && queueRef.current.length) void flush();
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, [flush]);

  const enqueue = useCallback((g: QueuedGrade) => {
    persist(queueRef.current.filter((x) => cellKey(x.studentId, x.column) !== cellKey(g.studentId, g.column)).concat(g));
  }, [persist]);

  const status: SyncStatus["status"] = !online ? "offline" : busy ? "syncing" : failed ? "error" : "online";
  return useMemo(() => ({
    sync: { status, last, pending: queue.length },
    setSync: () => { /* con sesión real el estado sale de la conexión del equipo */ },
    onSync: () => { void flush(); },
    queue, enqueue, notice,
  }), [status, last, queue, enqueue, notice, flush]);
}
