#!/usr/bin/env python3
"""
geo_peaks.py — nightly GEO-belt observing list for a ground site (default: CTIO).

For each satellite (NORAD catalog IDs from an input file, or the whole CelesTrak GEO
group), find the instant in the next 24 h when it reaches its MAXIMUM SOUTHERN
topocentric declination (the southern turning point of its daily inclination
oscillation), and report, ordered by LMST:

    LMST of the southern peak, UT, topocentric RA & DEC (J2000), the apparent RA
    rate, the RA-rate OFFSET FROM SIDEREAL, dDEC/dt (≈0 at the peak — sanity check),
    zenith angle, sub-satellite (geodetic) longitude, TLE inclination and epoch age —
    plus a full POINTING solution (see below).

POINTING (for maximum dwell in the field of view):
  At culmination of the analemma arc the object sits at its SOUTHERN turning point
  and then climbs back north. To keep it in the FOV as long as possible, the field
  center is offset NORTH so the object lies 75% of the way from the center toward
  the SOUTHERN edge of the FOV at that instant:
      pointing DEC = (object DEC at peak) + 0.75 × (FOV/2)      [--fov, degrees]
      pointing RA  = object RA at peak.
  Pointing is reported as RA/DEC (J2000), as an hour angle / offset from LMST
  (HA = LMST − RA; HA > 0 = WEST of the meridian; RA − LMST is its negative),
  and as ALT / AZ (azimuth measured from NORTH through EAST: N=0°, E=90°).

SIGN CONVENTIONS (printed in every output header):
  • RA rate  = d(RA)/dt of the OBJECT, in arcsec of arc per second of time.
    POSITIVE = RA increasing = object moving EASTWARD on the sky.
    Stars have RA rate = 0. A perfect geostationary object has RA rate = +15.0411"/s
    (its RA advances exactly at the rate LMST advances).
  • Sidereal reference rate = 15.041067"/s  (= 360°/86164.0905 s, the LMST rate).
  • RA-rate offset from sidereal  Δ = (RA rate) − 15.041067"/s.
    Δ > 0  ⇒ RA gaining on a geostationary point ⇒ drifting EAST relative to the
             rotating Earth (hour angle DECREASING faster than a geosat's would).
    Δ < 0  ⇒ drifting WEST relative to a geostationary point.
    For a telescope: tracking SIDEREALLY (following stars), the object trails at the
    full RA rate (~+15"/s); the non-sidereal rate you command to follow the object
    IS the RA rate above. Δ tells you how it differs from an ideal geosat's drift.

TLE sources (choose with --source):
  celestrak   (default) https://celestrak.org/NORAD/elements/gp.php?CATNR=<id>&FORMAT=TLE
              and GROUP=geo for --all-geo
  satchecker  IAU CPS SatChecker: https://satchecker.cps.iau.org/tools/get-tle-data/
              ?id=<id>&id_type=catalog   (newest epoch is used)
  file        --tle-file <path>: a local 3-line-element file (tolerant of collapsed
              whitespace); no network needed.

Propagation & frames:
  • If the `sgp4` package is installed (pip install sgp4), full SGP4/SDP4 is used —
    RECOMMENDED (GEO TLEs are deep-space sets; SDP4 carries the lunisolar terms).
  • If `astropy` is installed, TEME→ITRS→GCRS transforms are exact and RA/DEC are
    true topocentric ICRS (J2000).
  • Without them the built-in fallback uses mean-Kepler + J2 secular propagation and
    GMST-based frame math with IAU-1976 precession (no nutation): expect up to
    ~1–2 arcmin position error for GEO — fine for planning, not for astrometry.
    A banner in the output states which engines were used.

Usage examples:
  python3 geo_peaks.py --targets targets_example.txt
  python3 geo_peaks.py --all-geo --min-alt 25
  python3 geo_peaks.py --targets ids.txt --start 2026-08-15T00:00:00 --site -30.1653 -70.8064 2200
  python3 geo_peaks.py --tle-file tonight.tle          # offline

Outputs: geo_peaks_<date>.csv, dec_vs_lmst_<date>.png, peaks_sky_<date>.png,
         rate_offsets_<date>.png, and a console table.
"""
import argparse, csv, math, os, re, sys, datetime as dt

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ----------------------------- constants ------------------------------------
MU_E      = 398600.4418          # km^3/s^2
R_E       = 6378.137             # km (WGS84 equatorial)
F_E       = 1.0/298.257223563    # WGS84 flattening
J2        = 1.08262668e-3
SID_DAY   = 86164.0905           # s, one sidereal rotation
SID_RATE  = 360.0*3600.0/SID_DAY # arcsec of arc per second of time = 15.041067
DEG       = math.pi/180.0

