# geo_peaks — nightly GEO southern-peak observing list (CTIO default)

Standalone planning tool: for each GEO satellite, find the instant in the next 24 h when
it reaches its **maximum southern topocentric declination** (the southern turning point of
its daily analemma arc), and produce an observing list ordered by **LMST**, with a full
**pointing solution** and **tracking rates**, plus three plots and a CSV.

## Install (once)

```bash
pip install numpy matplotlib requests sgp4 astropy
```

`sgp4` and `astropy` are strongly recommended (exact SDP4 propagation + exact frames).
Without them the script still runs on a built-in mean-Kepler + J2 fallback with
IAU-1976 precession (~1–2 arcmin class — planning only); the output header states
which engines were used.

## Run (before each night)

```bash
# your target list (NORAD IDs), fresh TLEs from CelesTrak:
python3 geo_peaks.py --targets targets_example.txt

# every active GEO satellite CelesTrak knows, visible above 25 deg:
python3 geo_peaks.py --all-geo --min-alt 25

# TLEs from the IAU CPS SatChecker instead:
python3 geo_peaks.py --targets ids.txt --source satchecker

# offline, from a saved 3-line-element file; explicit window start; DECam FOV:
python3 geo_peaks.py --tle-file tonight.tle --start 2026-08-15T23:00:00 --fov 2.2
```

Defaults: site = CTIO (−30.16528°, −70.80644° E, 2200 m — override with
`--site LAT LON_E H_M`), window = now + 24 h, FOV = 2.2° (DECam), min elevation 20°.

## Outputs

* `geo_peaks_<date>.csv` + console table, **ordered by LMST of the southern peak**:
  LMST, UT, object RA/DEC (topocentric J2000), **pointing** RA/DEC/HA/alt/az,
  RA rate, RA-rate offset from sidereal, dDEC/dt (≈0 at the peak — sanity check),
  object zenith angle, sub-satellite longitude, TLE inclination and age.
* `dec_vs_lmst_<date>.png` — every object's declination track vs LMST with the
  southern peaks marked (the flat lines at ≈ +4.8° are the controlled zero-inclination
  birds; from a southern site the belt sits ~5° NORTH of the celestial equator).
* `peaks_sky_<date>.png` — peak sky positions (RA/DEC), colored by LMST, sized by elevation.
* `rate_offsets_<date>.png` — RA-rate offset from sidereal vs LMST, colored by inclination.

## Conventions (also printed in every output header)

* **RA rate** = d(RA)/dt of the object, arcsec of arc per second of time.
  **Positive = RA increasing = moving EAST on the sky.** Stars: 0. Ideal geostationary:
  +15.0411″/s (its RA advances exactly at the LMST rate).
* **Sidereal reference** = 15.041067″/s (= 360°/86 164.0905 s).
* **Offset Δ = RA rate − 15.041067″/s.** Δ > 0 ⇒ the object drifts EAST relative to a
  geostationary point (its hour angle decreases); Δ < 0 ⇒ WEST. At the southern peak an
  inclined GEO runs eastward-fast: Δ ≈ 15.04″/s × (1/cos i − 1) × (topocentric factor) —
  e.g. ≈ +0.44″/s for i = 12.6° from CTIO. Zero-inclination birds show Δ ≈ 0, a built-in
  sanity check.
* **Pointing**: field center = object DEC at peak + 0.75 × (FOV/2), same RA — the object
  sits 75% of the way to the SOUTHERN edge of the FOV at culmination, then climbs back
  north through the field for maximum dwell.
* **HA = LMST − RA; HA > 0 = WEST of the meridian** (RA − LMST is its negative, also in
  the CSV). **AZ from NORTH through EAST** (N = 0°, E = 90°).

## TLE sources

* CelesTrak (default): `https://celestrak.org/NORAD/elements/gp.php?CATNR=<id>&FORMAT=TLE`
  (and `GROUP=geo` for `--all-geo`).
* IAU CPS SatChecker (`--source satchecker`):
  `https://satchecker.cps.iau.org/tools/get-tle-data/?id=<id>&id_type=catalog` — the
  newest epoch returned is used. Docs: https://satchecker.readthedocs.io/en/stable/tools_tle.html
* `--tle-file` accepts strict TLEs **or** whitespace-collapsed copies (token-based parser).

## Notes

* GEO TLEs are deep-space element sets: SGP4's SDP4 branch (the `sgp4` package) carries
  the lunisolar terms; the built-in fallback omits them — fine for scheduling, not for
  astrometric prediction.
* Near-zero-inclination satellites have no meaningful southern peak (their declination
  varies only by parallax and eccentricity, ~arcminutes); they still appear in the list —
  use the `tle_incl_deg` column to filter.
* Verified against physics invariants: dDEC/dt ≈ 0 at every reported peak; Δ ≈ 0 for
  zero-inclination objects; Δ at inclined peaks matches the analytic 1/cos i − 1 rate;
  peak hour angles match sub-satellite longitudes.

## Night thirds & solar illumination

The planner finds the night (sun below `--twilight`, default −12°), splits it into
**thirds**, and prints a **NIGHT PLAN**: peaks grouped by third and ranked by **solar
phase angle** (Sun–object–observer; smaller = better lit). This reproduces the
east → meridian → west scheduling rule automatically (the anti-solar point rises in
the east after sunset and sets in the west before dawn). Objects inside **Earth's
shadow** at their peak are flagged `ECL` — never schedule those. The declination-track
plot shades the three thirds.

## Southern vs northern peak

Measured from live TLEs: the topocentric amplification is f ≈ 1.17 at the southern
peak and f ≈ 1.12 at the northern peak from CTIO, so the northern peak buys only
~3–6% more unstreaked time — at roughly **twice the airmass** (e.g. TDRS 3:
ZA 31° south vs 55° north). The southern peak remains the right choice; both curves
are drawn by `lock_window_plot.py`.
