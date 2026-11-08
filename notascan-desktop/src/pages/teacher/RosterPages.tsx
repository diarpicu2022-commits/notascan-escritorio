import { useState } from "react";
import { useShell } from "../../app/ShellContext";
import { cx } from "../../lib/cx";
import { DEMO } from "../../lib/supabase";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Progress, SegmentedTabs } from "../../components/atoms/Controls";
import { Input } from "../../components/atoms/Field";
import { Sticker } from "../../components/atoms/Sticker";
import { FilterGroup, FiltersBar } from "../../components/molecules/Filters";
import { ReviewStatus } from "../../components/molecules/ReviewStatus";
import { UserProfile } from "../../components/molecules/UserProfile";
import { DataTable } from "../../components/organisms/DataGrid";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Header } from "../../components/organisms/Header";
import { Block } from "../../components/organisms/Layout";
import { Drawer } from "../../components/organisms/Overlays";
import { useToast } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import { EVAL_STATUS, KIND, type EvalKind, type EvaluationItem, type TeacherStudent } from "../../data/academic";
import { saveMessage } from "../../services/teacher";
import { evaluationRows, studentRows, useCreateEvaluation, useOverview } from "../../services/teacherOverview";
import { assignmentsState, courseOption, queryState, useAssignmentPick } from "./states";
import { useI18n } from "../../i18n/I18nProvider";
import { shortDay } from "../../i18n/dates";

/* Docente · estudiantes de sus cursos y evaluaciones del periodo, con datos de la base (6b.2b). */

