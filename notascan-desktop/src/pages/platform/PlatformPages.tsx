import { useEffect, useRef, useState } from "react";
import { useShell } from "../../app/ShellContext";
import { Badge, type BadgeTone } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { SegmentedTabs } from "../../components/atoms/Controls";
import { Input, Select } from "../../components/atoms/Field";
import { Icon, type IconName } from "../../components/atoms/Icon";
import { BarChart } from "../../components/organisms/Charts";
import { DataGrid } from "../../components/organisms/DataGrid";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Header } from "../../components/organisms/Header";
import { IdentityEditor, IdentityPreview, SchoolCrest, identityErrors } from "../../components/organisms/InstitutionIdentity";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { ConfirmAction, Drawer } from "../../components/organisms/Overlays";
import { ErrorState, LoadingBlocks } from "../../components/organisms/QueryState";
import { useToast } from "../../components/organisms/Toast";
import { PageShell } from "../../components/templates/PageShell";
import { DEMO } from "../../lib/supabase";
import { lastSeen } from "../../services/admin";
import type { Institution, InstitutionStatus } from "../../services/institution";
import {
  attentionOf, platformMessage, sendInvitation, useCreateSchool, useSaveIdentity, useSaveService, useSchools, type Adoption, type NewSchool, type SchoolRow,
} from "../../services/platform";

/*
 * Consola de la plataforma (paso 7d). Contrato del anexo 2026-10-03-consola-plataforma.md: dirección A · Registro de
 * colegios. Lista con pestañas de estado y adopción; ficha con «Requiere atención» primero, uso, identidad con vista
 * previa en vivo y servicio. Solo cifras agregadas: ningún dato personal de estudiantes.
 */

const STATUS: Record<InstitutionStatus, [string, BadgeTone, IconName]> = {
  active: ["Activo", "verified", "check"], implementation: ["Implementación", "pending", "clock"], suspended: ["Suspendido", "review", "lock"],
};
const ADOPTION: Record<Adoption, [string, BadgeTone, IconName]> = {
  grows: ["Crece", "verified", "arrow"], steady: ["Estable", "neutral", "minus"], drops: ["Se cae", "review", "warning"], idle: ["Sin uso", "pending", "clock"],
};
const ADOPTION_ORDER: Record<Adoption, number> = { drops: 0, idle: 1, steady: 2, grows: 3 };
const STATUS_TABS: InstitutionStatus[] = ["active", "implementation", "suspended"];
const TAB_LABEL: Record<InstitutionStatus, string> = { active: "Activos", implementation: "Implementación", suspended: "Suspendidos" };
const badge = ([l, t, i]: [string, BadgeTone, IconName]) => <Badge tone={t} icon={i}>{l}</Badge>;

/** Actividad de 8 semanas como barras pequeñas; la semana en curso en dorado. */
function ActivityBars({ weekly }: { weekly: number[] }) {
  const max = Math.max(1, ...weekly);
  return (
    <span className="ns-spark" role="img" aria-label={"Actividad de las últimas 8 semanas: " + weekly.join(", ")}>
      {weekly.map((n, i) => <i key={i} className={i === weekly.length - 1 ? "is-now" : undefined} style={{ height: Math.max(8, Math.round((n / max) * 100)) + "%" }} />)}
    </span>
  );
}

