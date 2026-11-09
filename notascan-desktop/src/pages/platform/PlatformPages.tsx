import { useEffect, useRef, useState } from "react";
import { useShell } from "../../app/ShellContext";
import { Badge, type BadgeTone } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Avatar } from "../../components/atoms/Avatar";
import { IconAction, SegmentedTabs } from "../../components/atoms/Controls";
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
import { useI18n } from "../../i18n/I18nProvider";
import { seenText } from "../../i18n/seen";
import type { Institution, InstitutionStatus } from "../../services/institution";
import {
  attentionOf, platformMessage, sendInvitation, useAddSecretary, useCreateSchool, useRemoveSecretary, useSaveIdentity, useSaveService, useSchools, useSecretaries,
  type Adoption, type NewSchool, type SchoolRow, type Secretary, type SecretaryAccount,
} from "../../services/platform";

/*
 * Consola de la plataforma (paso 7d). Contrato del anexo 2026-10-03-consola-plataforma.md: dirección A · Registro de
 * colegios. Lista con pestañas de estado y adopción; ficha con «Requiere atención» primero, uso, identidad con vista
 * previa en vivo y servicio. Solo cifras agregadas: ningún dato personal de estudiantes.
 */

/* Tonos e iconos; las palabras salen del diccionario (t.plat.adoption, t.plat.account). */
const ADOPTION: Record<Adoption, [BadgeTone, IconName]> = {
  grows: ["verified", "arrow"], steady: ["neutral", "minus"], drops: ["review", "warning"], idle: ["pending", "clock"],
};
const ADOPTION_ORDER: Record<Adoption, number> = { drops: 0, idle: 1, steady: 2, grows: 3 };
const STATUS_TABS: InstitutionStatus[] = ["active", "implementation", "suspended"];
const badge = (l: string, [t, i]: [BadgeTone, IconName]) => <Badge tone={t} icon={i}>{l}</Badge>;

