import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import i18n from '../../i18n/i18n';
import { disposeScene } from './_shared/disposeScene';

/* ======================================================================
   SceneVR — "everyone in a different place, but in one space"

   Six VR pods stand spread out on a ring at floor level (six different
   physical locations). Each pod contains a seated mannequin wearing a
   VR headset. Above the ring, a wireframe sphere floats — that's the
   shared virtual room. Inside the sphere, six glowing humanoid avatars
   stand around a floating model on a central table.

   Each pod is connected to its avatar by a beam of light: the
   participant in the physical world is rendered as an avatar inside
   the virtual room. Hovering on either side highlights the pair.

   Five-act timeline (≈17s loop):
     1. INTRO    (0-3s)    — wide outside view, everything dim.
     2. CONNECT  (3-7s)    — pods light up one by one, beams rise,
                              avatars materialise inside the sphere.
     3. SYNC     (7-10s)   — all six connected, the floating model
                              appears in the centre of the room.
     4. MEETING  (10-14s)  — camera dips inside the sphere, avatars
                              gesture, the model rotates, particles
                              swirl between participants.
     5. HOLD     (14-17s)  — wide hold, all systems active.
   ====================================================================== */

const POD_COUNT = 6;
const POD_RADIUS = 9;        // ring radius for the physical pods
const SPHERE_Y = 11;          // vertical centre of the virtual sphere
const SPHERE_RADIUS = 4.0;
const AVATAR_RADIUS = 2.6;    // avatars stand on this ring inside sphere

// ───── VR pod (seated mannequin with headset, on a circular platform) ─────
function buildPod(index) {
  const pod = new THREE.Group();

  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a26, roughness: 0.6, metalness: 0.4,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x2da39a, emissive: 0x2da39a, emissiveIntensity: 0.6,
    roughness: 0.3, metalness: 0.4,
  });
  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x12141c, roughness: 0.7, metalness: 0.2,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x6c5e4d, roughness: 0.8, metalness: 0.0,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0x1d2330, roughness: 0.7, metalness: 0.0,
  });
  const headsetMat = new THREE.MeshStandardMaterial({
    color: 0x111118, roughness: 0.4, metalness: 0.5,
  });
  const headsetGlow = new THREE.MeshBasicMaterial({ color: 0x6B4FA0 });

  // Circular platform with raised inner ring
  const plat = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.2, 24),
    platformMat
  );
  plat.position.y = 0.1;
  pod.add(plat);
  // Accent ring (catches bloom)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.04, 8, 36),
    accentMat
  );
  ring.position.y = 0.21;
  ring.rotation.x = Math.PI / 2;
  pod.add(ring);
  pod.userData.ring = ring;
  pod.userData.ringMat = accentMat;

  // Floor pulse light bar in front of platform
  const floorBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.04, 0.06),
    accentMat
  );
  floorBar.position.set(0, 0.21, 1.0);
  pod.add(floorBar);

  // Chair: seat + backrest + column
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.7), chairMat);
  seat.position.set(0, 0.7, 0);
  pod.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.08), chairMat);
  back.position.set(0, 1.18, -0.31);
  pod.add(back);
  const col = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.5, 12),
    chairMat
  );
  col.position.set(0, 0.45, 0);
  pod.add(col);

  // Mannequin (seated)
  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.32), clothMat);
  torso.position.set(0, 1.07, 0);
  pod.add(torso);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMat);
  head.position.set(0, 1.55, 0.05);
  pod.add(head);
  // Arms (resting on knees)
  for (const dx of [-0.3, 0.3]) {
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), clothMat);
    upper.position.set(dx, 1.0, 0);
    upper.rotation.x = 0.4;
    pod.add(upper);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.4, 0.11), clothMat);
    lower.position.set(dx, 0.74, 0.22);
    pod.add(lower);
  }
  // Thighs
  for (const dx of [-0.13, 0.13]) {
    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.18), clothMat);
    thigh.position.set(dx, 0.78, 0.18);
    thigh.rotation.x = -0.5;
    pod.add(thigh);
  }
  // Lower legs (down to floor)
  for (const dx of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), clothMat);
    leg.position.set(dx, 0.4, 0.42);
    pod.add(leg);
  }

  // VR headset over the head
  const headsetGroup = new THREE.Group();
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.34), headsetMat);
  visor.position.set(0, 0, 0);
  headsetGroup.add(visor);
  // Visor glow strip (lights up when participant is "connected")
  const visorGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.12, 0.005),
    headsetGlow.clone()
  );
  visorGlow.position.set(0, 0, 0.18);
  headsetGroup.add(visorGlow);
  pod.userData.visorGlow = visorGlow;
  pod.userData.visorGlowMat = visorGlow.material;
  pod.userData.visorGlowMat.color.setHex(0x111118); // start dim
  // Strap
  const strap = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.02, 6, 18),
    headsetMat
  );
  strap.rotation.y = Math.PI / 2;
  headsetGroup.add(strap);
  headsetGroup.position.set(0, 1.55, 0.1);
  pod.add(headsetGroup);
  pod.userData.headset = headsetGroup;

  // Pod base label number (subtle)
  const numberMat = new THREE.MeshBasicMaterial({
    color: 0x2da39a, transparent: true, opacity: 0.4,
  });
  const numberDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    numberMat
  );
  numberDot.position.set(0, 0.22, 1.15);
  pod.add(numberDot);

  pod.userData.index = index;
  pod.userData.connected = false;
  return pod;
}

