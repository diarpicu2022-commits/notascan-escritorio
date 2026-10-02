# Implementación en React + Tailwind

La app de escritorio (Tauri + React + TypeScript + Tailwind + Framer Motion) consume este sistema así:

## Tokens como fuente única

Exporta los tokens a variables CSS (`tokens.css` de este sistema) y referéncialos desde `tailwind.config.ts`. Nunca escribas `bg-[#B8924B]`.

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        navy: "var(--navy)", gold: "var(--gold)", "gold-ink": "var(--gold-ink)", "gold-soft": "var(--gold-soft)",
        ivory: "var(--ivory)", "ivory-deep": "var(--ivory-deep)", paper: "var(--paper)",
        charcoal: "var(--charcoal)", muted: "var(--muted)",
        sage: "var(--sage)", "sage-ink": "var(--sage-ink)", "sage-soft": "var(--sage-soft)",
        burgundy: "var(--burgundy)", "burgundy-soft": "var(--burgundy-soft)",
      },
      fontFamily: { display: "var(--font-display)", ui: "var(--font-ui)" },
      borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)" },
      boxShadow: { sm: "var(--shadow-sm)", brutal: "var(--shadow-md)", "brutal-lg": "var(--shadow-lg)", glass: "var(--shadow-glass)" },
      borderWidth: { DEFAULT: "2px" },
    },
  },
};
```

## Estructura

```text
src/
├── components/{atoms,molecules,organisms,templates}/   ← un archivo por componente de este sistema
├── pages/        Dashboard · GradeReview · Students · Evaluations · Reports · DesignSystem
├── data/         mocks (MOCK_ROWS)
├── hooks/        useCountUp · useGradeReview
├── lib/          validateGrade · confidenceLevel · formatGrade
├── types/        Student · Grade · Evaluation · Teacher · ConfidenceScore · ReviewStatus (ver index.d.ts)
└── styles/       tokens.css
```

## Framer Motion

- Entrada de tarjeta: `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}` con `transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}`.
- Sello: `initial={{ scale: 1.8, rotate: -24, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }}` con `ease: [0.34, 1.56, 0.64, 1]`.
- Modal: opacidad + `scale: 0.96 → 1`.
- Entradas escalonadas: `variants` con `staggerChildren: 0.06` en el contenedor de la página y en grids de bloques.
- Ambiente (login, marca, stickers): `animate={{ y: [0, -10, 0] }}` con `transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}`; nunca en tablas ni formularios.
- Cifras: `CountUp` (o `useCountUp`) en KPIs, bento y resúmenes.
- Envuelve la app en `<MotionConfig reducedMotion="user">`.

## Regla de oro

Si un patrón aparece dos veces, es un componente. `<StudentGradeCard student={s} />`, nunca `CardStudent1`.
