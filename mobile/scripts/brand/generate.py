"""
Generates Brew's brand assets from one set of shapes, so they line up exactly:

- assets/animations/brew-splash.json  Lottie animation of the animated splash
- assets/splash.png                   native splash image = frame 0 of that animation
- assets/icon.png                     app icon (iOS, and Android's legacy icon)
- assets/android-icon-foreground.png  Android adaptive icon layers
- assets/android-icon-background.png

Run from mobile/:  python3 scripts/brand/generate.py
macOS only: PNGs are rasterized from SVG with Quick Look (qlmanage), which
draws on an opaque white background, so every SVG paints its own background.
After changing the splash or icon, rebuild the app (npx expo prebuild --clean).
"""

import json
import os
import shutil
import subprocess
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(ROOT, 'assets')

# Same values as tailwind.config.js.
NIGHT = '#050505'
BRAND = '#C67C4E'
BRAND_DARK = '#94582F'
CREAM = '#F9F2ED'
LATTE = '#EDD6C8'

CANVAS = 400  # Lottie canvas and SVG viewBox
FPS = 60
DURATION = 84  # frames: 1.4 s

# ---------------------------------------------------------------- geometry
# Cup body: straight top, slightly narrower rounded bottom.
# Each segment: (end point, control 1, control 2) or (end point,) for a line.
CUP_START = (120, 170)
CUP_SEGMENTS = [
    ((260, 170),),
    ((252, 250),),
    ((205, 290), (249, 275), (230, 290)),
    ((175, 290),),
    ((128, 250), (150, 290), (131, 275)),
    ((120, 170),),
]
RIM = {'center': (190, 170), 'size': (140, 28)}
COFFEE = {'center': (190, 172), 'size': (122, 18)}
HANDLE = {'center': (262, 218), 'size': (50, 58), 'width': 14}
SAUCER = {'center': (190, 297), 'size': (214, 14), 'radius': 7}
# Steam: three S-curves rising from the cup, (x, first frame of the animation).
STEAM = [(158, 4), (190, 12), (222, 20)]
STEAM_BOTTOM, STEAM_TOP = 150, 78


def steam_points(x):
    return (x, STEAM_BOTTOM), (x - 18, 126), (x + 18, 102), (x, STEAM_TOP)


# ---------------------------------------------------------------- SVG
def cup_svg(cream=CREAM, rim=LATTE, coffee=BRAND, saucer=LATTE):
    d = f'M{CUP_START[0]},{CUP_START[1]} '
    for seg in CUP_SEGMENTS:
        if len(seg) == 1:
            d += f'L{seg[0][0]},{seg[0][1]} '
        else:
            (x, y), (x1, y1), (x2, y2) = seg
            d += f'C{x1},{y1} {x2},{y2} {x},{y} '
    hx, hy = HANDLE['center']
    hw, hh = HANDLE['size']
    sx, sy = SAUCER['center']
    sw, sh = SAUCER['size']
    return f'''
  <rect x="{sx - sw / 2}" y="{sy - sh / 2}" width="{sw}" height="{sh}" rx="{SAUCER['radius']}" fill="{saucer}"/>
  <ellipse cx="{hx}" cy="{hy}" rx="{hw / 2}" ry="{hh / 2}" fill="none" stroke="{cream}" stroke-width="{HANDLE['width']}"/>
  <path d="{d}Z" fill="{cream}"/>
  <ellipse cx="{RIM['center'][0]}" cy="{RIM['center'][1]}" rx="{RIM['size'][0] / 2}" ry="{RIM['size'][1] / 2}" fill="{rim}"/>
  <ellipse cx="{COFFEE['center'][0]}" cy="{COFFEE['center'][1]}" rx="{COFFEE['size'][0] / 2}" ry="{COFFEE['size'][1] / 2}" fill="{coffee}"/>'''


def steam_svg(color):
    paths = ''
    for x, _ in STEAM:
        (x0, y0), (x1, y1), (x2, y2), (x3, y3) = steam_points(x)
        paths += (
            f'\n  <path d="M{x0},{y0} C{x1},{y1} {x2},{y2} {x3},{y3}" fill="none" '
            f'stroke="{color}" stroke-width="10" stroke-linecap="round"/>'
        )
    return paths


def svg(body, background, scale=1.0, size=CANVAS):
    # `scale` shrinks the drawing around the center (icon safe zones).
    offset = CANVAS * (1 - scale) / 2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {CANVAS} {CANVAS}">'
        f'<rect width="{CANVAS}" height="{CANVAS}" fill="{background}"/>'
        f'<g transform="translate({offset},{offset}) scale({scale})">{body}</g></svg>'
    )


def rasterize(svg_text, out_path, size):
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, 'art.svg')
        with open(src, 'w') as f:
            f.write(svg_text)
        subprocess.run(['qlmanage', '-t', '-s', str(size), '-o', tmp, src],
                       check=True, capture_output=True)
        shutil.move(src + '.png', out_path)
    print('wrote', os.path.relpath(out_path, ROOT))


# ---------------------------------------------------------------- Lottie
def rgba(hex_color):
    h = hex_color.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [1]


def static(value):
    return {'a': 0, 'k': value}


EASE_OUT = {'x': [0.2], 'y': [1]}
EASE_IN = {'x': [0.6], 'y': [0]}


def animated(keyframes):
    """keyframes: [(frame, value)]; values are lists. Eased in and out."""
    dims = len(keyframes[0][1])
    k = []
    for i, (t, value) in enumerate(keyframes):
        frame = {'t': t, 's': value}
        if i < len(keyframes) - 1:
            frame['o'] = {'x': EASE_IN['x'] * dims, 'y': EASE_IN['y'] * dims}
            frame['i'] = {'x': EASE_OUT['x'] * dims, 'y': EASE_OUT['y'] * dims}
        k.append(frame)
    return {'a': 1, 'k': k}


