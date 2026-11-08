import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GRADE_NAME } from "../../../data/academic";
import { PERIODS, exportCSV } from "../../../data/admin";
import { COURSES, type StudentRecord } from "../../../data/students";
import { DEMO } from "../../../lib/supabase";
import { rankRows, saveClearance, useAcademic, type ClearKey, type RankRow } from "../../../services/enrollment";
import { cardOf, useMarkGenerated, useReportCards, type RcRow, type RcState } from "../../../services/reportCards";
import { useStudents } from "../../../services/students";
import { Avatar } from "../../atoms/Avatar";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction } from "../../atoms/Controls";
import type { IconName } from "../../atoms/Icon";
import { Switch } from "../../atoms/Switch";
import { FilterGroup } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { ConfirmAction, Modal } from "../Overlays";
import { ReportCardView } from "../ReportCardDocument";
import { PrintDocuments } from "../PrintDocuments";
import { useToast } from "../Toast";
import { useI18n } from "../../../i18n/I18nProvider";

/* ---------- Boletines ---------- */

/** Tono e icono de cada estado; la palabra sale del diccionario (t.adm.rcState). */
const RC: Record<RcState, [BadgeTone, IconName]> = { pending: ["pending", "clock"], generated: ["verified", "check"], blocked: ["review", "lock"] };

