// Every sentence the story says that does not live in places.js or facts_home.js. Pure data: no
// three.js, no DOM, so node can import it (lines.js, the voice tool). The chapters read their text
// from here, so a line spoken by the voice and a line on screen are always the same text.

export const DAWN = ["Deserts get strong sun almost every day of the year, which makes them perfect for solar panels."];

// "People came" (right after the desert) and "Off they went" (right after the seven steps): the
// truck and the three builders (chapter_crew.js). One sentence each; the voice files are recorded
// for exactly this text, so keep it byte for byte.
export const CAME = ["One morning a truck came, and three people built this sun tracker right here in the sand."];
export const LEFT = ["When the last screw was in, they packed up and drove away, and the tracker went to work."];

export const TEAM = [
  "We are three people: one from business, one software engineer, and one electrical engineer who had never 3D printed.",
  "In two days we learned 3D printing, spray painting, wood cutting and screwing, with the JHC lab mentors helping where we got stuck.",
];

export const SKETCH = ["It started as tablet sketches, became a Fusion 360 model with every part, then the real thing."];

export const STEPS = [
  "We started with a wooden base: wood is cheap, quick to cut and easy to screw.",
  "The big motor sits between two wood blocks; a small servo was too weak to turn the top.",
  "On the blocks lies a slippery UHMW plastic plate with a hole, so the top spins with little friction.",
  "A pipe runs from the motor through the hole into a second UHMW block, so the top turns with it.",
  "Two holders carry a rod, and a small servo turns the rod: the second axis.",
  "The rod holds the wood plate: the solar panel in the middle, a light sensor at each corner.",
  "An Arduino reads the four sensors and drives both motors, wired on a breadboard so changes are fast.",
];

export const SOFTWARE = [
  "The Arduino code also runs inside this page, so we simulated the light and the motors and tested it hundreds of times.",
  "It learns the room's light, follows a torch or the sun, and tilts the panel clean when the light drops.",
];

export const MOTORS = [
  "The big motor turns the panel from east to west, so it follows the sun all day.",
  "The small motor tilts the panel through the day and follows the high summer and low winter sun.",
];

// Fixed text (the voice needs one exact sentence): sim.totals('gobi') over 2023 to 2025 gives
// 5.11 kWh against 4.11 kWh, +24 %; the clear summer day in tests/day_test.mjs gives +64 %.
export const NUMBERS = ["Over three real Gobi years this tracker caught 24 percent more energy than a fixed panel, and up to 64 percent more on a clear summer day."];

// The start of the story: the real tracker (js/story/hwlink.js)
export const GATE = {
  title: "The real tracker",
  ask: "Is the real tracker plugged in? Connect it and calibrate, and the real motors will move with the story.",
  connecting: "Connecting to the real tracker.",
  calibrating: "Calibrating: follow the steps on screen.",
  connected: "Real tracker connected",
  calibrated: "Connected and calibrated",
  failed: "The real tracker did not connect, so the story goes on without it.",
  homing: "Moving back to the start position.",
  homed: "Back to the start position",
};

// The last chapter, "The real thing" (chapter_real.js)
export const REAL = {
  title: "The real thing",
  intro: "Now it is time for the real thing.",
  torch: "Testing with normal light: shine the torch at the panel.",
  torchOk: "It found the light and locked on: success.",
  torchNo: "It did not lock on this time.",
  dust: "Testing with dust: sprinkle a little sawdust over the four light sensors.",
  dustOk: "It noticed the dust, tilted it off and the light came back: success.",
  dustNo: "It did not clear it this time.",
  end: "The end. Thank you for watching our presentation.",
};
