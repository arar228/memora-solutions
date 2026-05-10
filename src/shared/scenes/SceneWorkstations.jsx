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
   SceneWorkstations — "1,200 workstations from scratch".
   Story told through pure zoom-out, three levels of detail:

     1. CLOSE  (0–4s)   — one detailed workstation: desk, two monitors with
                          procedurally drawn CAD/3D/data, mid-tower, keyboard,
                          mouse, mug, chair. Camera orbits slowly.
     2. PULL   (4–7s)   — camera glides back; a 5×5 ring of mid-LOD stations
                          fades in around the hero, then a wider 11×11 grid.
     3. FAR    (7–13s)  — the InstancedMesh field of 1,200 fades in below.
                          Camera lifts to overhead — rows and aisles read.
     4. HOLD   (13–16s) — wide cinematic shot, screens shimmer.

   No falling parts, no abrupt camera jumps, no concept switch from gaming
   PC to grey cubes. Three LOD layers cross-fade based on the camera's
   distance from the hero workstation.
   ====================================================================== */

// ───── Procedural textures for the hero monitors (drawn once) ─────
function makeCADTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 384;
  const ctx = cv.getContext('2d');
  // Background: deep blue with grid
  ctx.fillStyle = '#0d1530';
  ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = 'rgba(45, 163, 154, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 24) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 384); ctx.stroke();
  }
  for (let y = 0; y <= 384; y += 24) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  // CAD: a building elevation made of teal lines
  ctx.strokeStyle = '#2da39a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Outer rectangle
  ctx.moveTo(80, 320); ctx.lineTo(80, 80);
  ctx.lineTo(280, 50); ctx.lineTo(432, 80);
  ctx.lineTo(432, 320); ctx.closePath(); ctx.stroke();
  // Inner divisions: floors
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const y = 320 - i * 48;
    ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(432, y); ctx.stroke();
  }
  // Vertical mullions
  for (let i = 1; i <= 5; i++) {
    const x = 80 + i * 60;
    ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 320); ctx.stroke();
  }
  // Dimension lines and arrowheads
  ctx.strokeStyle = '#88c4ff';
  ctx.beginPath();
  ctx.moveTo(60, 320); ctx.lineTo(60, 80); ctx.stroke();
  ctx.moveTo(60, 80); ctx.lineTo(70, 90); ctx.moveTo(60, 80); ctx.lineTo(50, 90);
  ctx.moveTo(60, 320); ctx.lineTo(70, 310); ctx.moveTo(60, 320); ctx.lineTo(50, 310);
  ctx.stroke();
  // Labels
  ctx.fillStyle = '#88c4ff';
  ctx.font = '11px monospace';
  ctx.fillText('A-101', 88, 42);
  ctx.fillText('12.4 m', 28, 200);
  ctx.fillText('SCALE 1:50', 360, 374);
  // Title bar
  ctx.fillStyle = 'rgba(45, 163, 154, 0.15)';
  ctx.fillRect(0, 0, 512, 22);
  ctx.fillStyle = '#2da39a';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('CAD :: ELEVATION_NORTH.dwg', 8, 15);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWireframeTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 384;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a0d22';
  ctx.fillRect(0, 0, 512, 384);
  // Title bar
  ctx.fillStyle = 'rgba(107, 79, 160, 0.18)';
  ctx.fillRect(0, 0, 512, 22);
  ctx.fillStyle = '#9b7fd0';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('3D :: assembly_v3.step  [ISO]', 8, 15);
  // Wireframe of an isometric box (cube + edges + a bolt-like detail)
  const cx = 256, cy = 200, s = 110;
  // Iso projection vertices
  const isoPts = [
    [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
    [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],
  ].map(([x, y, z]) => {
    return [
      cx + (x - z) * s * 0.7,
      cy + (x + z) * s * 0.4 - y * s * 0.7,
    ];
  });
  ctx.strokeStyle = '#6B4FA0';
  ctx.lineWidth = 2;
  const edges = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ];
  for (const [a, b] of edges) {
    ctx.beginPath(); ctx.moveTo(isoPts[a][0], isoPts[a][1]);
    ctx.lineTo(isoPts[b][0], isoPts[b][1]); ctx.stroke();
  }
  // Diagonals (showing internal structure)
  ctx.strokeStyle = '#9b7fd0';
  ctx.lineWidth = 1;
  for (const [a, b] of [[0,6],[1,7],[2,4],[3,5]]) {
    ctx.beginPath(); ctx.moveTo(isoPts[a][0], isoPts[a][1]);
    ctx.lineTo(isoPts[b][0], isoPts[b][1]); ctx.stroke();
  }
  // Vertex dots
  ctx.fillStyle = '#ffd28a';
  for (const [x, y] of isoPts) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // HUD readout
  ctx.fillStyle = '#9b7fd0';
  ctx.font = '10px monospace';
  ctx.fillText('VERTICES: 8', 16, 360);
  ctx.fillText('EDGES: 12', 120, 360);
  ctx.fillText('FACES: 6', 220, 360);
  ctx.fillText('FPS: 60', 440, 360);
  return Object.assign(new THREE.CanvasTexture(cv), { colorSpace: THREE.SRGBColorSpace });
}

function makeDataTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 384;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#08110a';
  ctx.fillRect(0, 0, 512, 384);
  // Title
  ctx.fillStyle = 'rgba(60, 200, 120, 0.18)';
  ctx.fillRect(0, 0, 512, 22);
  ctx.fillStyle = '#5fdf9a';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('TERMINAL :: render_farm.log', 8, 15);
  // Lines of "code"
  ctx.fillStyle = '#5fdf9a';
  ctx.font = '11px monospace';
  const lines = [
    '> queue   add  job_4218.bld   240f',
    '> render  start            t=0.00',
    '  frame 001  ████████░░  72%',
    '  frame 002  ██████░░░░  58%',
    '  frame 003  █████████░  91%',
    '  frame 004  ████░░░░░░  41%',
    '  ────────────────────────────',
    '  cluster: 32 nodes  load: 84%',
    '  mem: 248GB / 512GB     ok',
    '  net: 12.4 Gb/s  cache:7.7TB',
    '  ────────────────────────────',
    '> est complete   00:08:42',
    '> warn  node_17 latency  high',
    '> info  retrying frame 002',
    '_',
  ];
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 16, 50 + i * 18);
  }
  // Animated bars (just static here — not animating texture per frame)
  ctx.fillStyle = 'rgba(95, 223, 154, 0.25)';
  ctx.fillRect(16, 348, 480, 1);
  return Object.assign(new THREE.CanvasTexture(cv), { colorSpace: THREE.SRGBColorSpace });
}