/** Previsualiza y genera boletines; los estudiantes sin paz y salvo quedan bloqueados. El PDF sale de la impresión. */
export function ReportCardManager() {
  const [course, setCourse] = useState("7A");
  const [period, setPeriod] = useState("Periodo 3");
  const [status, setStatus] = useState("all");
  const [preview, setPreview] = useState<RcRow | null>(null);
  const [showToast, toastNode] = useToast();
  const [confirmAll, setConfirmAll] = useState(false);
  const [gen, setGen] = useState<Record<string, true>>({});
  const [printing, setPrinting] = useState<RcRow[] | null>(null);
  const q = useReportCards({ course, period });
  const mark = useMarkGenerated();
  const { t, shownGrade } = useI18n();
  const x = t.adm.rc, pn = t.tch.periodName;
  const d = q.data;
  // Modo normal: al llegar los datos, el curso y el periodo se ajustan a los que existen (el abierto por defecto).
  useEffect(() => {
    if (DEMO || !d) return;
    if (d.courses.length && !d.courses.some((c) => c.id === course)) setCourse(d.courses[0].id);
    if (d.periods.length && !d.periods.includes(period)) setPeriod(d.periods[d.periods.length - 1]);
  }, [d]);
  const rows: RcRow[] = (d?.rows ?? []).map((r) => (r.rc === "pending" && gen[r.id] ? { ...r, rc: "generated" as RcState } : r)).filter((s) => status === "all" || s.rc === status);
  const gradeOf = (c: string) => (DEMO ? c.charAt(0) : d?.courses.find((x) => x.id === c)?.gradeId ?? "");
  const grades = DEMO ? ["6", "7", "8"].map((g) => ({ value: g, label: t.adm.gradeName(GRADE_NAME[g]) }))
    : (d?.courses ?? []).filter((c, i, all) => all.findIndex((y) => y.gradeId === c.gradeId) === i).map((c) => ({ value: c.gradeId, label: t.adm.gradeName(c.gradeName) }));
  const courseIds = DEMO ? COURSES : (d?.courses ?? []).map((c) => c.id);
  function generate(list: RcRow[]) {
    const ok = list.filter((s) => s.rc !== "blocked");
    if (DEMO) {
      const o = { ...gen };
      ok.forEach((s) => { o[s.id] = true; });
      setGen(o);
      showToast({ tone: "success", title: x.generated(ok.length), message: x.readyDemo(pn(period)) });
      return;
    }
    if (!ok.length) { showToast({ tone: "info", title: x.nothing, message: x.nothingText }); return; }
    setPrinting(ok);
  }
  function afterPrint() {
    const ok = printing ?? [];
    setPrinting(null);
    mark.mutateAsync({ ids: ok.map((r) => r.id), period }).then(
      () => showToast({ tone: "success", title: x.generated(ok.length), message: x.savedPdf(pn(period)) }),
      () => showToast({ tone: "error", title: x.markError, message: x.markErrorText }),
    );
  }
  return (
    <>
      <DataGrid<RcRow>
        caption={x.caption} rows={rows} selectable pageSize={12} density="compact" resetKey={course + status + period}
        loading={q.isPending && !d} error={q.isError && !d ? x.loadError : undefined} onRetry={() => q.refetch()}
        emptyTitle={d?.rows.length ? x.noState : x.noActive} emptyIcon="book"
        toolbar={<>
          <FilterGroup as="select" label={t.adm.f.grade} value={gradeOf(course)} onChange={(g) => setCourse(DEMO ? g + "A" : courseIds.find((c) => gradeOf(c) === g) ?? course)} options={grades} />
          <FilterGroup as="select" label={t.adm.f.course} value={course} onChange={setCourse} options={courseIds.filter((c) => gradeOf(c) === gradeOf(course)).map((c) => ({ value: c, label: c }))} />
          <FilterGroup as="select" label={t.adm.f.period} value={period} onChange={setPeriod} options={(d?.periods ?? PERIODS).map((p) => ({ value: p, label: pn(p) }))} />
          <FilterGroup label={t.adm.f.state} value={status} onChange={setStatus} options={[{ value: "all", label: t.adm.f.all }, { value: "pending", label: x.stateFilter.pending }, { value: "generated", label: x.stateFilter.generated }, { value: "blocked", label: x.stateFilter.blocked }]} />
        </>}
        bulkActions={(sel, clear) => <Button size="sm" icon="book" onClick={() => { generate(sel); clear(); }}>{x.generateSel}</Button>}
        columns={[
          { key: "name", label: t.adm.f.student, header: true, sortable: true, render: (r) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={r.name} size="sm" />{r.name}</div> },
          { key: "course", label: t.adm.f.course, render: (r) => <span className="ns-course-tag">{r.course}</span> },
          { key: "avg", label: x.avg, numeric: true, sortable: true, render: (r) => <span className="ns-table-grade">{shownGrade(r.avg)}</span> },
          { key: "rc", label: t.adm.f.state, sortable: true, render: (r) => { const s = RC[r.rc]; return <Badge tone={s[0]} icon={s[1]}>{t.adm.rcState[r.rc]}</Badge>; } },
        ]}
        rowActions={(r) => [
          <Button key="p" size="sm" variant="ghost" icon="eye" onClick={() => setPreview(r)}>{x.preview}</Button>,
          <IconAction key="g" icon="download" label={x.pdfOf(r.name)} disabled={r.rc === "blocked"} onClick={() => generate([r])} />,
        ]}
      />
      <ConfirmAction open={confirmAll} icon="book" onCancel={() => setConfirmAll(false)} title={x.allTitle(course)}
        description={DEMO ? x.allDescDemo : x.allDesc}
        confirmLabel={x.generateAll} onConfirm={() => { setConfirmAll(false); generate(rows); }} />
      <Modal
        open={!!preview} onClose={() => setPreview(null)} size="doc" title={x.previewTitle} description={preview ? preview.name + " · " + pn(period) : ""}
        actions={[
          <Button key="c" variant="secondary" onClick={() => setPreview(null)} data-autofocus>{x.close}</Button>,
          preview && preview.rc !== "blocked"
            ? <Button key="g" icon="download" onClick={() => { generate([preview]); setPreview(null); }}>{x.generatePdf}</Button>
            : <Badge key="b" tone="review" icon="lock">{x.blockedBadge}</Badge>,
        ]}
      >
        {/* D2: el boletín es documento oficial y sale en español; en inglés y portugués una línea lo dice. */}
        {preview && x.paperNote ? <p className="ns-caption" style={{ margin: 0 }}>{x.paperNote}</p> : null}
        {preview ? <div className="ns-paper-scroll"><ReportCardView data={cardOf(preview, period)} /></div> : null}
      </Modal>
      <div className="ns-sticky-cta"><Button size="lg" icon="book" disabled={!rows.some((r) => r.rc !== "blocked")} onClick={() => setConfirmAll(true)}>{x.generateAll}</Button></div>
      {printing ? <PrintDocuments docs={printing.map((r) => cardOf(r, period))} onDone={afterPrint} /> : null}
      {toastNode}
    </>
  );
}

/* ---------- Paz y Salvos ---------- */

