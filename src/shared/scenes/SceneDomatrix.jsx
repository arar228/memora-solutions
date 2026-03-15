import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ======================================================================
   DOMATRIX — 23 engineering systems inside a detailed smart building
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
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.004);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.5, 500);
    camera.position.set(50, 35, 70);
    camera.lookAt(0, 8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x333355, 0.5));
    const dL = new THREE.DirectionalLight(0xffffff, 0.6);
    dL.position.set(30, 50, 40); dL.castShadow = true;
    scene.add(dL);
    scene.add(new THREE.DirectionalLight(0x2da39a, 0.2).position.set(-20, 10, -20) && new THREE.DirectionalLight(0x2da39a, 0.2));

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.85 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5;
    floor.receiveShadow = true; scene.add(floor);
    scene.add(new THREE.GridHelper(200, 40, 0x1a1a3a, 0x0f0f20));

    // === BUILD DETAILED SMART BUILDING ===
    const building = new THREE.Group();
    const bW = 60, bH = 48, bD = 24;
    const floors = 6;
    const floorH = bH / floors;

    // Glass facade (semi-transparent)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2244, transparent: true, opacity: 0.12,
      roughness: 0.05, metalness: 0.9, clearcoat: 1, clearcoatRoughness: 0.05,
      side: THREE.DoubleSide
    });
    const addM = (parent, mesh, pos, rot) => {
      if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
      if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
      parent.add(mesh); return mesh;
    };
    // Front glass
    addM(building, new THREE.Mesh(new THREE.PlaneGeometry(bW, bH), glassMat), [0, bH/2, bD/2]);
    // Back glass
    addM(building, new THREE.Mesh(new THREE.PlaneGeometry(bW, bH), glassMat), [0, bH/2, -bD/2], [0, Math.PI, 0]);
    // Left glass
    addM(building, new THREE.Mesh(new THREE.PlaneGeometry(bD, bH), glassMat), [-bW/2, bH/2, 0], [0, Math.PI/2, 0]);
    // Right glass
    addM(building, new THREE.Mesh(new THREE.PlaneGeometry(bD, bH), glassMat), [bW/2, bH/2, 0], [0, -Math.PI/2, 0]);

    // Steel frame edges
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.3, metalness: 0.8 });
    const ef = 0.3; // edge frame thickness
    // Vertical corners
    [[-bW/2, bD/2], [bW/2, bD/2], [-bW/2, -bD/2], [bW/2, -bD/2]].forEach(([x, z]) => {
      addM(building, new THREE.Mesh(new THREE.BoxGeometry(ef, bH, ef), frameMat), [x, bH/2, z]);
    });
    // Top and bottom horizontal edges
    [[0, 0, bD/2], [0, 0, -bD/2]].forEach(([x, yo, z]) => {
      addM(building, new THREE.Mesh(new THREE.BoxGeometry(bW, ef, ef), frameMat), [x, yo, z]);
      addM(building, new THREE.Mesh(new THREE.BoxGeometry(bW, ef, ef), frameMat), [x, bH + yo, z]);
    });
    [[-bW/2, 0, 0], [bW/2, 0, 0]].forEach(([x, yo, z]) => {
      addM(building, new THREE.Mesh(new THREE.BoxGeometry(ef, ef, bD), frameMat), [x, yo, z]);
      addM(building, new THREE.Mesh(new THREE.BoxGeometry(ef, ef, bD), frameMat), [x, bH + yo, z]);
    });

    // Floor slabs
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.4, roughness: 0.5 });
    for (let f = 0; f <= floors; f++) {
      const y = f * floorH;
      addM(building, new THREE.Mesh(new THREE.BoxGeometry(bW - 0.5, 0.15, bD - 0.5), slabMat), [0, y, 0]);
      // Floor edge glow
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(bW - 0.5, 0.15, bD - 0.5));
      addM(building, new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.15 })), [0, y, 0]);
    }

    // Horizontal mullions on facade (window dividers)
    for (let f = 0; f < floors; f++) {
      const y = f * floorH + floorH * 0.6;
      [bD/2, -bD/2].forEach(z => {
        addM(building, new THREE.Mesh(new THREE.BoxGeometry(bW, 0.1, 0.1), frameMat), [0, y, z]);
      });
    }
    // Vertical mullions
    for (let i = 0; i < 8; i++) {
      const x = -bW/2 + (i + 1) * bW / 9;
      [bD/2, -bD/2].forEach(z => {
        addM(building, new THREE.Mesh(new THREE.BoxGeometry(0.1, bH, 0.1), frameMat), [x, bH/2, z]);
      });
    }

    // Roof equipment (simplified AC units, antennas)
    const roofY = bH + 0.5;
    // AC units
    for (let i = 0; i < 4; i++) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 2), new THREE.MeshStandardMaterial({ color: 0x555577, roughness: 0.4, metalness: 0.5 }));
      ac.position.set(-15 + i * 10, roofY + 0.75, -5);
      building.add(ac);
      // AC fan
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0x333355 }));
      fan.position.set(-15 + i * 10, roofY + 1.6, -5);
      building.add(fan);
    }
    // Antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 8), new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8 }));
    antenna.position.set(20, roofY + 3, 5);
    building.add(antenna);
    // Satellite dish
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 6, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xddddee, roughness: 0.3 }));
    dish.position.set(15, roofY + 1, 8); dish.rotation.x = -0.3;
    building.add(dish);

    // Entrance (ground floor)
    const entranceMat = new THREE.MeshStandardMaterial({ color: 0x2da39a, transparent: true, opacity: 0.3 });
    addM(building, new THREE.Mesh(new THREE.BoxGeometry(6, floorH * 0.8, 0.2), entranceMat), [0, floorH * 0.4, bD/2 + 0.1]);
    // Entrance canopy
    addM(building, new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, 3), frameMat), [0, floorH * 0.85, bD/2 + 1.5]);

    scene.add(building);

    // === SYSTEM NODES (23 systems distributed across the building) ===
    const nodes = [];
    const nodeGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const ringGeo = new THREE.TorusGeometry(1.6, 0.08, 8, 24);

    SYSTEMS.forEach((sys, idx) => {
      const f = idx % floors;
      const col = Math.floor(idx / floors);
      const y = f * floorH + floorH / 2;
      const x = -bW/2 + 6 + col * (bW - 12) / Math.ceil(SYSTEMS.length / floors);
      const z = (Math.random() - 0.5) * (bD - 6);

      // Node sphere
      const mat = new THREE.MeshStandardMaterial({
        color: sys.color, emissive: sys.color, emissiveIntensity: 0.3,
        roughness: 0.3, metalness: 0.5, transparent: true, opacity: 0.9
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { sys, origColor: sys.color, connections: [] };
      building.add(mesh);

      // Outer ring
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: sys.color, transparent: true, opacity: 0.3 }));
      ring.position.copy(mesh.position);
      ring.userData.isNodeRing = true;
      ring.userData.nodeIdx = idx;
      building.add(ring);

      // Point light
      const pL = new THREE.PointLight(sys.color, 0.15, 8);
      pL.position.copy(mesh.position);
      building.add(pL);

      nodes.push({ mesh, ring, light: pL, sys });
    });

    // === CONNECTIONS (neural network lines between systems) ===
    const connections = [];
    const connMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 });

    nodes.forEach((n1, i) => {
      // Connect to 2-3 random other systems
      const targets = [
        nodes[(i + 1) % nodes.length],
        nodes[(i + 3) % nodes.length],
        ...(i % 3 === 0 ? [nodes[(i + 7) % nodes.length]] : [])
      ];
      targets.forEach(n2 => {
        if (n1 !== n2) {
          const mid = new THREE.Vector3().lerpVectors(n1.mesh.position, n2.mesh.position, 0.5);
          mid.y += 2 + Math.random() * 3;
          const curve = new THREE.QuadraticBezierCurve3(n1.mesh.position, mid, n2.mesh.position);
          const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
          const lMat = connMat.clone();
          const line = new THREE.Line(geo, lMat);
          building.add(line);
          const conn = { n1, n2, line, lMat, progress: 0, isPulsing: false };
          connections.push(conn);
          n1.mesh.userData.connections.push(conn);
          n2.mesh.userData.connections.push(conn);
        }
      });
    });

    // === INTERACTION ===
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode = null;

    const allMeshes = nodes.map(n => n.mesh);

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(allMeshes);

      if (hits.length > 0) {
        const obj = hits[0].object;
        if (hoveredNode !== obj) {
          if (hoveredNode) resetHover();
          hoveredNode = obj;
          hoveredNode.scale.set(1.6, 1.6, 1.6);
          hoveredNode.material.emissiveIntensity = 0.8;
          nodes.forEach(n => { if (n.mesh !== hoveredNode) n.mesh.material.opacity = 0.2; });
          hoveredNode.userData.connections.forEach(c => {
            c.lMat.opacity = 0.7;
            c.lMat.color.setHex(hoveredNode.userData.sys.color);
          });
          setTooltip({ visible: true, text: hoveredNode.userData.sys.name, id: hoveredNode.userData.sys.id, x: e.clientX, y: e.clientY });
        } else {
          setTooltip(t => ({ ...t, x: e.clientX, y: e.clientY }));
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
      hoveredNode.material.emissiveIntensity = 0.3;
      nodes.forEach(n => n.mesh.material.opacity = 0.9);
      hoveredNode.userData.connections.forEach(c => {
        c.lMat.opacity = 0.06; c.lMat.color.setHex(0xffffff);
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

    // === ANIMATION ===
    const clock = new THREE.Clock();
    let animId, isVisible = false;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;
      const delta = clock.getDelta();
      const time = clock.elapsedTime;

      // Slow building rotation
      building.rotation.y = Math.sin(time * 0.15) * 0.12;

      // Node ring rotation + pulse
      nodes.forEach((n, i) => {
        n.ring.rotation.x = time * 0.5 + i;
        n.ring.rotation.y = time * 0.3 + i * 0.5;
        n.mesh.material.emissiveIntensity = hoveredNode === n.mesh ? 0.8 : 0.3 + Math.sin(time * 2 + i) * 0.1;
      });

      // Connection pulses
      connections.forEach(c => {
        if (c.isPulsing) {
          c.progress += delta * 2.5;
          if (c.progress >= 1) {
            c.isPulsing = false;
            const isHovered = hoveredNode && hoveredNode.userData.connections.includes(c);
            c.lMat.opacity = isHovered ? 0.7 : 0.06;
            if (!isHovered) c.lMat.color.setHex(0xffffff);
          } else {
            c.lMat.opacity = 1 - c.progress * 0.8;
          }
        }
      });

      // Random ambient pulses
      if (!hoveredNode && Math.random() < 0.03) {
        const rc = connections[Math.floor(Math.random() * connections.length)];
        if (!rc.isPulsing) { rc.isPulsing = true; rc.progress = 0; rc.lMat.opacity = 0.6; rc.lMat.color.setHex(SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)].color); }
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
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Tooltip */}
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

      {/* Active system info panel */}
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

      {/* System count badge */}
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
