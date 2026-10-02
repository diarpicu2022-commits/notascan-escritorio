import { Fragment, useState } from "react";
import { USERS, USER_ROLES, USER_STATUS, type DirectoryUser, type UserRole } from "../../../data/admin";
import { Avatar } from "../../atoms/Avatar";
import { Badge } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction, SegmentedTabs } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import { SearchField } from "../../molecules/Filters";
import { DataGrid } from "../DataGrid";
import { ConfirmAction, Drawer, PasswordResetDialog } from "../Overlays";
import { useToast } from "../Toast";

type DrawerUser = DirectoryUser & { _view?: boolean };

/** Docentes, acudientes, administrativos y directivos: editar, restablecer acceso o desactivar. */
export function UserDirectory() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<DirectoryUser[]>(USERS);
  const [reset, setReset] = useState<DirectoryUser | null>(null);
  const [deact, setDeact] = useState<DirectoryUser | null>(null);
  const [drawer, setDrawer] = useState<DrawerUser | null>(null);
  const [showToast, toastNode] = useToast();
  const t = q.toLowerCase();
  const list = rows.filter((u) => (tab === "all" || u.role === tab) && (!t || u.name.toLowerCase().indexOf(t) >= 0 || u.email.indexOf(t) >= 0));
  const count = (r: string) => rows.filter((u) => r === "all" || u.role === r).length;

  return (
    <>
      <SegmentedTabs label="Tipo de usuario" value={tab} onChange={setTab}
        tabs={[["all", "Todos"], ["teacher", "Docentes"], ["guardian", "Acudientes"], ["staff", "Administrativos"], ["director", "Directivos"]].map((x) => ({ value: x[0], label: x[1], count: count(x[0]) }))} />
      <DataGrid<DirectoryUser>
        caption="Directorio de usuarios" rows={list} pageSize={10} density="compact" densityToggle resetKey={tab + t}
        toolbar={<SearchField value={q} onChange={setQ} placeholder="Nombre o correo" label="Buscar usuario" />}
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
          <IconAction key="k" icon="key" label={"Restablecer contraseña de " + u.name} onClick={() => setReset(u)} />,
          <IconAction key="d" icon="userx" tone="danger" label={"Desactivar a " + u.name} disabled={u.status === "inactive"} onClick={() => setDeact(u)} />,
        ]}
      />
      <PasswordResetDialog open={!!reset} user={reset || undefined} onClose={() => setReset(null)} />
      <ConfirmAction
        open={!!deact} onCancel={() => setDeact(null)} danger icon="userx" title={deact ? "¿Desactivar a " + deact.name + "?" : ""}
        description="No podrá iniciar sesión hasta que se reactive su cuenta. Sus registros se conservan." confirmLabel="Desactivar"
        onConfirm={() => {
          const u = deact!;
          setRows(rows.map((x) => (x.id === u.id ? { ...x, status: "inactive" } : x)));
          setDeact(null);
          showToast({ tone: "success", title: "Usuario desactivado", message: u.name + " ya no tiene acceso." });
        }}
      />
      <Drawer
        open={!!drawer} onClose={() => setDrawer(null)} eyebrow={drawer && drawer._view ? "Perfil de usuario" : "Editar usuario"} title={drawer ? drawer.name : ""}
        footer={drawer && !drawer._view ? [
          <Button key="c" variant="secondary" onClick={() => setDrawer(null)}>Cancelar</Button>,
          <Button key="s" icon="check" onClick={() => { setDrawer(null); showToast({ tone: "success", title: "Cambios guardados" }); }}>Guardar cambios</Button>,
        ] : null}
      >
        {drawer ? (drawer._view ? (
          <dl className="ns-dl">
            {[["Correo", drawer.email], ["Rol", USER_ROLES[drawer.role]], ["Estado", USER_STATUS[drawer.status][0]], ["Último acceso", drawer.last]].map((x) => <Fragment key={x[0]}><dt>{x[0]}</dt><dd>{x[1]}</dd></Fragment>)}
          </dl>
        ) : (
          <div className="ns-form-grid ns-form-grid--1">
            <Input label="Nombre completo" required defaultValue={drawer.name} />
            <Input label="Correo" type="email" required defaultValue={drawer.email} />
            <Select label="Rol" defaultValue={drawer.role} options={(Object.keys(USER_ROLES) as UserRole[]).map((k) => ({ value: k, label: USER_ROLES[k] }))} />
          </div>
        )) : null}
      </Drawer>
      {toastNode}
    </>
  );
}
