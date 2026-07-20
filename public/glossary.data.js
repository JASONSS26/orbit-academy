/* Orbit Academy — glossary of terms. Each entry: {term, defn, mod (module number/tag), also:[aliases]}.
   Rendered + searched by glossary.html. Plain, non-specialist definitions matching the course voice. */
const GLOSSARY = [
  // ---- Module 1: orbits ----
  {term:'Orbit', mod:1, defn:'A path a spacecraft follows around a body under gravity. It is really continuous <b>free-fall</b>: the craft is pulled toward the body but moves sideways fast enough that it keeps missing.'},
  {term:'Free fall', mod:1, also:['falling sideways'], defn:'Motion under gravity alone, with no support. An orbiting satellite is in free fall — it is falling toward Earth but moving sideways fast enough to keep missing the ground.'},
  {term:'Circular orbit', mod:1, defn:'An orbit that holds a constant altitude — the special case of an ellipse with zero flattening (eccentricity 0).'},
  {term:'Elliptical orbit', mod:1, defn:'An oval orbit. The closest point to Earth is <b>perigee</b>, the farthest is <b>apogee</b>. Speed is highest at perigee, lowest at apogee.'},
  {term:'Perigee', mod:1, also:['perilune','periapsis'], defn:'The closest point of an orbit to the body it circles. (Around the Moon it is <b>perilune</b>; generically, periapsis.) The satellite moves fastest here.'},
  {term:'Apogee', mod:1, also:['apolune','apoapsis'], defn:'The farthest point of an orbit from the body it circles. (Around the Moon, <b>apolune</b>.) The satellite moves slowest here.'},
  {term:'Escape velocity', mod:1, defn:'The speed at which an orbit opens up and never returns — about <b>11.2 km/s</b> from Earth’s surface, less from a high orbit. Below it you stay bound; at or above it you escape.'},
  {term:'Prograde', mod:1, defn:'Moving in the same direction as the body’s spin (eastward for Earth). A prograde burn speeds you up along your path.'},
  {term:'Retrograde', mod:1, defn:'Moving against the body’s spin (westward for Earth). A retrograde burn slows you down along your path.'},
  {term:'LEO (Low Earth Orbit)', mod:1, also:['low earth orbit'], defn:'Orbits a few hundred to ~2,000 km up. Fast (a ~90-minute period) and close — where the ISS and most imaging satellites fly.'},

  // ---- Module 2: rates & geosync ----
  {term:'Angular rate', mod:2, defn:'How fast an object appears to sweep across the sky (degrees per second), as opposed to its true speed in km/s. A low satellite has a high angular rate; a distant one crawls.'},
  {term:'Geosynchronous orbit', mod:2, also:['geosync'], defn:'An orbit with a period of one day, so the satellite returns to the same spot in the sky each day. If it is also over the equator and circular, it is <b>geostationary</b>.'},
  {term:'Geostationary orbit (GEO)', mod:2, also:['geo','geostationary'], defn:'A circular, equatorial geosynchronous orbit at ~35,786 km altitude (42,164 km radius). The satellite appears to <b>hang motionless</b> over one longitude — ideal for communications.'},
  {term:'GEO belt', mod:2, defn:'The ring of geostationary orbit slots over the equator — prime, finite real estate (~360 one-degree slots) that operators must coordinate.'},
  {term:'Sidereal day', mod:2, defn:'Earth’s true rotation period relative to the stars: ~23 h 56 m. The GEO period matches this, not the 24-hour solar day.'},

  // ---- Module 3: naming orbits, TLEs ----
  {term:'Orbital elements', mod:3, also:['keplerian elements','six elements'], defn:'The six numbers that fully name an orbit: its <b>size</b> (semi-major axis), <b>shape</b> (eccentricity), <b>tilt and orientation</b> (inclination, RAAN, argument of perigee), and <b>position along it</b> (true/mean anomaly).'},
  {term:'Semi-major axis', mod:3, defn:'Half the long axis of the orbit ellipse — its overall <b>size</b>. It alone sets the orbital period: same semi-major axis, same period, regardless of shape or tilt.'},
  {term:'Eccentricity', mod:3, defn:'How flattened an orbit is. 0 = a perfect circle; closer to 1 = a long, stretched ellipse; 1 or more = an escape trajectory.'},
  {term:'Inclination', mod:3, defn:'The tilt of the orbit plane relative to the equator, in degrees. 0° = equatorial, 90° = polar (passes over both poles).'},
  {term:'RAAN', mod:3, also:['right ascension of the ascending node'], defn:'Right Ascension of the Ascending Node — the angle that swivels the orbit plane around Earth’s axis. Changing it re-points the orbit but does not change its size, shape, or period.'},
  {term:'Argument of perigee', mod:3, defn:'The angle that rotates the ellipse within its own plane — it sets where perigee sits. Molniya orbits pin it near 270° so apogee stays over the north.'},
  {term:'Mean anomaly', mod:3, defn:'Where the satellite is along its orbit at a given time. Two satellites in the same orbit but at different points differ only in mean anomaly.'},
  {term:'TLE (Two-Line Element set)', mod:3, also:['two-line element'], defn:'A compact text format that encodes an orbit’s six elements plus an epoch. It captures the ideal Keplerian orbit but <b>not</b> perturbations or ongoing thrusting.'},
  {term:'Molniya orbit', mod:3, defn:'A highly eccentric 12-hour orbit with apogee ~40,000 km over the north. By Kepler’s 2nd law it loiters over high latitudes for ~8 of every 12 hours — the Soviets used it because GEO sits too low on the horizon from far north.'},
  {term:'Tundra orbit', mod:3, defn:'Molniya’s bigger cousin: a 24-hour geosynchronous orbit at the same 63.4° inclination but milder eccentricity, tracing a figure-8 ground track. Used by SiriusXM radio and missile-warning satellites.'},

  // ---- Module 4: maneuvers ----
  {term:'Delta-v (Δv)', mod:4, also:['delta v'], defn:'A change in velocity, measured in m/s — the true <b>currency</b> of spaceflight. Every maneuver costs Δv, a satellite launches with a finite budget, and when it runs out the mission is over.'},
  {term:'Burn', mod:4, defn:'Firing a thruster to change velocity. A <b>prograde</b> burn raises the far side of the orbit; a <b>retrograde</b> burn lowers it; a <b>radial</b> burn mostly just tilts the ellipse (wasteful).'},
  {term:'Hohmann transfer', mod:4, also:['two-step transfer'], defn:'The efficient two-burn way to move between circular orbits: burn prograde to raise apogee to the target, then burn again at apogee to circularize. Used for LEO→GTO→GEO.'},
  {term:'GTO (Geostationary Transfer Orbit)', mod:4, defn:'The elliptical transfer orbit with perigee near LEO and apogee at GEO — the stepping stone spacecraft ride on the way up to the GEO belt.'},
  {term:'Atmospheric drag', mod:4, defn:'Thin upper-atmosphere gas pushing on a satellite, sapping energy and shrinking the orbit. Dominant in LEO, negligible above ~1,000 km; it ends in re-entry.'},
  {term:'Perturbation', mod:4, defn:'A small force nudging an orbit away from the ideal Keplerian ellipse — drag, Earth’s equatorial bulge (J2), solar radiation pressure, or a third body’s gravity.'},
  {term:'J2 (oblateness)', mod:4, defn:'The effect of Earth’s equatorial bulge. It slowly rotates orbit planes — exploited in sun-synchronous orbits, and cancelled at the 63.4° "magic inclination" of Molniya/Tundra.'},
  {term:'Sun-synchronous orbit', mod:4, defn:'A near-polar LEO whose plane is nudged by J2 to precess once per year, so it always crosses the equator at the same local sun-time — steady lighting for imaging.'},
  {term:'Radiation pressure', mod:4, also:['solar radiation pressure','HAMR'], defn:'The tiny push of sunlight on a surface. Negligible for dense objects, but significant for high area-to-mass ratio (HAMR) objects like solar sails or thin debris.'},

  // ---- Module 5: cislunar & frames ----
  {term:'xGEO', mod:5, defn:'"Beyond GEO" — the vast region of space farther out than geostationary orbit, extending toward and past the Moon. Increasingly important and hard to surveil.'},
  {term:'Cislunar space', mod:5, defn:'The region between Earth and the Moon (and just beyond). Its motion is governed by Earth and Moon gravity together, making it complex and often chaotic.'},
  {term:'Reference frame', mod:5, defn:'The viewpoint you hold still while watching motion. The same orbit looks completely different in an inertial (fixed-stars) frame vs. a rotating (Earth–Moon) frame — choosing the right one is a superpower.'},
  {term:'Inertial frame (ECI)', mod:5, also:['eci','earth-centered inertial'], defn:'A non-rotating frame fixed relative to the distant stars, centered on Earth. Orbits look like clean Kepler ellipses here.'},
  {term:'Rotating (synodic) frame', mod:5, also:['synodic frame','co-rotating'], defn:'A frame that turns with the Earth–Moon line (once a month). The Moon sits still in it, and Lagrange points hold fixed positions.'},
  {term:'Hill sphere', mod:5, defn:'The region around a body where its gravity dominates over the larger body it orbits. Roughly, the Moon controls objects within ~61,500 km of it (out to about the Earth–Moon L1 point).'},
  {term:'Trans-Lunar Injection (TLI)', mod:5, defn:'The burn that sends a spacecraft from Earth orbit onto a path to the Moon. You must aim ahead — <b>lead the Moon</b> — because the coast takes days, during which the Moon moves.'},

  // ---- Module 6: Lagrange, halos, chaos ----
  {term:'Lagrange point', mod:6, also:['libration point','L1','L2','L3','L4','L5'], defn:'One of five spots where the combined pull of Earth and Moon lets an object keep the <b>same 27.3-day period as the Moon</b>, so it holds station on the rotating Earth–Moon line. L1/L2/L3 are unstable; L4/L5 are stable.'},
  {term:'Halo orbit', mod:6, defn:'A three-dimensional loop <b>around an empty Lagrange point</b> — not a Kepler ellipse and with no body at its center. A spacecraft rides it with occasional station-keeping nudges.'},
  {term:'NRHO', mod:6, also:['near-rectilinear halo orbit'], defn:'A Near-Rectilinear Halo Orbit — a dramatically stretched, near-vertical halo that skims low over one lunar pole and swings far over the other. The path CAPSTONE flew and Gateway will use.'},
  {term:'Jacobi constant', mod:6, defn:'The single conserved energy-like quantity of the rotating three-body frame. It labels an entire family of libration orbits — one number sets a halo’s size, shape, and period.'},
  {term:'Orbital resonance', mod:6, defn:'When orbital periods form a simple ratio (e.g. TESS’s 2:1 with the Moon), so repeated gravitational tugs line up the same way each cycle and <b>average out</b> instead of building up — keeping the orbit stable.'},
  {term:'Chaos (sensitive dependence)', mod:6, also:['chaotic','butterfly effect'], defn:'When tiny differences in starting conditions blow up into huge differences later. Cislunar orbits are chaotic, which is why long-term tracking there is so hard.'},
  {term:'Gravitational slingshot', mod:6, also:['gravity assist','flyby'], defn:'A close pass by a moving body that swings a spacecraft hard, changing its speed and direction "for free." A strong enough slingshot can fling an object <b>unbound</b> out of the system.'},
  {term:'Unbound orbit', mod:6, defn:'A trajectory with enough energy to escape the system entirely (orbital energy ≥ 0) — it leaves and never comes back, unlike a bound (closed) orbit.'},
  {term:'Tidal locking', mod:6, defn:'When a body’s spin matches its orbit so it always shows the same face — like the Moon always facing Earth.'},

  // ---- Module 8: transfers & Artemis (capstone) ----
  {term:'Lunar-Orbit Insertion (LOI)', mod:8, defn:'The braking burn that lets the Moon capture an arriving spacecraft into orbit — fired retrograde near closest approach. Too little and you fly past; too much and you crash.'},
  {term:'Rendezvous', mod:8, defn:'Maneuvering to arrive at the same place and speed as a target object — e.g. matching a satellite’s orbit AND catching up to its position to service it.'},
  {term:'Free-return trajectory', mod:8, defn:'A path that loops around the Moon and comes back to Earth <b>with no insertion burn</b> — the Apollo 13 safety net.'},
  {term:'ILS-style indicator', mod:8, also:['localizer','glideslope'], defn:'A cockpit display, borrowed from aviation, showing whether you are on the correct track and speed: a centered needle / green dial means "on target."'},

  // ---- Module 7: observability ----
  {term:'Active radar', mod:7, defn:'Sensing by bouncing your own radio pulse off a target and timing the echo. It works day or night and in shadow, but its echo falls as <b>range⁴</b> — so it dominates LEO but fades at GEO and beyond.'},
  {term:'Range⁴ law', mod:7, also:['radar equation','range^4'], defn:'A radar echo weakens as the fourth power of distance: the pulse spreads 1/range² going out and the echo 1/range² coming back. Double the range → 16× fainter.'},
  {term:'Reflected sunlight (optical)', mod:7, also:['optical tracking'], defn:'Passive sensing by collecting the sunlight an object reflects — like seeing bicycles only when a truck’s headlights (the Sun) catch them. Works only on sunlit targets against a dark sky.'},
  {term:'Thermal infrared', mod:7, also:['thermal IR'], defn:'Sensing an object’s own emitted heat. Because it does not need sunlight, it can detect a satellite even in Earth’s shadow, where reflected-light optical goes blind.'},
  {term:'Right Ascension & Declination (RA/DEC)', mod:7, also:['ra','dec','right ascension','declination'], defn:'Sky coordinates like longitude (RA, east–west) and latitude (DEC, north–south). A single optical image gives a precise RA/DEC direction — but no distance.'},
  {term:'Parallax', mod:7, defn:'The apparent shift of an object against the background when viewed from two separated vantage points. Nearer objects shift more; the shift plus the known separation gives the distance (the finger-and-eyes trick).'},
  {term:'Range-rate', mod:7, defn:'How fast the distance to a target is changing (closing or opening speed). Radar reads it directly from the Doppler shift of the echo.'},
  {term:'Custody', mod:7, defn:'Keeping continuous track of a known object. It requires re-observing at a <b>cadence</b> set by how fast the orbit prediction goes stale — brisk for chaotic cislunar objects.'},
  {term:'Maneuver detection', mod:7, defn:'Noticing that an object is no longer where its known orbit predicted (beyond measurement error) — meaning it burned. It is custody plus comparison to prediction.'},
  {term:'Cooperative vs. uncooperative', mod:7, defn:'A cooperative object reports its own position (beacon/transponder/GPS); an uncooperative one (debris, a dead or silent satellite) does not. Everything hard about tracking is about the uncooperative ones.'},
  {term:'Orbitology vs. characterization vs. intent', mod:7, defn:'The ladder of knowing a space object: <b>orbitology</b> = where it is / where it’s going; <b>characterization</b> = what it is (size, shape, spin); <b>inferring intent</b> = what it’s doing and why (the hardest).'},
  {term:'Proximity operations', mod:7, also:['prox ops','neighborhood watch'], defn:'One spacecraft maneuvering close to another to inspect, dock with, service, or interfere. A camera stationed in GEO can run a "neighborhood watch" on its neighbors.'},
  {term:'Initial orbit determination (IOD)', mod:7, defn:'Working out an unknown object’s orbit from a few observations. Angles-only IOD is under-determined at first (a range/rate ambiguity) but is resolved as Earth-rotation parallax adds observations across a night.'},
  {term:'Arcminute / arcsecond', mod:7, defn:'Fine units of angle: 1° = 60 arcminutes (′) = 3,600 arcseconds (″). Not to be confused with a second of <b>time</b> — a fixed telescope sees stars drift ~15″ of angle per second of time.'},
  {term:'Graveyard orbit', mod:4, defn:'A disposal orbit a few hundred km above GEO where retired satellites are boosted to clear the belt. From one image a graveyard object is hard to tell from a GEO one — the range/angular-rate ambiguity.'},
];
if (typeof module !== 'undefined') module.exports = GLOSSARY;
