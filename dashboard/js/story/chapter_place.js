// The country chapters ("The real problem here"): one per place in PLACE_ORDER (places.js). The 3D switches to
// that place, the big card at the top shows the flag, the country and 3 big numbers that count up,
// the two sentences tell the event and the fix in plain words, and the vignette shows a fixed panel
// staying dirty while the tracker sheds the dust or snow. The sources are in the Sources panel.
import { PLACE_FACTS } from "./places.js";
import { runVignette } from "./vignette.js";

export function placeChapter(id) {
  const fact = PLACE_FACTS[id];
  return {
    id: `place-${id}`,
    title: "The real problem here",
    region: id,                       // stage.reset switches the 3D to this place
    text: () => (fact ? fact.sentences.slice(0, 2) : []),
    camera: "placeWide", cameraTime: 0,
    async run(ctx) {
      if (!fact) return;
      ctx.place.show(fact, { onHeadline: () => ctx.sound.low(), onCount: u => ctx.sound.count(u) });
      await runVignette(ctx, fact.visual, fact.thenVisual);
    },
  };
}
