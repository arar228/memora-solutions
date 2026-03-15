import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/* ======================================================================
   DOMATRIX — 23 engineering systems, OPTIMIZED for performance
   - No per-node PointLights (was 23 lights!)
   - Shared geometries & materials
   - Bezier connections reduced to 8 points
   - No MeshPhysicalMaterial (expensive)
   - No fog (extra pass)
   - Throttled raycaster
   ====================================================================== */

const SYSTEMS = [
  { id: 'СВН',     name: 'Видеонаблюдение',                           color: 0x2196F3, icon: '📹' },
  { id: 'СКУД',    name: 'Контроль и управление доступом',             color: 0xF44336, icon: '🔐' },
  { id: 'ЛВС',     name: 'Локальная вычислительная сеть',              color: 0x6B4FA0, icon: '🌐' },
  { id: 'РТ',      name: 'Радиофикация и телевидение',                 color: 0x00BCD4, icon: '📡' },
  { id: 'СДС',     name: 'Система диспетчерской связи',                color: 0xFF9800, icon: '📞' },
  { id: 'СС',      name: 'Сети связи',                                color: 0x4CAF50, icon: '🔗' },
  { id: 'МГН',     name: 'Системы для маломобильных групп населения',  color: 0x9C27B0, icon: '♿' },
  { id: 'СКС',     name: 'Структурированная кабельная система',        color: 0x795548, icon: '🔌' },
  { id: 'СОС',     name: 'Система охранной сигнализации',              color: 0xE91E63, icon: '🚨' },
  { id: 'АПС',     name: 'Автоматическая пожарная сигнализация',       color: 0xFF5722, icon: '🔥' },
  { id: 'СОУЭ',    name: 'Система оповещения и управления эвакуацией', color: 0xFF6F00, icon: '📢' },
  { id: 'СКЗ',     name: 'Система контроля загазованности',            color: 0xCDDC39, icon: '💨' },
  { id: 'СУД',     name: 'Система управления доступом',                color: 0xF06292, icon: '🚪' },
  { id: 'АУГПТ',   name: 'Автоматическое газовое пожаротушение',       color: 0xB71C1C, icon: '🧯' },
  { id: 'АДИС',    name: 'Автоматизированная диспетчерская ИС',        color: 0x1565C0, icon: '🖥️' },
  { id: 'АДИС-ВТ', name: 'Диспетчеризация лифтов',                    color: 0x0277BD, icon: '🛗' },
  { id: 'НСС',     name: 'Наружные сети связи',                        color: 0x00695C, icon: '📶' },
  { id: 'ОЗДС',    name: 'Охранно-защитная дератизационная система',   color: 0x827717, icon: '🛡️' },
  { id: 'СС-АИТ',  name: 'Связь для автоматизации теплового пункта',   color: 0xEF6C00, icon: '🌡️' },
  { id: 'АК-ОВ',   name: 'Автоматизация отопления и вентиляции',       color: 0x2E7D32, icon: '❄️' },
  { id: 'АСУЭ',    name: 'Автоматизированная система управления электроснабжением', color: 0xFFC107, icon: '⚡' },
  { id: 'АК-АИТ',  name: 'Автоматизация индивидуального теплового пункта', color: 0xD84315, icon: '🏭' },
  { id: 'АСКУВТ',  name: 'Автоматизированный учет водо- и теплопотребления', color: 0x0097A7, icon: '💧' },
];

