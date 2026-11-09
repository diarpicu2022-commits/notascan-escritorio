import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "./Overlays";
import { useI18n } from "../../i18n/I18nProvider";
import { LANGS, type LangPref } from "../../i18n/format";
import { Icon, type IconName } from "../atoms/Icon";
import { useTheme, type ThemePref } from "../../lib/theme";

/*
 * Panel Preferencias (anexo 2026-11-08-idiomas, I1 e I2): lo que se guarda en este equipo.
 * Usa el Drawer del sistema y, para elegir, la lista de Periodos (`.ns-period-item`): título fuerte, una línea debajo,
 * y la opción elegida en azul marino con la sombra dorada. Es la forma que el sistema ya usa para «elegir uno de una
 * lista»; no se agrega ninguna nueva.
 * El grupo Tema va encima (anexo 2026-11-08-modo-oscuro, sección 7, O7 y O8): el control segmentado del sistema
 * (`.ns-seg`) con sol, luna y pantalla. No sale en el inicio de sesión, que usa lo último guardado en el equipo.
 */

/** Tema: grupo de radio en el segmentado del sistema. Las flechas cambian y el cambio se ve al instante. */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { pref, setPref } = useTheme();
  const options: Array<{ value: ThemePref; label: string; icon: IconName }> = [
    { value: "light", label: t.theme.light, icon: "sun" },
    { value: "dark", label: t.theme.dark, icon: "moon" },
    { value: "system", label: t.theme.system, icon: "monitor" },
  ];
  const at = Math.max(0, options.findIndex((o) => o.value === pref));
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKey(e: KeyboardEvent, i: number) {
    const n = options.length;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n
      : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setPref(options[j].value);
    refs.current[j]?.focus();
  }
  return (
    // --at mueve el indicador con transform (O7). Es lo único que se anima al cambiar de tema.
    <div className="ns-seg ns-theme-seg" role="radiogroup" aria-label={t.theme.choose} style={{ "--at": at } as CSSProperties}>
      <span className="ns-theme-seg-ind" aria-hidden="true" />
      {options.map((o, i) => {
        const on = pref === o.value;
        return (
          <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            className="ns-seg-tab ns-theme-seg-tab" data-theme-option={o.value} onClick={() => setPref(o.value)} onKeyDown={(e) => onKey(e, i)}>
            <Icon name={o.icon} size={18} />
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Lista de idiomas: grupo de radio con flechas, como la asistencia del Docente. */
export function LanguageList() {
  const { t, pref, setPref, system } = useI18n();
  const options: Array<{ value: LangPref; title: string; caption: string; lang?: string }> = [
    ...LANGS.map((l) => ({ value: l as LangPref, title: t.lang.names[l], caption: t.lang.hello[l], lang: l })),
    { value: "sistema", title: t.lang.system, caption: t.lang.systemNow(t.lang.names[system]) },
  ];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function onKey(e: KeyboardEvent, i: number) {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const j = (i + step + options.length) % options.length;
    setPref(options[j].value);
    refs.current[j]?.focus();
  }
  return (
    <div className="ns-period-list ns-pref-list" role="radiogroup" aria-label={t.lang.choose}>
      {options.map((o, i) => {
        const on = pref === o.value;
        return (
          <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1}
            className="ns-period-item" onClick={() => setPref(o.value)} onKeyDown={(e) => onKey(e, i)}>
            {/* El nombre del idioma se marca con su propio idioma para los lectores de pantalla. */}
            <strong lang={o.lang}>{o.title}</strong>
            <span className="ns-caption" lang={o.lang}>{o.caption}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesDrawer({ open, onClose, theme = true }: { open: boolean; onClose: () => void; theme?: boolean }) {
  const { t } = useI18n();
  if (!open) return null;
  // Al cuerpo del documento: la barra lateral es pegajosa y recortaría el panel.
  return createPortal(
    <div className="ns">
      <Drawer open={open} onClose={onClose} eyebrow={t.prefs.eyebrow} title={t.prefs.title} closeLabel={t.prefs.close}>
        {theme ? (
          <section className="ns-pref-group" aria-labelledby="ns-pref-theme">
            <h3 id="ns-pref-theme" className="ns-overline">{t.theme.choose}</h3>
            <ThemeSwitch />
            <p className="ns-caption">{t.theme.hint}</p>
          </section>
        ) : null}
        <section className="ns-pref-group" aria-labelledby="ns-pref-lang">
          <h3 id="ns-pref-lang" className="ns-overline">{t.lang.choose}</h3>
          <LanguageList />
          <p className="ns-caption">{t.lang.chooseHint}</p>
        </section>
      </Drawer>
    </div>,
    document.body,
  );
}
