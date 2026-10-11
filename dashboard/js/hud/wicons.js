// Weather icons and the month arrows (24 x 24 line icons in the Hugeicons style, 1.5 stroke) and the weather in words.
import { hi } from "../icons.js";

const S = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const CLOUD = `<path d="M17.5 18H7a4.5 4.5 0 1 1 1.1-8.87A5.5 5.5 0 0 1 18.6 10.5 3.75 3.75 0 0 1 17.5 18Z" ${S}/>`;
const CLOUD_UP = `<path d="M17.5 15H7a4 4 0 1 1 1-7.88A5 5 0 0 1 17.6 8 3.5 3.5 0 0 1 17.5 15Z" ${S}/>`;
const PATHS = {
  cloud: CLOUD,
  rain: `${CLOUD_UP}<path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" ${S}/>`,
  snow: `${CLOUD_UP}<path d="M8 19h.01M12 18h.01M16 19h.01M10 21.5h.01M14 21.5h.01" ${S} stroke-width="2.4"/>`,
  hail: `${CLOUD_UP}<circle cx="8.5" cy="19.5" r="1.1" ${S}/><circle cx="12.5" cy="20.5" r="1.1" ${S}/><circle cx="16" cy="18.8" r="1.1" ${S}/>`,
  dust: `<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7" ${S}/><path d="M14 19.5h.01M18 20.5h.01M7 20h.01" ${S} stroke-width="2.4"/>`,
  storm: `${CLOUD_UP}<path d="M12.5 15.5 10.5 19h3l-2 3.5" ${S}/>`,
  leaf: `<path d="M5 19C5 11 10 5.5 20 4C19.5 13.5 14 19 6.5 19" ${S}/><path d="M5 19C8 15.5 11 13 14.5 10.5" ${S}/>`,
  left: `<path d="M15 6C15 6 9 10.42 9 12C9 13.58 15 18 15 18" ${S}/>`,     // Hugeicons arrow-left-01
  right: `<path d="M9 6C9 6 15 10.42 15 12C15 13.58 9 18 9 18" ${S}/>`,     // Hugeicons arrow-right-01
};
export const wicon = (name, cls = "ico") => PATHS[name] ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>` : hi(name, cls);

// {icon, words} for a weather sample and the sun's height.
export function weatherWords(s, sunEl) {
  const night = sunEl < -6;
  if (!s) return night ? { icon: "moon", words: "Night" } : { icon: "sun", words: "Clear" };
  const rain = s.rain >= 0.1 ? `Rain ${s.rain >= 1 ? Math.round(s.rain) : s.rain.toFixed(1)} mm/h` : "Rain";
  switch (s.kind) {
    case "hail": return { icon: "hail", words: "Hail" };
    case "storm": return { icon: "storm", words: rain };
    case "rain": return { icon: "rain", words: rain };
    case "snow": return { icon: "snow", words: "Snow" };
    case "dust": return { icon: "dust", words: "Sandstorm" };
    case "leaves": return { icon: "leaf", words: "Windy, leaves" };
    case "overcast": case "cloudy": return night ? { icon: "moon", words: "Night" } : { icon: "cloud", words: "Cloudy" };
    default: return night ? { icon: "moon", words: "Night" } : { icon: "sun", words: "Clear" };
  }
}
