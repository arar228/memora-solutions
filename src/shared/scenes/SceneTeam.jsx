import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

/* ======================================================================
   SceneTeam — orbital layout, NO d3 force (deterministic, fast, even)
   7 groups on 2 concentric rings around a center hub
   ====================================================================== */

// Group definitions with distinct colors
const GROUPS = [
  { id: 1, label: 'Управление', color: 0x818CF8, ring: 1 },
  { id: 2, label: 'Инженерия',  color: 0x38BDF8, ring: 1 },
  { id: 3, label: 'IT / Dev',   color: 0xA78BFA, ring: 1 },
  { id: 4, label: 'Проектирование', color: 0x34D399, ring: 2 },
  { id: 5, label: 'Логистика',  color: 0xFBBF24, ring: 2 },
  { id: 6, label: 'Монтаж',     color: 0xF87171, ring: 2 },
  { id: 7, label: 'Безопасность', color: 0xFB923C, ring: 2 },
];

const ROLES = [
  // Group 1 — Management
  { name: 'Руководитель проектов', group: 1 },
  { name: 'Аккаунт-менеджер', group: 1 },
  { name: 'Менеджер по закупкам', group: 1 },
  // Group 2 — Engineering
  { name: 'Инженер слаботочных систем', group: 2 },
  { name: 'BIM-инженер', group: 2 },
  { name: 'Инженер-проектировщик ОВиК', group: 2 },
  { name: 'Инженер-наладчик АСУ ТП', group: 2 },
  { name: 'Сетевой инженер (CCNA)', group: 2 },
  // Group 3 — IT/Dev
  { name: 'Frontend-архитектор', group: 3 },
  { name: 'Fullstack-разработчик', group: 3 },
  { name: 'Backend-разработчик', group: 3 },
  { name: 'DevOps-инженер', group: 3 },
  // Group 4 — Design
  { name: 'Проектировщик КЖ / КМ', group: 4 },
  { name: 'Архитектор ИТ-решений', group: 4 },
  { name: 'Сметчик-экономист', group: 4 },
  // Group 5 — Logistics
  { name: 'Логист по ВЭД', group: 5 },
  { name: 'Координатор поставок', group: 5 },
  // Group 6 — Fieldwork
  { name: 'Инженер СКС', group: 6 },
  { name: 'Монтажник-высотник', group: 6 },
  // Group 7 — Safety
  { name: 'Техник по видеонаблюдению', group: 7 },
  { name: 'Специалист по СКУД/ОПС', group: 7 },
  { name: 'Инженер по пожарной безопасности', group: 7 },
];

