import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import i18n from '../../i18n/i18n';
import { disposeScene } from './_shared/disposeScene';
import { getProfile } from './_shared/deviceProfile';

/* ======================================================================
   SceneLogistics — story of the Chelyabinsk → Saint Petersburg crane.
   Five acts on a ~20-second loop:
     1. SHOW  (0–3.5s)   — crane stands assembled in Chelyabinsk.
     2. LOAD  (3.5–5.5s) — boom rises to vertical, crane slides onto truck.
     3. DRIVE (5.5–14.5s) — truck rolls 2,700 km along the route, follow-cam.
     4. LIFT  (14.5–18s) — at SPb, turret swivels and boom lowers toward roof.
     5. HOLD  (18–20s)   — wide cinematic of building lit up under snow.

   All models ship in the truck's local frame with FORWARD = +X (cabin
   sits at the +X end). That makes truck.rotation.y = atan2(-dir.z, dir.x)
   without any extra offsets — the formula that bit me last time.
   ====================================================================== */

// ───── Russia silhouette + landmarks ─────
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
// Volga river path — gives the map a recognisable feature
const VOLGA = [
  [37, 56.7],[38, 55.8],[40, 55.5],[44, 54.0],[46, 51.6],[48, 49.5],[48, 47.0],[47.5, 45.5],[47.7, 43.0]
];
// Great lake silhouettes (Caspian + Baikal)
const CASPIAN = [
  [47, 47.0],[48, 46.0],[50, 45.5],[52, 44.5],[53, 42.5],[51, 41.0],[49, 41.5],[47.5, 43],[47, 47]
];
const BAIKAL = [
  [104, 56],[107, 54.8],[109, 53.5],[110, 52],[108, 51.7],[105, 53],[103.5, 54.5],[104, 56]
];

const LON_C = 75, LAT_C = 58, SX = 1.2, SZ = 2.0;
const toXZ = (lon, lat) => ({ x: (lon - LON_C) * SX, z: -(lat - LAT_C) * SZ });

const CITIES = [
  { id: 'spb',  nameRu: 'Санкт-Петербург', nameEn: 'Saint Petersburg', lon: 30.3, lat: 59.9, color: 0x6B4FA0, role: 'end' },
  { id: 'msk',  nameRu: 'Москва',           nameEn: 'Moscow',           lon: 37.6, lat: 55.75, color: 0x88c4ff, role: 'pass' },
  { id: 'kzn',  nameRu: 'Казань',           nameEn: 'Kazan',            lon: 49.1, lat: 55.8, color: 0x88c4ff, role: 'pass' },
  { id: 'chel', nameRu: 'Челябинск',        nameEn: 'Chelyabinsk',      lon: 61.4, lat: 55.2, color: 0xFFA500, role: 'start' },
];

// ─────────────────────── Truck (low-loader, forward = +X) ───────────────────────
function buildTruck() {
  const truck = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3242, roughness: 0.5, metalness: 0.45 });
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x4a5a6a, roughness: 0.4, metalness: 0.55,
    emissive: 0x6B4FA0, emissiveIntensity: 0.06,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x6e7480, roughness: 0.4, metalness: 0.7 });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff4c8 });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff5544 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x2da39a, emissive: 0x2da39a, emissiveIntensity: 0.85,
    roughness: 0.4, metalness: 0.3,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1428, roughness: 0.04, transmission: 0.5,
    thickness: 0.2, ior: 1.45, clearcoat: 1.0,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.15, metalness: 0.95 });

  // ── Cabin (at +X end so truck "looks" toward +X) ─────────────────
  // Main cabin body
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.1), cabinMat);
  cabin.position.set(3.6, 1.6, 0);
  truck.add(cabin);
  // Cabin top spoiler/sleeper
  const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.95), bodyMat);
  sleeper.position.set(3.7, 3.15, 0);
  truck.add(sleeper);
  // Front grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 1.6), bodyMat);
  grille.position.set(4.85, 1.4, 0);
  truck.add(grille);
  for (let i = 0; i < 5; i++) {
    // Slats sit on the grille face between the two headlight housings;
    // narrower in Z so they don't punch into the headlight bodies.
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.0), chromeMat);
    slat.position.set(4.95, 0.85 + i * 0.22, 0);
    truck.add(slat);
  }
  // Bumper with chrome trim — sits low (below grille / headlights / cabin)
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 1.95), bodyMat);
  bumper.position.set(4.95, 0.42, 0);
  truck.add(bumper);
  const bumperTrim = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 1.95), chromeMat);
  bumperTrim.position.set(5.13, 0.42, 0);
  truck.add(bumperTrim);
  // Front windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.85), glassMat);
  windshield.position.set(4.78, 1.95, 0);
  windshield.rotation.z = -0.1;
  truck.add(windshield);
  // Side windows — outside the cabin shell so they read as a glass panel
  for (const z of [-1.07, 1.07]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 0.04), glassMat);
    sw.position.set(3.5, 2.05, z);
    truck.add(sw);
  }
  // Cabin doors (outlines + handle), pushed out a bit further
  for (const z of [-1.08, 1.08]) {
    const doorLine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.03), chromeMat);
    doorLine.position.set(3.0, 1.6, z);
    truck.add(doorLine);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.18), chromeMat);
    handle.position.set(3.4, 1.5, z);
    truck.add(handle);
  }
  // Headlights — mounted on the grille face, sticking forward
  for (const z of [-0.7, 0.7]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.5), bodyMat);
    housing.position.set(4.95, 1.05, z);
    truck.add(housing);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.42), headlightMat);
    bulb.position.set(5.01, 1.05, z);
    truck.add(bulb);
  }
  // Side mirrors (with arms)
  for (const z of [-1.25, 1.25]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), chromeMat);
    arm.position.set(4.55, 2.5, z);
    truck.add(arm);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.22), bodyMat);
    mirror.position.set(4.55, 2.25, z);
    truck.add(mirror);
  }
  // Roof horns / antennae
  const horn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.6), chromeMat);
  horn.position.set(3.4, 3.7, 0);
  truck.add(horn);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), chromeMat);
  antenna.position.set(2.9, 4.0, -0.7);
  truck.add(antenna);
  // Vertical exhausts (twin stacks just behind the cabin back)
  for (const z of [-1.05, 1.05]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 12), chromeMat);
    stack.position.set(2.2, 2.8, z);
    truck.add(stack);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), bodyMat);
    tip.position.set(2.2, 3.65, z);
    truck.add(tip);
  }

  // ── Coupler + deck (low-loader extends from -X of cabin) ─────────
  const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.4), bodyMat);
  coupler.position.set(2.3, 1.05, 0);
  truck.add(coupler);

  // Deck: long, narrow, low to the ground (a real low-loader)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.35, 2.0), bodyMat);
  deck.position.set(-1.0, 0.7, 0);
  truck.add(deck);
  // Cross-beams under the deck (visible from below, adds detail)
  for (let i = 0; i < 7; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 1.95), bodyMat);
    beam.position.set(-4.0 + i, 0.45, 0);
    truck.add(beam);
  }
  // Deck side rails (where chains/straps attach)
  for (const z of [-0.97, 0.97]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.2, 0.08), bodyMat);
    rail.position.set(-1.0, 0.97, z);
    truck.add(rail);
    // Tie-down points (small bumps)
    for (let i = 0; i < 6; i++) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.08), chromeMat);
      tie.position.set(-3.5 + i * 1.1, 1.07, z);
      truck.add(tie);
    }
  }
  // Teal accent strip (catches bloom, works as branding)
  for (const z of [-0.99, 0.99]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.04, 0.03), trimMat);
    stripe.position.set(-1.0, 0.92, z);
    truck.add(stripe);
  }
  // Fuel tanks (cylindrical, on each side under the deck)
  for (const z of [-1.05, 1.05]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.4, 16), chromeMat);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(1.5, 0.5, z);
    truck.add(tank);
    // End caps
    for (const x of [0.8, 2.2]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 16), bodyMat);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(x, 0.5, z);
      truck.add(cap);
    }
  }
  // Mud flaps behind rear wheels
  for (const z of [-1.05, 1.05]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.5), wheelMat);
    flap.position.set(-4.4, 0.2, z);
    truck.add(flap);
  }
  // Tail lights cluster
  for (const z of [-0.8, 0.8]) {
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.35), taillightMat);
    taillight.position.set(-4.6, 0.7, z);
    truck.add(taillight);
  }

  // Wheels — tractor (front, at cabin) + bogey under cabin + 6 axles under deck
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 18);
  wheelGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.42, 14);
  rimGeo.rotateX(Math.PI / 2);
  const tractorAxlesX = [4.2, 3.0]; // under cabin
  const deckAxlesX = [1.4, 0.4, -0.6, -1.6, -2.6, -3.6]; // under deck
  const allAxlesX = [...tractorAxlesX, ...deckAxlesX];
  for (const x of allAxlesX) {
    for (const z of [-1.0, 1.0]) {
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.position.set(x, 0.45, z);
      truck.add(tire);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(x, 0.45, z);
      truck.add(rim);
      // Hub centre nut
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.43, 8), chromeMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(x, 0.45, z);
      truck.add(hub);
    }
  }

  return truck;
}