// ───── Hero workstation (close-up) ─────
function buildHeroStation() {
  const station = new THREE.Group();

  const deskMat = new THREE.MeshStandardMaterial({
    color: 0x2a2730, roughness: 0.55, metalness: 0.25,
  });
  const deskTopMat = new THREE.MeshStandardMaterial({
    color: 0x1c1a22, roughness: 0.4, metalness: 0.35,
  });
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x111118, roughness: 0.35, metalness: 0.55,
  });
  const monitorBackMat = new THREE.MeshStandardMaterial({
    color: 0x16161e, roughness: 0.45, metalness: 0.3,
  });
  const screenBezelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a10, roughness: 0.6 });
  const standMat = new THREE.MeshStandardMaterial({ color: 0x44464e, roughness: 0.4, metalness: 0.6 });
  const keyboardMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.6 });
  const keyMat = new THREE.MeshStandardMaterial({
    color: 0x32323a, roughness: 0.55,
    emissive: 0x2da39a, emissiveIntensity: 0.05,
  });
  const accentLED = new THREE.MeshBasicMaterial({ color: 0x2da39a });

  // ── Desk ──────────────────────────────────────────────────────
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.9), deskTopMat);
  deskTop.position.set(0, 0.74, 0);
  station.add(deskTop);
  // Edge highlight strip (catches bloom)
  const edge = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.01, 0.04), accentLED);
  edge.position.set(0, 0.715, 0.43);
  station.add(edge);
  // Legs (panel-style instead of round)
  for (const x of [-0.92, 0.92]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.7), deskMat);
    leg.position.set(x, 0.36, 0);
    station.add(leg);
  }
  // Cable management tray under desk
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.18), deskMat);
  tray.position.set(0, 0.58, -0.3);
  station.add(tray);

  // ── Monitor 1 (CAD, on the left, primary 27") ─────────────────
  const screenWHRatio = 16 / 9;
  function buildMonitor(width, posX, posY, posZ, rotY, screenTexture, emissiveColor) {
    const mh = width / screenWHRatio;
    const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, mh + 0.05, 0.04), monitorBackMat);
    back.position.set(posX, posY, posZ - 0.005);
    back.rotation.y = rotY;
    station.add(back);
    // Bezel frame
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.04, mh + 0.04, 0.02), screenBezelMat);
    bezel.position.set(posX, posY, posZ + 0.011);
    bezel.rotation.y = rotY;
    station.add(bezel);
    // Screen face
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissiveMap: screenTexture,
      emissive: emissiveColor,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, mh), screenMat);
    screen.position.set(posX, posY, posZ + 0.022);
    screen.rotation.y = rotY;
    station.add(screen);
    // Stand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.06), standMat);
    stand.position.set(posX, posY - mh / 2 - 0.09, posZ - 0.05);
    stand.rotation.y = rotY;
    station.add(stand);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.22), standMat);
    base.position.set(posX, posY - mh / 2 - 0.18, posZ - 0.05);
    base.rotation.y = rotY;
    station.add(base);
  }
  // Three monitors: CAD on the left, 3D wireframe centre, render-farm log
  // on the right — each angled slightly toward the chair.
  buildMonitor(0.62, -0.74, 1.16, -0.30, 0.32, makeCADTexture(), 0xffffff);
  buildMonitor(0.66, 0.00, 1.20, -0.34, 0.0, makeWireframeTexture(), 0xffffff);
  buildMonitor(0.62, 0.74, 1.16, -0.30, -0.32, makeDataTexture(), 0xffffff);

  // ── Mid-tower under the desk (right corner, on the floor) ────
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.45), towerMat);
  tower.position.set(0.85, 0.275, -0.28);
  station.add(tower);
  // Tower side panel — tinted glass facing the viewer
  const towerGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x152040, roughness: 0.04, transmission: 0.5,
    thickness: 0.18, ior: 1.45, transparent: true, clearcoat: 1.0,
  });
  const towerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.46, 0.4), towerGlassMat);
  towerGlass.position.set(0.74, 0.275, -0.28);
  station.add(towerGlass);
  // Tower vertical accent stripe (catches bloom)
  const towerStripe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.02), accentLED);
  towerStripe.position.set(0.85, 0.275, -0.05);
  station.add(towerStripe);
  // Power LED on the front face
  const powerLED = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), accentLED);
  powerLED.position.set(0.74, 0.49, -0.06);
  station.add(powerLED);

  // ── Keyboard ─────────────────────────────────────────────────
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.16), keyboardMat);
  kb.position.set(0, 0.78, 0.25);
  station.add(kb);
  // Tiny key bumps (4 rows × ~14 columns)
  const keyGeo = new THREE.BoxGeometry(0.025, 0.012, 0.025);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 14; c++) {
      const k = new THREE.Mesh(keyGeo, keyMat);
      k.position.set(-0.225 + c * 0.034, 0.795, 0.21 + r * 0.025);
      station.add(k);
    }
  }
  // Keyboard underglow strip
  const kbGlow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.005, 0.01), accentLED);
  kbGlow.position.set(0, 0.78, 0.18);
  station.add(kbGlow);

  // ── Mouse ────────────────────────────────────────────────────
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.12), keyboardMat);
  mouse.position.set(0.34, 0.78, 0.27);
  station.add(mouse);

  // ── Coffee mug (white cylinder + dark coffee top) ────────────
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.1, 18),
    new THREE.MeshStandardMaterial({ color: 0xeae6dd, roughness: 0.75 })
  );
  mug.position.set(-0.78, 0.82, 0.28);
  station.add(mug);
  const coffee = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.005, 18),
    new THREE.MeshStandardMaterial({ color: 0x2a1a0c, roughness: 0.4 })
  );
  coffee.position.set(-0.78, 0.872, 0.28);
  station.add(coffee);
  // Mug handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.008, 8, 14, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xeae6dd, roughness: 0.75 })
  );
  handle.rotation.y = Math.PI / 2;
  handle.position.set(-0.825, 0.82, 0.28);
  station.add(handle);

  // ── Chair (suggestive, behind desk) ──────────────────────────
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.7 });
  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), chairMat);
  seat.position.set(0, 0.5, 0.85);
  station.add(seat);
  // Backrest
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.06), chairMat);
  backrest.position.set(0, 0.85, 1.1);
  station.add(backrest);
  // Centre column
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12), standMat
  );
  column.position.set(0, 0.27, 0.85);
  station.add(column);
  // 5-spoke base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.04, 0.04),
      standMat
    );
    spoke.position.set(0.16 * Math.cos(a), 0.06, 0.85 + 0.16 * Math.sin(a));
    spoke.rotation.y = -a;
    station.add(spoke);
    // Castor wheel
    const wheel = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.7 })
    );
    wheel.position.set(0.32 * Math.cos(a), 0.03, 0.85 + 0.32 * Math.sin(a));
    station.add(wheel);
  }

  return station;
}

