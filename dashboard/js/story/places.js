// The real events behind the country chapters (PLACE_ORDER: India, then Mongolia). Pakistan's
// Cholistan entry stays as data but is not told: "Closer to home" covers Pakistan. ONLY verified facts go here, each with its
// source. Text in [brackets] is a placeholder still waiting for the checked fact.
//
// Fields per place:
//   country    the country name, shown big with the flag (the card shows only these and numbers)
//   flag       the flag emoji
//   place      the town and province or state (Sources panel only)
//   date       when it happened (Sources panel only)
//   sentences  exactly 2 short sentences, told one at a time:
//                1. the country and the real event
//                2. how this tracker fixes it
//   numbers    2 or 3 figures shown big: { value: "0.8%", label: "lost per dusty day" }. Labels are at
//              most 4 words. Every number in value counts up (commas and decimals are fine).
//   sources    [{ name, url }] (https only), listed in the Sources panel (sources.js), not on the card
//   visual     what plays in the 3D: "dust" | "snow" | "heat" | "storm"
//   thenVisual optional: a second, short weather on the second sentence (Mongolia: "snow" after
//              the sandstorm, the fixed panel goes white and the tracker tilts steep to drop it)

export const PLACE_FACTS = {
  cholistan: {
    country: "Pakistan",
    flag: "🇵🇰",
    place: "Quaid-e-Azam Solar Park, Bahawalpur",
    date: "20 September 2016",
    sentences: [
      "In Pakistan, the biggest solar park near Bahawalpur says dust and sand are its biggest problem, and 100 workers wash it every week.",
      "This tracker feels the light drop and tilts itself clean; a tilted panel needs a third of the washes.",
    ],
    numbers: [
      { value: "100", label: "workers wash it weekly" },
      { value: "3x", label: "fewer washes when tilted" },
    ],
    sources: [
      { name: "Reuters via Dawn, 2016", url: "https://www.dawn.com/news/1284780" },
      { name: "Renewable Energy, 2020 (Lahore soiling study)", url: "https://doi.org/10.1016/j.renene.2019.12.090" },
    ],
    visual: "dust",
  },

  thar: {
    country: "India",
    flag: "🇮🇳",
    place: "IIT Gandhinagar, Gujarat, next to the Thar",
    date: "27 June 2017",
    sentences: [
      "In India, scientists found uncleaned panels made 50 percent more power the moment they were washed.",
      "Most of that dirt was plain dust, and this tracker tilts plain dust off by itself.",
    ],
    numbers: [
      { value: "+50%", label: "power after a wash" },
      { value: "25%", label: "lost to dust" },
      { value: "92%", label: "of the dirt was dust" },
    ],
    sources: [
      { name: "Down To Earth, 2017", url: "https://www.downtoearth.org.in/news/energy/dust-particulate-matter-reducing-solar-energy-output-by-25-per-cent-study-58159" },
      { name: "Environmental Science and Technology Letters, 2017", url: "https://doi.org/10.1021/acs.estlett.7b00197" },
    ],
    visual: "dust",
  },

  gobi: {
    country: "Mongolia",
    flag: "🇲🇳",
    place: "Gobi Desert, Dundgovi and Umnugovi",
    date: "14 March 2021",
    sentences: [
      "In Mongolia, the worst sandstorm in a decade killed ten people and cut China's solar power by a fifth.",
      "No tracker can clear the sky, but it tilts the dust off the glass, and the winter snow too.",
    ],
    numbers: [
      { value: "10", label: "people died" },
      { value: "21%", label: "less solar power" },
      { value: "70%", label: "lost in the worst places" },
    ],
    sources: [
      { name: "Montsame via AKIpress, 2021", url: "https://akipress.com/news:655695:580_previously_missing_in_Mongolia_sandstorm_safe_and_sound" },
      { name: "Communications Earth and Environment, 2026", url: "https://www.nature.com/articles/s43247-025-03123-1" },
      { name: "WHO Mongolia, 2024 (the dzud)", url: "https://www.who.int/mongolia/news/detail/04-04-2024-dzud-emergency-in-mongolia-moves-to-risk-of-floods-and-environmental-contamination" },
    ],
    visual: "dust",
    thenVisual: "snow",
  },
};

// The order the country chapters play in.
export const PLACE_ORDER = ["thar", "gobi"];