/** Actividad de 8 semanas como barras pequeñas; la semana en curso en dorado. */
function ActivityBars({ weekly }: { weekly: number[] }) {
  const max = Math.max(1, ...weekly);
  const t = useI18n().t;
  return (
    <span className="ns-spark" role="img" aria-label={t.plat.activityAria(weekly.join(", "))}>
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
  const { t, lang } = useI18n();
  const p = t.plat;
  const rows = q.data ?? [];
  const list = rows.filter((r) => r.institution.status === tab);
  const count = (s: InstitutionStatus) => rows.filter((r) => r.institution.status === s).length;
  const f = form ?? EMPTY_NEW;
  const e = {
    name: !f.name.trim() ? t.adm.idn.nameError : undefined,
    adminName: !f.adminName.trim() ? p.adminNameError : undefined,
    adminEmail: !EMAIL.test(f.adminEmail.trim()) ? p.emailError : undefined,
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
          () => showToast({ tone: "success", title: p.created, message: p.codeSent(mail) }),
          (x) => showToast({ tone: "error", title: p.createdNoInvite, message: (x instanceof Error && x.message ? x.message : p.inviteFailed) + p.resendFromSchool }),
        );
        if (!DEMO) navigate("school", { id });
      },
      (x) => setErr(platformMessage(x, t)),
    );
  }
  return (
    <PageShell active="dashboard">
      <Header eyebrow={p.eyebrow} title={p.title} highlight={p.title}
        description={p.desc}
        actions={<Button size="lg" icon="plus" onClick={() => { setForm(EMPTY_NEW); setTried(false); setErr(null); }}>{p.add}</Button>} />
      <SegmentedTabs label={p.tabsAria} value={tab} onChange={setTab}
        tabs={STATUS_TABS.map((s) => ({ value: s, label: p.tabs[s], count: count(s) }))} />
      <DataGrid<SchoolRow>
        caption={p.caption} rows={list} rowKey={(r) => r.institution.id} pageSize={15} density="compact" resetKey={tab}
        initialSort={{ key: "adoption", dir: "asc" }}
        loading={q.isPending && !q.data} error={q.isError && !q.data ? p.loadError : undefined} onRetry={() => q.refetch()}
        emptyIcon="building" emptyTitle={rows.length ? p.noneInState : p.none}
        emptyMessage={rows.length ? p.otherTab : p.addFirst}
        columns={[
          { key: "name", label: p.cols.school, header: true, sortable: true, sortValue: (r) => r.institution.name, render: (r) => (
            <button type="button" className="ns-cell-link" onClick={() => navigate("school", { id: r.institution.id })} aria-label={p.open(r.institution.name)}>
              <SchoolCrest institution={r.institution} size="mini" /><span>{r.institution.name}</span>
            </button>
          ) },
          { key: "city", label: p.cols.city, sortable: true, sortValue: (r) => r.institution.city, render: (r) => r.institution.city || "—" },
          { key: "students", label: p.cols.students, numeric: true, sortable: true },
          { key: "use7", label: p.cols.use7, numeric: true, sortable: true, sortValue: (r) => r.grades7d + r.attendance7d, render: (r) => String(r.grades7d + r.attendance7d) },
          { key: "weekly", label: p.cols.weekly, render: (r) => <ActivityBars weekly={r.weekly} /> },
          { key: "adoption", label: p.cols.adoption, sortable: true, sortValue: (r) => ADOPTION_ORDER[r.adoption], render: (r) => badge(p.adoption[r.adoption], ADOPTION[r.adoption]) },
          { key: "attention", label: p.cols.attention, numeric: true, sortable: true, sortValue: (r) => attentionOf(r).length, render: (r) => { const n = attentionOf(r).length; return n ? <Badge tone="pending" icon="warning">{String(n)}</Badge> : <span className="ns-caption">—</span>; } },
          { key: "lastSeen", label: p.cols.last, sortable: true, sortValue: (r) => r.lastSeen ?? "", render: (r) => seenText(t, lang, lastSeen(r.lastSeen)) },
        ]}
      />
      <Drawer
        open={!!form} onClose={() => setForm(null)} eyebrow={p.drawerEyebrow} title={p.add} closeLabel={t.prefs.close}
        footer={[<Button key="c" variant="secondary" onClick={() => setForm(null)}>{p.cancel}</Button>, <Button key="s" icon="check" loading={create.isPending} onClick={submit}>{p.create}</Button>]}
      >
        <div className="ns-form-grid">
          <Input label={t.adm.idn.name} required value={f.name} onChange={set("name")} error={tried ? e.name : undefined} className="ns-span-2" />
          <Input label={t.adm.idn.short} value={f.shortName} onChange={(ev) => setForm({ ...f, shortName: ev.target.value.toUpperCase().slice(0, 3) })} hint={p.shortHint} />
          <Input label={t.adm.idn.city} value={f.city} onChange={set("city")} />
          <Input label={t.adm.idn.department} value={f.department} onChange={set("department")} />
          <Input label={p.plan} value={f.plan} onChange={set("plan")} placeholder={p.planPh} />
          <Input label={p.contract} type="date" value={f.contractUntil} onChange={set("contractUntil")} className="ns-span-2" />
          <h3 className="ns-subhead ns-span-2">{p.firstAccount}</h3>
          <Input label={p.fullName} required value={f.adminName} onChange={set("adminName")} error={tried ? e.adminName : undefined} />
          <Input label={p.email} type="email" required value={f.adminEmail} onChange={set("adminEmail")} error={tried ? e.adminEmail : undefined} hint={p.emailHint} />
          {err ? <span className="ns-field-error ns-span-2" role="alert"><Icon name="error" size={16} />{err}</span> : null}
        </div>
      </Drawer>
      {toastNode}
    </PageShell>
  );
}

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
  const { t, lang } = useI18n();
  const p = t.plat;
  const school = (q.data ?? []).find((r) => r.institution.id === id);
  const [value, setValue] = useState<Institution | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [tried, setTried] = useState(false);
  const [svc, setSvc] = useState<{ status: InstitutionStatus; plan: string; contractUntil: string } | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const identityRef = useRef<HTMLDivElement>(null), serviceRef = useRef<HTMLDivElement>(null), usageRef = useRef<HTMLDivElement>(null), secretariesRef = useRef<HTMLDivElement>(null);
  // Al llegar (o recargar) los datos del colegio, el formulario parte de lo guardado.
  useEffect(() => {
    if (!school) return;
    setValue(school.institution); setLogo(null); setRemoveLogo(false);
    setSvc({ status: school.institution.status, plan: school.plan, contractUntil: school.contractUntil ?? "" });
  }, [school?.institution.id, q.dataUpdatedAt]);
  useEffect(() => () => { if (value?.logoUrl?.startsWith("blob:")) URL.revokeObjectURL(value.logoUrl); }, [value?.logoUrl]);

  const shell = (body: JSX.Element, title = p.school) => (
    <PageShell active="dashboard">
      <Header eyebrow={p.schoolsEyebrow} title={title} actions={<Button variant="secondary" icon="chevleft" onClick={() => navigate("dashboard")}>{p.all}</Button>} />
      {body}
    </PageShell>
  );
  if (q.isPending && !q.data) return shell(<LoadingBlocks rows={6} label={p.loading} />);
  if (q.isError && !q.data) return shell(<ErrorState title={p.schoolError} onRetry={() => q.refetch()} />);
  if (!school || !value || !svc) return shell(<EmptyState icon="building" title={p.notFound} message={p.notFoundText} action={<Button variant="secondary" onClick={() => navigate("dashboard")}>{p.seeAll}</Button>} />);

  const i = school.institution;
  const alerts = attentionOf(school);
  const dirty = JSON.stringify({ ...value, logoUrl: null }) !== JSON.stringify({ ...i, logoUrl: null }) || !!logo || removeLogo;
  const errs = identityErrors(value, t);
  const invalid = !!(errs.name || errs.shortName || errs.dane);
  const go = (t: "identity" | "service" | "usage" | "secretaries") => ({ identity: identityRef, service: serviceRef, usage: usageRef, secretaries: secretariesRef })[t].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  function saveIdentity() {
    setTried(true);
    if (invalid || !value) return;
    saveId.mutateAsync({ value, logo, removeLogo }).then(
      () => { setLogo(null); setRemoveLogo(false); setTried(false); showToast({ tone: "success", title: p.identitySaved, message: p.identitySavedText(value.name) }); },
      (x) => showToast({ tone: "error", title: p.identityError, message: platformMessage(x, t) }),
    );
  }
  function saveService(status = svc!.status) {
    saveSvc.mutateAsync({ id: i.id, status, plan: svc!.plan, contractUntil: svc!.contractUntil || null }).then(
      () => showToast({ tone: "success", title: status === "suspended" ? p.suspended : p.serviceSaved, message: status === "suspended" ? p.suspendedText(i.name) : p.serviceText(p.status[status], svc!.plan) }),
      (x) => showToast({ tone: "error", title: p.serviceError, message: platformMessage(x, t) }),
    );
  }

  return (
    <PageShell active="dashboard">
      <Header eyebrow={p.eyebrowSchool(i.city)} title={i.name}
        description={p.summary(p.status[i.status], school.students, school.teachers, school.accounts)}
        actions={<>
          <Button variant="secondary" icon="chevleft" onClick={() => navigate("dashboard")}>{p.all}</Button>
          <Button size="lg" icon="check" disabled={!dirty} loading={saveId.isPending} onClick={saveIdentity}>{p.saveIdentity}</Button>
        </>} />

      <Block tone={alerts.length ? "gold" : "sage"} label={p.attention}>
        <BlockTitle>{alerts.length ? p.attention : p.allGood}</BlockTitle>
        {alerts.length ? (
          <ul className="ns-list">
            {alerts.map((a) => (
              <li key={a.key} className="ns-list-item">
                <span className={"ns-file-icon ns-attn-" + a.tone} aria-hidden><Icon name={a.tone === "burgundy" ? "warning" : "clock"} size={18} /></span>
                <div className="ns-list-main"><strong>{p.attn(a.key, a.days)[0]}</strong><span className="ns-caption">{p.attn(a.key, a.days)[1]}</span></div>
                <Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go(a.target)}>{a.target === "identity" ? p.goIdentity : a.target === "service" ? p.goService : a.target === "secretaries" ? p.goSecretaries : p.seeUsage}</Button>
              </li>
            ))}
          </ul>
        ) : <p className="ns-caption" style={{ margin: 0 }}>{p.allGoodText}</p>}
      </Block>

      <div ref={usageRef}>
        <Block label={p.usage}>
          <BlockTitle action={badge(p.adoption[school.adoption], ADOPTION[school.adoption])}>{p.usage}</BlockTitle>
          <div className="ns-plat-stats">
            {[[school.grades30d, p.stats[0]], [school.attendance7d, p.stats[1]], [school.observations30d, p.stats[2]], [school.accounts, p.stats[3]]].map(([n, l]) => (
              <div key={String(l)} className="ns-plat-stat"><span className="ns-bento-value">{String(n)}</span><span className="ns-bento-label">{String(l)}</span></div>
            ))}
          </div>
          <div className="ns-plat-chart">
            <BarChart title={p.weekly} subtitle={p.weeklyQ} max={niceMax(school.weekly)} ticks={[0, niceMax(school.weekly) / 2, niceMax(school.weekly)]}
              format={(n) => String(Math.round(n))} data={school.weekly.map((n, k) => ({ label: p.weeks[k] ?? "", value: n }))} seriesLabel={p.records} />
          </div>
          <p className="ns-caption" style={{ margin: 0 }}>{p.lastAccess(seenText(t, lang, lastSeen(school.lastSeen)))}</p>
        </Block>
      </div>

      <div ref={identityRef}>
        <Block label={p.identity}>
          <BlockTitle>{p.identity}</BlockTitle>
          <div className="ns-identity-grid">
            <IdentityEditor value={value} tried={tried} onChange={setValue}
              onLogo={(file) => { setLogo(file); setRemoveLogo(!file); setValue((cur) => cur && ({ ...cur, logoUrl: file ? URL.createObjectURL(file) : null })); }} />
            <IdentityPreview institution={value} />
          </div>
        </Block>
      </div>

      <div ref={serviceRef}>
        <Block label={p.service}>
          <BlockTitle>{p.service}</BlockTitle>
          <div className="ns-form-grid">
            <Select label={p.state} value={svc.status} onChange={(v) => setSvc({ ...svc, status: v as InstitutionStatus })}
              options={STATUS_TABS.map((s) => ({ value: s, label: p.status[s] }))} />
            <Input label={p.plan} value={svc.plan} onChange={(ev) => setSvc({ ...svc, plan: ev.target.value })} />
            <Input label={p.contract} type="date" value={svc.contractUntil} onChange={(ev) => setSvc({ ...svc, contractUntil: ev.target.value })} />
            <div className="ns-reg-actions ns-span-2">
              <Button variant="secondary" icon="check" loading={saveSvc.isPending}
                onClick={() => (svc.status === "suspended" && i.status !== "suspended" ? setConfirmSuspend(true) : saveService())}>{p.saveService}</Button>
            </div>
          </div>
        </Block>
      </div>

      <div ref={secretariesRef}>
        <SecretariesBlock institutionId={i.id} schoolName={i.name} showToast={showToast} />
      </div>

      <ConfirmAction open={confirmSuspend} danger icon="lock" onCancel={() => setConfirmSuspend(false)} title={p.suspendTitle(i.name)}
        description={p.suspendText} confirmLabel={p.suspend}
        onConfirm={() => { setConfirmSuspend(false); saveService("suspended"); }} />
      {toastNode}
    </PageShell>
  );
}

