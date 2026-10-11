// The HUD over the 3D: top bar, right column of cards, the day bar at the bottom, story card, a toast.
// createHud({ bus }) -> { setMode, setRegion, setConnected, update(view), showCard, hideCard,
//   highlight(part), toast(text), setStory(story), setPretend(on) }
// The HUD never decides anything: it shows the view the app gives it and emits what the user asks
// for on the bus ('mode', 'connect', 'play', 'daySpeed', 'weather', 'dust').
import { createTop } from "./top.js";
import { createCards } from "./cards.js";
import { createDayBar } from "./daybar.js";
import { createStoryCard } from "./storycard.js";
import { fillIcons } from "../icons.js";

export function createHud({ bus }) {
  const $ = id => document.getElementById(id);
  const top = createTop($("hudLeft"), $("hudRight"), bus);
  const cards = createCards($("col"), { onDust: () => bus.emit("dust") });
  const bar = createDayBar($("bottom"), bus);
  const story = createStoryCard($("storyCard"));
  fillIcons();
  let mode = null, toastTimer = 0;

  const hud = {
    setMode(m) {
      mode = m; top.setMode(m);
      document.body.dataset.mode = m;
      $("liveCard").hidden = m !== "live";
    },
    setRegion: id => top.setRegion(id),
    setConnected: on => top.setConnected(on),
    // Live with the pretend sun shows the date and the day bar (without the weather buttons)
    setPretend(on) { document.body.classList.toggle("pretend", !!on); },
    // view: see app.js buildView()
    update(v) {
      top.update({ when: v.when, weather: v.weatherChip });
      if (v.when) bar.update({ ms: v.when.ms, offS: v.when.offS, el: v.sunEl, playing: v.playing, speedId: v.speedId, weather: v.weatherId, run: v.run });
      if (mode !== "story") cards.update(v);
    },
    showCard(opts, text) { story.show(opts, text); document.body.classList.add("has-story"); },
    hideCard() { story.hide(); document.body.classList.remove("has-story"); },
    setStory: s => story.setStory(s),
    highlight: part => cards.highlight(part),
    toast(text, ms = 4000) {
      const t = $("toast"); t.textContent = text; t.hidden = !text;
      clearTimeout(toastTimer); if (text) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
    },
  };
  return hud;
}
