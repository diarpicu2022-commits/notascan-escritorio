import { createElement, type ReactNode } from "react";
import { Badge } from "../components/atoms/Badge";
import { Button } from "../components/atoms/Button";
import { Divider, IconAction, ProgressBar, SegmentedTabs } from "../components/atoms/Controls";
import { Checkbox, Input, Select, Textarea } from "../components/atoms/Field";
import { StatusDot } from "../components/atoms/StatusDot";
import { Sticker } from "../components/atoms/Sticker";
import { Switch } from "../components/atoms/Switch";
import { ImportFileZone, UploadZone } from "../components/molecules/DropZones";
import { FilterGroup, FiltersBar, SearchField } from "../components/molecules/Filters";
import { BarChart, DonutChart, LineChart } from "../components/organisms/Charts";
import { DataGrid, DataTable } from "../components/organisms/DataGrid";
import { EmptyState } from "../components/organisms/EmptyState";
import { ConfirmDialog, Drawer, Modal, PasswordResetDialog } from "../components/organisms/Overlays";
import { Marquee, ProcessingPanel, ReviewStepper, ReviewSummary } from "../components/organisms/ReviewFlow";
import { Toast } from "../components/organisms/Toast";
import { buildSpecs } from "./specs.js";

/** Mismo nombre que en window.NotaScan para que specs.js funcione en ambos lados. */
const C = {
  Badge, Button, Divider, IconAction, ProgressBar, SegmentedTabs, Checkbox, Input, Select, Textarea, StatusDot, Sticker, Switch,
  ImportFileZone, UploadZone, FilterGroup, FiltersBar, SearchField, BarChart, DonutChart, LineChart, DataGrid, DataTable, EmptyState,
  ConfirmDialog, Drawer, Modal, PasswordResetDialog, Marquee, ProcessingPanel, ReviewStepper, ReviewSummary, Toast,
};

/** Vista temporal del paso 4: cada componente de infraestructura con datos reales del dominio. */
export function ComponentsCheck() {
  const specs = buildSpecs(createElement, C) as Array<[string, ReactNode]>;
  return (
    <main className="ns ns-canvas" style={{ minHeight: "100vh", padding: "var(--space-7)" }}>
      <p className="ns-overline">Paso 4 · Infraestructura</p>
      <h1 className="ns-serif" style={{ font: "800 40px/44px var(--font-display)", margin: "var(--space-2) 0 var(--space-7)" }}>Componentes compartidos</h1>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "var(--space-6)", maxWidth: 1100 }}>
        {specs.map(([name, el]) => (
          <section key={name} data-spec={name} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "var(--space-3)" }}>
            <span className="ns-overline">{name}</span>
            <div data-spec-body>{el}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
