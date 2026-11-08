import { useState } from "react";
import { useShell } from "../../app/ShellContext";
import { Button } from "../../components/atoms/Button";
import { IconAction, SegmentedTabs } from "../../components/atoms/Controls";
import { Icon, type IconName } from "../../components/atoms/Icon";
import { EnrollBadge } from "../../components/molecules/EnrollBadge";
import { UserProfile } from "../../components/molecules/UserProfile";
import { DataGrid } from "../../components/organisms/DataGrid";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { ReviewSummary } from "../../components/organisms/ReviewFlow";
import { PazYSalvosTable, RankingTable, ReportCardManager } from "../../components/organisms/admin/AdminTables";
import { CurriculumManager } from "../../components/organisms/admin/Curriculum";
import { BulkImportPanel, StudentRegistrationForm } from "../../components/organisms/admin/Enrollment";
import { PeriodConfigurator } from "../../components/organisms/admin/Periods";
import { AcademicStructureManager } from "../../components/organisms/admin/Structure";
import { StudentTable } from "../../components/organisms/admin/StudentTable";
import { UserDirectory } from "../../components/organisms/admin/UserDirectory";
import { PageShell } from "../../components/templates/PageShell";
import { useToast } from "../../components/organisms/Toast";
import { DEMO } from "../../lib/supabase";
import { adminMessage, useCreatePeriod, usePeriods } from "../../services/admin";
import type { StudentRecord } from "../../data/students";
import { useAuth } from "../../app/AuthContext";
import { ErrorState, LoadingBlocks } from "../../components/organisms/QueryState";
import { useAdminHome } from "../../services/enrollment";
import { useStudents } from "../../services/students";
import { useI18n } from "../../i18n/I18nProvider";
import { longDay } from "../../i18n/dates";

/* Secretaría: densidad alta, tablas, formularios por secciones, drawers y acciones en lote. */

