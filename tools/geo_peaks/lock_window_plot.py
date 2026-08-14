#!/usr/bin/env python3
"""
lock_window_plot.py — unstreaked-duration plot for rate-matched GEO imaging.

Plots the time spent with |dec rate| below a threshold (default 0.05"/s = 1" of
smear in a 20-s exposure) as a function of orbital inclination — the usable
"unstreaked" window at each inclination, centered on the southern-declination peak.

Analytic curve:  dec rate near the peak is  δ̇(t) = k t  with  k = f · i · n²
(f ≈ 1.17 measured topocentric amplification from CTIO), so
    T_unstreaked(i) = 2 · (rate threshold) / k(i)   ∝ 1/i.

Points: measured numerically from real TLEs (same propagation code as geo_peaks.py),
by finding the actual span around each object's southern peak where |δ̇| < threshold.

Usage:  python3 lock_window_plot.py [--tle-file FILE] [--thresh 0.05] [--out PNG]
"""
import argparse, datetime as dt, importlib.util, math, os, sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("gp", os.path.join(HERE, "geo_peaks.py"))
gp = importlib.util.module_from_spec(spec); spec.loader.exec_module(gp)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tle-file', help='3LE file for measured points (optional)')
    ap.add_argument('--thresh', type=float, default=0.05, help='|dec rate| threshold, arcsec/s')
    ap.add_argument('--f', type=float, default=1.17, help='topocentric amplification factor')
    ap.add_argument('--site', nargs=3, type=float, default=[-30.16528,-70.80644,2200.0])
    ap.add_argument('--out', default='unstreaked_duration.png')
    args = ap.parse_args()

    n = 2*math.pi/86164.0905
    k_of = lambda i_deg: args.f*math.radians(i_deg)*n*n*206265.0    # arcsec/s^2

    F_NORTH = 1.12          # measured from live TLEs (observable fleet): vs f_south ≈ 1.17
    ideg = np.linspace(0.3, 15.5, 400)
    T_s = 2*args.thresh/np.array([k_of(x) for x in ideg])                 # southern peak
    T_n = T_s*(args.f/F_NORTH)                                            # northern peak

    fig, ax = plt.subplots(figsize=(10.5, 6.5))
    ax.plot(ideg, T_s/60.0, 'b-', lw=2,
            label=f'SOUTHERN peak:  T = 2·({args.thresh}″/s)/(f·i·n²),  f={args.f}')
    ax.plot(ideg, T_n/60.0, 'b--', lw=1.6,
            label=f'NORTHERN peak:  f={F_NORTH} (measured) — only ~4% longer, at ≈2× the airmass')

    # measured points from real TLEs, if provided
    if args.tle_file:
        site = tuple(args.site)
        jd0 = gp.jd_from_datetime(dt.datetime.now(dt.timezone.utc))
        for t in gp.parse_tle_text(open(args.tle_file).read()):
            i_deg = t.incl/gp.DEG
            if i_deg < 1.0:  continue                       # zero-inc: no meaningful peak
            for ext, mfc, mk in (('south','orange','o'), ('north','skyblue','^')):
                rec = gp.southern_peak(t, jd0, site, step_s=120, extreme=ext)
                if rec is None or 90-rec['za'] < 15:  continue
                # walk outward from the peak until |dec rate| exceeds the threshold
                jd_pk = rec['jd']; span = None
                for sec in range(30, 7200, 30):
                    d1 = gp.topo_radec_za(t, jd_pk+(sec-15)/86400.0, site)[1]
                    d2 = gp.topo_radec_za(t, jd_pk+(sec+15)/86400.0, site)[1]
                    if abs((d2-d1)*3600.0/30.0) > args.thresh: span = 2*sec; break
                if span:
                    ax.plot(i_deg, span/60.0, mk, ms=6, mfc=mfc, mec='k', zorder=5)
                    if ext=='south':
                        ax.annotate(t.name.split('(')[0].strip(), (i_deg, span/60.0),
                                    fontsize=7, textcoords='offset points', xytext=(5,5))
        ax.plot([],[], 'o', mfc='orange', mec='k', label='measured, southern peak')
        ax.plot([],[], '^', mfc='skyblue', mec='k', label='measured, northern peak')

    # reference lines: bare 200-s integration, and 200 s + readouts (10x20s + N R)
    for wall, lbl, c, va in ((200,'200 s integration alone','g','bottom'),
                             (200+9*20,'200 s + 9×20 s readouts','darkorange','top'),
                             (200+19*10,'200 s (10-s subs) + 19×10 s readouts','r','bottom')):
        ax.axhline(wall/60.0, color=c, ls='--', lw=1.2)
        ax.text(0.2, wall/60.0 + (0.15 if va=='bottom' else -0.15), lbl,
                color=c, fontsize=8.5, va=va, ha='left')

    ax.set_xlabel('orbital inclination (deg)')
    ax.set_ylabel(f'time with |dec rate| < {args.thresh}″/s  (minutes)')
    ax.set_title('Unstreaked duration at the southern peak vs inclination\n'
                 f'(site {args.site[0]:.3f}°, {args.site[1]:.3f}°E — points: measured from live TLEs)')
    ax.set_xlim(0, 15.6); ax.set_ylim(0, 40)
    ax.grid(alpha=0.3); ax.legend(loc='upper right')
    fig.tight_layout(); fig.savefig(args.out, dpi=150)
    print('wrote', args.out)

if __name__ == '__main__':
    main()
