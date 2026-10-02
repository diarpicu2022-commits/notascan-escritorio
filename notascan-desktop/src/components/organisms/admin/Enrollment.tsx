import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../../lib/cx";
import { GRADE_NAME } from "../../../data/academic";
import { IMPORT_ISSUES, IMPORT_STEPS, ROW_STATE, type ImportIssue } from "../../../data/admin";
import { ALL_STUDENTS, COURSES } from "../../../data/students";
import { Badge } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { Input, Select, Textarea } from "../../atoms/Field";
import { Icon, type IconName } from "../../atoms/Icon";
import { ImportFileZone } from "../../molecules/DropZones";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid, DataTable } from "../DataGrid";
import { Block, BlockTitle } from "../Layout";
import { ConfirmAction } from "../Overlays";

/* ---------- Matrícula por secciones ---------- */

const REG_SECTIONS: Array<[string, string, IconName]> = [["personal", "Datos personales", "user"], ["medical", "Información médica", "heart"], ["guardian", "Acudiente", "students"], ["academic", "Información académica", "book"]];
const REQ: Record<number, string[]> = { 0: ["first", "last", "doc", "birth"], 2: ["gName", "gRel", "gPhone"], 3: ["year", "grade", "course"] };
const EMPTY_FORM = { first: "", last: "", docType: "Tarjeta de identidad", doc: "", birth: "", phone: "", email: "", allergies: "", conditions: "", medNotes: "", emName: "", emPhone: "", gName: "", gRel: "", gDoc: "", gPhone: "", gEmail: "", year: "2026", grade: "7", course: "7A", state: "Activo" };
type RegForm = typeof EMPTY_FORM;

