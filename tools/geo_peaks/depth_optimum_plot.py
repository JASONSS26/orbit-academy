#!/usr/bin/env python3
"""
depth_optimum_plot.py — unstreaked DEPTH (total integration) vs inclination, and the
exposure-time optimum, for rate-matched GEO imaging with readout time R.

Model (verified against live TLEs by lock_window_plot.py / geo_peaks.py):
  dec drift near the southern peak:  rate = k t,  k = f · i · n²  (f ≈ 1.17 from CTIO).
  An exposure of length τ centered at |t| smears by  k·|t|·τ  ⇒  keeping smear ≤ ε
  confines exposures to |t| ≤ ε/(kτ): the window is W(τ) = 2ε/(kτ).

FIXED exposure time, readout R:
  I(τ; i) = W · τ/(τ+R) = 2ε / [k(i) · (τ+R)].
  Monotone in 1/(τ+R): shorter exposures always win integration — but with
  diminishing returns once τ ≲ R (duty collapses, frame count and read-noise
  penalty explode). The natural fixed-τ choice given a rate threshold ρ is
  τ* = ε/ρ  (the exposure for which the window-edge rate ρ produces exactly ε
  of smear): ε = 0.5″, ρ = 0.05″/s ⇒ τ* = 10 s, independent of inclination.

ADAPTIVE ladder (longest exposures at the peak, shortening outward, τ(t) = ε/(k|t|),
capped at τmax near the peak, floored at τmin at the edges):
  I_var(i) = 2∫ τ/(τ+R) dt = (2ε/(kR)) · ln[(ε + kR·t_out)/(ε + kR·t_in)] + (peak cap part)
  — evaluated numerically below; it approaches the τ→0 ceiling 2ε/(kR) · ln(1+Rρ/ε)
  while using practical exposure times.

Usage: python3 depth_optimum_plot.py [--R 17] [--eps 0.5] [--rho 0.05] [--out PNG]
"""
import argparse, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--R',    type=float, default=17.0,  help='readout time (s)')
    ap.add_argument('--eps',  type=float, default=0.5,   help='per-exposure smear budget (arcsec)')
    ap.add_argument('--rho',  type=float, default=0.05,  help='rate threshold (arcsec/s) — sets the outer edge')
    ap.add_argument('--f',    type=float, default=1.17,  help='topocentric amplification')
    ap.add_argument('--taumax', type=float, default=60.0, help='longest practical exposure (s)')
    ap.add_argument('--out',  default='depth_vs_inclination.png')
    args = ap.parse_args()

    n = 2*math.pi/86164.0905
    k_of = lambda i_deg: args.f*math.radians(i_deg)*n*n*206265.0   # arcsec/s^2
    R, eps, rho = args.R, args.eps, args.rho

    def I_fixed(i_deg, tau):
        k = k_of(i_deg)
        W = 2*eps/(k*tau)                       # total wall window allowed by smear
        Wr = 2*rho/k                            # window allowed by the rate threshold
        W = min(W, Wr)
        N = max(int(W // (tau+R)), 0)           # whole frames that fit
        return N*tau

    def I_adaptive(i_deg):
        """Greedy ladder outward from the peak: each frame as long as its position allows."""
        k = k_of(i_deg); t_edge = rho/k
        total, t = 0.0, 0.0
        # center frame: smear limited by curvature, allow taumax (k*tau^2/8 << eps here)
        tau0 = min(args.taumax, 2*math.sqrt(2*eps/k))
        total += tau0; t = tau0/2 + R
        while t < t_edge:
            tau = min(args.taumax, eps/(k*(t+ (eps/(k*t))/2 )))    # solve-ish: smear at frame center
            tau = max(tau, 1.0)
            if t + tau > t_edge: break
            total += 2*tau                       # symmetric: same frame on the − side
            t += tau + R
        return total

    ideg = np.linspace(1, 15.5, 300)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14.5, 6.2))

    for tau, c in ((40,'tab:red'), (20,'tab:orange'), (10,'tab:green'), (5,'tab:blue')):
        ax1.plot(ideg, [I_fixed(x,tau) for x in ideg], color=c, lw=1.8,
                 label=f'fixed τ = {tau:.0f} s')
    ax1.plot(ideg, [I_adaptive(x) for x in ideg], 'k--', lw=2.2,
             label=f'adaptive ladder (τ ≤ {args.taumax:.0f} s)')
    ax1.axhline(200, color='gray', ls=':', lw=1.2)
    ax1.text(15.3, 205, '200 s goal', color='gray', fontsize=9, ha='right')
    ax1.set_xlabel('orbital inclination (deg)')
    ax1.set_ylabel('total UNSTREAKED integration per peak visit (s)')
    ax1.set_title(f'Depth vs inclination   (R = {R:.0f} s, ε = {eps}″, edge rate ρ = {rho}″/s)')
    ax1.grid(alpha=0.3); ax1.legend(); ax1.set_ylim(0, 900); ax1.set_xlim(1, 15.5)

    taus = np.linspace(2, 60, 200)
    for i_deg, c in ((5,'tab:blue'), (8,'tab:green'), (10,'tab:orange'), (14,'tab:red')):
        ax2.plot(taus, [I_fixed(i_deg,t) for t in taus], color=c, lw=1.8, label=f'i = {i_deg}°')
    tstar = eps/rho
    ax2.axvline(tstar, color='k', ls='--', lw=1.2)
    ax2.text(tstar+0.6, ax2.get_ylim()[1]*0.02, f'τ* = ε/ρ = {tstar:.0f} s', fontsize=9)
    ax2.axvline(R, color='gray', ls=':', lw=1)
    ax2.text(R+0.6, ax2.get_ylim()[1]*0.0, f'R = {R:.0f} s', color='gray', fontsize=8)
    ax2.set_xlabel('exposure time τ (s)')
    ax2.set_ylabel('total unstreaked integration (s)')
    ax2.set_title('Choosing τ: integration vs exposure time (whole frames only)')
    ax2.grid(alpha=0.3); ax2.legend()

    fig.tight_layout(); fig.savefig(args.out, dpi=150)
    print('wrote', args.out)
    # console summary
    print(f"\n{'i (deg)':>8} {'I(τ=20s)':>10} {'I(τ=10s)':>10} {'I(τ=5s)':>9} {'adaptive':>9}   (s of unstreaked integration)")
    for i_deg in (3,5,8,10,12,14):
        print(f"{i_deg:>8} {I_fixed(i_deg,20):>10.0f} {I_fixed(i_deg,10):>10.0f} "
              f"{I_fixed(i_deg,5):>9.0f} {I_adaptive(i_deg):>9.0f}")

if __name__ == '__main__':
    main()
