// Where the sun is, and how strong it is, for a region, a season and a time of day.
// Solar position: declination from Cooper's formula, then the standard elevation / azimuth
// equations (solar time, so 12:00 is when the sun is highest). Clear-sky light: Kasten-Young air
// mass and Meinel's beam formula. Good to about a degree, plenty for a tracker demo.

// One desert in each of the three countries this project is for.
export const REGIONS = [
  { id: "cholistan", name: "Cholistan Desert", where: "Bahawalpur, Pakistan", lat: 29.0, lon: 71.9, tz: "Asia/Karachi",
    sand: 0xd9c19a, sand2: 0xc2a57c, rock: 0x9a8268, plant: "shrub" },
  { id: "thar", name: "Thar Desert", where: "Jaisalmer, India", lat: 26.9, lon: 70.9, tz: "Asia/Kolkata",
    sand: 0xe4b26e, sand2: 0xcf9553, rock: 0xa0703f, plant: "shrub" },
  { id: "gobi", name: "Gobi Desert", where: "Dalanzadgad, Mongolia", lat: 43.6, lon: 104.4, tz: "Asia/Ulaanbaatar",
    sand: 0xbfa37a, sand2: 0xa38962, rock: 0x7a7066, plant: "grass" },
];
export const SEASONS = [
  { id: "summer", name: "Summer" }, { id: "spring", name: "Spring" }, { id: "winter", name: "Winter" },
];

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Day of the year for a season, flipped for the southern hemisphere (summer there is December).
export function dayOfYear(seasonId, lat) {
  const north = lat >= 0;
  if (seasonId === "spring") return north ? 80 : 266;
  if (seasonId === "summer") return north ? 172 : 355;
  return north ? 355 : 172;
}

// Sun position: elevation above the horizon and compass azimuth (0 = north, 90 = east), degrees.
export function sunPosition(lat, day, hour) {
  const decl = rad(23.44 * Math.sin(rad(360 / 365 * (284 + day))));
  const phi = rad(lat), H = rad(15 * (hour - 12));
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H);
  const el = Math.asin(clamp(sinEl, -1, 1));
  const cosAz = (Math.sin(decl) - Math.sin(el) * Math.sin(phi)) / (Math.cos(el) * Math.cos(phi));
  let az = deg(Math.acos(clamp(cosAz, -1, 1)));
  if (H > 0) az = 360 - az;   // afternoon: the sun is in the west
  return { el: deg(el), az };
}

// Sunrise and sunset, solar hours.
export function dayLength(lat, day) {
  const decl = rad(23.44 * Math.sin(rad(360 / 365 * (284 + day))));
  const c = clamp(-Math.tan(rad(lat)) * Math.tan(decl), -1, 1), h0 = deg(Math.acos(c)) / 15;
  return { rise: 12 - h0, set: 12 + h0 };
}

// Clear-sky light in W/m²: dni = straight from the sun, dhi = from the whole sky (shade still gets it).
export function clearSky(el) {
  if (el <= 0) return { dni: 0, dhi: el > -6 ? 6 * (el + 6) / 6 : 0 };   // twilight glow, then night
  const am = 1 / (Math.sin(rad(el)) + 0.50572 * Math.pow(el + 6.07995, -1.6364));
  const dni = 1353 * Math.pow(0.7, Math.pow(am, 0.678));
  return { dni, dhi: 6 + 0.1 * dni + 40 * Math.sin(rad(el)) };
}

// The tracker's "front" faces the equator: south in the north, north in the south.
// Returns the sun direction in the 3D model's frame (az 0 = front, + = to the model's right).
export function frontCompass(lat) { return lat >= 0 ? 180 : 0; }
// (Someone standing in front of the panel, facing it, has the model's +x on their right.)
export function toModelAz(compassAz, lat) { return ((frontCompass(lat) - compassAz + 540) % 360) - 180; }

export const fmtHour = h => { const t = ((h % 24) + 24) % 24, hh = Math.floor(t), mm = Math.floor((t - hh) * 60); return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; };
export function partOfDay(el, hour) {
  if (el < -6) return "Night";
  if (el < 0) return hour < 12 ? "Dawn" : "Dusk";
  if (el < 12) return hour < 12 ? "Sunrise" : "Sunset";
  return hour < 11 ? "Morning" : hour < 13 ? "Midday" : "Afternoon";
}
