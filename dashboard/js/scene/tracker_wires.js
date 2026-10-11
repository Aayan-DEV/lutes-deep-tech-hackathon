// The servo ribbons (brown, red, orange) and the cable from the breadboard to the pipe, routed
// around the real parts. All paths are in the tracker's frame (cm), see tracker_mech.js for the
// heights. Each builder adds one vertex-coloured mesh (plus a plug) to `parent`.
import { createKit, ribbon, wire } from "./tracker_kit.js";
import { MOTOR_Y, HORN_TOP, SPIN_TOP, PIVOT_Y } from "./tracker_mech.js";

const BROWN = 0x6b3a1e, RED = 0xc62828, ORANGE = 0xf08a24, BASE_Y = 2.46;

// Static wires: the big motor's ribbon (out of its front end, along the base, to a plug on the
// breadboard) and the cable (red, yellow) from the breadboard to the bottom of the pipe, where
// the small motor's and the light sensors' wires come down. bb(row, k): a breadboard hole.
export function buildStaticWires(parent, M, bb) {
  const k = createKit(), y = MOTOR_Y;
  const mg = [[-0.62, y + 1.5, 2.9], [-0.62, y + 1.3, 3.3], [-0.45, y + 0.4, 3.7], [0.4, BASE_Y + 0.02, 4.05], [3.2, BASE_Y, 4.0],
    [6.2, BASE_Y, 3.6], [7.5, BASE_Y, 2.2], [7.7, BASE_Y, -0.4], [8.9, 2.75, -1.45], [9.35, 3.9, -2.0], [9.42, 4.3, -2.7], [9.42, 4.02, -3.0]];
  ribbon(mg, [BROWN, RED, ORANGE], [0.06, 0.03, 0.06], 0.045).forEach(g => k.add(M.wire, g));
  k.rbox(M.black, 0.8, 0.62, 0.27, 0.04, [9.42, 3.68, -3.0]);             // the 3-pin plug
  const cable = (h, dz, color) => {
    const p = bb("a", h);
    return wire([[p[0], p[1] - 0.12, p[2]], [p[0], p[1] + 0.4, p[2]], [p[0] - 0.9, 2.9, p[2] + 0.2 + dz], [p[0] - 1.6, BASE_Y + 0.01, p[2] + 0.6 + dz],
      [6.6, BASE_Y, -3.4 + dz], [3.0, BASE_Y, -3.35 + dz], [1.0, 2.6, -3.0 + dz], [0.4, 4.2, -2.4 + dz], [0.15, HORN_TOP, -2.0 + dz],
      [0.05, HORN_TOP + 0.75, -1.2 + dz], [0, HORN_TOP + 1.05, -0.4], [0, HORN_TOP + 1.6, 0]], 0.05, color, { seg: 72 });
  };
  k.add(M.wire, cable(1, 0, RED)); k.add(M.wire, cable(2, 0.11, 0xf2c230));
  k.build(parent);
}

// The small motor's ribbon (pan frame): from the servo's far end down onto the spinner, around
// the +x holder, across the top (outside the holder's foot) and down into the open top of the pipe.
export function buildServoWire(parent, M, servoX) {
  const k = createKit(), x = servoX, y = SPIN_TOP + 0.06;
  const path = [[x + 2.3, PIVOT_Y - 1.5, 0.3], [x + 2.35, PIVOT_Y - 2.0, 0.5], [x + 2.1, PIVOT_Y - 4.0, 1.1], [x + 1.5, y + 2.2, 1.9],
    [x + 0.4, y + 0.5, 2.4], [x - 0.8, y + 0.02, 2.5], [3.8, y, 2.5], [1.8, y, 1.6], [0.9, y + 0.5, 0.5], [0.3, y + 1.0, 0.1], [0, y + 0.9, 0], [0, y - 0.3, 0]];
  ribbon(path, [BROWN, RED, ORANGE], [0, 0, 0.085], 0.04).forEach(g => k.add(M.wire, g));
  k.build(parent);
}
