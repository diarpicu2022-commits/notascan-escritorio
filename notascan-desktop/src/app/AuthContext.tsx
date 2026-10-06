import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isDesktopRole, type DesktopRole } from "../data/roles";
import { DEMO, setRemember, supabase } from "../lib/supabase";

export interface Profile { id: string; email: string; fullName: string; role: DesktopRole }

/** Errores del login con el texto que ve la persona y el campo donde va. */
export interface LoginError { field: "email" | "password" | "role" | "form" | "code" | "newPassword"; message: string }

/** Para qué es el código del correo: activar una invitación o restablecer la contraseña. */
export type CodePurpose = "invite" | "recovery";

interface AuthState {
  status: "loading" | "signed-out" | "signed-in";
  profile: Profile | null;
  /** Devuelve el error para el formulario o el rol con el que entró (la plataforma no está en el selector). */
  signIn: (email: string, password: string, role: DesktopRole, remember: boolean) => Promise<{ error: LoginError | null; role: DesktopRole }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<LoginError | null>;
  /** Verifica el código numérico del correo. La sesión queda abierta solo para crear la contraseña. */
  acceptCode: (email: string, code: string, purpose: CodePurpose) => Promise<LoginError | null>;
  /** Guarda la contraseña nueva y entra con el rol del perfil. */
  setNewPassword: (password: string) => Promise<{ error: LoginError | null; role: DesktopRole | null }>;
}

const ROLE_NAME: Record<DesktopRole, string> = { teacher: "Docente", admin: "Secretaría", principal: "Rectoría", platform: "Plataforma" };

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

  const doSignIn = async (email: string, password: string, role: DesktopRole): Promise<{ error: LoginError | null; role: DesktopRole }> => {
    const fail = (error: LoginError) => ({ error, role });
    const sb = supabase();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      if (/invalid login credentials/i.test(error.message)) return fail({ field: "password", message: "Correo o contraseña incorrectos." });
      if (/email not confirmed/i.test(error.message)) return fail({ field: "email", message: "Confirma tu correo antes de entrar." });
      return fail({ field: "form", message: "No pudimos conectar con NotaScan. Revisa tu conexión e inténtalo de nuevo." });
    }
    const p = await loadProfile().catch(() => null);
    if (!p) {
      await sb.auth.signOut();
      return fail({ field: "email", message: "Tu cuenta no tiene acceso a la app de escritorio. Solicita acceso a tu coordinación." });
    }
    // La plataforma no está entre las opciones de «Entrar como»: entra con cualquiera.
    if (p.role !== role && p.role !== "platform") {
      await sb.auth.signOut();
      return fail({ field: "role", message: "Tu cuenta está registrada como " + ROLE_NAME[p.role] + "." });
    }
    setProfile(p);
    setStatus("signed-in");
    touchLastSeen();
    return { error: null, role: p.role };
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

  const acceptCode = useCallback<AuthState["acceptCode"]>(async (email, code, purpose) => {
    // Mientras la persona no crea su contraseña, el evento SIGNED_IN no la lleva al inicio.
    signingIn.current = true;
    const sb = supabase();
    const e = email.trim().toLowerCase(), token = code.replace(/\D/g, "");
    // Una invitación reenviada llega como código de acceso («email»); la primera, como «invite».
    const types: Array<"invite" | "email" | "recovery"> = purpose === "recovery" ? ["recovery"] : ["invite", "email"];
    let last = "";
    for (const type of types) {
      const r = await sb.auth.verifyOtp({ email: e, token, type });
      if (!r.error) return null;
      last = r.error.message;
    }
    signingIn.current = false;
    return /expired|invalid|not found/i.test(last)
      ? { field: "code", message: "El código no es válido o ya venció. Pide uno nuevo." }
      : { field: "form", message: "No pudimos conectar con NotaScan. Revisa tu conexión e inténtalo de nuevo." };
  }, []);

  const setNewPassword = useCallback<AuthState["setNewPassword"]>(async (password) => {
    const sb = supabase();
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      return { error: /weak|short|characters/i.test(error.message)
        ? { field: "newPassword", message: "Elige una contraseña más segura: al menos 8 caracteres con letras y números." }
        : { field: "form", message: "No pudimos guardar la contraseña. Revisa tu conexión e inténtalo de nuevo." }, role: null };
    }
    const p = await loadProfile().catch(() => null);
    signingIn.current = false;
    if (!p) {
      await sb.auth.signOut();
      return { error: { field: "form", message: "Tu contraseña quedó guardada, pero tu cuenta aún no tiene acceso. Habla con tu coordinación." }, role: null };
    }
    setProfile(p);
    setStatus("signed-in");
    touchLastSeen();
    return { error: null, role: p.role };
  }, []);

  const value = useMemo(() => ({ status, profile, signIn, signOut, resetPassword, acceptCode, setNewPassword }), [status, profile, signIn, signOut, resetPassword, acceptCode, setNewPassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}

export { ROLE_NAME };