// ─────────────────────── Crane (forward = +X) ───────────────────────
function buildCrane() {
  const crane = new THREE.Group();

  const carrierMat = new THREE.MeshStandardMaterial({
    color: 0xc4882a, roughness: 0.5, metalness: 0.35,
    emissive: 0x3a2408, emissiveIntensity: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1a1a26, roughness: 0.6, metalness: 0.3 });
  const boomMat = new THREE.MeshStandardMaterial({
    color: 0xddaa33, roughness: 0.4, metalness: 0.4,
    emissive: 0x3a2408, emissiveIntensity: 0.18,
  });
  const hydraulicMat = new THREE.MeshStandardMaterial({ color: 0x96a2b0, roughness: 0.2, metalness: 0.85 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.2, metalness: 0.9 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x2da39a });
  const cabinGlass = new THREE.MeshPhysicalMaterial({
    color: 0x132040, roughness: 0.04, transmission: 0.5,
    thickness: 0.2, ior: 1.45, clearcoat: 1.0,
    transparent: true,
  });

  // ── Carrier chassis (the base vehicle) ───────────────────────────
  // Main chassis box
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 1.65), carrierMat);
  chassis.position.set(0, 0.6, 0);
  crane.add(chassis);

  // Chassis side detail panels (stripes)
  for (const z of [-0.83, 0.83]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 0.04), accentMat);
    panel.position.set(0, 0.65, z);
    crane.add(panel);
  }

  // (Carrier wheels removed — they intersected the chassis box and were
  //  pure clutter on the truck deck. The crane sits on outriggers when
  //  working and on the truck deck the rest of the time, never on tyres.)

  // Hydraulic outrigger legs — placed under the chassis (chassis bottom
  // is at y=0.325, so legs sit at y≈0.22 with feet on the ground).
  for (const x of [-1.5, 1.5]) {
    for (const z of [-0.85, 0.85]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.45), accentMat);
      leg.position.set(x, 0.24, z);
      crane.add(leg);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), hydraulicMat);
      foot.position.set(x, 0.13, z);
      crane.add(foot);
    }
  }

  // ── Operator cabin (small, +X side of chassis) ───────────────────
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 1.0), carrierMat);
  cabin.position.set(1.0, 1.4, 0);
  crane.add(cabin);
  // Slanted windshield
  const cwGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.85), cabinGlass);
  cwGlass.position.set(1.5, 1.45, 0);
  cwGlass.rotation.z = -0.18;
  crane.add(cwGlass);
  // Side window
  for (const z of [-0.51, 0.51]) {
    const sg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.04), cabinGlass);
    sg.position.set(0.95, 1.5, z);
    crane.add(sg);
  }
  // Cabin door handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.18), chromeMat);
  handle.position.set(0.95, 1.25, 0.55);
  crane.add(handle);
  // Step under cabin door
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.5), accentMat);
  step.position.set(1.0, 0.92, 0.55);
  crane.add(step);
  // Roof beacon (warning light — pulses)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), beaconMat);
  beacon.position.set(0.7, 2.0, 0);
  crane.add(beacon);
  const beaconPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), accentMat);
  beaconPost.position.set(0.7, 1.93, 0);
  crane.add(beaconPost);

  // ── Turret (rotates around Y) ────────────────────────────────────
  const turret = new THREE.Group();
  // Big turntable disc
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.78, 0.18, 24), accentMat);
  turntable.position.y = 0.09;
  turret.add(turntable);
  // Turret base box (mounts the boom shoulder)
  const turretBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 1.1), carrierMat);
  turretBase.position.y = 0.45;
  turret.add(turretBase);
  // Cabin tower — small structure on the back of turret
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.85), accentMat);
  tower.position.set(-0.55, 0.95, 0);
  turret.add(tower);
  // Cable spool (visible drum where the hoist cable winds)
  const spool = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.6, 18),
    chromeMat
  );
  spool.rotation.x = Math.PI / 2;
  spool.position.set(0.0, 1.0, 0);
  turret.add(spool);
  // Spool flanges (end caps)
  for (const z of [-0.32, 0.32]) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 18), accentMat);
    flange.rotation.x = Math.PI / 2;
    flange.position.set(0, 1.0, z);
    turret.add(flange);
  }

  // ── Boom (pivots around Z at the shoulder) ───────────────────────
  // Boom group origin = boom shoulder (pivot point).
  // Boom extends along +X from origin; rotation.z = 0 → horizontal forward.
  // rotation.z = +Math.PI/2 → vertical up.
  const boomGroup = new THREE.Group();

  // Lower boom segment (the chunky tapered base)
  const boom1Len = 4.6;
  const boom1 = new THREE.Mesh(new THREE.BoxGeometry(boom1Len, 0.42, 0.45), boomMat);
  boom1.position.set(boom1Len / 2 + 0.18, 0, 0);
  boomGroup.add(boom1);
  // Telescoping inner section (slightly thinner, offset upward to look like it slides out)
  const boom2Len = boom1Len * 0.78;
  const boom2 = new THREE.Mesh(new THREE.BoxGeometry(boom2Len, 0.32, 0.34), boomMat);
  boom2.position.set(boom1Len / 2 + 0.4 + boom2Len / 2 - 0.5, 0.05, 0);
  boomGroup.add(boom2);
  // Even thinner third tip
  const boom3Len = boom2Len * 0.7;
  const boom3 = new THREE.Mesh(new THREE.BoxGeometry(boom3Len, 0.22, 0.24), boomMat);
  boom3.position.set(boom1Len / 2 + 0.4 + boom2Len - 0.3 + boom3Len / 2, 0.08, 0);
  boomGroup.add(boom3);

  // Boom tip ferrule (where the cable exits)
  const tipFerrule = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.16, 12),
    chromeMat
  );
  tipFerrule.rotation.z = Math.PI / 2;
  const boomTipX = boom1Len / 2 + 0.4 + boom2Len - 0.3 + boom3Len + 0.05;
  tipFerrule.position.set(boomTipX, 0.08, 0);
  boomGroup.add(tipFerrule);

  // Lattice top rib along boom1 (industrial visual texture)
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.05, 0.5),
      accentMat
    );
    rib.position.set(0.5 + i * 0.7, 0.25, 0);
    boomGroup.add(rib);
    // Diagonal cross brace
    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.04, 0.04),
      accentMat
    );
    brace.position.set(0.85 + i * 0.7, 0.25, -0.2);
    brace.rotation.z = i % 2 === 0 ? 0.3 : -0.3;
    boomGroup.add(brace);
  }

  // Hydraulic ram (lift cylinder under the boom)
  const ramOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 1.6, 14),
    accentMat
  );
  ramOuter.rotation.z = Math.PI / 2 - 0.25;
  ramOuter.position.set(0.7, -0.4, 0);
  boomGroup.add(ramOuter);
  const ramInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.0, 14),
    chromeMat
  );
  ramInner.rotation.z = Math.PI / 2 - 0.25;
  ramInner.position.set(0.4, -0.55, 0);
  boomGroup.add(ramInner);

  // Hoist cable (down from boom tip)
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6),
    accentMat
  );
  cable.position.set(boomTipX, -0.7, 0);
  boomGroup.add(cable);
  // Hook (proper hook shape: torus + hook)
  const hookBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.22, 0.18),
    chromeMat
  );
  hookBlock.position.set(boomTipX, -1.55, 0);
  boomGroup.add(hookBlock);
  const hookCurve = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.04, 8, 16, Math.PI * 1.5),
    chromeMat
  );
  hookCurve.rotation.x = Math.PI / 2;
  hookCurve.rotation.z = Math.PI;
  hookCurve.position.set(boomTipX, -1.78, 0);
  boomGroup.add(hookCurve);

  // Boom shoulder pin (visual: a fat cylinder along Z at the pivot)
  const shoulderPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.7, 14),
    chromeMat
  );
  shoulderPin.rotation.x = Math.PI / 2;
  shoulderPin.position.set(0, 0, 0);
  boomGroup.add(shoulderPin);

  // Boom is mounted at the shoulder, slightly above turret base
  boomGroup.position.set(0.45, 1.1, 0);
  turret.add(boomGroup);

  // Counterweight on the back of the turret (heavy block + ribs)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 1.3), accentMat);
  counter.position.set(-0.85, 0.85, 0);
  turret.add(counter);
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 1.32), carrierMat);
    rib.position.set(-1.13, 0.85, -0.5 + i * 0.5);
    turret.add(rib);
  }

  turret.position.set(-0.4, 0.95, 0);
  crane.add(turret);

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
  const stoneWarmMat = new THREE.MeshStandardMaterial({
    color: 0xd9c8ad, roughness: 0.7, metalness: 0.0,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffe0a8, emissive: 0xffe0a8, emissiveIntensity: 0.85,
    transparent: true, opacity: 0.92,
  });
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x3a3024, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x4a5246, roughness: 0.55, metalness: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xc4a040, roughness: 0.3, metalness: 0.85,
    emissive: 0x4a3a14, emissiveIntensity: 0.3,
  });

  const W = 14, D = 5.5, H1 = 3.2, H2 = 2.8;
  const facadeZ = D / 2;

  // ── Plinth (raised stone base) ───────────────────────────────
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.6, 0.6, D + 0.4),
    stoneDarkMat
  );
  plinth.position.y = 0.3;
  g.add(plinth);
  // Plinth chamfer (lip)
  const plinthLip = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.3, 0.08, D + 0.18),
    stoneMat
  );
  plinthLip.position.y = 0.65;
  g.add(plinthLip);

  // ── Ground floor with rustication (horizontal banding) ───────
  const ground = new THREE.Mesh(new THREE.BoxGeometry(W, H1, D), stoneMat);
  ground.position.y = 0.7 + H1 / 2;
  g.add(ground);
  // Rustication lines (horizontal grooves) — placed above the ground-floor
  // windows (which top out around y=2.55) and below the cornice (y=3.9),
  // so they don't run through the glass. Pushed forward in Z so they don't
  // z-fight with the wall.
  for (let i = 0; i < 3; i++) {
    const ru = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.05, 0.05),
      stoneDarkMat
    );
    ru.position.set(0, 2.8 + i * 0.35, facadeZ + 0.04);
    g.add(ru);
  }

  // Ground-floor windows — with frame, sill and pediment
  const groundWinXs = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5];
  for (const x of groundWinXs) {
    // Frame surround
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.7, 0.05),
      windowFrameMat
    );
    frame.position.set(x, 1.7, facadeZ + 0.003);
    g.add(frame);
    // Glass with mullion
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 1.55, 0.02),
      windowMat
    );
    glass.position.set(x, 1.7, facadeZ + 0.03);
    g.add(glass);
    // Mullion cross — V and H on slightly different Z so they don't z-fight
    const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.55, 0.04), windowFrameMat);
    mulV.position.set(x, 1.7, facadeZ + 0.05);
    g.add(mulV);
    const mulH = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.04, 0.04), windowFrameMat);
    mulH.position.set(x, 1.7, facadeZ + 0.06);
    g.add(mulH);
    // Sill below
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.08, 0.18),
      stoneDarkMat
    );
    sill.position.set(x, 0.85, facadeZ + 0.08);
    g.add(sill);
    // Mini pediment above
    const pedShape = new THREE.Shape();
    pedShape.moveTo(-0.7, 0); pedShape.lineTo(0.7, 0);
    pedShape.lineTo(0, 0.3); pedShape.lineTo(-0.7, 0);
    const ped = new THREE.Mesh(
      new THREE.ExtrudeGeometry(pedShape, { depth: 0.1, bevelEnabled: false }),
      stoneDarkMat
    );
    ped.position.set(x, 2.55, facadeZ + 0.03);
    g.add(ped);
  }

  // Main entrance: tall arched door with frame
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 2.7, 0.05),
    windowMat
  );
  door.material = windowMat.clone();
  door.material.emissiveIntensity = 1.5;
  door.position.set(0, 2.05, facadeZ + 0.02);
  g.add(door);
  // Door frame
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 2.95, 0.06),
    windowFrameMat
  );
  doorFrame.position.set(0, 2.18, facadeZ + 0.001);
  g.add(doorFrame);
  // Door pediment (bigger)
  const dpShape = new THREE.Shape();
  dpShape.moveTo(-1.2, 0); dpShape.lineTo(1.2, 0);
  dpShape.lineTo(0, 0.5); dpShape.lineTo(-1.2, 0);
  const dped = new THREE.Mesh(
    new THREE.ExtrudeGeometry(dpShape, { depth: 0.18, bevelEnabled: false }),
    stoneDarkMat
  );
  dped.position.set(0, 3.7, facadeZ + 0.02);
  g.add(dped);

  // ── Wide stone steps in front of entrance (5 steps with balustrade) ──
  for (let i = 0; i < 5; i++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(4.2 - i * 0.2, 0.16, 0.5),
      stoneDarkMat
    );
    step.position.set(0, 0.08 + i * 0.16, facadeZ + 0.6 + i * 0.2);
    g.add(step);
  }
  // Balustrades on either side of steps
  for (const x of [-2.0, 2.0]) {
    // Side wall
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.6, 1.3),
      stoneMat
    );
    wall.position.set(x, 0.42, facadeZ + 1.0);
    g.add(wall);
    // Cap
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.08, 1.4),
      stoneDarkMat
    );
    cap.position.set(x, 0.76, facadeZ + 1.0);
    g.add(cap);
    // Decorative balls on cap
    for (const dz of [-0.5, 0.5]) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), stoneWarmMat);
      ball.position.set(x, 0.92, facadeZ + 1.0 + dz);
      g.add(ball);
    }
  }

  // ── 2nd floor (slightly recessed for visual interest) ────────
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(W - 0.4, H2, D - 0.2),
    stoneMat
  );
  top.position.y = 0.7 + H1 + H2 / 2;
  g.add(top);

  // Cornice between floors — facade-only panel, sticks out 0.25 from wall
  // (was a full wraparound box that cut through floor interiors).
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.3, 0.18, 0.25),
    stoneDarkMat
  );
  cornice.position.set(0, 0.7 + H1 + 0.0, facadeZ + 0.12);
  g.add(cornice);
  // Dentils — sit just below the cornice, pushed forward so they don't z-fight
  for (let i = 0; i < 28; i++) {
    const dent = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.08),
      stoneMat
    );
    dent.position.set(-W / 2 + 0.3 + i * 0.5, 0.7 + H1 - 0.07, facadeZ + 0.28);
    g.add(dent);
  }

  // 2nd floor windows (taller, more elegant)
  for (const x of groundWinXs) {
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.55, 0.05),
      windowFrameMat
    );
    frame.position.set(x, 0.7 + H1 + H2 / 2, facadeZ - 0.1 + 0.003);
    g.add(frame);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 1.42, 0.02),
      windowMat
    );
    glass.material = windowMat.clone();
    glass.material.emissiveIntensity = 0.5;
    glass.position.set(x, 0.7 + H1 + H2 / 2, facadeZ - 0.1 + 0.03);
    g.add(glass);
    // Mullion (V only on 2nd floor — slimmer windows don't need a cross)
    const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.42, 0.04), windowFrameMat);
    mulV.position.set(x, 0.7 + H1 + H2 / 2, facadeZ - 0.1 + 0.05);
    g.add(mulV);
  }

  // ── Pilasters between 2nd-floor windows ──────────────────────
  const pilasterXs = [-6.8, -4.4, -2.2, 0, 2.2, 4.4, 6.8];
  for (const x of pilasterXs) {
    const pil = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, H2 - 0.3, 0.12),
      stoneWarmMat
    );
    pil.position.set(x, 0.7 + H1 + H2 / 2, facadeZ - 0.1 + 0.06);
    g.add(pil);
  }

  // ── Classical 6-column portico in front of entrance ──────────
  const colHeight = H1 + H2 - 0.5;
  const colXs = [-4.4, -2.6, -0.9, 0.9, 2.6, 4.4];
  for (const x of colXs) {
    // Fluted column (achieved by surrounding a cylinder with thin "flute" boxes)
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.22, colHeight, 16),
      stoneMat
    );
    col.position.set(x, colHeight / 2 + 0.6, facadeZ + 1.6);
    g.add(col);
    // 8 vertical flutes (decorative grooves) — thin dark stripes
    for (let f = 0; f < 8; f++) {
      const a = (f / 8) * Math.PI * 2;
      const flute = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, colHeight - 0.4, 0.03),
        stoneDarkMat
      );
      flute.position.set(
        x + Math.cos(a) * 0.21,
        colHeight / 2 + 0.6,
        facadeZ + 1.6 + Math.sin(a) * 0.21
      );
      g.add(flute);
    }
    // Capital (Ionic-ish: square plate + scroll details simplified)
    const capital = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.16, 0.55),
      stoneWarmMat
    );
    capital.position.set(x, colHeight + 0.68, facadeZ + 1.6);
    g.add(capital);
    // Scroll volutes (simplified as small spheres on capital corners)
    for (const dz of [-0.22, 0.22]) {
      const volute = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 8),
        stoneDarkMat
      );
      volute.position.set(x, colHeight + 0.74, facadeZ + 1.6 + dz);
      g.add(volute);
    }
    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.14, 0.42),
      stoneDarkMat
    );
    base.position.set(x, 0.67, facadeZ + 1.6);
    g.add(base);
  }

  // ── Entablature (architrave/frieze + larger cornice over portico) ──
  const archi = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.3, 0.4),
    stoneMat
  );
  archi.position.set(0, colHeight + 0.95, facadeZ + 1.6);
  g.add(archi);
  const frieze = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.45, 0.42),
    stoneWarmMat
  );
  frieze.position.set(0, colHeight + 1.32, facadeZ + 1.6);
  g.add(frieze);
  // Ornaments on frieze (small medallions)
  for (let i = 0; i < 5; i++) {
    const med = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 16),
      goldMat
    );
    med.position.set(-3.6 + i * 1.8, colHeight + 1.32, facadeZ + 1.62);
    g.add(med);
  }
  const portCornice = new THREE.Mesh(
    new THREE.BoxGeometry(11.4, 0.22, 0.5),
    stoneDarkMat
  );
  portCornice.position.set(0, colHeight + 1.66, facadeZ + 1.6);
  g.add(portCornice);

  // ── Triangular pediment over the portico ─────────────────────
  const pedShape = new THREE.Shape();
  pedShape.moveTo(-5.2, 0); pedShape.lineTo(5.2, 0);
  pedShape.lineTo(0, 1.8); pedShape.lineTo(-5.2, 0);
  const ped = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedShape, { depth: 0.4, bevelEnabled: false }),
    stoneMat
  );
  ped.position.set(0, colHeight + 1.78, facadeZ + 1.4);
  g.add(ped);

  // Decoration in pediment (a central medallion)
  const tympanum = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    goldMat
  );
  tympanum.position.set(0, colHeight + 2.4, facadeZ + 1.81);
  g.add(tympanum);

  // ── Roof + crowning ornaments ────────────────────────────────
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.2),
    roofMat
  );
  roof.position.y = 0.7 + H1 + H2 + 0.15;
  g.add(roof);
  // Acroteria — small ornaments at the corners and apex of pediment
  const acroteria = [
    [-5.2, colHeight + 1.78, facadeZ + 1.4],
    [5.2, colHeight + 1.78, facadeZ + 1.4],
    [0, colHeight + 3.6, facadeZ + 1.6],
  ];
  for (const [x, y, z] of acroteria) {
    const a = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.5, 8),
      stoneWarmMat
    );
    a.position.set(x, y + 0.25, z);
    g.add(a);
  }
  // Roof ridge lights (warm glow strip — the crane's target)
  for (let i = 0; i < 7; i++) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd28a })
    );
    lamp.position.set(-5 + i * 1.7, 0.7 + H1 + H2 + 0.42, 0);
    g.add(lamp);
  }

  return g;
}

