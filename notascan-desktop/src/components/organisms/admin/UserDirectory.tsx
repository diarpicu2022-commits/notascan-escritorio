import { Fragment, useEffect, useRef, useState } from "react";
import { USER_ROLES, USER_STATUS, type UserRole } from "../../../data/admin";
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

type DrawerUser = DirUser & { _view?: boolean; _new?: boolean };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const NEW_USER: DrawerUser = { id: "", kind: "staff", name: "", email: "", role: "teacher", status: "none", last: "Nunca", _new: true };

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
  /** Envía el código de activación (función invite-staff) a alguien registrado sin cuenta activa. */
  function invite1(email: string, name: string) {
    setInviting(email);
    return sendInvitation({ email }).then(
      () => {
        if (DEMO) setRows((rs) => rs.map((x) => (x.email === email ? { ...x, status: "invited" } : x)));
        showToast({ tone: "success", title: "Invitación enviada", message: name + " recibirá un código en " + email + " para activar su cuenta." });
      },
      (x) => showToast({ tone: "error", title: "No enviamos la invitación", message: x instanceof Error ? x.message : "" }),
    ).finally(() => setInviting(null));
  }
  useEffect(() => { setForm(drawer ? { ...drawer } : null); setTried(false); }, [drawer]);
  const closeDrawer = () => { setDrawer(null); onInviteClose?.(); };
  const t = query.toLowerCase();
  const list = rows.filter((u) => (tab === "all" || u.role === tab) && (!t || u.name.toLowerCase().indexOf(t) >= 0 || u.email.indexOf(t) >= 0));
  const count = (r: string) => rows.filter((u) => r === "all" || u.role === r).length;

  const f = form;
  const errors = f ? {
    name: !f.name.trim() ? "Escribe el nombre completo." : undefined,
    email: f.kind === "staff" && !EMAIL.test(f.email.trim()) ? "Escribe un correo válido." : f.kind === "guardian" && f.email.trim() && !EMAIL.test(f.email.trim()) ? "Escribe un correo válido." : undefined,
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
        else showToast({ tone: "success", title: "Cambios guardados" });
      },
      (e) => showToast({ tone: "error", title: "No pudimos guardar", message: adminMessage(e) }),
    );
  }

  return (
    <>
      <SegmentedTabs label="Tipo de usuario" value={tab} onChange={setTab}
        tabs={[["all", "Todos"], ["teacher", "Docentes"], ["guardian", "Acudientes"], ["staff", "Administrativos"], ["director", "Directivos"]].map((x) => ({ value: x[0], label: x[1], count: count(x[0]) }))} />
      <DataGrid<DirUser>
        caption="Directorio de usuarios" rows={list} pageSize={10} density="compact" densityToggle resetKey={tab + t}
        loading={q.isPending && !q.data} error={q.isError && !q.data ? "No pudimos cargar el directorio de usuarios." : undefined} onRetry={() => q.refetch()}
        emptyTitle={rows.length ? "No hay resultados para esta búsqueda." : "Aún no hay usuarios registrados."} emptyIcon="user"
        toolbar={<SearchField value={query} onChange={setQuery} placeholder="Nombre o correo" label="Buscar usuario" />}
        columns={[
          { key: "name", label: "Nombre", sortable: true, header: true, render: (u) => <div className="ns-cell-link ns-cell-link--static"><Avatar name={u.name} size="sm" /><span>{u.name}</span></div> },
          { key: "email", label: "Correo", sortable: true },
          { key: "role", label: "Rol", sortable: true, render: (u) => <span className="ns-course-tag">{USER_ROLES[u.role]}</span> },
          { key: "status", label: "Estado", sortable: true, render: (u) => { const s = USER_STATUS[u.status]; return <Badge tone={s[1]} icon={s[2]}>{s[0]}</Badge>; } },
          { key: "last", label: "Último acceso" },
        ]}
        rowActions={(u) => [
          <IconAction key="e" icon="edit" label={"Editar " + u.name} onClick={() => setDrawer(u)} />,
          <IconAction key="v" icon="eye" label={"Ver perfil de " + u.name} onClick={() => setDrawer({ _view: true, ...u })} />,
          u.kind === "staff" && (u.status === "none" || u.status === "invited")
            ? <IconAction key="m" icon="mail" label={(u.status === "invited" ? "Reenviar invitación a " : "Enviar invitación a ") + u.name} disabled={inviting === u.email} onClick={() => invite1(u.email, u.name)} />
            : <IconAction key="k" icon="key" label={"Restablecer contraseña de " + u.name} disabled={!DEMO && u.status !== "active"} onClick={() => setReset(u)} />,
          <IconAction key="d" icon="userx" tone="danger" label={"Desactivar a " + u.name} disabled={u.status === "inactive" || (!DEMO && !u.profileId)} onClick={() => setDeact(u)} />,
        ]}
      />
      <PasswordResetDialog open={!!reset} user={reset || undefined} onClose={() => setReset(null)} onSend={reset ? () => sendPasswordReset(reset.email) : undefined} />
      <ConfirmAction
        open={!!deact} onCancel={() => setDeact(null)} danger icon="userx" title={deact ? "¿Desactivar a " + deact.name + "?" : ""} loading={deactMut.isPending}
        description="No podrá iniciar sesión hasta que se reactive su cuenta. Sus registros se conservan." confirmLabel="Desactivar"
        onConfirm={() => {
          const u = deact!;
          deactMut.mutateAsync(u).then(
            () => {
              if (DEMO) setRows(rows.map((x) => (x.id === u.id ? { ...x, status: "inactive" } : x)));
              setDeact(null);
              showToast({ tone: "success", title: "Usuario desactivado", message: u.name + " ya no tiene acceso." });
            },
            (e) => { setDeact(null); showToast({ tone: "error", title: "No pudimos desactivar", message: e instanceof Error && !("code" in e) ? e.message : adminMessage(e) }); },
          );
        }}
      />
      <Drawer
        open={!!drawer} onClose={closeDrawer} eyebrow={drawer && drawer._view ? "Perfil de usuario" : drawer?._new ? "Invitar usuario" : "Editar usuario"} title={drawer ? (drawer._new ? "Nuevo usuario" : drawer.name) : ""}
        footer={drawer && !drawer._view ? [
          <Button key="c" variant="secondary" onClick={closeDrawer}>Cancelar</Button>,
          <Button key="s" icon="check" loading={saveMut.isPending} onClick={save}>{drawer._new ? "Registrar usuario" : "Guardar cambios"}</Button>,
        ] : null}
      >
        {drawer && f ? (drawer._view ? (
          <dl className="ns-dl">
            {[["Correo", drawer.email || "Sin correo"], ["Rol", USER_ROLES[drawer.role]], ["Estado", USER_STATUS[drawer.status][0]], ["Último acceso", drawer.last]].map((x) => <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>)}
          </dl>
        ) : (
          <div className="ns-form-grid ns-form-grid--1">
            <Input label="Nombre completo" required value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} error={tried ? errors.name : undefined} />
            <Input label="Correo" type="email" required={f.kind === "staff"} value={f.email} readOnly={!DEMO && !!f.profileId} onChange={(e) => setForm({ ...f, email: e.target.value })} error={tried ? errors.email : undefined}
              hint={f._new ? "Con este correo creará su acceso. Solo entra quien está registrado aquí." : !DEMO && f.profileId ? "Ya tiene cuenta: su correo de acceso no se cambia desde aquí." : undefined} />
            {f.kind === "guardian" && !DEMO ? null : (
              <Select label="Rol" value={f.role} onChange={(v) => setForm({ ...f, role: v as UserRole })}
                options={(Object.keys(USER_ROLES) as UserRole[]).filter((k) => DEMO || k !== "guardian").map((k) => ({ value: k, label: USER_ROLES[k] }))} />
            )}
          </div>
        )) : null}
      </Drawer>
      {toastNode}
    </>
  );
}
