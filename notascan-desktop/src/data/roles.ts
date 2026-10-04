import type { IconName } from "../components/atoms/Icon";

/** Roles de escritorio y su navegación, tal como los define notascan-ui (ROLES), más la Plataforma (paso 7). */
export type DesktopRole = "admin" | "principal" | "teacher" | "platform";

export interface RoleConfig {
  label: string;
  user: { name: string; role: string };
  courseLabel: string;
  course: string;
  density: "dense" | "balanced";
  nav: Array<[id: string, label: string, icon: IconName]>;
}

export const ROLES: Record<DesktopRole, RoleConfig> = {
  admin: {
    label: "Administración", user: { name: "Patricia Ortega", role: "Secretaría académica" }, courseLabel: "Año lectivo", course: "2026 · Calendario A", density: "dense",
    nav: [["dashboard", "Dashboard", "dashboard"], ["students", "Estudiantes", "students"], ["enrollment", "Matrículas", "file"], ["users", "Usuarios", "user"], ["structure", "Estructura académica", "layers"], ["curriculum", "Mallas curriculares", "link"], ["periods", "Periodos", "calendar"], ["reportcards", "Boletines", "book"], ["clearances", "Paz y Salvos", "shield"], ["ranking", "Ranking académico", "trophy"]],
  },
  principal: {
    label: "Rectoría", user: { name: "Hernando Villota", role: "Rector" }, courseLabel: "Institución", course: "Colegio Los Andes", density: "balanced",
    nav: [["dashboard", "Dashboard", "dashboard"], ["analytics", "Analítica", "reports"], ["teachers", "Seguimiento docente", "students"], ["requests", "Solicitudes", "inbox"], ["students", "Estudiantes", "user"], ["observer", "Observador", "eye"], ["reports", "Reportes", "file"]],
  },
  teacher: {
    label: "Docente", user: { name: "Ana Lucía Rosero", role: "Docente · Matemáticas" }, courseLabel: "Periodo 3 · 2026", course: "Matemáticas · 7A", density: "dense",
    nav: [["dashboard", "Dashboard", "dashboard"], ["grades", "Calificaciones", "grade"], ["gradebook", "Planilla", "evaluations"], ["concepts", "Conceptos", "ai"], ["recoveries", "Recuperaciones", "refresh"], ["attendance", "Asistencia", "calendar"], ["behavior", "Comportamiento", "heart"], ["students", "Estudiantes", "students"], ["reports", "Reportes", "reports"]],
  },
  // Dueño de la plataforma (paso 7): colegios, su identidad y su uso. Sin bloque de curso ni búsqueda de estudiantes.
  platform: {
    label: "Plataforma", user: { name: "Equipo NotaScan", role: "Plataforma NotaScan" }, courseLabel: "", course: "", density: "balanced",
    nav: [["dashboard", "Colegios", "building"]],
  },
};

export function isDesktopRole(r: string | undefined): r is DesktopRole {
  return r === "admin" || r === "principal" || r === "teacher" || r === "platform";
}

export interface NavItem { id: string; label: string; icon: IconName; count?: number; disabled?: boolean }

export function roleNav(role: DesktopRole, counts?: Record<string, number> | null): NavItem[] {
  return ROLES[role].nav.map(([id, label, icon]) => ({ id, label, icon, count: counts?.[id] }));
}