# ----------------------------- time helpers ---------------------------------
def jd_from_datetime(t):
    """UTC datetime -> Julian date (UT1≈UTC is fine at our accuracy)."""
    y, m = t.year, t.month
    if m <= 2: y -= 1; m += 12
    A = y//100; B = 2 - A + A//4
    day = t.day + (t.hour + (t.minute + (t.second + t.microsecond/1e6)/60.0)/60.0)/24.0
    return int(365.25*(y+4716)) + int(30.6001*(m+1)) + day + B - 1524.5

def gmst_deg(jd):
    """Greenwich Mean Sidereal Time, degrees (IAU 1982; plenty for this task)."""
    T = (jd - 2451545.0)/36525.0
    g = 280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T*T - T*T*T/38710000.0
    return g % 360.0

def lmst_deg(jd, east_lon_deg):
    return (gmst_deg(jd) + east_lon_deg) % 360.0

def hms(deg_val):
    h = (deg_val % 360.0)/15.0
    hh = int(h); mm = int((h-hh)*60); ss = (h-hh-mm/60.0)*3600.0
    return f"{hh:02d}:{mm:02d}:{ss:05.2f}"

def dms(deg_val):
    s = '-' if deg_val < 0 else '+'
    d = abs(deg_val); dd = int(d); mm = int((d-dd)*60); ss = (d-dd-mm/60.0)*3600.0
    return f"{s}{dd:02d}:{mm:02d}:{ss:04.1f}"

def sign_hms(deg_val):
    """Signed hours:mm:ss for an hour angle given in degrees (±180 wrap)."""
    d = ((deg_val + 180) % 360) - 180
    s = '-' if d < 0 else '+'
    h = abs(d)/15.0; hh = int(h); mm = int((h-hh)*60); ss = (h-hh-mm/60.0)*3600.0
    return f"{s}{hh:02d}:{mm:02d}:{ss:04.1f}"

def altaz(ha_deg, dec_deg, lat_deg):
    """Alt/Az (deg) from hour angle, declination, latitude. Az from NORTH through EAST."""
    H, d, phi = ha_deg*DEG, dec_deg*DEG, lat_deg*DEG
    alt = math.asin(math.sin(phi)*math.sin(d) + math.cos(phi)*math.cos(d)*math.cos(H))
    az  = math.atan2(-math.sin(H)*math.cos(d),
                     math.sin(d)*math.cos(phi) - math.cos(d)*math.sin(phi)*math.cos(H))
    return math.degrees(alt), math.degrees(az) % 360.0

