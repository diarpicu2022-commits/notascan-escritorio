import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../../../lib/cx";
import { GRADE_NAME } from "../../../data/academic";
import { IMPORT_ISSUES, IMPORT_STEPS, ROW_STATE, type ImportIssue } from "../../../data/admin";
import { ALL_STUDENTS, COURSES } from "../../../data/students";
import { exportCSV } from "../../../data/admin";
import { DEMO } from "../../../lib/supabase";
import { es } from "../../../i18n/es";
import {
  DEMO_IMPORT, EnrollError, IMPORT_HEADERS, enrollMessage, readImportFile, useCourseOptions, useEnrollStudent, useImportStudents, type ImportRow,
} from "../../../services/enrollment";
import { Badge } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { Checkbox, Input, Select, Textarea } from "../../atoms/Field";
import { Icon, type IconName } from "../../atoms/Icon";
import { ImportFileZone } from "../../molecules/DropZones";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid, DataTable } from "../DataGrid";
import { Block, BlockTitle } from "../Layout";
import { ConfirmAction } from "../Overlays";
import { useI18n } from "../../../i18n/I18nProvider";
import type { ImportIssue as Issue } from "../../../data/admin";

/* ---------- Matrícula por secciones ---------- */

/** Secciones del formulario; el nombre sale del diccionario (t.adm.reg.sections). */
const REG_SECTIONS: Array<["personal" | "medical" | "guardian" | "academic", IconName]> = [["personal", "user"], ["medical", "heart"], ["guardian", "students"], ["academic", "book"]];
/* Listas fijas: el valor se guarda en español y la etiqueta se escribe en el idioma de la app (t.adm.fixed). */
const DOC_TYPES = ["Tarjeta de identidad", "Registro civil", "Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte"];
const RELATIONS = ["Madre", "Padre", "Abuela", "Abuelo", "Tía", "Tío", "Tutor legal"];
const REQ: Record<number, string[]> = { 0: ["first", "last", "doc", "birth"], 2: ["gName", "gRel", "gPhone"], 3: ["year", "grade", "course"] };
const EMPTY_FORM = { first: "", last: "", docType: "Tarjeta de identidad", doc: "", birth: "", phone: "", email: "", allergies: "", conditions: "", medNotes: "", emName: "", emPhone: "", gName: "", gRel: "", gDoc: "", gPhone: "", gEmail: "", year: "2026", grade: "7", course: "7A", state: "Activo" };
type RegForm = typeof EMPTY_FORM;

