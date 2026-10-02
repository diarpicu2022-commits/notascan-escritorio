import { createContext, useContext } from "react";
import type { SyncStatus } from "../types/domain";

/** Estado de sincronización del docente, compartido entre páginas (ShellCtx del sistema). */
export interface SyncState {
  sync: SyncStatus;
  setSync: (s: SyncStatus) => void;
  onSync: () => void;
}

export const SyncContext = createContext<SyncState | null>(null);

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync fuera de SyncContext");
  return ctx;
}
