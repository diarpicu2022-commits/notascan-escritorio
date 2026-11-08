"""Inventario de textos visibles de NotaScan para los idiomas (2026-11-08).

Recorre src/ y saca los textos que ve una persona: texto entre etiquetas JSX, atributos visibles (label, title,
aria-label, placeholder, alt, description, hint, emptyText...) y cadenas de mensajes (toast, error, confirm).
Es una estimación para dimensionar el trabajo, no la lista final de claves: deja fuera clases CSS, rutas, claves y
nombres de columnas de la base.

Uso: python scripts/inventario-textos.py [salida.tsv]
"""
import re
import sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent / "src"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else None

JSX_TEXT = re.compile(r">\s*([^<>{}\n]*[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡][^<>{}\n]*?)\s*<")
ATTR = re.compile(r"\b(label|title|aria-label|placeholder|alt|description|hint|emptyText|helper|subtitle|message|text|confirmLabel|cancelLabel|actionLabel)=\{?\s*[\"'`]([^\"'`{}]+)[\"'`]")
STR = re.compile(r"[\"'`]([^\"'`\n]{3,})[\"'`]")
SPANISH = re.compile(r"[áéíóúñ¿¡]|\b(el|la|los|las|de|del|que|para|con|sin|una?|en|por|se|no|sí|tu|tus|su|sus|al|es|está|hay|ver|nota|notas|estudiantes?|docente|periodo|guardar|cancelar|cerrar|volver|buscar)\b", re.I)
SKIP_STR = re.compile(r"^(#/|/|\.|https?:|[a-z]+[-_:][a-z]|[a-z0-9_.-]+$|[A-Z_]+$|ns-|var\(|rgba?\(|\d)")
SKIP_FILES = ("dev/", "types/", ".d.ts", "data/seed", "data/fixtures")

rows = []
for f in sorted(ROOT.rglob("*.ts*")):
    rel = f.relative_to(ROOT).as_posix()
    if any(s in rel for s in SKIP_FILES):
        continue
    for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
        s = line.strip()
        if s.startswith(("import ", "//", "*", "/*")) or "className=" in s and not SPANISH.search(s.split("className=")[0] + ">"):
            pass
        found = set()
        for m in JSX_TEXT.finditer(line):
            t = m.group(1).strip()
            if SPANISH.search(t) or len(t.split()) >= 2:
                found.add(("jsx", t))
        for m in ATTR.finditer(line):
            found.add(("atributo", m.group(2).strip()))
        if not s.startswith(("import ", "//", "*", "/*")):
            for m in STR.finditer(line):
                t = m.group(1).strip()
                if not SKIP_STR.search(t) and " " in t and SPANISH.search(t) and "className" not in line[max(0, m.start() - 12):m.start()]:
                    found.add(("cadena", t))
        for kind, t in found:
            rows.append((rel, n, kind, t))

# Una misma frase en una línea puede salir como jsx y como cadena: se cuenta una vez.
seen, unique = set(), []
for r in rows:
    k = (r[0], r[1], r[3])
    if k not in seen:
        seen.add(k)
        unique.append(r)

by_area = Counter(r[0].split("/")[0] if "/" not in r[0][len(r[0].split("/")[0]) + 1:] else "/".join(r[0].split("/")[:2]) for r in unique)
by_file = Counter(r[0] for r in unique)
texts = Counter(r[3] for r in unique)
words = sum(len(r[3].split()) for r in unique)

sys.stdout.reconfigure(encoding="utf-8")
print(f"Textos visibles: {len(unique)} apariciones, {len(texts)} distintos, {words} palabras")
print("\nPor carpeta:")
for k, v in by_area.most_common():
    print(f"  {v:5}  {k}")
print("\nArchivos con más textos:")
for k, v in by_file.most_common(12):
    print(f"  {v:5}  {k}")
print("\nTextos más repetidos:")
for k, v in texts.most_common(10):
    print(f"  {v:5}  {k}")
if OUT:
    OUT.write_text("archivo\tlínea\ttipo\ttexto\n" + "\n".join(f"{a}\t{b}\t{c}\t{d}" for a, b, c, d in unique) + "\n", encoding="utf-8")
    print(f"\nInventario escrito en {OUT}")
