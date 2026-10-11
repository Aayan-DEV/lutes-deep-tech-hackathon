// "The software": the Arduino code also runs in this page. A fast sun crosses the sky from east to
// west while the tracker follows it a little behind, the way the real one does, and the card shows
// the 4 light sensors: the side facing the sun reads more until the motors catch up. A small tag
// gives the parity tests' result. On the second sentence dust lands, the light drops, and the
// tracker rocks the panel clean.
import { sunAt, poseFor, dateFor } from "./sunpath.js";
import { sunBall } from "./props.js";
import { showFact } from "./photos.js";
import { SOFTWARE } from "./texts.js";

const EQUINOX = 80, PANEL_Y = 12.6, R = 36;
const NAMES = ["Top left", "Top right", "Bottom left", "Bottom right"];
const QUAD = [1, 0.86, 1.08, 0.94];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const CAM = { pos: [-44, 16, 96], target: [0, 17, 4] };
const CAM2 = { pos: [44, 16, 96], target: [0, 17, 4] };
const CAM_DUST = { pos: [34, 22, 46], target: [2, 11, 0] };

export const softwareChapter = {
  id: "software",
  title: "The software",
  text: SOFTWARE,
  camera: CAM, cameraTime: 0, build: 1,
  async run(ctx) {
    const { lat, lon } = ctx.region, T = window.THREE, L = ctx.lights;
    let hideFact = null;
    // what the 4 sensors read: the side the sun is ahead on reads more (err in degrees)
    const err = { pan: 0, tilt: 0 };
    const read = () => QUAD.map((m, i) => {
      const sx = i % 2 === 0 ? 1 : -1, sy = i < 2 ? 1 : -1;
      const v = ctx.light.level * (1 + 0.02 * sx * err.pan + 0.02 * sy * err.tilt);
      return clamp(v * (1 - 0.92 * clamp(ctx.soil.dust * m, 0, 1)), 0, 100);
    });
    try {
      const g = ctx.put(new T.Group(), 0, PANEL_Y, 0), ball = sunBall(R);
      g.add(ball);
      const s0 = sunAt(lat, EQUINOX, 7.2), p0 = poseFor(s0.el, s0.az, lat);
      ball.userData.setSun(s0.el, s0.az); ctx.sun(s0.el, s0.az);
      if (ctx.following) await Promise.all([ctx.tween(ctx.pose, "pan", p0.pan, 0.5), ctx.tween(ctx.pose, "tilt", p0.tilt, 0.5)]);
      else { ctx.pose.pan = p0.pan; ctx.pose.tilt = p0.tilt; }
      L.setup({ title: "Light on the 4 sensors", names: NAMES });
      L.show(true); L.note("Following the sun");
      const feed = ctx.during(3600, () => L.set(read()));
      feed.catch(() => {});

      await ctx.atSentence(0);
      hideFact = showFact("Tests: 0 mismatches between the Arduino code and the page");
      ctx.look(CAM2, 6.5);
      ctx.sound.rise?.(6, 200, 520);
      // the sun runs from east to west in 6 s; the motors follow a little behind
      let last = null;
      const sweep = poseFor(sunAt(lat, EQUINOX, 15.6).el, sunAt(lat, EQUINOX, 15.6).az, lat).pan - p0.pan;
      await ctx.during(ctx.stretch(6, sweep), (u, dt) => {
        const h = 7.2 + u * 8.4, s = sunAt(lat, EQUINOX, h), want = poseFor(s.el, s.az, lat);
        ball.userData.setSun(s.el, s.az); ctx.sun(s.el, s.az);
        ctx.setDate(dateFor(2023, EQUINOX, h, lon));
        const k = 1 - Math.exp(-dt * 3.2);
        if (last && Math.abs(want.pan - ctx.pose.pan) > 60) { ctx.pose.pan = want.pan; ctx.pose.tilt = want.tilt; }
        ctx.pose.pan += (want.pan - ctx.pose.pan) * k;
        ctx.pose.tilt += (want.tilt - ctx.pose.tilt) * k;
        err.pan = want.pan - ctx.pose.pan; err.tilt = want.tilt - ctx.pose.tilt;
        last = want;
      });
      err.pan = err.tilt = 0;
      L.note("Facing the sun");

      // dust lands, the light drops, the panel rocks it off
      await ctx.atSentence(1);
      const home = { pan: ctx.pose.pan, tilt: ctx.pose.tilt };
      g.visible = false;   // close in, the sun ball would fill the sky; the light stays
      ctx.look(CAM_DUST, 2.2);
      ctx.sound.wind(0.5);
      ctx.scene.particles.set("dust", 0.55, new T.Vector3(10, 0, 3));
      await ctx.during(1.8, u => { ctx.soil.dust = 0.72 * u * (2 - u); });
      ctx.scene.particles.set("none", 0, new T.Vector3());
      ctx.sound.wind(0.1);
      L.note("The light dropped: rocking it clean");
      for (const end of [28, 152, 40, 140]) {
        const from = ctx.pose.tilt;
        ctx.sound.whoosh();
        await ctx.during(0.7, (u, dt) => {
          ctx.pose.tilt = from + (end - from) * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
          ctx.soil.dust = Math.max(0.03, ctx.soil.dust - dt * 0.28);
        });
      }
      await Promise.all([ctx.tween(ctx.pose, "tilt", home.tilt, 0.9), ctx.tween(ctx.soil, "dust", 0, 0.9)]);
      L.note("Clean again");
      ctx.done?.();          // the light card stays until the chapter ends
      await ctx.wait(3600);
    } finally {
      if (hideFact) hideFact();
    }
  },
};
