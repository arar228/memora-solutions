import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import i18n from '../../i18n/i18n';
import { disposeScene } from './_shared/disposeScene';

/* ======================================================================
   SceneLogistics — story of the Chelyabinsk → Saint Petersburg crane.
   Four acts on a 16-second loop:
     1. SHOW   (0–3s)  — crane stands assembled in Chelyabinsk.
     2. LOAD   (3–4.5s) — boom folds, crane settles onto a low-loader truck.
     3. DRIVE  (4.5–10s) — truck rolls along the route, follow-cam tracks it.
     4. LIFT   (10–14s) — truck stops by a historic building in St. Petersburg,
                          crane raises its boom toward the rooftop.
     5. HOLD   (14–16s) — wide cinematic shot of the building lit up.
   ====================================================================== */

// ───── Geographic outline (simplified Russia silhouette) ─────
const BORDER = [
  [29.7,59.9],[28,57.8],[29,56],[30,54],[32,52.5],[35,52],[37,51],[39,49.5],
  [40,48],[39,47],[37,45],[38.5,44],[40,43.5],[43,42.5],[46,42],[48,42.5],
  [48,45],[47,47],[49,47],[51,49],[53,52],[55,51],[60,52],[63,51],[66,51],
  [70,51],[73,51],[76,50],[83,50],[87,50],[92,50],[98,50],[105,50],[110,48],
  [115,46],[120,44],[127,43],[131,43],[134,43],[137,45],[140,48],[141,52],
  [138,54],[143,56],[148,54],[156,52],[162,56],[163,60],[170,62],[176,66],
  [172,68],[165,69],[158,70],[150,71],[142,72],[135,73],[128,73],[120,73.5],
  [112,75],[105,76],[100,77.5],[95,76],[87,74],[80,72],[73,70],[68,68.5],
  [64,67],[60,66.5],[57,65],[52,66],[49,66],[46,65],[43,64],[40,63.5],
  [38,64.5],[35,66],[33,68],[33,69],[36,69.5],[38,68],[40,66],[38,65],
  [36,64],[34,63],[31,62],[29.7,59.9]
];
const LON_C = 75, LAT_C = 58, SX = 1.2, SZ = 2.0;
const toXZ = (lon, lat) => ({ x: (lon - LON_C) * SX, z: -(lat - LAT_C) * SZ });

const CITIES = [
  { id: 'spb',  nameRu: 'Санкт-Петербург', nameEn: 'Saint Petersburg', lon: 30.3, lat: 59.9, color: 0x6B4FA0, role: 'end' },
  { id: 'msk',  nameRu: 'Москва',           nameEn: 'Moscow',           lon: 37.6, lat: 55.75, color: 0x88c4ff, role: 'pass' },
  { id: 'kzn',  nameRu: 'Казань',           nameEn: 'Kazan',            lon: 49.1, lat: 55.8, color: 0x88c4ff, role: 'pass' },
  { id: 'chel', nameRu: 'Челябинск',        nameEn: 'Chelyabinsk',      lon: 61.4, lat: 55.2, color: 0xFFA500, role: 'start' },
];

// ─────────────────────── Truck (low-loader) ───────────────────────
function buildTruck() {
  const truck = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a3242, roughness: 0.5, metalness: 0.4,
  });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x4a5566, roughness: 0.45, metalness: 0.5,
    emissive: 0x6B4FA0, emissiveIntensity: 0.05,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111118, roughness: 0.85, metalness: 0.1,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c4 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x2da39a, emissive: 0x2da39a, emissiveIntensity: 0.7,
    roughness: 0.4, metalness: 0.3,
  });

  // Cabin: short, tall, rounded shoulders
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 2.0), cabinMat);
  cabin.position.set(-3.6, 1.5, 0);
  truck.add(cabin);

  // Roof spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 1.6), bodyMat);
  spoiler.position.set(-3.6, 2.7, 0);
  truck.add(spoiler);

  // Cabin windshield (dark glass)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1020, roughness: 0.05, transmission: 0.4,
    thickness: 0.3, ior: 1.45, clearcoat: 1.0,
  });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 1.6), glassMat);
  windshield.position.set(-2.45, 1.85, 0);
  truck.add(windshield);

  // Headlights
  for (const z of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.35), headlightMat);
    hl.position.set(-2.55, 0.95, z);
    truck.add(hl);
  }

  // Low-loader deck (the long flat platform)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.35, 1.9), bodyMat);
  deck.position.set(0.6, 0.7, 0);
  truck.add(deck);

  // Coupler between cabin and deck
  const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 1.4), bodyMat);
  coupler.position.set(-2.3, 1.0, 0);
  truck.add(coupler);

  // Teal trim stripe along the deck (catches bloom)
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.05, 0.04), trimMat);
  for (const z of [-0.95, 0.95]) {
    const s = stripe.clone();
    s.position.set(0.6, 0.92, z);
    truck.add(s);
  }

  // Wheels — 2 cabin wheels + 6 deck wheels (low-loader has many axles)
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16);
  wheelGeo.rotateX(Math.PI / 2);
  const cabinWheelXs = [-3.2, -4.1];
  const deckWheelXs = [-1.2, -0.2, 0.8, 1.8, 2.7, 3.6];
  const allWheelXs = [...cabinWheelXs, ...deckWheelXs];
  for (const x of allWheelXs) {
    for (const z of [-1.05, 1.05]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, 0.42, z);
      truck.add(w);
    }
  }

  return truck;
}

