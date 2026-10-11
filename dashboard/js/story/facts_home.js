// The facts behind "Closer to home" and "What comes next". ONLY verified, user-approved facts go
// here, each with its source.
//
// HOME (chapter_home.js), 3 short sentences told one at a time:
//   name        the presenter's first name, used in sentence 3
//   boom        1. Pakistan's household solar boom (16 GW of panels in 2024)
//   roofs       2. roofs are fixed, trackers are on big farms
//   family      3. a function of name (the name can change in one place)
//   card        the big card: { flag, title, numbers: [{ value, label }] } (2 numbers)
//               value counts up like the country cards ("1,200", "0.8%")
//   sources     [{ name, url }] (https only), listed in the Sources panel, never on the card
//
// FUTURE (chapter_future.js)
//   sentences   4 sentences: cheap dirt sensing, the price of two-axis trackers, where the cost
//               is (one motor per row), the wiper and the sprinkler we designed (a deeper clean)
//   sources     [{ name, url }] for the Sources panel

export const HOME = {
  name: "Aayan",
  boom: "In Pakistan, homes bought 16 gigawatts of solar panels in 2024 alone.",
  roofs: "Almost all of them are fixed; trackers are on big farms, not on roofs.",
  family: name => `${name}'s uncle and grandfather have solar panels in Pakistan, but two-axis tracking is far too expensive for them.`,
  card: {
    flag: "🇵🇰",
    title: "Rooftop solar in Pakistan",
    numbers: [
      { value: "16 GW", label: "panels bought in 2024" },
      { value: "28%", label: "of Pakistan's power from rooftops" },
    ],
  },
  sources: [
    { name: "Ember, August 2025", url: "https://ember-energy.org/latest-insights/the-first-evidence-of-a-take-off-in-solar-in-africa/" },
    { name: "Ember, June 2026", url: "https://ember-energy.org/latest-insights/the-solarisation-of-pakistans-energy-economy/" },
    { name: "Lawrence Berkeley National Lab, Utility-Scale Solar 2025 slides", url: "https://emp.lbl.gov/sites/default/files/2025-10/Utility%20Scale%20Solar%202025%20Edition%20Slides.pdf" },
  ],
};

export const FUTURE = {
  sentences: [
    "Big farms check for dirt with a sensor station that costs 4,000 pounds; our four light sensors cost under a dollar.",
    "Two-axis trackers make 30 to 35 percent more power, but can take 24 years to pay back.",
    "The chip is 10 dollars; the cost is motors and steel, so one motor should tilt a whole row, like big farms.",
    "We also designed a wiper and a sprinkler for it, for a deeper clean when tilting alone is not enough.",
  ],
  sources: [
    { name: "Omni Instruments: Kipp and Zonen DustIQ price", url: "https://www.omniinstruments.co.uk/p/dustiq-soiling-monitoring-system/" },
    { name: "Renewable and Sustainable Energy Reviews, 2022", url: "https://doi.org/10.1016/j.rser.2022.112770" },
    { name: "Lawrence Berkeley National Lab, Utility-Scale Solar 2025 slides", url: "https://emp.lbl.gov/sites/default/files/2025-10/Utility%20Scale%20Solar%202025%20Edition%20Slides.pdf" },
  ],
};

// The 3 home sentences in order (chapter_home.js and lines.js both use this).
export const homeLines = () => [HOME.boom, HOME.roofs, HOME.family(HOME.name)].filter(Boolean);