export default function SceneDomatrix() {
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', id: '', x: 0, y: 0 });
  const [activeSystem, setActiveSystem] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');

    const camera = new THREE.PerspectiveCamera(40, W / H, 1, 300);
    camera.position.set(50, 35, 70);
    camera.lookAt(0, 10, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 30;
    controls.maxDistance = 180;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2 + 0.2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 10, 0);

    // 2 lights only (instead of 23+3)
    scene.add(new THREE.AmbientLight(0x445566, 0.6));
    const dL = new THREE.DirectionalLight(0xffffff, 0.7);
    dL.position.set(30, 50, 40);
    scene.add(dL);

    // Floor (simple)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5;
    scene.add(floor);
    scene.add(new THREE.GridHelper(150, 30, 0x1a1a3a, 0x0f0f20));

    // === BUILDING (optimized — fewer meshes) ===
    const building = new THREE.Group();
    const bW = 60, bH = 48, bD = 24, floors = 6, floorH = bH / floors;

    // Glass walls — use MeshStandardMaterial (not Physical — much cheaper)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a2244, transparent: true, opacity: 0.1,
      roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide
    });
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x444466 });

    // 4 glass panels
    const wallF = new THREE.Mesh(new THREE.PlaneGeometry(bW, bH), glassMat);
    wallF.position.set(0, bH/2, bD/2); building.add(wallF);
    const wallB = new THREE.Mesh(new THREE.PlaneGeometry(bW, bH), glassMat);
    wallB.position.set(0, bH/2, -bD/2); wallB.rotation.y = Math.PI; building.add(wallB);
    const wallL = new THREE.Mesh(new THREE.PlaneGeometry(bD, bH), glassMat);
    wallL.position.set(-bW/2, bH/2, 0); wallL.rotation.y = Math.PI/2; building.add(wallL);
    const wallR = new THREE.Mesh(new THREE.PlaneGeometry(bD, bH), glassMat);
    wallR.position.set(bW/2, bH/2, 0); wallR.rotation.y = -Math.PI/2; building.add(wallR);

    // Building wireframe (1 draw call for entire frame)
    const bGeo = new THREE.BoxGeometry(bW, bH, bD);
    const bEdges = new THREE.EdgesGeometry(bGeo);
    const bWire = new THREE.LineSegments(bEdges, new THREE.LineBasicMaterial({ color: 0x444466 }));
    bWire.position.y = bH/2; building.add(bWire);
    bGeo.dispose();

    // Floor slabs — use LineSegments only (no solid meshes)
    const slabLineMat = new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.15 });
    for (let f = 0; f <= floors; f++) {
      const y = f * floorH;
      const sGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(bW - 0.5, 0.1, bD - 0.5));
      const sLine = new THREE.LineSegments(sGeo, slabLineMat);
      sLine.position.y = y; building.add(sLine);
    }

    // Mullions — just lines (2 draw calls instead of 30+)
    const mullionPts = [];
    for (let i = 0; i < 8; i++) {
      const x = -bW/2 + (i + 1) * bW / 9;
      [bD/2, -bD/2].forEach(z => {
        mullionPts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, bH, z));
      });
    }
    for (let f = 0; f < floors; f++) {
      const y = f * floorH + floorH * 0.6;
      [bD/2, -bD/2].forEach(z => {
        mullionPts.push(new THREE.Vector3(-bW/2, y, z), new THREE.Vector3(bW/2, y, z));
      });
    }
    const mullionGeo = new THREE.BufferGeometry().setFromPoints(mullionPts);
    building.add(new THREE.LineSegments(mullionGeo, new THREE.LineBasicMaterial({ color: 0x333355, transparent: true, opacity: 0.3 })));

    // Roof equipment (3 simple boxes = 3 draw calls)
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x555577 });
    for (let i = 0; i < 3; i++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2), roofMat);
      ac.position.set(-12 + i * 12, bH + 1, -4); building.add(ac);
    }
    // Antenna
    const ant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5, 0.12), roofMat);
    ant.position.set(20, bH + 3, 5); building.add(ant);

    // Entrance glow bar
    const entBar = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x2da39a })
    );
    entBar.position.set(0, floorH * 0.85, bD/2 + 0.2); building.add(entBar);

    scene.add(building);

    // === SYSTEM NODES ===
    const nodes = [];
    // SHARED geometry (1 sphere for all)
    const nodeGeo = new THREE.SphereGeometry(1.2, 12, 12);

    SYSTEMS.forEach((sys, idx) => {
      const f = idx % floors;
      const col = Math.floor(idx / floors);
      const cols = Math.ceil(SYSTEMS.length / floors);
      const y = f * floorH + floorH / 2;
      const x = -bW/2 + 6 + col * ((bW - 12) / cols);
      const z = ((idx * 7.3) % (bD - 6)) - (bD - 6) / 2; // deterministic, not random

      const mat = new THREE.MeshStandardMaterial({
        color: sys.color, emissive: sys.color, emissiveIntensity: 0.4,
        roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.9
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { sys, connections: [] };
      building.add(mesh);
      nodes.push({ mesh, sys });
    });

    // === CONNECTIONS (straight lines — no bezier for perf) ===
    const connections = [];
    const connBaseMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });

    const connPairs = new Set();
    nodes.forEach((n1, i) => {
      [(i + 1) % nodes.length, (i + 3) % nodes.length].forEach(j => {
        const key = Math.min(i, j) + '-' + Math.max(i, j);
        if (i !== j && !connPairs.has(key)) {
          connPairs.add(key);
          const n2 = nodes[j];
          const geo = new THREE.BufferGeometry().setFromPoints([n1.mesh.position, n2.mesh.position]);
          const lMat = connBaseMat.clone();
          const line = new THREE.Line(geo, lMat);
          building.add(line);
          const conn = { n1, n2, line, lMat, progress: 0, isPulsing: false };
          connections.push(conn);
          n1.mesh.userData.connections.push(conn);
          n2.mesh.userData.connections.push(conn);
        }
      });
    });

    // === INTERACTION (throttled raycaster) ===
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode = null;
    let rayDirty = false;
    let lastMouseX = 0, lastMouseY = 0;

    const allMeshes = nodes.map(n => n.mesh);

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
      rayDirty = true;
    };

    const doRaycast = () => {
      if (!rayDirty) return;
      rayDirty = false;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(allMeshes);

      if (hits.length > 0) {
        const obj = hits[0].object;
        if (hoveredNode !== obj) {
          if (hoveredNode) resetHover();
          hoveredNode = obj;
          hoveredNode.scale.set(1.5, 1.5, 1.5);
          hoveredNode.material.emissiveIntensity = 0.8;
          nodes.forEach(n => { if (n.mesh !== hoveredNode) n.mesh.material.opacity = 0.25; });
          hoveredNode.userData.connections.forEach(c => {
            c.lMat.opacity = 0.6;
            c.lMat.color.setHex(hoveredNode.userData.sys.color);
          });
          setTooltip({ visible: true, text: hoveredNode.userData.sys.name, id: hoveredNode.userData.sys.id, x: lastMouseX, y: lastMouseY });
        } else {
          setTooltip(t => ({ ...t, x: lastMouseX, y: lastMouseY }));
        }
        renderer.domElement.style.cursor = 'pointer';
      } else {
        if (hoveredNode) { resetHover(); hoveredNode = null; }
        setTooltip(t => ({ ...t, visible: false }));
        renderer.domElement.style.cursor = 'default';
      }
    };

    const resetHover = () => {
      if (!hoveredNode) return;
      hoveredNode.scale.set(1, 1, 1);
      hoveredNode.material.emissiveIntensity = 0.4;
      nodes.forEach(n => n.mesh.material.opacity = 0.9);
      hoveredNode.userData.connections.forEach(c => {
        c.lMat.opacity = 0.05; c.lMat.color.setHex(0xffffff);
      });
    };

    const onClick = () => {
      if (hoveredNode) {
        setActiveSystem(hoveredNode.userData.sys);
        hoveredNode.userData.connections.forEach(c => {
          c.isPulsing = true; c.progress = 0;
          c.lMat.color.setHex(hoveredNode.userData.sys.color); c.lMat.opacity = 1;
        });
      } else { setActiveSystem(null); }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // === ANIMATION (lightweight) ===
    const clock = new THREE.Clock();
    let animId, isVisible = false;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;
      const delta = clock.getDelta();
      const time = clock.elapsedTime;

      // Raycaster in animation frame (throttled — only when mouse moved)
      doRaycast();

      controls.update();

      // Slow auto-rotation only when not dragging
      if (!controls.isDragging) {
        building.rotation.y = Math.sin(time * 0.15) * 0.1;
      }

      // Only update emissive for non-hovered nodes every 4th frame
      const frame = Math.floor(time * 60);
      if (frame % 4 === 0) {
        nodes.forEach((n, i) => {
          if (hoveredNode !== n.mesh) {
            n.mesh.material.emissiveIntensity = 0.4 + Math.sin(time * 2 + i) * 0.08;
          }
        });
      }

      // Connection pulses
      connections.forEach(c => {
        if (c.isPulsing) {
          c.progress += delta * 3;
          if (c.progress >= 1) {
            c.isPulsing = false;
            const isH = hoveredNode && hoveredNode.userData.connections.includes(c);
            c.lMat.opacity = isH ? 0.6 : 0.05;
            if (!isH) c.lMat.color.setHex(0xffffff);
          } else {
            c.lMat.opacity = 1 - c.progress * 0.9;
          }
        }
      });

      // Rare ambient pulse (1-2% chance per frame)
      if (!hoveredNode && Math.random() < 0.015) {
        const rc = connections[Math.floor(Math.random() * connections.length)];
        if (!rc.isPulsing) {
          rc.isPulsing = true; rc.progress = 0; rc.lMat.opacity = 0.4;
          rc.lMat.color.setHex(SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)].color);
        }
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
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.style.cursor = 'default';
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {tooltip.visible && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 40,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(13,13,26,0.94)', color: 'white',
          padding: '8px 14px', borderRadius: '8px', fontSize: 12,
          fontFamily: 'monospace', pointerEvents: 'none', zIndex: 1000,
          border: '1px solid rgba(45,163,154,0.4)',
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(45,163,154,0.15)'
        }}>
          <span style={{ color: '#2da39a', fontWeight: 700 }}>{tooltip.id}</span>
          {' — '}{tooltip.text}
        </div>
      )}

      {activeSystem && (
        <div onClick={() => setActiveSystem(null)} style={{
          position: 'absolute', top: 20, right: 20, maxWidth: 280,
          background: 'rgba(13,13,26,0.94)',
          border: `1px solid rgba(${(activeSystem.color >> 16) & 255}, ${(activeSystem.color >> 8) & 255}, ${activeSystem.color & 255}, 0.5)`,
          borderRadius: '12px', padding: '18px', color: 'white',
          zIndex: 1000, backdropFilter: 'blur(12px)', cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'dFadeIn 0.3s ease-out'
        }}>
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>✕</div>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{activeSystem.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: `#${activeSystem.color.toString(16).padStart(6,'0')}`, marginBottom: 4, fontFamily: 'var(--font-display)' }}>{activeSystem.id}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.8)' }}>{activeSystem.name}</div>
          <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Кликните чтобы закрыть</div>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        fontFamily: 'monospace', fontSize: 12, color: '#2da39a',
        background: 'rgba(13,13,26,0.85)', padding: '6px 14px',
        borderRadius: '6px', border: '1px solid rgba(45,163,154,0.2)'
      }}>
        {SYSTEMS.length} инженерных систем
      </div>

      <style>{`@keyframes dFadeIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
