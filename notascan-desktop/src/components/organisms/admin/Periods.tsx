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

export type { WeightItem };

/** Componentes de la nota con su porcentaje; avisa si no suman 100 %. */
export function PeriodWeightEditor({ items, onChange, addLabel, newName }: { items: WeightItem[]; onChange: (items: WeightItem[]) => void; addLabel?: string; newName?: string }) {
  const total = items.reduce((a, x) => a + (Number(x.weight) || 0), 0), ok = total === 100;
  const set = (i: number, patch: Partial<WeightItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="ns-weights">
      <div className="ns-weight-bar ns-weight-bar--edit" role="img" aria-label={"Distribución: " + items.map((x) => x.name + " " + x.weight + "%").join(", ")}>
        {items.map((x, i) => (Number(x.weight) > 0 ? <span key={i} className={"ns-weight-seg ns-weight-seg--t" + (i % 5)} style={{ flex: Number(x.weight) }}>{x.weight + "%"}</span> : null))}
        {total < 100 ? <span className="ns-weight-seg ns-weight-seg--empty" style={{ flex: 100 - total }}>{"Falta " + (100 - total) + "%"}</span> : null}
      </div>
      <ul className="ns-weight-list">
        {items.map((x, i) => (
          <li key={i} className="ns-weight-row">
            <i className={"ns-swatch-dot ns-weight-dot--t" + (i % 5)} aria-hidden />
            <Input label="Componente" hideLabel value={x.name} onChange={(e) => set(i, { name: e.target.value })} aria-label={"Nombre del componente " + (i + 1)} />
            <input type="range" min={0} max={100} step={5} value={x.weight} aria-label={"Porcentaje de " + x.name} className="ns-range" onChange={(e) => set(i, { weight: Number(e.target.value) })} />
            <div className="ns-pct-input">
              <input type="number" min={0} max={100} value={x.weight} aria-label={"Porcentaje de " + x.name + " en números"} onChange={(e) => set(i, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
              <span>%</span>
            </div>
            <IconAction icon="trash" tone="danger" label={"Quitar " + x.name} disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      <div className="ns-weight-foot">
        <Button variant="ghost" size="sm" icon="plus" onClick={() => onChange(items.concat([{ name: newName || "Nuevo componente", weight: 0 }]))}>{addLabel || "Agregar componente"}</Button>
        <div className={cx("ns-weight-total", ok ? "is-ok" : "is-bad")} role="status">
          <span className="ns-overline">Total configurado</span>
          <strong>{total + "%"}</strong>
          <span><Icon name={ok ? "check" : "warning"} size={16} />{ok ? "Distribución completa" : "La distribución de porcentajes debe sumar 100%."}</span>
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

const PST: Record<PeriodStatus, [string, BadgeTone, IconName]> = { closed: ["Cerrado", "neutral", "lock"], open: ["Abierto", "verified", "check"], draft: ["Borrador", "pending", "clock"] };

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
  return (
    <Block label="Meta institucional">
      <BlockTitle action={
        <Button size="sm" icon="check" disabled={bad || Math.round(n * 10) / 10 === stored} loading={save.isPending} onClick={() => {
          const goal = Math.round(n * 10) / 10;
          save.mutateAsync(goal).then(() => onSaved(true, "Rectoría verá " + goal.toFixed(1) + " como referencia en la analítica."), (e) => onSaved(false, adminMessage(e)));
        }}>Guardar meta</Button>
      }>Meta institucional</BlockTitle>
      <div className="ns-form-grid">
        <Input label="Promedio esperado por grado" type="number" inputMode="decimal" min={1} max={5} step={0.1} value={v} onChange={(e) => setV(e.target.value)}
          hint="Entre 1.0 y 5.0. Los grados por debajo se resaltan en la analítica de Rectoría." error={bad ? "Escribe un valor entre 1.0 y 5.0." : null} />
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
  const pwTotal = pw.reduce((a, x) => a + (Number(x.weight) || 0), 0);
  const p = periods.find((x) => x.id === sel);

  if (q.isPending && !q.data) return <LoadingBlocks label="Cargando los periodos" />;
  if (q.isError && !q.data) return <ErrorState title="No pudimos cargar los periodos." onRetry={() => q.refetch()} />;
  if (!p) return <EmptyState icon="calendar" title="Aún no hay periodos en el año lectivo." message="Usa «Crear periodo» para preparar el primero." />;

  const total = p.items.reduce((a, x) => a + (Number(x.weight) || 0), 0);
  const badDates = !!p.open && !!p.close && p.close <= p.open;
  const upd = (patch: Partial<Period>) => setPeriods(periods.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  // Lo cerrado en la base manda: un periodo cerrado no se edita aunque se cambie el selector de estado en pantalla.
  const stored = q.data?.periods.find((x) => x.id === p.id);
  const locked = (stored ?? p).status === "closed" && p.status === "closed";

  return (
    <>
      <Block tone="gold" label="Peso de cada periodo en la nota final">
        <BlockTitle action={
          <Button size="sm" icon="check" disabled={pwTotal !== 100} loading={weightsMut.isPending} onClick={() => {
            weightsMut.mutateAsync({ periods, weights: pw }).then(
              () => showToast({ tone: "success", title: "Pesos de los periodos guardados", message: "Los boletines calcularán el acumulado con " + pw.map((x) => x.weight + "%").join(" · ") + "." }),
              (e) => showToast({ tone: "error", title: "No pudimos guardar los pesos", message: e instanceof Error && !("code" in e) ? e.message : adminMessage(e) }),
            );
          }}>Guardar pesos</Button>
        }>Periodos del año y su peso en la nota final</BlockTitle>
        <p className="ns-caption" style={{ margin: 0 }}>Cada boletín muestra la nota del periodo, las notas de los periodos anteriores y el acumulado ponderado con estos pesos.</p>
        <PeriodWeightEditor items={pw} onChange={setPw} addLabel="Agregar periodo" newName={"Periodo " + (pw.length + 1)} />
      </Block>
      <div className="ns-period">
        <div className="ns-period-list" role="tablist" aria-label={"Periodos del año lectivo " + p.year} aria-orientation="vertical">
          {periods.map((x) => {
            const st = PST[x.status];
            return (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === sel} className="ns-period-item" onClick={() => setSel(x.id)}>
                <strong>{x.name}</strong>
                <span className="ns-caption">{x.open.split("-").reverse().slice(0, 2).join("/") + " – " + x.close.split("-").reverse().slice(0, 2).join("/")}</span>
                <Badge tone={st[1]} icon={st[2]}>{st[0]}</Badge>
              </button>
            );
          })}
        </div>
        <Block className="ns-period-editor">
          <BlockTitle action={<Badge tone={PST[p.status][1]} icon={PST[p.status][2]}>{PST[p.status][0]}</Badge>}>{p.name + " · " + p.year}</BlockTitle>
          {locked ? <p className="ns-sensitive"><Icon name="lock" size={16} />Este periodo está cerrado. Sus porcentajes se conservan como parte del historial.</p> : null}
          <div className="ns-form-grid">
            <Select label="Año lectivo" value={String(p.year)} options={[String(p.year)]} disabled={locked} />
            <Select label="Estado" value={p.status} onChange={(v) => upd({ status: v as PeriodStatus })} options={[{ value: "draft", label: "Borrador" }, { value: "open", label: "Abierto" }, { value: "closed", label: "Cerrado" }]} />
            <Input label="Fecha de apertura" type="date" value={p.open} readOnly={locked} onChange={(e) => upd({ open: e.target.value })} />
            <Input label="Fecha de cierre" type="date" value={p.close} readOnly={locked} onChange={(e) => upd({ close: e.target.value })} error={badDates ? "La fecha de cierre debe ser posterior a la apertura." : null} />
          </div>
          <h3 className="ns-subhead">Distribución de la nota</h3>
          {locked ? <PeriodWeightReadonly items={p.items} /> : <PeriodWeightEditor items={p.items} onChange={(items) => upd({ items })} />}
          {locked ? null : (
            <div className="ns-reg-actions">
              <span />
              <Button icon="check" disabled={total !== 100 || badDates} loading={saveMut.isPending} onClick={() => saveMut.mutateAsync(p).then(
                () => showToast({ tone: "success", title: "Periodo guardado", message: p.name + " · " + p.items.map((x) => x.weight + "% " + x.name).join(" · ") }),
                (e) => showToast({ tone: "error", title: "No pudimos guardar el periodo", message: adminMessage(e) }),
              )}>Guardar periodo</Button>
            </div>
          )}
        </Block>
      </div>
      <InstitutionGoal onSaved={(ok, text) => showToast(ok ? { tone: "success", title: "Meta institucional guardada", message: text } : { tone: "error", title: "No pudimos guardar la meta", message: text })} />
      {toastNode}
    </>
  );
}
