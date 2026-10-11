// Pixel "light field" for each of the 4 lights: a soft glow turned into crisp dots with ordered
// (Bayer 4x4) dithering, like old print and pixel art. More light = more dots. Each image is made
// once per level and kept, so it costs nothing after the first time.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const W = 80, H = 14, cache = new Map();   // shown at exactly 2x: 160 x 28 CSS pixels

// level 0..100, kind: "lit" (sunlight / torch), "shade" or "dark"
export function lightField(level, kind) {
  const key = `${Math.round(level / 2) * 2}|${kind}`;
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H);
  const k = Math.max(0, Math.min(1, (level - 30) / 65));            // how bright, 0..1
  const col = kind === "lit" ? [245, 158, 11] : kind === "dark" ? [55, 65, 81] : [107, 114, 128];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // a round glow in the middle, like light landing on the sensor: wider and denser with more light
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const v = (0.15 + 0.95 * k) * Math.exp(-(dx * dx) / (0.04 + 0.5 * k * k) - dy * dy * 0.9);
    if (v > BAYER[(y % 4) * 4 + (x % 4)]) {
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL();
  cache.set(key, url);
  return url;
}
