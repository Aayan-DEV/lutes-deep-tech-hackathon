// Falling leaves are drawn as one THREE.InstancedMesh of small flat quads (a point sprite cannot
// tip and turn in 3D). The leaf picture is drawn once on a tiny canvas: a white oval with a darker
// mid vein, side veins and a stem; each leaf gets its own colour (brown, olive, yellow, dull red)
// through the instance colour, so one texture and one draw call cover all of them.
//
//   makeLeafMesh(N, K) -> InstancedMesh (count 0, hidden until leaves are on)
//   writeLeaves(G)     -> per frame: puts every leaf's position, turn and size into the mesh
//
// The leaf lies in the x-z plane, long side along x, 1 unit long. Its turn comes from the same
// phase that moves it (particles_kinds.js leaves.move), so the tip-over matches the side sway.

const COLORS = [0x8a5a2b, 0x7c7f2c, 0xd2a12a, 0x9c4429];   // brown, olive, yellow, dull red

let texture = null;
function leafTexture() {
  if (texture) return texture;
  const S = 64, cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d");
  // the blade: a pointed oval, a bit lighter in the middle
  g.beginPath();
  g.moveTo(6, S / 2);
  g.bezierCurveTo(18, 8, 46, 8, 60, S / 2);
  g.bezierCurveTo(46, S - 8, 18, S - 8, 6, S / 2);
  const fill = g.createLinearGradient(0, 8, 0, S - 8);
  fill.addColorStop(0, "#d8d8d8"); fill.addColorStop(0.5, "#ffffff"); fill.addColorStop(1, "#c8c8c8");
  g.fillStyle = fill; g.fill();
  // mid vein and stem
  g.strokeStyle = "rgba(60,50,40,0.55)"; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(1, S / 2); g.lineTo(56, S / 2); g.stroke();
  // side veins
  g.lineWidth = 1.2; g.strokeStyle = "rgba(60,50,40,0.35)";
  for (let k = 0; k < 4; k++) {
    const x = 16 + k * 10;
    g.beginPath(); g.moveTo(x, S / 2); g.lineTo(x + 8, S / 2 - 10 + k * 1.5); g.stroke();
    g.beginPath(); g.moveTo(x, S / 2); g.lineTo(x + 8, S / 2 + 10 - k * 1.5); g.stroke();
  }
  texture = new THREE.CanvasTexture(cv);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

export function makeLeafMesh(N, K) {
  const geo = new THREE.PlaneGeometry(1, 0.6);
  geo.rotateX(-Math.PI / 2);   // lie flat, facing up
  const mat = new THREE.MeshLambertMaterial({ map: leafTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    c.setHex(COLORS[i % COLORS.length]).multiplyScalar(0.85 + Math.random() * 0.3);
    mesh.setColorAt(i, c);
  }
  mesh.instanceColor.needsUpdate = true;
  mesh.count = 0;
  mesh.userData.size = Float32Array.from({ length: N }, (_, i) => K.size(i));
  return mesh;
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, "YZX");
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// G is the particle group from particles.js (P = shared state, K = the 'leaves' kind).
export function writeLeaves(G, half) {
  const { P, K, pts: mesh, alive } = G, pos = P.pos, size = mesh.userData.size, t = P.t;
  for (let i = 0; i < G.drawn; i++) {
    const j = i * 3;
    let s = alive[i] ? size[i] : 0;
    if (s > 0) {
      // shrink away near the sides of the box so leaves do not pop in and out at its edge
      s *= 1 - smooth(0.75 * half, half, Math.max(Math.abs(pos[j]), Math.abs(pos[j + 2])));
      const rest = P.aux[i];
      if (rest > 0) s *= Math.min(1, rest / 0.5);   // lying on the ground: shrink in the last half second
      K.turn(P, i, t, _e);
      _q.setFromEuler(_e);
    } else _q.identity();
    _p.set(pos[j], pos[j + 1], pos[j + 2]);
    _s.set(s, s, s);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  mesh.count = G.drawn;
  mesh.instanceMatrix.needsUpdate = true;
}
