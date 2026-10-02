import tokens from "../styles/tokens.json";

type ColorToken = { name: string; value: string; usage: string };

/**
 * Vista temporal del paso 1: pinta cada token de color de tokens.json con su
 * variable CSS y con su utilidad de Tailwind, para que scripts/verify-tokens.mjs
 * compare las tres fuentes. Solo usa clases del sistema y utilidades mapeadas.
 */
export function TokenCheck() {
  const colors = (tokens as { color: { tokens: ColorToken[] } }).color.tokens;
  return (
    <main className="ns ns-canvas" style={{ minHeight: "100vh", padding: "var(--space-7)" }}>
      <p className="ns-overline">Paso 1 · Tokens</p>
      <h1 className="ns-serif" style={{ font: "800 40px/44px var(--font-display)", margin: "var(--space-2) 0 var(--space-6)" }}>
        Fundamentos de NotaScan.
      </h1>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
        {colors.map((t) => (
          <li key={t.name} data-token={t.name} data-expected={t.value}
              className="bg-paper border border-navy rounded-md" style={{ padding: "var(--space-3)" }}>
            <div data-swatch style={{ height: 48, background: `var(--${t.name})`, borderRadius: "var(--radius-sm)", border: "var(--border-hairline) solid var(--hairline)" }} />
            <p className="ns-num" style={{ margin: "var(--space-2) 0 0", font: "600 14px/20px var(--font-ui)" }}>{t.name}</p>
            <p className="ns-caption" style={{ margin: 0 }}>{t.value}</p>
          </li>
        ))}
      </ul>
      <div data-tw-probe className="bg-gold text-navy shadow-brutal rounded-md p-4 font-display" style={{ marginTop: "var(--space-6)", width: 240 }}>
        Sonda Tailwind
      </div>
    </main>
  );
}
