import { useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "../../lib/cx";

/* Gráficos SVG accesibles del sistema. Paleta: navy (serie principal) + gold (comparación o meta,
   con borde y etiqueta). Cada gráfico lleva la pregunta que responde y una tabla oculta para
   lectores de pantalla. */

type ChartTone = "navy" | "gold" | "sage";
type Fmt = (v: number) => ReactNode;
const id: Fmt = (v) => v;

function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="ns-sr">
      <caption>{caption}</caption>
      <thead><tr>{head.map((x) => <th key={x} scope="col">{x}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j ? <td key={j}>{c}</td> : <th key={j} scope="row">{c}</th>))}</tr>)}</tbody>
    </table>
  );
}

function ChartFrame({ title, subtitle, legend, className, children }: { title: string; subtitle?: string; legend?: { label: string; tone: ChartTone }[] | null; className?: string; children?: ReactNode }) {
  return (
    <figure className={cx("ns-chart", className)}>
      <figcaption className="ns-chart-head"><strong>{title}</strong>{subtitle ? <span className="ns-caption">{subtitle}</span> : null}</figcaption>
      {legend ? <div className="ns-chart-legend">{legend.map((l) => <span key={l.label}><i className={"ns-swatch-dot ns-swatch-dot--" + l.tone} />{l.label}</span>)}</div> : null}
      {children}
    </figure>
  );
}

export interface BarDatum { label: string; value: number; note?: string }

interface BarChartProps {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  width?: number;
  height?: number;
  max?: number;
  ticks?: number[];
  format?: Fmt;
  target?: number;
  targetLabel?: string;
  seriesLabel?: string;
  lowBelow?: number;
}

export function BarChart({ title, subtitle, data, width: W = 560, height: H = 240, max: maxProp, ticks: ticksProp, format: fmt = id, target, targetLabel, seriesLabel, lowBelow }: BarChartProps) {
  const [tip, setTip] = useState<number | null>(null);
  const pad = { l: 36, r: 12, t: 28, b: 34 };
  const max = maxProp || Math.max(...data.map((d) => d.value)) * 1.15;
  const bw = (W - pad.l - pad.r) / data.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = ticksProp || [0, max / 2, max];
  return (
    <ChartFrame title={title} subtitle={subtitle} legend={target !== undefined ? [{ label: seriesLabel || "Valor", tone: "navy" }, { label: (targetLabel || "Meta") + " " + fmt(target), tone: "gold" }] : null}>
      <div className="ns-chart-body">
        <svg viewBox={"0 0 " + W + " " + H} role="img" aria-label={title + ". " + data.map((d) => d.label + ": " + fmt(d.value)).join(", ")}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="ns-grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
              <text className="ns-axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">{fmt(Math.round(t * 10) / 10)}</text>
            </g>
          ))}
          {target !== undefined ? <g><line className="ns-target-line" x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} /></g> : null}
          {data.map((d, i) => {
            const x = pad.l + i * bw + bw * 0.2, w = bw * 0.6, yy = y(d.value);
            const low = lowBelow !== undefined && d.value < lowBelow;
            return (
              <g key={d.label} className="ns-bar-g" onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}>
                <rect className="ns-bar-hit" x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} />
                <path className={cx("ns-bar", low && "ns-bar--low")} style={{ "--i": i } as CSSProperties}
                  d={"M" + x + " " + (H - pad.b) + "V" + (yy + 4) + "q0-4 4-4h" + (w - 8) + "q4 0 4 4V" + (H - pad.b) + "Z"} />
                <text className="ns-bar-val" x={x + w / 2} y={yy - 7} textAnchor="middle">{fmt(d.value)}</text>
                <text className="ns-axis" x={x + w / 2} y={H - pad.b + 18} textAnchor="middle">{d.label}</text>
              </g>
            );
          })}
          <line className="ns-base-line" x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} />
        </svg>
        {tip !== null ? (
          <div className="ns-chart-tip" style={{ left: ((pad.l + tip * bw + bw / 2) / W) * 100 + "%" }}>
            <strong>{data[tip].label}</strong>{" · " + fmt(data[tip].value) + (data[tip].note ? " · " + data[tip].note : "")}
          </div>
        ) : null}
      </div>
      <ChartTable caption={title} head={["Categoría", "Valor"]} rows={data.map((d) => [d.label, fmt(d.value)])} />
    </ChartFrame>
  );
}

export interface LineSeries { name: string; points: number[]; tone?: ChartTone; dashed?: boolean }

interface LineChartProps {
  title: string;
  subtitle?: string;
  labels: string[];
  series: LineSeries[];
  width?: number;
  height?: number;
  min?: number;
  max?: number;
  ticks?: number[];
  format?: Fmt;
  threshold?: number;
  thresholdLabel?: string;
}