export default function SceneTeam() {
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');

    const camera = new THREE.PerspectiveCamera(50, W / H, 1, 600);
    camera.position.set(0, 0, 260);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0x445566, 0.5));
    const dL = new THREE.DirectionalLight(0xffffff, 0.4);
    dL.position.set(30, 50, 80); scene.add(dL);

    const root = new THREE.Group();
    scene.add(root);

    // === CENTER HUB ===
    const hubGeo = new THREE.SphereGeometry(10, 24, 24);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x6B4FA0, emissive: 0x6B4FA0, emissiveIntensity: 0.3,
      roughness: 0.3, metalness: 0.5
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.userData = { id: 'center', role: 'Memora Solutions', group: 0 };
    root.add(hub);

    // Outer glow ring for center
    const hubRingGeo = new THREE.TorusGeometry(13, 0.3, 8, 48);
    const hubRing = new THREE.Mesh(hubRingGeo, new THREE.MeshBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.3 }));
    root.add(hubRing);

    // === ORBITAL RINGS (visual guides) ===
    const R1 = 55, R2 = 90; // ring radii
    [R1, R2].forEach(r => {
      const orbitGeo = new THREE.TorusGeometry(r, 0.15, 8, 64);
      const orbit = new THREE.Mesh(orbitGeo, new THREE.MeshBasicMaterial({ color: 0x222244, transparent: true, opacity: 0.25 }));
      root.add(orbit);
    });

    // === PLACE NODES ON RINGS ===
    const nodeGeo = new THREE.SphereGeometry(5, 16, 16);
    const nodeMeshes = [];
    const links = [];

    // Separate roles by ring
    const ring1Roles = ROLES.filter(r => GROUPS.find(g => g.id === r.group).ring === 1);
    const ring2Roles = ROLES.filter(r => GROUPS.find(g => g.id === r.group).ring === 2);

    const placeOnRing = (roles, radius) => {
      const count = roles.length;
      roles.forEach((role, i) => {
        const grp = GROUPS.find(g => g.id === role.group);
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const mat = new THREE.MeshStandardMaterial({
          color: grp.color, emissive: grp.color, emissiveIntensity: 0.25,
          roughness: 0.4, metalness: 0.3
        });
        const mesh = new THREE.Mesh(nodeGeo, mat);
        mesh.position.set(x, y, 0);
        mesh.userData = { role: role.name, group: role.group, groupLabel: grp.label, color: grp.color, baseScale: 1 };
        root.add(mesh);
        nodeMeshes.push(mesh);

        // Connection line to center
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(x, y, 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: grp.color, transparent: true, opacity: 0.12
        });
        const line = new THREE.Line(lineGeo, lineMat);
        root.add(line);
        links.push({ line, lineMat, mesh, color: grp.color });
      });
    };

    placeOnRing(ring1Roles, R1);
    placeOnRing(ring2Roles, R2);

    // === CTA NODE (eye-catching) ===
    const ctaMat = new THREE.MeshStandardMaterial({
      color: 0x2DA39A, emissive: 0x2DA39A, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.5
    });
    const cta = new THREE.Mesh(new THREE.SphereGeometry(8, 20, 20), ctaMat);
    const ctaAngle = Math.PI * 0.75;
    const ctaX = Math.cos(ctaAngle) * (R2 + 30);
    const ctaY = Math.sin(ctaAngle) * (R2 + 30);
    cta.position.set(ctaX, ctaY, 0);
    cta.userData = { role: 'Есть интересная задача? Напишите.', group: 99, baseScale: 1.2 };
    cta.scale.set(1.2, 1.2, 1.2);
    root.add(cta);
    nodeMeshes.push(cta);

    // CTA glow ring (pulsing)
    const ctaRingGeo = new THREE.TorusGeometry(12, 0.4, 8, 32);
    const ctaRingMat = new THREE.MeshBasicMaterial({ color: 0x2DA39A, transparent: true, opacity: 0.35 });
    const ctaRing = new THREE.Mesh(ctaRingGeo, ctaRingMat);
    ctaRing.position.set(ctaX, ctaY, 0);
    root.add(ctaRing);

    // CTA outer glow ring 2
    const ctaRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(16, 0.2, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x2DA39A, transparent: true, opacity: 0.15 })
    );
    ctaRing2.position.set(ctaX, ctaY, 0);
    root.add(ctaRing2);

    // CTA point light
    const ctaLight = new THREE.PointLight(0x2DA39A, 0.5, 40);
    ctaLight.position.set(ctaX, ctaY, 5);
    root.add(ctaLight);

    // CTA connection line (slightly brighter than regular)
    const ctaLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(ctaX, ctaY, 0)
    ]);
    root.add(new THREE.Line(ctaLineGeo, new THREE.LineBasicMaterial({ color: 0x2DA39A, transparent: true, opacity: 0.25 })));

    // All interactable meshes include hub
    const allInteractable = [hub, ...nodeMeshes];

    // === INTERACTION ===
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh = null;
    let rayDirty = false, lastMX = 0, lastMY = 0;

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      lastMX = e.clientX; lastMY = e.clientY;
      rayDirty = true;
    };

    const doRaycast = () => {
      if (!rayDirty) return;
      rayDirty = false;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(allInteractable);

      if (hits.length > 0) {
        const obj = hits[0].object;
        if (hoveredMesh !== obj) {
          if (hoveredMesh) resetHover();
          hoveredMesh = obj;
          gsap.to(hoveredMesh.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.2 });
          if (hoveredMesh.material.emissiveIntensity !== undefined) {
            hoveredMesh.material.emissiveIntensity = 0.7;
          }
          // Dim others
          allInteractable.forEach(m => {
            if (m !== hoveredMesh) m.material.opacity = 0.3;
            m.material.transparent = true;
          });
          hoveredMesh.material.opacity = 1;
          // Highlight connected links
          links.forEach(l => {
            if (l.mesh === hoveredMesh) { l.lineMat.opacity = 0.6; }
          });

          const text = hoveredMesh.userData.id === 'center'
            ? 'Memora Solutions'
            : hoveredMesh.userData.groupLabel
              ? `${hoveredMesh.userData.groupLabel} — ${hoveredMesh.userData.role}`
              : hoveredMesh.userData.role;
          setTooltip({ visible: true, text, x: lastMX, y: lastMY });
        } else {
          setTooltip(t => ({ ...t, x: lastMX, y: lastMY }));
        }
        renderer.domElement.style.cursor = 'pointer';
      } else {
        if (hoveredMesh) { resetHover(); hoveredMesh = null; }
        setTooltip(t => ({ ...t, visible: false }));
        renderer.domElement.style.cursor = 'default';
      }
    };

    const resetHover = () => {
      if (!hoveredMesh) return;
      const bs = hoveredMesh.userData.baseScale || 1;
      gsap.to(hoveredMesh.scale, { x: bs, y: bs, z: bs, duration: 0.2 });
      if (hoveredMesh.material.emissiveIntensity !== undefined) {
        hoveredMesh.material.emissiveIntensity = hoveredMesh.userData.id === 'center' ? 0.3 : 0.25;
      }
      allInteractable.forEach(m => { m.material.opacity = 1; m.material.transparent = false; });
      links.forEach(l => { l.lineMat.opacity = 0.12; });
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // === ANIMATION ===
    const clock = new THREE.Clock();
    let animId, isVisible = false, entered = false;

    // Start hidden
    allInteractable.forEach(m => { m.visible = false; });

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;
      const time = clock.getElapsedTime();

      doRaycast();

      // Slow root rotation
      root.rotation.z = Math.sin(time * 0.1) * 0.03;
      // Hub ring rotation
      hubRing.rotation.z = time * 0.3;

      // Breathing
      if (entered) {
        nodeMeshes.forEach((m, i) => {
          if (hoveredMesh !== m) {
            const b = 1 + Math.sin(time * 1.5 + i * 0.7) * 0.06;
            m.scale.set(b, b, b);
          }
        });
        // CTA pulsing glow
        if (hoveredMesh !== cta) {
          const pulse = 0.5 + Math.sin(time * 3) * 0.3;
          ctaMat.emissiveIntensity = 0.4 + pulse * 0.4;
          ctaRingMat.opacity = 0.2 + pulse * 0.25;
          ctaRing.rotation.z = time * 0.5;
          ctaRing2.rotation.z = -time * 0.3;
          const s = 1.2 + Math.sin(time * 2) * 0.1;
          cta.scale.set(s, s, s);
          ctaLight.intensity = 0.3 + pulse * 0.4;
        }
      }

      renderer.render(scene, camera);
    };

    const obs = new IntersectionObserver(([e]) => {
      isVisible = e.isIntersecting;
      if (isVisible && !entered) {
        entered = true;
        clock.start();
        // Entrance animation — nodes expand from center
        allInteractable.forEach((m, i) => {
          m.visible = true;
          const target = { x: m.position.x, y: m.position.y, z: m.position.z };
          m.position.set(0, 0, 0);
          gsap.to(m.position, {
            ...target, duration: 1 + i * 0.03, ease: 'power3.out', delay: i * 0.04
          });
        });
      }
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
      renderer.domElement.style.cursor = 'default';
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {tooltip.visible && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 36,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(13,13,26,0.94)', color: 'white',
          padding: '8px 14px', borderRadius: '8px', fontSize: 13,
          fontFamily: 'var(--font-display), sans-serif',
          pointerEvents: 'none', zIndex: 1000,
          border: '1px solid rgba(107,79,160,0.4)',
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(107,79,160,0.2)'
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
