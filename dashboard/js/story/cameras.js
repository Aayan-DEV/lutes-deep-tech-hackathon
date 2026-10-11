// Camera spots for the story, in cm around the tracker at the origin (+x east, +z south, +y up),
// for the tracker at scale 1. The stage multiplies them by the tracker's scale and lifts them by
// the ground height under the tracker. Each is { pos, target }; the story eases between them.
// The sentences sit a little below the middle of the screen, so the subject is kept above it.
export const CAMERAS = {
  wideDawn:    { pos: [-210, 26, 135], target: [40, 30, -20] },    // from the west, looking at the sunrise
  wideDawn2:   { pos: [-130, 20, 90],  target: [30, 24, -12] },    // a slow push in
  buildWide:   { pos: [175, 55, 115],  target: [60, 6, -42] },     // the road and the empty spot
  buildClose:  { pos: [80, 40, 72],    target: [26, 2, -28] },     // unloading
  buildWork:   { pos: [48, 30, 58],    target: [4, 4, -10] },      // people at work
  buildLeave:  { pos: [-40, 44, 118],  target: [-30, 2, -34] },    // the truck drives off to the west
  dayWide:     { pos: [-62, 20, 138],  target: [0, 25, 8] },      // the day's path, from the morning side
  dayWide2:    { pos: [62, 20, 138],   target: [0, 25, 8] },      // and from the afternoon side
  skyArc:      { pos: [40, 16, 190],   target: [-6, 24, 0] },      // from the south: three sun paths over the tracker
  skyArc2:     { pos: [-34, 16, 190],  target: [-6, 24, 0] },
  dustWide:    { pos: [72, 38, 96],    target: [0, 8, 0] },
  dustClose:   { pos: [40, 20, 52],    target: [2, 13, 0] },
  dustRock:    { pos: [-44, 24, 42],   target: [0, 9, 0] },
  numbersWide: { pos: [-28, 50, 165],  target: [-48, 18, 0] },
  placeWide:   { pos: [-4, 46, 150],   target: [-14, 14, 0] },     // the country chapters: fixed panel and tracker
  placeClose:  { pos: [-2, 34, 118],   target: [-13, 12, 0] },
  placeShed:   { pos: [22, 30, 112],   target: [-8, 12, 0] },
  homeWide:    { pos: [-20, 44, 160],  target: [-52, 14, -8] },     // closer to home: the houses and the tracker
  homeWide2:   { pos: [-30, 36, 138],  target: [-54, 14, -8] },
  homeTurn:    { pos: [10, 30, 128],   target: [-50, 16, -8] },     // the roof panels turn to the west
  futureWide:  { pos: [-24, 48, 165],  target: [-50, 14, -6] },     // what comes next: houses and tracker
  futureSensor:{ pos: [-14, 40, 46],   target: [0, 20, 4] },        // the 4 light sensors on the flat panel
  futureRow:   { pos: [30, 44, 112],   target: [26, 10, 0] },       // one motor tips a whole row
  futureClean: { pos: [4, 40, 50],     target: [4, 20, 0] },        // close: the wiper and the sprinkler clean the panel
  yourTurn:    { pos: [80, 42, 118],   target: [0, 10, 0] },
};