export function LineChart({ title, subtitle, labels, series, width, height: H = 240, min = 0, max = 5, ticks: ticksProp, format: fmt = id, threshold, thresholdLabel }: LineChartProps) {
  const [tip, setTip] = useState<number | null>(null);
  const W = width || 560;
  const pad = { l: 36, r: width && width < 400 ? 40 : 64, t: 20, b: 34 };
  const x = (i: number) => pad.l + (W - pad.l - pad.r) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const ticks = ticksProp || [min, (min + max) / 2, max];
  return (
    <ChartFrame title={title} subtitle={subtitle} legend={series.length > 1 ? series.map((s) => ({ label: s.name, tone: s.tone || "navy" })) : null}>
      <div className="ns-chart-body" onMouseLeave={() => setTip(null)}>
        <svg viewBox={"0 0 " + W + " " + H} role="img" aria-label={title + ". " + series.map((s) => s.name + ": " + s.points.map((v, i) => labels[i] + " " + fmt(v)).join(", ")).join(". ")}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="ns-grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
              <text className="ns-axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          {threshold !== undefined ? (
            <g>
              <line className="ns-target-line" x1={pad.l} x2={W - pad.r} y1={y(threshold)} y2={y(threshold)} />
              <text className="ns-axis ns-axis--gold" x={pad.l + 4} y={y(threshold) - 6}>{thresholdLabel || "Mínimo " + fmt(threshold)}</text>
            </g>
          ) : null}
          {tip !== null ? <line className="ns-crosshair" x1={x(tip)} x2={x(tip)} y1={pad.t} y2={H - pad.b} /> : null}
          {series.map((s) => {
            const d = s.points.map((v, i) => (i ? "L" : "M") + x(i) + " " + y(v)).join("");
            const last = s.points.length - 1;
            return (
              <g key={s.name} className={"ns-line-g ns-line-g--" + (s.tone || "navy")}>
                <path className={cx("ns-line", s.dashed && "is-dashed")} pathLength={s.dashed ? undefined : 1} d={d} />
                {s.points.map((v, i) => <circle key={i} className="ns-dot-mark" cx={x(i)} cy={y(v)} r={tip === i ? 6 : 4.5} />)}
                <text className="ns-line-label" x={x(last) + 10} y={y(s.points[last]) + 4}>{fmt(s.points[last])}</text>
              </g>
            );
          })}
          {labels.map((l, i) => (
            <g key={l}>
              <text className="ns-axis" x={x(i)} y={H - pad.b + 18} textAnchor="middle">{l}</text>
              <rect className="ns-bar-hit" x={x(i) - (W - pad.l - pad.r) / labels.length / 2} y={pad.t} width={(W - pad.l - pad.r) / labels.length} height={H - pad.t - pad.b} onMouseEnter={() => setTip(i)} />
            </g>
          ))}
        </svg>
        {tip !== null ? (
          <div className="ns-chart-tip" style={{ left: (x(tip) / W) * 100 + "%" }}>
            <strong>{labels[tip]}</strong>
            {series.map((s) => <span key={s.name}>{" · " + (series.length > 1 ? s.name + " " : "") + fmt(s.points[tip])}</span>)}
          </div>
        ) : null}
      </div>
      <ChartTable caption={title} head={["Serie", ...labels]} rows={series.map((s) => [s.name, ...s.points.map(fmt)])} />
    </ChartFrame>
  );
}

export interface DonutDatum { label: string; value: number; tone: ChartTone }

export function DonutChart({ title, subtitle, data, centerValue, centerLabel }: { title: string; subtitle?: string; data: DonutDatum[]; centerValue?: ReactNode; centerLabel?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0), R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <ChartFrame title={title} subtitle={subtitle} legend={data.map((d) => ({ label: d.label + " · " + Math.round((d.value / total) * 100) + "%", tone: d.tone }))}>
      <div className="ns-donut">
        <svg viewBox="0 0 200 200" role="img" aria-label={title + ". " + data.map((d) => d.label + " " + Math.round((d.value / total) * 100) + "%").join(", ")}>
          {data.map((d) => {
            const len = (d.value / total) * C, gap = data.length > 1 ? 3 : 0;
            const el = <circle key={d.label} className={"ns-donut-seg ns-donut-seg--" + d.tone} cx={100} cy={100} r={R}
              strokeDasharray={Math.max(0, len - gap) + " " + (C - len + gap)} strokeDashoffset={-acc} transform="rotate(-90 100 100)" />;
            acc += len;
            return el;
          })}
          <text className="ns-donut-value" x={100} y={104} textAnchor="middle">{centerValue}</text>
          <text className="ns-donut-label" x={100} y={126} textAnchor="middle">{centerLabel}</text>
        </svg>
      </div>
      <ChartTable caption={title} head={["Categoría", "Cantidad"]} rows={data.map((d) => [d.label, d.value])} />
    </ChartFrame>
  );
}