# ----------------------------- TLE handling ---------------------------------
class TLE:
    def __init__(self, name, l1, l2):
        self.name, self.l1, self.l2 = name.strip(), l1.rstrip(), l2.rstrip()
        t1, t2 = self.l1.split(), self.l2.split()
        self.norad = int(re.sub(r'\D', '', t1[1]))
        ep = t1[3]                                   # YYDDD.DDDDDDDD
        yy = int(ep[:2]); year = 2000+yy if yy < 57 else 1900+yy
        doy = float(ep[2:])
        self.epoch = dt.datetime(year,1,1,tzinfo=dt.timezone.utc) + dt.timedelta(days=doy-1.0)
        self.incl  = float(t2[2])*DEG
        self.raan  = float(t2[3])*DEG
        self.ecc   = float('0.'+re.sub(r'\D','',t2[4]))
        self.argp  = float(t2[5])*DEG
        self.M0    = float(t2[6])*DEG
        m = re.match(r'(\d{1,2}\.\d{8})', t2[7])     # mean motion may be glued to rev#
        self.n_rev = float(m.group(1))               # rev/day
        self.n     = self.n_rev*2*math.pi/86400.0    # rad/s
        self.a     = (MU_E/self.n**2)**(1.0/3.0)     # km (mean)

def parse_tle_text(text):
    """Tolerant 3LE parser: accepts strict TLEs or whitespace-collapsed copies."""
    lines = [ln.strip() for ln in text.replace('\r','\n').split('\n') if ln.strip()]
    out, i = [], 0
    while i < len(lines)-1:
        if lines[i].startswith('1 ') and i+1 < len(lines) and lines[i+1].startswith('2 '):
            name = lines[i-1] if i > 0 and not lines[i-1][0].isdigit() or (i>0 and not lines[i-1].startswith(('1 ','2 '))) else f"NORAD {lines[i].split()[1]}"
            try: out.append(TLE(name, lines[i], lines[i+1]))
            except Exception as e: print(f"  ! skipped a TLE near '{lines[i][:30]}…': {e}", file=sys.stderr)
            i += 2
        else:
            i += 1
    return out

def fetch_tles(ids, source):
    import requests
    out = []
    if source == 'celestrak':
        for nid in ids:
            r = requests.get('https://celestrak.org/NORAD/elements/gp.php',
                             params={'CATNR': nid, 'FORMAT': 'TLE'}, timeout=30)
            r.raise_for_status()
            got = parse_tle_text(r.text)
            if got: out.append(got[0])
            else:   print(f"  ! no TLE returned for {nid}", file=sys.stderr)
    elif source == 'satchecker':
        # IAU CPS SatChecker; newest epoch in the returned window is used.
        # Docs: https://satchecker.readthedocs.io/en/stable/tools_tle.html
        for nid in ids:
            r = requests.get('https://satchecker.cps.iau.org/tools/get-tle-data/',
                             params={'id': nid, 'id_type': 'catalog'}, timeout=30)
            r.raise_for_status()
            rows = r.json()
            if not rows:
                print(f"  ! SatChecker returned nothing for {nid}", file=sys.stderr); continue
            best = max(rows, key=lambda d: d.get('epoch',''))
            out.append(TLE(best.get('satellite_name', f'NORAD {nid}'),
                           best['tle_line1'], best['tle_line2']))
    return out

def fetch_geo_group():
    import requests
    r = requests.get('https://celestrak.org/NORAD/elements/gp.php',
                     params={'GROUP':'geo','FORMAT':'TLE'}, timeout=60)
    r.raise_for_status()
    return parse_tle_text(r.text)

# ----------------------- propagation: SGP4 or fallback ----------------------
try:
    from sgp4.api import Satrec, jday
    HAVE_SGP4 = True
except Exception:
    HAVE_SGP4 = False

def teme_pos_sgp4(tle, jd):
    sat = tle._satrec
    fr  = jd - int(jd) - 0.5
    e, r, v = sat.sgp4(int(jd)+0.5, fr)
    if e != 0: return None
    return np.array(r)

