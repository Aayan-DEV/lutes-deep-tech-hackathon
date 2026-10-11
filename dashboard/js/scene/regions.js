// How each desert looks: ground colours, sand texture, plants, rocks, the far horizon and the haze.
// Weather data uses the same ids (cholistan, thar, gobi). Colours are plain hex, tuned for the
// renderer defaults (no tone mapping, linear output), the same as the old page.
//
// Photo notes behind the numbers:
// - Cholistan (Bahawalpur): pale yellow-grey sand, low rolling ground with small dunes, tussock
//   grasses (Cenchrus, Panicum) and scattered shrubs (phog, kair), whitish salty flats, hazy and flat.
// - Thar (Sam dunes, Jaisalmer): orange-gold dunes with crisp wind ripples, sparse scrub in the
//   hollows between dunes, a dune line on the horizon.
// - Gobi (Dalanzadgad): grey-brown gravel plain (desert pavement), saxaul shrubs and sparse tufts,
//   red-orange sandstone cliffs (Bayanzag, the Flaming Cliffs) and the blue-grey Gurvan Saikhan range.

export const REGION_LOOK = {
  cholistan: {
    name: "Cholistan Desert", where: "Bahawalpur, Pakistan",
    // ground colours: base, hollows, crests, steep sides, patches (salty crust)
    sand: 0xc4b899, sandLow: 0xb6aa8a, sandHigh: 0xcfc4a6, slope: 0xb9a684, patch: 0xcfcbbb, patchAmt: 0.55,
    grain: 0.12,        // fine grain strength
    ripple: 0.22,       // wind ripple strength (0 = none)
    rippleLen: 7,       // ripple wavelength in cm
    gravel: 0.05,       // small stones painted into the ground (0 = none)
    pebbles: [0xa89878, 0xb5a888, 0x8f8068],
    sparkle: 0.5,
    wind: [0.6, -0.8],  // where the prevailing wind blows toward (x east, z south): toward the north-east
    haze: 0.55,         // base haze, 0 clear .. 1 thick
    hazeTint: 0xd8d2c2, // the haze colour in full daylight
    hemiGround: 0xbfae88,
    props: {
      rock:  { n: 26,  r: [150, 5000], size: [3, 12], color: 0x9a8c74 },
      bush:  { n: 60,  r: [450, 6500], size: [35, 110], color: 0x868a62, kind: "bush" },
      broom: { n: 50,  r: [320, 6000], size: [30, 85],  color: 0xa8a670, kind: "broom" },
      tuft:  { n: 380, r: [110, 4500], size: [7, 20],   color: 0xb3a670 },
      tree:  { n: 6,   r: [2500, 7000], size: [380, 560], color: 0x737a52 },
    },
    horizon: [
      { kind: "dunes", dist: 11000, height: [120, 420], color: 0xcdbd98, haze: 0.62, seed: 3 },
    ],
  },

  thar: {
    name: "Thar Desert", where: "Jaisalmer, India",
    sand: 0xd79d5c, sandLow: 0xc98d50, sandHigh: 0xe6b170, slope: 0xc98a4c, patch: 0xd9a868, patchAmt: 0.2,
    grain: 0.14, ripple: 0.55, rippleLen: 9, gravel: 0.0,
    pebbles: [0xa0703f, 0xb88250, 0x8a5c34],
    sparkle: 0.8,
    wind: [0.7, -0.7],  // south-west monsoon wind, blowing toward the north-east
    haze: 0.45, hazeTint: 0xe6cfb2, hemiGround: 0xc98d50,
    props: {
      rock:  { n: 10,  r: [300, 5000], size: [3, 10], color: 0xa0703f },
      bush:  { n: 30,  r: [500, 6500], size: [40, 120], color: 0x78804a, kind: "bush" },
      broom: { n: 24,  r: [350, 6000], size: [30, 90],  color: 0x9c9a62, kind: "broom" },
      tuft:  { n: 150, r: [120, 4000], size: [7, 20],   color: 0xc2a462 },
      tree:  { n: 3,   r: [3000, 7000], size: [380, 520], color: 0x6c7448 },
    },
    horizon: [
      { kind: "dunes", dist: 10500, height: [700, 1700], color: 0xd99b58, haze: 0.5, seed: 7, sharp: true },
    ],
  },

  gobi: {
    name: "Gobi Desert", where: "Dalanzadgad, Mongolia",
    sand: 0x8f8170, sandLow: 0x837564, sandHigh: 0x9c8d7a, slope: 0x887766, patch: 0x766a5c, patchAmt: 0.5,
    grain: 0.16, ripple: 0.0, rippleLen: 8, gravel: 0.85,
    pebbles: [0x6a5c50, 0x7d6e5e, 0x4a423c, 0x9a8670, 0x86644e],
    sparkle: 0.35,
    wind: [0.8, 0.6],   // north-west winds, blowing toward the south-east
    haze: 0.2, hazeTint: 0xcdd8e2, hemiGround: 0x9a8669,
    props: {
      rock:   { n: 50,  r: [140, 6000], size: [4, 15], color: 0x7a6e62 },
      pebble: { n: 650, r: [70, 1600], size: [1, 3.5], color: 0x6c5e52 },
      bush:   { n: 12,  r: [600, 6500], size: [22, 55], color: 0x8a8466, kind: "bush" },
      broom:  { n: 36,  r: [400, 6500], size: [25, 70], color: 0x8e8c66, kind: "broom" },   // saxaul
      tuft:   { n: 150, r: [120, 4500], size: [6, 16],  color: 0xa49a68 },
    },
    horizon: [
      { kind: "mountains", dist: 16000, height: [350, 1500], color: 0x76808f, haze: 0.45, seed: 11 },
      { kind: "cliffs", dist: 9800, height: [420, 900], color: 0xc4683c, haze: 0.22, seed: 5,
        from: 250, to: 330 },   // compass degrees: the cliffs stand to the west and north-west
    ],
  },
};

export const REGION_IDS = Object.keys(REGION_LOOK);
export const lookOf = id => REGION_LOOK[id] || REGION_LOOK.cholistan;
