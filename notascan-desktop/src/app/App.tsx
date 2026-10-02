import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { DesktopRole } from "../data/roles";
import { CardCheck } from "../dev/CardCheck";
import { ComponentsCheck } from "../dev/ComponentsCheck";
import { TokenCheck } from "../dev/TokenCheck";
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
import { EvaluationsPage, ReportsPage, StudentsPage } from "../pages/teacher/ListPages";
import type { SyncStatus } from "../types/domain";
import { hrefFor, parseHash, type Route } from "./router";
import { ShellContext } from "./ShellContext";
import { SyncContext } from "./SyncContext";

function hhmm(d: Date) {
  return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

/** La revisión no lee pestañas de la ruta: se monta sin props. */
const ReviewPage = () => <GradeReviewDashboard />;

/** Pantallas de cada rol (NotaScanApp del sistema). */
const PAGES: Record<DesktopRole, Record<string, ComponentType<{ tab?: string }>>> = {
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
};

/** Raíz de la app de escritorio (NotaScanApp del sistema, solo roles de escritorio). */
export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [sync, setSync] = useState<SyncStatus>({ status: "online", last: "08:42", pending: 0 });
  const syncTimer = useRef<number>();

  useEffect(() => {
    const on = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => { window.removeEventListener("hashchange", on); window.clearTimeout(syncTimer.current); };
  }, []);

  const syncValue = useMemo(() => ({
    sync, setSync,
    onSync: () => {
      setSync((s) => ({ ...s, status: "syncing" }));
      // Sin backend en esta fase: se simula la sincronización.
      syncTimer.current = window.setTimeout(() => setSync({ status: "online", last: hhmm(new Date()), pending: 0 }), 1200);
    },
  }), [sync]);

  if (route.kind === "dev") return route.view === "tokens" ? <TokenCheck /> : route.view === "components" ? <ComponentsCheck /> : <CardCheck />;
  if (route.kind === "login") return <LoginPage onLogin={(role) => { window.location.hash = hrefFor(role, "dashboard"); }} />;

  const { role, page } = route;
  const navigate = (p: string, params?: { id?: string; tab?: string }) => { window.location.hash = hrefFor(role, p, params); };
  const shell = { role, navigate, logout: () => { window.location.hash = "#/login"; } };

  let content;
  if (page === "profile") {
    // Corrección de comportamiento (anexo): el sistema solo leía ?tab= al montar; aquí cambiar de
    // estudiante o de pestaña desde la ruta (p. ej. desde Ctrl+K) vuelve a abrir la pestaña pedida.
    content = <StudentProfilePage key={route.id + "?" + (route.params.tab || "")} studentId={route.id} tab={route.params.tab} />;
  } else {
    // Como el sistema: una página desconocida del rol cae en su dashboard.
    const Page = PAGES[role][page] || PAGES[role].dashboard;
    // Corrección de comportamiento (anexo): el sistema no pasaba ?tab= a las páginas; aquí sí,
    // para que «Importar estudiantes» abra la pestaña de importación.
    content = <Page key={page + "?" + (route.params.tab || "")} tab={route.params.tab} />;
  }

  return (
    <SyncContext.Provider value={syncValue}>
      <ShellContext.Provider value={shell}>{content}</ShellContext.Provider>
    </SyncContext.Provider>
  );
}