/** Biblioteca, pensiones y documentos: si falta alguno, reportes y boletines quedan bloqueados para el acudiente. */
export function PazYSalvosTable() {
  const q = useStudents();
  const qc = useQueryClient();
  const [rows, setRows] = useState<StudentRecord[]>(() => (q.data ?? []).filter((s) => s.status === "active" || s.status === "pending"));
  const lastData = useRef(q.data);
  useEffect(() => { if (lastData.current !== q.data) { lastData.current = q.data; setRows((q.data ?? []).filter((s) => s.status === "active" || s.status === "pending")); } }, [q.data]);
  const [course, setCourse] = useState("7A");
  const [only, setOnly] = useState("all");
  const [showToast, toastNode] = useToast();
  const { t } = useI18n();
  const x = t.adm.clr;
  const courses = DEMO ? COURSES : [...new Set(rows.map((r) => r.course))].filter(Boolean).sort();
  // Guardado optimista: el interruptor cambia al instante y vuelve atrás si la base lo rechaza.
  function change(ids: string[], k: ClearKey, v: boolean, done?: () => void) {
    const before = rows;
    setRows(rows.map((r) => (ids.includes(r.id) ? { ...r, [k]: v } : r)));
    saveClearance(ids, k, v).then(() => {
      // Las demás pantallas de estudiantes releerán al abrirse (aquí ya se ve el cambio).
      if (!DEMO) qc.invalidateQueries({ queryKey: ["students"], refetchType: "none" });
      done?.();
    }, () => {
      setRows(before);
      showToast({ tone: "error", title: x.saveError, message: x.saveErrorText });
    });
  }
  const list = rows.filter((r) => { const ok = r.library && r.fees && r.documents; return (course === "all" || r.course === course) && (only === "all" || (only === "blocked" ? !ok : ok)); });
  const blocked = rows.filter((r) => (course === "all" || r.course === course) && !(r.library && r.fees && r.documents)).length;
  const sw = (r: StudentRecord, k: ClearKey, label: string) => <Switch ariaLabel={x.of(label, r.name)} checked={r[k]} onChange={(v) => change([r.id], k, v)} onText={x.upToDate} offText={x.pending} />;
  return (
    <>
      <DataGrid<StudentRecord>
        caption={x.caption} rows={list} selectable pageSize={12} density="compact" resetKey={course + only}
        loading={q.isPending && !q.data} error={q.isError && !q.data ? x.loadError : undefined} onRetry={() => q.refetch()}
        emptyTitle={rows.length ? x.noMatch : x.noActive} emptyIcon="shield"
        toolbar={<>
          <FilterGroup as="select" label={t.adm.f.course} value={course} onChange={setCourse} options={[{ value: "all", label: t.adm.f.all }, ...courses.map((c) => ({ value: c, label: c }))]} />
          <FilterGroup label={x.access} value={only} onChange={setOnly} options={[{ value: "all", label: t.adm.f.all }, { value: "blocked", label: x.blocked, count: blocked }, { value: "ok", label: x.enabled }]} />
        </>}
        bulkActions={(sel, clear) => [
          <Button key="d" size="sm" variant="secondary" icon="check" onClick={() => {
            change(sel.map((y) => y.id), "documents", true, () => showToast({ tone: "success", title: x.docsOk, message: x.updated(sel.length) }));
            clear();
          }}>{x.markDocs}</Button>,
        ]}
        columns={[
          { key: "name", label: t.adm.f.student, header: true, sortable: true, render: (r) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={r.name} size="sm" /><span>{r.name}<small className="ns-caption" style={{ display: "block" }}>{r.course}</small></span></div> },
          { key: "library", label: x.library, render: (r) => sw(r, "library", x.library) },
          { key: "fees", label: x.fees, render: (r) => sw(r, "fees", x.fees) },
          { key: "documents", label: x.documents, render: (r) => sw(r, "documents", x.documents) },
          { key: "general", label: x.general, render: (r) => { const n = [r.library, r.fees, r.documents].filter(Boolean).length; return <span className="ns-caption" style={{ color: "var(--navy)", fontWeight: 700 }}>{x.nOf3(n)}</span>; } },
          { key: "access", label: x.reports, sortValue: (r) => (r.library && r.fees && r.documents ? 1 : 0), sortable: true, render: (r) => { const ok = r.library && r.fees && r.documents; return <Badge tone={ok ? "verified" : "review"} icon={ok ? "check" : "lock"}>{ok ? x.enabled : x.blocked}</Badge>; } },
        ]}
      />
      {toastNode}
    </>
  );
}

/* ---------- Ranking académico ---------- */