const EMPTY_NEW: NewSchool = { name: "", shortName: "", city: "", department: "", plan: "", contractUntil: "", adminName: "", adminEmail: "" };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Lista de colegios: pestañas de estado, adopción y una sola acción primaria (dar de alta). */
export function PlatformSchoolsPage() {
  const { navigate } = useShell();
  const q = useSchools();
  const create = useCreateSchool();
  const [tab, setTab] = useState<string>("active");
  const [form, setForm] = useState<NewSchool | null>(null);
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showToast, toastNode] = useToast();
  const rows = q.data ?? [];
  const list = rows.filter((r) => r.institution.status === tab);
  const count = (s: InstitutionStatus) => rows.filter((r) => r.institution.status === s).length;
  const f = form ?? EMPTY_NEW;
  const e = {
    name: !f.name.trim() ? "Escribe el nombre del colegio." : undefined,
    adminName: !f.adminName.trim() ? "Escribe el nombre de la persona de Secretaría." : undefined,
    adminEmail: !EMAIL.test(f.adminEmail.trim()) ? "Escribe un correo válido." : undefined,
  };
  const set = (k: keyof NewSchool) => (ev: { target: { value: string } }) => setForm({ ...f, [k]: ev.target.value });
  function submit() {
    setTried(true); setErr(null);
    if (e.name || e.adminName || e.adminEmail) return;
    const mail = f.adminEmail.trim().toLowerCase();
    create.mutateAsync(f).then(
      (id) => {
        setForm(null); setTried(false);
        // La invitación sale enseguida; si falla, el colegio ya existe y se puede reenviar desde su ficha.
        sendInvitation({ institutionId: id }).then(
          () => showToast({ tone: "success", title: "Colegio dado de alta", message: "Enviamos a " + mail + " un código para activar su cuenta de Secretaría." }),
          (x) => showToast({ tone: "error", title: "Colegio dado de alta, invitación sin enviar", message: (x instanceof Error ? x.message : "") + " Reenvíala desde la ficha del colegio." }),
        );
        if (!DEMO) navigate("school", { id });
      },
      (x) => setErr(platformMessage(x)),
    );
  }
  return (
    <PageShell active="dashboard">
      <Header eyebrow="Plataforma NotaScan" title="Colegios" highlight="Colegios"
        description="Los colegios que usan NotaScan: su estado, cómo lo están usando y su identidad."
        actions={<Button size="lg" icon="plus" onClick={() => { setForm(EMPTY_NEW); setTried(false); setErr(null); }}>Dar de alta un colegio</Button>} />
      <SegmentedTabs label="Estado del colegio" value={tab} onChange={setTab}
        tabs={STATUS_TABS.map((s) => ({ value: s, label: TAB_LABEL[s], count: count(s) }))} />
      <DataGrid<SchoolRow>
        caption="Colegios de la plataforma" rows={list} rowKey={(r) => r.institution.id} pageSize={15} density="compact" resetKey={tab}
        initialSort={{ key: "adoption", dir: "asc" }}
        loading={q.isPending && !q.data} error={q.isError && !q.data ? "No pudimos cargar los colegios." : undefined} onRetry={() => q.refetch()}
        emptyIcon="building" emptyTitle={rows.length ? "No hay colegios en este estado." : "Aún no hay colegios en la plataforma."}
        emptyMessage={rows.length ? "Prueba con otra pestaña." : "Da de alta el primer colegio que compró el servicio."}
        columns={[
          { key: "name", label: "Colegio", header: true, sortable: true, sortValue: (r) => r.institution.name, render: (r) => (
            <button type="button" className="ns-cell-link" onClick={() => navigate("school", { id: r.institution.id })} aria-label={"Abrir " + r.institution.name}>
              <SchoolCrest institution={r.institution} size="mini" /><span>{r.institution.name}</span>
            </button>
          ) },
          { key: "city", label: "Ciudad", sortable: true, sortValue: (r) => r.institution.city, render: (r) => r.institution.city || "—" },
          { key: "students", label: "Estudiantes", numeric: true, sortable: true },
          { key: "use7", label: "Uso 7 días", numeric: true, sortable: true, sortValue: (r) => r.grades7d + r.attendance7d, render: (r) => String(r.grades7d + r.attendance7d) },
          { key: "weekly", label: "8 semanas", render: (r) => <ActivityBars weekly={r.weekly} /> },
          { key: "adoption", label: "Adopción", sortable: true, sortValue: (r) => ADOPTION_ORDER[r.adoption], render: (r) => badge(ADOPTION[r.adoption]) },
          { key: "attention", label: "Atención", numeric: true, sortable: true, sortValue: (r) => attentionOf(r).length, render: (r) => { const n = attentionOf(r).length; return n ? <Badge tone="pending" icon="warning">{String(n)}</Badge> : <span className="ns-caption">—</span>; } },
          { key: "lastSeen", label: "Último acceso", sortable: true, sortValue: (r) => r.lastSeen ?? "", render: (r) => lastSeen(r.lastSeen) },
        ]}
      />
      <Drawer
        open={!!form} onClose={() => setForm(null)} eyebrow="Plataforma" title="Dar de alta un colegio"
        footer={[<Button key="c" variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>, <Button key="s" icon="check" loading={create.isPending} onClick={submit}>Dar de alta</Button>]}
      >
        <div className="ns-form-grid">
          <Input label="Nombre del colegio" required value={f.name} onChange={set("name")} error={tried ? e.name : undefined} className="ns-span-2" />
          <Input label="Iniciales del escudo" value={f.shortName} onChange={(ev) => setForm({ ...f, shortName: ev.target.value.toUpperCase().slice(0, 3) })} hint="Hasta 3 letras." />
          <Input label="Ciudad" value={f.city} onChange={set("city")} />
          <Input label="Departamento" value={f.department} onChange={set("department")} />
          <Input label="Plan" value={f.plan} onChange={set("plan")} placeholder="Anual" />
          <Input label="Contrato hasta" type="date" value={f.contractUntil} onChange={set("contractUntil")} className="ns-span-2" />
          <h3 className="ns-subhead ns-span-2">Primera cuenta de Secretaría</h3>
          <Input label="Nombre completo" required value={f.adminName} onChange={set("adminName")} error={tried ? e.adminName : undefined} />
          <Input label="Correo" type="email" required value={f.adminEmail} onChange={set("adminEmail")} error={tried ? e.adminEmail : undefined} hint="Le enviamos un código para activar su cuenta; desde ahí registra al resto del colegio." />
          {err ? <span className="ns-field-error ns-span-2" role="alert"><Icon name="error" size={16} />{err}</span> : null}
        </div>
      </Drawer>
      {toastNode}
    </PageShell>
  );
}

