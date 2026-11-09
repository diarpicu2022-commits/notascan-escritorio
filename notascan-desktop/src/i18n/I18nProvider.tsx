import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { es, type Messages } from "./es";
import { en } from "./en";
import { pt } from "./pt";
import { formatDate, formatGrade, formatNumber, formatTime, systemLang, type Lang, type LangPref } from "./format";

/*
 * Idioma de la app (anexo 2026-11-08-idiomas, I2 e I4).
 * La preferencia se guarda solo en este equipo (localStorage, `notascan.idioma`). «Como el sistema» sigue el idioma del
 * equipo, también si cambia con la app abierta. Si el equipo no está en español, inglés ni portugués, se usa español.
 */
export const LANG_KEY = "notascan.idioma";
const DICTS: Record<Lang, Messages> = { es, en, pt };

function readPref(): LangPref {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "es" || v === "en" || v === "pt" || v === "sistema") return v;
  } catch { /* almacenamiento bloqueado: se usa el del sistema */ }
  return "sistema";
}

interface I18n {
  /** Idioma en uso. */
  lang: Lang;
  /** Lo que eligió la persona, incluido «sistema». */
  pref: LangPref;
  /** Idioma que tiene el equipo, para «Como el sistema · Ahora: …». */
  system: Lang;
  setPref: (p: LangPref) => void;
  t: Messages;
  grade: (n: number) => string;
  number: (n: number, digits?: number) => string;
  date: (d: Date) => string;
  time: (d: Date) => string;
  /** Nota tal como la muestran las pantallas, con el separador del idioma («4,5» en español y portugués, «4.5» en inglés). Sin nota, «—». */
  shownGrade: (n: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<LangPref>(readPref);
  const [system, setSystem] = useState<Lang>(() => systemLang());
  useEffect(() => {
    const on = () => setSystem(systemLang());
    window.addEventListener("languagechange", on);
    return () => window.removeEventListener("languagechange", on);
  }, []);
  const lang: Lang = pref === "sistema" ? system : pref;
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setPref = useCallback((p: LangPref) => {
    setPrefState(p);
    try { localStorage.setItem(LANG_KEY, p); } catch { /* sin almacenamiento: vale para esta sesión */ }
  }, []);
  const value = useMemo<I18n>(() => ({
    lang, pref, system, setPref, t: DICTS[lang],
    grade: (n) => formatGrade(lang, n),
    number: (n, digits) => formatNumber(lang, n, digits),
    date: (d) => formatDate(lang, d),
    time: (d) => formatTime(lang, d),
    // Se redondea antes, como `formatGrade` de lib/grade: Intl redondea el flotante tal cual (3,349999 da 3,3).
    shownGrade: (n) => (isNaN(n) ? "—" : formatGrade(lang, Math.round(n * 10) / 10)),
  }), [lang, pref, system, setPref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n fuera de I18nProvider");
  return v;
}
