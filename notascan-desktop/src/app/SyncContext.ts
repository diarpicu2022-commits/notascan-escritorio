import { createContext, useContext } from "react";
import type { SyncStatus } from "../types/domain";
import type { QueuedGrade } from "../services/offlineQueue";

/** Estado de sincronización del docente, compartido entre páginas (ShellCtx del sistema). */
export interface SyncState {
  sync: SyncStatus;
  setSync: (s: SyncStatus) => void;
  onSync: () => void;
  /** Con sesión real: cola persistente de la planilla (paso 6f). En demostración no existe. */
  queue?: QueuedGrade[];
  enqueue?: (g: QueuedGrade) => void;
  notice?: string | null;
}

export const SyncContext = createContext<SyncState | null>(null);

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync fuera de SyncContext");
  return ctx;
}
