import { useCountUp } from "../../hooks/useCountUp";

interface CountUpProps {
  value: string | number;
  animate?: boolean;
}

/** Cifra que cuenta desde 0 al montarse. Conserva decimales, separadores y sufijo ("9%", "3.8", "1.240"). */
export function CountUp({ value, animate = true }: CountUpProps) {
  const raw = String(value);
  const m = raw.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
  const num = m ? parseFloat(m[2].replace(/,/g, "")) : NaN;
  const dec = m && /\.\d+$/.test(m[2]) ? m[2].split(".")[1].length : 0;
  const shown = useCountUp(isNaN(num) ? 0 : num, !isNaN(num) && animate);
  if (!m || isNaN(num)) return <>{raw}</>;
  return (
    <span className="ns-countup" aria-label={raw}>
      <span aria-hidden>{m[1] + shown.toFixed(dec) + m[3]}</span>
    </span>
  );
}
