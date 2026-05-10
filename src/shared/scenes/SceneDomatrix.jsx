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
import { getProfile } from './_shared/deviceProfile';

/* ======================================================================
   SceneDomatrix — "DOMATRIX platform: one interface for all building systems"

   Cross-section view of a 4-storey building plus basement.
   In the basement sits the DOMATRIX server. Six colour-coded risers run
   from the server up through the building. On each floor, distribution
   pipes branch off the risers to the system nodes (a node is a sensor /
   relay / panel for one engineering family).

   23 abstract acronyms collapsed to 6 visually distinct families:
     • SECURITY  — CCTV, ACS, intruder, fire alarm           (red)
     • CLIMATE   — HVAC, heating, gas detection              (blue)
     • POWER     — electrical supply, lighting               (amber)
     • IT        — LAN, structured cabling, dispatch         (violet)
     • UTILITIES — plumbing, lifts, energy metering          (teal)
     • EVAC      — public address + emergency notification   (orange)

   16-second loop, four cinematic acts:
     1. INTRO   (0–3s)   — wide shot of the building, all systems dark.
     2. WAKE    (3–6s)   — camera pulls toward the basement; the DOMATRIX
                            server boots, indicators light up.
     3. PULSE   (6–10s)  — six pulses travel up the risers, branch onto
                            each floor, light up the nodes.
     4. LIVE    (10–13s) — all systems active, ambient pulses circulate.
     5. HOLD    (13–16s) — wide cinematic hold, building "breathes".
   ====================================================================== */

// ── Group colour palette + meta ──────────────────────────────
const GROUPS = [
  { id: 'security',  color: 0xF44336, riserX: -3.6, ru: 'Безопасность',     en: 'Security' },
  { id: 'climate',   color: 0x2196F3, riserX: -2.2, ru: 'Климат',           en: 'Climate' },
  { id: 'power',     color: 0xFFC107, riserX: -0.8, ru: 'Электрика',        en: 'Power' },
  { id: 'it',        color: 0x6B4FA0, riserX:  0.8, ru: 'IT и Связь',       en: 'IT & Comm' },
  { id: 'utilities', color: 0x2da39a, riserX:  2.2, ru: 'Инженерные',       en: 'Utilities' },
  { id: 'evac',      color: 0xFF6F00, riserX:  3.6, ru: 'Эвакуация',        en: 'Evacuation' },
];

// ── System nodes per floor — 3-4 per floor, grouped colour-wise ──
// Each node: floor (1..4), group id, x position on floor, descriptive name.
const NODES = [
  // Floor 1 — public/lobby: security, evac
  { floor: 1, group: 'security',  x: -3.5, ru: 'Видеонаблюдение',           en: 'CCTV' },
  { floor: 1, group: 'evac',      x: -2.0, ru: 'Эвакуация и оповещение',    en: 'Evacuation PA' },
  { floor: 1, group: 'security',  x:  0.0, ru: 'Контроль доступа',          en: 'Access control' },
  { floor: 1, group: 'security',  x:  1.8, ru: 'Пожарная сигнализация',     en: 'Fire alarm' },
  { floor: 1, group: 'utilities', x:  3.5, ru: 'Лифты',                     en: 'Lifts' },

  // Floor 2 — climate, IT
  { floor: 2, group: 'climate',   x: -3.5, ru: 'Вентиляция',                en: 'Ventilation' },
  { floor: 2, group: 'climate',   x: -1.5, ru: 'Отопление',                 en: 'Heating' },
  { floor: 2, group: 'it',        x:  0.5, ru: 'ЛВС',                       en: 'LAN' },
  { floor: 2, group: 'it',        x:  2.4, ru: 'Структурированная сеть',    en: 'Structured cabling' },
  { floor: 2, group: 'utilities', x:  3.8, ru: 'Учёт водо- и теплопотребления', en: 'Energy metering' },

  // Floor 3 — power, climate
  { floor: 3, group: 'power',     x: -3.5, ru: 'Электроснабжение',          en: 'Electrical supply' },
  { floor: 3, group: 'power',     x: -1.5, ru: 'Освещение',                 en: 'Lighting' },
  { floor: 3, group: 'climate',   x:  0.5, ru: 'Контроль загазованности',   en: 'Gas detection' },
  { floor: 3, group: 'it',        x:  2.4, ru: 'Диспетчерская',             en: 'Dispatch' },
  { floor: 3, group: 'evac',      x:  3.8, ru: 'Охранная сигнализация',     en: 'Intruder alarm' },

  // Floor 4 — utilities, top-floor systems
  { floor: 4, group: 'utilities', x: -3.5, ru: 'Сантехника',                en: 'Plumbing' },
  { floor: 4, group: 'climate',   x: -1.5, ru: 'Вентиляция чердака',        en: 'Roof HVAC' },
  { floor: 4, group: 'power',     x:  0.5, ru: 'Резервное питание',         en: 'Backup power' },
  { floor: 4, group: 'security',  x:  2.4, ru: 'Видеонаблюдение крыши',     en: 'Roof CCTV' },
];