const WEEK_LABELS = ["S-7", "S-6", "S-5", "S-4", "S-3", "S-2", "S-1", "Esta semana"];
/** Tope del eje: un número redondo y par por encima del máximo, para que las marcas sean enteras (0, la mitad, el tope). */
function niceMax(values: number[]): number {
  const m = Math.max(1, ...values) * 1.15;
  const step = Math.pow(10, Math.floor(Math.log10(m)));
  const top = Math.ceil(m / step) * step;
  return top % 2 ? top + step : top;
}

/** Ficha del colegio: «Requiere atención» primero, luego uso, identidad (con vista previa en vivo) y servicio. */
export function PlatformSchoolPage({ id }: { id?: string }) {
  const { navigate } = useShell();
  const q = useSchools();
  const saveId = useSaveIdentity();
  const saveSvc = useSaveService();
  const [showToast, toastNode] = useToast();
  const school = (q.data ?? []).find((r) => r.institution.id === id);
  const [value, setValue] = useState<Institution | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [tried, setTried] = useState(false);
  const [svc, setSvc] = useState<{ status: InstitutionStatus; plan: string; contractUntil: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [inviting, setInviting] = useState(false);
  const identityRef = useRef<HTMLDivElement>(null), serviceRef = useRef<HTMLDivElement>(null), usageRef = useRef<HTMLDivElement>(null);
  // Al llegar (o recargar) los datos del colegio, el formulario parte de lo guardado.
  useEffect(() => {
    if (!school) return;
    setValue(school.institution); setLogo(null); setRemoveLogo(false);
    setSvc({ status: school.institution.status, plan: school.plan, contractUntil: school.contractUntil ?? "" });
  }, [school?.institution.id, q.dataUpdatedAt]);
  useEffect(() => () => { if (value?.logoUrl?.startsWith("blob:")) URL.revokeObjectURL(value.logoUrl); }, [value?.logoUrl]);

  const shell = (body: JSX.Element, title = "Colegio") => (
    <PageShell active="dashboard">
      <Header eyebrow="Colegios" title={title} actions={<Button variant="secondary" icon="chevleft" onClick={() => navigate("dashboard")}>Todos los colegios</Button>} />
      {body}
    </PageShell>
  );
  if (q.isPending && !q.data) return shell(<LoadingBlocks rows={6} label="Cargando el colegio" />);
  if (q.isError && !q.data) return shell(<ErrorState title="No pudimos cargar el colegio." onRetry={() => q.refetch()} />);
  if (!school || !value || !svc) return shell(<EmptyState icon="building" title="No encontramos este colegio." message="Puede que el enlace sea de un colegio que ya no existe." action={<Button variant="secondary" onClick={() => navigate("dashboard")}>Ver todos los colegios</Button>} />);

  const i = school.institution;
  const alerts = attentionOf(school);
  const dirty = JSON.stringify({ ...value, logoUrl: null }) !== JSON.stringify({ ...i, logoUrl: null }) || !!logo || removeLogo;
  const errs = identityErrors(value);
  const invalid = !!(errs.name || errs.shortName || errs.dane);
  const go = (t: "identity" | "service" | "usage") => ({ identity: identityRef, service: serviceRef, usage: usageRef })[t].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  function saveIdentity() {
    setTried(true);
    if (invalid || !value) return;
    saveId.mutateAsync({ value, logo, removeLogo }).then(
      () => { setLogo(null); setRemoveLogo(false); setTried(false); showToast({ tone: "success", title: "Identidad guardada", message: "Así se verá desde ahora en la app de " + value.name + " y en sus boletines." }); },
      (x) => showToast({ tone: "error", title: "No pudimos guardar la identidad", message: platformMessage(x) }),
    );
  }
  function saveService(status = svc!.status) {
    saveSvc.mutateAsync({ id: i.id, status, plan: svc!.plan, contractUntil: svc!.contractUntil || null }).then(
      () => showToast({ tone: "success", title: status === "suspended" ? "Colegio suspendido" : "Servicio guardado", message: status === "suspended" ? "Nadie de " + i.name + " puede entrar hasta que lo reactives. Sus datos se conservan." : STATUS[status][0] + " · " + (svc!.plan || "sin plan") }),
      (x) => showToast({ tone: "error", title: "No pudimos guardar el servicio", message: platformMessage(x) }),
    );
  }

  return (
    <PageShell active="dashboard">
      <Header eyebrow={"Colegios · " + (i.city || "Sin ciudad")} title={i.name}
        description={STATUS[i.status][0] + " · " + school.students + " estudiantes activos · " + school.teachers + " docentes · " + school.accounts + (school.accounts === 1 ? " cuenta activa" : " cuentas activas")}
        actions={<>
          <Button variant="secondary" icon="chevleft" onClick={() => navigate("dashboard")}>Todos los colegios</Button>
          <Button size="lg" icon="check" disabled={!dirty} loading={saveId.isPending} onClick={saveIdentity}>Guardar identidad</Button>
        </>} />

      <Block tone={alerts.length ? "gold" : "sage"} label="Requiere atención">
        <BlockTitle>{alerts.length ? "Requiere atención" : "Todo en orden"}</BlockTitle>
        {alerts.length ? (
          <ul className="ns-list">
            {alerts.map((a) => (
              <li key={a.key} className="ns-list-item">
                <span className={"ns-file-icon ns-attn-" + a.tone} aria-hidden><Icon name={a.tone === "burgundy" ? "warning" : "clock"} size={18} /></span>
                <div className="ns-list-main"><strong>{a.title}</strong><span className="ns-caption">{a.detail}</span></div>
                <Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go(a.target)}>{a.target === "identity" ? "Ir a identidad" : a.target === "service" ? "Ir a servicio" : "Ver uso"}</Button>
              </li>
            ))}
          </ul>
        ) : <p className="ns-caption" style={{ margin: 0 }}>Tiene identidad completa, cuentas activas y uso en las últimas semanas.</p>}
      </Block>

      <div ref={usageRef}>
        <Block label="Uso">
          <BlockTitle action={badge(ADOPTION[school.adoption])}>Uso</BlockTitle>
          <div className="ns-plat-stats">
            {[[school.grades30d, "notas verificadas · 30 días"], [school.attendance7d, "registros de asistencia · 7 días"], [school.observations30d, "observaciones · 30 días"], [school.accounts, "cuentas activas"]].map(([n, l]) => (
              <div key={String(l)} className="ns-plat-stat"><span className="ns-bento-value">{String(n)}</span><span className="ns-bento-label">{String(l)}</span></div>
            ))}
          </div>
          <div className="ns-plat-chart">
            <BarChart title="Actividad por semana" subtitle="Notas verificadas y asistencia tomada" max={niceMax(school.weekly)} ticks={[0, niceMax(school.weekly) / 2, niceMax(school.weekly)]}
              format={(n) => String(Math.round(n))} data={school.weekly.map((n, k) => ({ label: WEEK_LABELS[k] ?? "", value: n }))} seriesLabel="Registros" />
          </div>
          <p className="ns-caption" style={{ margin: 0 }}>{"Último acceso: " + lastSeen(school.lastSeen) + ". Solo cifras: la plataforma no ve nombres ni notas de estudiantes."}</p>
        </Block>
      </div>

      <div ref={identityRef}>
        <Block label="Identidad">
          <BlockTitle>Identidad</BlockTitle>
          <div className="ns-identity-grid">
            <IdentityEditor value={value} tried={tried} onChange={setValue}
              onLogo={(file) => { setLogo(file); setRemoveLogo(!file); setValue((cur) => cur && ({ ...cur, logoUrl: file ? URL.createObjectURL(file) : null })); }} />
            <IdentityPreview institution={value} />
          </div>
        </Block>
      </div>

      <div ref={serviceRef}>
        <Block label="Servicio">
          <BlockTitle>Servicio</BlockTitle>
          <div className="ns-form-grid">
            <Select label="Estado" value={svc.status} onChange={(v) => setSvc({ ...svc, status: v as InstitutionStatus })}
              options={STATUS_TABS.map((s) => ({ value: s, label: STATUS[s][0] }))} />
            <Input label="Plan" value={svc.plan} onChange={(ev) => setSvc({ ...svc, plan: ev.target.value })} />
            <Input label="Contrato hasta" type="date" value={svc.contractUntil} onChange={(ev) => setSvc({ ...svc, contractUntil: ev.target.value })} />
            <div className="ns-reg-actions ns-span-2">
              <span className="ns-caption">{school.secretaries ? school.secretaries + (school.secretaries === 1 ? " cuenta de Secretaría registrada." : " cuentas de Secretaría registradas.") : "Sin cuenta de Secretaría registrada."}</span>
              {school.secretaries ? (
                <Button variant="ghost" icon="mail" loading={inviting} loadingText="Enviando…" onClick={() => {
                  setInviting(true);
                  sendInvitation({ institutionId: i.id }).then(
                    (sent) => showToast({ tone: "success", title: "Invitación enviada", message: "Enviamos un código de activación a " + sent.join(", ") + "." }),
                    (x) => showToast({ tone: "error", title: "No enviamos la invitación", message: x instanceof Error ? x.message : "" }),
                  ).finally(() => setInviting(false));
                }}>Enviar invitación a Secretaría</Button>
              ) : null}
              <Button variant="secondary" icon="check" loading={saveSvc.isPending}
                onClick={() => (svc.status === "suspended" && i.status !== "suspended" ? setConfirmSuspend(true) : saveService())}>Guardar servicio</Button>
            </div>
          </div>
        </Block>
      </div>

      <ConfirmAction open={confirmSuspend} danger icon="lock" onCancel={() => setConfirmSuspend(false)} title={"¿Suspender a " + i.name + "?"}
        description="Nadie del colegio podrá entrar hasta que lo reactives. Sus datos y boletines se conservan." confirmLabel="Suspender"
        onConfirm={() => { setConfirmSuspend(false); saveService("suspended"); }} />
      {toastNode}
    </PageShell>
  );
}
