// Poses for the story people: walk (knee bend, arm swing, a little hip and chest twist), idle
// (breathing, weight shift, looking around), kneel, crouch, work (turning a screwdriver), tablet,
// carry, wave, point and high five. Angles in radians on the bones of people_rig.js:
// thigh x < 0 swings the leg forward, shin x > 0 bends the knee, upper arm x < 0 lifts the arm
// forward, forearm x < 0 bends the elbow, spine x > 0 leans forward, head x > 0 looks down.
// The hips sit at the height that puts the lowest foot or knee on the ground.
import { THIGH, SHIN, ANKLE, LEG_TOP } from "./people_rig.js";

export const KEYS = ["lift", "hipsRY", "hipsRZ", "spX", "spY", "hdX", "hdY", "uaLx", "uaLz", "faL", "faLy", "uaRx", "uaRz", "faR", "faRy", "thL", "shL", "thR", "shR"];
const KNEE_R = 0.6;
const clamp01 = x => Math.max(0, Math.min(1, x));

export function restPose() { const p = {}; for (const k of KEYS) p[k] = 0; p.uaLz = 0.08; p.uaRz = -0.08; p.faL = p.faR = -0.12; return p; }

// s: { swing (0..0.5 walk strength), phase, act, actT (time the act began), seed, carrying }
export function poseTarget(s, t) {
  const A = s.swing, sp = Math.sin(s.phase), cp = Math.cos(s.phase), a = A / 0.5;
  const p = restPose();
  // the walk (fades to standing as A goes to 0)
  p.thL = -A * sp; p.thR = A * sp;
  p.shL = A * (0.22 + 1.5 * Math.pow(Math.max(0, cp), 1.4));
  p.shR = A * (0.22 + 1.5 * Math.pow(Math.max(0, -cp), 1.4));
  p.uaLx = 0.8 * A * sp; p.uaRx = -0.8 * A * sp;
  p.faL = -(0.18 + 0.75 * A * Math.max(0, -sp) + 0.2 * a); p.faR = -(0.18 + 0.75 * A * Math.max(0, sp) + 0.2 * a);
  p.spX = 0.07 * a; p.spY = 0.22 * A * sp; p.hipsRY = -0.28 * A * sp; p.hipsRZ = 0.05 * A * cp; p.hdY = -p.spY * 0.8;
  // idle life: breathing, a small weight shift, a look around
  const idle = 1 - clamp01(a * 3), br = Math.sin(t * 1.7 + s.seed);
  p.spX += idle * 0.018 * br; p.hdX = idle * 0.012 * br;
  p.uaLz += idle * 0.015 * br; p.uaRz -= idle * 0.015 * br;
  p.hipsRZ += idle * 0.03 * Math.sin(t * 0.45 + s.seed);
  p.hdY += idle * 0.2 * Math.sin(t * 0.5 + s.seed * 2);

  const since = t - (s.actT || 0), work = Math.sin(t * 7.5);
  switch (s.act) {
    case "kneel":     // right knee down, hands forward and low, turning a screwdriver
      Object.assign(p, { thL: -1.65, shL: 1.65, thR: 0.15, shR: 1.55, spX: 0.42, spY: 0.1, hdX: 0.35, hdY: 0,
        uaRx: -1.0, uaRz: 0.08, faR: -0.55, faRy: 0.9 * work, uaLx: -0.9, uaLz: -0.06, faL: -0.7, faLy: 0, hipsRY: 0, hipsRZ: 0 });
      break;
    case "crouch":    // bend down to put something on the ground
      Object.assign(p, { thL: -1.25, shL: 2.0, thR: -1.1, shR: 1.85, spX: 0.75, hdX: 0.1, uaLx: -0.6, uaRx: -0.6, faL: -0.5, faR: -0.5, uaLz: 0.15, uaRz: -0.15, hipsRY: 0, hipsRZ: 0 });
      break;
    case "work":      // standing, hands at chest height, turning a screwdriver
      Object.assign(p, { spX: 0.12, hdX: 0.25, uaRx: -1.2, uaRz: 0.12, faR: -0.6, faRy: 0.9 * work, uaLx: -1.05, uaLz: -0.12, faL: -0.75 });
      break;
    case "tablet":    // reading a tablet held in the left hand, tapping it with the right
      Object.assign(p, { spX: 0.05, hdX: 0.5, hdY: 0, uaLx: -0.35, uaLz: 0.02, faL: -1.3, faLy: -0.2,
        uaRx: -0.5, uaRz: 0.18, faR: -1.15 - 0.15 * Math.max(0, Math.sin(t * 5)) });
      break;
    case "wave":
      Object.assign(p, { uaRx: -0.15, uaRz: -2.5 + 0.28 * Math.sin(t * 9), faR: -0.45 - 0.25 * Math.sin(t * 9 + 0.6), hdY: 0 });
      break;
    case "point":
      Object.assign(p, { uaRx: -1.45, uaRz: 0.05, faR: -0.05, hdY: 0 });
      break;
    case "highfive": {  // wind up, then the slap with a little hop
      const up = clamp01(since / 0.35), hop = Math.sin(Math.PI * clamp01((since - 0.3) / 0.4));
      Object.assign(p, { uaRx: -2.45 * up, uaRz: 0.38 * up, faR: -0.2, spX: -0.08 * up, hdX: -0.15 * up, hdY: 0, lift: 0.9 * hop });
      break;
    }
    default: break;
  }
  if (s.carrying && s.act !== "crouch") Object.assign(p, { uaLx: -0.55, uaRx: -0.55, faL: -1.05, faR: -1.05, uaLz: 0.14, uaRz: -0.14, faLy: 0, faRy: 0, spX: p.spX - 0.06 });
  return p;
}

// lowest point of the legs (knee or sole) for a hips joint at y = 0
function lowest(th, sh) {
  const knee = -THIGH * Math.cos(th), a2 = th + sh;
  const ankle = knee - SHIN * Math.cos(a2), sole = ankle - ANKLE * Math.max(0.35, Math.cos(a2));
  return Math.min(knee - KNEE_R, sole);
}

// Move the joints toward the target (k is the smoothing step, 0..1) and set the bones.
export function applyPose(rig, cur, tgt, k) {
  for (const key of KEYS) cur[key] += (tgt[key] - cur[key]) * k;
  const b = rig.bones, c = cur;
  const low = Math.min(lowest(c.thL, c.shL), lowest(c.thR, c.shR));
  b.hips.position.y = LEG_TOP - low + c.lift;    // standing: 0.2 + 8.4 = HIP_Y
  b.hips.rotation.set(0, c.hipsRY, c.hipsRZ);
  b.spine.rotation.set(c.spX, c.spY, 0);
  b.head.rotation.set(c.hdX, c.hdY, 0);
  b.uaL.rotation.set(c.uaLx, 0, c.uaLz); b.uaR.rotation.set(c.uaRx, 0, c.uaRz);
  b.faL.rotation.set(c.faL, c.faLy, 0); b.faR.rotation.set(c.faR, c.faRy, 0);
  b.thL.rotation.x = c.thL; b.shL.rotation.x = c.shL;
  b.thR.rotation.x = c.thR; b.shR.rotation.x = c.shR;
}
