import { useState } from "react";
import { cx } from "../../lib/cx";
import type { SyncStatus } from "../../types/domain";
import { Button } from "../atoms/Button";
import { Icon, type IconName } from "../atoms/Icon";
import { StatusDot } from "../atoms/StatusDot";
import { Switch } from "../atoms/Switch";
import { useI18n } from "../../i18n/I18nProvider";


const SYNC: Record<SyncStatus["status"], ["success" | "processing" | "warning" | "error", IconName]> = {
  online: ["success", "wifi"],
  syncing: ["processing", "refresh"],
  offline: ["warning", "wifioff"],
  error: ["error", "warning"],
};

interface ConnectivityStatusProps {
  status: SyncStatus["status"];
  lastSync?: string;
  pending?: number;
  defaultOpen?: boolean;
  onSync?: () => void;
  onToggleOffline?: (offline: boolean) => void;
  /** Aviso de la última sincronización (p. ej. cambios que la base no aceptó). */
  notice?: string;
}

/** Píldora de conexión del docente: trabajar sin conexión deja los cambios pendientes, nunca los pierde. */
export function ConnectivityStatus({ status, lastSync, pending, defaultOpen, onSync, onToggleOffline, notice }: ConnectivityStatusProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const { t } = useI18n();
  const known = status in SYNC ? status : "online";
  const word = t.conn.status[known];
  const [dot, icon] = SYNC[known];
  return (
    <div className="ns-conn">
      <button type="button" className={cx("ns-conn-pill", "ns-conn-pill--" + status)} aria-expanded={open} onClick={() => setOpen(!open)}>
        <StatusDot status={dot} hideLabel label={word} />
        <span>{word}</span>
        {pending ? <span className="ns-chip-count">{pending}</span> : null}
      </button>
      {open ? (
        <div className="ns-conn-pop" role="dialog" aria-label={t.conn.dialog}>
          <div className="ns-row" style={{ gap: 10 }}><Icon name={icon} size={20} /><strong>{word}</strong></div>
          {status === "offline" ? <p>{t.conn.offline}</p>
            : status === "error" ? <p>{t.conn.error}</p> : null}
          <p className="ns-caption">{t.conn.last + " "}<strong>{lastSync || "08:42"}</strong></p>
          {pending ? <p className="ns-caption">{t.conn.pending(pending)}</p> : null}
          {notice ? <p className="ns-caption" role="status">{notice}</p> : null}
          <Button size="sm" icon="refresh" block loading={status === "syncing"} loadingText={t.conn.syncing} disabled={status === "offline"} onClick={onSync}>{t.conn.syncNow}</Button>
          {onToggleOffline ? <Switch label={t.conn.workOffline} checked={status === "offline"} onChange={onToggleOffline} /> : null}
        </div>
      ) : null}
    </div>
  );
}
