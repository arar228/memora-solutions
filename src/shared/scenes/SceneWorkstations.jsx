import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ===================================================================
   ULTRA-DETAILED PC BUILD — all Three.js primitives
   =================================================================== */
function buildPC() {
  const pc = new THREE.Group();
  const M = (c, r = 0.4, m = 0.6, opts = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...opts });

  // ─── CASE SHELL ───────────────────────────────────────
  const cW = 4.5, cH = 9, cD = 8;

  // Right panel (solid)
  addBox(pc, [0.06, cH, cD], M(0x1a1a2e, 0.25, 0.8), [-cW/2, cH/2, 0]);
  // Left panel (tempered glass — transparent)
  const glassMat = M(0x111133, 0.05, 0.95, { transparent: true, opacity: 0.18 });
  addBox(pc, [0.06, cH - 0.4, cD - 0.8], glassMat, [cW/2, cH/2, 0]);
  // Glass frame
  const frameMat = M(0x111122, 0.3, 0.8);
  addBox(pc, [0.08, cH, 0.3], frameMat, [cW/2, cH/2, cD/2 - 0.15]);
  addBox(pc, [0.08, cH, 0.3], frameMat, [cW/2, cH/2, -cD/2 + 0.15]);
  addBox(pc, [0.08, 0.3, cD], frameMat, [cW/2, cH - 0.15, 0]);
  addBox(pc, [0.08, 0.3, cD], frameMat, [cW/2, 0.15, 0]);

  // Top panel with ventilation mesh
  addBox(pc, [cW, 0.06, cD], M(0x1a1a2e, 0.25, 0.8), [0, cH, 0]);
  // Top vent holes
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 3; j++) {
      addBox(pc, [0.15, 0.08, 0.06], M(0x0d0d1a), [-1.2 + j * 0.9, cH + 0.01, -2.5 + i * 0.45]);
    }
  }

  // Bottom panel
  addBox(pc, [cW, 0.06, cD], M(0x111122, 0.3, 0.7), [0, 0, 0]);
  // Feet (4 rubber pads)
  const footMat = M(0x222222, 0.8, 0.1);
  [[-1.5, -3], [-1.5, 3], [1.5, -3], [1.5, 3]].forEach(([x, z]) => {
    addBox(pc, [0.6, 0.15, 0.6], footMat, [x, -0.08, z]);
  });

  // Back panel
  addBox(pc, [cW, cH, 0.06], M(0x151528, 0.3, 0.7), [0, cH/2, -cD/2]);
  // Back I/O cutout
  addBox(pc, [2.8, 1.2, 0.08], M(0x0a0a15), [0, cH - 1, -cD/2 + 0.01]);
  // I/O ports on back
  for (let i = 0; i < 6; i++) {
    const pw = i < 2 ? 0.35 : 0.25;
    const pc2 = i < 2 ? 0x4444ff : (i < 4 ? 0x333355 : 0x225522);
    addBox(pc, [pw, 0.18, 0.06], M(pc2, 0.5, 0.3), [-1 + i * 0.4, cH - 0.7, -cD/2 + 0.05]);
  }
  // PCIe slot covers on back
  for (let i = 0; i < 7; i++) {
    addBox(pc, [0.12, 0.8, 0.06], M(0x222240), [1.6, 2.5 + i * 0.85, -cD/2 + 0.05]);
  }
  // Back exhaust fan hole
  addCylinder(pc, [1.2, 0.06, 24], M(0x0d0d1a), [0, 6, -cD/2 + 0.04], [Math.PI/2, 0, 0]);
  // Exhaust fan grille rings
  [0.4, 0.7, 1.0].forEach(r => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.04, r, 24),
      M(0x2a2a4a, 0.5, 0.5, { side: THREE.DoubleSide })
    );
    ring.position.set(0, 6, -cD/2 + 0.06);
    pc.add(ring);
  });

  // Front panel (mesh style)
  addBox(pc, [cW, cH * 0.65, 0.1], M(0x0d0d1a, 0.7, 0.2), [0, cH * 0.35, cD/2]);
  // Front mesh ventilation (fine grid)
  for (let i = 0; i < 20; i++) {
    addBox(pc, [3.5, 0.03, 0.12], M(0x1a1a30), [0, 1 + i * 0.27, cD/2 + 0.01]);
  }
  // Front top solid section
  addBox(pc, [cW, cH * 0.35, 0.12], M(0x111125, 0.3, 0.6), [0, cH * 0.825, cD/2]);

  // Power button
  addCylinder(pc, [0.2, 0.08, 20], M(0x333355), [0, cH - 0.5, cD/2 + 0.08], [Math.PI/2, 0, 0]);
  // Power LED ring
  const pwrRing = new THREE.Mesh(
    new THREE.RingGeometry(0.15, 0.22, 20),
    new THREE.MeshBasicMaterial({ color: 0x2da39a, side: THREE.DoubleSide })
  );
  pwrRing.position.set(0, cH - 0.5, cD/2 + 0.1);
  pwrRing.userData.isLED = true;
  pc.add(pwrRing);

  // Front USB-C & USB-A ports
  addBox(pc, [0.25, 0.12, 0.06], M(0x333355), [-0.3, cH - 1.1, cD/2 + 0.08]);
  addBox(pc, [0.25, 0.12, 0.06], M(0x333355), [0.3, cH - 1.1, cD/2 + 0.08]);
  // Audio jack
  addCylinder(pc, [0.06, 0.06, 12], M(0x228822), [0, cH - 1.4, cD/2 + 0.08], [Math.PI/2, 0, 0]);

  // ─── PSU SHROUD (bottom separator) ──────────────────
  addBox(pc, [cW - 0.2, 0.06, cD - 0.2], M(0x15152a, 0.3, 0.6), [0, 2.2, 0]);
  // PSU shroud front vent
  addCylinder(pc, [0.8, 0.08, 20], M(0x0d0d1a), [0, 1.1, cD/2 - 0.5], [Math.PI/2, 0, 0]);

  // ─── MOTHERBOARD ──────────────────────────────────────
  const mbW = 3.5, mbH = 6.5, mbThk = 0.12;
  addBox(pc, [mbThk, mbH, cD - 1.5], M(0x0a2818, 0.6, 0.2), [-cW/2 + 0.5, 2.2 + mbH/2, -0.2]);

  // PCB traces (horizontal lines on MB)
  const traceMat = new THREE.LineBasicMaterial({ color: 0x1a5a30, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 15; i++) {
    const y = 2.8 + i * 0.4;
    const pts = [
      new THREE.Vector3(-cW/2 + 0.58, y, -2.5 + Math.random()),
      new THREE.Vector3(-cW/2 + 0.58, y, 1 + Math.random() * 2)
    ];
    pc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), traceMat));
  }

  // Chipset heatsink (south bridge)
  addBox(pc, [0.3, 0.8, 0.8], M(0x555577, 0.2, 0.7), [-cW/2 + 0.7, 3.5, 1.5]);
  // VRM heatsinks (top of MB)
  addBox(pc, [0.25, 0.5, 3], M(0x444466, 0.2, 0.7), [-cW/2 + 0.65, 8.2, -0.5]);
  addBox(pc, [0.25, 2.5, 0.4], M(0x444466, 0.2, 0.7), [-cW/2 + 0.65, 7.2, -2.8]);

  // DIMM slots (4)
  for (let i = 0; i < 4; i++) {
    addBox(pc, [0.04, 2.5, 0.08], M(0x222222), [-cW/2 + 0.58, 6.5, -1.5 + i * 0.22]);
  }
  // PCIe x16 slot
  addBox(pc, [0.04, 0.12, 2.5], M(0x222222), [-cW/2 + 0.58, 4.8, 0]);
  // PCIe x1 slots
  addBox(pc, [0.04, 0.1, 0.8], M(0x222222), [-cW/2 + 0.58, 4.0, 0]);
  addBox(pc, [0.04, 0.1, 0.8], M(0x222222), [-cW/2 + 0.58, 3.2, 0]);

  // CPU socket outline
  addBox(pc, [0.05, 0.9, 0.9], M(0x333333, 0.5, 0.3), [-cW/2 + 0.57, 7, -1]);
  // 24-pin ATX connector
  addBox(pc, [0.2, 0.5, 0.6], M(0x222222), [-cW/2 + 0.55, 6, 2.5]);

  // SATA ports
  for (let i = 0; i < 4; i++) {
    addBox(pc, [0.15, 0.08, 0.2], M(0x222244), [-cW/2 + 0.55, 3, 2 + i * 0.3]);
  }

  // ─── CPU (IHS) ────────────────────────────────────────
  addBox(pc, [0.15, 0.7, 0.7], M(0xaaaaaa, 0.15, 0.9), [-cW/2 + 0.75, 7, -1]);
  // CPU IHS text-like detail
  addBox(pc, [0.02, 0.15, 0.4], M(0x888888, 0.2, 0.8), [-cW/2 + 0.85, 7.15, -1]);

  // ─── CPU TOWER COOLER ─────────────────────────────────
  const coolerX = -cW/2 + 1.6;
  // Heatpipes (4 copper pipes)
  const pipeMat = M(0xcc7733, 0.2, 0.8);
  for (let i = 0; i < 4; i++) {
    addCylinder(pc, [0.06, 2.8, 8], pipeMat, [coolerX, 7, -1.3 + i * 0.2]);
  }
  // Heatsink fin stack
  for (let i = 0; i < 18; i++) {
    addBox(pc, [1.4, 0.03, 1.6], M(0x888899, 0.25, 0.7), [coolerX, 6.0 + i * 0.12, -1]);
  }
  // Cooler top
  addBox(pc, [1.4, 0.08, 1.6], M(0x333355, 0.3, 0.6), [coolerX, 8.2, -1]);
  // Cooler fan (120mm on the side)
  const fanFrame = M(0x1a1a30, 0.4, 0.5);
  addBox(pc, [0.12, 1.8, 1.8], fanFrame, [coolerX + 0.85, 7.2, -1]);
  // Fan hub
  addCylinder(pc, [0.25, 0.14, 16], M(0x222244), [coolerX + 0.92, 7.2, -1], [0, 0, Math.PI/2]);
  // Fan blades
  for (let b = 0; b < 7; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.7, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x4444aa, transparent: true, opacity: 0.6 })
    );
    blade.position.set(coolerX + 0.93, 7.2, -1);
    blade.rotation.x = (b / 7) * Math.PI * 2;
    blade.userData.isFanBlade = true;
    blade.userData.fanCenter = [coolerX + 0.93, 7.2, -1];
    pc.add(blade);
  }

  // ─── GPU (RTX-style dual-fan) ─────────────────────────
  const gpuY = 4.6, gpuZ = 0;
  // GPU PCB
  addBox(pc, [0.08, 0.15, 4.5], M(0x0a2818, 0.6, 0.2), [-cW/2 + 0.58, gpuY + 0.35, gpuZ]);
  // GPU shroud (main body)
  addBox(pc, [1.0, 0.5, 4.5], M(0x1a1a2e, 0.25, 0.7), [coolerX - 0.2, gpuY, gpuZ]);
  // GPU shroud accent lines
  addBox(pc, [1.02, 0.04, 4.52], M(0x333355), [coolerX - 0.2, gpuY + 0.26, gpuZ]);
  addBox(pc, [1.02, 0.04, 4.52], M(0x333355), [coolerX - 0.2, gpuY - 0.26, gpuZ]);
  // GPU backplate
  addBox(pc, [0.04, 0.04, 4.5], M(0x222240, 0.3, 0.7), [-cW/2 + 0.6, gpuY + 0.42, gpuZ]);
  addBox(pc, [1.0, 0.04, 4.5], M(0x15152a, 0.3, 0.7), [coolerX - 0.2, gpuY - 0.28, gpuZ]);

  // GPU fans (2x)
  [-1.1, 1.1].forEach(fz => {
    // Fan cutout
    addCylinder(pc, [0.6, 0.06, 20], M(0x0d0d1a), [coolerX - 0.2, gpuY + 0.26, gpuZ + fz], [Math.PI/2, 0, 0]);
    // Fan ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 20),
      M(0x333355, 0.4, 0.5, { side: THREE.DoubleSide })
    );
    ring.position.set(coolerX - 0.2, gpuY + 0.27, gpuZ + fz);
    pc.add(ring);
    // Fan blades
    for (let b = 0; b < 9; b++) {
      const fb = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.45, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.5 })
      );
      fb.position.set(coolerX - 0.2, gpuY + 0.27, gpuZ + fz);
      fb.rotation.z = (b / 9) * Math.PI * 2;
      fb.userData.isFanBlade = true;
      fb.userData.fanCenter = [coolerX - 0.2, gpuY + 0.27, gpuZ + fz];
      pc.add(fb);
    }
  });

  // GPU power connectors
  addBox(pc, [0.3, 0.2, 0.15], M(0x222222), [coolerX - 0.2, gpuY + 0.42, gpuZ + 1.8]);
  addBox(pc, [0.3, 0.2, 0.15], M(0x222222), [coolerX - 0.2, gpuY + 0.42, gpuZ + 2.2]);

  // GPU display ports on bracket
  for (let i = 0; i < 3; i++) {
    addBox(pc, [0.12, 0.15, 0.2], M(0x222244), [1.6, gpuY + 0.1 - i * 0.2, -cD/2 + 0.06]);
  }
  // HDMI port
  addBox(pc, [0.14, 0.1, 0.25], M(0x222222), [1.6, gpuY - 0.5, -cD/2 + 0.06]);

  // GPU RGB strip
  const gpuLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.06, 4),
    new THREE.MeshBasicMaterial({ color: 0x6B4FA0 })
  );
  gpuLed.position.set(coolerX + 0.32, gpuY + 0.1, gpuZ);
  gpuLed.userData.isLED = true;
  gpuLed.userData.ledHue = 0.75;
  pc.add(gpuLed);

  // ─── RAM (4 sticks with heatspreaders) ────────────────
  for (let i = 0; i < 4; i++) {
    const rz = -1.5 + i * 0.22;
    const rColor = i < 2 ? 0x2da39a : 0x6B4FA0;
    // PCB
    addBox(pc, [0.04, 2.2, 0.12], M(0x0a2818, 0.6, 0.2), [-cW/2 + 0.58, 6.5, rz]);
    // Heatspreader
    addBox(pc, [0.12, 2.2, 0.14], M(0x222240, 0.25, 0.7), [-cW/2 + 0.7, 6.5, rz]);
    // Heatspreader top (angular)
    addBox(pc, [0.12, 0.08, 0.14], M(rColor, 0.3, 0.6), [-cW/2 + 0.7, 7.65, rz]);
    // RGB top strip
    const ramLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.04, 0.15),
      new THREE.MeshBasicMaterial({ color: rColor })
    );
    ramLed.position.set(-cW/2 + 0.7, 7.7, rz);
    ramLed.userData.isLED = true;
    ramLed.userData.ledHue = i < 2 ? 0.48 : 0.75;
    pc.add(ramLed);
  }

  // ─── PSU ──────────────────────────────────────────────
  addBox(pc, [3.5, 1.6, 3.2], M(0x0d0d18, 0.4, 0.5), [0, 0.9, -1.5]);
  // PSU label
  addBox(pc, [0.5, 0.8, 0.02], M(0x1a1a30), [0, 0.9, 0.12]);
  // PSU fan (bottom intake)
  addCylinder(pc, [0.9, 0.06, 20], M(0x0a0a15), [0, 0.08, -1.5], [Math.PI/2, 0, 0]);
  // PSU fan grille
  [0.3, 0.55, 0.8].forEach(r => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.03, r, 20),
      M(0x2a2a4a, 0.5, 0.5, { side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.09, -1.5);
    pc.add(ring);
  });
  // PSU modular sockets (back)
  for (let i = 0; i < 4; i++) {
    addBox(pc, [0.4, 0.25, 0.06], M(0x222222), [-0.9 + i * 0.6, 1.2, -3.1]);
  }

  // ─── SSDs (M.2 on MB + 2.5" in shroud) ───────────────
  // M.2 SSD on motherboard
  addBox(pc, [0.04, 0.12, 1.4], M(0x1a1a30, 0.4, 0.5), [-cW/2 + 0.6, 5.5, 1.5]);
  addBox(pc, [0.04, 0.1, 0.12], M(0x2da39a, 0.3, 0.5), [-cW/2 + 0.6, 5.5, 0.85]); // M.2 heatsink
  // 2.5" SSD in PSU shroud
  addBox(pc, [0.8, 0.15, 1.3], M(0x1a1a30, 0.4, 0.5), [-1.2, 2.0, 2]);
  addBox(pc, [0.25, 0.16, 0.08], M(0x333355), [-1.2, 2.0, 1.35]); // SATA connector

  // ─── FRONT FANS (2x 140mm with RGB rings) ─────────────
  [3.5, 6].forEach(fy => {
    // Fan frame
    addBox(pc, [3.2, 2.2, 0.12], fanFrame, [0, fy, cD/2 - 0.3]);
    // Fan hub
    addCylinder(pc, [0.2, 0.14, 16], M(0x222244), [0, fy, cD/2 - 0.24], [Math.PI/2, 0, 0]);
    // Fan blades
    for (let b = 0; b < 7; b++) {
      const fb = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.8, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x4444aa, transparent: true, opacity: 0.4 })
      );
      fb.position.set(0, fy, cD/2 - 0.23);
      fb.rotation.z = (b / 7) * Math.PI * 2;
      fb.userData.isFanBlade = true;
      fb.userData.fanCenter = [0, fy, cD/2 - 0.23];
      pc.add(fb);
    }
    // RGB ring
    const rgbRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 32),
      new THREE.MeshBasicMaterial({ color: 0x2da39a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    rgbRing.position.set(0, fy, cD/2 - 0.22);
    rgbRing.userData.isLED = true;
    rgbRing.userData.ledHue = 0.48;
    pc.add(rgbRing);
  });

  // ─── REAR FAN (120mm) ─────────────────────────────────
  addBox(pc, [2, 2, 0.12], fanFrame, [0, 6, -cD/2 + 0.2]);
  for (let b = 0; b < 7; b++) {
    const fb = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.7, 0.04),
      new THREE.MeshBasicMaterial({ color: 0x4444aa, transparent: true, opacity: 0.4 })
    );
    fb.position.set(0, 6, -cD/2 + 0.22);
    fb.rotation.z = (b / 7) * Math.PI * 2;
    fb.userData.isFanBlade = true;
    fb.userData.fanCenter = [0, 6, -cD/2 + 0.22];
    pc.add(fb);
  }

  // ─── CABLES ───────────────────────────────────────────
  const cableMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 1 });
  const cableAccent = new THREE.LineBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.6 });
  // 24-pin from PSU to MB
  addCable(pc, [0.5, 1.8, -1], [0.5, 3, 1], [-cW/2 + 0.55, 6, 2.5], cableMat);
  // CPU 8-pin
  addCable(pc, [0.3, 1.8, -0.5], [0.3, 5, -2], [-cW/2 + 0.55, 8, -2], cableAccent);
  // GPU power
  addCable(pc, [0.8, 1.8, -1], [1, 3, 0], [coolerX - 0.2, gpuY + 0.42, gpuZ + 2], cableMat);

  // ─── BOTTOM LED STRIP ─────────────────────────────────
  const ledStrip = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.05, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x2da39a })
  );
  ledStrip.position.set(0, 0.12, cD/2 - 0.15);
  ledStrip.userData.isLED = true;
  ledStrip.userData.ledHue = 0.48;
  pc.add(ledStrip);

  return pc;
}

