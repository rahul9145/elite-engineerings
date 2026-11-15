/* Elite Engineerings — hero: a solid steel bar machined live into a hydraulic union fitting.
   OP10 turning → OP20 thread cutting → OP30 hex milling → OP40 drilling → OP50 laser inspection. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.querySelector(".hero-visual");
const mount = document.querySelector(".hero-canvas");

function fail() { if (host) host.classList.add("no-webgl"); }

if (host && mount) {
  // Let the headline animate first; build the 3D scene once the main thread is free.
  const start = () => { try { init(); } catch (e) { console.warn("[hero3d]", e); fail(); } };
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  setTimeout(() => idle(start, { timeout: 1200 }), 600);
}

function init() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.2, 14.6);

  /* ---------- Materials ---------- */
  const partMat = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.22, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 1.45 });
  const holderMat = new THREE.MeshPhysicalMaterial({ color: 0x3a3f46, metalness: 0.85, roughness: 0.35 });
  const tinMat = new THREE.MeshPhysicalMaterial({ color: 0xd9a933, metalness: 1, roughness: 0.25 });
  const carbideMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.3 });
  const redRubber = new THREE.MeshPhysicalMaterial({ color: 0xe5252b, metalness: 0, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });

  /* ---------- Part geometry: dynamic surface of revolution ---------- */
  const STOCK = 1.0;                 // bar radius (= hex circumradius)
  const AF = Math.cos(Math.PI / 6);  // hex across-flats half width (0.866)
  const PITCH = 0.085, STEP = PITCH / 8;
  const Y0 = -3.0, NP = 560, Y1 = Y0 + (NP - 1) * STEP; // ≈ 2.94
  const HEX0 = -1.16, HEX1 = -0.24;
  const THR_A = [1.66, 2.86], THR_B = [-2.92, -1.52];
  const BORE = 0.24, BORE_DEPTH = 0.74;
  const SEG = 84;
  const P = NP + 4;                  // profile points: left centre + NP outer + 3 bore points

  function turnedR(y) {
    if (y < -2.92) return 0.40 + ((y - Y0) / 0.08) * 0.065;
    if (y < -1.52) return 0.465;
    if (y < -1.38) return 0.36;
    if (y < -1.34) return 0.56 + ((y + 1.38) / 0.04) * 0.04;
    if (y < HEX0) return 0.60;
    if (y < HEX1) return STOCK;
    if (y < -0.02) return 0.72;
    if (y < 0.02) return 0.72 - ((y + 0.02) / 0.04) * 0.10;
    if (y < 0.16) return 0.62;
    if (y < 0.36) return 0.52;
    if (y < 1.25) return 0.62;
    if (y < 1.62) return 0.62 - ((y - 1.25) / 0.37) * 0.155;
    if (y < 2.86) return 0.465;
    return 0.465 - ((y - 2.86) / 0.08) * 0.065;
  }
  function threadR(y) {
    const t = (((y - Y0) / PITCH) % 1 + 1) % 1;
    return 0.40 + 0.065 * (t < 0.5 ? t * 2 : (1 - t) * 2);
  }
  const inA = (y) => y >= THR_A[0] && y <= THR_A[1];
  const inB = (y) => y >= THR_B[0] && y <= THR_B[1];

  const VPS = (SEG + 1) * 2;              // vertices per profile segment
  const VCOUNT = (P - 1) * VPS;
  const posArr = new Float32Array(VCOUNT * 3);
  const nrmArr = new Float32Array(VCOUNT * 3);
  const colArr = new Float32Array(VCOUNT * 3);
  const idx = new Uint32Array((P - 1) * SEG * 6);
  { let o = 0;
    for (let s = 0; s < P - 1; s++) {
      const base = s * VPS;
      for (let i = 0; i < SEG; i++) {
        const a = base + i * 2, d = a + 1, b = a + 2, c = a + 3;
        idx[o++] = a; idx[o++] = b; idx[o++] = d;
        idx[o++] = c; idx[o++] = d; idx[o++] = b;
      }
    }
  }
  const partGeo = new THREE.BufferGeometry();
  partGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3).setUsage(THREE.DynamicDrawUsage));
  partGeo.setAttribute("normal", new THREE.BufferAttribute(nrmArr, 3).setUsage(THREE.DynamicDrawUsage));
  partGeo.setAttribute("color", new THREE.BufferAttribute(colArr, 3).setUsage(THREE.DynamicDrawUsage));
  partGeo.setIndex(new THREE.BufferAttribute(idx, 1));
  partGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

  const sinT = new Float32Array(SEG + 1), cosT = new Float32Array(SEG + 1);
  for (let i = 0; i <= SEG; i++) { const t = (i / SEG) * Math.PI * 2; sinT[i] = Math.sin(t); cosT[i] = Math.cos(t); }
  const faceSin = [], faceCos = [];
  for (let f = 0; f < 6; f++) { const p = Math.PI / 6 + f * Math.PI / 3; faceSin.push(Math.sin(p)); faceCos.push(Math.cos(p)); }

  const pr = new Float32Array(P), py = new Float32Array(P), pm = new Uint8Array(P);
  const RAW = [0.5, 0.52, 0.55], CUT = [1, 1, 1];

  // Machining state
  const st = { cutY: 99, thrA: 99, thrB: 99, millFace: 0, millY: 99, drill: 0 };

  function rebuild() {
    let n = 0;
    const turnedDone = st.cutY < Y0;
    pr[n] = 0; py[n] = Y0; pm[n] = turnedDone ? 1 : 0; n++;
    for (let j = 0; j < NP; j++) {
      const y = Y0 + j * STEP;
      let r = STOCK, m = 0;
      if (y > st.cutY) {
        r = turnedR(y); m = r < STOCK - 1e-3 ? 1 : 0;
        if ((inA(y) && y > st.thrA) || (inB(y) && y > st.thrB)) r = threadR(y);
      }
      pr[n] = r; py[n] = y; pm[n] = m; n++;
    }
    const d = st.drill, tip = 0.14 * Math.min(1, d / 0.14), faced = st.cutY < Y1 ? 1 : 0;
    pr[n] = BORE; py[n] = Y1; pm[n] = faced; n++;
    pr[n] = BORE; py[n] = Y1 - d; pm[n] = d > 0 ? 1 : 0; n++;
    pr[n] = 0; py[n] = Y1 - d - tip; pm[n] = d > 0 ? 1 : 0; n++;

    const milled = st.millFace;          // faces fully done
    let v = 0;
    for (let s = 0; s < P - 1; s++) {
      const ra = pr[s], ya = py[s], rb = pr[s + 1], yb = py[s + 1];
      const dr = rb - ra, dy = yb - ya, len = Math.hypot(dr, dy);
      let nr = 1, ny = 0;
      if (len > 1e-6) { nr = dy / len; ny = -dr / len; }
      const wall = Math.abs(ny) > 0.5;
      for (let i = 0; i <= SEG; i++) {
        for (let k = 0; k < 2; k++) {
          const r = k ? rb : ra, y = k ? yb : ya;
          let x = r * sinT[i], z = r * cosT[i];
          let nx = nr * sinT[i], nz = nr * cosT[i], nyy = ny;
          let m = k ? pm[s + 1] : pm[s];
          if (y >= HEX0 - 1e-4 && y <= HEX1 + 1e-4 && (milled > 0 || st.millY < 9)) {
            for (let f = 0; f < 6; f++) {
              const done = f < milled || (f === milled && y >= st.millY);
              if (!done) continue;
              const dd = x * faceSin[f] + z * faceCos[f];
              if (dd > AF) {
                x -= (dd - AF) * faceSin[f]; z -= (dd - AF) * faceCos[f];
                if (!wall) { nx = faceSin[f]; nz = faceCos[f]; nyy = 0; }
                m = 1;
                break;
              }
            }
          }
          const o = v * 3;
          posArr[o] = x; posArr[o + 1] = y; posArr[o + 2] = z;
          nrmArr[o] = nx; nrmArr[o + 1] = nyy; nrmArr[o + 2] = nz;
          const c = m ? CUT : RAW;
          colArr[o] = c[0]; colArr[o + 1] = c[1]; colArr[o + 2] = c[2];
          v++;
        }
      }
    }
    partGeo.attributes.position.needsUpdate = true;
    partGeo.attributes.normal.needsUpdate = true;
    partGeo.attributes.color.needsUpdate = true;
  }

  const spin = new THREE.Group();      // lathe spindle
  const axis = new THREE.Group();      // lays the part on its side (+x = up)
  const tilt = new THREE.Group();      // mouse / scroll orientation
  const holder = new THREE.Group();    // scale for load / eject
  spin.add(new THREE.Mesh(partGeo, partMat));
  axis.add(spin); holder.add(axis); tilt.add(holder); scene.add(tilt);
  axis.rotation.z = Math.PI / 2 + 0.16;

  const oring = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.085, 24, 96), redRubber);
  oring.rotation.x = Math.PI / 2; oring.position.y = 0.26; oring.scale.setScalar(0.001); spin.add(oring);

  /* ---------- Tools (in axis space: +x = up, y = part axis) ---------- */
  function prism(points, depth, mat) {
    const sh = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return new THREE.Mesh(g, mat);
  }

  // OP10 — turning tool: holder + rhombic (CNMG-style) TiN insert
  const turnTool = new THREE.Group();
  { const h = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.36, 0.36), holderMat); h.position.x = 1.2; turnTool.add(h);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), holderMat); pocket.position.set(0.32, 0.06, 0); turnTool.add(pocket);
    const ins = prism([[0, 0], [0.2, 0.13], [0.4, 0], [0.2, -0.13]], 0.07, tinMat); ins.position.z = 0.17; turnTool.add(ins);
    turnTool.rotation.z = -0.12; }
  // OP20 — threading tool: slim holder + 60° pointed insert
  const threadTool = new THREE.Group();
  { const h = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.28), holderMat); h.position.x = 1.12; threadTool.add(h);
    const ins = prism([[0, 0], [0.24, 0.12], [0.24, -0.12]], 0.06, carbideMat); ins.position.z = 0.1; threadTool.add(ins);
    const tipM = prism([[0, 0], [0.06, 0.03], [0.06, -0.03]], 0.062, tinMat); tipM.position.z = 0.1; threadTool.add(tipM); }
  // OP30 — face mill: body + 8 TiN inserts + arbor
  const mill = new THREE.Group(); const millRot = new THREE.Group(); mill.add(millRot);
  { const bodyG = new THREE.CylinderGeometry(0.6, 0.6, 0.32, 48); bodyG.rotateZ(Math.PI / 2); const body = new THREE.Mesh(bodyG, holderMat); body.position.x = 0.2; millRot.add(body);
    const arbG = new THREE.CylinderGeometry(0.24, 0.24, 1.6, 32); arbG.rotateZ(Math.PI / 2); const arb = new THREE.Mesh(arbG, carbideMat); arb.position.x = 1.15; millRot.add(arb);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const ins = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.06), tinMat); ins.position.set(0.06, Math.cos(a) * 0.56, Math.sin(a) * 0.56); ins.rotation.x = -a; millRot.add(ins); } }
  // OP40 — fluted TiN twist drill along the part axis
  const drill = new THREE.Group();
  { const g = new THREE.CylinderGeometry(0.235, 0.235, 1.6, 48, 40); g.translate(0, 0.94, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const th = Math.atan2(z, x) - y * 4.2; const f = 1 - 0.3 * Math.pow(Math.abs(Math.cos(th)), 6); p.setX(i, x * f); p.setZ(i, z * f); }
    g.computeVertexNormals(); drill.add(new THREE.Mesh(g, tinMat));
    const cone = new THREE.ConeGeometry(0.235, 0.14, 48); cone.rotateX(Math.PI); cone.translate(0, 0.07, 0); drill.add(new THREE.Mesh(cone, tinMat));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.2, 32), carbideMat); sh.position.y = 2.34; drill.add(sh); }
  // OP50 — laser inspection ring
  const laser = new THREE.Group();
  { const ringM = new THREE.MeshBasicMaterial({ color: 0xff2a30, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.012, 8, 120), ringM); ring.rotation.x = Math.PI / 2; laser.add(ring);
    const discM = new THREE.MeshBasicMaterial({ color: 0xff2a30, transparent: true, opacity: 0.1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const disc = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.08, 96), discM); disc.rotation.x = Math.PI / 2; laser.add(disc); }
  [turnTool, threadTool, mill, drill, laser].forEach((t) => { t.visible = false; axis.add(t); });

  /* ---------- Lights ---------- */
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3b3f, 2.4); rim.position.set(-6, -2, -4); scene.add(rim);
  const sparkLight = new THREE.PointLight(0xff8a3a, 0, 4, 2); scene.add(sparkLight);

  /* ---------- Sparks (additive streaks) ---------- */
  const MAX = 260;
  const sp = new Float32Array(MAX * 6), sc = new Float32Array(MAX * 6), vel = new Float32Array(MAX * 3), life = new Float32Array(MAX), head = new Float32Array(MAX * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sc, 3));
  const sparks = new THREE.LineSegments(sparkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false; scene.add(sparks);
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.25, "rgba(255,140,60,.8)"); gr.addColorStop(1, "rgba(255,40,40,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  scene.add(glow);

  let cursor = 0;
  const emitW = new THREE.Vector3();
  function emit(n, spread) {
    for (let k = 0; k < n; k++) {
      const i = cursor; cursor = (cursor + 1) % MAX;
      life[i] = 0.3 + Math.random() * 0.5;
      head[i * 3] = emitW.x + (Math.random() - 0.5) * spread; head[i * 3 + 1] = emitW.y; head[i * 3 + 2] = emitW.z + (Math.random() - 0.5) * spread;
      const s = 2.5 + Math.random() * 4.5, a = (Math.random() - 0.5) * 2.4;
      vel[i * 3] = Math.cos(a) * s * (Math.random() < 0.5 ? 1 : -1);
      vel[i * 3 + 1] = Math.abs(Math.sin(a)) * s + 1.5;
      vel[i * 3 + 2] = (Math.random() * 2 + 0.6) * s * 0.45;
    }
  }
  function updateSparks(dt) {
    for (let i = 0; i < MAX; i++) {
      const o = i * 6;
      if (life[i] <= 0) { sc[o] = sc[o + 1] = sc[o + 2] = sc[o + 3] = sc[o + 4] = sc[o + 5] = 0; continue; }
      life[i] -= dt;
      vel[i * 3 + 1] -= 9.8 * dt * 0.9;
      head[i * 3] += vel[i * 3] * dt; head[i * 3 + 1] += vel[i * 3 + 1] * dt; head[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const L = 0.035;
      sp[o] = head[i * 3]; sp[o + 1] = head[i * 3 + 1]; sp[o + 2] = head[i * 3 + 2];
      sp[o + 3] = head[i * 3] - vel[i * 3] * L; sp[o + 4] = head[i * 3 + 1] - vel[i * 3 + 1] * L; sp[o + 5] = head[i * 3 + 2] - vel[i * 3 + 2] * L;
      const t = Math.max(life[i], 0) / 0.8;
      sc[o] = t + 0.2; sc[o + 1] = 0.75 * t * t + 0.05; sc[o + 2] = 0.35 * t * t * t;
      sc[o + 3] = sc[o] * 0.35; sc[o + 4] = sc[o + 1] * 0.2; sc[o + 5] = 0;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;
  }

  /* ---------- HUD labels pinned to 3D anchors ---------- */
  const anchors = [];
  document.querySelectorAll("[data-anchor]").forEach((el) => {
    const [x, y, z] = el.getAttribute("data-anchor").split(",").map(Number);
    const o = new THREE.Object3D(); o.position.set(x, y, z); axis.add(o);
    anchors.push({ el, o, left: el.classList.contains("left") });
  });
  const tmp = new THREE.Vector3();
  function placeLabels(w, h) {
    const r = mount.getBoundingClientRect(), hr = host.getBoundingClientRect();
    const ox = r.left - hr.left, oy = r.top - hr.top;
    for (const a of anchors) {
      a.o.getWorldPosition(tmp); tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      const lw = a.left ? a.el.offsetWidth : 0;
      a.el.style.transform = `translate(${(ox + x - (a.left ? lw - 4.5 : 4.5)).toFixed(1)}px, ${(oy + y - a.el.offsetHeight / 2).toFixed(1)}px)`;
    }
  }

  /* ---------- Operation read-out ---------- */
  const opName = document.getElementById("op-name"), opStep = document.getElementById("op-step");
  const STAGES = [
    { id: "load", dur: 1.0, op: "OP 00", name: "Raw bar stock" },
    { id: "turn", dur: 3.6, op: "OP 10", name: "CNC turning" },
    { id: "thread", dur: 2.2, op: "OP 20", name: "Thread cutting" },
    { id: "mill", dur: 4.8, op: "OP 30", name: "Hex milling" },
    { id: "drill", dur: 1.9, op: "OP 40", name: "Drilling" },
    { id: "inspect", dur: 1.9, op: "OP 50", name: "Laser inspection" },
    { id: "done", dur: 4.6, op: "QC ✓", name: "Union fitting" },
    { id: "eject", dur: 0.8, op: "—", name: "Next part" },
  ];
  const TOTAL = STAGES.reduce((a, s) => a + s.dur, 0);

  /* ---------- Sizing ---------- */
  let W = 1, H = 1;
  function resize() {
    W = mount.clientWidth; H = mount.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.z = W < 700 ? 15.5 : 14.6;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- Interaction ---------- */
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener("pointermove", (e) => {
    tmx = (e.clientX / window.innerWidth) * 2 - 1;
    tmy = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(host);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });

  /* ---------- Helpers ---------- */
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const lerp = (a, b, t) => a + (b - a) * t;
  const local = new THREE.Vector3();
  function emitAt(x, y, z, n, spread) { local.set(x, y, z); emitW.copy(local); axis.localToWorld(emitW); emit(n, spread); }
  function nearestAngle(cur, target) { return target + Math.PI * 2 * Math.round((cur - target) / (Math.PI * 2)); }

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let running = false, t = 0, cycleT = 0;
  let lastStage = "", spinVel = 0, flicker = 0;

  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    if (!reduceMotion) cycleT = (cycleT + dt) % TOTAL;

    // Which stage are we in?
    let acc = 0, stage = STAGES[0], p = 0;
    for (const s of STAGES) { if (cycleT < acc + s.dur) { stage = s; p = (cycleT - acc) / s.dur; break; } acc += s.dur; }
    if (reduceMotion) { stage = STAGES[6]; p = 0.5; }

    if (stage.id !== lastStage) {
      if (opName) opName.textContent = stage.name;
      if (opStep) opStep.textContent = stage.op;
      host.classList.toggle("hud-ready", stage.id === "done");
      // Put the part in the state every earlier operation leaves it in.
      const k = STAGES.indexOf(stage);
      st.cutY = k > 1 ? -99 : 99;
      st.thrA = st.thrB = k > 2 ? -99 : 99;
      st.millFace = k > 3 ? 6 : 0; st.millY = 99;
      st.drill = k > 4 ? BORE_DEPTH : 0;
      if (k < 5) oring.scale.setScalar(0.001);
      if (stage.id === "mill") spin.rotation.y = spin.rotation.y % (Math.PI * 2);
      rebuild();
      lastStage = stage.id;
    }

    turnTool.visible = stage.id === "turn";
    threadTool.visible = stage.id === "thread";
    mill.visible = stage.id === "mill";
    drill.visible = stage.id === "drill";
    laser.visible = stage.id === "inspect";

    let targetSpin = 0, cutting = false;
    const ex = 2.6; // tool approach distance

    if (stage.id === "load") {
      holder.scale.setScalar(lerp(0.001, 1, ease(clamp01(p * 1.4))));
      holder.position.x = lerp(-3, 0, ease(clamp01(p * 1.2)));
      targetSpin = 1.5;
    } else if (stage.id === "eject") {
      holder.scale.setScalar(lerp(1, 0.001, ease(p)));
      holder.position.x = lerp(0, 3.5, ease(p));
      targetSpin = 1.5;
    } else { holder.scale.setScalar(1); holder.position.x = 0; }

    if (stage.id === "turn") {
      targetSpin = 16;
      const inP = clamp01(p / 0.1), outP = clamp01((p - 0.93) / 0.07);
      const travel = clamp01((p - 0.1) / 0.83);
      st.cutY = lerp(Y1 + 0.12, Y0 - 0.06, travel);
      const r = turnedR(Math.min(Math.max(st.cutY, Y0), Y1));
      turnTool.position.set(r + (1 - ease(inP)) * ex + ease(outP) * ex, st.cutY, 0);
      cutting = inP >= 1 && outP <= 0 && r < STOCK - 0.01 && st.cutY < Y1 && st.cutY > Y0;
      rebuild();
      if (cutting) emitAt(r, st.cutY, 0.1, 3, 0.05);
    }
    if (stage.id === "thread") {
      targetSpin = 16;
      const half = p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5;
      const inP = clamp01(half / 0.15), outP = clamp01((half - 0.88) / 0.12), tr = clamp01((half - 0.15) / 0.73);
      let y;
      if (p < 0.5) { y = lerp(THR_A[1] + 0.05, THR_A[0], tr); st.thrA = y; st.thrB = 99; }
      else { st.thrA = -99; y = lerp(THR_B[1] + 0.05, THR_B[0] - 0.02, tr); st.thrB = y; }
      threadTool.position.set(0.4 + (1 - ease(inP)) * ex + ease(outP) * ex, y, 0);
      cutting = inP >= 1 && outP <= 0;
      rebuild();
      if (cutting) emitAt(0.43, y, 0.1, 2, 0.04);
    }
    if (stage.id === "mill") {
      st.thrA = -99; st.thrB = -99;
      const per = 1 / 6, f = Math.min(5, Math.floor(p / per)), q = (p - f * per) / per;
      st.millFace = f;
      const phi = Math.PI / 6 + f * Math.PI / 3;
      const target = nearestAngle(spin.rotation.y, Math.PI / 2 - phi);
      if (q < 0.25) spin.rotation.y = lerp(spin.rotation.y, target, 0.25);
      else spin.rotation.y = target;
      const tr = clamp01((q - 0.25) / 0.65);
      const startY = HEX1 + 0.62, endY = HEX0 - 0.62;
      st.millY = q < 0.25 ? 99 : (q > 0.9 ? -99 : lerp(startY, endY, tr));
      const lift = q < 0.25 ? 0.6 * (1 - ease(q / 0.25)) : (q > 0.9 ? 0.6 * ease((q - 0.9) / 0.1) : 0);
      const enter = f === 0 && q < 0.25 ? (1 - ease(q / 0.25)) * 2 : 0;
      mill.position.set(AF + lift + enter, q < 0.25 ? startY : (q > 0.9 ? endY : st.millY), 0);
      millRot.rotation.x += dt * 22;
      cutting = q >= 0.25 && q <= 0.9;
      rebuild();
      if (cutting) emitAt(AF + 0.02, st.millY - 0.5, 0, 3, 0.8);
    }
    if (stage.id === "drill") {
      st.millFace = 6; st.millY = 99;
      targetSpin = 12;
      const inP = clamp01(p / 0.2), outP = clamp01((p - 0.82) / 0.18), dp = clamp01((p - 0.2) / 0.62);
      st.drill = BORE_DEPTH * ease(dp);
      const tipY = p < 0.2 ? lerp(Y1 + 1.8, Y1, ease(inP)) : (p > 0.82 ? lerp(Y1 - BORE_DEPTH, Y1 + 1.8, ease(outP)) : Y1 - st.drill);
      drill.position.set(0, tipY, 0);
      drill.rotation.y += dt * 3;
      cutting = p >= 0.2 && p <= 0.82;
      rebuild();
      if (cutting) emitAt(0.24, Y1 + 0.02, 0.05, 2, 0.2);
    }
    if (stage.id === "inspect") {
      targetSpin = 3;
      oring.scale.setScalar(lerp(0.001, 1, ease(clamp01(p / 0.25))));
      laser.position.y = lerp(Y1 + 0.2, Y0 - 0.2, ease(clamp01((p - 0.15) / 0.85)));
    }
    if (stage.id === "done") { targetSpin = 0.7; oring.scale.setScalar(1); }

    if (stage.id !== "mill") { spinVel += (targetSpin - spinVel) * Math.min(1, dt * 4); if (!reduceMotion) spin.rotation.y += spinVel * dt; }
    else spinVel = 0;

    // Orientation
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    const scrollP = Math.min(window.scrollY / window.innerHeight, 1);
    const show = stage.id === "done" ? Math.sin(clamp01(p) * Math.PI) * 0.25 : 0;
    tilt.rotation.y = -0.55 + mx * 0.22 + scrollP * 0.5 + show;
    tilt.rotation.x = 0.22 + my * 0.12 - scrollP * 0.25;
    tilt.position.y = Math.sin(t * 0.8) * 0.05 + scrollP * 0.8;

    updateSparks(dt);
    flicker = cutting ? 0.7 + Math.random() * 0.6 : flicker * 0.8;
    sparkLight.position.copy(emitW); sparkLight.intensity = flicker * 6;
    glow.position.copy(emitW); glow.material.opacity = flicker * 0.9; glow.scale.setScalar(0.5 + flicker * 0.45);

    renderer.render(scene, camera);
    if (stage.id === "done") placeLabels(W, H);
  }
  if (/[?&]herodebug/.test(location.search)) window.__hero = { seek(v) { cycleT = v; lastStage = ""; }, get t() { return cycleT; }, stages: STAGES, bench() { const t0 = performance.now(); for (let i = 0; i < 10; i++) rebuild(); const t1 = performance.now(); for (let i = 0; i < 10; i++) renderer.render(scene, camera); renderer.getContext().finish(); return { rebuildMs: (t1 - t0) / 10, renderMs: (performance.now() - t1) / 10 }; } };
  function loop() { if (!running) { running = true; clock.getDelta(); frame(); } }

  rebuild();
  renderer.compile(scene, camera);
  loop();
}