export function AdminDashboardPage() {
  const { navigate: go } = useShell();
  const me = useAuth().profile;
  const sq = useStudents();
  const hq = useAdminHome(me?.fullName ?? "");
  const all = sq.data ?? [];
  const h = hq.data;
  const active = all.filter((s) => s.status === "active").length;
  const pend = all.filter((s) => s.status === "pending");
  // Bloqueados: en modo normal solo cuenta a quien sigue matriculado (en demostración, la cifra del sistema).
  const blocked = all.filter((s) => (DEMO || s.status === "active" || s.status === "pending") && !(s.library && s.fees && s.documents)).length;
  // En demostración, las tareas del sistema; en modo normal, calculadas de la base.
  const enabled = all.filter((s) => s.status === "active" && s.library && s.fees && s.documents).length;
  const { t, lang } = useI18n();
  const x = t.adm.dash, pn = t.tch.periodName;
  // Las tareas se arman con datos (periodo, fecha ISO, conteos) y el texto sale en el idioma de la app (idiomas, paso 4).
  const tasks: Array<[string, string, IconName, string]> = DEMO ? [
    [x.closePeriod(pn("Periodo 3")), x.closeOn(longDay(lang, "2026-10-15")), "calendar", "periods"],
    [x.generate, x.readyDemo(432, pn("Periodo 2")), "book", "reportcards"],
    [x.blocked(blocked), x.checkDocs, "shield", "clearances"],
    [x.assign("8B", "Inglés"), x.gaps(1), "link", "curriculum"],
  ] : ([
    h?.openPeriod ? [x.closePeriod(pn(h.openPeriod.name)), x.closeOn(longDay(lang, h.openPeriod.close)), "calendar", "periods"] : [x.openPeriod, x.noOpen, "calendar", "periods"],
    h?.lastClosed ? [x.generate, x.toGenerate(Math.max(0, enabled - h.generatedLastClosed), pn(h.lastClosed)), "book", "reportcards"] : null,
    [x.blocked(blocked), blocked ? x.checkDocs : x.allClear, "shield", "clearances"],
    h?.gaps.length ? [x.assign(h.gaps[0].course, h.gaps[0].subject), x.gaps(h.gaps.length), "link", "curriculum"] : null,
  ].filter(Boolean) as Array<[string, string, IconName, string]>);
  const greet = t.tch.dash.greeting[new Date().getHours() < 12 ? "morning" : new Date().getHours() < 19 ? "afternoon" : "evening"];
  const name = DEMO ? "Patricia" : h?.name ?? "";
  const loading = (sq.isPending && !sq.data) || (hq.isPending && !hq.data);
  const failed = (sq.isError && !sq.data) || (hq.isError && !hq.data);
  return (
    <PageShell active="dashboard">
      <Header eyebrow={x.eyebrow(DEMO ? 2026 : new Date().getFullYear())} title={t.tch.dash.title(DEMO ? t.tch.dash.greeting.morning : greet, name)} highlight={name} description={x.desc}
        actions={<>
          <Button variant="secondary" icon="upload" onClick={() => go("enrollment", { tab: "import" })}>{x.import}</Button>
          <Button icon="plus" size="lg" onClick={() => go("enrollment")}>{x.register}</Button>
        </>} />
      {loading ? <LoadingBlocks label={x.loading} /> : failed ? <ErrorState title={x.error} onRetry={() => { sq.refetch(); hq.refetch(); }} /> : (
        <>
          <ReviewSummary total={all.length} verified={active} pending={pend.length} review={blocked} evaluation={x.enrollmentOf(DEMO ? 2026 : new Date().getFullYear())}
            labels={x.tiles} foot={x.needWork(all.length - active)} />
          <div className="ns-admin-cols">
            <Block label={x.pending}>
              <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("students")}>{x.seeStudents}</Button>}>{x.pending}</BlockTitle>
              <DataGrid<StudentRecord>
                caption={x.pending} rows={pend} paginate={false} density="compact" emptyTitle={x.noPending} emptyIcon="check"
                columns={[
                  { key: "name", label: t.adm.f.student, header: true, render: (r) => <UserProfile name={r.name} role={r.document} /> },
                  { key: "course", label: t.adm.f.course }, { key: "guardian", label: t.adm.f.guardian },
                  { key: "status", label: t.adm.f.state, render: (r) => <EnrollBadge status={r.status} /> },
                ]}
                rowActions={() => <Button size="sm" variant="secondary" onClick={() => go("students")}>{x.complete}</Button>}
              />
            </Block>
            <Block tone="gold" label={x.tasks}>
              <BlockTitle>{x.tasks}</BlockTitle>
              <ul className="ns-list">
                {tasks.map((k) => (
                  <li key={k[0]} className="ns-list-item">
                    <span className="ns-file-icon" aria-hidden><Icon name={k[2]} size={18} /></span>
                    <div className="ns-list-main"><strong>{k[0]}</strong><span className="ns-caption">{k[1]}</span></div>
                    <IconAction icon="arrow" label={x.goTo(k[0])} onClick={() => go(k[3])} />
                  </li>
                ))}
              </ul>
            </Block>
          </div>
        </>
      )}
    </PageShell>
  );
}

/** Compartida con Rectoría, que la ve en solo lectura. */
export function StudentsAdminPage() {
  const { role, navigate } = useShell();
  const ro = role === "principal";
  const { t } = useI18n();
  const p = t.adm.pages;
  return (
    <PageShell active="students">
      <Header eyebrow={ro ? p.studentsEyebrowRo : p.studentsEyebrow} title={p.studentsTitle} highlight={p.studentsHighlight}
        description={ro ? p.studentsDescRo : p.studentsDesc}
        actions={ro ? null : <>
          <Button variant="secondary" icon="upload" onClick={() => navigate("enrollment", { tab: "import" })}>{t.adm.dash.import}</Button>
          <Button icon="plus" onClick={() => navigate("enrollment")}>{t.adm.dash.register}</Button>
        </>} />
      <StudentTable readOnly={ro} onNavigate={navigate} />
    </PageShell>
  );
}

