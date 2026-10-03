import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isDesktopRole, type DesktopRole } from "../data/roles";
import { DEMO, setRemember, supabase } from "../lib/supabase";

export interface Profile { id: string; email: string; fullName: string; role: DesktopRole }

/** Errores del login con el texto que ve la persona y el campo donde va. */
export interface LoginError { field: "email" | "password" | "role" | "form"; message: string }

interface AuthState {
  status: "loading" | "signed-out" | "signed-in";
  profile: Profile | null;
  signIn: (email: string, password: string, role: DesktopRole, remember: boolean) => Promise<LoginError | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<LoginError | null>;
}

const ROLE_NAME: Record<DesktopRole, string> = { teacher: "Docente", admin: "Secretaría", principal: "Rectoría" };

const AuthContext = createContext<AuthState | null>(null);

/** Deja constancia del último acceso (lo ve Secretaría en Usuarios). Si falla, no interrumpe la sesión. */
function touchLastSeen() {
  supabase().rpc("touch_last_seen").then(() => undefined, () => undefined);
}

async function loadProfile(): Promise<Profile | null> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await sb.from("profiles").select("id, email, full_name, role, status").eq("id", auth.user.id).single();
  if (error || !data || data.status !== "active" || !isDesktopRole(data.role)) return null;
  return { id: data.id, email: data.email, fullName: data.full_name, role: data.role };
}

/**
 * Sesión de la app. En modo normal viene de Supabase Auth y el rol del perfil (tabla profiles).
 * En modo demostración no hay sesión real: el rol lo da la ruta, como en el sistema.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>(DEMO ? "signed-out" : "loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  // Mientras signIn valida el rol, el evento SIGNED_IN de Supabase no debe dar la sesión por buena:
  // si lo hiciera, la app redirigiría y desmontaría el login antes de mostrar el error.
  const signingIn = useRef(false);

  useEffect(() => {
    if (DEMO) return;
    let alive = true;
    const refresh = async () => {
      const p = await loadProfile().catch(() => null);
      if (!alive) return;
      setProfile(p);
      setStatus(p ? "signed-in" : "signed-out");
      if (p) touchLastSeen();
    };
    refresh();
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (signingIn.current) return;
      if (event === "SIGNED_OUT") { setProfile(null); setStatus("signed-out"); } else if (event === "SIGNED_IN" || event === "USER_UPDATED") refresh();
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);

  const signIn = useCallback<AuthState["signIn"]>(async (email, password, role, remember) => {
    setRemember(remember);
    signingIn.current = true;
    try {
      return await doSignIn(email, password, role);
    } finally {
      signingIn.current = false;
    }
  }, []);

  const doSignIn = async (email: string, password: string, role: DesktopRole): Promise<LoginError | null> => {
    const sb = supabase();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (/invalid login credentials/i.test(error.message)) return { field: "password", message: "Correo o contraseña incorrectos." };
      if (/email not confirmed/i.test(error.message)) return { field: "email", message: "Confirma tu correo antes de entrar." };
      return { field: "form", message: "No pudimos conectar con NotaScan. Revisa tu conexión e inténtalo de nuevo." };
    }
    const p = await loadProfile().catch(() => null);
    if (!p) {
      await sb.auth.signOut();
      return { field: "email", message: "Tu cuenta no tiene acceso a la app de escritorio. Solicita acceso a tu coordinación." };
    }
    if (p.role !== role) {
      await sb.auth.signOut();
      return { field: "role", message: "Tu cuenta está registrada como " + ROLE_NAME[p.role] + "." };
    }
    setProfile(p);
    setStatus("signed-in");
    touchLastSeen();
    return null;
  };

  const signOut = useCallback(async () => {
    if (!DEMO) await supabase().auth.signOut();
    setProfile(null);
    setStatus("signed-out");
  }, []);

  const resetPassword = useCallback<AuthState["resetPassword"]>(async (email) => {
    if (DEMO) return null;
    const { error } = await supabase().auth.resetPasswordForEmail(email.trim().toLowerCase());
    return error ? { field: "form", message: "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos." } : null;
  }, []);

  const value = useMemo(() => ({ status, profile, signIn, signOut, resetPassword }), [status, profile, signIn, signOut, resetPassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}

export { ROLE_NAME };
