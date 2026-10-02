import { useId, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";

interface SearchFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (text: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchField({ value, defaultValue, onChange, placeholder, label, className }: SearchFieldProps) {
  const id = useId();
  return (
    <div className={cx("ns-search", className)} role="search">
      <label htmlFor={id} className="ns-sr">{label || "Buscar"}</label>
      <Icon name="search" size={18} />
      <input id={id} type="search" className="ns-input" placeholder={placeholder || "Buscar estudiante o ID"} value={value} defaultValue={defaultValue} onChange={(e) => onChange?.(e.target.value)} />
      {value ? (
        <Button variant="ghost" size="sm" className="ns-search-clear ns-btn--icon" aria-label="Limpiar búsqueda" onClick={() => onChange?.("")}><Icon name="close" size={16} /></Button>
      ) : null}
    </div>
  );
}

export interface FilterOption { value: string; label: string; count?: number }

export interface FilterGroupProps {
  label: string;
  options: FilterOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  as?: "select";
  className?: string;
}

/** Chips con aria-pressed (o un select compacto con `as="select"`). */
export function FilterGroup({ label, options, value: controlled, defaultValue, onChange, as, className }: FilterGroupProps) {
  const [own, setOwn] = useState(defaultValue || (options[0] && options[0].value));
  const value = controlled !== undefined ? controlled : own;
  function pick(v: string) { if (controlled === undefined) setOwn(v); onChange?.(v); }
  if (as === "select") {
    const id = "flt-" + label.replace(/\W/g, "");
    return (
      <div className="ns-filter">
        <label htmlFor={id} className="ns-filter-legend">{label}</label>
        <select id={id} className="ns-select" value={value} onChange={(e) => pick(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  return (
    <fieldset className={cx("ns-filter", className)}>
      <legend className="ns-filter-legend">{label}</legend>
      {options.map((o) => (
        <button key={o.value} type="button" className="ns-chip" aria-pressed={value === o.value} onClick={() => pick(o.value)}>
          {o.label}{o.count !== undefined ? <span className="ns-chip-count">{o.count}</span> : null}
        </button>
      ))}
    </fieldset>
  );
}

interface FiltersBarProps {
  search?: string;
  onSearch?: (v: string) => void;
  placeholder?: string;
  groups?: FilterGroupProps[];
  count?: ReactNode;
  className?: string;
}

/** Barra de filtros de la página: búsqueda + grupos + recuento anunciado. */
export function FiltersBar({ search, onSearch, placeholder, groups, count, className }: FiltersBarProps) {
  return (
    <div className={cx("ns-filters", className)}>
      <SearchField value={search} onChange={onSearch} placeholder={placeholder} />
      {(groups || []).map((g) => <FilterGroup key={g.label} {...g} />)}
      {count !== undefined ? <span className="ns-filters-count" aria-live="polite">{count}</span> : null}
    </div>
  );
}
