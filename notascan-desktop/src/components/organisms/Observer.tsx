import { useState } from "react";
import { cx } from "../../lib/cx";
import { OBS, OBS_TYPE, type ObservationItem } from "../../data/academic";
import { useI18n } from "../../i18n/I18nProvider";
import { longDay, monthName, weekInitials } from "../../i18n/dates";
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
  const { t, lang } = useI18n();
  const items = (source || OBS).filter((o) => f === "all" || o.type === f);
  // La fecha llega en ISO y se escribe en el idioma; se agrupa por el día ya escrito (idiomas, paso 3).
  const groups: { date: string; items: ObservationItem[] }[] = [];
  items.forEach((o) => {
    const g = groups[groups.length - 1], day = longDay(lang, o.date);
    if (!g || g.date !== day) groups.push({ date: day, items: [o] }); else g.items.push(o);
  });
  return (
    <div className={cx("ns-observer", compact && "ns-observer--compact")}>
      {hideFilter ? null : (
        <FilterGroup label={t.tch.f.type} value={f} onChange={setF}
          options={(["all", "positive", "neutral", "attention"] as const).map((v) => ({ value: v, label: t.tch.obsFilter[v] }))} />
      )}
      {groups.length ? (
        <ol className="ns-timeline">
          {groups.map((g) => (
            <li key={g.date} className="ns-tl-group">
              <h3 className="ns-tl-date">{g.date.toUpperCase()}</h3>
              <ul>
                {g.items.map((o, i) => {
                  const ty = OBS_TYPE[o.type];
                  return (
                    <li key={i} className={"ns-tl-item ns-tl-item--" + o.type}>
                      <span className="ns-tl-icon" aria-hidden><Icon name={ty[1]} size={16} strokeWidth={2.5} /></span>
                      <div>
                        <span className="ns-tl-type">{t.tch.obsType[o.type]}</span>
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
      ) : <EmptyState icon="eye" title={t.tch.obs.noneTitle} message={t.tch.obs.noneText} />}
    </div>
  );
}

/** Icono de cada estado del calendario; la palabra sale del diccionario (t.tch.obs.cal). */
const CAL_ICON: Record<string, IconName | null> = { present: "check", absent: "close", late: "clock", off: null };

export interface CalendarMonth { year: number; month: number; days: Record<number, "present" | "absent" | "late" | "excused"> }

/** Calendario de asistencia del mes, con forma e icono por estado además del color. Sin `month`, el del sistema. */
export function AttendanceCalendar({ attendance, month }: { attendance?: number; month?: CalendarMonth }) {
  const { t, lang } = useI18n();
  if (month) return <RealCalendar attendance={attendance} m={month} />;
  const o = t.tch.obs, sep = monthName(lang, 8);
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
        <strong className="ns-serif" style={{ fontSize: 20 }}>{o.monthYear(sep, 2026)}</strong>
        <span className="ns-caption">{o.attendancePct(attendance || 96)}</span>
      </div>
      <div className="ns-cal-grid" role="grid" aria-label={o.gridAria(sep)}>
        {weekInitials(lang).map((x, i) => <span key={"h" + i} className="ns-cal-h" aria-hidden>{x}</span>)}
        <span className="ns-cal-pad" aria-hidden />
        {days.map((x) => {
          const label = o.cal[x.st as keyof typeof o.cal], icon = CAL_ICON[x.st];
          return (
            <span key={x.d} role="gridcell" className={"ns-cal-day ns-cal-day--" + x.st} aria-label={o.dayAria(x.d, sep, label)} title={label}>
              {x.d}{icon ? <Icon name={icon} size={10} strokeWidth={3} /> : null}
            </span>
          );
        })}
      </div>
      <div className="ns-cal-legend">
        {["present", "late", "absent"].map((k) => (
          <span key={k} className={"ns-cal-day ns-cal-day--" + k + " ns-cal-day--legend"}><Icon name={CAL_ICON[k]!} size={10} strokeWidth={3} />{o.cal[k as keyof typeof o.cal]}</span>
        ))}
      </div>
    </div>
  );
}

/* Mes real: los días con registro llevan su estado; la excusa se pinta como asistencia (cuenta como asistida en el
   porcentaje) y lo dice en su etiqueta; un día hábil sin registro va como «Sin registro». */
function RealCalendar({ attendance, m }: { attendance?: number; m: CalendarMonth }) {
  const { t, lang } = useI18n();
  const o = t.tch.obs;
  const name = monthName(lang, m.month);
  const total = new Date(m.year, m.month + 1, 0).getDate();
  const pad = (new Date(m.year, m.month, 1).getDay() + 6) % 7;
  const days = Array.from({ length: total }, (_, i) => {
    const d = i + 1, wd = new Date(m.year, m.month, d).getDay(), rec = m.days[d];
    const st = rec === "excused" ? "present" : rec ?? "off";
    const label = rec === "excused" ? o.cal.excused : rec ? o.cal[rec] : wd === 0 || wd === 6 ? o.cal.off : o.cal.none;
    return { d, st, label };
  });
  return (
    <div className="ns-cal">
      <div className="ns-row" style={{ justifyContent: "space-between" }}>
        <strong className="ns-serif" style={{ fontSize: 20 }}>{o.monthYear(name, m.year)}</strong>
        <span className="ns-caption">{attendance === undefined || isNaN(attendance) ? o.noRecords : o.attendancePct(attendance)}</span>
      </div>
      <div className="ns-cal-grid" role="grid" aria-label={o.gridAria(name)}>
        {weekInitials(lang).map((x, i) => <span key={"h" + i} className="ns-cal-h" aria-hidden>{x}</span>)}
        {Array.from({ length: pad }, (_, i) => <span key={"p" + i} className="ns-cal-pad" aria-hidden />)}
        {days.map((x) => {
          const icon = CAL_ICON[x.st];
          return (
            <span key={x.d} role="gridcell" className={"ns-cal-day ns-cal-day--" + x.st} aria-label={o.dayAria(x.d, name, x.label)} title={x.label}>
              {x.d}{icon ? <Icon name={icon} size={10} strokeWidth={3} /> : null}
            </span>
          );
        })}
      </div>
      <div className="ns-cal-legend">
        {["present", "late", "absent"].map((k) => (
          <span key={k} className={"ns-cal-day ns-cal-day--" + k + " ns-cal-day--legend"}><Icon name={CAL_ICON[k]!} size={10} strokeWidth={3} />{o.cal[k as keyof typeof o.cal]}</span>
        ))}
      </div>
    </div>
  );
}
