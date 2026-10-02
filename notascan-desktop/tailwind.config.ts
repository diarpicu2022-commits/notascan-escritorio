import type { Config } from "tailwindcss";

/**
 * Tailwind solo referencia los tokens de notascan-ui (src/styles/tokens.css).
 * Regla del sistema: nunca valores sueltos como bg-[#B8924B].
 * Preflight desactivado: el reset y la base los pone notascan.css, que manda.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      navy: "var(--navy)", "navy-soft": "var(--navy-soft)",
      gold: "var(--gold)", "gold-ink": "var(--gold-ink)", "gold-soft": "var(--gold-soft)",
      ivory: "var(--ivory)", "ivory-deep": "var(--ivory-deep)", paper: "var(--paper)",
      charcoal: "var(--charcoal)", muted: "var(--muted)", hairline: "var(--hairline)",
      sage: "var(--sage)", "sage-ink": "var(--sage-ink)", "sage-soft": "var(--sage-soft)",
      burgundy: "var(--burgundy)", "burgundy-soft": "var(--burgundy-soft)",
    },
    spacing: {
      0: "0", 1: "var(--space-1)", 2: "var(--space-2)", 3: "var(--space-3)", 4: "var(--space-4)",
      5: "var(--space-5)", 6: "var(--space-6)", 7: "var(--space-7)", 8: "var(--space-8)",
    },
    fontFamily: { display: "var(--font-display)", ui: "var(--font-ui)" },
    borderRadius: { none: "0", sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", full: "var(--radius-full)" },
    boxShadow: { none: "none", sm: "var(--shadow-sm)", brutal: "var(--shadow-md)", "brutal-lg": "var(--shadow-lg)", gold: "var(--shadow-gold)", glass: "var(--shadow-glass)" },
    borderWidth: { DEFAULT: "var(--border-width)", 0: "0", hairline: "var(--border-hairline)" },
    extend: {},
  },
  plugins: [],
} satisfies Config;
