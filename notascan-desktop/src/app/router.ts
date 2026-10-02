import { isDesktopRole, type DesktopRole } from "../data/roles";

/** Rutas del sistema: #/<rol>/<página>[/<id>][?tab=]. Las vistas de verificación viven en #/dev/<vista>. */
export type Route =
  | { kind: "login" }
  | { kind: "dev"; view: string }
  | { kind: "app"; role: DesktopRole; page: string; id?: string; params: Record<string, string> };

const ROUTE_ALIAS: Record<string, string> = { grade: "grades" };

export function parseHash(hash = window.location.hash): Route {
  const raw = (hash || "").replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  query.split("&").forEach((kv) => { const [k, v] = kv.split("="); if (k) params[k] = decodeURIComponent(v || ""); });

  if (parts[0] === "dev") return { kind: "dev", view: parts[1] || "tokens" };
  // Estudiante y acudiente usan la app móvil (Flutter): en escritorio vuelven al login.
  if (!isDesktopRole(parts[0])) return { kind: "login" };
  return { kind: "app", role: parts[0], page: parts[1] || "dashboard", id: parts[2], params };
}

export function hrefFor(role: DesktopRole, page: string, params?: { id?: string; tab?: string }): string {
  const p = ROUTE_ALIAS[page] || page;
  return "#/" + role + "/" + p + (params?.id ? "/" + params.id : "") + (params?.tab ? "?tab=" + params.tab : "");
}
