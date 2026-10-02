/** Une clases ignorando valores vacíos (equivalente a cx() del sistema). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function prefersReducedMotion(): boolean {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

export function initials(name: string): string {
  const p = String(name || "").trim().split(/\s+/);
  return ((p[0] || "").charAt(0) + (p.length > 2 ? p[2] : p[1] || "").charAt(0)).toUpperCase();
}

export function hashTone(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % 4;
  return n;
}