// ─────────────────────── Crane ───────────────────────
// The crane is parented under a "base" so we can attach it either to the
// world (act 1) or to the truck deck (acts 2-5) by reparenting.
function buildCrane() {
  const crane = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xc4882a, roughness: 0.5, metalness: 0.3,
    emissive: 0x3a2408, emissiveIntensity: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a26, roughness: 0.6, metalness: 0.3,
  });
  const boomMat = new THREE.MeshStandardMaterial({
    color: 0xddaa33, roughness: 0.4, metalness: 0.4,
    emissive: 0x3a2408, emissiveIntensity: 0.18,
  });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x2da39a });

  // Chassis (the carrier vehicle base) — flat, wide
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 1.6), chassisMat);
  chassis.position.set(0, 0.55, 0);
  crane.add(chassis);

  // Chassis wheels — 4 small wheels (the crane sits on these on the ground;
  // they're hidden visually when the crane is on the truck deck).
  const cw = new THREE.CylinderGeometry(0.32, 0.32, 0.3, 14);
  cw.rotateX(Math.PI / 2);
  const cwMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.85 });
  for (const x of [-1.2, 1.2]) {
    for (const z of [-0.8, 0.8]) {
      const w = new THREE.Mesh(cw, cwMat);
      w.position.set(x, 0.32, z);
      crane.add(w);
    }
  }

  // Outriggers (stabilizer legs that fold out)
  for (const x of [-1.4, 1.4]) {
    for (const z of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.4), accentMat);
      leg.position.set(x, 0.45, z);
      crane.add(leg);
    }
  }

  // Operator cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.95), chassisMat);
  cabin.position.set(-0.9, 1.27, 0);
  crane.add(cabin);

  const cabinGlass = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.6, 0.7),
    new THREE.MeshPhysicalMaterial({
      color: 0x152040, roughness: 0.05, transmission: 0.4,
      thickness: 0.2, ior: 1.45,
    })
  );
  cabinGlass.position.set(-1.32, 1.35, 0);
  crane.add(cabinGlass);

  // Turret (the rotating yellow base the boom is attached to)
  const turret = new THREE.Group();
  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 16), chassisMat);
  turretBase.position.y = 0.18;
  turret.add(turretBase);

  // Boom (extending arm) — created horizontal, pivots from origin
  const boomGroup = new THREE.Group();
  // Main lower segment — long box from origin out along +X
  const boom1Len = 4.2;
  const boom1 = new THREE.Mesh(new THREE.BoxGeometry(boom1Len, 0.32, 0.35), boomMat);
  boom1.position.set(boom1Len / 2 + 0.15, 0.35, 0);
  boomGroup.add(boom1);

  // Lattice strip along boom (gives it that "industrial" feel)
  const lattice = new THREE.Mesh(
    new THREE.BoxGeometry(boom1Len, 0.04, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1a1a26 })
  );
  lattice.position.set(boom1Len / 2 + 0.15, 0.18, 0);
  boomGroup.add(lattice);

  // Telescoping inner section (slightly thinner box on top)
  const boom2 = new THREE.Mesh(new THREE.BoxGeometry(boom1Len * 0.85, 0.22, 0.25), boomMat);
  boom2.position.set(boom1Len / 2 + 0.4, 0.45, 0);
  boomGroup.add(boom2);

  // Hook hanging from boom tip
  const hookCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x222226 })
  );
  hookCable.position.set(boom1Len + 0.15, 0.0, 0);
  boomGroup.add(hookCable);
  const hook = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x444450, metalness: 0.6, roughness: 0.4 })
  );
  hook.rotation.z = Math.PI;
  hook.position.set(boom1Len + 0.15, -0.45, 0);
  boomGroup.add(hook);

  boomGroup.position.set(0.45, 0.4, 0);
  // Start horizontal pointing forward (+X). We'll animate its rotation.z.
  turret.add(boomGroup);

  // Counterweight on the back of the turret
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 1.1), accentMat);
  counter.position.set(-0.55, 0.3, 0);
  turret.add(counter);

  turret.position.set(0.4, 1.0, 0);
  crane.add(turret);

  // Warning beacon on top of cabin (pulses)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), lightMat);
  beacon.position.set(-0.9, 1.85, 0);
  crane.add(beacon);

  return { crane, boomGroup, turret, beacon };
}