/** Ordena por promedio de notas verificadas; sin notas en el filtro, el estudiante no se ubica. */
export function RankingTable() {
  const q = useAcademic();
  const d = q.data;
  const [grade, setGrade] = useState("all");
  const [course, setCourse] = useState("all");
  const [period, setPeriod] = useState("Periodo 3");
  const [subject, setSubject] = useState("all");
  const [showToast, toastNode] = useToast();
  const { t, shownGrade } = useI18n();
  const x = t.adm.rank, pn = t.tch.periodName;
  // En modo normal el periodo por defecto es el abierto.
  useEffect(() => { if (!DEMO && d) { const open = d.periods.find((p) => p.status === "open") ?? d.periods[d.periods.length - 1]; if (open) setPeriod(open.name); } }, [d]);
  const list: RankRow[] = d ? rankRows(d, { period, subject, grade, course }) : [];
  const grades = (DEMO ? [["6", "Sexto"], ["7", "Séptimo"], ["8", "Octavo"]] : (d?.courses ?? []).filter((c, i, all) => all.findIndex((y) => y.gradeId === c.gradeId) === i).map((c) => [c.gradeId, c.gradeName]))
    .map(([value, label]) => [value, t.adm.gradeName(label)]);
  const courseIds = DEMO ? COURSES : (d?.courses ?? []).map((c) => c.id);
  const gradeOfCourse = (c: string) => (DEMO ? c.charAt(0) : d?.courses.find((x) => x.id === c)?.gradeId ?? "");
  const ST = (s: RankRow): [string, BadgeTone, IconName] => (s.score >= 4.6 ? [x.status.top, "high", "star"] : s.score >= 3 ? [x.status.passed, "verified", "check"] : [x.status.risk, "review", "warning"]);
  const year = String(new Date().getFullYear());
  return (
    <>
      <DataGrid<RankRow>
        caption={x.caption} rows={list} pageSize={15} densityToggle density="compact" initialSort={{ key: "pos", dir: "asc" }} resetKey={grade + course + subject + period}
        loading={q.isPending && !d} error={q.isError && !d ? x.loadError : undefined} onRetry={() => q.refetch()}
        emptyTitle={x.empty} emptyMessage={x.emptyText} emptyIcon="trophy"
        toolbar={<>
          <FilterGroup as="select" label={x.year} value={DEMO ? "2026" : year} options={DEMO ? [{ value: "2026", label: "2026" }, { value: "2025", label: "2025" }] : [{ value: year, label: year }]} />
          <FilterGroup as="select" label={t.adm.f.period} value={period} onChange={setPeriod} options={[...(d?.periods ?? []).map((p) => ({ value: p.name, label: pn(p.name) })), { value: "Año", label: x.annual }]} />
          <FilterGroup as="select" label={t.adm.f.grade} value={grade} onChange={(v) => { setGrade(v); setCourse("all"); }} options={[{ value: "all", label: t.adm.f.all }, ...grades.map(([value, label]) => ({ value, label }))]} />
          <FilterGroup as="select" label={t.adm.f.course} value={course} onChange={setCourse} options={[{ value: "all", label: t.adm.f.all }, ...courseIds.filter((c) => grade === "all" || gradeOfCourse(c) === grade).map((c) => ({ value: c, label: c }))]} />
          <FilterGroup as="select" label={t.adm.f.subject} value={subject} onChange={setSubject} options={[{ value: "all", label: t.adm.f.allF }, ...(d?.subjects ?? []).map((s) => ({ value: s, label: s }))]} />
          <Button size="sm" variant="secondary" icon="download" disabled={!list.length} onClick={() => {
            exportCSV(x.exportFile(period), x.exportHead, list.map((s) => [s.pos, s.name, s.course, shownGrade(s.score), s.subjectsPassed + "/" + s.subjectsTotal, ST(s)[0]]));
            showToast({ tone: "success", title: x.exported, message: x.exportedText(list.length, period === "Año" ? x.annual : pn(period)) });
          }}>{x.export}</Button>
        </>}
        columns={[
          { key: "pos", label: x.pos, numeric: true, sortable: true, render: (s) => (s.pos <= 3 ? <span className={"ns-medal ns-medal--" + s.pos} aria-label={x.place(s.pos)}>{s.pos}</span> : <span className="ns-pos">{s.pos}</span>) },
          { key: "name", label: t.adm.f.student, sortable: true, header: true, render: (s) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={s.name} size="sm" />{s.name}</div> },
          { key: "course", label: t.adm.f.course, sortable: true, render: (s) => <span className="ns-course-tag">{s.course}</span> },
          { key: "score", label: subject === "all" ? x.avg : x.gradeIn(subject), numeric: true, sortable: true, render: (s) => <span className="ns-table-grade">{shownGrade(s.score)}</span> },
          { key: "subjectsPassed", label: x.passed, numeric: true, sortable: true, render: (s) => x.passedOf(s.subjectsPassed, s.subjectsTotal) },
          { key: "state", label: t.adm.f.state, sortValue: (s) => s.score, sortable: true, render: (s) => { const y = ST(s); return <Badge tone={y[1]} icon={y[2]}>{y[0]}</Badge>; } },
        ]}
      />
      {toastNode}
    </>
  );
}
