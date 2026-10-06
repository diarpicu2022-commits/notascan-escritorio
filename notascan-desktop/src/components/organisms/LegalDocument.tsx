import { Fragment, type ReactNode } from "react";
import { Icon } from "../atoms/Icon";
import policyText from "../../../docs/legal/politica-de-tratamiento-de-datos.md?raw";
import termsText from "../../../docs/legal/terminos-y-condiciones.md?raw";

/*
 * Documentos legales dentro de la app (paso 6g). Se leen de docs/legal/ al compilar: el texto que ve la persona es
 * siempre el mismo del repositorio. Solo se usan piezas del sistema (títulos de bloque, tabla de la hoja, aviso).
 */

export const LEGAL = { policy: policyText, terms: termsText };

/** **negrita** dentro de una línea. */
function inline(text: string): ReactNode {
  const parts = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
}

/** Markdown sencillo de los documentos legales: títulos, párrafos, listas, tablas y la nota de borrador. */
export function LegalDocument({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("# ")) { out.push(<h2 key={i} className="ns-block-h">{l.slice(2)}</h2>); i++; continue; }
    if (l.startsWith("## ")) { out.push(<h3 key={i} className="ns-subhead">{l.slice(3)}</h3>); i++; continue; }
    if (l.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(<p key={"q" + i} className="ns-sensitive"><Icon name="warning" size={16} /><span>{inline(q.join(" "))}</span></p>);
      continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <table key={"t" + i} className="ns-paper-table">
          <thead><tr>{head.map((c, j) => <th key={j} scope="col">{inline(c)}</th>)}</tr></thead>
          <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
        </table>,
      );
      continue;
    }
    if (/^(\d+\.|-)\s/.test(l)) {
      const ordered = /^\d+\./.test(l);
      const items: string[] = [];
      while (i < lines.length && (/^(\d+\.|-)\s/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (/^\s{2,}\S/.test(lines[i]) && items.length) items[items.length - 1] += " " + lines[i].trim();
        else items.push(lines[i].replace(/^(\d+\.|-)\s/, ""));
        i++;
      }
      const L = ordered ? "ol" : "ul";
      out.push(<L key={"l" + i} style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 4 }}>{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</L>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|>|\||\d+\.\s|-\s)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    out.push(<p key={"p" + i} style={{ margin: 0 }}>{inline(para.join(" "))}</p>);
  }
  return <article className="ns-col" style={{ gap: 12 }}>{out}</article>;
}
