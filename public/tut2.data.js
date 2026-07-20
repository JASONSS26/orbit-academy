/* Representative real GEO satellites at their actual longitude slots (public assignments).
   Positioned analytically on the belt — representative, not a live ephemeris pull.
   [name, longitude °E]  (negative = °W). */
const GEO_SATS = [
  ["GOES-East (US weather)", -75.2],
  ["GOES-West (US weather)", -137.0],
  ["GOES-19",                -89.5],
  ["TDRS-10 (NASA relay)",   -41.0],
  ["Intelsat 35e",           -34.5],
  ["SES-1",                 -101.0],
  ["Galaxy 30",             -125.0],
  ["XM-1 “Roll” (SiriusXM)",-115.25],  // XM Radio satellites — real names: Rock, Roll, Rhythm, Blues
  ["XM-2 “Rock” (SiriusXM)", -85.15],
  ["Meteosat-11 (EU)",         0.0],
  ["Eutelsat 7A (EU)",         7.0],
  ["Hotbird (EU TV)",         13.0],
  ["Astra 19.2°E (EU TV)",    19.2],
  ["Yamal 402 (Russia)",      55.0],
  ["Insat-4B (India)",        93.5],
  ["JCSAT (Japan)",          128.0],
  ["Optus (Australia)",      160.0],
];