def teme_pos_kepler(tle, jd):
    """Fallback: mean-Kepler + J2 secular drift of RAAN/argp/M. GEO-adequate (~arcmin)."""
    t   = (jd - jd_from_datetime(tle.epoch))*86400.0     # s since epoch
    a,e,i = tle.a, tle.ecc, tle.incl
    p   = a*(1-e*e)
    n   = tle.n
    fac = 1.5*J2*(R_E/p)**2*n
    raan = tle.raan - fac*math.cos(i)*t
    argp = tle.argp + fac*(2-2.5*math.sin(i)**2)*t
    M    = tle.M0 + n*t + fac*math.sqrt(1-e*e)*(1-1.5*math.sin(i)**2)*t
    E = M
    for _ in range(12): E = M + e*math.sin(E)
    nu = 2*math.atan2(math.sqrt(1+e)*math.sin(E/2), math.sqrt(1-e)*math.cos(E/2))
    r  = p/(1+e*math.cos(nu))
    # perifocal -> TEME-of-date via 3-1-3
    x, y = r*math.cos(nu), r*math.sin(nu)
    ca,sa = math.cos(argp), math.sin(argp); ci,si = math.cos(i), math.sin(i)
    cr,sr = math.cos(raan), math.sin(raan)
    x1,y1 = x*ca - y*sa, x*sa + y*ca
    y2,z2 = y1*ci, y1*si
    return np.array([x1*cr - y2*sr, x1*sr + y2*cr, z2])

# --------------------------- frames & topocentrics ---------------------------
def observer_ecef(lat_deg, lon_deg, h_m):
    lat, lon = lat_deg*DEG, lon_deg*DEG
    C = 1.0/math.sqrt(1 - (2*F_E - F_E*F_E)*math.sin(lat)**2)
    S = C*(1-F_E)**2
    r = (R_E*C + h_m/1000.0)*math.cos(lat)
    return np.array([r*math.cos(lon), r*math.sin(lon), (R_E*S + h_m/1000.0)*math.sin(lat)])

def precession_matrix_of_date_to_j2000(jd):
    """IAU-1976 precession: rotates a mean-of-date vector into J2000."""
    T = (jd - 2451545.0)/36525.0
    z  = (2306.2181*T + 1.09468*T*T + 0.018203*T**3)/3600.0*DEG
    th = (2004.3109*T - 0.42665*T*T - 0.041833*T**3)/3600.0*DEG
    ze = (2306.2181*T + 0.30188*T*T + 0.017998*T**3)/3600.0*DEG
    cz,sz = math.cos(z),math.sin(z); ct,st = math.cos(th),math.sin(th); cZ,sZ = math.cos(ze),math.sin(ze)
    # P (J2000->of date) = Rz(-z) Ry(th) Rz(-zeta); we want its transpose
    P = np.array([[ cz*ct*cZ - sz*sZ, -cz*ct*sZ - sz*cZ, -cz*st],
                  [ sz*ct*cZ + cz*sZ, -sz*ct*sZ + cz*cZ, -sz*st],
                  [ st*cZ,            -st*sZ,             ct   ]])
    return P.T

try:
    import astropy.units as u
    from astropy.time import Time
    from astropy.coordinates import TEME, GCRS, ITRS, EarthLocation, CartesianRepresentation
    HAVE_ASTROPY = True
except Exception:
    HAVE_ASTROPY = False

