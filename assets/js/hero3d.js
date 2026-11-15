/* Elite Engineerings — hero: a turned hydraulic fitting on the lathe, rendered live with three.js */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.querySelector(".hero-visual");
const mount = document.querySelector(".hero-canvas");

function fail() { if (host) host.classList.add("no-webgl"); }

if (host && mount) {
  // Let the headline animate first; build the 3D scene once the main thread is free.
  const start = () => { try { init(); } catch (e) { console.warn("[hero3d]", e); fail(); } };
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  setTimeout(() => idle(start, { timeout: 1200 }), 700);
}

function init() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0.2, 13.5);

  /* ---------- Materials ---------- */
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xd4d8de, metalness: 1, roughness: 0.22, envMapIntensity: 1.15, side: THREE.DoubleSide });
  const steelTurned = new THREE.MeshPhysicalMaterial({ color: 0xc3c8cf, metalness: 1, roughness: 0.34, envMapIntensity: 1.0, side: THREE.DoubleSide });
  const steelDark = new THREE.MeshPhysicalMaterial({ color: 0x8e949c, metalness: 1, roughness: 0.42, side: THREE.DoubleSide });
  const redRubber = new THREE.MeshPhysicalMaterial({ color: 0xe5252b, metalness: 0.0, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const holderMat = new THREE.MeshPhysicalMaterial({ color: 0x3a3f46, metalness: 0.8, roughness: 0.35 });
  const tinMat = new THREE.MeshPhysicalMaterial({ color: 0xd9a933, metalness: 1, roughness: 0.25 });

  /* ---------- Geometry: lathe profile, one LatheGeometry per segment for crisp edges ---------- */
  const SEG = 96;
  function latheStrip(points, group, mat) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (a[0] === b[0] && a[1] === b[1]) continue;
      const g = new THREE.LatheGeometry([new THREE.Vector2(a[0], a[1]), new THREE.Vector2(b[0], b[1])], SEG);
      group.add(new THREE.Mesh(g, mat));
    }
  }
  function thread(y0, y1, rMin, rMax, pitch) {
    const pts = [];
    const n = Math.floor((y1 - y0) / pitch);
    for (let i = 0; i < n; i++) {
      const y = y0 + i * pitch;
      pts.push([rMin, y], [rMax, y + pitch * 0.5]);
    }
    pts.push([rMin, y0 + n * pitch]);
    return pts;
  }

  const spin = new THREE.Group();      // spins about the part axis (lathe spindle)
  const axis = new THREE.Group();      // lays the part on its side
  const tilt = new THREE.Group();      // mouse / scroll orientation
  axis.add(spin); tilt.add(axis); scene.add(tilt);

  // Left male thread with bore
  latheStrip([[0, -2.12], [0.24, -2.28], [0.24, -3.0], [0.34, -3.0], [0.42, -2.92]], spin, steelDark);
  latheStrip(thread(-2.92, -1.52, 0.4, 0.465, 0.085), spin, steelTurned);
  latheStrip([[0.4, -1.52], [0.36, -1.5], [0.36, -1.38], [0.56, -1.38], [0.6, -1.34], [0.6, -1.16], [0.86, -1.16]], spin, steel);

  // Hex body (6-sided prism) with turned chamfer rings
  const hexGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.9, 6, 1, false);
  const hex = new THREE.Mesh(hexGeo, steel);
  hex.position.y = -0.69;
  spin.add(hex);
  const capGeo = new THREE.RingGeometry(0.62, 1.0, 6, 1);
  const capA = new THREE.Mesh(capGeo, steelTurned); capA.rotation.x = Math.PI / 2; capA.position.y = -1.14; spin.add(capA);
  const capB = new THREE.Mesh(capGeo, steelTurned); capB.rotation.x = -Math.PI / 2; capB.position.y = -0.24; spin.add(capB);

  // Collar, O-ring groove, journal, taper, right thread with bore
  latheStrip([[0.72, -0.24], [0.72, -0.02], [0.66, 0.02], [0.62, 0.02], [0.62, 0.16], [0.52, 0.16], [0.52, 0.36], [0.62, 0.36], [0.62, 1.25], [0.46, 1.62]], spin, steel);
  latheStrip(thread(1.66, 2.86, 0.4, 0.465, 0.085), spin, steelTurned);
  latheStrip([[0.46, 1.62], [0.4, 1.66]], spin, steel);
  latheStrip([[0.4, 2.86], [0.34, 2.94], [0.24, 2.94], [0.24, 2.2], [0, 2.06]], spin, steelDark);

  const oring = new THREE.Mesh(new THREE.TorusGeometry(0.585, 0.085, 24, 96), redRubber);
  oring.rotation.x = Math.PI / 2; oring.position.y = 0.26; spin.add(oring);

  // Laser-etched flat marks on hex faces (make rotation readable)
  const markGeo = new THREE.PlaneGeometry(0.42, 0.06);
  const markMat = new THREE.MeshBasicMaterial({ color: 0x2a2e33, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i += 2) {
    const m = new THREE.Mesh(markGeo, markMat);
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const r = Math.cos(Math.PI / 6) * 1.0 + 0.002;
    m.position.set(Math.sin(ang) * r, -0.69, Math.cos(ang) * r);
    m.rotation.y = ang;
    spin.add(m);
  }

  axis.rotation.z = Math.PI / 2 + 0.16;
  spin.rotation.y = 0.4;

  /* ---------- Cutting tool (holder + TiN insert) ---------- */
  const tool = new THREE.Group();
  const holder = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.34, 0.34), holderMat);
  holder.position.x = 1.15;
  const insert = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 3), tinMat);
  insert.rotation.z = Math.PI / 2; insert.rotation.x = Math.PI / 2;
  insert.position.set(0.2, 0, 0);
  tool.add(holder, insert);
  const CUT_Y = 2.3;
  tool.position.set(0.47, CUT_Y, 0.02);
  tool.rotation.y = -0.15;
  axis.add(tool);
  const tip = new THREE.Object3D(); tip.position.set(0.47, CUT_Y, 0.02); axis.add(tip);

  /* ---------- Lights ---------- */
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3b3f, 2.4); rim.position.set(-6, -2, -4); scene.add(rim);
  const sparkLight = new THREE.PointLight(0xff8a3a, 0, 4, 2); scene.add(sparkLight);

  /* ---------- Sparks (additive streaks) ---------- */
  const MAX = 220;
  const pos = new Float32Array(MAX * 6);
  const col = new Float32Array(MAX * 6);
  const vel = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX);
  const head = new Float32Array(MAX * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.LineSegments(sparkGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false;
  scene.add(sparks);

  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,240,200,1)"); gr.addColorStop(0.25, "rgba(255,140,60,.8)"); gr.addColorStop(1, "rgba(255,40,40,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(0.9, 0.9, 1); scene.add(glow);

  let cursor = 0;
  const tipW = new THREE.Vector3();
  function emit(n) {
    for (let k = 0; k < n; k++) {
      const i = cursor; cursor = (cursor + 1) % MAX;
      life[i] = 0.35 + Math.random() * 0.55;
      head[i * 3] = tipW.x; head[i * 3 + 1] = tipW.y; head[i * 3 + 2] = tipW.z;
      const sp = 2.5 + Math.random() * 4.5;
      const a = -0.5 + (Math.random() - 0.5) * 1.6;
      vel[i * 3] = Math.cos(a) * sp * (Math.random() < 0.82 ? 1 : -0.6) - 0.4;
      vel[i * 3 + 1] = Math.sin(a) * sp + 1.2;
      vel[i * 3 + 2] = (Math.random() * 2 + 0.6) * (sp * 0.45);
    }
  }
  function updateSparks(dt) {
    for (let i = 0; i < MAX; i++) {
      const o = i * 6;
      if (life[i] <= 0) { col[o] = col[o + 1] = col[o + 2] = col[o + 3] = col[o + 4] = col[o + 5] = 0; continue; }
      life[i] -= dt;
      vel[i * 3 + 1] -= 9.8 * dt * 0.9;
      head[i * 3] += vel[i * 3] * dt; head[i * 3 + 1] += vel[i * 3 + 1] * dt; head[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const L = 0.035;
      pos[o] = head[i * 3]; pos[o + 1] = head[i * 3 + 1]; pos[o + 2] = head[i * 3 + 2];
      pos[o + 3] = head[i * 3] - vel[i * 3] * L; pos[o + 4] = head[i * 3 + 1] - vel[i * 3 + 1] * L; pos[o + 5] = head[i * 3 + 2] - vel[i * 3 + 2] * L;
      const t = Math.max(life[i], 0) / 0.9;
      col[o] = 1.0 * t + 0.2; col[o + 1] = 0.75 * t * t + 0.05; col[o + 2] = 0.35 * t * t * t;
      col[o + 3] = col[o] * 0.35; col[o + 4] = col[o + 1] * 0.2; col[o + 5] = 0;
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
    for (const a of anchors) {
      a.o.getWorldPosition(tmp); tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      const r = mount.getBoundingClientRect(), hr = host.getBoundingClientRect();
      const ox = r.left - hr.left, oy = r.top - hr.top;
      const lw = a.left ? a.el.offsetWidth : 0;
      a.el.style.transform = `translate(${(ox + x - (a.left ? lw - 4.5 : 4.5)).toFixed(1)}px, ${(oy + y - a.el.offsetHeight / 2).toFixed(1)}px)`;
    }
  }

  /* ---------- Sizing ---------- */
  let W = 1, H = 1;
  function resize() {
    W = mount.clientWidth; H = mount.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const narrow = W < 700;
    camera.position.z = narrow ? 15.5 : 14.6;
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

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let running = false, t = 0, intro = 0;
  function frame() {
    if (!visible || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    intro = Math.min(intro + dt / 1.8, 1);
    const ease = 1 - Math.pow(1 - intro, 3);

    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    const scrollP = Math.min(window.scrollY / window.innerHeight, 1);

    if (!reduceMotion) spin.rotation.y += dt * 2.6;
    tilt.rotation.y = -0.55 + mx * 0.22 + (1 - ease) * 0.9 + scrollP * 0.5;
    tilt.rotation.x = 0.22 + my * 0.12 - scrollP * 0.25;
    tilt.position.y = Math.sin(t * 0.8) * 0.06 + scrollP * 0.8;
    tilt.position.x = 0.0;
    tilt.scale.setScalar(0.86 + ease * 0.14);

    // Tool feeds in, cuts, retracts on a loop
    const cyc = (t % 6) / 6;
    const engaged = cyc > 0.12 && cyc < 0.78;
    const feed = engaged ? 0 : (cyc <= 0.12 ? (1 - cyc / 0.12) : (cyc - 0.78) / 0.22);
    tool.position.x = 0.47 + feed * 0.9;
    tool.position.y = CUT_Y - (engaged ? (cyc - 0.12) / 0.66 * 0.5 : 0) ;
    tip.position.copy(tool.position);
    tip.getWorldPosition(tipW);

    if (engaged && !reduceMotion && intro > 0.6) emit(Math.random() < 0.5 ? 3 : 2);
    updateSparks(dt);
    const flicker = engaged && intro > 0.6 ? 0.7 + Math.random() * 0.6 : 0;
    sparkLight.position.copy(tipW); sparkLight.intensity = flicker * 6;
    glow.position.copy(tipW); glow.material.opacity = flicker * 0.9;
    glow.scale.setScalar(0.6 + flicker * 0.4);

    renderer.render(scene, camera);
    placeLabels(W, H);
  }
  function loop() { if (!running) { running = true; clock.getDelta(); frame(); } }

  renderer.compile(scene, camera);
  loop();
  requestAnimationFrame(() => host.classList.add("hud-ready"));
}