function addBox(parent, size, mat, pos, rot) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}
function addCylinder(parent, args, mat, pos, rot) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(...args), mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  parent.add(m);
  return m;
}
function addCable(parent, a, mid, b, mat) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...a), new THREE.Vector3(...mid), new THREE.Vector3(...b)
  );
  parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)), mat));
}

// Component labels for assembly UI
const COMP_LABELS = [
  'Корпус', 'Материнская плата', 'Процессор',
  'Система охлаждения', 'Видеокарта', 'Оперативная память',
  'Блок питания', 'Накопители', 'Подключение кабелей'
];

export default function SceneWorkstations() {
  const mountRef = useRef(null);
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.003);

    const camera = new THREE.PerspectiveCamera(35, W / H, 0.5, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x4444aa, 0.4));
    const dL = new THREE.DirectionalLight(0xffffff, 0.9);
    dL.position.set(10, 20, 15); dL.castShadow = true;
    scene.add(dL);
    scene.add(new THREE.DirectionalLight(0x2da39a, 0.25).position.set(-10, 5, -10) && new THREE.DirectionalLight(0x2da39a, 0.25));
    const pL = new THREE.PointLight(0x2da39a, 0.5, 20);
    pL.position.set(0, 2, 4); scene.add(pL);

    // Floor
    scene.add(new THREE.GridHelper(300, 60, 0x1a1a3a, 0x0f0f20));
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.2;
    floor.receiveShadow = true; scene.add(floor);

    // Build detailed PC
    const pcModel = buildPC();
    scene.add(pcModel);

    // Collect parts for assembly animation
    const pcParts = [];
    pcModel.traverse(child => {
      if (child.isMesh || child.isLine || child.isLineSegments) {
        const orig = child.position.clone();
        const scatter = new THREE.Vector3(
          (Math.random() - 0.5) * 35,
          12 + Math.random() * 25,
          (Math.random() - 0.5) * 35
        );
        child.userData.origPos = orig;
        child.userData.scatterPos = scatter;
        child.position.copy(scatter);
        child.userData.assembled = false;
        pcParts.push(child);
      }
    });

    // Instanced mesh for 1200 PCs (Phase 2)
    const TOTAL = 1200;
    const instGeo = new THREE.BoxGeometry(1, 2, 1.8);
    const instMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x2da39a, emissiveIntensity: 0 });
    const instMesh = new THREE.InstancedMesh(instGeo, instMat, TOTAL);
    instMesh.visible = false; scene.add(instMesh);

    const cols = 40, spX = 2.5, spZ = 2.2;
    const pcData = [], dummy = new THREE.Object3D();
    const bCol = new THREE.Color(0x1a1a2e), fCol = new THREE.Color(0x2da39a);
    for (let i = 0; i < TOTAL; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = (col - cols / 2) * spX, z = (row - 15) * spZ;
      pcData.push({ x, z, delay: col * 0.04 + row * 0.04 + Math.random() * 0.06, visible: false, flashT: 0 });
      dummy.position.set(x, 1, z); dummy.scale.set(0, 0, 0); dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix); instMesh.setColorAt(i, bCol);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    instMesh.instanceColor.needsUpdate = true;

    // Animation
    const clock = new THREE.Clock();
    let animId, isVisible = false;
    const ASSEMBLE = 8, TRANSITION = 3, SPAWN = 7, HOLD = 3;
    const LOOP = ASSEMBLE + TRANSITION + SPAWN + HOLD;
    const T1 = ASSEMBLE, T2 = T1 + TRANSITION, T3 = T2 + SPAWN;

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;

    const camA = { p: new THREE.Vector3(8, 8, 14), l: new THREE.Vector3(0, 4, 0) };
    const camB = { p: new THREE.Vector3(0, 120, 160), l: new THREE.Vector3(0, 0, 0) };

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;
      const delta = clock.getDelta();
      const time = clock.elapsedTime;
      const t = time % LOOP;

      // Internal light pulse
      pL.intensity = 0.4 + Math.sin(time * 3) * 0.2;

      // === PHASE 1: ASSEMBLY ===
      if (t < T1) {
        const a = t * 0.35, r = 13;
        camera.position.set(Math.sin(a) * r, 5 + Math.sin(t * 0.4) * 3, Math.cos(a) * r);
        camera.lookAt(0, 4, 0);

        pcParts.forEach((p, i) => {
          const d = (i / pcParts.length) * (T1 - 1.5);
          if (t > d) {
            const pr = easeOut(Math.min(1, (t - d) / 1.5));
            p.position.lerpVectors(p.userData.scatterPos, p.userData.origPos, pr);
            p.userData.assembled = pr >= 1;
          } else { p.position.copy(p.userData.scatterPos); }
        });

        // Fan animation
        pcModel.traverse(c => {
          if (c.userData.isFanBlade && c.userData.assembled) {
            c.rotation.z = time * 10 + (c.userData.bladeIndex || 0);
          }
          if (c.userData.isLED) {
            const h = c.userData.ledHue || 0.48;
            c.material.color.setHSL(h, 1, 0.45 + Math.sin(time * 4 + h * 10) * 0.15);
          }
        });

        const phase = Math.min(COMP_LABELS.length - 1, Math.floor(t / (T1 / COMP_LABELS.length)));
        setLabel(COMP_LABELS[phase]);
        pcModel.visible = true; instMesh.visible = false; setCount(0);
      }

      // === PHASE 2: TRANSITION ===
      if (t >= T1 && t < T2) {
        const p = easeIO((t - T1) / TRANSITION);
        camera.position.lerpVectors(camA.p, camB.p, p);
        camera.lookAt(
          THREE.MathUtils.lerp(0, 0, p),
          THREE.MathUtils.lerp(4, 0, p),
          THREE.MathUtils.lerp(0, 0, p)
        );
        if (p > 0.5) {
          pcModel.visible = false; instMesh.visible = true;
          dummy.position.set(0, 1, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
          instMesh.setMatrixAt(0, dummy.matrix); instMesh.setColorAt(0, fCol);
          pcData[0].visible = true;
          instMesh.instanceMatrix.needsUpdate = true; instMesh.instanceColor.needsUpdate = true;
        }
        setLabel('');
      }

      // === PHASE 3: SPAWN 1200 ===
      if (t >= T2 && t < T3) {
        camera.position.copy(camB.p); camera.lookAt(camB.l);
        pcModel.visible = false; instMesh.visible = true;
        const st = t - T2;
        let vis = 0, mu = false, cu = false;
        const cObj = new THREE.Color();
        for (let i = 0; i < TOTAL; i++) {
          const d = pcData[i];
          if (!d.visible && st > d.delay) {
            d.visible = true; d.flashT = 1;
            dummy.position.set(d.x, 1, d.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
            instMesh.setMatrixAt(i, dummy.matrix); mu = true;
          }
          if (d.visible) {
            vis++;
            if (d.flashT > 0) {
              d.flashT -= delta * 3; if (d.flashT < 0) d.flashT = 0;
              cObj.copy(bCol).lerp(fCol, d.flashT);
              instMesh.setColorAt(i, cObj); cu = true;
            }
          }
        }
        if (mu) instMesh.instanceMatrix.needsUpdate = true;
        if (cu) instMesh.instanceColor.needsUpdate = true;
        setCount(vis);
      }

      // === PHASE 4: HOLD ===
      if (t >= T3) {
        camera.position.copy(camB.p); camera.lookAt(camB.l);
        setCount(TOTAL);
      }

      // Reset
      if (t < 0.05) {
        pcData.forEach((d, i) => {
          d.visible = false; d.flashT = 0;
          dummy.scale.set(0, 0, 0); dummy.position.set(d.x, 1, d.z); dummy.updateMatrix();
          instMesh.setMatrixAt(i, dummy.matrix); instMesh.setColorAt(i, bCol);
        });
        instMesh.instanceMatrix.needsUpdate = true; instMesh.instanceColor.needsUpdate = true;
        pcModel.visible = true; instMesh.visible = false;
        pcParts.forEach(p => p.position.copy(p.userData.scatterPos));
      }

      renderer.render(scene, camera);
    };

    const obs = new IntersectionObserver(([e]) => {
      isVisible = e.isIntersecting; if (isVisible) clock.getDelta();
    }, { threshold: 0.3 });
    obs.observe(el); tick();

    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId); obs.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {label && (
        <div style={{
          position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(13,13,26,0.92)', border: '1px solid rgba(45,163,154,0.4)',
          borderRadius: '10px', padding: '10px 24px', color: '#2da39a', fontSize: 14,
          fontWeight: 600, fontFamily: 'var(--font-display)', backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(45,163,154,0.12)',
          animation: 'lFade 0.3s ease-out'
        }}>🔧 {label}</div>
      )}
      {count > 0 && (
        <div style={{
          position: 'absolute', top: 20, right: 20, fontFamily: 'monospace', fontSize: 20,
          color: '#2da39a', background: 'rgba(13,13,26,0.85)', padding: '8px 18px',
          borderRadius: '8px', border: '1px solid rgba(45,163,154,0.3)', fontWeight: 'bold',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>{count} / 1200</div>
      )}
      <style>{`@keyframes lFade{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}
