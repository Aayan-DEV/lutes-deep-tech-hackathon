// Photo cards over the 3D for the story: 1 to 3 photos with a caption under each, at the top of
// the screen (above the sentences), fading in one after another. Styled by css/story_photos.css,
// which is loaded here at run time.
//   showPhotos(ctx, [{ src, caption, fit? }], { stagger = 0.45 s, delays? [s per card], small? }) -> id
//                          small: 70 % size and only in the upper third, so people in the 3D stay in view
//   hidePhotos(id?)        fades the cards out; with an id, only if those cards are still the ones shown
//   photosFrom(ctx, k, photos, opts)  shows them while sentence k or later is on screen (Back hides
//                          them again) and hides them when the chapter ends; await it last in run()
//   showFact(text) -> hide()   a small tag at the top left with one plain fact
//   preloadPhotos(srcs)    fetches the images early so they appear at once
// src is relative to the page (for example "media/IMG_6999.jpg").

const CSS_ID = "story-photos-css";
let root = null, gen = 0;
const cache = new Map();

function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const l = document.createElement("link");
  l.id = CSS_ID; l.rel = "stylesheet";
  l.href = new URL("../../css/story_photos.css", import.meta.url).href;
  document.head.appendChild(l);
}

export function preloadPhotos(srcs) {
  for (const s of srcs) {
    if (cache.has(s)) continue;
    const img = new Image(); img.decoding = "async"; img.src = s;
    cache.set(s, img);
  }
}

export function showPhotos(ctx, photos, { stagger = 0.45, delays = null, small = false } = {}) {
  if (ctx && ctx.cancelled && ctx.cancelled()) return 0;
  ensureCss();
  hidePhotos();
  const id = ++gen, el = document.createElement("div");
  el.className = small ? "story-photos small" : "story-photos";
  el.setAttribute("aria-label", "Photos");
  (photos || []).slice(0, 3).forEach((p, i) => {
    const fig = document.createElement("figure"), img = new Image(), cap = document.createElement("figcaption");
    fig.className = "sp-card";
    fig.style.setProperty("--d", `${delays ? (delays[i] ?? i * stagger) : i * stagger}s`);
    img.decoding = "async"; img.alt = p.caption || ""; img.src = p.src;
    if (p.fit) img.style.objectFit = p.fit;
    cap.textContent = p.caption || "";
    fig.append(img, cap);
    el.appendChild(fig);
  });
  document.body.appendChild(el);
  root = { el, id };
  // two frames so the browser has the hidden state before the fade starts
  requestAnimationFrame(() => requestAnimationFrame(() => { if (root && root.id === id) el.classList.add("in"); }));
  return id;
}

export function hidePhotos(id) {
  if (!root || (id && root.id !== id)) return;
  const { el } = root;
  root = null;
  el.classList.remove("in"); el.classList.add("out");
  setTimeout(() => el.remove(), 400);
}

// Shown while the narrator is at sentence k or later; hidden when the chapter is cut short.
export async function photosFrom(ctx, k, photos, opts) {
  let id = 0;
  try {
    await ctx.during(3600, () => {
      const want = ctx.sentence >= k;
      if (want && !id) id = showPhotos(ctx, photos, opts);
      else if (!want && id) { hidePhotos(id); id = 0; }
    });
  } finally {
    if (id) hidePhotos(id);
  }
}

export function showFact(text) {
  ensureCss();
  const el = document.createElement("div");
  el.className = "story-fact";
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
  return () => { el.classList.remove("in"); setTimeout(() => el.remove(), 500); };
}
