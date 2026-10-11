// Textures drawn in code for the tracker model: plywood grain, the solar cells, the light sensor
// faces (GL5528 with its red zig-zag track), header pin holes, and the servo stickers.
// Each is made once and shared.
const T = () => window.THREE;
const cache = {};

function canvas(w, h) { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; return [cv, cv.getContext("2d")]; }
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function done(key, cv, { wrap = false, aniso = 4 } = {}) {
  const THREE = T(), tex = new THREE.CanvasTexture(cv);
  if (wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return (cache[key] = tex);
}

// Light birch plywood: soft wavy grain along x, a few darker streaks, one faint knot.
export function plywoodTexture() {
  if (cache.ply) return cache.ply;
  const [cv, c] = canvas(512, 512), r = rnd(4242);
  c.fillStyle = "#dcbd90"; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {   // wide soft bands
    c.fillStyle = `rgba(${r() > 0.5 ? "236,212,170" : "196,160,112"},${(0.08 + r() * 0.12).toFixed(2)})`;
    c.fillRect(0, r() * 512, 512, 6 + r() * 30);
  }
  for (let i = 0; i < 150; i++) {  // thin grain lines, wavy, tileable across x
    const y0 = r() * 512, amp = 2 + r() * 6, k = (1 + Math.floor(r() * 3)) * Math.PI * 2 / 512, ph = r() * 6;
    c.strokeStyle = `rgba(${r() > 0.3 ? "150,108,62" : "242,222,186"},${(0.06 + r() * 0.16).toFixed(2)})`;
    c.lineWidth = 0.6 + r() * 1.4; c.beginPath();
    for (let x = 0; x <= 512; x += 8) { const y = y0 + Math.sin(x * k + ph) * amp; x ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  c.strokeStyle = "rgba(140,98,56,0.25)"; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(330, 200, 10 + i * 7, 4 + i * 3, 0, 0, Math.PI * 2); c.stroke(); }
  return done("ply", cv, { wrap: true, aniso: 8 });
}

// The solar panel face: 4 x 4 dark blue cells, thin silver gaps, fine fingers and 2 bus bars each.
export function cellTexture() {
  if (cache.cell) return cache.cell;
  const N = 1024, [cv, c] = canvas(N, N), r = rnd(777), n = 4, gap = 7, cs = (N - gap * (n + 1)) / n;
  c.fillStyle = "#c9ccd2"; c.fillRect(0, 0, N, N);                         // the silver grid between cells
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = gap + i * (cs + gap), y = gap + j * (cs + gap);
    const g = c.createLinearGradient(x, y, x + cs, y + cs);
    g.addColorStop(0, "#1a2f66"); g.addColorStop(0.5, "#14275a"); g.addColorStop(1, "#1d3672");
    c.fillStyle = g; c.fillRect(x, y, cs, cs);
    for (let k = 0; k < 60; k++) {                                            // crystal shimmer
      c.fillStyle = `rgba(70,100,170,${(r() * 0.12).toFixed(2)})`;
      c.fillRect(x + r() * cs, y + r() * cs, 6 + r() * 30, 2 + r() * 8);
    }
    c.fillStyle = "rgba(150,165,195,0.35)";                                    // fingers
    for (let f = 8; f < cs; f += 11) c.fillRect(x, y + f, cs, 1);
    c.fillStyle = "#b8bcc4";                                                  // bus bars
    c.fillRect(x + cs * 0.3 - 3, y, 6, cs); c.fillRect(x + cs * 0.7 - 3, y, 6, cs);
  }
  return done("cell", cv, { aniso: 8 });
}

// GL5528 light sensor face: white ceramic rim, silver electrodes, red-orange zig-zag CdS track.
export function ldrFaceTexture() {
  if (cache.ldr) return cache.ldr;
  const [cv, c] = canvas(256, 256);
  c.fillStyle = "#efe9de"; c.fillRect(0, 0, 256, 256);
  c.save(); c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.clip();
  c.fillStyle = "#d4d0c8"; c.fillRect(0, 0, 256, 256);                       // electrodes
  c.strokeStyle = "#c4402a"; c.lineWidth = 15; c.lineJoin = "round"; c.beginPath();
  const rows = 7, x0 = 46, x1 = 210;
  for (let i = 0; i <= rows; i++) {
    const y = 40 + i * (176 / rows), a = i % 2 ? x1 : x0, b = i % 2 ? x0 : x1;
    i ? c.lineTo(a, y) : c.moveTo(a, y); c.lineTo(b, y);
  }
  c.stroke();
  c.strokeStyle = "rgba(255,170,140,0.5)"; c.lineWidth = 3; c.stroke();     // a little shine on the track
  c.restore();
  c.strokeStyle = "#bdb6aa"; c.lineWidth = 5; c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.stroke();
  return done("ldr", cv);
}

// Black plastic with one square pin hole per tile (repeat along u). The corner pixel is plain black.
export function headerTexture() {
  if (cache.hdr) return cache.hdr;
  const [cv, c] = canvas(32, 32);
  c.fillStyle = "#1b1b1d"; c.fillRect(0, 0, 32, 32);
  c.fillStyle = "#2c2c30"; c.fillRect(8, 8, 16, 16);
  c.fillStyle = "#050505"; c.fillRect(11, 11, 10, 10);
  return done("hdr", cv, { wrap: true, aniso: 4 });
}

// A servo sticker: bg colour, the part name and a small line of text. Corner pixel = body colour.
// w, h: canvas size, the same shape as the face it goes on.
export function stickerTexture(key, bg, name, sub, { w = 256, h = 256, ink = "#f2f2f2", band = "rgba(255,255,255,0.08)" } = {}) {
  if (cache[key]) return cache[key];
  const [cv, c] = canvas(w, h), cx = w / 2;
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.fillStyle = band; c.fillRect(w * 0.07, h * 0.27, w * 0.86, h * 0.46);
  c.fillStyle = ink; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `800 ${Math.round(h * 0.2)}px Inter, Helvetica, sans-serif`; c.fillText(name, cx, h * 0.44);
  c.font = `600 ${Math.round(h * 0.09)}px Inter, Helvetica, sans-serif`; c.fillText(sub, cx, h * 0.62);
  return done(key, cv);
}
