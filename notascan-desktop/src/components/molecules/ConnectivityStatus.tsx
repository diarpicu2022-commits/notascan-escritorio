import { useState } from "react";
import { cx } from "../../lib/cx";
import type { SyncStatus } from "../../types/domain";
import { Button } from "../atoms/Button";
import { Icon, type IconName } from "../atoms/Icon";
import { StatusDot } from "../atoms/StatusDot";
import { Switch } from "../atoms/Switch";

const SYNC: Record<SyncStatus["status"], [string, "success" | "processing" | "warning" | "error", IconName]> = {
  online: ["Conectado", "success", "wifi"],
  syncing: ["Sincronizando", "processing", "refresh"],
  offline: ["Modo offline", "warning", "wifioff"],
  error: ["Error de sincronización", "error", "warning"],
};

interface ConnectivityStatusProps {
  status: SyncStatus["status"];
  lastSync?: string;
  pending?: number;
  defaultOpen?: boolean;
  onSync?: () => void;
  onToggleOffline?: (offline: boolean) => void;
}

/** Píldora de conexión del docente: trabajar sin conexión deja los cambios pendientes, nunca los pierde. */
export function ConnectivityStatus({ status, lastSync, pending, defaultOpen, onSync, onToggleOffline }: ConnectivityStatusProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const s = SYNC[status] || SYNC.online;
  return (
    <div className="ns-conn">
      <button type="button" className={cx("ns-conn-pill", "ns-conn-pill--" + status)} aria-expanded={open} onClick={() => setOpen(!open)}>
        <StatusDot status={s[1]} hideLabel label={s[0]} />
        <span>{s[0]}</span>
        {pending ? <span className="ns-chip-count">{pending}</span> : null}
      </button>
      {open ? (
        <div className="ns-conn-pop" role="dialog" aria-label="Estado de sincronización">
          <div className="ns-row" style={{ gap: 10 }}><Icon name={s[2]} size={20} /><strong>{s[0]}</strong></div>
          {status === "offline" ? <p>Tus cambios quedarán pendientes de sincronización.</p>
            : status === "error" ? <p>No pudimos sincronizar. Tus cambios siguen guardados en este equipo.</p> : null}
          <p className="ns-caption">Última sincronización: <strong>{lastSync || "08:42"}</strong></p>
          {pending ? <p className="ns-caption">{pending + " cambios pendientes"}</p> : null}
          <Button size="sm" icon="refresh" block loading={status === "syncing"} loadingText="Sincronizando…" disabled={status === "offline"} onClick={onSync}>Sincronizar ahora</Button>
          {onToggleOffline ? <Switch label="Trabajar sin conexión (demostración)" checked={status === "offline"} onChange={onToggleOffline} /> : null}
        </div>
      ) : null}
    </div>
  );
}
