import { StudentGradeCard, StudentGradeCardSkeleton } from "../components/organisms/StudentGradeCard";
import { REVIEW_ROWS } from "../data/reviewRows";

/**
 * Vista temporal del paso 2: la tarjeta en cada estado del sistema.
 * Orden: verificada · requiere revisión · alta · media · sin detección · carga.
 */
export function CardCheck() {
  // #/dev/card-static: sin count-up, para comparar píxel a píxel con la referencia del sistema.
  const animate = location.hash !== "#/dev/card-static";
  (window as unknown as { __REVIEW_ROWS__: unknown }).__REVIEW_ROWS__ = REVIEW_ROWS;
  const picks = [0, 1, 2, 3, 5].map((i) => REVIEW_ROWS[i]);
  return (
    <main className="ns ns-canvas" style={{ minHeight: "100vh", padding: "var(--space-7)" }}>
      <p className="ns-overline">Paso 2 · Componente clave</p>
      <h1 className="ns-serif" style={{ font: "800 40px/44px var(--font-display)", margin: "var(--space-2) 0 var(--space-7)" }}>
        StudentGradeCard
      </h1>
      <div className="ns-grid">
        {picks.map((r, i) => (
          <StudentGradeCard key={r.student.id} index={i + 1} student={r.student} detected={r.detected} confidence={r.confidence} status={r.status} animate={animate} />
        ))}
        <StudentGradeCardSkeleton />
      </div>
    </main>
  );
}
