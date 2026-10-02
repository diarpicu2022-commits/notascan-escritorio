import { useState } from "react";
import { cx } from "../../../lib/cx";
import { PERIOD_SETUP } from "../../../data/academic";
import { Badge, type BadgeTone } from "../../atoms/Badge";
import { Button } from "../../atoms/Button";
import { IconAction } from "../../atoms/Controls";
import { Input, Select } from "../../atoms/Field";
import { Icon, type IconName } from "../../atoms/Icon";
import { Block, BlockTitle } from "../Layout";
import { useToast } from "../Toast";

export interface WeightItem { name: string; weight: number }

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

type PeriodStatus = "closed" | "open" | "draft";
interface Period { id: string; name: string; open: string; close: string; status: PeriodStatus; items: WeightItem[] }
const BASE_ITEMS = () => [{ name: "Actividades", weight: 40 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }];
const PST: Record<PeriodStatus, [string, BadgeTone, IconName]> = { closed: ["Cerrado", "neutral", "lock"], open: ["Abierto", "verified", "check"], draft: ["Borrador", "pending", "clock"] };

/** Periodos del año, su peso en la nota final y cómo se compone la nota de cada uno. */
export function PeriodConfigurator() {
  const [periods, setPeriods] = useState<Period[]>([
    { id: "p1", name: "Periodo 1", open: "2026-01-26", close: "2026-04-03", status: "closed", items: BASE_ITEMS() },
    { id: "p2", name: "Periodo 2", open: "2026-04-13", close: "2026-06-19", status: "closed", items: BASE_ITEMS() },
    { id: "p3", name: "Periodo 3", open: "2026-07-13", close: "2026-10-15", status: "open", items: BASE_ITEMS() },
    { id: "p4", name: "Periodo 4", open: "2026-10-19", close: "2026-11-27", status: "draft", items: [{ name: "Actividades", weight: 35 }, { name: "Exámenes", weight: 30 }, { name: "Talleres", weight: 20 }, { name: "Actitudinal", weight: 10 }] },
  ]);
  const [sel, setSel] = useState("p4");
  const [showToast, toastNode] = useToast();
  const [pw, setPw] = useState<WeightItem[]>(() => PERIOD_SETUP.names.map((n, i) => ({ name: n, weight: PERIOD_SETUP.weights[i] })));
  const pwTotal = pw.reduce((a, x) => a + (Number(x.weight) || 0), 0);
  const p = periods.find((x) => x.id === sel)!;
  const total = p.items.reduce((a, x) => a + (Number(x.weight) || 0), 0);
  const badDates = !!p.open && !!p.close && p.close <= p.open;
  const upd = (patch: Partial<Period>) => setPeriods(periods.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  const locked = p.status === "closed";

  return (
    <>
      <Block tone="gold" label="Peso de cada periodo en la nota final">
        <BlockTitle action={
          <Button size="sm" icon="check" disabled={pwTotal !== 100} onClick={() => {
            // Como el sistema: los boletines leen estos pesos para el acumulado.
            PERIOD_SETUP.names = pw.map((x) => x.name);
            PERIOD_SETUP.weights = pw.map((x) => Number(x.weight) || 0);
            showToast({ tone: "success", title: "Pesos de los periodos guardados", message: "Los boletines calcularán el acumulado con " + pw.map((x) => x.weight + "%").join(" · ") + "." });
          }}>Guardar pesos</Button>
        }>Periodos del año y su peso en la nota final</BlockTitle>
        <p className="ns-caption" style={{ margin: 0 }}>Cada boletín muestra la nota del periodo, las notas de los periodos anteriores y el acumulado ponderado con estos pesos.</p>
        <PeriodWeightEditor items={pw} onChange={setPw} addLabel="Agregar periodo" newName={"Periodo " + (pw.length + 1)} />
      </Block>
      <div className="ns-period">
        <div className="ns-period-list" role="tablist" aria-label="Periodos del año lectivo 2026" aria-orientation="vertical">
          {periods.map((x) => {
            const s = PST[x.status];
            return (
              <button key={x.id} type="button" role="tab" aria-selected={x.id === sel} className="ns-period-item" onClick={() => setSel(x.id)}>
                <strong>{x.name}</strong>
                <span className="ns-caption">{x.open.split("-").reverse().slice(0, 2).join("/") + " – " + x.close.split("-").reverse().slice(0, 2).join("/")}</span>
                <Badge tone={s[1]} icon={s[2]}>{s[0]}</Badge>
              </button>
            );
          })}
        </div>
        <Block className="ns-period-editor">
          <BlockTitle action={<Badge tone={PST[p.status][1]} icon={PST[p.status][2]}>{PST[p.status][0]}</Badge>}>{p.name + " · 2026"}</BlockTitle>
          {locked ? <p className="ns-sensitive"><Icon name="lock" size={16} />Este periodo está cerrado. Sus porcentajes se conservan como parte del historial.</p> : null}
          <div className="ns-form-grid">
            <Select label="Año lectivo" value="2026" options={["2026"]} disabled={locked} />
            <Select label="Estado" value={p.status} onChange={(v) => upd({ status: v as PeriodStatus })} options={[{ value: "draft", label: "Borrador" }, { value: "open", label: "Abierto" }, { value: "closed", label: "Cerrado" }]} />
            <Input label="Fecha de apertura" type="date" value={p.open} readOnly={locked} onChange={(e) => upd({ open: e.target.value })} />
            <Input label="Fecha de cierre" type="date" value={p.close} readOnly={locked} onChange={(e) => upd({ close: e.target.value })} error={badDates ? "La fecha de cierre debe ser posterior a la apertura." : null} />
          </div>
          <h3 className="ns-subhead">Distribución de la nota</h3>
          {locked ? <PeriodWeightReadonly items={p.items} /> : <PeriodWeightEditor items={p.items} onChange={(items) => upd({ items })} />}
          {locked ? null : (
            <div className="ns-reg-actions">
              <span />
              <Button icon="check" disabled={total !== 100 || badDates} onClick={() => showToast({ tone: "success", title: "Periodo guardado", message: p.name + " · " + p.items.map((x) => x.weight + "% " + x.name).join(" · ") })}>Guardar periodo</Button>
            </div>
          )}
        </Block>
      </div>
      {toastNode}
    </>
  );
}
