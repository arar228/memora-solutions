import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* =========================================================
   WHITE GAMING PC — matching reference: white case, glass,
   RGB ring fans, dark internals, glowing RAM, RTX GPU
   ========================================================= */
function buildPC() {
  const pc = new THREE.Group();

  // Helpers
  const box = (s, c, r = 0.4, m = 0.5, o = {}) => {
    const geo = new THREE.BoxGeometry(...s);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...o });
    return new THREE.Mesh(geo, mat);
  };
  const place = (mesh, x, y, z) => { mesh.position.set(x, y, z); pc.add(mesh); return mesh; };

  const W = 4.5, H = 9.5, D = 8.5; // case dimensions

  // ────── WHITE CASE PANELS ──────
  const white = 0xeeeef0;
  // Right side (solid white)
  place(box([0.08, H, D], white, 0.5, 0.3), -W/2, H/2, 0);
  // Top panel (white)
  place(box([W, 0.08, D], white, 0.5, 0.3), 0, H, 0);
  // Bottom panel
  place(box([W, 0.08, D], 0xdddde0, 0.5, 0.3), 0, 0, 0);
  // Back panel (white)
  place(box([W, H, 0.08], white, 0.5, 0.3), 0, H/2, -D/2);
  // Front panel (white, with cutouts for fans)
  place(box([W, H * 0.3, 0.1], white, 0.5, 0.3), 0, H * 0.85, D/2);
  place(box([0.6, H * 0.7, 0.1], white, 0.5, 0.3), -W/2 + 0.3, H * 0.35, D/2);
  place(box([0.6, H * 0.7, 0.1], white, 0.5, 0.3), W/2 - 0.3, H * 0.35, D/2);

  // ────── TEMPERED GLASS (left panel) ──────
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, H - 0.3, D - 0.6),
    new THREE.MeshPhysicalMaterial({
      color: 0x222233, transparent: true, opacity: 0.15,
      roughness: 0.05, metalness: 0.9,
      clearcoat: 1.0, clearcoatRoughness: 0.05
    })
  );
  place(glass, W/2, H/2, 0);

  // Glass frame (dark trim)
  const ft = 0x333340;
  place(box([0.1, H, 0.2], ft, 0.3, 0.7), W/2, H/2, D/2 - 0.1);
  place(box([0.1, H, 0.2], ft, 0.3, 0.7), W/2, H/2, -D/2 + 0.1);
  place(box([0.1, 0.2, D], ft, 0.3, 0.7), W/2, H - 0.1, 0);
  place(box([0.1, 0.2, D], ft, 0.3, 0.7), W/2, 0.1, 0);

  // ────── CASE FEET (4 rubber) ──────
  [[-1.5, -3.5], [-1.5, 3.5], [1.5, -3.5], [1.5, 3.5]].forEach(([x, z]) => {
    place(box([0.5, 0.2, 0.5], 0x333340, 0.8, 0.1), x, -0.1, z);
  });

  // ────── PSU SHROUD (bottom separator) ──────
  place(box([W - 0.3, 0.06, D - 0.3], 0x222230, 0.3, 0.6), 0, 2.3, 0);
  // PSU shroud front
  place(box([W - 0.3, 2.2, 0.08], 0x222230, 0.3, 0.6), 0, 1.15, D/2 - 0.2);

  // ────── MOTHERBOARD (ATX, dark, ultra-detailed) ──────
  const mbX = -W/2 + 0.6;
  // Main PCB
  place(box([0.1, 6.5, D - 1.5], 0x1a1a22, 0.7, 0.2), mbX, 2.3 + 3.25, -0.2);

  // PCB traces (dense grid)
  const traceMat = new THREE.LineBasicMaterial({ color: 0x2a3a2a, transparent: true, opacity: 0.4 });
  const traceHL = new THREE.LineBasicMaterial({ color: 0x3a5a3a, transparent: true, opacity: 0.3 });
  for (let i = 0; i < 25; i++) {
    const y = 2.8 + i * 0.25;
    const pts = [new THREE.Vector3(mbX + 0.06, y, -3 + Math.random() * 0.5), new THREE.Vector3(mbX + 0.06, y, 2.5 + Math.random() * 1.5)];
    pc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), i % 3 === 0 ? traceHL : traceMat));
  }
  // Vertical traces
  for (let i = 0; i < 12; i++) {
    const z = -3 + i * 0.55;
    const pts = [new THREE.Vector3(mbX + 0.06, 2.5, z), new THREE.Vector3(mbX + 0.06, 8.8, z)];
    pc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), traceMat));
  }

  // SMD capacitors (tiny cylinders scattered on MB)
  const capMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.4 });
  const capGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8);
  [[6, -2.5],[6.3, -2.5],[6.6, -2.5],[6, -2.2],[6.3, -2.2],[6.6, -2.2],
   [8, 1],[8, 1.3],[8, 1.6],[8.3, 1],[8.3, 1.3],
   [5, 2],[5.3, 2],[5.6, 2],[5, 2.3],[5.3, 2.3]].forEach(([y, z]) => {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.rotation.z = Math.PI / 2;
    place(cap, mbX + 0.12, y, z);
  });

  // Larger electrolytic capacitors (near VRM)
  const bigCapMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, metalness: 0.3 });
  [[-3.5, 8.2], [-3.2, 8.2], [-2.9, 8.2], [-2.6, 8.2]].forEach(([z, y]) => {
    const bc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 10), bigCapMat);
    bc.rotation.z = Math.PI / 2;
    place(bc, mbX + 0.15, y, z);
  });

  // IC chips (small rectangles on board)
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.6 });
  [[3.5, 0.5], [4.2, -1], [5.5, 2.5], [4, 3], [7.5, 2]].forEach(([y, z]) => {
    place(box([0.04, 0.15, 0.2], 0x0a0a0a, 0.3, 0.6), mbX + 0.1, y, z);
  });

  // VRM heatsinks (top of MB — with fin detail)
  const vrmMat = { r: 0.2, m: 0.7 };
  place(box([0.25, 0.6, 3.5], 0x3a3a4a, vrmMat.r, vrmMat.m), mbX + 0.2, 8.5, 0);
  // VRM fins
  for (let i = 0; i < 8; i++) {
    place(box([0.27, 0.02, 3.5], 0x444455), mbX + 0.2, 8.25 + i * 0.07, 0);
  }
  // Left VRM block
  place(box([0.25, 3, 0.4], 0x3a3a4a, vrmMat.r, vrmMat.m), mbX + 0.2, 7, -3.2);
  for (let i = 0; i < 7; i++) {
    place(box([0.27, 3, 0.02], 0x444455), mbX + 0.2, 7, -3.05 - i * 0.05);
  }

  // Chipset heatsink (with decorative lines)
  place(box([0.3, 0.8, 0.8], 0x444455, 0.2, 0.7), mbX + 0.25, 3.8, 1.5);
  place(box([0.32, 0.02, 0.82], 0x555566), mbX + 0.25, 3.95, 1.5);
  place(box([0.32, 0.02, 0.82], 0x555566), mbX + 0.25, 3.65, 1.5);
  // Chipset logo (tiny glowing square)
  const chipLogo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: 0x6B4FA0 }));
  place(chipLogo, mbX + 0.42, 3.8, 1.5);
  chipLogo.userData.isLED = true; chipLogo.userData.ledHue = 0.75;

  // CPU socket (detailed)
  place(box([0.06, 1, 1], 0x333333, 0.5, 0.3), mbX + 0.08, 7, -0.8);
  // Socket pins area (lighter square inside)
  place(box([0.02, 0.7, 0.7], 0x555555, 0.4, 0.4), mbX + 0.1, 7, -0.8);
  // Socket retention bracket
  place(box([0.04, 0.06, 1.1], 0x888888, 0.3, 0.7), mbX + 0.1, 7.52, -0.8);
  place(box([0.04, 0.06, 1.1], 0x888888, 0.3, 0.7), mbX + 0.1, 6.48, -0.8);

  // DIMM slot latches (at ends of RAM slots)
  for (let i = 0; i < 4; i++) {
    const rz = -0.3 + i * 0.22;
    place(box([0.06, 0.08, 0.04], 0xeeeeee), mbX + 0.1, 5.3, rz);
    place(box([0.06, 0.08, 0.04], 0xeeeeee), mbX + 0.1, 7.7, rz);
  }

  // 24-pin ATX connector (detailed with visible pins)
  place(box([0.2, 0.6, 0.5], 0x222222, 0.5, 0.3), mbX + 0.15, 6, 3);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 12; c++) {
      place(box([0.02, 0.02, 0.02], 0xccaa00, 0.3, 0.8), mbX + 0.1 + r * 0.08, 5.75 + c * 0.04, 3);
    }
  }

  // CMOS battery
  const cmos = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 }));
  cmos.rotation.z = Math.PI / 2;
  place(cmos, mbX + 0.12, 4.5, -2.5);

  // Audio chip with shield
  place(box([0.12, 0.5, 0.8], 0x111111, 0.4, 0.5), mbX + 0.15, 3, -2.5);
  // Audio chip divider line on PCB
  const audioLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(mbX + 0.06, 2.5, -1.8),
      new THREE.Vector3(mbX + 0.06, 4, -1.8)
    ]),
    new THREE.LineBasicMaterial({ color: 0xdddd00, transparent: true, opacity: 0.3 })
  );
  pc.add(audioLine);

  // Front panel header (with individual pins)
  place(box([0.1, 0.15, 0.3], 0x222222), mbX + 0.1, 2.8, 3.2);
  for (let p = 0; p < 9; p++) {
    place(box([0.01, 0.01, 0.08], 0xccaa00, 0.3, 0.8), mbX + 0.08, 2.75 + p * 0.03, 3.2);
  }

  // SATA ports (angled, with colored accent)
  for (let i = 0; i < 6; i++) {
    place(box([0.15, 0.08, 0.2], i < 2 ? 0x444488 : 0x222244), mbX + 0.1, 3 + i * 0.2, 3.5);
  }

  // USB 3.0 internal header (blue)
  place(box([0.12, 0.15, 0.45], 0x2244aa, 0.4, 0.5), mbX + 0.12, 5, 2.5);
  // USB 3.0 pins
  for (let p = 0; p < 10; p++) {
    place(box([0.01, 0.01, 0.06], 0xccaa00, 0.3, 0.8), mbX + 0.08, 4.94 + p * 0.012, 2.5);
  }

  // USB-C internal header
  place(box([0.1, 0.08, 0.25], 0x333344, 0.4, 0.5), mbX + 0.12, 4.7, 2.8);

  // RGB header (4-pin with glow)
  place(box([0.06, 0.1, 0.15], 0x222222), mbX + 0.1, 8.8, 2);
  const rgbHdr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xff00ff }));
  place(rgbHdr, mbX + 0.15, 8.82, 2);
  rgbHdr.userData.isRGBRing = true; rgbHdr.userData.rgbSpeed = 3; rgbHdr.userData.rgbOffset = 0;

  // ARGB header
  place(box([0.06, 0.06, 0.12], 0x222222), mbX + 0.1, 8.8, 2.5);
  const argbHdr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
  place(argbHdr, mbX + 0.15, 8.82, 2.5);
  argbHdr.userData.isRGBRing = true; argbHdr.userData.rgbSpeed = 2; argbHdr.userData.rgbOffset = 0.5;

  // M.2 slot with heatsink (detailed)
  place(box([0.04, 0.12, 1.4], 0x1a1a30, 0.4, 0.5), mbX + 0.1, 5.5, 1.2);
  // M.2 SSD chip
  place(box([0.04, 0.08, 0.2], 0x0a0a0a, 0.3, 0.6), mbX + 0.11, 5.5, 0.8);
  // M.2 heatsink (with fins)
  place(box([0.15, 0.15, 1.5], 0x444466, 0.2, 0.7), mbX + 0.2, 5.5, 1.2);
  for (let f = 0; f < 6; f++) {
    place(box([0.16, 0.01, 1.5], 0x555577), mbX + 0.2, 5.45 + f * 0.02, 1.2);
  }

  // Second M.2 slot (lower)
  place(box([0.04, 0.12, 1.4], 0x1a1a30, 0.4, 0.5), mbX + 0.1, 4, 1.2);

  // PCIe x16 slot (reinforced, metal)
  place(box([0.04, 0.12, 2.5], 0x111111, 0.5, 0.3), mbX + 0.08, 4.6, 0);
  // PCIe reinforcement
  place(box([0.06, 0.14, 2.5], 0x888888, 0.3, 0.7), mbX + 0.06, 4.6, 0);
  // PCIe x1 slots
  place(box([0.04, 0.08, 0.8], 0x111111), mbX + 0.08, 3.6, -1.5);
  place(box([0.04, 0.08, 0.8], 0x111111), mbX + 0.08, 3, 0);

  // Debug LED display (2-digit segment on corner)
  place(box([0.04, 0.2, 0.3], 0x111111, 0.5, 0.3), mbX + 0.12, 8.6, 3);
  const debugLed = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.15, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xff3300 }));
  place(debugLed, mbX + 0.15, 8.6, 3);
  debugLed.userData.isLED = true; debugLed.userData.ledHue = 0.05;

  // WiFi module + antenna connectors
  place(box([0.08, 0.15, 0.3], 0x1a1a2e, 0.4, 0.5), mbX + 0.12, 8.2, -3.5);
  // Antenna gold connectors
  const antMat = new THREE.MeshStandardMaterial({ color: 0xddaa00, roughness: 0.2, metalness: 0.9 });
  const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), antMat);
  ant1.rotation.z = Math.PI / 2;
  place(ant1, mbX + 0.18, 8.25, -3.6);
  const ant2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), antMat);
  ant2.rotation.z = Math.PI / 2;
  place(ant2, mbX + 0.18, 8.25, -3.4);

  // Additional capacitor rows (power delivery)
  for (let i = 0; i < 12; i++) {
    const cap2 = new THREE.Mesh(capGeo, capMat);
    cap2.rotation.z = Math.PI / 2;
    place(cap2, mbX + 0.12, 7.5 + (i % 6) * 0.12, -2 - Math.floor(i/6) * 0.15);
  }

  // PCB art layer (decorative pattern near audio)
  const artMat = new THREE.LineBasicMaterial({ color: 0x222233, transparent: true, opacity: 0.2 });
  for (let i = 0; i < 5; i++) {
    const aPts = [
      new THREE.Vector3(mbX + 0.06, 2.5 + i * 0.08, -3),
      new THREE.Vector3(mbX + 0.06, 2.5 + i * 0.08, -2.2 + i * 0.1)
    ];
    pc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(aPts), artMat));
  }

  // ────── AIO COOLER PUMP (on CPU) ──────
  const pumpGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24);
  const pump = new THREE.Mesh(pumpGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.2, metalness: 0.8 }));
  pump.rotation.z = Math.PI / 2;
  place(pump, mbX + 0.4, 7, -0.8);

  // Pump RGB ring
  const pumpRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.05, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xff00ff })
  );
  pumpRing.rotation.z = Math.PI / 2;
  pumpRing.position.set(mbX + 0.56, 7, -0.8);
  pumpRing.userData.isRGBRing = true; pumpRing.userData.rgbSpeed = 2;
  pc.add(pumpRing);

  // AIO tubes (two curved tubes going up to top fans)
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.6 });
  [0.2, -0.2].forEach(offset => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(mbX + 0.4, 7.3, -0.8 + offset),
      new THREE.Vector3(mbX + 0.5, 8.5, -1.5 + offset),
      new THREE.Vector3(-0.5, H - 0.3, -2 + offset)
    );
    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.08, 8, false);
    pc.add(new THREE.Mesh(tubeGeo, tubeMat));
  });

  // ────── GPU RTX 5090 (massive, 3.5-slot, ultra-detailed) ──────
  const gpuY = 4.3;
  const gpuX = mbX + 1.2;
  const gpuThick = 1.6; // 3.5-slot thickness
  const gpuLen = 5.5;

  // GPU PCB (green, detailed)
  place(box([0.06, 0.14, gpuLen], 0x0a1a0a, 0.6, 0.2), mbX + 0.08, gpuY + gpuThick/2 + 0.1, 0);
  // PCB traces
  for (let i = 0; i < 12; i++) {
    place(box([0.005, 0.005, gpuLen - 0.4], 0x1a3a1a, 0.5, 0.2), mbX + 0.12, gpuY + gpuThick/2 + 0.05 + i * 0.01, 0);
  }

  // GPU die (big GB202 silicon)
  place(box([0.06, 0.35, 0.35], 0x999999, 0.1, 0.9), mbX + 0.13, gpuY + gpuThick/2 - 0.1, 0);
  // Die substrate (interposer)
  place(box([0.04, 0.5, 0.5], 0x333333, 0.3, 0.6), mbX + 0.15, gpuY + gpuThick/2 - 0.1, 0);
  // Die contact pads (gold)
  place(box([0.02, 0.3, 0.3], 0xccaa44, 0.2, 0.8), mbX + 0.17, gpuY + gpuThick/2 - 0.1, 0);
  // VRAM chips around GPU die (12 chips — GDDR7)
  [[0.4,0.25],[-0.4,0.25],[0.4,-0.25],[-0.4,-0.25],
   [0.25,0.4],[-0.25,0.4],[0.25,-0.4],[-0.25,-0.4],
   [0,0.45],[0,-0.45],[0.45,0],[- 0.45,0]].forEach(([dy, dz]) => {
    place(box([0.02, 0.1, 0.1], 0x111111, 0.3, 0.5), mbX + 0.15, gpuY + gpuThick/2 - 0.1 + dy, dz);
  });

  // Vapor chamber (flat copper plate)
  place(box([0.06, 1.2, gpuLen - 0.6], 0xcc7733, 0.2, 0.8), mbX + 0.22, gpuY + gpuThick/2 - 0.1, 0);

  // GPU heatsink fin stack (massive, 30 rows)
  for (let i = 0; i < 30; i++) {
    place(box([gpuThick - 0.4, 0.015, gpuLen - 0.6], 0x888899, 0.25, 0.6), gpuX, gpuY + i * 0.012, 0);
  }

  // GPU copper heatpipes (7 pipes — massive cooling)
  const gpuPipeMat = new THREE.MeshStandardMaterial({ color: 0xcc7733, roughness: 0.2, metalness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, gpuLen - 0.5, 8), gpuPipeMat);
    pipe.rotation.x = Math.PI / 2;
    place(pipe, gpuX - 0.3 + (i % 3) * 0.15, gpuY + 0.1 + Math.floor(i/3) * 0.12, 0);
  }

  // GPU shroud (massive angular body)
  place(box([gpuThick, 0.18, gpuLen], 0x1a1a2e, 0.25, 0.7), gpuX, gpuY + gpuThick/2 + 0.18, 0);
  place(box([gpuThick, 0.18, gpuLen], 0x15152a, 0.25, 0.7), gpuX, gpuY - gpuThick/2 + 0.18, 0);
  // Side panels of shroud
  place(box([gpuThick, gpuThick * 0.5, 0.06], 0x1a1a2e, 0.25, 0.7), gpuX, gpuY + 0.15, gpuLen/2);
  place(box([gpuThick, gpuThick * 0.5, 0.06], 0x1a1a2e, 0.25, 0.7), gpuX, gpuY + 0.15, -gpuLen/2);

  // Shroud accent strips (geometric lines)
  place(box([gpuThick + 0.02, 0.03, gpuLen + 0.02], 0x333355), gpuX, gpuY + gpuThick/2 + 0.27, 0);
  place(box([gpuThick + 0.02, 0.03, gpuLen + 0.02], 0x333355), gpuX, gpuY - gpuThick/2 + 0.27, 0);
  // V-shaped decorative accent on shroud
  for (let i = 0; i < 10; i++) {
    place(box([0.6 - i * 0.04, 0.015, 0.03], 0x2a2a4a), gpuX + 0.1, gpuY + gpuThick/2 + 0.2, -2 + i * 0.12);
    place(box([0.6 - i * 0.04, 0.015, 0.03], 0x2a2a4a), gpuX + 0.1, gpuY + gpuThick/2 + 0.2, 2.2 - i * 0.12);
  }

  // GPU backplate (with cutout + thermal pad visible)
  place(box([gpuThick, 0.04, gpuLen], 0x15152a, 0.3, 0.7), gpuX, gpuY - gpuThick/2 + 0.15, 0);
  // Backplate thermal pad cutout
  place(box([0.8, 0.05, 2], 0x555555, 0.6, 0.3), gpuX, gpuY - gpuThick/2 + 0.14, 0);
  // Backplate logo depression
  place(box([0.5, 0.045, 0.8], 0x1a1a30), gpuX - 0.2, gpuY - gpuThick/2 + 0.145, -1.5);
  // Backplate screws (6)
  [[-2.2, 0], [-1, 0], [0, 0], [1, 0], [2.2, 0], [0, 0.5]].forEach(([z, xo]) => {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8),
      new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8 }));
    screw.rotation.x = Math.PI / 2;
    place(screw, gpuX + xo, gpuY - gpuThick/2 + 0.135, z);
  });

  // GPU PCIe bracket (tall, 3.5 slots)
  place(box([0.04, gpuThick + 0.5, 0.15], 0x888888, 0.3, 0.7), mbX + 0.08, gpuY + 0.1, -D/2 + 1);
  // Bracket display ports (3x DP + 1x HDMI)
  for (let i = 0; i < 3; i++) {
    place(box([0.12, 0.15, 0.06], 0x222244), mbX + 0.08, gpuY - 0.3 + i * 0.35, -D/2 + 0.5);
  }
  place(box([0.14, 0.1, 0.06], 0x222222), mbX + 0.08, gpuY + 0.75, -D/2 + 0.5);

  // GPU support bracket (anti-sag)
  place(box([0.08, gpuY - 2.3, 0.08], 0x888888, 0.3, 0.7), gpuX + 0.3, (2.3 + gpuY - gpuThick/2) / 2 + 0.4, 1.5);
  place(box([0.4, 0.04, 0.08], 0x888888, 0.3, 0.7), gpuX + 0.15, gpuY - gpuThick/2 + 0.16, 1.5);

  // GPU 3 fans (bigger, more blades)
  [-1.6, 0, 1.6].forEach((fz) => {
    // Fan shroud ring
    const shroudRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.05, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.6 })
    );
    shroudRing.rotation.z = Math.PI / 2;
    place(shroudRing, gpuX, gpuY + gpuThick/2 + 0.2, fz);

    // Fan hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x222244 })
    );
    hub.rotation.z = Math.PI / 2;
    place(hub, gpuX, gpuY + gpuThick/2 + 0.2, fz);

    // Fan blades (11 per fan, like Founders Edition)
    for (let b = 0; b < 11; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.45, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x444477, transparent: true, opacity: 0.2 })
      );
      blade.position.set(gpuX, gpuY + gpuThick/2 + 0.21, fz);
      blade.rotation.z = (b / 11) * Math.PI * 2;
      blade.userData.isFan = true;
      pc.add(blade);
    }
  });

  // GPU side RGB strip (GEFORCE RTX 5090 illumination)
  const gpuRGBStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, gpuLen - 0.5),
    new THREE.MeshBasicMaterial({ color: 0x44ff44 })
  );
  place(gpuRGBStrip, gpuX + gpuThick/2, gpuY + 0.15, 0);
  gpuRGBStrip.userData.isLED = true;

  // "GeForce RTX" text blocks on side
  const txtBlocks = [0,0.15,0.3, 0.55,0.7,0.85, 1.1, 1.35,1.5,1.65,1.8];
  txtBlocks.forEach((tz) => {
    place(box([0.045, 0.1, 0.1], 0x44ff44, 0.3, 0.3), gpuX + gpuThick/2, gpuY + 0.15, -1.5 + tz);
  });

  // "5090" numbers on GPU shroud top
  [0, 0.2, 0.4, 0.6].forEach((tz, i) => {
    const numBlock = new THREE.Mesh(
      new THREE.BoxGeometry(gpuThick * 0.4, 0.015, 0.13),
      new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 })
    );
    place(numBlock, gpuX + 0.1, gpuY + gpuThick/2 + 0.19, 1.5 + tz);
    numBlock.userData.isLED = true;
  });

  // GPU power connectors (12+4 pin 12VHPWR)
  place(box([0.35, 0.25, 0.25], 0x222222, 0.5, 0.3), gpuX, gpuY + gpuThick/2 + 0.25, 2.2);
  // 12VHPWR pin grid (16 pins, 4x4)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      place(box([0.015, 0.015, 0.02], 0xccaa00, 0.3, 0.8), gpuX - 0.08 + r * 0.06, gpuY + gpuThick/2 + 0.18 + c * 0.04, 2.32);
    }
  }

  // ────── RAM (4 sticks, RGB top — teal glow like reference) ──────
  for (let i = 0; i < 4; i++) {
    const rz = -0.3 + i * 0.22;
    // PCB
    place(box([0.03, 2.3, 0.1], 0x0a200a, 0.6, 0.2), mbX + 0.08, 6.5, rz);
    // Heatspreader
    place(box([0.12, 2.3, 0.12], 0x1a1a2e, 0.25, 0.7), mbX + 0.2, 6.5, rz);
    // Top accent
    place(box([0.13, 0.1, 0.13], 0x2a2a3a, 0.3, 0.6), mbX + 0.2, 7.7, rz);
    // RGB LED strip on top (bright teal/green)
    const ramLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.06, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa })
    );
    ramLed.position.set(mbX + 0.2, 7.78, rz);
    ramLed.userData.isLED = true;
    ramLed.userData.ledHue = 0.42;
    pc.add(ramLed);

    // RAM vertical glow lines (like G.Skill TridentZ)
    for (let l = 0; l < 4; l++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, 1.6, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.3 })
      );
      line.position.set(mbX + 0.27, 6.5, rz - 0.04 + l * 0.025);
      line.userData.isLED = true; line.userData.ledHue = 0.42;
      pc.add(line);
    }
  }

  // ────── PSU (bottom, with label) ──────
  place(box([3.5, 1.6, 3.2], 0x111118, 0.5, 0.4), 0, 1, -1.5);
  // PSU label (bronze/gold)
  place(box([0.02, 0.6, 1.5], 0x8B6914, 0.6, 0.3), 1.76, 1, -1.5);
  // PSU fan grille (back)
  [0.3, 0.55, 0.8].forEach(r => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.03, r, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a2a3a, side: THREE.DoubleSide })
    );
    ring.position.set(0, 1, -3.12);
    pc.add(ring);
  });

  // ────── 3 FRONT RGB FANS (visible through glass) ──────
  [2, 4.2, 6.4].forEach((fy, idx) => {
    // Fan frame (dark)
    place(box([0.12, 1.8, 1.8], 0x222230, 0.4, 0.5), W/2 - 0.6, fy, D/2 - 0.8);
    // Fan hub
    const fHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
    );
    fHub.rotation.z = Math.PI / 2;
    place(fHub, W/2 - 0.54, fy, D/2 - 0.8);

    // Fan blades (semi-transparent)
    for (let b = 0; b < 7; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.65, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x888899, transparent: true, opacity: 0.2 })
      );
      blade.position.set(W/2 - 0.53, fy, D/2 - 0.8);
      blade.rotation.z = (b / 7) * Math.PI * 2;
      blade.userData.isFan = true;
      pc.add(blade);
    }

    // RGB RING (the key visual — bright rainbow torus)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(W/2 - 0.53, fy, D/2 - 0.8);
    ring.userData.isRGBRing = true;
    ring.userData.rgbSpeed = 1 + idx * 0.3;
    ring.userData.rgbOffset = idx * 0.33;
    pc.add(ring);

    // Inner glow point light
    const fanLight = new THREE.PointLight(0x00ffff, 0.3, 3);
    fanLight.position.set(W/2 - 0.5, fy, D/2 - 0.8);
    fanLight.userData.isRGBLight = true;
    fanLight.userData.rgbOffset = idx * 0.33;
    pc.add(fanLight);
  });

  // ────── 2 TOP FANS (AIO radiator) ──────
  [-1, 1.2].forEach((fz, idx) => {
    place(box([1.8, 0.12, 1.8], 0x222230, 0.4, 0.5), -0.5, H - 0.3, fz);

    for (let b = 0; b < 7; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.03, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x888899, transparent: true, opacity: 0.2 })
      );
      blade.position.set(-0.5, H - 0.24, fz);
      blade.rotation.y = (b / 7) * Math.PI * 2;
      blade.userData.isFan = true;
      pc.add(blade);
    }

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(-0.5, H - 0.23, fz);
    ring.userData.isRGBRing = true;
    ring.userData.rgbSpeed = 1.5;
    ring.userData.rgbOffset = 0.5 + idx * 0.25;
    pc.add(ring);

    const tL = new THREE.PointLight(0x00ffff, 0.2, 3);
    tL.position.set(-0.5, H - 0.2, fz);
    tL.userData.isRGBLight = true;
    tL.userData.rgbOffset = 0.5 + idx * 0.25;
    pc.add(tL);
  });

  // AIO radiator block (behind top fans)
  place(box([3.5, 0.35, 3], 0x1a1a25, 0.3, 0.6), -0.5, H - 0.5, 0.1);

  // ────── REAR FAN ──────
  place(box([1.8, 1.8, 0.12], 0x222230, 0.4, 0.5), 0, 6.5, -D/2 + 0.2);
  for (let b = 0; b < 7; b++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.6, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x888899, transparent: true, opacity: 0.2 })
    );
    blade.position.set(0, 6.5, -D/2 + 0.22);
    blade.rotation.z = (b / 7) * Math.PI * 2;
    blade.userData.isFan = true;
    pc.add(blade);
  }

  // ────── M.2 SSD on MB ──────
  place(box([0.04, 0.1, 1.4], 0x1a1a30, 0.4, 0.5), mbX + 0.1, 5.5, 1.5);

  // ────── CABLES (bezier curves) ──────
  const cMat = new THREE.LineBasicMaterial({ color: 0x111111 });
  const cMat2 = new THREE.LineBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.5 });
  [[[-0.5,1.8,-1],[0,4,2],[mbX+0.1,6,2.5], cMat],
   [[0.5,1.8,-0.5],[0.2,5,-2],[mbX+0.1,8.2,-2], cMat2],
   [[0.8,1.8,-1],[1,3.5,1],[gpuX,gpuY+0.45,2], cMat]
  ].forEach(([a, mid, b, mat]) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...a), new THREE.Vector3(...mid), new THREE.Vector3(...b)
    );
    pc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(14)), mat));
  });

  // ────── SIDE LED STRIP (rainbow, right edge of front like reference) ──────
  for (let i = 0; i < 24; i++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.25, 0.04),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    led.position.set(W/2 - 0.05, 1 + i * 0.35, D/2 - 0.05);
    led.userData.isStripLED = true;
    led.userData.stripIndex = i;
    pc.add(led);
  }

  // ────── BACK I/O ──────
  place(box([2.8, 1.2, 0.06], 0x0a0a15), 0, H - 0.8, -D/2 + 0.02);
  for (let i = 0; i < 6; i++) {
    const portColor = i < 2 ? 0x4444ff : 0x333344;
    place(box([0.25, 0.15, 0.04], portColor, 0.5, 0.3), -0.8 + i * 0.35, H - 0.6, -D/2 + 0.04);
  }
  // PCIe slot covers
  for (let i = 0; i < 7; i++) {
    place(box([0.1, 0.7, 0.04], 0x222235), 1.7, 3 + i * 0.8, -D/2 + 0.04);
  }

  // ────── FRONT PANEL DETAILS ──────
  // Power button
  const pwrBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0xcccccc })
  );
  pwrBtn.rotation.x = Math.PI / 2;
  place(pwrBtn, 0, H - 0.4, D/2 + 0.04);
  // Power LED
  const pwrLed = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.17, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  pwrLed.position.set(0, H - 0.4, D/2 + 0.06);
  pwrLed.userData.isLED = true;
  pc.add(pwrLed);

  // Front USB ports
  place(box([0.22, 0.1, 0.04], 0x444466), -0.25, H - 0.9, D/2 + 0.04);
  place(box([0.22, 0.1, 0.04], 0x444466), 0.25, H - 0.9, D/2 + 0.04);

  return pc;
}

