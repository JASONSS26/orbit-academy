#!/usr/bin/env python3
"""
make-textures.py — generate the SELF-CONTAINED fallback planet textures that ship with the course.

Why these exist: the simulators normally use the photographic Earth/Moon maps from the three.js
example assets (a CDN fetch). For an air-gapped or offline install we need something that is in the
repository and needs no network at all. Rather than fabricate fake continents — which would put
wrong geography in front of students — the Earth map here is deliberately SCHEMATIC: ocean blue
with a latitude/longitude graticule, a bright equator, marked tropics and polar circles, and ice
caps. That is honest about what it is, and it is genuinely more useful than a photo for the things
Modules 1-3 teach: you can watch Earth rotate by counting meridians, and read inclination off the
grid. The Moon map is a stylised regolith/maria/crater texture (cosmetic only).

Run:  python3 tools/make-textures.py        (writes into public/vendor/textures/)
"""
import os, math, numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, '..', 'public', 'vendor', 'textures')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20260728)          # fixed seed → reproducible, reviewable output


def smooth_noise(h, w, octaves=(4, 8, 16, 32), weights=(0.5, 0.25, 0.15, 0.10)):
    """Cheap multi-octave value noise on a lat/lon grid, wrapping in longitude."""
    acc = np.zeros((h, w), dtype=np.float32)
    for n, wt in zip(octaves, weights):
        g = rng.random((n + 1, n + 1)).astype(np.float32)
        g[:, -1] = g[:, 0]                                     # wrap longitude
        img = Image.fromarray((g * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += wt * (np.asarray(img, dtype=np.float32) / 255.0)
    return (acc - acc.min()) / (np.ptp(acc) + 1e-9)      # np.ptp: ndarray.ptp() went in NumPy 2.0


# ----------------------------------------------------------------- EARTH (schematic, 2048x1024)
W, H = 2048, 1024
lat = np.linspace(90, -90, H)[:, None] * np.ones((1, W), dtype=np.float32)

ocean_deep    = np.array([9, 32, 68],    dtype=np.float32)      # near the poles
ocean_shallow = np.array([26, 78, 140],  dtype=np.float32)      # near the equator
t = (np.cos(np.deg2rad(lat)) ** 0.7)[..., None]
img = ocean_deep + (ocean_shallow - ocean_deep) * t

n = smooth_noise(H, W)[..., None]
img += (n - 0.5) * 14                                            # subtle mottling, no fake landmass

# ice caps — start further poleward and feather hard, so they read as caps not bands
cap = np.clip((np.abs(lat) - 78) / 11.0, 0, 1)[..., None] ** 1.6
img = img * (1 - cap) + np.array([226, 236, 246], dtype=np.float32) * cap

pic = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
d = ImageDraw.Draw(pic, 'RGBA')


def y_of(deg):  return int((90 - deg) / 180 * (H - 1))
def x_of(deg):  return int((deg + 180) / 360 * (W - 1))


for lon in range(-180, 181, 15):                                 # meridians every 15° = 1 hour of rotation
    major = (lon % 90 == 0)
    d.line([(x_of(lon), 0), (x_of(lon), H)],
           fill=(170, 214, 255, 150 if major else 96), width=4 if major else 3)
# prime meridian in a distinct colour: gives the eye ONE feature to track, so you can both count
# rotations and tell which way the planet is turning
d.line([(x_of(0), 0), (x_of(0), H)], fill=(126, 240, 170, 190), width=6)
for la in range(-75, 76, 15):                                    # parallels every 15°
    d.line([(0, y_of(la)), (W, y_of(la))], fill=(170, 214, 255, 88), width=3)

d.line([(0, y_of(0)), (W, y_of(0))], fill=(255, 214, 102, 210), width=7)          # equator
for la in (23.44, -23.44):                                                        # tropics
    for xs in range(0, W, 44):
        d.line([(xs, y_of(la)), (xs + 22, y_of(la))], fill=(255, 214, 102, 140), width=4)
for la in (66.56, -66.56):                                                        # polar circles
    for xs in range(0, W, 30):
        d.line([(xs, y_of(la)), (xs + 12, y_of(la))], fill=(198, 230, 255, 120), width=3)

pic = pic.filter(ImageFilter.GaussianBlur(0.6))
pic.save(os.path.join(OUT, 'earth_schematic.jpg'), quality=88, optimize=True)
print('wrote earth_schematic.jpg  %dx%d' % (W, H))

# ------------------------------------------------------------------- MOON (stylised, 1024x512)
W, H = 1024, 512
base = 132 + smooth_noise(H, W, (6, 12, 24, 48)) * 26
img = np.dstack([base, base * 0.985, base * 0.95]).astype(np.float32)

maria = smooth_noise(H, W, (3, 5), (0.65, 0.35))                 # large dark basalt plains
mask = np.clip((maria - 0.56) * 4.2, 0, 1)[..., None]
img = img * (1 - mask * 0.42)

pic = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
d = ImageDraw.Draw(pic, 'RGBA')
for _ in range(430):                                             # craters, small ones commonest
    cx, cy = rng.integers(0, W), rng.integers(0, H)
    r = float(np.clip(rng.gamma(1.7, 3.6), 2, 46))
    shade = int(rng.integers(24, 60))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 0, 0, shade))            # floor
    d.arc([cx - r, cy - r, cx + r, cy + r], 195, 355, fill=(255, 255, 250, 70), width=max(1, int(r / 7)))
    if r > 22:                                                                     # bright ejecta
        d.ellipse([cx - r * 1.5, cy - r * 1.5, cx + r * 1.5, cy + r * 1.5],
                  outline=(255, 255, 250, 18), width=max(2, int(r / 5)))

pic = pic.filter(ImageFilter.GaussianBlur(0.5))
pic.save(os.path.join(OUT, 'moon_schematic.jpg'), quality=86, optimize=True)
print('wrote moon_schematic.jpg   %dx%d' % (W, H))
