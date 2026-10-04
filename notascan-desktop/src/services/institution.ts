import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../app/AuthContext";
import { DEMO, supabase } from "../lib/supabase";

/*
 * Identidad del colegio (paso 7b): nombre, iniciales, ciudad, resolución, DANE y logo. La carga la plataforma
 * (paso 7d); aquí se lee para mostrarla en el marco de la app, en los boletines y en el perfil del estudiante.
 */

export type InstitutionStatus = "implementation" | "active" | "suspended";

export interface Institution {
  id: string;
  name: string;
  shortName: string;
  city: string;
  department: string;
  resolution: string;
  dane: string;
  /** URL pública del logo (bucket institution-logos) o, en una vista previa, la del archivo elegido. */
  logoUrl: string | null;
  status: InstitutionStatus;
}

/** El colegio de demostración del sistema (mismos textos que el boletín original). */
export const DEMO_INSTITUTION: Institution = {
  id: "00000000-0000-4000-8000-000000000001", name: "Colegio Los Andes", shortName: "LA", city: "Pasto", department: "Nariño",
  resolution: "Resolución 0123 de 2015", dane: "152001000000", logoUrl: null, status: "active",
};

export interface InstitutionRow {
  id: string; name: string; short_name: string; city: string; department: string; resolution: string; dane: string;
  logo_path: string | null; status: InstitutionStatus;
}

/** URL pública de un logo guardado en el bucket. */
export function logoUrlOf(path: string | null): string | null {
  if (!path || DEMO) return null;
  return supabase().storage.from("institution-logos").getPublicUrl(path).data.publicUrl;
}

export const toInstitution = (r: InstitutionRow): Institution => ({
  id: r.id, name: r.name, shortName: r.short_name, city: r.city, department: r.department, resolution: r.resolution, dane: r.dane,
  logoUrl: logoUrlOf(r.logo_path), status: r.status,
});

/** Iniciales para el escudo cuando no hay logo: las del colegio o, si faltan, las de su nombre sin «Colegio», «Institución»… */
export function initialsOf(i: Pick<Institution, "name" | "shortName">): string {
  if (i.shortName.trim()) return i.shortName.trim().toUpperCase().slice(0, 3);
  const words = i.name.replace(/^(colegio|institución educativa|institucion educativa|liceo|escuela|gimnasio)\s+/i, "").split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w));
  return (words.slice(0, 2).map((w) => w.charAt(0)).join("") || "NS").toUpperCase();
}

/** Línea bajo el nombre en el encabezado del boletín: solo lo que existe, sin datos inventados. */
export function headerLine(i: Institution): string {
  const place = [i.city, i.department].filter((x) => x.trim()).join(", ");
  return [place, i.resolution.trim(), i.dane.trim() ? "DANE " + i.dane.trim() : ""].filter(Boolean).join(" · ");
}

/** Colegio de la persona con sesión (el RLS solo deja leer el propio). */
export function useMyInstitution(enabled = true) {
  const profile = useAuth().profile;
  return useQuery({
    queryKey: ["my-institution", profile?.id],
    enabled: enabled && (DEMO || !!profile),
    initialData: DEMO ? DEMO_INSTITUTION : undefined,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Institution | null> => {
      if (DEMO) return DEMO_INSTITUTION;
      const r = await supabase().from("institutions").select("id, name, short_name, city, department, resolution, dane, logo_path, status").limit(1);
      if (r.error) throw r.error;
      const row = (r.data ?? [])[0] as InstitutionRow | undefined;
      return row ? toInstitution(row) : null;
    },
  });
}
