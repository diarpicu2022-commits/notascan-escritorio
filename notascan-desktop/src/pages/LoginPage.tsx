import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { cx } from "../lib/cx";
import type { DesktopRole } from "../data/roles";
import { Icon, type IconName } from "../components/atoms/Icon";
import { Logo } from "../components/atoms/Logo";
import { Toast } from "../components/organisms/Toast";
import { Modal } from "../components/organisms/Overlays";
import { LEGAL, LegalDocument } from "../components/organisms/LegalDocument";
import { Button, Dots } from "../components/atoms/Button";
import type { CodePurpose, LoginError } from "../app/AuthContext";

/** Ilustración propia del login: hoja de examen + teléfono escaneando, dentro de manchas orgánicas. */
function LoginIllustration() {
  return (
    <svg className="ns-auth-illus" viewBox="0 0 640 600" role="img" aria-label="Un teléfono escanea la hoja de un examen y detecta la nota 4.5">
      <path className="f-sage-soft a-blob a-blob1" d="M318 22c96-8 196 36 250 118 52 80 70 190 24 276-44 84-146 132-246 150-104 18-214-6-276-86C8 402-6 282 30 186 66 90 214 30 318 22Z" />
      <path className="f-sage a-blob a-blob2" d="M322 88c80-6 162 30 206 98 42 66 54 156 16 226-36 70-120 108-202 120-86 12-176-6-226-72-50-66-58-164-28-242C118 140 238 94 322 88Z" />
      <path className="f-ivory-deep a-blob a-blob3" d="M326 160c58-4 116 22 146 70 30 48 36 110 10 160-26 48-86 76-146 82-60 6-122-8-156-54-34-46-38-114-16-168 24-52 104-86 162-90Z" />
      <circle className="f-gold a-sun" cx={470} cy={170} r={62} />
      <circle className="f-sage-soft o-7 a-bub" cx={92} cy={110} r={26} />
      <circle className="f-sage-soft o-7 a-bub a-bub2" cx={574} cy={430} r={34} />
      <circle className="f-sage-soft o-7 a-bub a-bub3" cx={60} cy={470} r={18} />
      <circle className="f-gold-soft a-bub a-bub2" cx={548} cy={70} r={14} />
      <circle className="f-sage-soft o-7 a-bub a-bub3" cx={150} cy={560} r={12} />
      {/* hoja del examen */}
      <g className="a-paper" transform="rotate(-7 280 330)">
        <rect className="f-navy" x={176} y={186} width={214} height={280} rx={14} transform="translate(8 8)" />
        <rect className="f-paper s-navy" x={176} y={186} width={214} height={280} rx={14} />
        <rect className="f-navy" x={196} y={208} width={44} height={44} rx={4} />
        <rect className="f-paper" x={204} y={216} width={10} height={10} />
        <rect className="f-paper" x={222} y={230} width={10} height={10} />
        <rect className="f-paper" x={206} y={236} width={8} height={8} />
        <rect className="f-navy" x={252} y={212} width={96} height={8} rx={4} />
        <rect className="f-hair" x={252} y={230} width={64} height={6} rx={3} />
        {[276, 300, 324, 348, 372, 396, 420].map((y, i) => <rect key={y} className="f-hair" x={196} y={y} width={i % 3 === 2 ? 110 : 172} height={6} rx={3} />)}
        <path className="s-burgundy" d="M290 257c13-21 54-27 79-14 21 11 21 36 0 48-25 13-66 11-83-4-13-11-13-27 4-34" />
        <text className="t-hand" x={327} y={270} textAnchor="middle" dominantBaseline="central">4,5</text>
      </g>
      {/* lápiz */}
      <g className="a-pencil" transform="rotate(38 160 470)">
        <rect className="f-gold s-navy" x={110} y={458} width={110} height={22} rx={4} />
        <path className="f-paper s-navy" d="M220 458l26 11-26 11Z" />
        <rect className="f-burgundy s-navy" x={98} y={458} width={14} height={22} rx={4} />
      </g>
      {/* teléfono escaneando */}
      <g className="a-phone" transform="rotate(8 470 390)">
        <rect className="f-gold" x={404} y={262} width={150} height={262} rx={26} transform="translate(8 8)" />
        <rect className="f-navy" x={404} y={262} width={150} height={262} rx={26} />
        <rect className="f-ivory" x={416} y={290} width={126} height={206} rx={14} />
        <rect className="f-navy" x={458} y={272} width={42} height={8} rx={4} opacity={0.6} />
        <path className="s-gold-thick" d="M430 318v-14h14M528 304h14v14M542 400v14h-14M444 414h-14v-14" />
        <text className="t-grade" x={479} y={378} textAnchor="middle">4.5</text>
        <rect className="f-sage-soft s-sage" x={436} y={432} width={86} height={26} rx={13} />
        <text className="t-chip" x={479} y={450} textAnchor="middle">IA 98%</text>
        <rect className="ns-scanline" x={420} y={300} width={118} height={3} rx={1.5} />
      </g>
      {/* sello */}
      <g transform="translate(560 300)">
        <g className="a-seal">
          <circle className="f-sage s-navy" r={30} />
          <path className="s-paper-thick" d="M-12 0l8 9 16-18" />
        </g>
      </g>
    </svg>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: IconName;
  type: string;
  placeholder: string;
  auto: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  after?: ReactNode;
}

function AuthField({ id, label, icon, type, placeholder, auto, value, onChange, error, after }: FieldProps) {
  return (
    <div className={cx("ns-auth-field", error && "is-invalid")}>
      <label htmlFor={id}>{label}</label>
      <div className="ns-auth-input">
        <Icon name={icon} size={18} />
        <input id={id} type={type} value={value} placeholder={placeholder} autoComplete={auto} onChange={onChange}
          aria-invalid={error ? true : undefined} aria-describedby={error ? id + "-err" : undefined} />
        {after || null}
      </div>
      {error ? <span id={id + "-err"} className="ns-auth-error" role="alert"><Icon name="warning" size={14} />{error}</span> : null}
    </div>
  );
}

const ROLE_OPTIONS: Array<[DesktopRole, string]> = [["teacher", "Docente"], ["admin", "Secretaría"], ["principal", "Rectoría"]];

interface LoginPageProps {
  defaultRole?: DesktopRole;
  /** Modo demostración: entra al rol elegido sin cuenta, como el sistema. */
  onLogin?: (role: DesktopRole) => void;
  /** Modo normal: inicia sesión de verdad; devuelve el error que hay que mostrar o null. */
  onSubmit?: (data: { email: string; password: string; role: DesktopRole; remember: boolean }) => Promise<LoginError | null>;
  /** «¿Olvidaste tu contraseña?»: envía el correo de restablecimiento de Supabase. */
  onForgot?: (email: string) => Promise<LoginError | null>;
  /** Modo normal: verifica el código numérico (6 a 10 dígitos, según el proyecto) del correo (invitación o restablecimiento). */
  onAcceptCode?: (email: string, code: string, purpose: CodePurpose) => Promise<LoginError | null>;
  /** Modo normal: guarda la contraseña nueva y entra. */
  onSetPassword?: (password: string) => Promise<LoginError | null>;
}

/** Código del correo → contraseña nueva. Mismas piezas del formulario de acceso. */
function CodeFlow({ purpose, initialEmail, onAcceptCode, onSetPassword, onBack }: {
  purpose: CodePurpose; initialEmail: string; onBack: () => void;
  onAcceptCode: NonNullable<LoginPageProps["onAcceptCode"]>; onSetPassword: NonNullable<LoginPageProps["onSetPassword"]>;
}) {
  const [step, setStep] = useState<"code" | "password">("code");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<LoginError | null>(null);
  const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), okCode = /^\d{6,10}$/.test(code);
  const strong = pw.length >= 8 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(pw) && /\d/.test(pw);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true); setErr(null);
    if (step === "code") {
      if (!okEmail || !okCode) return;
      setBusy(true);
      const r = await onAcceptCode(email, code, purpose);
      setBusy(false);
      if (r) { setErr(r); return; }
      setStep("password"); setTried(false);
      return;
    }
    if (!strong || pw !== pw2) return;
    setBusy(true);
    const r = await onSetPassword(pw);
    setBusy(false);
    if (r) setErr(r);
  }
  const title = step === "password" ? "Crea tu contraseña" : purpose === "invite" ? "Activa tu cuenta" : "Restablece tu contraseña";
  return (
    <form className="ns-auth-form" onSubmit={submit} noValidate>
      <h2>{title}</h2>
      {step === "code" ? (
        <>
          <p className="ns-auth-note">{purpose === "invite" ? "Escribe el correo con el que te invitaron y el código numérico que te llegó." : "Escribe tu correo y el código numérico que te enviamos."}</p>
          <AuthField id="code-email" label="Correo institucional" icon="mail" type="email" placeholder="nombre@colegio.edu.co" auto="email"
            value={email} onChange={(e) => setEmail(e.target.value)} error={tried && !okEmail ? "Escribe tu correo completo." : err?.field === "email" ? err.message : null} />
          <AuthField id="code-token" label="Código del correo" icon="key" type="text" placeholder="12345678" auto="one-time-code"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            error={tried && !okCode ? "Escribe el código completo del correo." : err?.field === "code" ? err.message : null} />
        </>
      ) : (
        <>
          <p className="ns-auth-note">{"Código verificado para " + email.trim().toLowerCase() + ". Elige la contraseña con la que vas a entrar."}</p>
          <AuthField id="code-pass" label="Contraseña nueva" icon="lock" type={show ? "text" : "password"} placeholder="••••••••" auto="new-password"
            value={pw} onChange={(e) => setPw(e.target.value)}
            error={tried && !strong ? "Al menos 8 caracteres con letras y números." : err?.field === "newPassword" ? err.message : null}
            after={<button type="button" className="ns-auth-eye" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button>} />
          <AuthField id="code-pass2" label="Repite la contraseña" icon="lock" type={show ? "text" : "password"} placeholder="••••••••" auto="new-password"
            value={pw2} onChange={(e) => setPw2(e.target.value)} error={tried && strong && pw !== pw2 ? "Las contraseñas no coinciden." : null} />
        </>
      )}
      {err?.field === "form" ? <span className="ns-auth-error" role="alert"><Icon name="warning" size={14} />{err.message}</span> : null}
      <button type="submit" className="ns-auth-submit" aria-busy={busy || undefined} disabled={busy}>
        {busy ? <><Dots /> {step === "code" ? "Verificando…" : "Guardando…"}</> : <>{step === "code" ? "Continuar" : "Guardar y entrar"} <Icon name="arrow" size={18} /></>}
      </button>
      <p className="ns-auth-foot"><a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Volver a iniciar sesión</a></p>
    </form>
  );
}

