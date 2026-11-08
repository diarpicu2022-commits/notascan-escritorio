"""Mide la captura de NotaScan abierta en un sistema (paso C de multiplataforma, 2026-11-08).

Uso: python medir-captura.py <captura.png> <windows|linux|macos>

En todos los sistemas comprueba que la ventana se abrió y pinta el sistema de NotaScan: la marca dorada de la barra de
título (--gold #b8924b; el dorado visible, dentro del borde azul, mide 13 px de ancho a escala 1, medido con
verify-titlebar el 2026-11-08) y el fondo papel (--paper #fffdf8) a su alrededor.
En macOS mide además los tres botones del sistema (enmienda 10): centrados en vertical con la marca, en orden rojo,
amarillo y verde, y sin montarse sobre ella.
Escribe el resultado en texto y termina con código 1 si algo falla.
"""
import sys
from PIL import Image

GOLD = (0xB8, 0x92, 0x4B)
PAPER = (0xFF, 0xFD, 0xF8)
# Botones de ventana de macOS activos (Sonoma y Sequoia), con margen para el suavizado.
MAC_BUTTONS = {"cerrar": (255, 95, 87), "minimizar": (254, 188, 46), "zoom": (40, 200, 64)}


def near(px, ref, tol):
    return all(abs(a - b) <= tol for a, b in zip(px[:3], ref))


def components(img, ref, tol, box):
    """Figuras separadas del color pedido dentro de la caja (recortada a la imagen), de la más grande a la más chica."""
    w, h = img.size
    x0, y0, x1, y1 = max(0, box[0]), max(0, box[1]), min(w, box[2]), min(h, box[3])
    px = img.load()
    hit = {(x, y) for y in range(y0, y1) for x in range(x0, x1) if near(px[x, y], ref, tol)}
    comps = []
    while hit:
        stack = [hit.pop()]
        pts = []
        while stack:
            p = stack.pop()
            pts.append(p)
            for q in ((p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)):
                if q in hit:
                    hit.remove(q)
                    stack.append(q)
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        comps.append({"x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys), "cx": sum(xs) / len(xs), "cy": sum(ys) / len(ys), "n": len(pts)})
    return sorted(comps, key=lambda c: -c["n"])


def cluster(img, ref, tol, box):
    comps = components(img, ref, tol, box)
    return comps[0] if comps else None


def find_mark(img):
    """La marca de la barra: un cuadro dorado casi cuadrado, de 10 a 32 px de lado, el más alto y a la izquierda.
    La «N» azul tapa parte del dorado: medido el 2026-11-08, el dorado cubre el 53 al 56 % del cuadro."""
    w, h = img.size
    cands = [c for c in components(img, GOLD, 18, (0, 0, min(w, 700), min(h, 140)))
             if 10 <= c["x1"] - c["x0"] + 1 <= 32 and 0.8 <= (c["y1"] - c["y0"] + 1) / (c["x1"] - c["x0"] + 1) <= 1.25
             and c["n"] >= 0.4 * (c["x1"] - c["x0"] + 1) * (c["y1"] - c["y0"] + 1)]
    return min(cands, key=lambda c: (c["y0"], c["x0"])) if cands else None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    path, system = sys.argv[1], sys.argv[2]
    img = Image.open(path).convert("RGB")
    w, h = img.size
    results = []

    def check(name, ok, detail=""):
        results.append((name, bool(ok), detail))

    # La barra está arriba: en macOS, debajo de la barra de menús (24 a 38 px según la escala).
    mark = find_mark(img)
    check("la ventana de NotaScan se abrió (marca dorada en la barra de título)", mark,
          f"cuadro de {mark['x1'] - mark['x0'] + 1} x {mark['y1'] - mark['y0'] + 1} px en ({mark['x0']}, {mark['y0']})" if mark else "no aparece")
    if not mark:
        return report(results)
    scale = (mark["x1"] - mark["x0"] + 1) / 13
    check("escala de pantalla razonable", 0.8 <= scale <= 2.4, f"{scale:.2f}x")
    # A 5 px lógicos a la izquierda del dorado ya se pasó el borde azul de la marca: debe ser papel.
    beside = img.getpixel((max(0, int(mark["x0"] - 5 * scale)), int(mark["cy"])))
    check("fondo papel junto a la marca", near(beside, PAPER, 10), f"rgb{beside}")
    check("marca a la izquierda, donde la pone el sistema", mark["x0"] < 200 * scale, f"x = {mark['x0']} px")

    if system == "windows":
        # Maximizada, la marca queda a 14 px del borde de la pantalla. Si la ventana pierde el maximizado se corre.
        check("ventana maximizada (marca a 14 px del borde de la pantalla)", abs(mark["x0"] - 14 * scale) <= 2 * scale, f"x = {mark['x0']} px")

    if system == "macos":
        found = {}
        for name, ref in MAC_BUTTONS.items():
            found[name] = cluster(img, ref, 40, (0, max(0, int(mark["y0"] - 20 * scale)), int(mark["x0"]), int(mark["y1"] + 20 * scale)))
            check(f"botón {name} del sistema a la izquierda de la marca", found[name] and found[name]["n"] >= 20,
                  "no aparece (¿ventana inactiva o tapada?)" if not found[name] else f"centro ({found[name]['cx']:.0f}, {found[name]['cy']:.0f})")
        if all(found.values()):
            c, m, z = found["cerrar"], found["minimizar"], found["zoom"]
            check("orden cerrar, minimizar, zoom", c["cx"] < m["cx"] < z["cx"])
            dy = max(abs(b["cy"] - mark["cy"]) for b in found.values())
            check("botones centrados en vertical con la marca (≤ 1,5 px lógicos)", dy <= 1.5 * scale, f"{dy / scale:.1f} px lógicos")
            gap = (mark["x0"] - z["x1"]) / scale
            check("la marca no se monta sobre los botones (≥ 8 px lógicos de aire)", gap >= 8, f"{gap:.1f} px lógicos")
            left = c["x0"] / scale
            check("el primer botón empieza cerca de 14 px lógicos del borde", 8 <= left <= 22, f"{left:.1f} px lógicos")
    return report(results)


def report(results):
    failed = 0
    for name, ok, detail in results:
        failed += not ok
        print(f"{'OK   ' if ok else 'FALLA'} {name}{'  — ' + detail if detail else ''}")
    print(f"\n{len(results) - failed}/{len(results)} comprobaciones superadas")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