def group_transform():
    return {'ty': 'tr', 'p': static([0, 0]), 'a': static([0, 0]), 's': static([100, 100]),
            'r': static(0), 'o': static(100)}


def group(name, items):
    return {'ty': 'gr', 'nm': name, 'it': items + [group_transform()]}


def fill(color):
    return {'ty': 'fl', 'c': static(rgba(color)), 'o': static(100), 'r': 1}


def stroke(color, width, opacity=100):
    return {'ty': 'st', 'c': static(rgba(color)), 'o': static(opacity), 'w': static(width),
            'lc': 2, 'lj': 2}


def ellipse(spec):
    return {'ty': 'el', 'p': static(list(spec['center'])), 's': static(list(spec['size']))}


def bezier(start, segments, closed):
    """Absolute SVG-style segments -> Lottie vertices with relative tangents."""
    vertices, ins, outs = [list(start)], [[0, 0]], [[0, 0]]
    for seg in segments:
        end = seg[0]
        if len(seg) == 3:
            c1, c2 = seg[1], seg[2]
            prev = vertices[-1]
            outs[-1] = [c1[0] - prev[0], c1[1] - prev[1]]
            in_tangent = [c2[0] - end[0], c2[1] - end[1]]
        else:
            in_tangent = [0, 0]
        if closed and end == start and seg is segments[-1]:
            ins[0] = in_tangent
            break
        vertices.append(list(end))
        ins.append(in_tangent)
        outs.append([0, 0])
    return {'ty': 'sh', 'ks': static({'i': ins, 'o': outs, 'v': vertices, 'c': closed})}


def layer(index, name, shapes, transform):
    return {'ddd': 0, 'ind': index, 'ty': 4, 'nm': name, 'sr': 1, 'ks': transform, 'ao': 0,
            'shapes': shapes, 'ip': 0, 'op': DURATION, 'st': 0, 'bm': 0}


def layer_transform(scale=None, anchor=(CANVAS / 2, CANVAS / 2)):
    return {'o': static(100), 'r': static(0), 'p': static([anchor[0], anchor[1], 0]),
            'a': static([anchor[0], anchor[1], 0]),
            's': scale or static([100, 100, 100])}


def lottie():
    sx, sy = SAUCER['center']
    cup_shapes = [  # first item is drawn on top
        group('coffee', [ellipse(COFFEE), fill(BRAND)]),
        group('rim', [ellipse(RIM), fill(LATTE)]),
        group('body', [bezier(CUP_START, CUP_SEGMENTS, closed=True), fill(CREAM)]),
        group('handle', [ellipse(HANDLE), stroke(CREAM, HANDLE['width'])]),
        group('saucer', [{'ty': 'rc', 'p': static(list(SAUCER['center'])),
                          's': static(list(SAUCER['size'])), 'r': static(SAUCER['radius'])},
                         fill(LATTE)]),
    ]
    # A small "pop" of the cup, anchored on the saucer so it grows upwards.
    cup_scale = animated([(0, [100, 100, 100]), (14, [105, 105, 100]), (32, [100, 100, 100])])

    steam_shapes = []
    for x, start in STEAM:
        p0, c1, c2, p3 = steam_points(x)
        trim = {'ty': 'tm', 'm': 1, 'o': static(0),
                # Draws upwards, then the tail follows and the wisp is gone.
                'e': animated([(start, [0]), (start + 30, [100])]),
                's': animated([(start + 18, [0]), (start + 52, [100])])}
        steam_shapes.append(group(f'steam {x}', [
            bezier(p0, [(p3, c1, c2)], closed=False),
            trim,
            stroke(LATTE, 10, opacity=85),
        ]))

    return {
        'v': '5.7.4', 'fr': FPS, 'ip': 0, 'op': DURATION, 'w': CANVAS, 'h': CANVAS,
        'nm': 'brew-splash', 'ddd': 0, 'assets': [],
        'layers': [
            layer(1, 'steam', steam_shapes, layer_transform()),
            layer(2, 'cup', cup_shapes, layer_transform(cup_scale, anchor=(sx, sy))),
        ],
    }


def main():
    os.makedirs(os.path.join(ASSETS, 'animations'), exist_ok=True)
    path = os.path.join(ASSETS, 'animations', 'brew-splash.json')
    with open(path, 'w') as f:
        json.dump(lottie(), f, separators=(',', ':'))
    print('wrote', os.path.relpath(path, ROOT))

    # Frame 0 of the animation: the cup, no steam yet. Shown at imageWidth 200 (3x = 600 px).
    rasterize(svg(cup_svg(), NIGHT, size=600), os.path.join(ASSETS, 'splash.png'), 600)

    # Icon: cup with steam on the brand color. Dark coffee so it reads on brown.
    icon_art = cup_svg(coffee=BRAND_DARK) + steam_svg(CREAM)
    rasterize(svg(icon_art, BRAND, scale=1.25, size=1024), os.path.join(ASSETS, 'icon.png'), 1024)
    # Android masks the adaptive icon to a circle/squircle and only guarantees the middle
    # 66% (a circle 66/108 wide): at 0.75 the saucer's ends and the steam stay inside it.
    rasterize(svg(icon_art, BRAND, scale=0.75, size=1024),
              os.path.join(ASSETS, 'android-icon-foreground.png'), 1024)
    rasterize(svg('', BRAND, size=1024), os.path.join(ASSETS, 'android-icon-background.png'), 1024)


if __name__ == '__main__':
    main()
