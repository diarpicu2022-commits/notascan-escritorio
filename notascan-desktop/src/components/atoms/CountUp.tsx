import { useCountUp } from "../../hooks/useCountUp";

interface CountUpProps {
  value: string | number;
  animate?: boolean;
}

/** Cifra que cuenta desde 0 al montarse. Conserva decimales, separadores y sufijo ("9%", "3.8", "1.240"). */
export function CountUp({ value, animate = true }: CountUpProps) {
  const raw = String(value);
  const m = raw.match(/^([^0-9]*)([0-9][0-9.,]*)(.*)$/);
  // Coma decimal (idiomas, paso 3): «3,9» en portugués cuenta hasta 3,9 y no hasta 39. Solo con una coma y sin punto.
  const comma = !!m && /^\d+,\d{1,2}$/.test(m[2]);
  const digits = m ? (comma ? m[2].replace(",", ".") : m[2]) : "";
  const num = m ? parseFloat(digits.replace(/,/g, "")) : NaN;
  const dec = m && /\.\d+$/.test(digits) ? digits.split(".")[1].length : 0;
  const shown = useCountUp(isNaN(num) ? 0 : num, !isNaN(num) && animate);
  if (!m || isNaN(num)) return <>{raw}</>;
  const text = shown.toFixed(dec);
  return (
    <span className="ns-countup" aria-label={raw}>
      <span aria-hidden>{m[1] + (comma ? text.replace(".", ",") : text) + m[3]}</span>
    </span>
  );
}