// ───── Avatar inside the virtual sphere (emissive humanoid silhouette) ─
function buildAvatar(color) {
  const av = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.6,
    roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.85,
  });
  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.55, 0.18), mat);
  torso.position.y = 0.65;
  av.add(torso);
  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), mat);
  head.position.y = 1.05;
  av.add(head);
  // Arms (slightly raised gesture)
  for (const dx of [-0.22, 0.22]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), mat);
    arm.position.set(dx, 0.65, 0);
    arm.rotation.z = dx > 0 ? -0.2 : 0.2;
    av.add(arm);
  }
  // Legs
  for (const dx of [-0.08, 0.08]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), mat);
    leg.position.set(dx, 0.22, 0);
    av.add(leg);
  }
  // Outline halo (thin emissive ring around torso, gives "digital" feel)
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.015, 6, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 })
  );
  halo.position.y = 0.65;
  halo.rotation.x = Math.PI / 2 + 0.3;
  av.add(halo);
  av.userData.materials = [mat, halo.material];
  av.userData.baseEmissive = 0.6;
  return av;
}

// ───── Floating central model — morphs between primitives ─────
function buildCentralModel() {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x88c4ff, emissive: 0x88c4ff, emissiveIntensity: 0.5,
    roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.85,
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4,
  });
  // Multi-shape: cube, sphere, octahedron — only one visible at a time
  const shapes = [
    new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), baseMat),
    new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), baseMat),
    new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), baseMat),
  ];
  const wires = [
    new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.74, 0.74), wireMat),
    new THREE.Mesh(new THREE.IcosahedronGeometry(0.53, 1), wireMat),
    new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), wireMat),
  ];
  for (let i = 0; i < shapes.length; i++) {
    shapes[i].visible = i === 0;
    wires[i].visible = i === 0;
    g.add(shapes[i]);
    g.add(wires[i]);
  }
  g.userData.shapes = shapes;
  g.userData.wires = wires;
  g.userData.activeShape = 0;
  // Pedestal (a thin disc under the model)
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.7, 0.05, 24),
    new THREE.MeshStandardMaterial({
      color: 0x2da39a, emissive: 0x2da39a, emissiveIntensity: 0.4,
      transparent: true, opacity: 0.5,
    })
  );
  pedestal.position.y = -0.6;
  g.add(pedestal);
  g.userData.pedestal = pedestal;
  return g;
}

