import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Modo demostración (`vite build --mode demo`): datos simulados y sin Supabase. */
export const DEMO = import.meta.env.MODE === "demo";

/*
 * «Recordarme»: la sesión se guarda en localStorage (persiste al cerrar la app) o en sessionStorage
 * (se borra al cerrar la ventana). El login fija la preferencia antes de iniciar sesión.
 */
const REMEMBER_KEY = "notascan.remember";
export function setRemember(remember: boolean) {
  try { localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0"); } catch { /* sin almacenamiento: sesión en memoria */ }
}
const sessionStore = {
  getItem: (k: string) => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => {
    try {
      const keep = localStorage.getItem(REMEMBER_KEY) !== "0";
      (keep ? localStorage : sessionStorage).setItem(k, v);
      (keep ? sessionStorage : localStorage).removeItem(k);
    } catch { /* sin almacenamiento */ }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
};

let client: SupabaseClient | null = null;

/** Cliente único. Solo la clave publicable: los datos los protege RLS en la base. */
export function supabase(): SupabaseClient {
  if (DEMO) throw new Error("Supabase no se usa en modo demostración.");
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local.");
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storage: sessionStore } });
  }
  return client;
}
