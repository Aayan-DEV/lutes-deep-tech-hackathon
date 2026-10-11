// "The team" and "From sketch to model": who built it, with real photos of the two days.
// The 3D shows the empty spot where the tracker will stand (build 0): three people wave on the
// first sentence, then get to work while the photos fade in. The cards are small and sit in the
// upper third; the camera stands far enough back that the people fill the band between the cards
// and the sentences (heads at about 37 %, feet at about 53 % of the height). The sketch chapter
// shows the first sketches and the Fusion 360 model. The next chapter (chapter_steps.js) builds it.
// The sentences come from the team; nothing is added about them here.
import { photosFrom, preloadPhotos } from "./photos.js";
import { TEAM, SKETCH } from "./texts.js";

const TEAM_PHOTOS = [
  { src: "media/IMG_6999.jpg", caption: "3D printing" },
  { src: "media/IMG_7001.jpg", caption: "Painting the parts" },
  { src: "media/IMG_6994.jpg", caption: "Wiring everything" },
];
const SKETCH_PHOTOS = [
  { src: "media/sketch_tracker.webp", caption: "First sketch" },
  { src: "media/sketch_base.webp", caption: "The base and the bearing" },
  { src: "media/fusion_model.webp", caption: "Fusion 360 model" },
];
preloadPhotos([...TEAM_PHOTOS, ...SKETCH_PHOTOS].map(p => p.src));

// Aimed high on purpose: the stage aims 0.09 * distance lower, which puts the people's middle
// (about y 9 at z 13) a little above the screen's centre.
const TEAM_CAM = { pos: [13, 41, 166], target: [4, 17, 13] };
const TEAM_CAM2 = { pos: [-11, 41, 165], target: [4, 17, 13] };
const SKETCH_CAM = { pos: [44, 30, 70], target: [4, 6, 0] };
const SKETCH_CAM2 = { pos: [30, 22, 50], target: [4, 5, 0] };

export const teamChapters = [
  {
    id: "team",
    title: "The team",
    text: TEAM,
    camera: TEAM_CAM, cameraTime: 0, build: 0,
    async run(ctx) {
      const { people } = ctx.scene, P = (x, z) => ctx.at(x, z);
      const ids = people.spawn(3, [{ ...P(-10, 12), heading: 0 }, { ...P(4, 14), heading: 0 }, { ...P(18, 12), heading: 0 }]);
      ctx.look(TEAM_CAM2, 9);
      await ctx.atSentence(0);
      for (const i of ids) people.act(i, "wave");
      const photos = photosFrom(ctx, 1, TEAM_PHOTOS, { stagger: 0.5, small: true });
      photos.catch(() => {});   // cut short: it hides itself
      await ctx.wait(2.2);
      for (const i of ids) people.act(i, "idle");
      await ctx.atSentence(1);
      // the two days: one kneels and screws, one checks the tablet, one works on the top
      const [a, b, c] = ids;
      people.hold(a, "screwdriver", "R"); people.hold(b, "tablet", "L"); people.hold(c, "screwdriver", "R");
      people.face(a, P(4, 0)); people.face(b, P(4, 0)); people.face(c, P(4, 0));
      people.act(a, "kneel"); people.act(b, "tablet"); people.act(c, "work");
      ctx.done?.();   // the photos stay up until the chapter ends: auto play may move on now
      await photos;
    },
  },
  {
    id: "sketch",
    title: "From sketch to model",
    text: SKETCH,
    camera: SKETCH_CAM, cameraTime: 0, build: 0,
    async run(ctx) {
      ctx.look(SKETCH_CAM2, 8);
      // the sketches while "sketches" is typed, the model when "Fusion 360 model" is
      const photos = photosFrom(ctx, 0, SKETCH_PHOTOS, { delays: [0.1, 0.9, 2.1] });
      await ctx.wait(3);   // the three photos are in
      ctx.done?.();
      await photos;
    },
  },
];
