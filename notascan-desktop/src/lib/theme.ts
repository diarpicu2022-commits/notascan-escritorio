import { useSyncExternalStore } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/*
 * Tema de la app (anexo 2026-11-08-modo-oscuro, sección 7, O7 y O8).
 * Se guarda solo en este equipo (localStorage, `notascan.theme`): `light`, `dark` o `system`. El script de index.html
 * pone `data-theme` en <html> antes del primer pintado con la misma regla que `resolve`. Aquí se cambia en vivo y se
 * sigue al sistema cuando la persona eligió «Como el sistema».
 */
export const THEME_KEY = "notascan.theme";
export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* almacenamiento bloqueado: se sigue al sistema */ }
  return "system";
}

let pref: ThemePref = readPref();

function systemTheme(): Theme {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches ? "dark" : "light";
}
export const resolve = (p: ThemePref): Theme => (p === "system" ? systemTheme() : p);

/**
 * Pone el tema sin fundido de color (O7). `.ns-btn` y `.ns-titlebar-btn` traen `transition: background-color`, así que
 * se cortan todas las transiciones durante el cambio, se fuerza el cálculo de estilo y se quita el corte
 * (técnica de Paco Coursey, citada en la sección 4 del anexo).
 */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === theme) return;
  const cut = document.createElement("style");
  cut.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(cut);
  root.setAttribute("data-theme", theme);
  void getComputedStyle(root).backgroundColor;
  cut.remove();
}

/*
 * Paso 3 (anexo, sección 14): en macOS la ventana trae la barra nativa transparente y sus tres botones los dibuja el
 * sistema. Para que sigan el tema elegido se le pide a Tauri `setTheme`: el tema si se eligió Claro u Oscuro, y null
 * para «Como el sistema», que devuelve la ventana a la apariencia del equipo. En Windows y Linux la ventana no tiene
 * marco nativo (la barra es de la app), así que no se llama.
 */
const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const IS_MAC = typeof navigator !== "undefined" && /Macintosh|Mac OS X/.test(navigator.userAgent);
function syncNative(p: ThemePref) {
  if (!IN_TAURI || !IS_MAC) return;
  getCurrentWindow().setTheme(p === "system" ? null : p).catch(() => { /* sin permiso o sin ventana: queda la del sistema */ });
}

function emit() {
  apply(resolve(pref));
  listeners.forEach((l) => l());
}

export function setThemePref(p: ThemePref) {
  pref = p;
  try { localStorage.setItem(THEME_KEY, p); } catch { /* sin almacenamiento: vale para esta sesión */ }
  syncNative(p);
  emit();
}

let started = false;
/** Se llama una vez al arrancar: aplica lo guardado y escucha al sistema y a otras ventanas de la app. */
export function startTheme() {
  if (started) return;
  started = true;
  apply(resolve(pref));
  // Al abrir, «Como el sistema» ya es lo que hace la ventana: solo se llama si la persona eligió Claro u Oscuro.
  if (pref !== "system") syncNative(pref);
  if (typeof matchMedia === "function") matchMedia(DARK_QUERY).addEventListener("change", () => { if (pref === "system") emit(); });
  window.addEventListener("storage", (e) => { if (e.key === THEME_KEY) { pref = readPref(); syncNative(pref); emit(); } });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Preferencia guardada y tema que se ve ahora. */
export function useTheme(): { pref: ThemePref; theme: Theme; setPref: (p: ThemePref) => void } {
  const p = useSyncExternalStore(subscribe, () => pref);
  const theme = useSyncExternalStore(subscribe, () => resolve(pref));
  return { pref: p, theme, setPref: setThemePref };
}