def topo_radec_za(tle, jd, site):
    """Topocentric RA/DEC (J2000), zenith angle (deg), subsat lon (deg E), or None."""
    r_teme = teme_pos_sgp4(tle, jd) if HAVE_SGP4 else teme_pos_kepler(tle, jd)
    if r_teme is None: return None
    lat, lon, h = site
    if HAVE_ASTROPY:
        t   = Time(jd, format='jd', scale='utc')
        teme = TEME(CartesianRepresentation(r_teme*u.km), obstime=t)
        loc  = EarthLocation(lat=lat*u.deg, lon=lon*u.deg, height=h*u.m)
        gcrs = teme.transform_to(GCRS(obstime=t, obsgeoloc=loc.get_gcrs_posvel(t)[0],
                                      obsgeovel=loc.get_gcrs_posvel(t)[1]))
        ra, dec = gcrs.ra.deg, gcrs.dec.deg
        itrs = teme.transform_to(ITRS(obstime=t))
        sublon = math.degrees(math.atan2(itrs.y.value, itrs.x.value))
        rho_ecef = np.array([itrs.x.value,itrs.y.value,itrs.z.value]) - observer_ecef(lat,lon,h)
    else:
        gm = gmst_deg(jd)*DEG
        # observer into TEME-of-date (Earth-fixed rotated by GMST)
        oe = observer_ecef(lat, lon, h)
        cg, sg = math.cos(gm), math.sin(gm)
        o_teme = np.array([oe[0]*cg - oe[1]*sg, oe[0]*sg + oe[1]*cg, oe[2]])
        rho = r_teme - o_teme
        rho_j2000 = precession_matrix_of_date_to_j2000(jd) @ rho
        ra  = math.degrees(math.atan2(rho_j2000[1], rho_j2000[0])) % 360.0
        dec = math.degrees(math.asin(rho_j2000[2]/np.linalg.norm(rho_j2000)))
        # subsat lon + local vector in ECEF
        s_ecef = np.array([ r_teme[0]*cg + r_teme[1]*sg, -r_teme[0]*sg + r_teme[1]*cg, r_teme[2]])
        sublon = math.degrees(math.atan2(s_ecef[1], s_ecef[0]))
        rho_ecef = s_ecef - oe
    # zenith angle from the geodetic up-vector
    latr, lonr = lat*DEG, lon*DEG
    up = np.array([math.cos(latr)*math.cos(lonr), math.cos(latr)*math.sin(lonr), math.sin(latr)])
    za = math.degrees(math.acos(np.dot(rho_ecef, up)/np.linalg.norm(rho_ecef)))
    return ra, dec, za, ((sublon+540)%360)-180

# ------------------------------- core search --------------------------------
def southern_peak(tle, jd0, site, hours=24.0, step_s=120.0):
    """Find the southernmost topocentric DEC in [jd0, jd0+hours]; refine; return record."""
    n = int(hours*3600/step_s)+1
    jds  = jd0 + np.arange(n)*step_s/86400.0
    decs = np.full(n, np.nan); ras = np.full(n, np.nan)
    for k, jd in enumerate(jds):
        got = topo_radec_za(tle, jd, site)
        if got: ras[k], decs[k] = got[0], got[1]
    if np.all(np.isnan(decs)): return None
    k = int(np.nanargmin(decs))
    # parabolic refinement on the three points around the minimum
    jd_pk = jds[k]
    if 0 < k < n-1 and not (np.isnan(decs[k-1]) or np.isnan(decs[k+1])):
        d1, d2, d3 = decs[k-1], decs[k], decs[k+1]
        den = (d1 - 2*d2 + d3)
        if abs(den) > 1e-12:
            jd_pk = jds[k] + 0.5*(d1-d3)/den * (step_s/86400.0)
    got = topo_radec_za(tle, jd_pk, site)
    if not got: return None
    ra, dec, za, sublon = got
    # rates from central differences +/- 30 s
    dtd = 30.0/86400.0
    a1 = topo_radec_za(tle, jd_pk-dtd, site); a2 = topo_radec_za(tle, jd_pk+dtd, site)
    if not (a1 and a2): return None
    dra = ((a2[0]-a1[0]+540) % 360 - 180)*3600.0/60.0     # arcsec of RA-angle per second
    ddec = (a2[1]-a1[1])*3600.0/60.0
    return dict(name=tle.name, norad=tle.norad, jd=jd_pk,
                lmst=lmst_deg(jd_pk, site[1]), ra=ra, dec=dec, za=za, sublon=sublon,
                ra_rate=dra, ra_off=dra-SID_RATE, dec_rate=ddec,
                incl=tle.incl/DEG,
                age_d=jd_pk-jd_from_datetime(tle.epoch),
                track=(jds, ras.copy(), decs.copy()))