/** Descarga un CSV (UTF-8 con BOM y punto y coma, para que Excel en español respete tildes y columnas). */
function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => { const t = String(v); return /[";\n]/.test(t) ? "\"" + t.replace(/"/g, "\"\"") + "\"" : t; };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/** 03 · ¿Cómo va cada estudiante? */
export function StudentsPage() {
  const [q, setQ] = useState("");
  const [c, setC] = useState("all");
  const [st, setSt] = useState("all");
  const { aq, q: oq } = useOverview();
  const all = oq.data ? studentRows(oq.data) : [];
  const { t, shownGrade } = useI18n();
  const x = t.tch.stu;
  const assignments = aq.data ?? [];
  const subjects = [...new Set(assignments.map((a) => a.subject))].join(", ") || "Matemáticas";
  const courses = DEMO ? ["7A", "7B"] : [...new Set(assignments.map((a) => a.courseId))];
  const rows = all.filter((s) => {
    const t = q.trim().toLowerCase();
    return (!t || s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0) && (c === "all" || s.course === c) && (st === "all" || s.status === st);
  });
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(oq, x.loading, x.error)
    ?? (!all.length ? <EmptyState title={x.emptyTitle} message={x.emptyText} icon="students" /> : undefined);
  // El CSV es un archivo de trabajo del docente: sale en el idioma de la app.
  const exportList = () => downloadCsv(x.file(c === "all" ? null : c), [
    [x.cols.id, x.cols.student, x.cols.course, x.cols.avg, x.cols.last, x.cols.state],
    ...rows.map((r) => [r.id, r.name, r.course, isNaN(r.avg) ? "" : shownGrade(r.avg), r.last ?? x.noGrades, x.statusShort[r.status] ?? r.status]),
  ]);
  return (
    <PageShell active="students">
      <Header eyebrow={DEMO ? "Matemáticas · " + t.tch.periodName("Periodo 3") + " · 2026" : subjects + " · " + t.tch.periodName(assignments[0]?.periodName ?? "") + " · " + new Date().getFullYear()} title={x.title} highlight={x.title}
        description={x.desc}
        actions={<Button variant="secondary" icon="download" disabled={!rows.length} onClick={exportList}>{x.export}</Button>} />
      {state ?? <>
        <FiltersBar
          search={q} onSearch={setQ} count={t.tch.studentsCount(rows.length, all.length)}
          groups={[
            { label: t.tch.f.course, value: c, onChange: setC, options: [{ value: "all", label: t.tch.f.allM }, ...courses.map((y) => ({ value: y, label: y }))] },
            { label: t.tch.f.state, as: "select", value: st, onChange: setSt, options: [{ value: "all", label: t.tch.f.allM }, { value: "verified", label: x.statusShort.verified }, { value: "pending", label: x.statusShort.pending }, { value: "needs-review", label: x.statusShort["needs-review"] }] },
          ]}
        />
        {rows.length ? (
          <DataTable<TeacherStudent & Record<string, unknown>>
            caption={x.caption(subjects)} rows={rows as Array<TeacherStudent & Record<string, unknown>>}
            columns={[
              { key: "name", label: x.cols.student, render: (r) => <UserProfile name={r.name} role={t.tch.idOf(r.id)} /> },
              { key: "course", label: x.cols.course, render: (r) => <Sticker tone={r.course === "7A" ? "gold" : "sage"} rotate={0}>{r.course}</Sticker> },
              { key: "avg", label: x.cols.avg, numeric: true, render: (r) => <span className="ns-table-grade">{shownGrade(r.avg)}</span> },
              { key: "perf", label: x.cols.perf, render: (r) => (isNaN(r.avg) ? <span className="ns-caption">{x.noData}</span> : <div style={{ minWidth: 120 }}><Progress value={r.avg - 1} total={4} tone={r.avg >= 4 ? "sage" : r.avg >= 3 ? "gold" : "burgundy"} label={x.perfAria(r.name)} /></div>) },
              { key: "last", label: x.cols.last, render: (r) => r.last ?? x.noGrades },
              { key: "status", label: x.cols.state, render: (r) => <ReviewStatus status={r.status} /> },
            ]}
          />
        ) : <EmptyState title={x.noMatchTitle} message={x.noMatchText} icon="students" />}
      </>}
    </PageShell>
  );
}

type EvalForm = { name: string; kind: EvalKind; weight: string; date: string };
const EMPTY_FORM: EvalForm = { name: "", kind: "examen", weight: "", date: "" };

/** 04 · ¿Qué exámenes, talleres y actividades existen? */
export function EvaluationsPage() {
  const { navigate } = useShell();
  const [tab, setTab] = useState("all");
  const { list: assignments, current, setKey } = useAssignmentPick();
  const { aq, q } = useOverview();
  const create = useCreateEvaluation();
  const [form, setForm] = useState<EvalForm | null>(null);
  const [tried, setTried] = useState(false);
  const [showToast, toastNode] = useToast();
  const [added, setAdded] = useState<EvaluationItem[]>([]);
  const all = (q.data ? evaluationRows(q.data, current?.key) : []).concat(added);
  const list = all.filter((e) => tab === "all" || e.kind === tab);
  const assigned = all.reduce((a, e) => a + e.weight, 0);
  const { t, lang } = useI18n();
  const x = t.tch.ev;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, x.loading, x.error);

  const f = form ?? EMPTY_FORM;
  const w = Number(f.weight.replace(",", "."));
  const errors = {
    name: !f.name.trim() ? x.nameError : undefined,
    weight: !f.weight.trim() || isNaN(w) || w <= 0 || w > 100 ? x.weightError
      : assigned + w > 100 ? x.overError(assigned + w) : undefined,
  };
  const open = () => { setForm(EMPTY_FORM); setTried(false); };
  function submit() {
    setTried(true);
    if (errors.name || errors.weight || !current) return;
    const v = { assignmentKey: current.key, name: f.name, kind: f.kind, weight: w, dueDate: f.date };
    create.mutateAsync(v).then(
      () => {
        // En demostración no hay base: la tarjeta se agrega solo en pantalla.
        if (DEMO) setAdded((cur) => cur.concat({ id: "n" + cur.length, name: v.name.trim(), subject: current.subject, kind: v.kind, weight: w, status: "borrador", reviewed: 0, total: 24, due: v.dueDate || null }));
        setForm(null); setTried(false);
        showToast({ tone: "success", title: x.created, message: x.createdText(v.name.trim(), w, current.courseId) });
      },
      (e) => showToast({ tone: "error", title: x.createError, message: saveMessage(e, t) }),
    );
  }
  // Con más de un curso, el selector va en el encabezado (decisión aprobada en 6b.2; en demostración, solo 7A).
  const picker = !DEMO && assignments.length > 1 ? <FilterGroup as="select" label={t.tch.f.course} value={current?.key} onChange={setKey} options={assignments.map(courseOption)} /> : null;

  return (
    <PageShell active="evaluations">
      <Header eyebrow={current ? current.subject + " · " + current.courseId : x.eyebrow} title={x.title} highlight={x.title}
        description={x.desc}
        actions={<>{picker}<Button size="lg" icon="plus" disabled={!current} onClick={open}>{x.newEval}</Button></>}
        tabs={(["all", "examen", "taller", "actividad"] as const).map((k) => ({ value: k, label: t.tch.kindTabs[k] }))}
        tab={tab} onTab={setTab} />
      {state ?? <>
        <Block tone="gold" className="ns-weight">
          <div>
            <span className="ns-overline" style={{ color: "var(--navy)" }}>{x.assigned}</span>
            <div className="ns-weight-value">{assigned}<small>{x.ofHundred}</small></div>
          </div>
          <div className="ns-weight-bar" role="img" aria-label={x.distribution}>
            {all.map((e) => <span key={e.id} className={"ns-weight-seg ns-weight-seg--" + e.kind} style={{ flex: e.weight }} title={e.name + " " + e.weight + "%"}>{e.weight + "%"}</span>)}
          </div>
        </Block>
        {list.length ? (
          <div className="ns-eval-grid">
            {list.map((e, i) => {
              const st = EVAL_STATUS[e.status];
              return (
                <article key={e.id} className={cx("ns-eval", "ns-eval--" + e.kind)}>
                  <div className="ns-eval-head"><Sticker tone={KIND[e.kind][1]} rotate={i % 2 ? 3 : -3}>{t.tch.kind[e.kind]}</Sticker><Badge tone={st[1]}>{t.tch.evalStatus[e.status]}</Badge></div>
                  <div className="ns-eval-body">
                    <div><h3 className="ns-eval-title">{e.name}</h3><span className="ns-caption">{e.subject + " · " + (e.due ? shortDay(lang, e.due) : t.tch.noDate)}</span></div>
                    <div className="ns-eval-weight">{e.weight}<small>%</small></div>
                  </div>
                  <div className="ns-eval-foot">
                    <div style={{ flex: 1, display: "grid", gap: 6 }}>
                      <span className="ns-caption">{t.tch.verifiedOf(e.reviewed, e.total)}</span>
                      <Progress value={e.reviewed} total={e.total} tone={e.status === "cerrada" ? "sage" : "gold"} label={t.tch.progressOf(e.name)} />
                    </div>
                    <Button variant={e.status === "en-revision" ? "primary" : "secondary"} size="sm" iconRight="arrow" onClick={() => (e.status === "borrador" ? navigate("grade") : navigate("review", DEMO ? undefined : { id: e.id }))}>
                      {e.status === "en-revision" ? x.review : e.status === "borrador" ? x.grade : x.see}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : all.length
          ? <EmptyState title={x.noKindTitle} message={x.noKindText} action={<Button variant="secondary" onClick={() => setTab("all")}>{t.tch.states.seeAll}</Button>} />
          : <EmptyState title={x.noneTitle} message={x.noneText} action={<Button variant="secondary" icon="plus" onClick={open}>{x.newEval}</Button>} />}
      </>}
      <Drawer
        open={!!form} onClose={() => setForm(null)} eyebrow={current ? current.subject + " · " + current.courseId : undefined} title={x.newEval} closeLabel={t.prefs.close}
        footer={[<Button key="c" variant="secondary" onClick={() => setForm(null)}>{t.common.cancel}</Button>, <Button key="s" icon="check" loading={create.isPending} onClick={submit}>{x.create}</Button>]}
      >
        <div className="ns-form-grid ns-form-grid--1">
          <Input label={x.name} required value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} placeholder={x.namePlaceholder} error={tried ? errors.name : undefined} />
          <div className="ns-field">
            <span className="ns-field-label">{t.tch.f.type}</span>
            <SegmentedTabs label={x.kindAria} value={f.kind} onChange={(y) => setForm({ ...f, kind: y as EvalKind })}
              tabs={(["examen", "taller", "actividad"] as const).map((k) => ({ value: k, label: t.tch.kind[k] }))} />
          </div>
          <Input label={x.weight} required inputMode="decimal" value={f.weight} onChange={(e) => setForm({ ...f, weight: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5) })}
            placeholder="20" hint={x.weightHint(assigned)} error={tried ? errors.weight : undefined} />
          <Input label={x.due} type="date" value={f.date} onChange={(e) => setForm({ ...f, date: e.target.value })} />
        </div>
      </Drawer>
      {toastNode}
    </PageShell>
  );
}