// ─────────────────────────────────────────────────────────────
export default function SceneDomatrix() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', group: '', x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.012);

    const profile = getProfile();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.5, 200);
    camera.position.set(14, 10, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: profile.antialias, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(profile.pixelRatio);
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
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 5, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // ─── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x334466, 0.4));
    const keyLight = new THREE.DirectionalLight(0xfff0d0, 0.65);
    keyLight.position.set(20, 30, 25);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6B4FA0, 0.3);
    fillLight.position.set(-25, 15, 10);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x2da39a, 0.35);
    rimLight.position.set(0, -5, -25);
    scene.add(rimLight);

    // ─── Floor (ground around the building) ─────────────
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x07070e, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);
    const grid = new THREE.GridHelper(60, 30, 0x1a1a3a, 0x0e0e1c);
    grid.position.y = 0.005;
    scene.add(grid);

    // ─── Building structure (cross-section) ─────────────
    // Constants: 4 floors above ground + 1 basement, each 2.4m tall.
    const BLD_W = 11;        // building width
    const BLD_D = 4.5;       // building depth
    const FLOOR_H = 2.4;
    const FLOORS = 4;
    const BASEMENT_H = 2.0;
    const BASEMENT_TOP_Y = 0;            // ground level
    const BASEMENT_FLOOR_Y = -BASEMENT_H; // basement floor
    const ROOF_Y = FLOORS * FLOOR_H;     // top of building

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a26, roughness: 0.7, metalness: 0.2,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x132040, roughness: 0.05, transmission: 0.55,
      thickness: 0.2, ior: 1.45, transparent: true, clearcoat: 1.0,
      side: THREE.DoubleSide,
    });

    // Floor slabs (concrete) — basement floor + ground floor + 4 floor plates + roof
    function addSlab(y, color = 0x2a2a3e) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(BLD_W, 0.18, BLD_D),
        new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.25 })
      );
      slab.position.y = y;
      scene.add(slab);
    }
    addSlab(BASEMENT_FLOOR_Y, 0x1c1c28);  // basement bottom
    addSlab(BASEMENT_TOP_Y, 0x2a2a3e);     // ground level
    for (let f = 1; f <= FLOORS; f++) addSlab(f * FLOOR_H, 0x2a2a3e);

    // Side walls (left + right) — semi-transparent glass to keep cross-section feel
    for (const x of [-BLD_W / 2, BLD_W / 2]) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(BLD_D, ROOF_Y - BASEMENT_FLOOR_Y),
        glassMat
      );
      wall.position.set(x, (ROOF_Y + BASEMENT_FLOOR_Y) / 2, 0);
      wall.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(wall);
    }
    // Back wall (concrete, opaque, gives depth)
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(BLD_W, ROOF_Y - BASEMENT_FLOOR_Y),
      stoneMat
    );
    backWall.position.set(0, (ROOF_Y + BASEMENT_FLOOR_Y) / 2, -BLD_D / 2);
    scene.add(backWall);

    // Building outline (wire frame)
    const outlineMat = new THREE.LineBasicMaterial({
      color: 0x6B4FA0, transparent: true, opacity: 0.45,
    });
    const outlineGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(BLD_W, ROOF_Y - BASEMENT_FLOOR_Y, BLD_D)
    );
    const outline = new THREE.LineSegments(outlineGeo, outlineMat);
    outline.position.y = (ROOF_Y + BASEMENT_FLOOR_Y) / 2;
    scene.add(outline);

    // Floor labels (simple text on left side)
    function addFloorLine(y, color = 0x444466) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-BLD_W / 2 - 0.6, y, 0),
        new THREE.Vector3(-BLD_W / 2 - 0.1, y, 0),
      ]);
      scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color })));
    }
    for (let f = 0; f <= FLOORS; f++) addFloorLine(f * FLOOR_H);
    addFloorLine(BASEMENT_FLOOR_Y + 0.4);

    // Room separators on each floor (vertical thin walls inside)
    const roomSepMat = new THREE.LineBasicMaterial({ color: 0x3a3a55, transparent: true, opacity: 0.4 });
    for (let f = 1; f <= FLOORS; f++) {
      const baseY = (f - 1) * FLOOR_H + 0.18;
      const topY = f * FLOOR_H - 0.05;
      for (const x of [-3, -1, 1, 3]) {
        const pts = [
          new THREE.Vector3(x, baseY, 0),
          new THREE.Vector3(x, topY, 0),
        ];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), roomSepMat));
      }
    }

    // ─── DOMATRIX server in basement ────────────────────
    const serverGroup = new THREE.Group();
    // Rack chassis
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.3, metalness: 0.7 })
    );
    rack.position.y = -1.0;
    serverGroup.add(rack);
    // Front panel (slightly recessed face)
    const frontPanel = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 1.45, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x16161e, roughness: 0.5 })
    );
    frontPanel.position.set(0, -1.0, 0.61);
    serverGroup.add(frontPanel);
    // Indicator strip (will pulse during WAKE)
    const indicators = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) {
        const led = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.06, 0.02),
          new THREE.MeshBasicMaterial({ color: 0x111122 })
        );
        led.position.set(-0.7 + c * 0.2, -1.5 + r * 0.18, 0.65);
        led.userData.idx = r * 8 + c;
        led.userData.targetColor = GROUPS[(r + c) % GROUPS.length].color;
        serverGroup.add(led);
        indicators.push(led);
      }
    }
    // Big DOMATRIX logo (just an emissive plane)
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.25),
      new THREE.MeshBasicMaterial({ color: 0x2da39a })
    );
    logo.position.set(0, -0.5, 0.65);
    serverGroup.add(logo);
    // Cooling fans (visible circles on top)
    for (const x of [-0.6, 0, 0.6]) {
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a26 })
      );
      fan.position.set(x, -0.18, 0);
      serverGroup.add(fan);
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.02, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x2a2a3a })
      );
      blade.position.set(x, -0.16, 0);
      blade.userData.isFan = true;
      serverGroup.add(blade);
    }
    serverGroup.position.set(0, 0, 0);
    scene.add(serverGroup);

    // Server warm point light (lights up during WAKE)
    const serverLight = new THREE.PointLight(0x2da39a, 0, 8);
    serverLight.position.set(0, -0.8, 1.5);
    scene.add(serverLight);

    // ─── Risers (vertical pipes from server up to roof) ──
    const risers = [];
    for (const g of GROUPS) {
      const riserMat = new THREE.MeshStandardMaterial({
        color: g.color, emissive: g.color, emissiveIntensity: 0.0,
        roughness: 0.3, metalness: 0.4,
      });
      const riser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, ROOF_Y + BASEMENT_H - 0.3, 12),
        riserMat
      );
      riser.position.set(g.riserX, (ROOF_Y - BASEMENT_H) / 2, -BLD_D / 2 + 0.4);
      scene.add(riser);
      risers.push({ group: g, mesh: riser, material: riserMat });
    }

    // ─── Distribution pipes (horizontal) on each floor per riser ──
    // Each floor has 6 thin pipes branching out from each riser to a node.
    // Pipes are static lines; pulses run as moving spheres.
    function addDistPipe(fromX, fromY, toX, toY, color) {
      const pts = [
        new THREE.Vector3(fromX, fromY, -BLD_D / 2 + 0.4),
        new THREE.Vector3(fromX, fromY, 0.2),
        new THREE.Vector3(toX, toY, 0.2),
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })
      );
      scene.add(line);
      return line;
    }

    // ─── System nodes (one mesh per node) ───────────────
    const nodeGeo = new THREE.SphereGeometry(0.18, 14, 14);
    const nodeMeshes = [];
    for (const node of NODES) {
      const group = GROUPS.find(g => g.id === node.group);
      const mat = new THREE.MeshStandardMaterial({
        color: group.color, emissive: group.color, emissiveIntensity: 0.4,
        roughness: 0.4, metalness: 0.3,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const y = (node.floor - 1) * FLOOR_H + FLOOR_H / 2;
      mesh.position.set(node.x, y, 0.5);
      mesh.userData = { node, group, originalEmissive: 0.4 };
      scene.add(mesh);
      // Distribution pipe from riser to node
      const pipeLine = addDistPipe(group.riserX, y, node.x, y, group.color);
      mesh.userData.pipeLine = pipeLine;
      nodeMeshes.push(mesh);
    }

    // ─── Pulse system (moving spheres along risers + pipes) ─
    // We pre-create a pool of 30 small bright pulses; each gets reused.
    const PULSE_POOL = 30;
    const pulseGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const pulses = [];
    for (let i = 0; i < PULSE_POOL; i++) {
      const m = new THREE.Mesh(
        pulseGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      m.visible = false;
      scene.add(m);
      pulses.push({ mesh: m, active: false, group: null, riserX: 0, target: null, t: 0, duration: 0 });
    }
    function spawnPulse(group, target) {
      const slot = pulses.find(p => !p.active);
      if (!slot) return;
      slot.active = true;
      slot.group = group;
      slot.riserX = group.riserX;
      slot.target = target;
      slot.t = 0;
      slot.duration = 1.0 + Math.random() * 0.4;
      slot.mesh.material.color.setHex(group.color);
      slot.mesh.material.opacity = 0.95;
      slot.mesh.visible = true;
    }

    // ─── Atmospheric particles ───────────────────────────
    const DUST = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 16;
      dustPos[i * 3 + 1] = -1 + Math.random() * (ROOF_Y + 2);
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.04, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(dust);

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

    // ─── Interaction (raycaster, throttled) ─────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode = null;
    let rayDirty = false;
    let lastMouseX = 0, lastMouseY = 0;

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      lastMouseX = e.clientX; lastMouseY = e.clientY;
      rayDirty = true;
    };

    const setHover = (mesh) => {
      if (hoveredNode === mesh) return;
      // Reset previous hover
      if (hoveredNode) {
        const u = hoveredNode.userData;
        hoveredNode.scale.setScalar(1);
        hoveredNode.material.emissiveIntensity = u.originalEmissive;
        // Restore others
        nodeMeshes.forEach(n => {
          n.material.opacity = 1;
          n.material.transparent = false;
          n.userData.pipeLine.material.opacity = 0.25;
        });
      }
      hoveredNode = mesh;
      if (!mesh) {
        controls.autoRotate = true;
        renderer.domElement.style.cursor = 'default';
        setTooltip(t => ({ ...t, visible: false }));
        return;
      }
      controls.autoRotate = false;
      renderer.domElement.style.cursor = 'pointer';
      const u = mesh.userData;
      mesh.scale.setScalar(1.5);
      mesh.material.emissiveIntensity = 1.0;
      // Dim all OTHER nodes; keep same-group nodes fully bright
      nodeMeshes.forEach(n => {
        const sameGroup = n.userData.group.id === u.group.id;
        n.material.transparent = !sameGroup;
        n.material.opacity = sameGroup ? 1 : 0.25;
        n.userData.pipeLine.material.opacity = sameGroup ? 0.85 : 0.1;
      });
      const lang = i18n.language;
      const groupName = lang === 'en' ? u.group.en : u.group.ru;
      const nodeName = lang === 'en' ? u.node.en : u.node.ru;
      setTooltip({
        visible: true,
        text: nodeName,
        group: groupName,
        x: lastMouseX,
        y: lastMouseY,
      });
    };

    const doRaycast = () => {
      if (!rayDirty) return;
      rayDirty = false;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(nodeMeshes);
      if (hits.length > 0) {
        setHover(hits[0].object);
        if (hoveredNode) {
          setTooltip(t => ({ ...t, x: lastMouseX, y: lastMouseY }));
        }
      } else {
        setHover(null);
      }
    };

    const onClick = () => {
      if (hoveredNode) {
        const u = hoveredNode.userData;
        setActiveNode({
          group: u.group,
          node: u.node,
        });
      } else {
        setActiveNode(null);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // ─── Listener for live language change ──────────────
    const onLangChanged = () => {
      // Refresh tooltip text if hovering
      if (hoveredNode) {
        const u = hoveredNode.userData;
        const lang = i18n.language;
        setTooltip(prev => ({
          ...prev,
          text: lang === 'en' ? u.node.en : u.node.ru,
          group: lang === 'en' ? u.group.en : u.group.ru,
        }));
      }
    };
    i18n.on('languageChanged', onLangChanged);

    // ─── Animation timeline ────────────────────────────
    const T_INTRO = 3.0;
    const T_WAKE = 3.0;
    const T_PULSE = 4.0;
    const T_LIVE = 3.0;
    const T_HOLD = 3.0;
    const T1 = T_INTRO;
    const T2 = T1 + T_WAKE;
    const T3 = T2 + T_PULSE;
    const T4 = T3 + T_LIVE;
    const TOTAL = T4 + T_HOLD;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const clock = new THREE.Clock();
    let animId, isInView = false;
    let lastSpawnAt = -Infinity;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isInView) return;

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();
      const time = elapsed % TOTAL;

      controls.update();

      // Ambient drift dust
      const dArr = dust.geometry.attributes.position.array;
      for (let i = 0; i < DUST; i++) {
        dArr[i * 3 + 1] += 0.005 * (1 + Math.sin(elapsed * 0.5 + i));
        if (dArr[i * 3 + 1] > ROOF_Y + 1) dArr[i * 3 + 1] = -1;
      }
      dust.geometry.attributes.position.needsUpdate = true;

      // Server fans spin (when WAKE+)
      const fansRunning = time >= T1;
      serverGroup.traverse(c => {
        if (c.userData.isFan) c.rotation.y = fansRunning ? elapsed * 8 : 0;
      });

      // ─── Phase 1: INTRO — building dark, server idle ──
      if (time < T1) {
        const p = time / T1;
        // Faint background pulse on outline
        outline.material.opacity = 0.2 + p * 0.25;
        serverLight.intensity = 0;
        // All node emissives low
        nodeMeshes.forEach(n => { n.material.emissiveIntensity = 0.05; });
        // Risers dim
        risers.forEach(r => { r.material.emissiveIntensity = 0; });
        // Indicators dark
        indicators.forEach(led => {
          led.material.color.setHex(0x111122);
        });
        logo.material.color.setHex(0x153b3a);
      }

      // ─── Phase 2: WAKE — server boots up, indicators light ──
      else if (time < T2) {
        const p = (time - T1) / T_WAKE;
        outline.material.opacity = 0.45;
        serverLight.intensity = easeOut(p) * 1.0;
        // Indicator wave: light them up sequentially (left to right)
        const lit = Math.floor(p * indicators.length * 1.4);
        indicators.forEach((led, idx) => {
          if (idx < lit) {
            led.material.color.setHex(led.userData.targetColor);
          } else {
            led.material.color.setHex(0x111122);
          }
        });
        logo.material.color.setHex(0x2da39a);
        // Risers slowly start glowing
        risers.forEach(r => { r.material.emissiveIntensity = p * 0.15; });
        nodeMeshes.forEach(n => { n.material.emissiveIntensity = 0.05; });
      }

      // ─── Phase 3: PULSE — pulses shoot up to nodes ──
      else if (time < T3) {
        outline.material.opacity = 0.45;
        serverLight.intensity = 1.0 + Math.sin(elapsed * 4) * 0.2;
        indicators.forEach(led => led.material.color.setHex(led.userData.targetColor));
        logo.material.color.setHex(0x2da39a);
        risers.forEach(r => { r.material.emissiveIntensity = 0.35 + Math.sin(elapsed * 3 + r.group.riserX) * 0.1; });

        // Spawn pulses at a steady rate
        if (elapsed - lastSpawnAt > 0.18) {
          // Pick a random node that hasn't been "lit" or just round-robin
          const node = nodeMeshes[Math.floor(Math.random() * nodeMeshes.length)];
          spawnPulse(node.userData.group, node);
          lastSpawnAt = elapsed;
        }

        // Light up nodes as the phase progresses
        const phaseP = (time - T2) / T_PULSE;
        nodeMeshes.forEach((n, idx) => {
          const order = idx / nodeMeshes.length;
          const t = Math.max(0, Math.min(1, (phaseP - order * 0.4) / 0.5));
          n.material.emissiveIntensity = 0.05 + t * 0.55;
        });
      }

      // ─── Phase 4: LIVE — all systems active ──
      else if (time < T4) {
        outline.material.opacity = 0.5;
        serverLight.intensity = 1.0 + Math.sin(elapsed * 4) * 0.2;
        indicators.forEach(led => led.material.color.setHex(led.userData.targetColor));
        risers.forEach(r => { r.material.emissiveIntensity = 0.4 + Math.sin(elapsed * 2 + r.group.riserX) * 0.15; });
        nodeMeshes.forEach(n => {
          if (hoveredNode !== n) {
            const u = n.userData;
            n.material.emissiveIntensity = 0.5 + Math.sin(elapsed * 2.4 + n.position.x) * 0.15;
            u.originalEmissive = n.material.emissiveIntensity;
          }
        });
        // Continuous pulse spawning
        if (elapsed - lastSpawnAt > 0.32) {
          const node = nodeMeshes[Math.floor(Math.random() * nodeMeshes.length)];
          spawnPulse(node.userData.group, node);
          lastSpawnAt = elapsed;
        }
      }

      // ─── Phase 5: HOLD — same state, gentle drift ──
      else {
        if (elapsed - lastSpawnAt > 0.5) {
          const node = nodeMeshes[Math.floor(Math.random() * nodeMeshes.length)];
          spawnPulse(node.userData.group, node);
          lastSpawnAt = elapsed;
        }
      }

      // Animate active pulses
      pulses.forEach(p => {
        if (!p.active) return;
        p.t += delta / p.duration;
        if (p.t >= 1.0) {
          p.active = false;
          p.mesh.visible = false;
          // Tiny "arrival" flare on the target node
          if (p.target) {
            p.target.material.emissiveIntensity = Math.min(1.5, p.target.material.emissiveIntensity + 0.4);
          }
          return;
        }
        // Trajectory: 0–0.65 of t goes up the riser, 0.65–1.0 traverses
        // the distribution pipe to the node.
        const x = p.riserX;
        const startY = -1.0;
        const endY = p.target ? p.target.position.y : 0;
        const z = -BLD_D / 2 + 0.4;
        if (p.t < 0.65) {
          const tt = p.t / 0.65;
          p.mesh.position.set(x, startY + (endY - startY) * tt, z);
        } else {
          const tt = (p.t - 0.65) / 0.35;
          const targetX = p.target ? p.target.position.x : x;
          const targetZ = p.target ? p.target.position.z : 0.5;
          p.mesh.position.set(
            x + (targetX - x) * tt,
            endY,
            z + (targetZ - z) * tt
          );
        }
        p.mesh.material.opacity = 1 - p.t * 0.4;
      });

      // Hover raycast
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

      {/* Tooltip on hover */}
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
        }}>
          <span style={{ color: '#2da39a', fontWeight: 700 }}>{tooltip.group}</span>
          <span style={{ opacity: 0.5, padding: '0 6px' }}>·</span>
          {tooltip.text}
        </div>
      )}

      {/* Detail card */}
      {activeNode && (
        <div onClick={() => setActiveNode(null)} style={{
          position: 'absolute', top: 20, right: 20, maxWidth: 290,
          background: 'rgba(13,13,26,0.94)',
          border: `1px solid rgba(${(activeNode.group.color >> 16) & 255}, ${(activeNode.group.color >> 8) & 255}, ${activeNode.group.color & 255}, 0.55)`,
          borderRadius: 12, padding: '18px', color: 'white',
          zIndex: 1000, backdropFilter: 'blur(12px)', cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'dxFadeIn 0.3s ease-out',
        }}>
          <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>✕</div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.6px',
            color: `#${activeNode.group.color.toString(16).padStart(6, '0')}`,
            marginBottom: 4, textTransform: 'uppercase',
          }}>
            {lang === 'en' ? activeNode.group.en : activeNode.group.ru}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: 'var(--font-display)' }}>
            {lang === 'en' ? activeNode.node.en : activeNode.node.ru}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
            {lang === 'en'
              ? `Floor ${activeNode.node.floor} · part of the ${activeNode.group.en} family. Routed through the DOMATRIX server in the basement.`
              : `Этаж ${activeNode.node.floor} · входит в группу «${activeNode.group.ru}». Подключён к серверу DOMATRIX в подвале.`}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            {t('creator.scene.domatrixCloseHint')}
          </div>
        </div>
      )}

      {/* Group legend (bottom-left) */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(13,13,26,0.78)',
        border: '1px solid rgba(45,163,154,0.3)',
        borderRadius: 10, padding: '10px 14px',
        fontFamily: 'monospace', fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        pointerEvents: 'none', backdropFilter: 'blur(8px)',
        display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 12px',
      }}>
        {GROUPS.map(g => (
          <div key={g.id} style={{ display: 'contents' }}>
            <span style={{
              display: 'inline-block', width: 10, height: 10,
              background: '#' + g.color.toString(16).padStart(6, '0'),
              borderRadius: '50%', boxShadow: '0 0 6px #' + g.color.toString(16).padStart(6, '0'),
              alignSelf: 'center',
            }} />
            <span>{lang === 'en' ? g.en : g.ru}</span>
          </div>
        ))}
      </div>

      {/* System count (top-right) */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        fontFamily: 'monospace', fontSize: 12,
        color: '#2da39a',
        background: 'rgba(13,13,26,0.85)', padding: '6px 14px',
        borderRadius: 8, border: '1px solid rgba(45,163,154,0.3)',
        pointerEvents: 'none', backdropFilter: 'blur(8px)',
      }}>
        {t('creator.scene.domatrixSystemsCount', { count: NODES.length })}
      </div>

      <style>{`@keyframes dxFadeIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}