export function StudentRegistrationForm({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [v, setV] = useState<RegForm>(EMPTY_FORM);
  const set = (k: keyof RegForm) => (e: { target: { value: string } } | string) => setV({ ...v, [k]: typeof e === "string" ? e : e.target.value });
  const err = (k: keyof RegForm) => (tried[step] && REQ[step] && REQ[step].indexOf(k) >= 0 && !String(v[k]).trim() ? "Este campo es obligatorio." : null);
  const emailErr = (k: keyof RegForm) => (v[k] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v[k]) ? "Escribe un correo válido." : null);
  const valid = (i: number) => (REQ[i] || []).every((k) => String(v[k as keyof RegForm]).trim());
  function next() {
    setTried({ ...tried, [step]: true });
    if (!valid(step)) return;
    if (step < 3) setStep(step + 1); else setDone(true);
  }

  if (done) {
    return (
      <Block tone="sage" className="ns-reg-done">
        <span className="ns-dialog-seal ns-dialog-seal--sage" aria-hidden><Icon name="check" size={22} /></span>
        <h2 className="ns-block-h">Matrícula registrada</h2>
        <p>{v.first + " " + v.last + " quedó matriculado en " + GRADE_NAME[v.grade] + " · " + v.course + " para el año lectivo " + v.year + "."}</p>
        <div className="ns-row">
          <Button icon="plus" onClick={() => { setDone(false); setStep(0); setTried({}); setV({ ...v, first: "", last: "", doc: "", birth: "" }); }}>Registrar otro estudiante</Button>
          <Button variant="secondary" onClick={() => onNavigate?.("students")}>Ver estudiantes</Button>
        </div>
      </Block>
    );
  }

  let body: ReactNode;
  if (step === 0) {
    body = (
      <div className="ns-form-grid">
        <Input label="Nombres" required value={v.first} onChange={set("first")} error={err("first")} autoComplete="off" />
        <Input label="Apellidos" required value={v.last} onChange={set("last")} error={err("last")} />
        <Select label="Tipo de documento" required value={v.docType} onChange={set("docType")} options={["Tarjeta de identidad", "Registro civil", "Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte"]} />
        <Input label="Número de documento" required inputMode="numeric" value={v.doc} onChange={set("doc")} error={err("doc")} hint="Sin puntos ni espacios." />
        <Input label="Fecha de nacimiento" required type="date" value={v.birth} onChange={set("birth")} error={err("birth")} />
        <Input label="Teléfono de contacto" type="tel" value={v.phone} onChange={set("phone")} />
        <Input label="Correo electrónico" type="email" value={v.email} onChange={set("email")} error={emailErr("email")} className="ns-span-2" />
      </div>
    );
  } else if (step === 1) {
    body = (
      <>
        <p className="ns-sensitive"><Icon name="lock" size={16} />Información sensible. Solo la ven Secretaría y Rectoría. Todos los campos son opcionales.</p>
        <div className="ns-form-grid">
          <Input label="Alergias" value={v.allergies} onChange={set("allergies")} placeholder="Ninguna conocida" />
          <Input label="Condiciones relevantes" value={v.conditions} onChange={set("conditions")} />
          <Textarea label="Observaciones médicas" value={v.medNotes} onChange={set("medNotes")} className="ns-span-2" rows={2} />
          <Input label="Contacto de emergencia" value={v.emName} onChange={set("emName")} />
          <Input label="Teléfono de emergencia" type="tel" value={v.emPhone} onChange={set("emPhone")} />
        </div>
      </>
    );
  } else if (step === 2) {
    body = (
      <div className="ns-form-grid">
        <Input label="Nombre completo" required value={v.gName} onChange={set("gName")} error={err("gName")} />
        <Select label="Parentesco" required value={v.gRel} onChange={set("gRel")} placeholder="Selecciona" options={["Madre", "Padre", "Abuela", "Abuelo", "Tía", "Tío", "Tutor legal"]} error={err("gRel")} />
        <Input label="Documento" value={v.gDoc} onChange={set("gDoc")} />
        <Input label="Teléfono" required type="tel" value={v.gPhone} onChange={set("gPhone")} error={err("gPhone")} />
        <Input label="Correo electrónico" type="email" value={v.gEmail} onChange={set("gEmail")} error={emailErr("gEmail")} hint="Recibirá el acceso de acudiente." className="ns-span-2" />
      </div>
    );
  } else {
    body = (
      <div className="ns-form-grid">
        <Select label="Año lectivo" required value={v.year} onChange={set("year")} options={["2026", "2027"]} />
        <Select label="Grado" required value={v.grade} onChange={(x) => setV({ ...v, grade: x, course: x + "A" })} options={["6", "7", "8", "9", "10", "11"].map((g) => ({ value: g, label: GRADE_NAME[g] }))} />
        <Select label="Curso" required value={v.course} onChange={set("course")} options={[v.grade + "A", v.grade + "B"]} />
        <Select label="Estado de matrícula" value={v.state} onChange={set("state")} options={["Activo", "Pendiente"]} />
        <div className="ns-span-2 ns-summary-card">
          <span className="ns-overline">Resumen</span>
          <strong>{(v.first || "—") + " " + v.last}</strong>
          <span className="ns-caption">{v.docType + " " + (v.doc || "—") + " · Acudiente: " + (v.gName || "—") + " · " + GRADE_NAME[v.grade] + " " + v.course}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ns-reg">
      <ol className="ns-reg-steps" aria-label="Secciones del formulario">
        {REG_SECTIONS.map((s, i) => {
          const ok = i < step;
          return (
            <li key={s[0]}>
              <button type="button" className={cx("ns-reg-step", i === step && "is-on", ok && "is-done")} aria-current={i === step ? "step" : undefined} onClick={() => { if (i <= step || valid(step)) setStep(i); }}>
                <span className="ns-reg-num">{ok ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
                <span>{s[1]}{s[0] === "medical" ? <small>Opcional</small> : null}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <Block className="ns-reg-body">
        <div className="ns-block-title">
          <h2>{REG_SECTIONS[step][1]}</h2>
          <span className="ns-caption">{"Sección " + (step + 1) + " de 4 · "}<span className="ns-req">*</span> obligatorio</span>
        </div>
        {body}
        <div className="ns-reg-actions">
          {step > 0 ? <Button variant="ghost" icon="chevleft" onClick={() => setStep(step - 1)}>Anterior</Button> : <span />}
          <Button icon={step === 3 ? "check" : undefined} iconRight={step < 3 ? "arrow" : undefined} onClick={next}>{step === 3 ? "Guardar matrícula" : "Siguiente"}</Button>
        </div>
      </Block>
    </div>
  );
}

/* ---------- Importación masiva con validación por fila ---------- */

type IssueRow = ImportIssue & { _i: number };

export function BulkImportPanel({ onNavigate, initialStep = 0 }: { onNavigate?: (page: string) => void; initialStep?: number }) {
  const [step, setStep] = useState(initialStep);
  const [file, setFile] = useState<{ name: string; size: number } | null>(initialStep ? { name: "estudiantes_2026.xlsx", size: 48213 } : null);
  const [err, setErr] = useState<string | null>(null);
  const [issues, setIssues] = useState<ImportIssue[]>(() => IMPORT_ISSUES.map((x) => ({ ...x })));
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const total = 245;
  const pendingIssues = issues.filter((x) => x.state === "error" || x.state === "duplicate" || x.state === "warning");
  const blocking = issues.filter((x) => x.state === "error").length;
  const valid = total - issues.length + issues.filter((x) => x.state === "fixed" || x.state === "warning").length;
  const upd = (i: number, patch: Partial<ImportIssue>) => setIssues(issues.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const stepper = (
    <ol className="ns-stepper ns-stepper--6" aria-label="Pasos de la importación">
      {IMPORT_STEPS.map((s, i) => (
        <li key={s} className={cx("ns-step", i < step && "is-done", i === step && "is-current")} aria-current={i === step ? "step" : undefined}>
          <span className="ns-step-mark">{i < step ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
          <span className="ns-step-label">{s}</span>
        </li>
      ))}
    </ol>
  );

  let content: ReactNode;
  if (step === 0) {
    content = (
      <div className="ns-import-grid">
        <ImportFileZone onFile={(f) => { setFile(f); setErr(null); setStep(1); }} onError={setErr} />
        <Block tone="gold">
          <BlockTitle>Antes de importar</BlockTitle>
          <ul className="ns-checklist">
            {["Una fila por estudiante, con encabezados en la primera fila.", "Columnas: nombres, apellidos, tipo y número de documento, fecha de nacimiento, curso, acudiente, teléfono.", "Los cursos deben existir en Estructura Académica.", "Nada se guarda hasta que confirmes la importación."].map((t) => <li key={t}><Icon name="check" size={16} />{t}</li>)}
          </ul>
          <div className="ns-row">
            <Button variant="secondary" icon="download">Descargar plantilla</Button>
            <Button variant="ghost" onClick={() => { setFile({ name: "estudiantes_2026.xlsx", size: 48213 }); setStep(1); }}>Usar archivo de ejemplo</Button>
          </div>
          {err ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{err}</span> : null}
        </Block>
      </div>
    );
  } else if (step === 1) {
    content = (
      <Block>
        <BlockTitle action={<Badge tone="neutral" icon="file">{file!.name + " · " + Math.round(file!.size / 1024) + " KB"}</Badge>}>{total + " registros encontrados"}</BlockTitle>
        <p className="ns-caption">Así leímos las primeras filas. Revisa que cada columna corresponda.</p>
        <DataTable
          caption="Vista previa del archivo"
          columns={["Nombres", "Apellidos", "Documento", "Nacimiento", "Curso", "Acudiente", "Teléfono"].map((c, i) => ({ key: "c" + i, label: c }))}
          rows={ALL_STUDENTS.slice(0, 5).map((s, i) => ({ id: i, c0: s.first, c1: s.last, c2: s.document, c3: "1" + (i + 2) + "/0" + (i + 3) + "/2013", c4: s.course, c5: s.guardian, c6: s.guardianPhone }))}
        />
        <div className="ns-reg-actions">
          <Button variant="ghost" icon="chevleft" onClick={() => setStep(0)}>Cambiar archivo</Button>
          <Button iconRight="arrow" loading={busy} loadingText="Validando…" onClick={() => {
            setBusy(true);
            // Sin backend en esta fase: se simula la validación del archivo.
            timer.current = window.setTimeout(() => { setBusy(false); setStep(2); }, 900);
          }}>Validar archivo</Button>
        </div>
      </Block>
    );
  } else if (step === 2 || step === 3) {
    const shown: IssueRow[] = issues.map((x, i) => ({ _i: i, ...x })).filter((x) => filter === "all" || x.state === filter);
    content = (
      <>
        <div className="ns-import-summary">
          <div className="ns-bento-tile ns-bento-tile--lead"><span className="ns-bento-value ns-bento-value--xl">{total}<small> registros encontrados</small></span></div>
          <div className="ns-bento-tile ns-bento-tile--sage"><span className="ns-bento-value">{valid}</span><span className="ns-bento-label"><Icon name="check" size={16} />registros válidos</span></div>
          <div className="ns-bento-tile ns-bento-tile--burgundy"><span className="ns-bento-value">{pendingIssues.length}</span><span className="ns-bento-label"><Icon name="warning" size={16} />requieren revisión</span></div>
        </div>
        <Block>
          <BlockTitle action={<FilterGroup label="Mostrar" value={filter} onChange={setFilter} options={[{ value: "all", label: "Todos" }, { value: "error", label: "Error" }, { value: "duplicate", label: "Duplicado" }, { value: "warning", label: "Advertencia" }]} />}>
            {step === 2 ? "Validación por fila" : "Corregir errores"}
          </BlockTitle>
          <DataGrid<IssueRow>
            caption="Validación de filas importadas" rows={shown} rowKey={(r) => String(r.row)} paginate={false} density="compact" emptyTitle="No hay filas con este estado."
            columns={[
              { key: "row", label: "Fila", numeric: true },
              { key: "name", label: "Estudiante", header: true },
              {
                key: "doc", label: "Documento", render: (r) => (step === 3 && r.field === "doc" && r.state === "error"
                  ? <Input hideLabel label={"Corregir documento de " + r.name} defaultValue={r.doc} onBlur={(e) => { if (/\d{8,}/.test(e.target.value)) upd(r._i, { doc: e.target.value, state: "fixed", msg: "Documento corregido" }); }} />
                  : r.doc || "—"),
              },
              {
                key: "course", label: "Curso", render: (r) => (step === 3 && r.field === "course" && r.state === "error"
                  ? (
                    <select className="ns-select" aria-label={"Corregir curso de " + r.name} defaultValue="" onChange={(e) => upd(r._i, { course: e.target.value, state: "fixed", msg: "Curso corregido" })}>
                      <option value="" disabled>{r.course + " → ?"}</option>
                      {COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )
                  : r.course),
              },
              { key: "state", label: "Resultado", render: (r) => { const s = ROW_STATE[r.state]; return <Badge tone={s[1]} icon={s[2]}>{s[0]}</Badge>; } },
              { key: "msg", label: "Detalle" },
            ]}
            rowActions={step === 3 ? (r) => (r.state === "error" || r.state === "duplicate"
              ? <Button size="sm" variant="ghost" onClick={() => upd(r._i, { state: "skipped", msg: "No se importará" })}>Omitir fila</Button>
              : r.state === "warning" ? <Badge tone="neutral" icon={false}>Se importa</Badge> : null) : undefined}
          />
          <div className="ns-reg-actions">
            <Button variant="ghost" icon="chevleft" onClick={() => setStep(step - 1)}>Anterior</Button>
            {step === 2
              ? <Button iconRight="arrow" onClick={() => setStep(3)}>Corregir errores</Button>
              : <Button iconRight="arrow" disabled={blocking > 0} onClick={() => setStep(4)}>{blocking ? "Resuelve " + blocking + (blocking === 1 ? " error" : " errores") : "Continuar"}</Button>}
          </div>
        </Block>
      </>
    );
  } else if (step === 4) {
    content = (
      <Block tone="gold" className="ns-reg-done">
        <h2 className="ns-block-h">Confirmar importación</h2>
        <p>Se registrarán <strong>{valid + " estudiantes"}</strong>{". " + issues.filter((x) => x.state === "skipped").length + " filas omitidas no se importarán."}</p>
        <div className="ns-row">
          <Button variant="ghost" icon="chevleft" onClick={() => setStep(3)}>Revisar de nuevo</Button>
          <Button icon="upload" size="lg" onClick={() => setConfirm(true)}>Confirmar importación</Button>
        </div>
      </Block>
    );
  } else {
    content = (
      <Block tone="sage" className="ns-reg-done">
        <span className="ns-dialog-seal ns-dialog-seal--sage" aria-hidden><Icon name="check" size={22} /></span>
        <h2 className="ns-block-h">Importación completada</h2>
        <p>{valid + " estudiantes fueron registrados correctamente."}</p>
        <div className="ns-row">
          <Button variant="secondary" icon="download">Descargar informe</Button>
          <Button iconRight="arrow" onClick={() => onNavigate?.("students")}>Ver estudiantes</Button>
          <Button variant="ghost" onClick={() => { setStep(0); setFile(null); setIssues(IMPORT_ISSUES.map((x) => ({ ...x }))); }}>Importar otro archivo</Button>
        </div>
      </Block>
    );
  }

  return (
    <div className="ns-col" style={{ gap: 24 }}>
      {stepper}
      {content}
      <ConfirmAction open={confirm} onCancel={() => setConfirm(false)} icon="upload" title={"¿Importar " + valid + " estudiantes?"} description="Los registros quedarán activos en la matrícula 2026." confirmLabel="Confirmar importación" onConfirm={() => { setConfirm(false); setStep(5); }} />
    </div>
  );
}