// ─────────── Historic building (St Petersburg classical facade) ───────────
function buildHistoricBuilding() {
  const g = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xc6b59c, roughness: 0.85, metalness: 0.0,
  });
  const stoneDarkMat = new THREE.MeshStandardMaterial({
    color: 0x6c5e4d, roughness: 0.9, metalness: 0.0,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 0.9,
    transparent: true, opacity: 0.9,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a52, roughness: 0.6, metalness: 0.3,
  });

  const W = 12, D = 5, H1 = 3.0, H2 = 2.6;

  // Ground floor
  const ground = new THREE.Mesh(new THREE.BoxGeometry(W, H1, D), stoneMat);
  ground.position.y = H1 / 2;
  g.add(ground);

  // Window cutouts on ground floor (warm glow strips)
  for (const x of [-4.5, -2.5, -0.5, 1.5, 3.5, 5.5]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.05), windowMat);
    win.position.set(x - 0.5, 1.6, D / 2 + 0.001);
    g.add(win);
  }
  // Main entrance (taller darker arch)
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.05), windowMat);
  door.material.emissiveIntensity = 1.4;
  door.position.set(0, 1.2, D / 2 + 0.002);
  g.add(door);

  // Steps in front of entrance — 4 stone steps
  for (let i = 0; i < 4; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(3.0 - i * 0.2, 0.18, 0.45),
      stoneDarkMat
    );
    step.position.set(0, 0.09 + i * 0.18, D / 2 + 0.45 - i * 0.18);
    g.add(step);
  }

  // 2nd floor (slightly recessed)
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.8, H2, D - 0.4),
    stoneMat
  );
  top.position.y = H1 + H2 / 2;
  g.add(top);

  // 2nd floor windows
  for (const x of [-4.5, -2.5, -0.5, 1.5, 3.5, 5.5]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.05), windowMat);
    win.material = windowMat.clone();
    win.material.emissiveIntensity = 0.4;
    win.position.set(x - 0.5, H1 + H2 / 2, (D - 0.4) / 2 + 0.001);
    g.add(win);
  }

  // Classical 6-column portico in front of entrance
  const colMat = stoneMat;
  for (const x of [-3.6, -2.2, -0.8, 0.8, 2.2, 3.6]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, H1 + H2 - 0.4, 12), colMat);
    col.position.set(x - 0.5, (H1 + H2 - 0.4) / 2 + 0.18, D / 2 + 0.55);
    g.add(col);
    // Cap (capital) on top
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), stoneDarkMat);
    cap.position.set(x - 0.5, H1 + H2 - 0.22, D / 2 + 0.55);
    g.add(cap);
  }

  // Triangular pediment above the columns
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-3.5, 0);
  pedShape.lineTo(3.5, 0);
  pedShape.lineTo(0, 1.1);
  pedShape.lineTo(-3.5, 0);
  const ped = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedShape, { depth: 0.3, bevelEnabled: false }),
    stoneMat
  );
  ped.rotation.y = 0;
  ped.position.set(-0.5, H1 + H2 - 0.1, D / 2 + 0.4);
  g.add(ped);

  // Roof — slanted simple
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W, 0.22, D), roofMat);
  roof.position.y = H1 + H2 + 0.11;
  g.add(roof);

  // Roof crown lights (warm glow strip — the spot we'll lift to)
  for (const x of [-4, -2, 0, 2, 4]) {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd28a })
    );
    crown.position.set(x, H1 + H2 + 0.3, 0);
    g.add(crown);
  }

  return g;
}

