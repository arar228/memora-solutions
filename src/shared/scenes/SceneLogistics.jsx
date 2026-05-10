import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { disposeScene } from './_shared/disposeScene';

// Russia border [lon, lat] — ~70 key vertices for recognizable outline
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
  { name: 'Санкт-Петербург', lon: 30.3, lat: 59.9, color: 0x6B4FA0, role: 'end' },
  { name: 'Москва', lon: 37.6, lat: 55.75, color: 0xffffff, role: 'pass' },
  { name: 'Казань', lon: 49.1, lat: 55.8, color: 0xffa500, role: 'join' },
  { name: 'Челябинск', lon: 61.4, lat: 55.2, color: 0xFFA500, role: 'start' },
];

export default function SceneLogistics() {
  const mountRef = useRef(null);
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.002);

    const camera = new THREE.PerspectiveCamera(40, W / H, 1, 800);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x4444aa, 0.5));
    const dL = new THREE.DirectionalLight(0xffffff, 0.7);
    dL.position.set(40, 150, 80);
    scene.add(dL);

    // === MAP ===
    const shape = new THREE.Shape();
    const fp = toXZ(BORDER[0][0], BORDER[0][1]);
    shape.moveTo(fp.x, fp.z);
    for (let i = 1; i < BORDER.length; i++) {
      const p = toXZ(BORDER[i][0], BORDER[i][1]);
      shape.lineTo(p.x, p.z);
    }
    shape.closePath();

    // Land surface
    const mapGeo = new THREE.ShapeGeometry(shape, 1);
    const mapMat = new THREE.MeshStandardMaterial({
      color: 0x12122a, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide,
      emissive: 0x080818, emissiveIntensity: 0.4
    });
    const mapMesh = new THREE.Mesh(mapGeo, mapMat);
    mapMesh.rotation.x = -Math.PI / 2;
    scene.add(mapMesh);

    // Glowing border
    const bPts = BORDER.map(([lo, la]) => { const p = toXZ(lo, la); return new THREE.Vector3(p.x, 0.5, p.z); });
    bPts.push(bPts[0].clone());
    const bLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(bPts),
      new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.7 })
    );
    scene.add(bLine);

    // Inner grid for tech feel
    const gridHelper = new THREE.GridHelper(300, 60, 0x1a1a3a, 0x0f0f25);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // === CITIES ===
    const cityMeshes = [];
    const cityGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const ringGeo = new THREE.RingGeometry(2.5, 3.2, 32);

    CITIES.forEach(c => {
      const pos = toXZ(c.lon, c.lat);

      // Sphere marker
      const mat = new THREE.MeshBasicMaterial({ color: c.color });
      const mesh = new THREE.Mesh(cityGeo, mat);
      mesh.position.set(pos.x, 1, pos.z);
      scene.add(mesh);

      // Ring around marker
      const rMat = new THREE.MeshBasicMaterial({ color: c.color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pos.x, 0.3, pos.z);
      scene.add(ring);

      cityMeshes.push({ mesh, ring, ...c, sceneX: pos.x, sceneZ: pos.z });
    });

    // === ROUTE CURVE ===
    const chel = toXZ(61.4, 55.2);
    const kaz = toXZ(49.1, 55.8);
    const mos = toXZ(37.6, 55.75);
    const spb = toXZ(30.3, 59.9);

    const routeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(chel.x, 2, chel.z),
      new THREE.Vector3((chel.x + kaz.x) / 2, 2, (chel.z + kaz.z) / 2 - 3),
      new THREE.Vector3(kaz.x, 2, kaz.z),
      new THREE.Vector3((kaz.x + mos.x) / 2, 2, (kaz.z + mos.z) / 2 + 2),
      new THREE.Vector3(mos.x, 2, mos.z),
      new THREE.Vector3((mos.x + spb.x) / 2, 2, (mos.z + spb.z) / 2 - 3),
      new THREE.Vector3(spb.x, 2, spb.z),
    ], false, 'catmullrom', 0.5);

    // Route trail line (drawn progressively)
    const routePoints = routeCurve.getPoints(200);
    const trailGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
    const trailMat = new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.9 });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    trailLine.geometry.setDrawRange(0, 0);
    scene.add(trailLine);

    // === PRODUCT (assembly of pieces) ===
    const productGroup = new THREE.Group();
    const pieceMat = new THREE.MeshStandardMaterial({ color: 0xffa500, emissive: 0x804000, emissiveIntensity: 0.3 });
    const pieceGeo = new THREE.BoxGeometry(1, 1, 1);

    // Main body pieces (assemble at Chelyabinsk)
    const mainPieces = [];
    const mainOffsets = [
      [-0.6, 0, -0.6], [0.6, 0, -0.6], [-0.6, 0, 0.6], [0.6, 0, 0.6]
    ];
    mainOffsets.forEach(off => {
      const m = new THREE.Mesh(pieceGeo, pieceMat.clone());
      m.userData.targetOff = new THREE.Vector3(...off);
      m.userData.startOff = new THREE.Vector3(
        off[0] * 12 + (Math.random() - 0.5) * 10,
        8 + Math.random() * 6,
        off[2] * 12 + (Math.random() - 0.5) * 10
      );
      productGroup.add(m);
      mainPieces.push(m);
    });

    // Extra pieces (join at Kazan)
    const extraPieces = [];
    const extraOffsets = [[0, 1.1, 0], [0, -0.1, 0]];
    extraOffsets.forEach(off => {
      const m = new THREE.Mesh(pieceGeo, pieceMat.clone());
      m.material.color.setHex(0x6B4FA0);
      m.material.emissive.setHex(0x3b2060);
      m.userData.targetOff = new THREE.Vector3(...off);
      m.visible = false;
      productGroup.add(m);
      extraPieces.push(m);
    });

    productGroup.position.set(chel.x, 2, chel.z);
    scene.add(productGroup);

    // === AIRPLANE MODEL ===
    const plane3D = new THREE.Group();
    // Fuselage
    const fuselageGeo = new THREE.ConeGeometry(0.6, 4, 8);
    const fuselageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2da39a, emissiveIntensity: 0.3 });
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselage.rotation.x = Math.PI / 2; // Point forward (along Z)
    plane3D.add(fuselage);
    // Wings
    const wingGeo = new THREE.BoxGeometry(6, 0.15, 1.5);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0x2da39a, emissiveIntensity: 0.2 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.z = 0.5;
    plane3D.add(wings);
    // Tail fin
    const tailGeo = new THREE.BoxGeometry(0.15, 1.5, 1);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x6B4FA0, emissive: 0x6B4FA0, emissiveIntensity: 0.3 });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(0, 0.6, 1.8);
    plane3D.add(tail);
    // Tail wings
    const tailWingGeo = new THREE.BoxGeometry(2.5, 0.12, 0.8);
    const tailWings = new THREE.Mesh(tailWingGeo, wingMat.clone());
    tailWings.position.set(0, 0, 1.8);
    plane3D.add(tailWings);
    plane3D.visible = false;
    plane3D.scale.setScalar(1.2);
    scene.add(plane3D);
    let prevPlanePos = null;

    // === ANIMATION ===
    const clock = new THREE.Clock();
    let animId, isVisible = false;

    // Phase timing
    const ASSEMBLY_DUR = 3;
    const TRAVEL1_DUR = 3;   // Chel → Kazan
    const JOIN_DUR = 1.5;
    const TRAVEL2_DUR = 4;   // Kazan → SPb
    const HOLD_DUR = 2;
    const TOTAL = ASSEMBLY_DUR + TRAVEL1_DUR + JOIN_DUR + TRAVEL2_DUR + HOLD_DUR;
    const T1 = ASSEMBLY_DUR;
    const T2 = T1 + TRAVEL1_DUR;
    const T3 = T2 + JOIN_DUR;
    const T4 = T3 + TRAVEL2_DUR;

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

    // Camera keyframes: { time, pos, lookAt }
    const camFrames = [
      { t: 0,    pos: [chel.x + 15, 40, chel.z + 25], look: [chel.x, 0, chel.z] },
      { t: T1,   pos: [chel.x + 10, 30, chel.z + 20], look: [chel.x, 2, chel.z] },
      { t: T2,   pos: [(chel.x+spb.x)/2, 80, 50],     look: [(chel.x+spb.x)/2, 0, (chel.z+spb.z)/2] },
      { t: T3,   pos: [mos.x + 20, 50, mos.z + 30],   look: [mos.x, 0, mos.z] },
      { t: T4,   pos: [0, 120, 60],                    look: [-20, 0, -5] },
      { t: TOTAL, pos: [0, 120, 60],                   look: [-20, 0, -5] },
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
        THREE.MathUtils.lerp(a.pos[0], b.pos[0], p),
        THREE.MathUtils.lerp(a.pos[1], b.pos[1], p),
        THREE.MathUtils.lerp(a.pos[2], b.pos[2], p)
      );
      camera.lookAt(
        THREE.MathUtils.lerp(a.look[0], b.look[0], p),
        THREE.MathUtils.lerp(a.look[1], b.look[1], p),
        THREE.MathUtils.lerp(a.look[2], b.look[2], p)
      );
    };

    // Update city labels screen positions
    const updateLabels = () => {
      const arr = cityMeshes.map(c => {
        const v = new THREE.Vector3(c.sceneX, 4, c.sceneZ);
        v.project(camera);
        return {
          name: c.name,
          x: (v.x * 0.5 + 0.5) * W,
          y: (-v.y * 0.5 + 0.5) * H,
          visible: v.z < 1
        };
      });
      setLabels(arr);
    };

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();
      const t = elapsed % TOTAL;

      // Camera
      lerpCam(t);

      // City pulsation
      const time = elapsed;
      cityMeshes.forEach(c => {
        c.mesh.scale.setScalar(1 + Math.sin(time * 3 + c.sceneX) * 0.15);
        c.ring.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
        c.ring.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
      });

      // Border glow pulsation
      bLine.material.opacity = 0.5 + Math.sin(time * 1.5) * 0.2;

      // === PHASE: ASSEMBLY (0 → T1) ===
      if (t < T1) {
        const p = easeOut(Math.min(1, t / T1));
        mainPieces.forEach(m => {
          m.position.lerpVectors(m.userData.startOff, m.userData.targetOff, p);
        });
        extraPieces.forEach(m => { m.visible = false; });
        productGroup.position.set(chel.x, 2, chel.z);
        plane3D.visible = false;
        trailLine.geometry.setDrawRange(0, 0);
      }

      // === PHASE: TRAVEL Chel → Kazan (T1 → T2) ===
      if (t >= T1 && t < T2) {
        const p = easeInOut((t - T1) / TRAVEL1_DUR);
        const routeP = p * 0.4; // 0-40% of route = Chel→Kazan
        const pos = routeCurve.getPointAt(routeP);
        productGroup.position.copy(pos);
        plane3D.visible = true;
        plane3D.position.copy(pos);
        plane3D.position.y += 3;
        // Orient plane along route direction
        if (prevPlanePos) {
          const dir = new THREE.Vector3().subVectors(pos, prevPlanePos);
          if (dir.length() > 0.01) plane3D.lookAt(pos.x + dir.x, pos.y + 3, pos.z + dir.z);
        }
        prevPlanePos = pos.clone();
        trailLine.geometry.setDrawRange(0, Math.floor(routeP * 200));
      }

      // === PHASE: JOIN at Kazan (T2 → T3) ===
      if (t >= T2 && t < T3) {
        const p = easeOut((t - T2) / JOIN_DUR);
        const pos = routeCurve.getPointAt(0.4);
        productGroup.position.copy(pos);
        plane3D.position.copy(pos); plane3D.position.y += 3;

        extraPieces.forEach(m => {
          m.visible = true;
          const far = new THREE.Vector3(m.userData.targetOff.x + 8, m.userData.targetOff.y + 6, m.userData.targetOff.z - 8);
          m.position.lerpVectors(far, m.userData.targetOff, p);
        });
      }

      // === PHASE: TRAVEL Kazan → SPb (T3 → T4) ===
      if (t >= T3 && t < T4) {
        const p = easeInOut((t - T3) / TRAVEL2_DUR);
        const routeP = 0.4 + p * 0.6; // 40-100% of route
        const pos = routeCurve.getPointAt(Math.min(routeP, 1));
        productGroup.position.copy(pos);
        plane3D.position.copy(pos); plane3D.position.y += 3;
        if (prevPlanePos) {
          const dir = new THREE.Vector3().subVectors(pos, prevPlanePos);
          if (dir.length() > 0.01) plane3D.lookAt(pos.x + dir.x, pos.y + 3, pos.z + dir.z);
        }
        prevPlanePos = pos.clone();
        trailLine.geometry.setDrawRange(0, Math.floor(routeP * 200));
      }

      // === PHASE: HOLD ===
      if (t >= T4) {
        const pos = routeCurve.getPointAt(1);
        productGroup.position.copy(pos);
        plane3D.visible = true;
        plane3D.position.copy(pos); plane3D.position.y += 3;
        trailLine.geometry.setDrawRange(0, 200);
        // Celebrate pulse
        const pulse = Math.sin((t - T4) * 8) * 0.3 + 1.2;
        productGroup.scale.setScalar(pulse);
      }

      if (t < T4) productGroup.scale.setScalar(1);

      // Plane glow pulse
      if (plane3D.visible) {
        fuselageMat.emissiveIntensity = 0.3 + Math.sin(time * 6) * 0.15;
      }

      updateLabels();
      renderer.render(scene, camera);
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
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
      observer.disconnect();
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
          textShadow: '0 0 8px rgba(45,163,154,0.8), 0 2px 4px rgba(0,0,0,0.9)',
          fontWeight: 600, letterSpacing: '0.5px'
        }}>{l.name}</div>
      ))}
    </div>
  );
}
