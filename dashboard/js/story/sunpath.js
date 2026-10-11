// Sun math the story needs: where the sun is, how the tracker would face it, and a matching date.
import { sunPosition, toModelAz, REGIONS } from "../sun.js";

const rad = d => d * Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function regionInfo(id) {
  const r = REGIONS.find(x => x.id === id) || REGIONS[0];
  const lon = r.lon ?? ({ cholistan: 71.9, thar: 70.9, gobi: 104.4 }[r.id] ?? 72);
  return { id: r.id, name: r.name, lat: r.lat, lon };
}

export const sunAt = (lat, doy, hour) => sunPosition(lat, doy, hour);

// Unit vector toward the sun in the scene frame (+x east, +y up, +z south).
export function sunDir(el, az) {
  const e = rad(el), a = rad(az);
  return { x: Math.sin(a) * Math.cos(e), y: Math.sin(e), z: -Math.cos(a) * Math.cos(e) };
}

// Big motor (pan) and small motor (tilt) angles that point the panel at the sun.
// Pan stays within +-90; past that the panel turns around and tips back instead.
export function poseFor(el, az, lat) {
  let pan = toModelAz(az, lat), tilt = 180 - Math.max(0, el);
  if (pan > 90) { pan -= 180; tilt = Math.max(0, el); }
  else if (pan < -90) { pan += 180; tilt = Math.max(0, el); }
  return { pan, tilt: clamp(tilt, 0, 180) };
}

// How much of the light a flat panel with the given normal catches (0..1, the cosine rule).
export function catchFactor(normal, el, az) {
  const s = sunDir(el, az);
  return Math.max(0, normal.x * s.x + normal.y * s.y + normal.z * s.z);
}

// A UTC date for a day of the year and a local solar hour at a longitude.
export function dateFor(year, doy, solarHour, lon) {
  const ms = Date.UTC(year, 0, 1) + (doy - 1) * 86400e3 + (solarHour - lon / 15) * 3600e3;
  return new Date(ms);
}

// Points of the sun's path across the sky for one day, at radius r around the origin.
export function dayPath(lat, doy, r, steps = 64) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const h = 3 + (18 * i) / steps, p = sunPosition(lat, doy, h);
    if (p.el < -2) continue;
    const d = sunDir(p.el, p.az);
    pts.push([d.x * r, d.y * r, d.z * r]);
  }
  return pts;
}
