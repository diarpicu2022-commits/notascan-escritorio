import { useEffect, useRef, useState } from "react";
import { cx } from "../../../lib/cx";
import { PERIOD_SETUP } from "../../../data/academic";
import { DEMO } from "../../../lib/supabase";
import { adminMessage, usePeriods, useSavePeriod, useSavePeriodWeights, type Period, type PeriodStatus, type WeightItem } from "../../../services/admin";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import { Icon, type IconName } from "../../atoms/Icon";
import { Block, BlockTitle } from "../Layout";
import { EmptyState } from "../EmptyState";
import { ErrorState, LoadingBlocks } from "../QueryState";
import { useToast } from "../Toast";
import { useMyInstitution, useSaveGoal } from "../../../services/institution";
import { purgePeriodPhotos } from "../../../services/vision";
import { useI18n } from "../../../i18n/I18nProvider";

export type { WeightItem };

/** Componentes de la nota con su porcentaje; avisa si no suman 100 %. */
export function PeriodWeightEditor({ items, onChange, addLabel, newName }: { items: WeightItem[]; onChange: (items: WeightItem[]) => void; addLabel?: string; newName?: string }) {
  const total = items.reduce((a, x) => a + (Number(x.weight) || 0), 0), ok = total === 100;
  const set = (i: number, patch: Partial<WeightItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const { t } = useI18n();
  const w = t.adm.per, pn = t.tch.periodName;
  return (
    <div className="ns-weights">
      <div className="ns-weight-bar ns-weight-bar--edit" role="img" aria-label={w.distribution(items.map((x) => pn(x.name) + " " + x.weight + "%").join(", "))}>
        {items.map((x, i) => (Number(x.weight) > 0 ? <span key={i} className={"ns-weight-seg ns-weight-seg--t" + (i % 5)} style={{ flex: Number(x.weight) }}>{x.weight + "%"}</span> : null))}
        {total < 100 ? <span className="ns-weight-seg ns-weight-seg--empty" style={{ flex: 100 - total }}>{w.missing(100 - total)}</span> : null}
      </div>
      <ul className="ns-weight-list">
        {items.map((x, i) => (
          <li key={i} className="ns-weight-row">
            <i className={"ns-swatch-dot ns-weight-dot--t" + (i % 5)} aria-hidden />
            <Input label={w.component} hideLabel value={x.name} onChange={(e) => set(i, { name: e.target.value })} aria-label={w.componentAria(i + 1)} />
            <input type="range" min={0} max={100} step={5} value={x.weight} aria-label={w.pctOf(x.name)} className="ns-range" onChange={(e) => set(i, { weight: Number(e.target.value) })} />
            <div className="ns-pct-input">
              <input type="number" min={0} max={100} value={x.weight} aria-label={w.pctNumOf(x.name)} onChange={(e) => set(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
              <span>%</span>
            </div>
            <IconAction icon="trash" tone="danger" label={w.remove(x.name)} disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      <div className="ns-weight-foot">
        <Button variant="ghost" size="sm" icon="plus" onClick={() => onChange(items.concat([{ name: newName || w.newComponent, weight: 0 }]))}>{addLabel || w.addComponent}</Button>
        <div className={cx("ns-weight-total", ok ? "is-ok" : "is-bad")} role="status">
          <span className="ns-overline">{w.total}</span>
          <strong>{total + "%"}</strong>
          <span><Icon name={ok ? "check" : "warning"} size={16} />{ok ? w.complete : w.mustSum}</span>
        </div>
      </div>
    </div>
  );
}

function PeriodWeightReadonly({ items }: { items: WeightItem[] }) {
  return (
    <div className="ns-weight-bar ns-weight-bar--edit" role="img" aria-label={items.map((x) => x.name + " " + x.weight + "%").join(", ")}>
      {items.map((x, i) => <span key={i} className={"ns-weight-seg ns-weight-seg--t" + (i % 5)} style={{ flex: x.weight }}>{x.weight + "% " + x.name}</span>)}
    </div>
  );
}

/** Tono e icono de cada estado; la palabra sale del diccionario (t.adm.periodStatus). */
const PST: Record<PeriodStatus, [BadgeTone, IconName]> = { closed: ["neutral", "lock"], open: ["verified", "check"], draft: ["pending", "clock"] };

/** Periodo que se abre al entrar: el primer borrador (el que se está preparando), si no el abierto. */
const initialSel = (list: Period[]) => (list.find((x) => x.status === "draft") ?? list.find((x) => x.status === "open") ?? list[list.length - 1])?.id ?? "";
const weightsOf = (list: Period[]) => (DEMO ? PERIOD_SETUP.names.map((n, i) => ({ name: n, weight: PERIOD_SETUP.weights[i] })) : list.map((x) => ({ name: x.name, weight: x.finalWeight })));

/** Meta institucional: el promedio que el colegio espera de cada grado; Rectoría la ve como línea en la analítica. */
function InstitutionGoal({ onSaved }: { onSaved: (ok: boolean, text: string) => void }) {
  const stored = useMyInstitution().data?.goal ?? 3.5;
  const save = useSaveGoal();
  const [v, setV] = useState(stored.toFixed(1));
  useEffect(() => { setV(stored.toFixed(1)); }, [stored]);
  const n = Number(v.replace(",", "."));
  const bad = !v.trim() || isNaN(n) || n < 1 || n > 5;
  const { t, shownGrade } = useI18n();
  const w = t.adm.per;
  return (
    <Block label={w.goal}>
      <BlockTitle action={
        <Button size="sm" icon="check" disabled={bad || Math.round(n * 10) / 10 === stored} loading={save.isPending} onClick={() => {
          const goal = Math.round(n * 10) / 10;
          save.mutateAsync(goal).then(() => onSaved(true, w.goalSaved(shownGrade(goal))), (e) => onSaved(false, adminMessage(e, t)));
        }}>{w.saveGoal}</Button>
      }>{w.goal}</BlockTitle>
      <div className="ns-form-grid">
        <Input label={w.goalLabel} type="number" inputMode="decimal" min={1} max={5} step={0.1} value={v} onChange={(e) => setV(e.target.value)}
          hint={w.goalHint} error={bad ? w.goalError : null} />
      </div>
    </Block>
  );
}

/** Periodos del año, su peso en la nota final y cómo se compone la nota de cada uno. */
export function PeriodConfigurator() {
  const q = usePeriods();
  const saveMut = useSavePeriod();
  const weightsMut = useSavePeriodWeights();
  const [periods, setPeriods] = useState<Period[]>(() => q.data?.periods ?? []);
  const [sel, setSel] = useState(() => initialSel(q.data?.periods ?? []));
  const [pw, setPw] = useState<WeightItem[]>(() => weightsOf(q.data?.periods ?? []));
  const lastData = useRef(q.data);
  // Datos nuevos de la base (tras guardar o crear un periodo): se recarga la lista sin perder el periodo elegido.
  useEffect(() => {
    if (lastData.current === q.data || !q.data) return;
    lastData.current = q.data;
    const list = q.data.periods;
    setPeriods(list); setPw(weightsOf(list));
    setSel((cur) => (list.some((x) => x.id === cur) ? cur : initialSel(list)));
  }, [q.data]);
  const [showToast, toastNode] = useToast();
  const [purging, setPurging] = useState(false);
  const { t } = useI18n();
  const w = t.adm.per, pn = t.tch.periodName;
  // Borra las fotos de un periodo cerrado; también se puede reintentar desde el periodo cerrado.
  async function purge(periodId: string, closing = false) {
    setPurging(true);
    try {
      const r = await purgePeriodPhotos(periodId);
      showToast({ tone: "success", title: closing ? w.closed : w.photosGone, message: w.photosDeleted(r.removed) });
    } catch (e) {
      // El mensaje de la función llega escrito en español; sin él, el genérico del idioma.
      const m = e instanceof Error ? (e.message === "No pudimos leer la foto. Revisa tu conexión e inténtalo de nuevo." ? w.photoError : e.message) : "";
      showToast({ tone: "error", title: closing ? w.closedNoPhotos : w.photosFailed, message: (m ? m + " " : "") + w.photosRetry });
    } finally { setPurging(false); }
  }
  const pwTotal = pw.reduce((a, x) => a + (Number(x.weight) || 0), 0);
  const p = periods.find((x) => x.id === sel);

  if (q.isPending && !q.data) return <LoadingBlocks label={w.loading} />;
  if (q.isError && !q.data) return <ErrorState title={w.loadError} onRetry={() => q.refetch()} />;
  if (!p) return <EmptyState icon="calendar" title={w.noneTitle} message={w.noneText} />;

  const total = p.items.reduce((a, x) => a + (Number(x.weight) || 0), 0);
  const badDates = !!p.open && !!p.close && p.close <= p.open;
  const upd = (patch: Partial<Period>) => setPeriods(periods.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  // Lo cerrado en la base manda: un periodo cerrado no se edita aunque se cambie el selector de estado en pantalla.
  const stored = q.data?.periods.find((x) => x.id === p.id);
  const locked = (stored ?? p).status === "closed" && p.status === "closed";

  return (
    <>
      <Block tone="gold" label={w.weightsLabel}>
        <BlockTitle action={
          <Button size="sm" icon="check" disabled={pwTotal !== 100} loading={weightsMut.isPending} onClick={() => {
            weightsMut.mutateAsync({ periods, weights: pw }).then(
              () => showToast({ tone: "success", title: w.weightsSaved, message: w.weightsSavedText(pw.map((x) => x.weight + "%").join(" · ")) }),
              (e) => showToast({ tone: "error", title: w.weightsError, message: e instanceof Error && !("code" in e) ? e.message : adminMessage(e, t) }),
            );
          }}>{w.saveWeights}</Button>
        }>{w.weightsTitle}</BlockTitle>
        <p className="ns-caption" style={{ margin: 0 }}>{w.weightsNote}</p>
        {/* El nombre propuesto se guarda como dato: sale con la forma del sistema, «Periodo N». */}
        <PeriodWeightEditor items={pw} onChange={setPw} addLabel={w.addPeriod} newName={"Periodo " + (pw.length + 1)} />
      </Block>
      <div className="ns-period">
        <div className="ns-period-list" role="tablist" aria-label={w.listAria(p.year)} aria-orientation="vertical">
          {periods.map((x) => {
            const st = PST[x.status];
            return (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === sel} className="ns-period-item" onClick={() => setSel(x.id)}>
                <strong>{pn(x.name)}</strong>
                <span className="ns-caption">{x.open.split("-").reverse().slice(0, 2).join("/") + " – " + x.close.split("-").reverse().slice(0, 2).join("/")}</span>
                <Badge tone={st[0]} icon={st[1]}>{t.adm.periodStatus[x.status]}</Badge>
              </button>
            );
          })}
        </div>
        <Block className="ns-period-editor">
          <BlockTitle action={<Badge tone={PST[p.status][0]} icon={PST[p.status][1]}>{t.adm.periodStatus[p.status]}</Badge>}>{pn(p.name) + " · " + p.year}</BlockTitle>
          {locked ? <p className="ns-sensitive"><Icon name="lock" size={16} />{w.lockedNote}</p> : null}
          {locked && !DEMO ? (
            <div><Button variant="secondary" size="sm" icon="trash" loading={purging} loadingText={w.deleting} onClick={() => purge(p.id)}>{w.deletePhotos}</Button></div>
          ) : null}
          <div className="ns-form-grid">
            <Select label={w.year} value={String(p.year)} options={[String(p.year)]} disabled={locked} />
            <Select label={t.adm.f.state} value={p.status} onChange={(v) => upd({ status: v as PeriodStatus })} options={(["draft", "open", "closed"] as const).map((k) => ({ value: k, label: t.adm.periodStatus[k] }))} />
            <Input label={w.open} type="date" value={p.open} readOnly={locked} onChange={(e) => upd({ open: e.target.value })} />
            <Input label={w.close} type="date" value={p.close} readOnly={locked} onChange={(e) => upd({ close: e.target.value })} error={badDates ? w.badDates : null} />
          </div>
          <h3 className="ns-subhead">{w.gradeDist}</h3>
          {locked ? <PeriodWeightReadonly items={p.items} /> : <PeriodWeightEditor items={p.items} onChange={(items) => upd({ items })} />}
          {locked ? null : (
            <div className="ns-reg-actions">
              <span />
              <Button icon="check" disabled={total !== 100 || badDates} loading={saveMut.isPending || purging} onClick={() => {
                // Cerrar el periodo borra sus fotos de exámenes (decisión de Diego); las notas se conservan.
                const closing = p.status === "closed" && stored?.status !== "closed";
                saveMut.mutateAsync(p).then(
                  async () => {
                    if (!closing || DEMO) return showToast({ tone: "success", title: w.saved, message: pn(p.name) + " · " + p.items.map((x) => x.weight + "% " + x.name).join(" · ") });
                    await purge(p.id, true);
                  },
                  (e) => showToast({ tone: "error", title: w.saveError, message: adminMessage(e, t) }),
                );
              }}>{w.save}</Button>
            </div>
          )}
        </Block>
      </div>
      <InstitutionGoal onSaved={(ok, text) => showToast(ok ? { tone: "success", title: w.goalOk, message: text } : { tone: "error", title: w.goalFail, message: text })} />
      {toastNode}
    </>
  );
}
