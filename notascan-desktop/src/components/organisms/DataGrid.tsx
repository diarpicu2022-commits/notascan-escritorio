import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Button } from "../atoms/Button";
import { IconAction, SegmentedTabs } from "../atoms/Controls";
import { Checkbox } from "../atoms/Field";
import { Icon, type IconName } from "../atoms/Icon";
import { EmptyState } from "./EmptyState";

export interface TableColumn<R> {
  key: string;
  label: ReactNode;
  numeric?: boolean;
  render?: (r: R) => ReactNode;
}

/** Tabla simple para listas cortas y de solo lectura. */
export function DataTable<R extends Record<string, unknown>>({ caption, columns, rows, className }: { caption: string; columns: TableColumn<R>[]; rows: R[]; className?: string }) {
  return (
    <div className={cx("ns-table-wrap", className)} role="region" aria-label={caption} tabIndex={0}>
      <table className="ns-table">
        <caption className="ns-sr">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.numeric ? "is-num" : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={(r.id as string) || i}>
              {columns.map((c) => <td key={c.key} className={c.numeric ? "is-num" : undefined}>{c.render ? c.render(r) : (r[c.key] as ReactNode)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface GridColumn<R> extends TableColumn<R> {
  sortable?: boolean;
  sortValue?: (r: R) => number | string;
  width?: number | string;
  /** La celda es la cabecera de su fila (th scope="row"). */
  header?: boolean;
  className?: string;
}

type Sort = { key: string; dir: "asc" | "desc" } | null;

export interface DataGridProps<R> {
  caption: string;
  columns: GridColumn<R>[];
  rows: R[];
  rowKey?: (r: R) => string;
  initialSort?: Sort;
  pageSize?: number;
  paginate?: boolean;
  density?: "comfortable" | "compact";
  densityToggle?: boolean;
  toolbar?: ReactNode;
  selectable?: boolean;
  bulkActions?: (selected: R[], clear: () => void) => ReactNode;
  rowActions?: (r: R) => ReactNode;
  rowClass?: (r: R) => string | undefined;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyIcon?: IconName;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  resetKey?: unknown;
  className?: string;
}

/**
 * La infraestructura de tablas del sistema: ordenar, paginar, seleccionar, acciones en lote,
 * densidad y estados de carga, error y vacío. Toda tabla administrativa usa este componente.
 */
export function DataGrid<R extends object>(props: DataGridProps<R>) {
  const [sort, setSort] = useState<Sort>(props.initialSort || null);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Record<string, true>>({});
  const [density, setDensity] = useState(props.density || "comfortable");
  const size = props.pageSize || 10;
  const rk = props.rowKey || ((r: R) => (r as { id: string }).id);
  const rows = props.rows || [];
  useEffect(() => { setPage(0); }, [rows.length, props.resetKey]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = props.columns.find((c) => c.key === sort.key);
    const get = col && col.sortValue ? col.sortValue : (r: R) => (r as Record<string, unknown>)[sort.key] as number | string;
    return rows.slice().sort((a, b) => {
      let x = get(a), y = get(b);
      if (typeof x === "number" && typeof y === "number") {
        x = isNaN(x) ? -1e9 : x; y = isNaN(y) ? -1e9 : y;
        return (x - y) * (sort.dir === "asc" ? 1 : -1);
      }
      return String(x).localeCompare(String(y), "es") * (sort.dir === "asc" ? 1 : -1);
    });
    // Igual que el sistema: se recalcula con filas y orden.
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const p = Math.min(page, pages - 1);
  const view = props.paginate === false ? sorted : sorted.slice(p * size, p * size + size);
  const selected = rows.filter((r) => sel[rk(r)]);
  const allOnPage = view.length > 0 && view.every((r) => sel[rk(r)]);
  const someOnPage = view.some((r) => sel[rk(r)]);
  function toggleAll(v: boolean) { const n = { ...sel }; view.forEach((r) => { if (v) n[rk(r)] = true; else delete n[rk(r)]; }); setSel(n); }
  function toggle(r: R, v: boolean) { const n = { ...sel }; if (v) n[rk(r)] = true; else delete n[rk(r)]; setSel(n); }
  function clickSort(c: GridColumn<R>) {
    if (!c.sortable) return;
    setSort(!sort || sort.key !== c.key ? { key: c.key, dir: c.numeric ? "desc" : "asc" } : { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" });
  }

  const cols = props.columns.length + (props.selectable ? 1 : 0) + (props.rowActions ? 1 : 0);
  let body: ReactNode;
  if (props.loading) {
    body = [0, 1, 2, 3, 4].map((i) => (
      <tr key={i} aria-hidden>
        {Array.from({ length: cols }, (_, j) => <td key={j}><span className="ns-skel" style={{ display: "block", height: 14, width: j === 0 ? "70%" : "50%" }} /></td>)}
      </tr>
    ));
  } else if (props.error) {
    body = (
      <tr><td colSpan={cols} className="ns-grid-state">
        <EmptyState tone="error" title={props.error} message="Revisa tu conexión e inténtalo de nuevo."
          action={props.onRetry ? <Button variant="secondary" icon="refresh" onClick={props.onRetry}>Reintentar</Button> : null} />
      </td></tr>
    );
  } else if (!view.length) {
    body = (
      <tr><td colSpan={cols} className="ns-grid-state">
        <EmptyState icon={props.emptyIcon || "search"} title={props.emptyTitle || "No hay resultados para esta búsqueda."} message={props.emptyMessage} action={props.emptyAction} />
      </td></tr>
    );
  } else {
    body = view.map((r) => {
      const key = rk(r), on = !!sel[key];
      const name = (r as { name?: string }).name;
      return (
        <tr key={key} className={cx(on && "is-selected", props.rowClass?.(r))}>
          {props.selectable ? <td className="ns-grid-check"><Checkbox hideLabel label={"Seleccionar " + (name || key)} checked={on} onChange={(v) => toggle(r, v)} /></td> : null}
          {props.columns.map((c) => {
            const Cell = c.header ? "th" : "td";
            return <Cell key={c.key} scope={c.header ? "row" : undefined} className={cx(c.numeric && "is-num", c.className)}>{c.render ? c.render(r) : ((r as Record<string, unknown>)[c.key] as ReactNode)}</Cell>;
          })}
          {props.rowActions ? <td className="ns-grid-actions"><div>{props.rowActions(r)}</div></td> : null}
        </tr>
      );
    });
  }

  return (
    <div className={cx("ns-grid-wrap", "ns-grid--" + density, props.className)}>
      {props.toolbar || props.densityToggle ? (
        <div className="ns-grid-toolbar">
          <div className="ns-grid-toolbar-main">{props.toolbar}</div>
          {props.densityToggle ? (
            <SegmentedTabs label="Densidad de la tabla" value={density} onChange={(v) => setDensity(v as "comfortable" | "compact")}
              tabs={[{ value: "comfortable", label: "Cómoda" }, { value: "compact", label: "Compacta" }]} />
          ) : null}
        </div>
      ) : null}
      {props.selectable && selected.length ? (
        <div className="ns-bulkbar" role="region" aria-label="Acciones en lote">
          <strong>{selected.length + (selected.length === 1 ? " seleccionado" : " seleccionados")}</strong>
          <div className="ns-bulkbar-actions">{props.bulkActions ? props.bulkActions(selected, () => setSel({})) : null}</div>
          <Button variant="ghost" size="sm" onClick={() => setSel({})}>Limpiar selección</Button>
        </div>
      ) : null}
      <div className="ns-table-wrap ns-grid-table" role="region" aria-label={props.caption} tabIndex={0}>
        <table className="ns-table">
          <caption className="ns-sr">{props.caption}</caption>
          <thead>
            <tr>
              {props.selectable ? (
                <th className="ns-grid-check" scope="col">
                  <Checkbox hideLabel label="Seleccionar todos en esta página" checked={allOnPage} indeterminate={someOnPage && !allOnPage} onChange={toggleAll} />
                </th>
              ) : null}
              {props.columns.map((c) => {
                const active = !!sort && sort.key === c.key;
                return (
                  <th key={c.key} scope="col" className={cx(c.numeric && "is-num")} style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sortable ? "none" : undefined}>
                    {c.sortable ? (
                      <button type="button" className={cx("ns-sort", active && "is-active")} onClick={() => clickSort(c)}>
                        {c.label}<Icon name={active ? (sort!.dir === "asc" ? "sortup" : "sortdown") : "sort"} size={14} />
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
              {props.rowActions ? <th scope="col" className="is-num">Acciones</th> : null}
            </tr>
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>
      {props.paginate === false || props.loading || props.error || !sorted.length ? null : (
        <nav className="ns-pager" aria-label="Paginación">
          <span className="ns-caption">{"Mostrando " + (p * size + 1) + "–" + Math.min(sorted.length, p * size + size) + " de " + sorted.length}</span>
          <div className="ns-pager-btns">
            <IconAction icon="chevleft" label="Página anterior" disabled={p === 0} onClick={() => setPage(p - 1)} />
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} type="button" className={cx("ns-pager-num", i === p && "is-on")} aria-current={i === p ? "page" : undefined} aria-label={"Página " + (i + 1)} onClick={() => setPage(i)}>{i + 1}</button>
            ))}
            <IconAction icon="chevright" label="Página siguiente" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} />
          </div>
        </nav>
      )}
    </div>
  );
}