export function StudentRegistrationForm({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [v, setV] = useState<RegForm>(EMPTY_FORM);
  const courseQ = useCourseOptions();
  const enroll = useEnrollStudent();
  const [code, setCode] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  // Autorización del acudiente (6g, solo con la base): firmada y recibida es obligatoria; la de salud, facultativa.
  const [auth, setAuth] = useState({ received: false, health: false });
  const [authTried, setAuthTried] = useState(false);
  const { t } = useI18n();
  const x = t.adm.reg, fx = t.adm.fixed;
  const opt = (list: string[]) => list.map((v) => ({ value: v, label: fx(v) }));
  // Grados y cursos: en demostración los del sistema; en modo normal, los activos de la estructura académica.
  const opts = courseQ.data ?? [];
  const gradeOpts = DEMO ? ["6", "7", "8", "9", "10", "11"].map((g) => ({ value: g, label: t.adm.gradeName(GRADE_NAME[g]) }))
    : opts.filter((c, i) => opts.findIndex((y) => y.gradeId === c.gradeId) === i).map((c) => ({ value: c.gradeId, label: t.adm.gradeName(c.gradeName) }));
  const courseOpts = DEMO ? [v.grade + "A", v.grade + "B"] : opts.filter((c) => c.gradeId === v.grade).map((c) => c.id);
  const gradeName = DEMO ? t.adm.gradeName(GRADE_NAME[v.grade]) : gradeOpts.find((g) => g.value === v.grade)?.label ?? v.grade;
  // Al cargar los cursos reales, el formulario toma el primer grado y curso que existen.
  useEffect(() => {
    if (DEMO || !opts.length || opts.some((c) => c.gradeId === v.grade && c.id === v.course)) return;
    setV((cur) => ({ ...cur, grade: opts[0].gradeId, course: opts[0].id }));
  }, [opts]);
  const set = (k: keyof RegForm) => (e: { target: { value: string } } | string) => setV({ ...v, [k]: typeof e === "string" ? e : e.target.value });
  const docErr = v.doc.trim() && !/^\d{8,12}$/.test(v.doc.trim()) ? x.docErr : null;
  const err = (k: keyof RegForm) => (tried[step] && REQ[step] && REQ[step].indexOf(k) >= 0 && !String(v[k]).trim() ? x.required : k === "doc" && tried[step] ? docErr : null);
  const emailErr = (k: keyof RegForm) => (v[k] && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v[k]) ? x.emailErr : null);
  const valid = (i: number) => (REQ[i] || []).every((k) => String(v[k as keyof RegForm]).trim()) && (i !== 0 || !docErr);
  function next() {
    setTried({ ...tried, [step]: true });
    if (!valid(step)) return;
    if (step < 3) { setStep(step + 1); return; }
    if (!DEMO && !auth.received) { setAuthTried(true); return; }
    setSaveErr(null);
    enroll.mutateAsync({ ...v, authHealth: auth.health }).then((id) => { setCode(id); setDone(true); }, (e) => setSaveErr(enrollMessage(e, t)));
  }

  if (done) {
    return (
      <Block tone="sage" className="ns-reg-done">
        <span className="ns-dialog-seal ns-dialog-seal--sage" aria-hidden><Icon name="check" size={22} /></span>
        <h2 className="ns-block-h">{x.done}</h2>
        <p>{x.doneText(v.first + " " + v.last, gradeName, v.course, v.year, code)}</p>
        <div className="ns-row">
          <Button icon="plus" onClick={() => { setDone(false); setCode(null); setStep(0); setTried({}); setAuth({ received: false, health: false }); setAuthTried(false); setV({ ...v, first: "", last: "", doc: "", birth: "" }); }}>{x.another}</Button>
          <Button variant="secondary" onClick={() => onNavigate?.("students")}>{x.seeStudents}</Button>
        </div>
      </Block>
    );
  }

  let body: ReactNode;
  if (step === 0) {
    body = (
      <div className="ns-form-grid">
        <Input label={x.first} required value={v.first} onChange={set("first")} error={err("first")} autoComplete="off" />
        <Input label={x.last} required value={v.last} onChange={set("last")} error={err("last")} />
        <Select label={x.docType} required value={v.docType} onChange={set("docType")} options={opt(DOC_TYPES)} />
        <Input label={x.docNumber} required inputMode="numeric" value={v.doc} onChange={set("doc")} error={err("doc")} hint={x.docHint} />
        <Input label={x.birth} required type="date" value={v.birth} onChange={set("birth")} error={err("birth")} />
        <Input label={x.phone} type="tel" value={v.phone} onChange={set("phone")} />
        <Input label={x.email} type="email" value={v.email} onChange={set("email")} error={emailErr("email")} className="ns-span-2" />
      </div>
    );
  } else if (step === 1) {
    body = (
      <>
        <p className="ns-sensitive"><Icon name="lock" size={16} />{x.sensitive}</p>
        {DEMO ? null : (
          <Checkbox label={x.healthAuth} checked={auth.health} onChange={(y) => setAuth({ ...auth, health: y })} />
        )}
        {DEMO || auth.health ? null : <span className="ns-caption">{x.noHealth}</span>}
        <div className="ns-form-grid">
          <Input label={x.allergies} value={v.allergies} onChange={set("allergies")} placeholder={x.allergiesPh} />
          <Input label={x.conditions} value={v.conditions} onChange={set("conditions")} />
          <Textarea label={x.medNotes} value={v.medNotes} onChange={set("medNotes")} className="ns-span-2" rows={2} />
          <Input label={x.emName} value={v.emName} onChange={set("emName")} />
          <Input label={x.emPhone} type="tel" value={v.emPhone} onChange={set("emPhone")} />
        </div>
      </>
    );
  } else if (step === 2) {
    body = (
      <div className="ns-form-grid">
        <Input label={x.gName} required value={v.gName} onChange={set("gName")} error={err("gName")} />
        <Select label={x.rel} required value={v.gRel} onChange={set("gRel")} placeholder={t.adm.f.choose} options={opt(RELATIONS)} error={err("gRel")} />
        <Input label={x.gDoc} value={v.gDoc} onChange={set("gDoc")} />
        <Input label={x.gPhone} required type="tel" value={v.gPhone} onChange={set("gPhone")} error={err("gPhone")} />
        <Input label={x.email} type="email" value={v.gEmail} onChange={set("gEmail")} error={emailErr("gEmail")} hint={x.gEmailHint} className="ns-span-2" />
      </div>
    );
  } else {
    body = (
      <div className="ns-form-grid">
        <Select label={x.year} required value={v.year} onChange={set("year")} options={["2026", "2027"]} />
        <Select label={t.adm.f.grade} required value={v.grade} onChange={(y) => setV({ ...v, grade: y, course: DEMO ? y + "A" : opts.find((c) => c.gradeId === y)?.id ?? "" })} options={gradeOpts} />
        <Select label={t.adm.f.course} required value={v.course} onChange={set("course")} options={courseOpts} />
        <Select label={x.enrollState} value={v.state} onChange={set("state")} options={opt(["Activo", "Pendiente"])} />
        <div className="ns-span-2 ns-summary-card">
          <span className="ns-overline">{x.summary}</span>
          <strong>{(v.first || "—") + " " + v.last}</strong>
          <span className="ns-caption">{x.summaryLine(fx(v.docType), v.doc || "—", v.gName || "—", gradeName, v.course)}</span>
        </div>
        {DEMO ? null : (
          <div className="ns-span-2 ns-col" style={{ gap: 6 }}>
            <Checkbox label={x.authReceived} checked={auth.received} onChange={(y) => { setAuth({ ...auth, received: y }); setAuthTried(false); }} />
            {authTried && !auth.received ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{x.authMissing}</span> : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ns-reg">
      <ol className="ns-reg-steps" aria-label={x.sectionsAria}>
        {REG_SECTIONS.map((s, i) => {
          const ok = i < step;
          return (
            <li key={s[0]}>
              <button type="button" className={cx("ns-reg-step", i === step && "is-on", ok && "is-done")} aria-current={i === step ? "step" : undefined} onClick={() => { if (i <= step || valid(step)) setStep(i); }}>
                <span className="ns-reg-num">{ok ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
                <span>{x.sections[s[0]]}{s[0] === "medical" ? <small>{x.optional}</small> : null}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <Block className="ns-reg-body">
        <div className="ns-block-title">
          <h2>{x.sections[REG_SECTIONS[step][0]]}</h2>
          <span className="ns-caption">{x.sectionOf(step + 1)}<span className="ns-req">*</span>{x.requiredMark}</span>
        </div>
        {body}
        {saveErr ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{saveErr}</span> : null}
        <div className="ns-reg-actions">
          {step > 0 ? <Button variant="ghost" icon="chevleft" onClick={() => setStep(step - 1)}>{x.prev}</Button> : <span />}
          <Button icon={step === 3 ? "check" : undefined} iconRight={step < 3 ? "arrow" : undefined} loading={enroll.isPending} onClick={next}>{step === 3 ? x.save : x.next}</Button>
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
  // Modo normal: filas leídas del archivo. En demostración, el archivo de ejemplo del sistema.
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [count, setCount] = useState(DEMO_IMPORT.total);
  const [imported, setImported] = useState(0);
  const importMut = useImportStudents();
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  // Importar exige las autorizaciones firmadas de los acudientes (6g, solo con la base).
  const [importAuth, setImportAuth] = useState(false);
  const [importAuthTried, setImportAuthTried] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const total = DEMO ? DEMO_IMPORT.total : count;
  const pendingIssues = issues.filter((x) => x.state === "error" || x.state === "duplicate" || x.state === "warning");
  const blocking = issues.filter((x) => x.state === "error").length;
  const valid = total - issues.length + issues.filter((x) => x.state === "fixed" || x.state === "warning").length;
  const upd = (i: number, patch: Partial<ImportIssue>) => setIssues(issues.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const courseOptions = useCourseOptions();
  const { t, lang } = useI18n();
  const x = t.adm.imp;
  /** Detalle de la fila: en español el texto de siempre; en otro idioma, el del código si lo hay. */
  const detail = (r: Issue) => (lang === "es" || !r.code ? r.msg : t.adm.issue(r.code, r.arg));
  const fixMsg = (code: "docFixed" | "courseFixed" | "skipped") => ({ msg: es.adm.issue(code), code });

  const stepper = (
    <ol className="ns-stepper ns-stepper--6" aria-label={x.stepsAria}>
      {(lang === "es" ? IMPORT_STEPS : x.steps).map((s, i) => (
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
        <ImportFileZone onError={setErr} onFile={(f) => {
          if (DEMO) { setFile(f); setErr(null); setStep(1); return; }
          setErr(null); setBusy(true);
          readImportFile(f.file!).then(
            (r) => { setFile(f); setRows(r.rows); setCount(r.total); setIssues(r.issues); setStep(1); },
            (e) => setErr(e instanceof EnrollError ? enrollMessage(e, t) : e instanceof Error && !("code" in e) ? e.message : t.adm.err.readRetry),
          ).finally(() => setBusy(false));
        }} />
        <Block tone="gold">
          <BlockTitle>{x.before}</BlockTitle>
          <ul className="ns-checklist">
            {x.checklist.map((c) => <li key={c}><Icon name="check" size={16} />{c}</li>)}
          </ul>
          <div className="ns-row">
            {/* La plantilla conserva los encabezados en español: el lector del archivo los espera así. */}
            <Button variant="secondary" icon="download" onClick={() => exportCSV(x.templateFile, IMPORT_HEADERS, [["María José", "Paz Rosero", "Tarjeta de identidad", "1084000000", "12/03/2014", "7A", "Gloria Rosero", "Madre", "3120000000"]])}>{x.template}</Button>
            {/* El ejemplo es de la demostración: en modo normal importaría estudiantes inventados. */}
            {DEMO ? <Button variant="ghost" onClick={() => { setFile({ name: "estudiantes_2026.xlsx", size: 48213 }); setStep(1); }}>{x.example}</Button> : null}
          </div>
          {busy && !DEMO ? <span className="ns-caption" role="status">{x.reading}</span> : null}
          {err ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{err}</span> : null}
        </Block>
      </div>
    );
  } else if (step === 1) {
    content = (
      <Block>
        <BlockTitle action={<Badge tone="neutral" icon="file">{file!.name + " · " + Math.round(file!.size / 1024) + " KB"}</Badge>}>{x.found(total)}</BlockTitle>
        <p className="ns-caption">{x.readNote}</p>
        <DataTable
          caption={x.previewCaption}
          columns={x.cols.map((c, i) => ({ key: "c" + i, label: c }))}
          rows={DEMO
            ? ALL_STUDENTS.slice(0, 5).map((s, i) => ({ id: i, c0: s.first, c1: s.last, c2: s.document, c3: "1" + (i + 2) + "/0" + (i + 3) + "/2013", c4: s.course, c5: s.guardian, c6: s.guardianPhone }))
            : rows.slice(0, 5).map((r) => ({ id: r.row, c0: r.first, c1: r.last, c2: r.doc, c3: r.birth, c4: r.course, c5: r.guardian, c6: r.phone }))}
        />
        <div className="ns-reg-actions">
          <Button variant="ghost" icon="chevleft" onClick={() => setStep(0)}>{x.change}</Button>
          <Button iconRight="arrow" loading={busy} loadingText={x.validating} onClick={() => {
            setBusy(true);
            // En modo normal la validación ya se hizo al leer el archivo; en demostración se simula.
            if (!DEMO) { setBusy(false); setStep(2); return; }
            timer.current = window.setTimeout(() => { setBusy(false); setStep(2); }, 900);
          }}>{x.validate}</Button>
        </div>
      </Block>
    );
  } else if (step === 2 || step === 3) {
    const shown: IssueRow[] = issues.map((x, i) => ({ _i: i, ...x })).filter((x) => filter === "all" || x.state === filter);
    content = (
      <>
        <div className="ns-import-summary">
          <div className="ns-bento-tile ns-bento-tile--lead"><span className="ns-bento-value ns-bento-value--xl">{total}<small>{x.foundSuffix}</small></span></div>
          <div className="ns-bento-tile ns-bento-tile--sage"><span className="ns-bento-value">{valid}</span><span className="ns-bento-label"><Icon name="check" size={16} />{x.valid}</span></div>
          <div className="ns-bento-tile ns-bento-tile--burgundy"><span className="ns-bento-value">{pendingIssues.length}</span><span className="ns-bento-label"><Icon name="warning" size={16} />{x.review}</span></div>
        </div>
        <Block>
          <BlockTitle action={<FilterGroup label={x.show} value={filter} onChange={setFilter} options={[{ value: "all", label: t.adm.f.all }, { value: "error", label: t.adm.rowState.error }, { value: "duplicate", label: t.adm.rowState.duplicate }, { value: "warning", label: t.adm.rowState.warning }]} />}>
            {step === 2 ? x.perRow : x.fix}
          </BlockTitle>
          <DataGrid<IssueRow>
            caption={x.gridCaption} rows={shown} rowKey={(r) => String(r.row)} paginate={false} density="compact" emptyTitle={x.noRows}
            columns={[
              { key: "row", label: x.row, numeric: true },
              { key: "name", label: t.adm.f.student, header: true },
              {
                key: "doc", label: x.doc, render: (r) => (step === 3 && r.field === "doc" && r.state === "error"
                  ? <Input hideLabel label={x.fixDoc(r.name)} defaultValue={r.doc} onBlur={(e) => { if (/\d{8,}/.test(e.target.value)) upd(r._i, { doc: e.target.value, state: "fixed", ...fixMsg("docFixed") }); }} />
                  : r.doc || "—"),
              },
              {
                key: "course", label: t.adm.f.course, render: (r) => (step === 3 && r.field === "course" && r.state === "error"
                  ? (
                    <select className="ns-select" aria-label={x.fixCourse(r.name)} defaultValue="" onChange={(e) => upd(r._i, { course: e.target.value, state: "fixed", ...fixMsg("courseFixed") })}>
                      <option value="" disabled>{r.course + " → ?"}</option>
                      {(DEMO ? COURSES : (courseOptions.data ?? []).map((c) => c.id)).map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )
                  : r.course),
              },
              { key: "state", label: x.result, render: (r) => { const s = ROW_STATE[r.state]; return <Badge tone={s[1]} icon={s[2]}>{t.adm.rowState[r.state]}</Badge>; } },
              { key: "msg", label: x.detail, render: detail },
            ]}
            rowActions={step === 3 ? (r) => (r.state === "error" || r.state === "duplicate"
              ? <Button size="sm" variant="ghost" onClick={() => upd(r._i, { state: "skipped", ...fixMsg("skipped") })}>{x.skip}</Button>
              : r.state === "warning" ? <Badge tone="neutral" icon={false}>{x.imported}</Badge> : null) : undefined}
          />
          <div className="ns-reg-actions">
            <Button variant="ghost" icon="chevleft" onClick={() => setStep(step - 1)}>{t.adm.reg.prev}</Button>
            {step === 2
              ? <Button iconRight="arrow" onClick={() => setStep(3)}>{x.fix}</Button>
              : <Button iconRight="arrow" disabled={blocking > 0} onClick={() => setStep(4)}>{blocking ? x.resolve(blocking) : x.continue}</Button>}
          </div>
        </Block>
      </>
    );
  } else if (step === 4) {
    content = (
      <Block tone="gold" className="ns-reg-done">
        <h2 className="ns-block-h">{x.confirmTitle}</h2>
        <p>{x.willRegister}<strong>{x.nStudents(valid)}</strong>{x.skipped(issues.filter((y) => y.state === "skipped").length)}</p>
        <div className="ns-row">
          <Button variant="ghost" icon="chevleft" onClick={() => setStep(3)}>{x.again}</Button>
          <Button icon="upload" size="lg" onClick={() => setConfirm(true)}>{x.confirm}</Button>
        </div>
      </Block>
    );
  } else {
    content = (
      <Block tone="sage" className="ns-reg-done">
        <span className="ns-dialog-seal ns-dialog-seal--sage" aria-hidden><Icon name="check" size={22} /></span>
        <h2 className="ns-block-h">{x.doneTitle}</h2>
        <p>{x.doneText(DEMO ? valid : imported)}</p>
        <div className="ns-row">
          <Button variant="secondary" icon="download" onClick={() => exportCSV(x.reportFile, x.reportHead, issues.map((y) => [y.row, y.name, y.doc, y.course, t.adm.rowState[y.state], detail(y)]))}>{x.report}</Button>
          <Button iconRight="arrow" onClick={() => onNavigate?.("students")}>{t.adm.reg.seeStudents}</Button>
          <Button variant="ghost" onClick={() => { setStep(0); setFile(null); setRows([]); setIssues(DEMO ? IMPORT_ISSUES.map((y) => ({ ...y })) : []); }}>{x.another}</Button>
        </div>
      </Block>
    );
  }

  return (
    <div className="ns-col" style={{ gap: 24 }}>
      {stepper}
      {content}
      <ConfirmAction open={confirm} onCancel={() => setConfirm(false)} icon="upload" title={x.askTitle(valid)} loading={importMut.isPending}
        description={x.askText(new Date().getFullYear())} confirmLabel={x.confirm}
        onConfirm={() => {
          if (!DEMO && !importAuth) { setImportAuthTried(true); return; }
          importMut.mutateAsync({ rows, issues }).then(
            (n) => { setImported(n); setConfirm(false); setStep(5); },
            (e) => { setConfirm(false); setErr(enrollMessage(e, t)); },
          );
        }}>
        {DEMO ? null : (
          <div className="ns-col" style={{ gap: 6 }}>
            <Checkbox label={x.authAll(valid)} checked={importAuth} onChange={(y) => { setImportAuth(y); setImportAuthTried(false); }} />
            {importAuthTried && !importAuth ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{x.authMissing}</span> : null}
            <span className="ns-caption">{x.noHealth}</span>
          </div>
        )}
      </ConfirmAction>
      {err && step === 4 ? <span className="ns-field-error" role="alert"><Icon name="error" size={16} />{x.noneImported(err)}</span> : null}
    </div>
  );
}
