import { Fragment, useEffect, useRef, useState } from "react";
import { USER_ROLES, USER_STATUS, type UserRole } from "../../../data/admin";
/* Los nombres de rol y estado salen del diccionario (t.adm.roles, t.adm.userStatus); USER_STATUS da tono e icono. */
import { DEMO } from "../../../lib/supabase";
import { adminMessage, sendPasswordReset, useDeactivateUser, useSaveUser, useUsers, type DirUser } from "../../../services/admin";
import { sendInvitation } from "../../../services/platform";
import { Avatar } from "../../atoms/Avatar";
import { Badge } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction, SegmentedTabs } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import { SearchField } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { ConfirmAction, Drawer, PasswordResetDialog } from "../Overlays";
import { useToast } from "../Toast";
import { useI18n } from "../../../i18n/I18nProvider";
import { seenText } from "../../../i18n/seen";

type DrawerUser = DirUser & { _view?: boolean; _new?: boolean };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEW_USER: DrawerUser = { id: "", kind: "staff", name: "", email: "", role: "teacher", status: "none", last: { k: "never" }, _new: true };

/** Docentes, acudientes, administrativos y directivos: invitar, editar, restablecer acceso o desactivar. */
export function UserDirectory({ invite, onInviteClose }: { invite?: boolean; onInviteClose?: () => void }) {
  const q = useUsers();
  const saveMut = useSaveUser();
  const deactMut = useDeactivateUser();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<DirUser[]>(() => q.data ?? []);
  const lastData = useRef(q.data);
  useEffect(() => { if (lastData.current !== q.data) { lastData.current = q.data; setRows(q.data ?? []); } }, [q.data]);
  const [reset, setReset] = useState<DirUser | null>(null);
  const [deact, setDeact] = useState<DirUser | null>(null);
  const [drawer, setDrawer] = useState<DrawerUser | null>(null);
  const [form, setForm] = useState<DrawerUser | null>(null);
  const [tried, setTried] = useState(false);
  const [showToast, toastNode] = useToast();
  const [inviting, setInviting] = useState<string | null>(null);
  useEffect(() => { if (invite) { setDrawer(NEW_USER); } }, [invite]);
  const { t: tr, lang } = useI18n();
  const x = tr.adm.usr;
  /** Envía el código de activación (función invite-staff) a alguien registrado sin cuenta activa. */
  function invite1(email: string, name: string) {
    setInviting(email);
    return sendInvitation({ email }).then(
      () => {
        if (DEMO) setRows((rs) => rs.map((x) => (x.email === email ? { ...x, status: "invited" } : x)));
        showToast({ tone: "success", title: x.invited, message: x.invitedText(name, email) });
      },
      (e) => showToast({ tone: "error", title: x.inviteError, message: e instanceof Error && e.message ? e.message : tr.plat.inviteFailed }),
    ).finally(() => setInviting(null));
  }
  useEffect(() => { setForm(drawer ? { ...drawer } : null); setTried(false); }, [drawer]);
  const closeDrawer = () => { setDrawer(null); onInviteClose?.(); };
  const t = query.toLowerCase();
  const list = rows.filter((u) => (tab === "all" || u.role === tab) && (!t || u.name.toLowerCase().indexOf(t) >= 0 || u.email.indexOf(t) >= 0));
  const count = (r: string) => rows.filter((u) => r === "all" || u.role === r).length;

  const f = form;
  const errors = f ? {
    name: !f.name.trim() ? x.nameError : undefined,
    email: f.kind === "staff" && !EMAIL.test(f.email.trim()) ? x.emailError : f.kind === "guardian" && f.email.trim() && !EMAIL.test(f.email.trim()) ? x.emailError : undefined,
  } : {};
  function save() {
    setTried(true);
    if (!f || errors.name || errors.email) return;
    const isNew = !!f._new;
    saveMut.mutateAsync({ user: f, isNew }).then(
      () => {
        if (DEMO) setRows(isNew ? rows.concat({ ...f, id: "n" + Date.now(), status: "none" }) : rows.map((x) => (x.id === f.id ? { ...x, name: f.name, email: f.email, role: f.role } : x)));
        closeDrawer();
        // Al registrar a alguien del personal, sale su invitación con el código de activación.
        if (isNew) invite1(f.email.trim().toLowerCase(), f.name.trim());
        else showToast({ tone: "success", title: x.saved });
      },
      (e) => showToast({ tone: "error", title: x.saveError, message: adminMessage(e, tr) }),
    );
  }

  return (
    <>
      <SegmentedTabs label={x.kind} value={tab} onChange={setTab}
        tabs={(["all", "teacher", "guardian", "staff", "director"] as const).map((k) => ({ value: k, label: x.tabs[k], count: count(k) }))} />
      <DataGrid<DirUser>
        caption={x.caption} rows={list} pageSize={10} density="compact" densityToggle resetKey={tab + t}
        loading={q.isPending && !q.data} error={q.isError && !q.data ? x.loadError : undefined} onRetry={() => q.refetch()}
        emptyTitle={rows.length ? x.noResults : x.none} emptyIcon="user"
        toolbar={<SearchField value={query} onChange={setQuery} placeholder={x.searchPh} label={x.search} />}
        columns={[
          { key: "name", label: x.cols.name, sortable: true, header: true, render: (u) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={u.name} size="sm" /><span>{u.name}</span></div> },
          { key: "email", label: x.cols.email, sortable: true },
          { key: "role", label: x.cols.role, sortable: true, render: (u) => <span className="ns-course-tag">{tr.adm.roles[u.role]}</span> },
          { key: "status", label: x.cols.state, sortable: true, render: (u) => { const s = USER_STATUS[u.status]; return <Badge tone={s[1]} icon={s[2]}>{tr.adm.userStatus[u.status]}</Badge>; } },
          { key: "last", label: x.cols.last, render: (u) => seenText(tr, lang, u.last) },
        ]}
        rowActions={(u) => [
          <IconAction key="e" icon="edit" label={x.edit(u.name)} onClick={() => setDrawer(u)} />,
          <IconAction key="v" icon="eye" label={x.view(u.name)} onClick={() => setDrawer({ _view: true, ...u })} />,
          u.kind === "staff" && (u.status === "none" || u.status === "invited")
            ? <IconAction key="m" icon="mail" label={u.status === "invited" ? x.resend(u.name) : x.send(u.name)} disabled={inviting === u.email} onClick={() => invite1(u.email, u.name)} />
            : <IconAction key="k" icon="key" label={x.reset(u.name)} disabled={!DEMO && u.status !== "active"} onClick={() => setReset(u)} />,
          <IconAction key="d" icon="userx" tone="danger" label={x.deactivateOf(u.name)} disabled={u.status === "inactive" || (!DEMO && !u.profileId)} onClick={() => setDeact(u)} />,
        ]}
      />
      <PasswordResetDialog open={!!reset} user={reset || undefined} onClose={() => setReset(null)} onSend={reset ? () => sendPasswordReset(reset.email) : undefined} />
      <ConfirmAction
        open={!!deact} onCancel={() => setDeact(null)} danger icon="userx" title={deact ? x.deactTitle(deact.name) : ""} loading={deactMut.isPending}
        description={x.deactText} confirmLabel={x.deactivate}
        onConfirm={() => {
          const u = deact!;
          deactMut.mutateAsync(u).then(
            () => {
              if (DEMO) setRows(rows.map((x) => (x.id === u.id ? { ...x, status: "inactive" } : x)));
              setDeact(null);
              showToast({ tone: "success", title: x.deactivated, message: x.deactivatedText(u.name) });
            },
            (e) => { setDeact(null); showToast({ tone: "error", title: x.deactError, message: e instanceof Error && !("code" in e) ? e.message : adminMessage(e, tr) }); },
          );
        }}
      />
      <Drawer
        open={!!drawer} onClose={closeDrawer} eyebrow={drawer && drawer._view ? x.eyebrowView : drawer?._new ? x.eyebrowInvite : x.eyebrowEdit} title={drawer ? (drawer._new ? x.newUser : drawer.name) : ""} closeLabel={tr.prefs.close}
        footer={drawer && !drawer._view ? [
          <Button key="c" variant="secondary" onClick={closeDrawer}>{x.cancel}</Button>,
          <Button key="s" icon="check" loading={saveMut.isPending} onClick={save}>{drawer._new ? x.register : x.saveChanges}</Button>,
        ] : null}
      >
        {drawer && f ? (drawer._view ? (
          <dl className="ns-dl">
            {[[x.cols.email, drawer.email || x.noEmail], [x.cols.role, tr.adm.roles[drawer.role]], [x.cols.state, tr.adm.userStatus[drawer.status]], [x.cols.last, seenText(tr, lang, drawer.last)]].map((y) => <Fragment key={y[0]}><dt>{y[0]}</dt><dd>{y[1]}</dd></Fragment>)}
          </dl>
        ) : (
          <div className="ns-form-grid ns-form-grid--1">
            <Input label={x.fullName} required value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} error={tried ? errors.name : undefined} />
            <Input label={x.cols.email} type="email" required={f.kind === "staff"} value={f.email} readOnly={!DEMO && !!f.profileId} onChange={(e) => setForm({ ...f, email: e.target.value })} error={tried ? errors.email : undefined}
              hint={f._new ? x.newHint : !DEMO && f.profileId ? x.hasAccount : undefined} />
            {f.kind === "guardian" && !DEMO ? null : (
              <Select label={x.cols.role} value={f.role} onChange={(v) => setForm({ ...f, role: v as UserRole })}
                options={(Object.keys(USER_ROLES) as UserRole[]).filter((k) => DEMO || k !== "guardian").map((k) => ({ value: k, label: tr.adm.roles[k] }))} />
            )}
          </div>
        )) : null}
      </Drawer>
      {toastNode}
    </>
  );
}