// ─────────────────────────────────────────────────────────────
export default function SceneLogistics() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.0035);

    const camera = new THREE.PerspectiveCamera(40, W / H, 1, 800);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    // ─── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x445577, 0.45));

    const keyLight = new THREE.DirectionalLight(0xffd9a8, 0.9);
    keyLight.position.set(40, 80, 60);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6B4FA0, 0.35);
    fillLight.position.set(-40, 30, -10);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x2da39a, 0.4);
    rimLight.position.set(0, 20, -60);
    scene.add(rimLight);

    // ─── Russia outline (no fill, thin teal lines only) ──
    const outlinePts = BORDER.map(([lo, la]) => {
      const p = toXZ(lo, la);
      return new THREE.Vector3(p.x, 0.4, p.z);
    });
    outlinePts.push(outlinePts[0].clone());
    const outline = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(outlinePts),
      new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.5 })
    );
    scene.add(outline);

    // Soft glow second pass — slightly larger, lower opacity
    const outlineGlow = outline.clone();
    outlineGlow.material = outline.material.clone();
    outlineGlow.material.opacity = 0.12;
    outlineGlow.position.y = 0.3;
    scene.add(outlineGlow);

    // ─── Cities (markers + vertical light beacons) ──────
    const cityNodes = [];
    for (const c of CITIES) {
      const pos = toXZ(c.lon, c.lat);
      // Marker dot
      const mat = new THREE.MeshBasicMaterial({ color: c.color });
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), mat);
      dot.position.set(pos.x, 0.5, pos.z);
      scene.add(dot);

      // Beacon — a vertical thin glowing column reaching up
      const beaconHeight = c.role === 'pass' ? 6 : 12;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.04, beaconHeight, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: c.color, transparent: true, opacity: 0.35,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      beam.position.set(pos.x, beaconHeight / 2, pos.z);
      scene.add(beam);

      // Outer pulsing ring on the ground around the marker
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.95, 32),
        new THREE.MeshBasicMaterial({
          color: c.color, transparent: true, opacity: 0.5,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.05, pos.z);
      scene.add(ring);

      cityNodes.push({ ...c, sceneX: pos.x, sceneZ: pos.z, dot, beam, ring });
    }

    // ─── Route (dashed double line) ─────────────────────
    const chel = toXZ(61.4, 55.2);
    const kzn = toXZ(49.1, 55.8);
    const msk = toXZ(37.6, 55.75);
    const spb = toXZ(30.3, 59.9);
    // Build route as a smooth curve with slight bumps so it doesn't look ruler-straight
    const routeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(chel.x, 0.45, chel.z),
      new THREE.Vector3((chel.x + kzn.x) / 2, 0.45, (chel.z + kzn.z) / 2 - 1.5),
      new THREE.Vector3(kzn.x, 0.45, kzn.z),
      new THREE.Vector3((kzn.x + msk.x) / 2, 0.45, (kzn.z + msk.z) / 2 + 1.0),
      new THREE.Vector3(msk.x, 0.45, msk.z),
      new THREE.Vector3((msk.x + spb.x) / 2, 0.45, (msk.z + spb.z) / 2 - 1.5),
      new THREE.Vector3(spb.x, 0.45, spb.z),
    ], false, 'catmullrom', 0.5);

    // Two dashed offset rails (looks like a road on a paper map)
    const routePts = routeCurve.getPoints(220);
    function makeRail(offsetZ, color, opacity) {
      const pts = routePts.map(p => new THREE.Vector3(p.x, p.y, p.z + offsetZ));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineDashedMaterial({
        color, dashSize: 0.5, gapSize: 0.4, transparent: true, opacity,
      });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      return line;
    }
    const railA = makeRail(-0.18, 0x88c4ff, 0.55);
    const railB = makeRail(0.18, 0x88c4ff, 0.55);
    scene.add(railA, railB);

    // Solid travelled-trail line (gets drawn progressively as the truck moves)
    const trailGeo = new THREE.BufferGeometry().setFromPoints(routePts);
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x2da39a, transparent: true, opacity: 0.95,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    trailLine.geometry.setDrawRange(0, 0);
    scene.add(trailLine);

    // ─── Truck + crane ──────────────────────────────────
    const truck = buildTruck();
    truck.visible = false;
    scene.add(truck);

    const { crane, boomGroup, turret, beacon } = buildCrane();
    // Place crane standing in Chelyabinsk initially
    crane.position.set(chel.x + 1, 0, chel.z + 1);
    scene.add(crane);

    // ─── Historic building (Petersburg, near SPb beacon) ─
    const building = buildHistoricBuilding();
    building.position.set(spb.x - 1, 0.4, spb.z + 4);
    building.rotation.y = Math.PI / 2 - 0.3; // angle so the facade faces incoming truck
    building.visible = false; // appears in act 4
    scene.add(building);

    // Warm spotlight for the building (lit when act 4 begins)
    const buildingLight = new THREE.SpotLight(0xffd28a, 0, 30, Math.PI / 4, 0.5, 1.0);
    buildingLight.position.set(spb.x - 1, 6, spb.z + 12);
    buildingLight.target.position.set(spb.x - 1, 2, spb.z + 4);
    scene.add(buildingLight);
    scene.add(buildingLight.target);

    // ─── Snow particles (visible during act 3-5) ────────
    const SNOW = 250;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(SNOW * 3);
    const snowSpeed = new Float32Array(SNOW);
    for (let i = 0; i < SNOW; i++) {
      // Concentrated around SPb area (where weather is "active")
      snowPos[i * 3] = spb.x + (Math.random() - 0.5) * 30;
      snowPos[i * 3 + 1] = Math.random() * 18;
      snowPos[i * 3 + 2] = spb.z + (Math.random() - 0.5) * 25;
      snowSpeed[i] = 0.04 + Math.random() * 0.06;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xeaf2ff, size: 0.18, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const snow = new THREE.Points(snowGeo, snowMat);
    scene.add(snow);

    // ─── Ambient star particles (subtle, scene-wide) ────
    const STARS = 180;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 120;
      starPos[i * 3 + 1] = 5 + Math.random() * 35;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.1, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ─── Post-processing: bloom on emissive elements ────
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.55, 0.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ─── Animation timeline ────────────────────────────
    const clock = new THREE.Clock();
    let animId, isVisible = false;

    const T_SHOW = 3.0;
    const T_LOAD = 1.5;
    const T_DRIVE = 5.5;
    const T_LIFT = 4.0;
    const T_HOLD = 2.0;
    const T1 = T_SHOW;
    const T2 = T1 + T_LOAD;
    const T3 = T2 + T_DRIVE;
    const T4 = T3 + T_LIFT;
    const TOTAL = T4 + T_HOLD;

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const lerp = (a, b, t) => a + (b - a) * t;

    // Camera keyframes — { t, pos, look }. Interpolated continuously.
    const camFrames = [
      // Act 1: SHOW — high 3/4 view of Chelyabinsk crane
      { t: 0,    pos: [chel.x + 8, 6, chel.z + 9],   look: [chel.x + 1, 1.2, chel.z + 1] },
      { t: T1,   pos: [chel.x + 6, 4, chel.z + 6],   look: [chel.x + 1, 1.0, chel.z + 1] },
      // Act 2: LOAD — pull back slightly
      { t: T2,   pos: [chel.x + 9, 7, chel.z + 7],   look: [chel.x + 1, 1.0, chel.z + 1] },
      // Act 3: DRIVE — overhead following the truck
      { t: T2 + 0.6, pos: [chel.x - 4, 22, chel.z + 8], look: [chel.x, 0, chel.z] },
      { t: T3 - 0.5, pos: [spb.x + 6, 22, spb.z + 12],  look: [spb.x, 0, spb.z + 2] },
      // Act 4: LIFT — low angle on building + crane
      { t: T3,   pos: [spb.x + 8, 4, spb.z + 13],     look: [spb.x - 1, 4, spb.z + 4] },
      { t: T4,   pos: [spb.x + 12, 6, spb.z + 14],    look: [spb.x - 1, 4.5, spb.z + 4] },
      // Act 5: HOLD — wide cinematic
      { t: TOTAL, pos: [spb.x + 18, 9, spb.z + 18],   look: [spb.x - 1, 3.5, spb.z + 4] },
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
      camera.lookAt(
        lerp(a.look[0], b.look[0], p),
        lerp(a.look[1], b.look[1], p),
        lerp(a.look[2], b.look[2], p)
      );
    };

    // Truck heading helper: orient along route direction
    let prevTruckPos = null;
    const orientToward = (obj, pos) => {
      if (!prevTruckPos) { prevTruckPos = pos.clone(); return; }
      const dir = new THREE.Vector3().subVectors(pos, prevTruckPos);
      if (dir.lengthSq() > 0.0001) {
        // We model the truck as facing -X by default (cabin at -3.6),
        // so we want it to face the direction of travel.
        const angle = Math.atan2(dir.x, dir.z);
        obj.rotation.y = angle - Math.PI / 2;
      }
      prevTruckPos = pos.clone();
    };

    // Update DOM city labels each frame (in screen space)
    const updateLabels = (lang) => {
      const arr = cityNodes.map(c => {
        const v = new THREE.Vector3(c.sceneX, 4, c.sceneZ);
        v.project(camera);
        return {
          name: lang === 'en' ? c.nameEn : c.nameRu,
          x: (v.x * 0.5 + 0.5) * W,
          y: (-v.y * 0.5 + 0.5) * H,
          visible: v.z < 1,
          color: '#' + c.color.toString(16).padStart(6, '0'),
        };
      });
      setLabels(arr);
    };

    // Read the current language without putting `t` in the effect deps —
    // otherwise switching language would tear down and rebuild the whole
    // WebGL scene. The listener just updates a local variable.
    let labelLang = i18n.language || 'ru';
    const onLangChanged = (lng) => { labelLang = lng || 'ru'; };
    i18n.on('languageChanged', onLangChanged);

    // Main animation loop
    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();
      const time = elapsed % TOTAL;

      lerpCam(time);

      // City breathing
      cityNodes.forEach(c => {
        c.dot.scale.setScalar(1 + Math.sin(elapsed * 2.4 + c.sceneX * 0.1) * 0.15);
        c.ring.scale.setScalar(1 + Math.sin(elapsed * 1.6 + c.sceneZ * 0.1) * 0.2);
        c.ring.material.opacity = 0.3 + Math.sin(elapsed * 1.6) * 0.2;
        c.beam.material.opacity = 0.25 + Math.sin(elapsed * 1.5 + c.sceneX) * 0.12;
      });

      // Outline subtle pulse
      outline.material.opacity = 0.45 + Math.sin(elapsed * 0.5) * 0.05;

      // Crane warning beacon
      beacon.material.color.setHSL(0.5 + Math.sin(elapsed * 4) * 0.05, 0.7, 0.5);
      beacon.scale.setScalar(0.9 + Math.sin(elapsed * 8) * 0.25);

      // ─── ACT 1: SHOW (crane in Chelyabinsk, boom horizontal) ─
      if (time < T1) {
        truck.visible = false;
        building.visible = false;
        crane.position.set(chel.x + 1, 0, chel.z + 1);
        crane.rotation.y = -Math.PI * 0.15;
        // Boom horizontal, rotating slightly to "scan"
        boomGroup.rotation.z = lerp(0, -0.05, easeInOut(time / T1));
        turret.rotation.y = Math.sin(elapsed * 0.4) * 0.15;
        trailLine.geometry.setDrawRange(0, 0);
        snowMat.opacity = 0;
        buildingLight.intensity = 0;
      }

      // ─── ACT 2: LOAD (boom folds up, crane settles on truck) ─
      else if (time < T2) {
        const p = easeInOut((time - T1) / T_LOAD);
        // Show truck stationed next to crane
        truck.visible = true;
        truck.position.set(chel.x - 0.5, 0, chel.z + 1);
        truck.rotation.y = -Math.PI / 2; // facing +Z (toward viewer)
        prevTruckPos = truck.position.clone();
        // Boom folds upward to vertical-ish so it can lay on the truck deck
        boomGroup.rotation.z = lerp(-0.05, -Math.PI / 2 + 0.4, p);
        // Crane chassis lifts onto truck deck (smoothly)
        crane.position.set(
          lerp(chel.x + 1, chel.x - 0.5, p),
          lerp(0, 0.9, p),                    // up onto deck
          lerp(chel.z + 1, chel.z + 1, p),
        );
        // Slight rotation for variety as it turns to align with truck
        crane.rotation.y = lerp(-Math.PI * 0.15, -Math.PI / 2 - 0.05, p);
        turret.rotation.y = lerp(Math.sin(elapsed * 0.4) * 0.15, 0, p);
        trailLine.geometry.setDrawRange(0, 0);
        snowMat.opacity = 0;
      }

      // ─── ACT 3: DRIVE (truck moves along route) ─
      else if (time < T3) {
        const p = easeInOut((time - T2) / T_DRIVE);
        const pos = routeCurve.getPointAt(p);
        truck.visible = true;
        truck.position.copy(pos);
        truck.position.y = 0;
        orientToward(truck, pos);
        // Crane rides on truck deck — keep position synced with truck deck pos
        crane.position.copy(pos);
        crane.position.y = 0.9;
        crane.rotation.y = truck.rotation.y - Math.PI / 2 - 0.05;
        // Boom stays folded
        boomGroup.rotation.z = -Math.PI / 2 + 0.4;
        // Trail line draws progressively
        trailLine.geometry.setDrawRange(0, Math.floor(p * 220));
        // Snow fades in as we approach Petersburg
        snowMat.opacity = lerp(0, 0.85, Math.min(1, p * 1.4));
        // Building appears as we get close (last 30% of drive)
        building.visible = p > 0.55;
      }

      // ─── ACT 4: LIFT (truck stops, boom rises toward roof) ─
      else if (time < T4) {
        const p = easeOut((time - T3) / T_LIFT);
        const pos = routeCurve.getPointAt(1);
        truck.visible = true;
        truck.position.copy(pos);
        truck.position.y = 0;
        // Truck heading: was facing along route direction at t=1
        // Keep last orientation; freeze prevTruckPos
        crane.position.copy(pos);
        crane.position.y = 0.9;
        // Crane rotates its turret to face the building
        const targetTurretY = -1.2;
        turret.rotation.y = lerp(0, targetTurretY, p);
        // Boom unfolds from horizontal-folded to vertical-up
        boomGroup.rotation.z = lerp(-Math.PI / 2 + 0.4, -1.45, p);
        building.visible = true;
        buildingLight.intensity = lerp(0, 1.4, p);
        snowMat.opacity = 0.85 + Math.sin(elapsed * 2) * 0.05;
        trailLine.geometry.setDrawRange(0, 220);
      }

      // ─── ACT 5: HOLD (final cinematic shot) ─
      else {
        const pos = routeCurve.getPointAt(1);
        truck.visible = true;
        truck.position.copy(pos);
        truck.position.y = 0;
        crane.position.copy(pos);
        crane.position.y = 0.9;
        turret.rotation.y = -1.2;
        boomGroup.rotation.z = -1.45 + Math.sin(elapsed * 1.5) * 0.02;
        building.visible = true;
        buildingLight.intensity = 1.4 + Math.sin(elapsed * 2) * 0.15;
        snowMat.opacity = 0.85;
      }

      // Snowfall — drift down, wrap when below ground
      const snowArr = snow.geometry.attributes.position.array;
      for (let i = 0; i < SNOW; i++) {
        snowArr[i * 3 + 1] -= snowSpeed[i];
        snowArr[i * 3] += Math.sin(elapsed * 0.5 + i) * 0.005;
        if (snowArr[i * 3 + 1] < 0.5) {
          snowArr[i * 3 + 1] = 18;
          snowArr[i * 3] = spb.x + (Math.random() - 0.5) * 30;
          snowArr[i * 3 + 2] = spb.z + (Math.random() - 0.5) * 25;
        }
      }
      snow.geometry.attributes.position.needsUpdate = true;

      updateLabels(labelLang);
      composer.render();
    };

    const observer = new IntersectionObserver(([e]) => {
      isVisible = e.isIntersecting;
      if (isVisible) clock.getDelta();
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
      i18n.off('languageChanged', onLangChanged);
      composer.dispose();
      disposeScene(scene, renderer);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {labels.map((l, i) => l.visible && (
        <div key={i} style={{
          position: 'absolute', left: l.x, top: l.y,
          transform: 'translate(-50%, -100%)',
          color: '#fff', fontSize: 11, fontFamily: 'var(--font-display)',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          textShadow: `0 0 8px ${l.color}, 0 2px 4px rgba(0,0,0,0.9)`,
          fontWeight: 600, letterSpacing: '0.5px',
        }}>{l.name}</div>
      ))}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.55)', fontSize: 12,
        fontFamily: 'var(--font-display)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>{t('creator.scene.logisticsCaption')}</div>
    </div>
  );
}