// ─────────────────────────────────────────────────────────────
export default function SceneVR() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const [connectedCount, setConnectedCount] = useState(0);
  const [phase, setPhase] = useState('intro');

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.013);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.5, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 12;
    controls.maxDistance = 40;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 6, 0);

    // ─── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x445577, 0.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.45);
    keyLight.position.set(15, 25, 15);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6B4FA0, 0.35);
    fillLight.position.set(-15, 8, -10);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x2da39a, 0.4);
    rimLight.position.set(0, 5, -25);
    scene.add(rimLight);
    // Warm point light at the centre of the sphere
    const sphereLight = new THREE.PointLight(0x88c4ff, 1.0, 8);
    sphereLight.position.set(0, SPHERE_Y, 0);
    scene.add(sphereLight);

    // ─── Floor ───────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x07070e, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(60, 30, 0x1a1a3a, 0x0e0e1c);
    grid.position.y = 0.01;
    scene.add(grid);

    // ─── 6 VR pods around the ring ───────────────────────
    const pods = [];
    for (let i = 0; i < POD_COUNT; i++) {
      const a = (i / POD_COUNT) * Math.PI * 2;
      const x = Math.cos(a) * POD_RADIUS;
      const z = Math.sin(a) * POD_RADIUS;
      const pod = buildPod(i);
      pod.position.set(x, 0, z);
      // Face the centre
      pod.rotation.y = -a + Math.PI / 2;
      scene.add(pod);
      pods.push(pod);
    }

    // ─── Virtual sphere (wireframe + transparent shell) ─
    const sphereWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(SPHERE_RADIUS, 2),
      new THREE.MeshBasicMaterial({
        color: 0x6B4FA0, wireframe: true, transparent: true, opacity: 0.45,
      })
    );
    sphereWire.position.y = SPHERE_Y;
    scene.add(sphereWire);
    // Inner shell — translucent
    const sphereShell = new THREE.Mesh(
      new THREE.SphereGeometry(SPHERE_RADIUS - 0.05, 32, 32),
      new THREE.MeshPhongMaterial({
        color: 0x2da39a, transparent: true, opacity: 0.06,
        side: THREE.BackSide, blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    sphereShell.position.y = SPHERE_Y;
    scene.add(sphereShell);
    // Equatorial accent ring
    const eqRing = new THREE.Mesh(
      new THREE.TorusGeometry(SPHERE_RADIUS + 0.05, 0.04, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x2da39a, transparent: true, opacity: 0.6,
      })
    );
    eqRing.position.y = SPHERE_Y;
    eqRing.rotation.x = Math.PI / 2;
    scene.add(eqRing);

    // ─── 6 avatars inside the sphere ─────────────────────
    const avatarColors = [0x88c4ff, 0x6B4FA0, 0x2da39a, 0xffd28a, 0xff7961, 0xa78bfa];
    const avatars = [];
    for (let i = 0; i < POD_COUNT; i++) {
      const a = (i / POD_COUNT) * Math.PI * 2 - Math.PI / 2; // start at top
      const x = Math.cos(a) * AVATAR_RADIUS;
      const z = Math.sin(a) * AVATAR_RADIUS;
      const av = buildAvatar(avatarColors[i]);
      av.position.set(x, SPHERE_Y - 1.0, z);
      // Face the centre
      av.rotation.y = -a + Math.PI / 2 + Math.PI; // back of body away from centre
      av.userData.index = i;
      av.userData.basePos = av.position.clone();
      av.userData.podPair = pods[i];
      // Initially hidden — appears during CONNECT phase
      av.visible = false;
      scene.add(av);
      avatars.push(av);
      // Cross-link
      pods[i].userData.avatar = av;
    }

    // ─── Central floating model ─────────────────────────
    const centralModel = buildCentralModel();
    centralModel.position.set(0, SPHERE_Y, 0);
    centralModel.visible = false;
    scene.add(centralModel);

    // ─── 6 beams from pods → avatars ─────────────────────
    const beams = [];
    for (let i = 0; i < POD_COUNT; i++) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: avatarColors[i], transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      scene.add(beam);
      beams.push(beam);
    }

    function updateBeam(i, intensity) {
      const beam = beams[i];
      const start = pods[i].position.clone();
      start.y = 1.7; // visor height
      const end = avatars[i].position.clone();
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();
      beam.position.copy(start).add(dir.multiplyScalar(0.5));
      beam.scale.set(1, len, 1);
      // Orient cylinder along the beam direction
      const up = new THREE.Vector3(0, 1, 0);
      const dirNorm = end.clone().sub(start).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
      beam.quaternion.copy(q);
      beam.material.opacity = intensity * 0.7;
    }

    // ─── Particles inside the sphere ────────────────────
    const PARTS = 200;
    const partPos = new Float32Array(PARTS * 3);
    const partInit = new Float32Array(PARTS * 3);
    for (let i = 0; i < PARTS; i++) {
      // Random point inside sphere
      const r = Math.random() * (SPHERE_RADIUS - 0.3);
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      partPos[i * 3] = x;
      partPos[i * 3 + 1] = y + SPHERE_Y;
      partPos[i * 3 + 2] = z;
      partInit[i * 3] = x;
      partInit[i * 3 + 1] = y;
      partInit[i * 3 + 2] = z;
    }
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const particles = new THREE.Points(partGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(particles);

    // ─── Ambient stars ──────────────────────────────────
    const STARS = 200;
    const starPos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 70;
      starPos[i * 3 + 1] = 5 + Math.random() * 25;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.08, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    // ─── Post-processing ────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.55, 0.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ─── Interaction ────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null; // { type: 'pod'|'avatar'|'model', index, mesh }
    let rayDirty = false;
    let lastMouseX = 0, lastMouseY = 0;

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      rayDirty = true;
    };

    const setHover = (target) => {
      // target = { type, index } or null
      const samePair = (a, b) =>
        (!a && !b) || (a && b && a.type === b.type && a.index === b.index);
      if (samePair(hovered, target)) return;
      // Reset previous
      if (hovered) {
        const p = pods[hovered.index];
        const a = avatars[hovered.index];
        if (p) { p.userData.ringMat.emissiveIntensity = 0.6; }
        if (a) { a.userData.materials.forEach(m => { m.emissiveIntensity = a.userData.baseEmissive; m.opacity = 0.85; }); }
        if (hovered.type === 'model') { centralModel.scale.setScalar(1); }
      }
      hovered = target;
      if (!target) {
        renderer.domElement.style.cursor = 'default';
        setTooltip(t => ({ ...t, visible: false }));
        return;
      }
      renderer.domElement.style.cursor = 'pointer';
      if (target.type === 'pod' || target.type === 'avatar') {
        const idx = target.index;
        const p = pods[idx];
        const a = avatars[idx];
        if (p) p.userData.ringMat.emissiveIntensity = 1.4;
        if (a && a.visible) {
          a.userData.materials.forEach(m => {
            m.emissiveIntensity = 1.2; m.opacity = 1.0;
          });
        }
        const text = i18n.t('creator.scene.vrMember', { n: idx + 1 });
        setTooltip({ visible: true, text, x: lastMouseX, y: lastMouseY });
      } else if (target.type === 'model') {
        centralModel.scale.setScalar(1.15);
        setTooltip({
          visible: true,
          text: i18n.language === 'en' ? 'Click to morph' : 'Кликни — изменить форму',
          x: lastMouseX, y: lastMouseY,
        });
      }
    };

    const doRaycast = () => {
      if (!rayDirty) return;
      rayDirty = false;
      raycaster.setFromCamera(mouse, camera);

      // Test pods (whole pod groups — match using userData.index walk-up)
      const podHits = raycaster.intersectObjects(pods, true);
      if (podHits.length > 0) {
        let obj = podHits[0].object;
        while (obj && obj.userData.index === undefined) obj = obj.parent;
        if (obj) { setHover({ type: 'pod', index: obj.userData.index }); setTooltip(t => ({ ...t, x: lastMouseX, y: lastMouseY })); return; }
      }

      // Test avatars
      const avHits = raycaster.intersectObjects(avatars.filter(a => a.visible), true);
      if (avHits.length > 0) {
        let obj = avHits[0].object;
        while (obj && obj.userData.index === undefined) obj = obj.parent;
        if (obj) { setHover({ type: 'avatar', index: obj.userData.index }); setTooltip(t => ({ ...t, x: lastMouseX, y: lastMouseY })); return; }
      }

      // Test central model
      if (centralModel.visible) {
        const modelHits = raycaster.intersectObjects(centralModel.children, true);
        if (modelHits.length > 0) {
          setHover({ type: 'model', index: -1 });
          setTooltip(t => ({ ...t, x: lastMouseX, y: lastMouseY }));
          return;
        }
      }

      setHover(null);
    };

    const onClick = () => {
      if (hovered?.type === 'model' && centralModel.visible) {
        // Cycle to next shape
        const u = centralModel.userData;
        u.shapes[u.activeShape].visible = false;
        u.wires[u.activeShape].visible = false;
        u.activeShape = (u.activeShape + 1) % u.shapes.length;
        u.shapes[u.activeShape].visible = true;
        u.wires[u.activeShape].visible = true;
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // ─── Animation timeline ────────────────────────────
    const T_INTRO = 3.0;
    const T_CONNECT = 4.0;
    const T_SYNC = 3.0;
    const T_MEETING = 4.0;
    const T_HOLD = 3.0;
    const T1 = T_INTRO;
    const T2 = T1 + T_CONNECT;
    const T3 = T2 + T_SYNC;
    const T4 = T3 + T_MEETING;
    const TOTAL = T4 + T_HOLD;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;

    // Camera storyboard — 6 frames
    const camFrames = [
      // INTRO — wide outside view, three-quarter
      { t: 0,         pos: [16, 8, 16],   look: [0, 5, 0] },
      { t: T1,        pos: [14, 7, 14],   look: [0, 6, 0] },
      // CONNECT — slow orbit
      { t: T2,        pos: [-12, 9, 14],  look: [0, 7, 0] },
      // SYNC — pull up
      { t: T3,        pos: [-14, 14, 10], look: [0, SPHERE_Y, 0] },
      // MEETING — closer to the sphere centre
      { t: T3 + T_MEETING * 0.5, pos: [6, SPHERE_Y + 1, 6], look: [0, SPHERE_Y, 0] },
      { t: T4,        pos: [9, SPHERE_Y + 2, 8], look: [0, SPHERE_Y, 0] },
      // HOLD — wide cinematic
      { t: TOTAL,     pos: [18, 12, 16],  look: [0, 7, 0] },
    ];

    const lerpCam = (time) => {
      let a = camFrames[0], b = camFrames[1];
      for (let i = 0; i < camFrames.length - 1; i++) {
        if (time >= camFrames[i].t && time <= camFrames[i + 1].t) {
          a = camFrames[i]; b = camFrames[i + 1]; break;
        }
      }
      const dur = b.t - a.t || 1;
      const p = easeInOut(Math.max(0, Math.min(1, (time - a.t) / dur)));
      camera.position.set(
        lerp(a.pos[0], b.pos[0], p),
        lerp(a.pos[1], b.pos[1], p),
        lerp(a.pos[2], b.pos[2], p)
      );
      controls.target.set(
        lerp(a.look[0], b.look[0], p),
        lerp(a.look[1], b.look[1], p),
        lerp(a.look[2], b.look[2], p)
      );
    };

    const onLangChanged = () => {
      // Refresh tooltip if hovering
      if (hovered) {
        if (hovered.type === 'pod' || hovered.type === 'avatar') {
          setTooltip(prev => ({
            ...prev,
            text: i18n.t('creator.scene.vrMember', { n: hovered.index + 1 }),
          }));
        } else if (hovered.type === 'model') {
          setTooltip(prev => ({
            ...prev,
            text: i18n.language === 'en' ? 'Click to morph' : 'Кликни — изменить форму',
          }));
        }
      }
    };
    i18n.on('languageChanged', onLangChanged);

    const clock = new THREE.Clock();
    let animId, isInView = false;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isInView) return;
      const elapsed = clock.getElapsedTime();
      const time = elapsed % TOTAL;
      lerpCam(time);
      controls.update();

      // Sphere wire breathes
      sphereWire.rotation.y = elapsed * 0.06;
      sphereWire.rotation.x = Math.sin(elapsed * 0.3) * 0.05;
      eqRing.rotation.z = elapsed * 0.18;

      // Particles drift inside sphere
      const pp = particles.geometry.attributes.position.array;
      for (let i = 0; i < PARTS; i++) {
        pp[i * 3]     = partInit[i * 3]     + Math.sin(elapsed * 0.4 + i) * 0.12;
        pp[i * 3 + 1] = partInit[i * 3 + 1] + SPHERE_Y + Math.cos(elapsed * 0.5 + i) * 0.12;
        pp[i * 3 + 2] = partInit[i * 3 + 2] + Math.sin(elapsed * 0.3 + i * 0.7) * 0.12;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // ─── Phase 1: INTRO ─────────────────────────
      if (time < T1) {
        setPhase('intro');
        // Pods dim, no avatars, no beams
        pods.forEach(p => {
          p.userData.ringMat.emissiveIntensity = 0.15;
          p.userData.visorGlowMat.color.setHex(0x111118);
        });
        avatars.forEach(a => { a.visible = false; });
        beams.forEach((b, i) => { b.material.opacity = 0; updateBeam(i, 0); });
        centralModel.visible = false;
        particles.material.opacity = 0;
        sphereWire.material.opacity = 0.2;
        eqRing.material.opacity = 0.2;
        sphereLight.intensity = 0;
        setConnectedCount(0);
      }

      // ─── Phase 2: CONNECT — pods light up one by one ──
      else if (time < T2) {
        setPhase('connect');
        const phaseT = (time - T1) / T_CONNECT;
        const lit = Math.floor(phaseT * (POD_COUNT + 0.2));
        let actualLit = 0;
        pods.forEach((p, i) => {
          if (i < lit) {
            p.userData.ringMat.emissiveIntensity = 0.6;
            p.userData.visorGlowMat.color.setHex(avatarColors[i]);
            avatars[i].visible = true;
            avatars[i].userData.materials.forEach(m => { m.emissiveIntensity = 0.6; });
            const beamFade = Math.min(1, (lit - i) / 1.0);
            updateBeam(i, beamFade);
            actualLit++;
          } else {
            p.userData.ringMat.emissiveIntensity = 0.15;
            p.userData.visorGlowMat.color.setHex(0x111118);
            avatars[i].visible = false;
            updateBeam(i, 0);
          }
        });
        sphereWire.material.opacity = lerp(0.2, 0.45, phaseT);
        eqRing.material.opacity = lerp(0.2, 0.6, phaseT);
        sphereLight.intensity = phaseT * 1.0;
        particles.material.opacity = lerp(0, 0.3, phaseT);
        centralModel.visible = false;
        setConnectedCount(actualLit);
      }

      // ─── Phase 3: SYNC — model materialises ─
      else if (time < T3) {
        setPhase('sync');
        const phaseT = (time - T2) / T_SYNC;
        pods.forEach((p, i) => {
          p.userData.ringMat.emissiveIntensity = 0.6 + Math.sin(elapsed * 2.5 + i) * 0.15;
          p.userData.visorGlowMat.color.setHex(avatarColors[i]);
          updateBeam(i, 0.7);
        });
        avatars.forEach(a => { a.visible = true; });
        centralModel.visible = true;
        centralModel.scale.setScalar(easeOut(phaseT) * (hovered?.type === 'model' ? 1.15 : 1.0));
        sphereLight.intensity = 1.0 + Math.sin(elapsed * 2) * 0.2;
        particles.material.opacity = lerp(0.3, 0.6, phaseT);
        setConnectedCount(POD_COUNT);
      }

      // ─── Phase 4: MEETING — avatars gesture, model rotates ─
      else if (time < T4) {
        setPhase('meeting');
        pods.forEach((p, i) => {
          p.userData.ringMat.emissiveIntensity = 0.6 + Math.sin(elapsed * 2.5 + i) * 0.15;
          updateBeam(i, 0.55 + Math.sin(elapsed * 3 + i) * 0.15);
        });
        // Avatars subtle bobbing
        avatars.forEach((a, i) => {
          a.position.y = a.userData.basePos.y + Math.sin(elapsed * 1.6 + i * 0.7) * 0.1;
          a.rotation.y = a.userData.baseRotY ?? a.rotation.y;
        });
        // Central model rotates
        centralModel.rotation.y = elapsed * 0.6;
        centralModel.rotation.x = Math.sin(elapsed * 0.4) * 0.2;
        centralModel.userData.pedestal.material.opacity = 0.4 + Math.sin(elapsed * 2) * 0.15;
        sphereLight.intensity = 1.2 + Math.sin(elapsed * 2.5) * 0.25;
        particles.material.opacity = 0.6 + Math.sin(elapsed * 1.5) * 0.1;
      }

      // ─── Phase 5: HOLD ──────────────────────────
      else {
        setPhase('hold');
        pods.forEach((p, i) => {
          p.userData.ringMat.emissiveIntensity = 0.55;
          updateBeam(i, 0.5);
        });
        avatars.forEach((a, i) => {
          a.position.y = a.userData.basePos.y + Math.sin(elapsed * 1.2 + i * 0.7) * 0.06;
        });
        centralModel.rotation.y = elapsed * 0.4;
        sphereLight.intensity = 1.0;
        particles.material.opacity = 0.55;
      }

      doRaycast();
      composer.render();
    };

    const observer = new IntersectionObserver(([e]) => {
      isInView = e.isIntersecting;
      if (isInView) clock.getDelta();
    }, { threshold: 0.3 });
    observer.observe(el);
    tick();

    const onResize = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      observer.disconnect();
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.style.cursor = 'default';
      i18n.off('languageChanged', onLangChanged);
      controls.dispose();
      composer.dispose();
      disposeScene(scene, renderer);
    };
  }, []);

  const lang = i18n.language;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {tooltip.visible && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 40,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(13,13,26,0.94)', color: 'white',
          padding: '8px 14px', borderRadius: 8, fontSize: 12,
          fontFamily: 'monospace', pointerEvents: 'none', zIndex: 1000,
          border: '1px solid rgba(45,163,154,0.4)',
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(45,163,154,0.15)',
        }}>{tooltip.text}</div>
      )}

      {/* Phase HUD top-left */}
      <div style={{
        position: 'absolute', top: 14, left: 16,
        background: 'rgba(13,13,26,0.78)',
        border: '1px solid rgba(45,163,154,0.3)',
        borderRadius: 8, padding: '6px 12px',
        fontFamily: 'monospace', fontSize: 11, color: '#2da39a',
        pointerEvents: 'none', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: '0.6px' }}>
          {lang === 'en' ? 'STATE' : 'СОСТОЯНИЕ'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
          {phase === 'intro'   && (lang === 'en' ? 'Standalone pods' : 'Капсулы простаивают')}
          {phase === 'connect' && (lang === 'en' ? 'Connecting...'    : 'Подключение...')}
          {phase === 'sync'    && (lang === 'en' ? 'Synced'           : 'Синхронизированы')}
          {phase === 'meeting' && (lang === 'en' ? 'Meeting active'   : 'Встреча идёт')}
          {phase === 'hold'    && (lang === 'en' ? 'In session'       : 'В одном пространстве')}
        </div>
      </div>

      {/* Connected counter top-right */}
      <div style={{
        position: 'absolute', top: 14, right: 16,
        fontFamily: 'monospace', fontSize: 22,
        color: '#2da39a',
        background: 'rgba(13,13,26,0.85)', padding: '8px 18px',
        borderRadius: 8, border: '1px solid rgba(45,163,154,0.3)',
        fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
      }}>
        {connectedCount} / 6
      </div>

      <div style={{
        position: 'absolute', bottom: 14, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)', fontSize: 12,
        fontFamily: 'var(--font-display)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>{t('creator.scene.vrCaption')}</div>
    </div>
  );
}