/* ---------- Secretaría del colegio (2026-10-06, pedido de Diego) ----------
 * Antes, agregar o cambiar la Secretaría de un colegio exigía SQL. Mismas piezas que el directorio de usuarios de la
 * Secretaría (avatar, insignia de estado, acciones con icono, panel lateral): invitar es por persona, nunca a todas
 * de una vez, para no escribir a correos que nadie revisa. */

const ACCOUNT: Record<SecretaryAccount, [BadgeTone, IconName]> = {
  active: ["verified", "check"], invited: ["pending", "mail"], none: ["neutral", "user"], inactive: ["neutral", "minus"],
};
const MAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function SecretariesBlock({ institutionId, schoolName, showToast }: { institutionId: string; schoolName: string; showToast: ReturnType<typeof useToast>[0] }) {
  const q = useSecretaries(institutionId);
  const add = useAddSecretary(institutionId);
  const remove = useRemoveSecretary(institutionId);
  const [form, setForm] = useState<{ name: string; email: string } | null>(null);
  const [tried, setTried] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Secretary | null>(null);
  const { t, lang } = useI18n();
  const p = t.plat;
  const rows = q.data ?? [];

  function invite(s: Secretary) {
    setInviting(s.email);
    sendInvitation({ institutionId, email: s.email }).then(
      () => { showToast({ tone: "success", title: s.account === "invited" ? p.resent : p.sentOk, message: p.codeSent(s.email) }); void q.refetch(); },
      (x) => showToast({ tone: "error", title: p.inviteError, message: x instanceof Error && x.message ? x.message : p.inviteFailed }),
    ).finally(() => setInviting(null));
  }
  const fe = {
    name: form && !form.name.trim() ? p.adminNameError : undefined,
    email: form && !MAIL_OK.test(form.email.trim()) ? p.emailError : undefined,
  };
  function submit() {
    setTried(true); setErr(null);
    if (!form || fe.name || fe.email) return;
    const v = { name: form.name.trim(), email: form.email.trim().toLowerCase() };
    add.mutateAsync(v).then(
      () => {
        setForm(null); setTried(false);
        // Registrada: se le envía su invitación de una vez (es lo que se espera al agregarla).
        invite({ email: v.email, name: v.name, account: "none", lastSeen: null });
      },
      (x) => setErr(platformMessage(x, t)),
    );
  }

  return (
    <Block label={p.secretaries}>
      <BlockTitle action={<Button variant="secondary" size="sm" icon="plus" onClick={() => { setForm({ name: "", email: "" }); setTried(false); setErr(null); }}>{p.addSecretary}</Button>}>{p.secretaries}</BlockTitle>
      {q.isPending && !q.data ? <LoadingBlocks rows={2} label={p.secLoading} />
        : q.isError && !q.data ? <ErrorState title={p.secError} onRetry={() => q.refetch()} />
        : !rows.length ? <EmptyState icon="user" title={p.noSecretary} message={p.noSecretaryText(schoolName)} />
        : (
          <ul className="ns-list">
            {rows.map((s) => (
              <li key={s.email} className="ns-list-item">
                <Avatar name={s.name} size="sm" />
                <div className="ns-list-main"><strong>{s.name}</strong><span className="ns-caption">{s.email + (s.account === "active" ? p.secLast(seenText(t, lang, lastSeen(s.lastSeen))) : "")}</span></div>
                {badge(p.account[s.account], ACCOUNT[s.account])}
                {/* Columna de acciones siempre presente (como la de las tablas): así las insignias quedan alineadas. */}
                <div className="ns-grid-actions ns-sec-actions"><div>
                  {s.account === "none" || s.account === "invited"
                    ? <IconAction icon="mail" label={s.account === "invited" ? p.resend(s.name) : p.send(s.name)} disabled={inviting === s.email} onClick={() => invite(s)} />
                    : null}
                  {s.account === "none"
                    ? <IconAction icon="trash" tone="danger" label={p.removeOf(s.name)} onClick={() => setRemoving(s)} />
                    : null}
                </div></div>
              </li>
            ))}
          </ul>
        )}
      <p className="ns-caption" style={{ margin: 0 }}>{p.removeNote}</p>

      <Drawer
        open={!!form} onClose={() => setForm(null)} eyebrow={schoolName} title={p.addSecretary} closeLabel={t.prefs.close}
        footer={[<Button key="c" variant="secondary" onClick={() => setForm(null)}>{p.cancel}</Button>, <Button key="s" icon="mail" loading={add.isPending} onClick={submit}>{p.addAndInvite}</Button>]}
      >
        {form ? (
          <div className="ns-form-grid">
            <Input label={p.fullName} required value={form.name} onChange={(ev) => setForm({ ...form, name: ev.target.value })} error={tried ? fe.name : undefined} className="ns-span-2" />
            <Input label={p.email} type="email" required value={form.email} onChange={(ev) => setForm({ ...form, email: ev.target.value })} error={tried ? fe.email : undefined}
              hint={p.emailHint} className="ns-span-2" />
            {err ? <span className="ns-field-error ns-span-2" role="alert"><Icon name="error" size={16} />{err}</span> : null}
          </div>
        ) : null}
      </Drawer>

      <ConfirmAction open={!!removing} danger icon="trash" onCancel={() => setRemoving(null)} title={removing ? p.removeTitle(removing.name) : ""}
        description={removing ? p.removeText(removing.email, schoolName) : ""} confirmLabel={p.remove}
        onConfirm={() => {
          const s = removing!; setRemoving(null);
          remove.mutateAsync(s.email).then(
            () => showToast({ tone: "success", title: p.removed, message: p.removedText(s.email, schoolName) }),
            (x) => showToast({ tone: "error", title: p.removeError, message: platformMessage(x, t) }),
          );
        }} />
    </Block>
  );
}
