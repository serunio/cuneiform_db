import re
import matplotlib.pyplot as plt
from matplotlib.path import Path
from matplotlib.patches import PathPatch

glyph =  {
    "phonetic": "A",
    "N": 0,
    "NE": 0,
    "E": 0,
    "SE": 0,
    "S": 3,
    "SW": 0,
    "W": 0,
    "NW": 0,
    "H": 0,
    "crosses": 0,
    "id": 421,
    "avgStartX": 33,
    "avgStartY": 33.333333333333336,
    "maxLength": 113.03981599418853,
    "minLength": 61.07372593840988,
    "massCenterSimpleX": 34.44444444444445,
    "massCenterSimpleY": 78.22222222222223,
    "massCenterPointsX": 26.233333333333334,
    "massCenterPointsY": 83.06666666666666,
    "massCenterX": 28.84941136587091,
    "massCenterY": 71.97379177886268,
    "unicode": '𒀀',
    "raw": 'M1 16L1 30L0 50L0 60L0 67L0 74L1 80L1 85L2 90L2 95L3 101L4 110L4 117L4 123L4 129M50 0L49 24L47 37L47 42L46 50L46 56L47 61M48 84L49 95L52 114L54 125L55 131L56 141L57 149L57 156'
  }

def svg_path_to_mpl(d):
    tokens = re.findall(r'[ML]|-?\d+(?:\.\d+)?', d)

    verts = []
    codes = []

    i = 0
    cmd = None

    while i < len(tokens):
        t = tokens[i]

        if t in ("M", "L"):
            cmd = t
            i += 1
            continue

        x = float(tokens[i])
        y = float(tokens[i + 1])

        verts.append((x, y))
        codes.append(Path.MOVETO if cmd == "M" else Path.LINETO)

        i += 2

    return Path(verts, codes)

path = svg_path_to_mpl(glyph["raw"])

fig, ax = plt.subplots(figsize=(4, 6))

# ścieżka
patch = PathPatch(path, fill=False, lw=2)
ax.add_patch(patch)

# punkty
for key in glyph:
    if key.endswith("X"):
        name = key[:-1]
        x = glyph[key]
        y = glyph[name + "Y"]

        ax.scatter(x, y, color="red", s=30)
        ax.text(x + 2, y, name, fontsize=8)

# dopasowanie widoku
xs, ys = zip(*path.vertices)
ax.set_xlim(min(xs) - 10, max(xs) + 20)
ax.set_ylim(max(ys) + 10, min(ys) - 10)  # odwrócenie osi Y jak w SVG
ax.set_aspect("equal")

plt.show()