import { createContext, useContext } from "react";
import type { DesktopRole } from "../data/roles";

/** Rol activo y navegación, para que cada página monte su marco (ShellCtx del sistema). */
export interface ShellState {
  role: DesktopRole;
  navigate: (page: string, params?: { id?: string; tab?: string }) => void;
  logout: () => void;
}

export const ShellContext = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell fuera de ShellContext");
  return ctx;
}
