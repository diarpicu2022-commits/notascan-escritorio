import { useRef, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { ConfirmAction } from "./Overlays";

/*
 * Aviso de impresos (idiomas, I7 y D2). Boletines y reportes salen siempre en español porque son documentos oficiales.
 * Si la app está en inglés o portugués, antes de imprimir o exportar se avisa con la confirmación del sistema. En
 * español no aparece nada y la acción sigue como antes.
 */
export function usePrintNotice(): [(run: () => void) => void, ReactNode] {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  function ask(run: () => void) {
    if (lang === "es") { run(); return; }
    pending.current = run;
    setOpen(true);
  }
  const node = (
    <ConfirmAction
      open={open} icon="file" title={t.printNotice.title} description={t.printNotice.text} confirmLabel={t.printNotice.ok}
      onCancel={() => { pending.current = null; setOpen(false); }}
      onConfirm={() => { const run = pending.current; pending.current = null; setOpen(false); run?.(); }}
    />
  );
  return [ask, node];
}
