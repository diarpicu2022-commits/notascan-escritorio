import { useState } from "react";
import { cx } from "../../lib/cx";
import { OBS, OBS_TYPE, type ObservationItem } from "../../data/academic";
import { Icon, type IconName } from "../atoms/Icon";
import { FilterGroup } from "../molecules/Filters";
import { EmptyState } from "./EmptyState";

interface ObserverTimelineProps {
  items?: ObservationItem[];
  showStudent?: boolean;
  hideFilter?: boolean;
  compact?: boolean;
}

/** Observador en orden cronológico, agrupado por fecha; cada tipo lleva icono y palabra. */
export function ObserverTimeline({ items: source, showStudent, hideFilter, compact }: ObserverTimelineProps) {
  const [f, setF] = useState("all");
  const items = (source || OBS).filter((o) => f === "all" || o.type === f);
  const groups: { date: string; items: ObservationItem[] }[] = [];
  items.forEach((o) => {
    const g = groups[groups.length - 1];
    if (!g || g.date !== o.date) groups.push({ date: o.date, items: [o] }); else g.items.push(o);
  });
  return (
    <div className={cx("ns-observer", compact && "ns-observer--compact")}>
      {hideFilter ? null : (
        <FilterGroup label="Tipo" value={f} onChange={setF}
          options={[{ value: "all", label: "Todas" }, { value: "positive", label: "Positivas" }, { value: "neutral", label: "Informativas" }, { value: "attention", label: "Atención" }]} />
      )}
      {groups.length ? (
        <ol className="ns-timeline">
          {groups.map((g) => (
            <li key={g.date} className="ns-tl-group">
              <h3 className="ns-tl-date">{g.date.toUpperCase()}</h3>
              <ul>
                {g.items.map((o, i) => {
                  const t = OBS_TYPE[o.type];
                  return (
                    <li key={i} className={"ns-tl-item ns-tl-item--" + o.type}>
                      <span className="ns-tl-icon" aria-hidden><Icon name={t[1]} size={16} strokeWidth={2.5} /></span>
                      <div>
                        <span className="ns-tl-type">{t[0]}</span>
                        <strong>{o.title}</strong>
                        <span className="ns-caption">{o.context + (showStudent ? " · " + o.student.split(" ").slice(0, 3).join(" ") + " (" + o.course + ")" : "") + (o.by ? " · " + o.by : "")}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      ) : <EmptyState icon="eye" title="No hay anotaciones de este tipo." message="Las observaciones aparecerán en orden cronológico." />}
    </div>
  );
}

const CAL_LABEL: Record<string, [string, IconName | null]> = { present: ["Presente", "check"], absent: ["Inasistencia", "close"], late: ["Tarde", "clock"], off: ["Sin clase", null] };

/** Calendario de asistencia del mes, con forma e icono por estado además del color. */
export function AttendanceCalendar({ attendance }: { attendance?: number }) {
  const days: { d: number; st: string; wd: number }[] = [];
  for (let d = 1; d <= 30; d++) {
    const wd = (d + 1) % 7;
    const weekend = wd === 0 || wd === 6;
    const st = weekend ? "off" : d === 24 ? "absent" : d === 22 ? "late" : d > 30 ? "off" : "present";
    days.push({ d, st, wd });
  }
  return (
    <div className="ns-cal">
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <strong className="ns-serif" style={{ fontSize: 20 }}>Septiembre 2026</strong>
        <span className="ns-caption">{(attendance || 96) + "% de asistencia"}</span>
      </div>
      <div className="ns-cal-grid" role="grid" aria-label="Asistencia de septiembre">
        {["L", "M", "M", "J", "V", "S", "D"].map((x, i) => <span key={"h" + i} className="ns-cal-h" aria-hidden>{x}</span>)}
        <span className="ns-cal-pad" aria-hidden />
        {days.map((x) => {
          const l = CAL_LABEL[x.st];
          return (
            <span key={x.d} role="gridcell" className={"ns-cal-day ns-cal-day--" + x.st} aria-label={x.d + " de septiembre: " + l[0]} title={l[0]}>
              {x.d}{l[1] ? <Icon name={l[1]} size={10} strokeWidth={3} /> : null}
            </span>
          );
        })}
      </div>
      <div className="ns-cal-legend">
        {["present", "late", "absent"].map((k) => (
          <span key={k} className={"ns-cal-day ns-cal-day--" + k + " ns-cal-day--legend"}><Icon name={CAL_LABEL[k][1]!} size={10} strokeWidth={3} />{CAL_LABEL[k][0]}</span>
        ))}
      </div>
    </div>
  );
}
