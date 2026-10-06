import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { DesktopRole } from "../data/roles";
import { CardCheck } from "../dev/CardCheck";
import { ComponentsCheck } from "../dev/ComponentsCheck";
import { TokenCheck } from "../dev/TokenCheck";
import { IdentityCheck } from "../dev/IdentityCheck";
import { LoginPage } from "../pages/LoginPage";
import { StudentProfilePage } from "../pages/StudentProfilePage";
import { AnalyticsPage, ObserverPage, PrincipalDashboardPage, RequestsPage, TeacherMonitoringPage } from "../pages/principal/PrincipalPages";
import {
  AcademicStructurePage, AdminDashboardPage, ClearancesPage, CurriculumPage, EnrollmentPage, PeriodsPage, RankingPage, ReportCardsPage,
  StudentsAdminPage, UsersPage,
} from "../pages/admin/AdminPages";
import { AttendancePage, BehaviorPage, ConceptsPage, GradebookPage, RecoveriesPage } from "../pages/teacher/ClassroomPages";
import { DashboardPage } from "../pages/teacher/DashboardPage";
import { GradeReviewDashboard, UploadPage } from "../pages/teacher/GradingPages";
import { ReportsPage } from "../pages/teacher/ListPages";
import { EvaluationsPage, StudentsPage } from "../pages/teacher/RosterPages";
import { PlatformSchoolPage, PlatformSchoolsPage } from "../pages/platform/PlatformPages";
import type { SyncStatus } from "../types/domain";
import { hrefFor, parseHash, type Route } from "./router";
import { ShellContext } from "./ShellContext";
import { SyncContext } from "./SyncContext";
import { useRealSync } from "../services/offlineQueue";
import { ConsentGate } from "../components/organisms/ConsentGate";
import { useAuth } from "./AuthContext";
import { DEMO } from "../lib/supabase";
import { ForbiddenPage } from "../pages/ForbiddenPage";

function hhmm(d: Date) {
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

/** La revisión no lee pestañas: abre la evaluación de la ruta (#/teacher/review/<id>) o la primera en revisión. */
const ReviewPage = ({ id }: { id?: string }) => <GradeReviewDashboard evaluationId={id} />;

/** Pantallas de cada rol (NotaScanApp del sistema). */
const PAGES: Record<DesktopRole, Record<string, ComponentType<{ tab?: string; id?: string }>>> = {
  teacher: {
    dashboard: DashboardPage, grades: UploadPage, review: ReviewPage, evaluations: EvaluationsPage, gradebook: GradebookPage,
    concepts: ConceptsPage, recoveries: RecoveriesPage, attendance: AttendancePage, behavior: BehaviorPage, students: StudentsPage, reports: ReportsPage,
  },
  admin: {
    dashboard: AdminDashboardPage, students: StudentsAdminPage, enrollment: EnrollmentPage, users: UsersPage, structure: AcademicStructurePage,
    curriculum: CurriculumPage, periods: PeriodsPage, reportcards: ReportCardsPage, clearances: ClearancesPage, ranking: RankingPage,
  },
  principal: {
    dashboard: PrincipalDashboardPage, analytics: AnalyticsPage, teachers: TeacherMonitoringPage, requests: RequestsPage,
    students: StudentsAdminPage, observer: ObserverPage, reports: ReportsPage,
  },
  platform: { dashboard: PlatformSchoolsPage, school: PlatformSchoolPage },
};

/** Cambia la ruta después de pintar (nunca durante el render). */
function Redirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return null;
}

/** Raíz de la app de escritorio (NotaScanApp del sistema, solo roles de escritorio). */
export function App() {
  const auth = useAuth();
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [sync, setSync] = useState<SyncStatus>({ status: "online", last: "08:42", pending: 0 });
  const syncTimer = useRef<number>();

  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => { window.removeEventListener("hashchange", on); window.clearTimeout(syncTimer.current); };
  }, []);

  const realSync = useRealSync(auth.profile?.id);
  const demoSync = useMemo(() => ({
    sync, setSync,
    onSync: () => {
      setSync((s) => ({ ...s, status: "syncing" }));
      // Sin backend en esta fase: se simula la sincronización.
      syncTimer.current = window.setTimeout(() => setSync({ status: "online", last: hhmm(new Date()), pending: 0 }), 1200);
    },
  }), [sync]);
  // Con sesión real, la conexión y la cola son las del equipo (paso 6f); en demostración, la simulación del sistema.
  const syncValue = DEMO ? demoSync : realSync;

  // Vistas de verificación: solo en modo demostración (nunca en el build normal).
  if (route.kind === "dev" && DEMO) return route.view === "tokens" ? <TokenCheck /> : route.view === "components" ? <ComponentsCheck /> : route.view === "identity" ? <IdentityCheck /> : <CardCheck />;

  // ---------- Sesión ----------
  if (!DEMO && auth.status === "loading") return null;
  const sessionRole = DEMO ? null : auth.profile?.role ?? null;
  if (route.kind !== "app" || (!DEMO && !sessionRole)) {
    if (!DEMO && sessionRole) return <Redirect to={hrefFor(sessionRole, "dashboard")} />;
    if (route.kind === "app") return <Redirect to="#/login" />;
    return DEMO
      ? <LoginPage onLogin={(role) => { window.location.hash = hrefFor(role, "dashboard"); }} />
      : <LoginPage
          onSubmit={async ({ email, password, role, remember }) => {
            const r = await auth.signIn(email, password, role, remember);
            if (!r.error) window.location.hash = hrefFor(r.role, "dashboard");
            return r.error;
          }}
          onForgot={auth.resetPassword}
          onAcceptCode={auth.acceptCode}
          onSetPassword={async (password) => {
            const r = await auth.setNewPassword(password);
            if (!r.error && r.role) window.location.hash = hrefFor(r.role, "dashboard");
            return r.error;
          }}
        />;
  }

  const { page } = route;
  // Con sesión real el rol es el del perfil; una ruta de otro rol muestra «Sin permiso» en tu propio marco.
  const role = sessionRole ?? route.role;
  const forbidden = !!sessionRole && route.role !== sessionRole;
  const navigate = (p: string, params?: { id?: string; tab?: string }) => { window.location.hash = hrefFor(role, p, params); };
  const shell = { role, navigate, logout: () => { auth.signOut().finally(() => { window.location.hash = "#/login"; }); } };

  let content;
  if (forbidden) {
    content = <ForbiddenPage sectionRole={route.role} />;
  } else if (page === "profile") {
    // Corrección de comportamiento (anexo): el sistema solo leía ?tab= al montar; aquí cambiar de
    // estudiante o de pestaña desde la ruta (p. ej. desde Ctrl+K) vuelve a abrir la pestaña pedida.
    content = <StudentProfilePage key={route.id + "?" + (route.params.tab || "")} studentId={route.id} tab={route.params.tab} />;
  } else {
    // Como el sistema: una página desconocida del rol cae en su dashboard.
    const Page = PAGES[role][page] || PAGES[role].dashboard;
    // Corrección de comportamiento (anexo): el sistema no pasaba ?tab= a las páginas; aquí sí,
    // para que «Importar estudiantes» abra la pestaña de importación.
    content = <Page key={page + "/" + (route.id || "") + "?" + (route.params.tab || "")} tab={route.params.tab} id={route.id} />;
  }

  return (
    <SyncContext.Provider value={syncValue}>
      <ShellContext.Provider value={shell}>{content}{DEMO ? null : <ConsentGate onLogout={shell.logout} />}</ShellContext.Provider>
    </SyncContext.Provider>
  );
}