export function EnrollmentPage({ tab: initialTab, importStep }: { tab?: string; importStep?: number }) {
  const { navigate } = useShell();
  const [tab, setTab] = useState(initialTab === "import" ? "import" : "register");
  const p = useI18n().t.adm.pages;
  return (
    <PageShell active="enrollment">
      <Header eyebrow={p.enrollEyebrow(2026)} title={p.enrollTitle} highlight={p.enrollTitle} description={p.enrollDesc} />
      <SegmentedTabs label={p.enrollKind} value={tab} onChange={setTab} tabs={[{ value: "register", label: p.enrollRegister, icon: "plus" }, { value: "import", label: p.enrollImport, icon: "upload" }]} />
      {tab === "register" ? <StudentRegistrationForm onNavigate={navigate} /> : <BulkImportPanel onNavigate={navigate} initialStep={importStep} />}
    </PageShell>
  );
}

export function UsersPage() {
  const [invite, setInvite] = useState(false);
  const p = useI18n().t.adm.pages;
  return (
    <PageShell active="users">
      <Header eyebrow={p.usersEyebrow} title={p.usersTitle} highlight={p.usersTitle} description={p.usersDesc} actions={<Button icon="plus" onClick={() => setInvite(true)}>{p.invite}</Button>} />
      <UserDirectory invite={invite} onInviteClose={() => setInvite(false)} />
    </PageShell>
  );
}

export function AcademicStructurePage() {
  const p = useI18n().t.adm.pages;
  return (
    <PageShell active="structure">
      <Header eyebrow={p.structEyebrow} title={p.structTitle} highlight={p.structHighlight} description={p.structDesc} />
      <AcademicStructureManager />
    </PageShell>
  );
}

export function CurriculumPage() {
  const p = useI18n().t.adm.pages;
  return (
    <PageShell active="curriculum">
      <Header eyebrow={p.currEyebrow} title={p.currTitle} highlight={p.currHighlight} description={p.currDesc} />
      <CurriculumManager />
    </PageShell>
  );
}

export function PeriodsPage() {
  const q = usePeriods();
  const create = useCreatePeriod();
  const [showToast, toastNode] = useToast();
  const year = q.data?.periods[q.data.periods.length - 1]?.year ?? 2026;
  const { t } = useI18n();
  const p = t.adm.pages;
  return (
    <PageShell active="periods">
      <Header eyebrow={p.periodsEyebrow(year)} title={p.periodsTitle} highlight={p.periodsHighlight} description={p.periodsDesc}
        actions={<Button variant="secondary" icon="plus" loading={create.isPending} disabled={!q.data} onClick={() => create.mutateAsync(q.data!.periods).then(
          (name) => showToast(DEMO
            ? { tone: "info", title: p.createPeriod, message: p.demoPeriods }
            : { tone: "success", title: p.periodCreated, message: p.periodCreatedText(name ? t.tch.periodName(name) : null) }),
          (e) => showToast({ tone: "error", title: p.periodCreateError, message: e instanceof Error && !("code" in e) ? e.message : adminMessage(e, t) }),
        )}>{p.createPeriod}</Button>} />
      <PeriodConfigurator />
      {toastNode}
    </PageShell>
  );
}

export function ReportCardsPage() {
  const { t } = useI18n();
  const p = t.adm.pages;
  return (
    <PageShell active="reportcards">
      <Header eyebrow={p.rcEyebrow(t.tch.periodName("Periodo 3"), 2026)} title={p.rcTitle} highlight={p.rcTitle} description={p.rcDesc} />
      <ReportCardManager />
    </PageShell>
  );
}

export function ClearancesPage() {
  const p = useI18n().t.adm.pages;
  return (
    <PageShell active="clearances">
      <Header eyebrow={p.clearEyebrow} title={p.clearTitle} highlight={p.clearHighlight} description={p.clearDesc} />
      <PazYSalvosTable />
    </PageShell>
  );
}

export function RankingPage() {
  const p = useI18n().t.adm.pages;
  return (
    <PageShell active="ranking">
      <Header eyebrow={p.rankEyebrow(2026)} title={p.rankTitle} highlight={p.rankHighlight} description={p.rankDesc} />
      <RankingTable />
    </PageShell>
  );
}