# ---------------------------------- main -------------------------------------
def main():
    ap = argparse.ArgumentParser(description="GEO southern-declination-peak observing list (default site: CTIO)")
    ap.add_argument('--targets', help='file of NORAD catalog IDs (one per line, # comments)')
    ap.add_argument('--all-geo', action='store_true', help='use the whole CelesTrak GEO group')
    ap.add_argument('--tle-file', help='local 3LE file (offline mode)')
    ap.add_argument('--source', choices=['celestrak','satchecker'], default='celestrak')
    ap.add_argument('--site', nargs=3, type=float, default=[-30.16528, -70.80644, 2200.0],
                    metavar=('LAT','LON_E','H_M'), help='site lat, EAST lon (deg), height (m); default CTIO')
    ap.add_argument('--start', help='UTC start ISO time (default: now); window is 24 h')
    ap.add_argument('--min-alt', type=float, default=20.0, help='drop peaks below this elevation (deg)')
    ap.add_argument('--fov', type=float, default=2.2, help='field-of-view DIAMETER in degrees '
                    '(default 2.2 = DECam); pointing DEC = peak DEC + 0.75*(FOV/2)')
    ap.add_argument('--step', type=float, default=120.0, help='coarse search step (s)')
    ap.add_argument('--outdir', default='.', help='output directory')
    args = ap.parse_args()

    t0 = (dt.datetime.fromisoformat(args.start).replace(tzinfo=dt.timezone.utc)
          if args.start else dt.datetime.now(dt.timezone.utc))
    jd0 = jd_from_datetime(t0)
    site = tuple(args.site)
    tag = t0.strftime('%Y%m%d')

    print(f"# geo_peaks — site lat {site[0]:.4f}, lon {site[1]:.4f} E, h {site[2]:.0f} m")
    print(f"# window: {t0.isoformat()}  + 24 h   |  engines: "
          f"{'SGP4/SDP4' if HAVE_SGP4 else 'FALLBACK mean-Kepler+J2 (install sgp4!)'} + "
          f"{'astropy frames' if HAVE_ASTROPY else 'built-in frames (IAU-1976 precession, no nutation)'}")
    print("# SIGN CONVENTION: RA rate > 0 = RA increasing (eastward). "
          f"Sidereal ref = {SID_RATE:.4f}\"/s (LMST rate = ideal geostationary RA rate).")
    print("#   offset Δ = RA rate − sidereal ref;  Δ>0 ⇒ drifting EAST of a geostationary point.\n")

    # ---- gather TLEs
    if args.tle_file:
        tles = parse_tle_text(open(args.tle_file).read())
    elif args.all_geo:
        tles = fetch_geo_group()
    elif args.targets:
        ids = [ln.split()[0] for ln in open(args.targets)
               if ln.strip() and not ln.lstrip().startswith('#')]
        tles = fetch_tles(ids, args.source)
    else:
        ap.error('need --targets, --all-geo, or --tle-file')
    if HAVE_SGP4:
        for tle in tles:
            tle._satrec = Satrec.twoline2rv(tle.l1, tle.l2)
    print(f"# {len(tles)} TLEs loaded\n")

    # ---- find peaks
    rows = []
    for tle in tles:
        rec = southern_peak(tle, jd0, site, step_s=args.step)
        if rec is None: continue
        if 90.0-rec['za'] < args.min_alt: continue
        rows.append(rec)
    rows.sort(key=lambda r: r['lmst'])

    # ---- pointing solutions (object 75% of the way to the SOUTHERN FOV edge at peak)
    for r in rows:
        r['p_dec'] = r['dec'] + 0.75*(args.fov/2.0)
        r['p_ra']  = r['ra']
        r['p_ha']  = ((r['lmst'] - r['p_ra'] + 180) % 360) - 180     # deg; >0 = WEST of meridian
        r['p_alt'], r['p_az'] = altaz(r['p_ha'], r['p_dec'], site[0])

    # ---- console table + CSV
    print(f"# pointing: FOV {args.fov:.2f}° ⇒ field center = object DEC + {0.75*args.fov/2.0:.3f}° "
          "(object sits 75% of the way to the SOUTHERN FOV edge at culmination, then climbs back north)")
    print("# HA = LMST − RA; HA > 0 = WEST of meridian (RA−LMST is its negative). AZ from N through E.\n")
    hdr = (f"{'LMST':>11} {'UT':>8} {'NORAD':>6}  {'name':<20} {'objRA':>11} {'objDEC':>10} "
           f"{'pntRA':>11} {'pntDEC':>10} {'pntHA':>11} {'alt':>5} {'az':>6} "
           f"{'RArate':>7} {'Δsid':>7} {'ZA':>5} {'lonE':>7} {'incl':>5}")
    print(hdr); print('-'*len(hdr))
    os.makedirs(args.outdir, exist_ok=True)
    csv_path = os.path.join(args.outdir, f'geo_peaks_{tag}.csv')
    with open(csv_path,'w',newline='') as f:
        w = csv.writer(f)
        w.writerow(['lmst_hms','lmst_deg','ut_iso','norad','name',
                    'obj_ra_j2000_deg','obj_dec_j2000_deg','obj_ra_hms','obj_dec_dms',
                    'point_ra_j2000_deg','point_dec_j2000_deg','point_ra_hms','point_dec_dms',
                    'point_ha_deg','point_ha_hms_signed','point_ra_minus_lmst_deg',
                    'point_alt_deg','point_az_deg_N_thru_E',
                    'ra_rate_arcsec_per_s','ra_rate_offset_from_sidereal_arcsec_per_s',
                    'dec_rate_arcsec_per_s','obj_zenith_angle_deg','subsat_lon_deg_east',
                    'tle_incl_deg','tle_age_days','fov_deg'])
        for r in rows:
            ut = (dt.datetime(2000,1,1,12,tzinfo=dt.timezone.utc)
                  + dt.timedelta(days=r['jd']-2451545.0))
            print(f"{hms(r['lmst']):>11} {ut.strftime('%H:%M:%S'):>8} {r['norad']:>6}  {r['name'][:20]:<20} "
                  f"{hms(r['ra']):>11} {dms(r['dec']):>10} {hms(r['p_ra']):>11} {dms(r['p_dec']):>10} "
                  f"{sign_hms(r['p_ha']):>11} {r['p_alt']:>5.1f} {r['p_az']:>6.1f} "
                  f"{r['ra_rate']:>7.3f} {r['ra_off']:>+7.3f} {r['za']:>5.1f} {r['sublon']:>7.2f} {r['incl']:>5.2f}")
            w.writerow([hms(r['lmst']), f"{r['lmst']:.5f}", ut.isoformat(), r['norad'], r['name'],
                        f"{r['ra']:.6f}", f"{r['dec']:.6f}", hms(r['ra']), dms(r['dec']),
                        f"{r['p_ra']:.6f}", f"{r['p_dec']:.6f}", hms(r['p_ra']), dms(r['p_dec']),
                        f"{r['p_ha']:.5f}", sign_hms(r['p_ha']), f"{-r['p_ha']:.5f}",
                        f"{r['p_alt']:.3f}", f"{r['p_az']:.3f}",
                        f"{r['ra_rate']:.4f}", f"{r['ra_off']:+.4f}", f"{r['dec_rate']:.4f}",
                        f"{r['za']:.2f}", f"{r['sublon']:.3f}", f"{r['incl']:.3f}",
                        f"{r['age_d']:.2f}", f"{args.fov:.2f}"])
    print(f"\n# wrote {csv_path}  ({len(rows)} objects above {args.min_alt}° elevation at peak)")

    if not rows: return

    # ---- plots ---------------------------------------------------------------
    # 1) DEC vs LMST tracks with the southern peaks marked
    fig, ax = plt.subplots(figsize=(13,7))
    cmap = plt.cm.viridis(np.linspace(0,1,len(rows)))
    for c, r in zip(cmap, rows):
        jds, ras, decs = r['track']
        lm = np.array([lmst_deg(j, site[1]) for j in jds])/15.0
        order = np.argsort(lm)
        # split at wraps for clean lines
        lm_s, dec_s = lm[order], decs[order]
        ax.plot(lm_s, dec_s, '-', color=c, lw=0.8, alpha=0.7)
        ax.plot(r['lmst']/15.0, r['dec'], 'v', color=c, ms=7, mec='k', mew=0.4)
        ax.annotate(str(r['norad']), (r['lmst']/15.0, r['dec']), fontsize=6,
                    textcoords='offset points', xytext=(0,-9), ha='center')
    ax.set_xlabel('LMST (h)'); ax.set_ylabel('topocentric DEC (°, J2000)')
    ax.set_title(f"GEO-belt declination tracks from site ({site[0]:.3f}°, {site[1]:.3f}°E) — ▼ southern peaks — {tag}")
    ax.grid(alpha=0.3); ax.set_xlim(0,24)
    fig.tight_layout(); fig.savefig(os.path.join(args.outdir, f'dec_vs_lmst_{tag}.png'), dpi=150); plt.close(fig)

    # 2) sky positions of the peaks: RA vs DEC, color = LMST, size ~ elevation
    fig, ax = plt.subplots(figsize=(13,6))
    sc = ax.scatter([r['ra']/15.0 for r in rows], [r['dec'] for r in rows],
                    c=[r['lmst']/15.0 for r in rows], s=[(95-r['za'])*3 for r in rows],
                    cmap='plasma', edgecolor='k', linewidth=0.4)
    for r in rows:
        ax.annotate(str(r['norad']), (r['ra']/15.0, r['dec']), fontsize=6,
                    textcoords='offset points', xytext=(0,7), ha='center')
    plt.colorbar(sc, ax=ax, label='LMST of southern peak (h)')
    ax.set_xlabel('RA (h, J2000)'); ax.set_ylabel('DEC (°, J2000)'); ax.invert_xaxis()
    ax.set_title(f'Southern-peak sky positions (marker size ∝ elevation) — {tag}')
    ax.grid(alpha=0.3)
    fig.tight_layout(); fig.savefig(os.path.join(args.outdir, f'peaks_sky_{tag}.png'), dpi=150); plt.close(fig)

    # 3) RA-rate offset from sidereal vs LMST
    fig, ax = plt.subplots(figsize=(13,5))
    x = [r['lmst']/15.0 for r in rows]; y = [r['ra_off'] for r in rows]
    ax.axhline(0, color='k', lw=0.8)
    ax.scatter(x, y, c=[abs(r['incl']) for r in rows], cmap='coolwarm', edgecolor='k', linewidth=0.4)
    for r in rows:
        ax.annotate(str(r['norad']), (r['lmst']/15.0, r['ra_off']), fontsize=6,
                    textcoords='offset points', xytext=(0,6), ha='center')
    cb = plt.colorbar(ax.collections[0], ax=ax); cb.set_label('TLE inclination (°)')
    ax.set_xlabel('LMST of southern peak (h)')
    ax.set_ylabel('RA-rate offset from sidereal (″/s)\nΔ>0 = east of geostationary')
    ax.set_title(f'Tracking-rate offsets at the southern peaks — {tag}')
    ax.grid(alpha=0.3)
    fig.tight_layout(); fig.savefig(os.path.join(args.outdir, f'rate_offsets_{tag}.png'), dpi=150); plt.close(fig)
    print(f"# wrote dec_vs_lmst_{tag}.png, peaks_sky_{tag}.png, rate_offsets_{tag}.png")

if __name__ == '__main__':
    main()
