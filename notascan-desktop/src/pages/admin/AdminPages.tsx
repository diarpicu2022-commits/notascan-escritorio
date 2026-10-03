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

/* Secretaría: densidad alta, tablas, formularios por secciones, drawers y acciones en lote. */

const LONG_MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

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
  const tasks: Array<[string, string, IconName, string]> = DEMO ? [
    ["Cerrar Periodo 3", "Cierre programado el 15 de octubre", "calendar", "periods"],
    ["Generar boletines", "432 boletines del Periodo 2 listos", "book", "reportcards"],
    [blocked + " paz y salvos bloqueados", "Revisar documentos y pensiones", "shield", "clearances"],
    ["Asignar docente a 8B · Inglés", "La malla curricular tiene un hueco", "link", "curriculum"],
  ] : ([
    h?.openPeriod ? ["Cerrar " + h.openPeriod.name, "Cierre programado el " + Number(h.openPeriod.close.slice(8)) + " de " + LONG_MONTHS[Number(h.openPeriod.close.slice(5, 7)) - 1], "calendar", "periods"] : ["Abrir un periodo", "No hay periodo abierto: los docentes no ven sus cursos", "calendar", "periods"],
    h?.lastClosed ? ["Generar boletines", Math.max(0, enabled - h.generatedLastClosed) + " boletines del " + h.lastClosed + " por generar", "book", "reportcards"] : null,
    [blocked + " paz y salvos bloqueados", blocked ? "Revisar documentos y pensiones" : "Todos los estudiantes están al día", "shield", "clearances"],
    h?.gaps.length ? ["Asignar docente a " + h.gaps[0].course + " · " + h.gaps[0].subject, h.gaps.length === 1 ? "La malla curricular tiene un hueco" : "La malla curricular tiene " + h.gaps.length + " huecos", "link", "curriculum"] : null,
  ].filter(Boolean) as Array<[string, string, IconName, string]>);
  const greet = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches";
  const name = DEMO ? "Patricia" : h?.name ?? "";
  const loading = (sq.isPending && !sq.data) || (hq.isPending && !hq.data);
  const failed = (sq.isError && !sq.data) || (hq.isError && !hq.data);
  return (
    <PageShell active="dashboard">
      <Header eyebrow={"Secretaría académica · Año lectivo " + (DEMO ? 2026 : new Date().getFullYear())} title={(DEMO ? "Buenos días" : greet) + ", " + name} highlight={name} description="Esto es lo que necesita gestión hoy."
        actions={<>
          <Button variant="secondary" icon="upload" onClick={() => go("enrollment", { tab: "import" })}>Importar estudiantes</Button>
          <Button icon="plus" size="lg" onClick={() => go("enrollment")}>Registrar estudiante</Button>
        </>} />
      {loading ? <LoadingBlocks label="Cargando el resumen de Secretaría" /> : failed ? <ErrorState title="No pudimos cargar el resumen." onRetry={() => { sq.refetch(); hq.refetch(); }} /> : (
        <>
          <ReviewSummary total={all.length} verified={active} pending={pend.length} review={blocked} evaluation={"Matrícula " + (DEMO ? 2026 : new Date().getFullYear())}
            labels={["matrículas activas", "matrículas pendientes", "paz y salvos bloqueados"]} foot={all.length - active + " registros requieren gestión"} />
          <div className="ns-admin-cols">
            <Block label="Matrículas pendientes">
              <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("students")}>Ver estudiantes</Button>}>Matrículas pendientes</BlockTitle>
              <DataGrid<StudentRecord>
                caption="Matrículas pendientes" rows={pend} paginate={false} density="compact" emptyTitle="No hay matrículas pendientes." emptyIcon="check"
                columns={[
                  { key: "name", label: "Estudiante", header: true, render: (r) => <UserProfile name={r.name} role={r.document} /> },
                  { key: "course", label: "Curso" }, { key: "guardian", label: "Acudiente" },
                  { key: "status", label: "Estado", render: (r) => <EnrollBadge status={r.status} /> },
                ]}
                rowActions={() => <Button size="sm" variant="secondary" onClick={() => go("students")}>Completar</Button>}
              />
            </Block>
            <Block tone="gold" label="Tareas del periodo">
              <BlockTitle>Tareas del periodo</BlockTitle>
              <ul className="ns-list">
                {tasks.map((t) => (
                  <li key={t[0]} className="ns-list-item">
                    <span className="ns-file-icon" aria-hidden><Icon name={t[2]} size={18} /></span>
                    <div className="ns-list-main"><strong>{t[0]}</strong><span className="ns-caption">{t[1]}</span></div>
                    <IconAction icon="arrow" label={"Ir a " + t[0]} onClick={() => go(t[3])} />
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
  return (
    <PageShell active="students">
      <Header eyebrow={ro ? "Consulta institucional" : "Gestión de matrícula"} title="Estudiantes y Matrículas" highlight="Matrículas"
        description={ro ? "Consulta estudiantes y abre su perfil completo." : "Busca, edita, archiva o retira estudiantes. Selecciona varios para acciones en lote."}
        actions={ro ? null : <>
          <Button variant="secondary" icon="upload" onClick={() => navigate("enrollment", { tab: "import" })}>Importar estudiantes</Button>
          <Button icon="plus" onClick={() => navigate("enrollment")}>Registrar estudiante</Button>
        </>} />
      <StudentTable readOnly={ro} onNavigate={navigate} />
    </PageShell>
  );
}

export function EnrollmentPage({ tab: initialTab, importStep }: { tab?: string; importStep?: number }) {
  const { navigate } = useShell();
  const [tab, setTab] = useState(initialTab === "import" ? "import" : "register");
  return (
    <PageShell active="enrollment">
      <Header eyebrow="Matrícula 2026" title="Matrículas" highlight="Matrículas" description="Registra estudiantes uno a uno o importa un archivo completo." />
      <SegmentedTabs label="Tipo de matrícula" value={tab} onChange={setTab} tabs={[{ value: "register", label: "Registrar estudiante", icon: "plus" }, { value: "import", label: "Importación masiva", icon: "upload" }]} />
      {tab === "register" ? <StudentRegistrationForm onNavigate={navigate} /> : <BulkImportPanel onNavigate={navigate} initialStep={importStep} />}
    </PageShell>
  );
}

export function UsersPage() {
  const [invite, setInvite] = useState(false);
  return (
    <PageShell active="users">
      <Header eyebrow="Accesos" title="Usuarios" highlight="Usuarios" description="Docentes, acudientes, administrativos y directivos con acceso a NotaScan." actions={<Button icon="plus" onClick={() => setInvite(true)}>Invitar usuario</Button>} />
      <UserDirectory invite={invite} onInviteClose={() => setInvite(false)} />
    </PageShell>
  );
}

export function AcademicStructurePage() {
  return (
    <PageShell active="structure">
      <Header eyebrow="Configuración" title="Estructura Académica" highlight="Académica" description="Grados, cursos y materias que usa toda la institución." />
      <AcademicStructureManager />
    </PageShell>
  );
}

export function CurriculumPage() {
  return (
    <PageShell active="curriculum">
      <Header eyebrow="Docente + Materia + Curso + Periodo" title="Malla Curricular" highlight="Curricular" description="¿Qué docente dicta qué materia en qué curso? Haz clic en una celda para asignar o editar." />
      <CurriculumManager />
    </PageShell>
  );
}

export function PeriodsPage() {
  const q = usePeriods();
  const create = useCreatePeriod();
  const [showToast, toastNode] = useToast();
  const year = q.data?.periods[q.data.periods.length - 1]?.year ?? 2026;
  return (
    <PageShell active="periods">
      <Header eyebrow={"Año lectivo " + year} title="Periodos Académicos" highlight="Académicos" description="Fechas de apertura y cierre, estado y cómo se compone la nota de cada periodo."
        actions={<Button variant="secondary" icon="plus" loading={create.isPending} disabled={!q.data} onClick={() => create.mutateAsync(q.data!.periods).then(
          (name) => showToast(DEMO
            ? { tone: "info", title: "Crear periodo", message: "En la demostración los periodos son fijos." }
            : { tone: "success", title: "Periodo creado", message: (name ?? "El periodo") + " quedó en borrador. Revisa sus fechas y su peso en la nota final." }),
          (e) => showToast({ tone: "error", title: "No pudimos crear el periodo", message: e instanceof Error && !("code" in e) ? e.message : adminMessage(e) }),
        )}>Crear periodo</Button>} />
      <PeriodConfigurator />
      {toastNode}
    </PageShell>
  );
}

export function ReportCardsPage() {
  return (
    <PageShell active="reportcards">
      <Header eyebrow="Periodo 3 · 2026" title="Boletines" highlight="Boletines" description="Previsualiza y genera boletines en PDF. Los estudiantes sin paz y salvo quedan bloqueados." />
      <ReportCardManager />
    </PageShell>
  );
}

export function ClearancesPage() {
  return (
    <PageShell active="clearances">
      <Header eyebrow="Control administrativo" title="Paz y Salvos" highlight="Salvos" description="Si alguna obligación está pendiente, los reportes y boletines del estudiante quedan bloqueados para el acudiente." />
      <PazYSalvosTable />
    </PageShell>
  );
}

export function RankingPage() {
  return (
    <PageShell active="ranking">
      <Header eyebrow="Año lectivo 2026" title="Ranking Académico" highlight="Académico" description="Ordena, filtra y exporta el desempeño por periodo, grado, curso o materia." />
      <RankingTable />
    </PageShell>
  );
}
