import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { cx } from "../../lib/cx";
import { Badge } from "../atoms/Badge";
import { Icon } from "../atoms/Icon";

interface UploadZoneProps {
  title?: string;
  hint?: string;
  onFiles?: (files: File[]) => void;
  className?: string;
}

/** Paso 1 del flujo: arrastrar o elegir las fotos del examen. Operable con Enter y Espacio. */
export function UploadZone({ title, hint, onFiles, className }: UploadZoneProps) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const files = (list: FileList | null) => onFiles?.(Array.from(list || []));
  return (
    <div
      className={cx("ns-drop", over && "is-over", className)} role="button" tabIndex={0} aria-label="Subir fotografías de la evaluación"
      onClick={() => ref.current?.click()}
      onKeyDown={(e: KeyboardEvent) => { if ((e.key === "Enter" || e.key === " ") && ref.current) { e.preventDefault(); ref.current.click(); } }}
      onDragOver={(e: DragEvent) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => { e.preventDefault(); setOver(false); files(e.dataTransfer.files); }}
    >
      <span className="ns-empty-seal"><Icon name="camera" size={26} /></span>
      <strong className="ns-serif" style={{ fontSize: 22, lineHeight: "28px", fontWeight: 600 }}>{title || "Subir fotografía"}</strong>
      <span className="ns-caption">{hint || "Arrastra las fotos del examen o haz clic. JPG o PNG, una hoja por foto."}</span>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => files(e.target.files)} />
    </div>
  );
}

interface ImportFileZoneProps {
  onFile: (f: { name: string; size: number; file?: File }) => void;
  onError?: (message: string) => void;
  /** Solo CSV (mientras no haya lector de .xlsx): no promete Excel. */
  csvOnly?: boolean;
}

/** Importación de estudiantes: solo Excel o CSV, con error explicado si el formato no sirve. */
export function ImportFileZone({ onFile, onError, csvOnly }: ImportFileZoneProps) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  function pick(list: FileList | null) {
    const f = list && list[0];
    if (!f) return;
    if (csvOnly && !/\.csv$/i.test(f.name)) { onError?.("Por ahora se aceptan archivos CSV. En Excel: Archivo → Guardar como → «CSV UTF-8»."); return; }
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) { onError?.("Solo se aceptan archivos Excel (.xlsx) o CSV."); return; }
    onFile({ name: f.name, size: f.size, file: f });
  }
  return (
    <div
      className={cx("ns-drop ns-import-drop", over && "is-over")} role="button" tabIndex={0} aria-label={csvOnly ? "Seleccionar archivo CSV de estudiantes" : "Seleccionar archivo Excel o CSV de estudiantes"}
      onClick={() => ref.current?.click()}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
      onDragOver={(e: DragEvent) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
    >
      <span className="ns-empty-seal"><Icon name="upload" size={26} /></span>
      <strong className="ns-serif" style={{ fontSize: 22 }}>Arrastra tu archivo aquí</strong>
      <span className="ns-caption">o haz clic para seleccionarlo</span>
      <div className="ns-row" style={{ gap: 8 }}>{csvOnly ? null : <Badge tone="neutral" icon="file">Excel .xlsx</Badge>}<Badge tone="neutral" icon="file">CSV</Badge></div>
      <input ref={ref} type="file" accept={csvOnly ? ".csv" : ".xlsx,.xls,.csv"} hidden onChange={(e) => pick(e.target.files)} />
    </div>
  );
}