const COMP_LABELS = [
  'Корпус', 'Материнская плата', 'Процессор + AIO',
  'Видеокарта RTX', 'Оперативная память RGB',
  'Блок питания', 'Накопители и кабели'
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
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.004);

    const camera = new THREE.PerspectiveCamera(32, W / H, 0.5, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x333344, 0.5));
    const dL = new THREE.DirectionalLight(0xffffff, 0.8);
    dL.position.set(8, 15, 10);
    dL.castShadow = true;
    scene.add(dL);
    // Backlight
    const bL = new THREE.DirectionalLight(0x6666aa, 0.3);
    bL.position.set(-8, 10, -8);
    scene.add(bL);

    // Floor
    scene.add(new THREE.GridHelper(300, 60, 0x1a1a3a, 0x0f0f20));
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Build PC
    const pcModel = buildPC();
    scene.add(pcModel);

    // Collect parts for assembly
    const pcParts = [];
    pcModel.traverse(child => {
      if (child.isMesh || child.isLine || child.isLineSegments) {
        const orig = child.position.clone();
        child.userData.origPos = orig;
        child.userData.scatterPos = new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          12 + Math.random() * 25,
          (Math.random() - 0.5) * 40
        );
        child.position.copy(child.userData.scatterPos);
        child.userData.assembled = false;
        pcParts.push(child);
      }
      if (child.isPointLight) {
        // Store light original pos too
        child.userData.origPos = child.position.clone();
      }
    });

    // 1200 instances (Phase 2)
    const TOTAL = 1200;
    const iGeo = new THREE.BoxGeometry(1, 2.2, 1.8);
    const iMat = new THREE.MeshStandardMaterial({ color: 0xddddee, emissive: 0x2da39a, emissiveIntensity: 0 });
    const iMesh = new THREE.InstancedMesh(iGeo, iMat, TOTAL);
    iMesh.visible = false; scene.add(iMesh);

    const cols = 40, spX = 2.5, spZ = 2.5;
    const pcData = [], dummy = new THREE.Object3D();
    const bCol = new THREE.Color(0xddddee), fCol = new THREE.Color(0x2da39a);
    for (let i = 0; i < TOTAL; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = (col - cols / 2) * spX, z = (row - 15) * spZ;
      pcData.push({ x, z, delay: col * 0.035 + row * 0.035 + Math.random() * 0.05, visible: false, flashT: 0 });
      dummy.position.set(x, 1.1, z); dummy.scale.set(0, 0, 0); dummy.updateMatrix();
      iMesh.setMatrixAt(i, dummy.matrix); iMesh.setColorAt(i, bCol);
    }
    iMesh.instanceMatrix.needsUpdate = true;
    iMesh.instanceColor.needsUpdate = true;

    // Animation
    const clock = new THREE.Clock();
    let animId, isVisible = false;
    const ASSEMBLE = 9, TRANS = 3, SPAWN = 7, HOLD = 3;
    const LOOP = ASSEMBLE + TRANS + SPAWN + HOLD;
    const T1 = ASSEMBLE, T2 = T1 + TRANS, T3 = T2 + SPAWN;

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeIO = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;

    const camA = { p: new THREE.Vector3(10, 7, 12), l: new THREE.Vector3(0, 4.5, 0) };
    const camB = { p: new THREE.Vector3(0, 120, 160), l: new THREE.Vector3(0, 0, 0) };

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;
      const delta = clock.getDelta();
      const time = clock.elapsedTime;
      const t = time % LOOP;

      // === PHASE 1: ASSEMBLY ===
      if (t < T1) {
        const a = t * 0.3, r = 14;
        camera.position.set(Math.sin(a) * r, 5 + Math.sin(t * 0.3) * 3, Math.cos(a) * r);
        camera.lookAt(0, 4.5, 0);

        pcParts.forEach((p, i) => {
          const d = (i / pcParts.length) * (T1 - 2);
          if (t > d) {
            const pr = easeOut(Math.min(1, (t - d) / 1.8));
            p.position.lerpVectors(p.userData.scatterPos, p.userData.origPos, pr);
            p.userData.assembled = pr >= 1;
          } else { p.position.copy(p.userData.scatterPos); }
        });

        // Animate fans + RGB
        pcModel.traverse(c => {
          if (c.userData.isFan && c.userData.assembled) {
            c.rotation.z = time * 8;
          }
          if (c.userData.isRGBRing && c.userData.assembled) {
            const hue = ((time * (c.userData.rgbSpeed || 1)) + (c.userData.rgbOffset || 0)) % 1;
            c.material.color.setHSL(hue, 1, 0.55);
          }
          if (c.userData.isRGBLight) {
            const hue = ((time * 1.2) + (c.userData.rgbOffset || 0)) % 1;
            c.color.setHSL(hue, 1, 0.5);
          }
          if (c.userData.isLED && c.userData.assembled) {
            const h = c.userData.ledHue || 0.42;
            c.material.color.setHSL(h, 1, 0.45 + Math.sin(time * 3 + h * 10) * 0.15);
          }
          if (c.userData.isStripLED && c.userData.assembled) {
            const hue = ((c.userData.stripIndex / 24) + time * 0.5) % 1;
            c.material.color.setHSL(hue, 1, 0.5);
          }
        });

        const phase = Math.min(COMP_LABELS.length - 1, Math.floor(t / (T1 / COMP_LABELS.length)));
        setLabel(COMP_LABELS[phase]);
        pcModel.visible = true; iMesh.visible = false; setCount(0);
      }

      // === PHASE 2: TRANSITION ===
      if (t >= T1 && t < T2) {
        const p = easeIO((t - T1) / TRANS);
        camera.position.lerpVectors(camA.p, camB.p, p);
        camera.lookAt(
          THREE.MathUtils.lerp(0, 0, p),
          THREE.MathUtils.lerp(4.5, 0, p),
          THREE.MathUtils.lerp(0, 0, p)
        );
        if (p > 0.5) {
          pcModel.visible = false; iMesh.visible = true;
          dummy.position.set(0, 1.1, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
          iMesh.setMatrixAt(0, dummy.matrix); iMesh.setColorAt(0, fCol);
          pcData[0].visible = true;
          iMesh.instanceMatrix.needsUpdate = true; iMesh.instanceColor.needsUpdate = true;
        }
        setLabel('');
      }

      // === PHASE 3: SPAWN 1200 ===
      if (t >= T2 && t < T3) {
        camera.position.copy(camB.p); camera.lookAt(camB.l);
        pcModel.visible = false; iMesh.visible = true;
        const st = t - T2;
        let vis = 0, mu = false, cu = false;
        const cObj = new THREE.Color();
        for (let i = 0; i < TOTAL; i++) {
          const d = pcData[i];
          if (!d.visible && st > d.delay) {
            d.visible = true; d.flashT = 1;
            dummy.position.set(d.x, 1.1, d.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
            iMesh.setMatrixAt(i, dummy.matrix); mu = true;
          }
          if (d.visible) { vis++;
            if (d.flashT > 0) { d.flashT -= delta * 3; if (d.flashT < 0) d.flashT = 0;
              cObj.copy(bCol).lerp(fCol, d.flashT); iMesh.setColorAt(i, cObj); cu = true; }
          }
        }
        if (mu) iMesh.instanceMatrix.needsUpdate = true;
        if (cu) iMesh.instanceColor.needsUpdate = true;
        setCount(vis);
      }

      // === HOLD ===
      if (t >= T3) { camera.position.copy(camB.p); camera.lookAt(camB.l); setCount(TOTAL); }

      // === RESET ===
      if (t < 0.05) {
        pcData.forEach((d, i) => {
          d.visible = false; d.flashT = 0;
          dummy.scale.set(0, 0, 0); dummy.position.set(d.x, 1.1, d.z); dummy.updateMatrix();
          iMesh.setMatrixAt(i, dummy.matrix); iMesh.setColorAt(i, bCol);
        });
        iMesh.instanceMatrix.needsUpdate = true; iMesh.instanceColor.needsUpdate = true;
        pcModel.visible = true; iMesh.visible = false;
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
      cancelAnimationFrame(animId); obs.disconnect(); renderer.dispose();
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