// ─────────────────────────────────────────────────────────────
export default function SceneLogistics() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [labels, setLabels] = useState([]);
  const [progress, setProgress] = useState({ km: 0, pct: 0 });

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;
    const profile = getProfile();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.0028);

    const camera = new THREE.PerspectiveCamera(38, W / H, 1, 800);

    const renderer = new THREE.WebGLRenderer({ antialias: profile.antialias, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(profile.pixelRatio);
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    // ─── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x445577, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffd9a8, 0.95);
    keyLight.position.set(40, 80, 60);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6B4FA0, 0.4);
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
      new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.55 })
    );
    scene.add(outline);

    // Volga river — soft blue line
    const volgaPts = VOLGA.map(([lo, la]) => {
      const p = toXZ(lo, la);
      return new THREE.Vector3(p.x, 0.42, p.z);
    });
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(volgaPts),
      new THREE.LineBasicMaterial({ color: 0x4a90c8, transparent: true, opacity: 0.55 })
    ));

    // Caspian sea outline (filled with darker tone)
    const caspPts = CASPIAN.map(([lo, la]) => {
      const p = toXZ(lo, la);
      return new THREE.Vector3(p.x, 0.41, p.z);
    });
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(caspPts),
      new THREE.LineBasicMaterial({ color: 0x4a90c8, transparent: true, opacity: 0.4 })
    ));

    // Lake Baikal outline
    const baikalPts = BAIKAL.map(([lo, la]) => {
      const p = toXZ(lo, la);
      return new THREE.Vector3(p.x, 0.41, p.z);
    });
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(baikalPts),
      new THREE.LineBasicMaterial({ color: 0x4a90c8, transparent: true, opacity: 0.5 })
    ));

    // (Ural mountain peaks removed — the cones read as trees on the map.)

    // ─── Cities (markers + vertical light beacons + ground rings) ──
    const cityNodes = [];
    for (const c of CITIES) {
      const pos = toXZ(c.lon, c.lat);
      // Marker dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 14, 14),
        new THREE.MeshBasicMaterial({ color: c.color })
      );
      dot.position.set(pos.x, 0.55, pos.z);
      scene.add(dot);
      // Beacon column
      const beaconHeight = c.role === 'pass' ? 7 : 14;
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.04, beaconHeight, 10, 1, true),
        new THREE.MeshBasicMaterial({
          color: c.color, transparent: true, opacity: 0.4,
          side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      beam.position.set(pos.x, beaconHeight / 2, pos.z);
      scene.add(beam);
      // Ground ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.15, 36),
        new THREE.MeshBasicMaterial({
          color: c.color, transparent: true, opacity: 0.55,
          side: THREE.DoubleSide,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.05, pos.z);
      scene.add(ring);
      // Outer ring (slow pulse)
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.55, 36),
        new THREE.MeshBasicMaterial({
          color: c.color, transparent: true, opacity: 0.25,
          side: THREE.DoubleSide,
        })
      );
      ring2.rotation.x = -Math.PI / 2;
      ring2.position.set(pos.x, 0.05, pos.z);
      scene.add(ring2);

      cityNodes.push({ ...c, sceneX: pos.x, sceneZ: pos.z, dot, beam, ring, ring2 });
    }

    // ─── Route (smooth curve through Chel → Kzn → Msk → SPb) ─
    const chel = toXZ(61.4, 55.2);
    const kzn = toXZ(49.1, 55.8);
    const msk = toXZ(37.6, 55.75);
    const spb = toXZ(30.3, 59.9);
    const routeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(chel.x, 0.45, chel.z),
      new THREE.Vector3((chel.x + kzn.x) / 2 + 0.5, 0.45, (chel.z + kzn.z) / 2 - 1.5),
      new THREE.Vector3(kzn.x, 0.45, kzn.z),
      new THREE.Vector3((kzn.x + msk.x) / 2, 0.45, (kzn.z + msk.z) / 2 + 1.0),
      new THREE.Vector3(msk.x, 0.45, msk.z),
      new THREE.Vector3((msk.x + spb.x) / 2, 0.45, (msk.z + spb.z) / 2 - 1.5),
      new THREE.Vector3(spb.x, 0.45, spb.z),
    ], false, 'catmullrom', 0.5);

    const routePts = routeCurve.getPoints(260);
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
    scene.add(makeRail(-0.18, 0x88c4ff, 0.55));
    scene.add(makeRail(0.18, 0x88c4ff, 0.55));

    // Solid travelled-trail line — drawn progressively
    const trailGeo = new THREE.BufferGeometry().setFromPoints(routePts);
    const trailLine = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.95 })
    );
    trailLine.geometry.setDrawRange(0, 0);
    scene.add(trailLine);

    // ─── Truck + crane ──────────────────────────────────
    const truck = buildTruck();
    truck.visible = false;
    scene.add(truck);

    const { crane, boomGroup, turret, beacon } = buildCrane();
    // Standalone crane sits beside Chelyabinsk in act 1
    crane.position.set(chel.x + 1.2, 0, chel.z + 1.5);
    scene.add(crane);

    // ─── Historic building (Petersburg) ─────────────────
    const building = buildHistoricBuilding();
    building.position.set(spb.x - 5.5, 0, spb.z + 5.5);
    building.rotation.y = Math.PI * 0.55; // facade angled toward where truck arrives
    building.visible = false;
    scene.add(building);

    // Warm spotlight illuminates the facade in act 4
    const buildingLight = new THREE.SpotLight(0xffd28a, 0, 30, Math.PI / 4, 0.5, 1.0);
    buildingLight.position.set(spb.x - 4, 9, spb.z + 14);
    buildingLight.target.position.set(spb.x - 4, 3, spb.z + 6);
    scene.add(buildingLight);
    scene.add(buildingLight.target);

    // ─── Snow particles ────────────────────────────────
    const SNOW = 350;
    const snowGeo = new THREE.BufferGeometry();
    const snowPos = new Float32Array(SNOW * 3);
    const snowSpeed = new Float32Array(SNOW);
    const snowSize = new Float32Array(SNOW);
    for (let i = 0; i < SNOW; i++) {
      snowPos[i * 3] = spb.x + (Math.random() - 0.5) * 35;
      snowPos[i * 3 + 1] = Math.random() * 22;
      snowPos[i * 3 + 2] = spb.z + (Math.random() - 0.5) * 30;
      snowSpeed[i] = 0.04 + Math.random() * 0.07;
      snowSize[i] = 0.1 + Math.random() * 0.18;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    snowGeo.setAttribute('size', new THREE.BufferAttribute(snowSize, 1));
    const snowMat = new THREE.PointsMaterial({
      color: 0xeaf2ff, size: 0.18, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const snow = new THREE.Points(snowGeo, snowMat);
    scene.add(snow);

    // Ambient star field
    const STARS = 220;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 130;
      starPos[i * 3 + 1] = 5 + Math.random() * 40;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.1, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    // ─── Post-processing ────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(profile.pixelRatio);
    composer.setSize(W, H);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(W, H),
      profile.bloomStrength,
      profile.bloomRadius,
      profile.bloomThreshold
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ─── Animation timeline ────────────────────────────
    const T_SHOW = 3.5;
    const T_LOAD = 2.0;
    const T_DRIVE = 9.0;   // ← real road feel: 9 seconds across the country
    const T_LIFT = 3.5;
    const T_HOLD = 2.0;
    const T1 = T_SHOW;
    const T2 = T1 + T_LOAD;
    const T3 = T2 + T_DRIVE;
    const T4 = T3 + T_LIFT;
    const TOTAL = T4 + T_HOLD;

    // Distance display in km — Chelyabinsk to St Petersburg is ~2,160 km road
    const TOTAL_KM = 2160;

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const lerp = (a, b, t) => a + (b - a) * t;

    // Camera storyboard — wider follow shots so the country feels big
    const camFrames = [
      // Act 1: SHOW — 3/4 view of crane in Chelyabinsk
      { t: 0,       pos: [chel.x + 9, 5.5, chel.z + 10],  look: [chel.x + 1.2, 1.5, chel.z + 1.5] },
      { t: T1,      pos: [chel.x + 7, 4,   chel.z + 8],   look: [chel.x + 1.2, 1.5, chel.z + 1.5] },
      // Act 2: LOAD — pull back to see truck and crane both
      { t: T2,      pos: [chel.x + 12, 7,  chel.z + 9],   look: [chel.x, 1.5, chel.z + 1] },
      // Act 3: DRIVE — high overhead, the country opens up
      { t: T2 + 0.7, pos: [chel.x - 4, 32, chel.z + 16],  look: [chel.x, 0, chel.z + 1] },
      { t: T2 + T_DRIVE / 2, pos: [(chel.x + spb.x) / 2, 38, (chel.z + spb.z) / 2 + 18], look: [(chel.x + spb.x) / 2, 0, (chel.z + spb.z) / 2] },
      { t: T3 - 0.5, pos: [spb.x + 8, 28, spb.z + 18],    look: [spb.x, 0, spb.z + 3] },
      // Act 4: LIFT — low cinematic angle on building + crane
      { t: T3 + 0.3, pos: [spb.x + 6, 5, spb.z + 14],     look: [spb.x - 2, 5, spb.z + 4] },
      { t: T4,      pos: [spb.x + 11, 7, spb.z + 16],     look: [spb.x - 3, 6, spb.z + 4] },
      // Act 5: HOLD — wide cinematic
      { t: TOTAL,   pos: [spb.x + 18, 11, spb.z + 20],    look: [spb.x - 3, 4.5, spb.z + 4] },
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

    // Truck orientation: model's forward = +X local, so rotation.y =
    // atan2(-dir.z, dir.x) puts +X local along the world (dir.x, 0, dir.z).
    const orientToward = (obj, dir) => {
      if (dir.lengthSq() < 0.0001) return;
      obj.rotation.y = Math.atan2(-dir.z, dir.x);
    };

    // City labels in screen space
    let labelLang = i18n.language || 'ru';
    const onLangChanged = (lng) => { labelLang = lng || 'ru'; };
    i18n.on('languageChanged', onLangChanged);

    const updateLabels = () => {
      const arr = cityNodes.map(c => {
        const v = new THREE.Vector3(c.sceneX, 4, c.sceneZ);
        v.project(camera);
        return {
          name: labelLang === 'en' ? c.nameEn : c.nameRu,
          x: (v.x * 0.5 + 0.5) * W,
          y: (-v.y * 0.5 + 0.5) * H,
          visible: v.z < 1,
          color: '#' + c.color.toString(16).padStart(6, '0'),
        };
      });
      setLabels(arr);
    };

    const clock = new THREE.Clock();
    let animId, isVisible = false;

    // Boom angles. Model: rotation.z=0 → boom horizontal (+X);
    // rotation.z = +Pi/2 → boom straight up.
    const BOOM_HORIZ = 0;
    const BOOM_SCAN = -0.05;        // tiny tilt for "scanning" feel
    const BOOM_VERTICAL = Math.PI / 2 + 0.05; // stowed straight up, slight backward
    const BOOM_LIFT = Math.PI / 2 - 0.55;     // angled toward roof in act 4

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();
      const time = elapsed % TOTAL;
      lerpCam(time);

      // City breathing
      cityNodes.forEach(c => {
        c.dot.scale.setScalar(1 + Math.sin(elapsed * 2.4 + c.sceneX * 0.1) * 0.18);
        c.ring.scale.setScalar(1 + Math.sin(elapsed * 1.6 + c.sceneZ * 0.1) * 0.2);
        c.ring.material.opacity = 0.35 + Math.sin(elapsed * 1.6) * 0.2;
        c.ring2.scale.setScalar(1 + Math.sin(elapsed * 0.9 + c.sceneZ * 0.05) * 0.3);
        c.ring2.material.opacity = 0.15 + Math.sin(elapsed * 0.9) * 0.1;
        c.beam.material.opacity = 0.3 + Math.sin(elapsed * 1.5 + c.sceneX) * 0.12;
      });

      // Outline subtle pulse
      outline.material.opacity = 0.5 + Math.sin(elapsed * 0.5) * 0.05;

      // Crane warning beacon — rapid pulse
      beacon.material.color.setHSL(0.5 + Math.sin(elapsed * 4) * 0.05, 0.7, 0.5);
      beacon.scale.setScalar(0.9 + Math.sin(elapsed * 8) * 0.25);

      // ─── ACT 1: SHOW (crane in Chelyabinsk) ─
      if (time < T1) {
        truck.visible = false;
        building.visible = false;
        crane.position.set(chel.x + 1.2, 0, chel.z + 1.5);
        crane.rotation.y = -Math.PI * 0.15;
        boomGroup.rotation.z = lerp(BOOM_HORIZ, BOOM_SCAN, easeInOut(time / T1));
        turret.rotation.y = Math.sin(elapsed * 0.4) * 0.2;
        trailLine.geometry.setDrawRange(0, 0);
        snowMat.opacity = 0;
        buildingLight.intensity = 0;
        setProgress({ km: 0, pct: 0 });
      }

      // ─── ACT 2: LOAD (boom rises, crane settles on truck) ─
      else if (time < T2) {
        const p = easeInOut((time - T1) / T_LOAD);
        truck.visible = true;
        // Truck stands ready next to crane, facing +X (toward route start direction)
        const route0 = routeCurve.getPointAt(0);
        const route0_1 = routeCurve.getPointAt(0.005);
        const startDir = new THREE.Vector3().subVectors(route0_1, route0);
        truck.position.set(chel.x + 0.2, 0, chel.z + 0.6);
        orientToward(truck, startDir);

        // Boom rotates from horizontal to vertical-stowed
        boomGroup.rotation.z = lerp(BOOM_SCAN, BOOM_VERTICAL, p);
        // Crane glides from its standalone spot onto the deck behind cabin
        // Crane local +X = forward = same as truck. So crane faces same way.
        crane.position.set(
          lerp(chel.x + 1.2, chel.x - 0.6, p),
          lerp(0, 0.55, p),                  // sit on truck deck (top y = 0.875)
          lerp(chel.z + 1.5, chel.z + 0.6, p)
        );
        crane.rotation.y = lerp(-Math.PI * 0.15, truck.rotation.y, p);
        turret.rotation.y = lerp(Math.sin(elapsed * 0.4) * 0.2, 0, p);
        trailLine.geometry.setDrawRange(0, 0);
        snowMat.opacity = 0;
        setProgress({ km: 0, pct: 0 });
      }

      // ─── ACT 3: DRIVE (truck rolls along the route) ─
      else if (time < T3) {
        const rawP = (time - T2) / T_DRIVE;
        const p = easeInOut(rawP);
        const pos = routeCurve.getPointAt(p);
        const ahead = routeCurve.getPointAt(Math.min(p + 0.005, 1));
        const dir = new THREE.Vector3().subVectors(ahead, pos);

        truck.visible = true;
        truck.position.copy(pos);
        truck.position.y = 0;
        orientToward(truck, dir);
        // Crane rides on truck deck — needs to inherit truck rotation,
        // sit at the deck height and a slight backward offset along truck local -X.
        // We do that by attaching crane to truck position + an offset rotated by truck.rotation.y.
        const back = new THREE.Vector3(-1.5, 0, 0);
        back.applyAxisAngle(new THREE.Vector3(0, 1, 0), truck.rotation.y);
        crane.position.set(
          truck.position.x + back.x,
          0.55,
          truck.position.z + back.z
        );
        crane.rotation.y = truck.rotation.y;

        // Boom remains stowed vertical
        boomGroup.rotation.z = BOOM_VERTICAL;
        // Trail line draws progressively
        trailLine.geometry.setDrawRange(0, Math.floor(p * 260));
        // Snow fades in as we approach Petersburg
        snowMat.opacity = lerp(0, 0.85, Math.min(1, rawP * 1.3));
        // Building appears as we get close (last 35%)
        building.visible = rawP > 0.55;
        // Distance counter
        setProgress({ km: Math.floor(p * TOTAL_KM), pct: Math.floor(p * 100) });
      }

      // ─── ACT 4: LIFT (truck stops, boom tilts toward roof) ─
      else if (time < T4) {
        const p = easeOut((time - T3) / T_LIFT);
        const pos = routeCurve.getPointAt(1);
        const aheadEnd = routeCurve.getPointAt(0.99);
        const dirEnd = new THREE.Vector3().subVectors(pos, aheadEnd);
        truck.visible = true;
        truck.position.copy(pos);
        truck.position.y = 0;
        orientToward(truck, dirEnd);
        const back = new THREE.Vector3(-1.5, 0, 0);
        back.applyAxisAngle(new THREE.Vector3(0, 1, 0), truck.rotation.y);
        crane.position.set(pos.x + back.x, 0.55, pos.z + back.z);
        crane.rotation.y = truck.rotation.y;
        // Turret swivels ~90° to face the building (which sits to the truck's right side)
        turret.rotation.y = lerp(0, -Math.PI / 2, p);
        // Boom swings from vertical-stowed down toward the roof
        boomGroup.rotation.z = lerp(BOOM_VERTICAL, BOOM_LIFT, p);
        building.visible = true;
        buildingLight.intensity = lerp(0, 1.6, p);
        snowMat.opacity = 0.85 + Math.sin(elapsed * 2) * 0.05;
        trailLine.geometry.setDrawRange(0, 260);
        setProgress({ km: TOTAL_KM, pct: 100 });
      }

      // ─── ACT 5: HOLD (final cinematic) ─
      else {
        const pos = routeCurve.getPointAt(1);
        const aheadEnd = routeCurve.getPointAt(0.99);
        const dirEnd = new THREE.Vector3().subVectors(pos, aheadEnd);
        truck.visible = true;
        truck.position.copy(pos);
        truck.position.y = 0;
        orientToward(truck, dirEnd);
        const back = new THREE.Vector3(-1.5, 0, 0);
        back.applyAxisAngle(new THREE.Vector3(0, 1, 0), truck.rotation.y);
        crane.position.set(pos.x + back.x, 0.55, pos.z + back.z);
        crane.rotation.y = truck.rotation.y;
        turret.rotation.y = -Math.PI / 2;
        boomGroup.rotation.z = BOOM_LIFT + Math.sin(elapsed * 1.2) * 0.015;
        building.visible = true;
        buildingLight.intensity = 1.6 + Math.sin(elapsed * 2) * 0.15;
        snowMat.opacity = 0.85;
      }

      // Snow drift
      const snowArr = snow.geometry.attributes.position.array;
      for (let i = 0; i < SNOW; i++) {
        snowArr[i * 3 + 1] -= snowSpeed[i];
        snowArr[i * 3] += Math.sin(elapsed * 0.5 + i) * 0.005;
        if (snowArr[i * 3 + 1] < 0.5) {
          snowArr[i * 3 + 1] = 22;
          snowArr[i * 3] = spb.x + (Math.random() - 0.5) * 35;
          snowArr[i * 3 + 2] = spb.z + (Math.random() - 0.5) * 30;
        }
      }
      snow.geometry.attributes.position.needsUpdate = true;

      updateLabels();
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
      {/* Live distance HUD — top right */}
      <div style={{
        position: 'absolute', top: 14, right: 16,
        background: 'rgba(13,13,26,0.78)',
        border: '1px solid rgba(45,163,154,0.35)',
        borderRadius: 8, padding: '6px 12px',
        fontFamily: 'monospace', fontSize: 11,
        color: '#2da39a', pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ opacity: 0.7, fontSize: 9, letterSpacing: '0.6px' }}>
          {i18n.language === 'en' ? 'DISTANCE' : 'ПРОЙДЕНО'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.5px' }}>
          {progress.km.toLocaleString('ru-RU')} / 2 160 км
        </div>
        <div style={{
          marginTop: 4, height: 3, width: 130,
          background: 'rgba(45,163,154,0.15)', borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: progress.pct + '%', height: '100%',
            background: 'linear-gradient(90deg, #2da39a, #6B4FA0)',
            transition: 'width 0.2s linear',
          }} />
        </div>
      </div>
      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)', fontSize: 12,
        fontFamily: 'var(--font-display)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>{t('creator.scene.logisticsCaption')}</div>
    </div>
  );
}
