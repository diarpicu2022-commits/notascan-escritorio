import { QueryClient } from "@tanstack/react-query";
import { DEMO } from "../lib/supabase";

/**
 * Caché de datos de la app. Los datos se consideran frescos 30 s; al volver a la ventana se recargan.
 * Un fallo de red se reintenta una vez antes de mostrar el estado de error.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: !DEMO },
    mutations: { retry: 0 },
  },
});

/* ---------- Modo demostración: estados forzados para probar cada vista ----------
   #/admin/students?estado=cargando | error | vacio  (solo en --mode demo). */
export type ForcedState = "cargando" | "error" | "vacio" | null;

export function forcedState(): ForcedState {
  if (!DEMO) return null;
  const m = window.location.hash.match(/[?&]estado=(cargando|error|vacio)\b/);
  return (m?.[1] as ForcedState) ?? null;
}

/** Datos de demostración respetando el estado forzado. */
export function demoData<T>(data: T, empty: T): Promise<T> {
  const st = forcedState();
  if (st === "cargando") return new Promise<T>(() => { /* nunca termina: muestra la carga */ });
  if (st === "error") return Promise.reject(new Error("Error forzado (demostración)"));
  return Promise.resolve(st === "vacio" ? empty : data);
}

/** Datos iniciales en demo sin estado forzado: la pantalla pinta al instante, como el sistema. */
export function demoInitial<T>(data: T): T | undefined {
  return DEMO && !forcedState() ? data : undefined;
}

/** «hh:mm» para el aviso de dato viejo. */
export function clock(ms: number): string {
  const d = new Date(ms);
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

/** Todas las filas de una consulta, de 1000 en 1000 (el API de Supabase devuelve como máximo 1000 por petición). */
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<{ data: T[]; error: unknown }> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const r = await page(from, from + 999);
    if (r.error) return { data: out, error: r.error };
    const rows = (r.data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) return { data: out, error: null };
  }
}
