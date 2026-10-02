import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../lib/cx";

/**
 * Cuenta de 0 a `target` en 600 ms con salida cúbica, como useCountUp del sistema.
 * Con movimiento reducido devuelve el valor final sin contar.
 */
export function useCountUp(target: number, run: boolean): number {
  const [value, setValue] = useState(run && !prefersReducedMotion() ? 0 : target);
  useEffect(() => {
    if (!run || prefersReducedMotion()) { setValue(target); return; }
    let start: number | null = null;
    let raf = 0;
    const dur = 600;
    const tick = (t: number) => {
      if (start === null) start = t;
      const k = Math.min(1, (t - start) / dur);
      setValue(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return value;
}
