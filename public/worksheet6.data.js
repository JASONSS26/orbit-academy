/* Worksheet 6 — Observability (SEED / not yet live).
   ---------------------------------------------------------------------------
   This is a parking file for Module 6. It holds observability tasks that were
   originally prototyped inside Module 2 (resolvability, endpoint astrometry,
   and the arcminute/arcsecond angle unit) and moved here during the v1.2/1.3
   rebalance so Module 2 stays focused on the GEO belt, geosync, and frames.

   NOT yet registered in quiz.js and NOT in the server COURSE as a buildable
   worksheet — Module 6 needs its own tool first (see docs/MODULE_NOTES.md:
   reflected-sunlight illumination, eclipse/shadow, telescope-FOV streaks,
   radar 1/r⁴ link budget, four observability modes). When that tool exists,
   flesh out the intro/parts/summary and register t6.

   The `d1`/`d2` ids below are kept from their Module-2 origin; renumber freely
   when Module 6 is built out. */
const WORKSHEET = {
  intro: [
    'Module 6 (Observability) — placeholder. This module will cover HOW we actually see and measure space objects: reflected sunlight and satellite illumination (the same physics as Moon phases), eclipse/shadow, radar vs. optical, the telescope field of view, and how a streaked image yields a position and a motion.',
  ],
  parts: [
    { title:'PART A · What a sensor can and cannot resolve', tasks:['c4'] },
    { title:'PART B · Getting a position from an image',      tasks:['c5'] },
    { title:'PART C · Measuring angles (arcmin & arcsec)',    tasks:['d1','d2'] },
  ],
  tasks: [
    { id:'c4', title:'Can you see its solar panels from the ground?',
      do:'Picture a GEO satellite (~30 m across) at 36,000 km, seen through a ground telescope.',
      observe:'a 30 m satellite at 36,000 km spans only ~0.2 arcseconds. The atmosphere blurs everything to ~1 arcsecond, so from the ground it is an unresolvable point of light — you detect it and track it, but you cannot see its shape.',
      quiz:{ q:'Through a ground telescope, can you make out a GEO satellite’s solar panels and dish?',
        opts:['Yes, with a big enough telescope','No — at ~0.2″ it’s far below the ~1″ atmospheric blur; it’s just a point. You’d need to fly up close (or use a space telescope)',
              'Yes, but only at night','Only if it’s geostationary'],
        a:1, why:'Correct — the satellite is ~0.2″ across; atmospheric “seeing” smears any ground image to ~1″, so it stays a point. From the ground you get position and brightness, not shape. Resolving components needs an inspector satellite flying alongside, or a space telescope.',
        feedback:['Aperture can’t beat the atmosphere — seeing (~1″) blurs it regardless of telescope size.','','Darkness helps you detect it, but not resolve its ~0.2″ shape.','All GEO sats have this problem — they’re all ~36,000 km away.'] } },
    { id:'c5', title:'How do you measure a streaked object’s position?',
      do:'Look at a time-exposure image. A point (a tracked object) is easy to pin down — but how would you assign a position to a STREAK (a star, or an untracked satellite)?',
      observe:'a streak records where the object was over the whole exposure. Analysts fit the streak’s two endpoints — one is the position at shutter-open, the other at shutter-close — with a precise time tagged to each, giving two timed measurements from one image (plus the direction of motion).',
      quiz:{ q:'You have a time-exposure with a streaked object. What’s the best way to get a precise position (and even its motion) from it?',
        opts:['You can’t — streaks are useless for position',
              'Measure the two ENDPOINTS of the streak, each tagged with the shutter open/close time — giving two timed positions and the direction of travel',
              'Measure only the brightest single pixel','Average the whole streak into one blurry blob'],
        a:1, why:'Correct — the streak’s endpoints are the object’s positions at shutter-open and shutter-close. Tag each with its precise time and you get TWO position measurements (and the motion direction/rate) from a single frame. For an untracked object this is how one image yields a mini-track. (A point source, by contrast, is measured to a fraction of a pixel by finding its brightness center.)',
        feedback:['Streaks are actually information-rich — the endpoints carry timed positions.','','The brightest pixel ignores the timing and the motion the streak records.','Averaging throws away the very information (endpoints + times) that makes a streak useful.'] } },
    { id:'d1', title:'Arcminutes and arcseconds',
      do:'Read carefully — this is a key vocabulary. We measure positions in the sky as ANGLES.',
      observe:'1 full circle = 360 degrees. 1 degree = 60 arcminutes (′). 1 arcminute = 60 arcseconds (″). So 1 degree = 3,600 arcseconds. (The full Moon is about ½ degree = 30 arcminutes across.)',
      quiz:{ q:'How many arcseconds are in one degree?',
        opts:['60','360','3,600','86,400'],
        a:2, why:'Correct — 60 arcminutes per degree × 60 arcseconds per arcminute = 3,600 arcseconds in a degree. Arcseconds are tiny: a satellite’s position is often pinned to a few arcseconds.',
        feedback:['60 is arcminutes per degree — you need one more factor of 60 for arcseconds.','360 is degrees in a full circle, not arcseconds in a degree.','','86,400 is the number of SECONDS OF TIME in a day — a different thing entirely (that’s the trap in the next question!).'] } },
    { id:'d2', title:'Don’t confuse arcseconds with seconds of TIME',
      do:'Think about the two very different meanings of “second.”',
      observe:'a SECOND OF TIME is 1/86,400 of a day (24 h × 60 × 60). An ARCSECOND is 1/1,296,000 of a full circle (360° × 60 × 60) — a measure of ANGLE, not time. Same word, totally different quantity. A fixed telescope watches stars drift at about 15 arcseconds of ANGLE per second of TIME.',
      quiz:{ q:'“Arcseconds” and “seconds” sound alike but mean different things. Which statement is correct?',
        opts:['They’re the same unit','An arcsecond measures ANGLE (1/3600 of a degree); a second measures TIME (1/86,400 of a day)','An arcsecond is 60 seconds of time','Both measure time'],
        a:1, why:'Correct — an arcsecond is an angle (1/3600 of a degree), a second is a duration. Stars streak past a fixed telescope at ~15 arcseconds of angle per second of time — the number ties the two together but they are NOT the same unit.',
        feedback:['They only sound alike — one is angle, one is time.','','An arcsecond has nothing to do with 60 seconds of time.','Only one of them measures time; the other measures angle.'] } },
  ],
  summary: [],
  resources: [
    { t:'Minute and second of arc', u:'https://en.wikipedia.org/wiki/Minute_and_second_of_arc' },
    { t:'Astronomical seeing (atmospheric blur)', u:'https://en.wikipedia.org/wiki/Astronomical_seeing' },
    { t:'Astrometry', u:'https://en.wikipedia.org/wiki/Astrometry' },
  ],
};