// ───── Mid-LOD station (5×5 ring; readable but cheap) ─────
function buildMidStation() {
  const g = new THREE.Group();
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.05, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x1c1a22, roughness: 0.5 })
  );
  desk.position.y = 0.74;
  g.add(desk);
  // Two screen blocks (back) + emissive face (front)
  for (const dx of [-0.36, 0.36]) {
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.4, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.5 })
    );
    back.position.set(dx, 1.16, -0.3);
    back.rotation.y = -dx > 0 ? -0.16 : 0.16;
    g.add(back);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.36),
      new THREE.MeshBasicMaterial({ color: 0x2da39a })
    );
    face.position.set(dx, 1.16, -0.28);
    face.rotation.y = -dx > 0 ? -0.16 : 0.16;
    g.add(face);
  }
  // Tower
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.4, metalness: 0.4 })
  );
  tower.position.set(0.7, 0.97, -0.15);
  g.add(tower);
  // Chair stub
  const chair = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.55, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x14141c, roughness: 0.7 })
  );
  chair.position.set(0, 0.55, 0.85);
  g.add(chair);
  return g;
}

// ─────────────────────────────────────────────────────────────
export default function SceneWorkstations() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState('close');

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.0035);

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 600);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    // ─── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x445566, 0.55));
    const keyLight = new THREE.DirectionalLight(0xfff6e0, 0.8);
    keyLight.position.set(15, 25, 18);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6B4FA0, 0.35);
    fillLight.position.set(-12, 8, -6);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x2da39a, 0.4);
    rimLight.position.set(0, 5, -20);
    scene.add(rimLight);
    // Soft warm desk lamp on hero station
    const deskLamp = new THREE.PointLight(0xffd28a, 0.7, 4);
    deskLamp.position.set(-0.4, 1.6, 0.2);
    scene.add(deskLamp);

    // ─── Floor ───────────────────────────────────────────
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.8, metalness: 0.2 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    // Subtle floor grid (legible only when zoomed out)
    const grid = new THREE.GridHelper(300, 75, 0x1a1a3a, 0x0e0e1c);
    grid.position.y = 0.005;
    scene.add(grid);

    // ─── Hero station (always visible) ───────────────────
    const heroStation = buildHeroStation();
    heroStation.position.set(0, 0, 0);
    scene.add(heroStation);

    // ─── Mid-LOD ring of 25 stations (5×5, fade in during pull) ─
    const midGroup = new THREE.Group();
    const MID_SP_X = 2.4, MID_SP_Z = 1.8;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        if (r === 0 && c === 0) continue; // hero takes the centre
        const s = buildMidStation();
        s.position.set(c * MID_SP_X, 0, r * MID_SP_Z);
        midGroup.add(s);
      }
    }
    midGroup.visible = false;
    // Fade-in opacity is applied per material; we use a single shared
    // opacity on a holder via traversal at runtime.
    scene.add(midGroup);

    // ─── 1,200 InstancedMesh stations (the field) ────────
    // Layout: 40 cols × 30 rows = 1200, with aisle gaps every 8 cols.
    const COLS = 40, ROWS = 30, TOTAL = COLS * ROWS;   // 1200
    const SP_X = 1.8, SP_Z = 1.5;
    const AISLE_EVERY = 8, AISLE_GAP = 1.2;

    function instanceXZ(col, row) {
      const aisles = Math.floor(col / AISLE_EVERY);
      const x = (col - COLS / 2) * SP_X + aisles * AISLE_GAP;
      const z = (row - ROWS / 2) * SP_Z;
      return [x, z];
    }

    // Instance #1: desk + tower body (dark box)
    const bodyGeo = new THREE.BoxGeometry(1.5, 0.7, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x18181f, roughness: 0.55, metalness: 0.3,
    });
    const bodyMesh = new THREE.InstancedMesh(bodyGeo, bodyMat, TOTAL);
    bodyMesh.visible = false;
    scene.add(bodyMesh);

    // Instance #2: emissive screen plate per station
    const screenGeo = new THREE.BoxGeometry(1.1, 0.45, 0.05);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x2da39a });
    const screenMesh = new THREE.InstancedMesh(screenGeo, screenMat, TOTAL);
    screenMesh.visible = false;
    scene.add(screenMesh);

    const dummy = new THREE.Object3D();
    const screenColor = new THREE.Color();
    const farData = []; // per-instance state
    for (let i = 0; i < TOTAL; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const [x, z] = instanceXZ(col, row);
      farData.push({
        x, z,
        delay: Math.random() * 1.0 + (col + row) * 0.012,
        visible: false,
        // Random screen tint among teal / violet / amber so the field has variety
        hue: Math.random() < 0.55 ? 0xff2da39a >>> 0 :
             Math.random() < 0.5 ? 0xff6B4FA0 >>> 0 :
                                   0xffffd28a >>> 0,
      });
      // Body sits on the floor at half-height
      dummy.position.set(x, 0.35, z);
      dummy.scale.set(0, 0, 0); dummy.updateMatrix();
      bodyMesh.setMatrixAt(i, dummy.matrix);
      // Screen sits above body, slightly forward
      dummy.position.set(x, 0.95, z - 0.05);
      dummy.scale.set(0, 0, 0); dummy.updateMatrix();
      screenMesh.setMatrixAt(i, dummy.matrix);
      screenColor.setHex(farData[i].hue & 0xffffff);
      screenMesh.setColorAt(i, screenColor);
    }
    bodyMesh.instanceMatrix.needsUpdate = true;
    screenMesh.instanceMatrix.needsUpdate = true;
    if (screenMesh.instanceColor) screenMesh.instanceColor.needsUpdate = true;

    // ─── Atmospheric particles (dust motes) ──────────────
    const DUST = 90;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 8;
      dustPos[i * 3 + 1] = 0.5 + Math.random() * 2.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xffd28a, size: 0.04, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ─── Post-processing ────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.55, 0.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ─── Animation timeline ────────────────────────────
    const T_CLOSE = 4.0;
    const T_PULL = 3.5;
    const T_FAR = 6.0;
    const T_HOLD = 3.0;
    const T1 = T_CLOSE;
    const T2 = T1 + T_PULL;
    const T3 = T2 + T_FAR;
    const TOTAL_T = T3 + T_HOLD;

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;

    // Camera storyboard: 5 keyframes, smooth ease between them
    const camFrames = [
      // CLOSE — 3/4 view of the hero workstation
      { t: 0,            pos: [1.8, 1.7, 2.0],  look: [0, 1.05, 0] },
      { t: T_CLOSE * 0.5, pos: [-1.0, 1.6, 2.4], look: [0, 1.05, 0] },
      { t: T1,           pos: [-1.8, 1.9, 2.2], look: [0, 1.05, 0] },
      // PULL — back and up so the 5×5 ring fades in
      { t: T2,           pos: [-4.5, 4.5, 6.5], look: [0, 0.8, 0] },
      // FAR — overhead, the whole 1,200-station field
      { t: T2 + T_FAR * 0.5, pos: [0, 22, 22], look: [0, 0, 0] },
      { t: T3,           pos: [3, 38, 28],     look: [0, 0, 0] },
      // HOLD — wide cinematic, slow drift
      { t: TOTAL_T,      pos: [-4, 44, 30],    look: [0, 0, 0] },
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

    // Apply opacity to mid-group materials (one shot when fade changes)
    let lastMidOpacity = 0;
    const setMidOpacity = (o) => {
      if (Math.abs(o - lastMidOpacity) < 0.01) return;
      lastMidOpacity = o;
      midGroup.traverse(obj => {
        if (obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = o;
        }
      });
      midGroup.visible = o > 0.01;
    };

    const clock = new THREE.Clock();
    let animId, isInView = false;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isInView) return;

      const elapsed = clock.getElapsedTime();
      const time = elapsed % TOTAL_T;
      lerpCam(time);

      // Drift dust
      const dArr = dust.geometry.attributes.position.array;
      for (let i = 0; i < DUST; i++) {
        dArr[i * 3 + 1] += 0.003 * (1 + Math.sin(elapsed + i));
        if (dArr[i * 3 + 1] > 3.2) dArr[i * 3 + 1] = 0.4;
      }
      dust.geometry.attributes.position.needsUpdate = true;

      // ─── Phase 1: CLOSE ─────────────────────────
      if (time < T1) {
        setPhase('close');
        midGroup.visible = false;
        bodyMesh.visible = false;
        screenMesh.visible = false;
        setCount(1);
        // Subtle desk lamp flicker
        deskLamp.intensity = 0.7 + Math.sin(elapsed * 4.2) * 0.04;
      }

      // ─── Phase 2: PULL ──────────────────────────
      else if (time < T2) {
        setPhase('pull');
        const p = (time - T1) / T_PULL;
        // Mid ring fades in over first 70% of pull
        setMidOpacity(Math.min(1, p / 0.7));
        bodyMesh.visible = false;
        screenMesh.visible = false;
        setCount(Math.min(25, Math.floor(p * 25) + 1));
      }

      // ─── Phase 3: FAR (1,200 spawn in) ─────────
      else if (time < T3) {
        setPhase('far');
        setMidOpacity(Math.max(0, 1 - (time - T2) / 1.0)); // mid fades out as far comes in
        bodyMesh.visible = true;
        screenMesh.visible = true;
        const farT = time - T2;
        let visCount = 0, anyChange = false;
        for (let i = 0; i < TOTAL; i++) {
          const d = farData[i];
          if (!d.visible && farT > d.delay) {
            d.visible = true;
            // Body
            dummy.position.set(d.x, 0.35, d.z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            bodyMesh.setMatrixAt(i, dummy.matrix);
            // Screen above body
            dummy.position.set(d.x, 0.95, d.z - 0.05);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            screenMesh.setMatrixAt(i, dummy.matrix);
            anyChange = true;
          }
          if (d.visible) visCount++;
        }
        if (anyChange) {
          bodyMesh.instanceMatrix.needsUpdate = true;
          screenMesh.instanceMatrix.needsUpdate = true;
        }
        setCount(Math.min(TOTAL, 25 + visCount));
      }

      // ─── Phase 4: HOLD ──────────────────────────
      else {
        setPhase('hold');
        setMidOpacity(0);
        bodyMesh.visible = true;
        screenMesh.visible = true;
        setCount(TOTAL);
      }

      // ─── Reset for new loop ─────────────────────
      // We avoid the hard "blink" reset of the previous version by only
      // resetting state that matters when the timeline wraps.
      if (time < 0.05 && elapsed > TOTAL_T * 0.5) {
        // Hide all far instances by zeroing their scale
        for (let i = 0; i < TOTAL; i++) {
          farData[i].visible = false;
          dummy.position.set(farData[i].x, 0.35, farData[i].z);
          dummy.scale.set(0, 0, 0); dummy.updateMatrix();
          bodyMesh.setMatrixAt(i, dummy.matrix);
          dummy.position.set(farData[i].x, 0.95, farData[i].z - 0.05);
          dummy.scale.set(0, 0, 0); dummy.updateMatrix();
          screenMesh.setMatrixAt(i, dummy.matrix);
        }
        bodyMesh.instanceMatrix.needsUpdate = true;
        screenMesh.instanceMatrix.needsUpdate = true;
      }

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
      composer.dispose();
      disposeScene(scene, renderer);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {/* Phase HUD top-left */}
      <div style={{
        position: 'absolute', top: 14, left: 16,
        background: 'rgba(13,13,26,0.75)',
        border: '1px solid rgba(45,163,154,0.35)',
        borderRadius: 8, padding: '6px 12px',
        fontFamily: 'monospace', fontSize: 11, color: '#2da39a',
        pointerEvents: 'none', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: '0.6px' }}>
          {i18n.language === 'en' ? 'SCALE' : 'МАСШТАБ'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
          {phase === 'close' && (i18n.language === 'en' ? '1 station · close-up'  : '1 станция · крупный план')}
          {phase === 'pull'  && (i18n.language === 'en' ? '25 stations · zoom out' : '25 станций · зум аут')}
          {phase === 'far'   && (i18n.language === 'en' ? 'aerial · grid forming'  : 'с высоты · сетка формируется')}
          {phase === 'hold'  && (i18n.language === 'en' ? '1,200 stations · total' : '1 200 станций · итого')}
        </div>
      </div>

      {/* Counter top-right */}
      <div style={{
        position: 'absolute', top: 14, right: 16,
        fontFamily: 'monospace', fontSize: 22,
        color: '#2da39a',
        background: 'rgba(13,13,26,0.85)', padding: '8px 18px',
        borderRadius: 8, border: '1px solid rgba(45,163,154,0.3)',
        fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
      }}>
        {count.toLocaleString(i18n.language === 'en' ? 'en-US' : 'ru-RU')} / 1 200
      </div>

      <div style={{
        position: 'absolute', bottom: 14, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)', fontSize: 12,
        fontFamily: 'var(--font-display)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>{t('creator.s3Title')}</div>
    </div>
  );
}
