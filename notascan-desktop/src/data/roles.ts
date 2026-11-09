import type { IconName } from "../components/atoms/Icon";
import type { Messages } from "../i18n/es";

/** Roles de escritorio y su navegación, tal como los define notascan-ui (ROLES), más la Plataforma (paso 7). */
export type DesktopRole = "admin" | "principal" | "teacher" | "platform";

export interface RoleConfig {
  label: string;
  user: { name: string; role: string };
  courseLabel: string;
  course: string;
  density: "dense" | "balanced";
  /** La etiqueta es una clave de `Messages["nav"]` (idiomas, paso 2). */
  nav: Array<[id: string, label: keyof Messages["nav"], icon: IconName]>;
}

export const ROLES: Record<DesktopRole, RoleConfig> = {
  admin: {
    label: "Administración", user: { name: "Patricia Ortega", role: "Secretaría académica" }, courseLabel: "Año lectivo", course: "2026 · Calendario A", density: "dense",
    nav: [["dashboard", "dashboard", "dashboard"], ["students", "students", "students"], ["enrollment", "enrollment", "file"], ["users", "users", "user"], ["structure", "structure", "layers"], ["curriculum", "curriculum", "link"], ["periods", "periods", "calendar"], ["reportcards", "reportcards", "book"], ["clearances", "clearances", "shield"], ["ranking", "ranking", "trophy"]],
  },
  principal: {
    label: "Rectoría", user: { name: "Hernando Villota", role: "Rector" }, courseLabel: "Institución", course: "Colegio Los Andes", density: "balanced",
    nav: [["dashboard", "dashboard", "dashboard"], ["analytics", "analytics", "reports"], ["teachers", "teachers", "students"], ["requests", "requests", "inbox"], ["students", "students", "user"], ["observer", "observer", "eye"], ["reports", "reports", "file"]],
  },
  teacher: {
    label: "Docente", user: { name: "Ana Lucía Rosero", role: "Docente · Matemáticas" }, courseLabel: "Periodo 3 · 2026", course: "Matemáticas · 7A", density: "dense",
    nav: [["dashboard", "dashboard", "dashboard"], ["grades", "grades", "grade"], ["gradebook", "gradebook", "evaluations"], ["concepts", "concepts", "ai"], ["recoveries", "recoveries", "refresh"], ["attendance", "attendance", "calendar"], ["behavior", "behavior", "heart"], ["students", "students", "students"], ["reports", "reports", "reports"]],
  },
  // Dueño de la plataforma (paso 7): colegios, su identidad y su uso. Sin bloque de curso ni búsqueda de estudiantes.
  platform: {
    label: "Plataforma", user: { name: "Equipo NotaScan", role: "Plataforma NotaScan" }, courseLabel: "", course: "", density: "balanced",
    nav: [["dashboard", "schools", "building"]],
  },
};

export function isDesktopRole(r: string | undefined): r is DesktopRole {
  return r === "admin" || r === "principal" || r === "teacher" || r === "platform";
}

export interface NavItem { id: string; label: string; icon: IconName; count?: number; disabled?: boolean }

export function roleNav(role: DesktopRole, labels: Messages["nav"], counts?: Record<string, number> | null): NavItem[] {
  return ROLES[role].nav.map(([id, label, icon]) => ({ id, label: labels[label], icon, count: counts?.[id] }));
}