/** Acceso de escritorio: pantalla dividida con ilustración del flujo y formulario en píldoras. */
export function LoginPage({ defaultRole = "teacher", onLogin, onSubmit, onForgot, onAcceptCode, onSetPassword }: LoginPageProps) {
  const [codeFlow, setCodeFlow] = useState<CodePurpose | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<DesktopRole>(defaultRole);
  const [serverErr, setServerErr] = useState<LoginError | null>(null);
  const [ssoMsg, setSsoMsg] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const remember = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const okEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), okPass = pass.length >= 6;
  const emailErr = tried && !okEmail ? "Escribe tu correo institucional completo." : serverErr?.field === "email" ? serverErr.message : null;
  const passErr = tried && !okPass ? "La contraseña tiene al menos 6 caracteres." : serverErr?.field === "password" ? serverErr.message : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    setServerErr(null);
    if (!okEmail || !okPass) return;
    setBusy(true);
    if (onSubmit) {
      const err = await onSubmit({ email, password: pass, role, remember: remember.current?.checked ?? true });
      setBusy(false);
      setServerErr(err);
      return;
    }
    // Modo demostración: se simula la espera del servidor.
    timer.current = window.setTimeout(() => { setBusy(false); onLogin?.(role); }, 900);
  }

  async function forgot() {
    setTried(true);
    setServerErr(null);
    if (!okEmail) return;
    const err = onForgot ? await onForgot(email) : null;
    if (err) setServerErr(err); else setSent(true);
  }

  return (
    <div className="ns ns-auth">
      <section className="ns-auth-art">
        <div className="ns-auth-brand"><Logo size={30} /></div>
        <LoginIllustration />
        <div className="ns-auth-steps">
          <span className="is-on">01</span><i /><span>03</span>
          <p>La IA detecta · <b>tú verificas</b> · el sistema guarda</p>
        </div>
      </section>
      <svg className="ns-auth-wave" viewBox="0 0 120 900" preserveAspectRatio="none" aria-hidden>
        <path d="M120 0H60C10 90 96 170 54 280 12 390 0 450 44 560c44 110 66 200 16 340h60Z" />
      </svg>
      <main className="ns-auth-panel">
        <div className="ns-auth-hello">
          <div className="ns-auth-mobile-brand"><Logo size={26} /></div>
          <h1>¡Hola<span>!</span></h1>
          <p>Bienvenido de nuevo a NotaScan.</p>
        </div>
        {codeFlow && onAcceptCode && onSetPassword ? (
          <CodeFlow purpose={codeFlow} initialEmail={email} onAcceptCode={onAcceptCode} onSetPassword={onSetPassword} onBack={() => setCodeFlow(null)} />
        ) : (
        <form className="ns-auth-form" onSubmit={submit} noValidate>
          <h2>Iniciar sesión</h2>
          <fieldset className="ns-auth-roles">
            <legend>Entrar como</legend>
            {ROLE_OPTIONS.map(([value, label]) => (
              <label key={value} className={cx("ns-auth-role", role === value && "is-on")}>
                <input type="radio" name="ns-role" value={value} checked={role === value} onChange={() => { setRole(value); setServerErr(null); }} />{label}
              </label>
            ))}
            {serverErr?.field === "role" ? <span className="ns-auth-error" role="alert"><Icon name="warning" size={14} />{serverErr.message}</span> : null}
          </fieldset>
          <AuthField id="auth-email" label="Correo institucional" icon="mail" type="email" placeholder="nombre@ucc.edu.co" auto="email"
            value={email} onChange={(e) => setEmail(e.target.value)} error={emailErr} />
          <AuthField id="auth-pass" label="Contraseña" icon="lock" type={show ? "text" : "password"} placeholder="••••••••" auto="current-password"
            value={pass} onChange={(e) => setPass(e.target.value)} error={passErr}
            after={<button type="button" className="ns-auth-eye" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show} onClick={() => setShow(!show)}><Icon name="eye" size={18} /></button>} />
          <div className="ns-auth-row">
            <label className="ns-auth-check"><input ref={remember} type="checkbox" defaultChecked />Recordarme</label>
            <a href="#" onClick={(e) => { e.preventDefault(); forgot(); }}>¿Olvidaste tu contraseña?</a>
          </div>
          {serverErr?.field === "form" ? <span className="ns-auth-error" role="alert"><Icon name="warning" size={14} />{serverErr.message}</span> : null}
          <button type="submit" className="ns-auth-submit" aria-busy={busy || undefined} disabled={busy}>
            {busy ? <><Dots /> Entrando…</> : <>Entrar <Icon name="arrow" size={18} /></>}
          </button>
          <div className="ns-auth-or"><span>o entra con</span></div>
          <button type="button" className="ns-auth-sso" onClick={() => (onSubmit ? setSsoMsg(true) : onLogin?.(role))}><Icon name="students" size={18} />Cuenta institucional</button>
          {ssoMsg ? <span className="ns-auth-error" role="alert"><Icon name="warning" size={14} />El acceso con cuenta institucional aún no está disponible. Entra con tu correo.</span> : null}
          <a className="ns-auth-mobile-link" href="#/movil"><Icon name="phone" size={16} />¿Eres estudiante o acudiente? Entra a la app móvil</a>
          {onAcceptCode
            ? <p className="ns-auth-foot">¿Te invitaron? <a href="#" onClick={(e) => { e.preventDefault(); setSent(false); setCodeFlow("invite"); }}>Activa tu cuenta con el código del correo</a></p>
            : <p className="ns-auth-foot">¿Primera vez? <a href="#" onClick={(e) => e.preventDefault()}>Solicita acceso a tu coordinación</a></p>}
          {/* Con la base (6g): la política de datos se puede leer antes de entrar. */}
          {onAcceptCode ? <p className="ns-auth-foot"><a href="#" onClick={(e) => { e.preventDefault(); setPolicyOpen(true); }}>Política de tratamiento de datos</a></p> : null}
        </form>
        )}
      </main>
      <Modal open={policyOpen} size="doc" onClose={() => setPolicyOpen(false)} icon="lock" title="Política de tratamiento de datos"
        actions={<Button variant="secondary" onClick={() => setPolicyOpen(false)} data-autofocus>Cerrar</Button>}>
        <div style={{ maxHeight: 420, overflowY: "auto", paddingRight: 8 }} tabIndex={0} aria-label="Texto de la política"><LegalDocument text={LEGAL.policy} /></div>
      </Modal>
      {sent ? (
        <div className="ns-toast-region">
          <Toast tone="info" title="Revisa tu correo"
            message={onAcceptCode
              ? <>{"Te enviamos un código a " + email.trim().toLowerCase() + ". "}<a href="#" onClick={(e) => { e.preventDefault(); setSent(false); setCodeFlow("recovery"); }}>Ya tengo el código</a></>
              : "Te enviamos un enlace a " + email.trim().toLowerCase() + " para elegir una contraseña nueva."}
            onClose={() => setSent(false)} />
        </div>
      ) : null}
    </div>
  );
}
