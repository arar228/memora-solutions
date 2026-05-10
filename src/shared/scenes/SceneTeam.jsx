import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { gsap } from 'gsap';
import i18n from '../../i18n/i18n';
import { disposeScene } from './_shared/disposeScene';
import { getProfile } from './_shared/deviceProfile';

/* ======================================================================
   SceneTeam — "the people who make it possible"

   Six group clusters in 3D orbit around a central hub (Sergey).
   Each cluster: a colour-coded centre sphere with 3-4 role nodes
   bursting out around it on a mini-sphere. Three connection types:
   hub↔cluster, intra-cluster mesh, animated pulses on both.

   A separate teal "open position" node sits on the lower-right; click
   opens a mailto. Five-act timeline (≈16s loop): genesis → formation
   → connect → invitation → hold.
   ====================================================================== */

const GROUPS = [
  {
    id: 'mgmt', color: 0x818CF8, ru: 'Управление', en: 'Management',
    pos: [ 14, 4, 0],
    roles: [
      { ru: 'Руководитель проектов',     en: 'Project lead' },
      { ru: 'Аккаунт-менеджер',          en: 'Account manager' },
      { ru: 'Менеджер по закупкам',      en: 'Procurement' },
    ],
  },
  {
    id: 'eng', color: 0x38BDF8, ru: 'Инженерия', en: 'Engineering',
    pos: [ 7, 5, 12],
    roles: [
      { ru: 'Инженер слаботочных систем', en: 'Low-voltage engineer' },
      { ru: 'BIM-инженер',               en: 'BIM engineer' },
      { ru: 'Инженер ОВиК',              en: 'HVAC engineer' },
      { ru: 'Сетевой инженер',           en: 'Network engineer' },
    ],
  },
  {
    id: 'dev', color: 0xA78BFA, ru: 'IT и Dev', en: 'IT & Dev',
    pos: [-7, 5, 12],
    roles: [
      { ru: 'Frontend-архитектор',       en: 'Frontend architect' },
      { ru: 'Fullstack-разработчик',     en: 'Fullstack developer' },
      { ru: 'Backend-разработчик',       en: 'Backend developer' },
      { ru: 'DevOps-инженер',            en: 'DevOps engineer' },
    ],
  },
  {
    id: 'design', color: 0x34D399, ru: 'Проектирование', en: 'Design',
    pos: [-14, 4, 0],
    roles: [
      { ru: 'Проектировщик КЖ/КМ',       en: 'Structural designer' },
      { ru: 'Архитектор ИТ-решений',     en: 'IT architect' },
      { ru: 'Сметчик-экономист',         en: 'Cost estimator' },
    ],
  },
  {
    id: 'logistics', color: 0xFBBF24, ru: 'Логистика и Монтаж', en: 'Logistics & Install',
    pos: [-7, -3, -10],
    roles: [
      { ru: 'Логист по ВЭД',             en: 'Foreign trade logistics' },
      { ru: 'Координатор поставок',      en: 'Supply coordinator' },
      { ru: 'Инженер СКС',               en: 'Cabling engineer' },
      { ru: 'Монтажник-высотник',        en: 'Rope-access installer' },
    ],
  },
  {
    id: 'safety', color: 0xFB923C, ru: 'Безопасность', en: 'Safety',
    pos: [ 7, -3, -10],
    roles: [
      { ru: 'Техник видеонаблюдения',    en: 'CCTV technician' },
      { ru: 'Специалист СКУД и ОПС',     en: 'Access control specialist' },
      { ru: 'Инженер пожарной безопасности', en: 'Fire safety engineer' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
export default function SceneTeam() {
  const { t } = useTranslation();
  const mountRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', sub: '', x: 0, y: 0 });
  const [phase, setPhase] = useState('genesis');

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0D0D1A');
    scene.fog = new THREE.FogExp2('#0D0D1A', 0.013);

    const profile = getProfile();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.5, 200);

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
    controls.minDistance = 18;
    controls.maxDistance = 60;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    // ─── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x445577, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.4);
    keyLight.position.set(20, 30, 20);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6B4FA0, 0.4);
    fillLight.position.set(-25, 5, -10);
    scene.add(fillLight);
    const hubLight = new THREE.PointLight(0x6B4FA0, 1.2, 30);
    hubLight.position.set(0, 0, 0);
    scene.add(hubLight);

    // ─── Hub: Sergey ─────────────────────────────────────
    const hub = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0x6B4FA0, emissive: 0x6B4FA0, emissiveIntensity: 0.7,
        roughness: 0.25, metalness: 0.5,
      })
    );
    hub.userData = { isHub: true, baseEmissive: 0.7 };
    scene.add(hub);

    const hubRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.06, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.5 })
    );
    scene.add(hubRing);
    const hubRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.0, 0.04, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.3 })
    );
    hubRing2.rotation.x = Math.PI / 2;
    scene.add(hubRing2);

    // Hub inner sparkle
    const hubParts = [];
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.random() * 0.6;
      hubParts.push(new THREE.Vector3(
        Math.cos(a) * r, (Math.random() - 0.5) * 1.6, Math.sin(a) * r
      ));
    }
    const hubPGeo = new THREE.BufferGeometry().setFromPoints(hubParts);
    const hubPoints = new THREE.Points(hubPGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(hubPoints);

    // ─── Group clusters ─────────────────────────────────
    const clusters = [];
    const allRoleMeshes = [];
    const interactables = [hub];

    for (const g of GROUPS) {
      const clusterGroup = new THREE.Group();
      clusterGroup.userData = { groupData: g };
      const centreMat = new THREE.MeshStandardMaterial({
        color: g.color, emissive: g.color, emissiveIntensity: 0.55,
        roughness: 0.35, metalness: 0.4,
      });
      const centre = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 18, 18),
        centreMat
      );
      centre.userData = { isClusterCenter: true, group: g, baseEmissive: 0.55 };
      clusterGroup.add(centre);
      interactables.push(centre);

      const centreHalo = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.025, 6, 32),
        new THREE.MeshBasicMaterial({ color: g.color, transparent: true, opacity: 0.4 })
      );
      centreHalo.rotation.x = Math.PI / 2 + 0.4;
      clusterGroup.add(centreHalo);

      const roleNodes = [];
      const ROLE_R = 1.8;
      g.roles.forEach((role, idx) => {
        const total = g.roles.length;
        const phi = Math.acos(1 - 2 * (idx + 0.5) / total);
        const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
        const x = Math.cos(theta) * Math.sin(phi) * ROLE_R;
        const y = Math.sin(theta) * Math.sin(phi) * ROLE_R;
        const z = Math.cos(phi) * ROLE_R;

        const node = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 14, 14),
          new THREE.MeshStandardMaterial({
            color: g.color, emissive: g.color, emissiveIntensity: 0.4,
            roughness: 0.5, metalness: 0.3,
          })
        );
        node.userData = {
          isRoleNode: true, group: g, role,
          targetPos: new THREE.Vector3(x, y, z),
          baseEmissive: 0.4,
        };
        node.position.set(0, 0, 0);
        clusterGroup.add(node);
        roleNodes.push(node);
        interactables.push(node);
        allRoleMeshes.push(node);
      });

      const intraLines = [];
      for (const node of roleNodes) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          node.position.clone(),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: g.color, transparent: true, opacity: 0,
        });
        const line = new THREE.Line(geo, mat);
        line.userData = { node, mat };
        clusterGroup.add(line);
        intraLines.push({ line, mat, node });
      }

      clusterGroup.position.set(g.pos[0], g.pos[1], g.pos[2]);
      clusterGroup.visible = false;
      scene.add(clusterGroup);

      clusters.push({
        group: g, clusterGroup, centre, centreMat, centreHalo,
        roleNodes, intraLines,
      });
    }

    // ─── Hub→cluster connector lines ───────────────────
    const hubLines = [];
    for (const c of clusters) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(c.group.pos[0], c.group.pos[1], c.group.pos[2]),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: c.group.color, transparent: true, opacity: 0,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      hubLines.push({ line, mat, cluster: c });
    }

    // Pulse pool — animated spheres travelling hub→cluster
    const pulses = [];
    const pulseGeo = new THREE.SphereGeometry(0.18, 8, 8);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(
        pulseGeo,
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
      );
      m.visible = false;
      scene.add(m);
      pulses.push({ mesh: m, active: false, cluster: null, t: 0, duration: 0 });
    }
    function spawnPulse(cluster) {
      const slot = pulses.find(p => !p.active);
      if (!slot) return;
      slot.active = true;
      slot.cluster = cluster;
      slot.t = 0;
      slot.duration = 0.9 + Math.random() * 0.4;
      slot.mesh.material.color.setHex(cluster.group.color);
      slot.mesh.material.opacity = 0.95;
      slot.mesh.visible = true;
    }

    // ─── Open Position invitation node ─────────────────
    const invitationGroup = new THREE.Group();
    const invMat = new THREE.MeshStandardMaterial({
      color: 0x2DA39A, emissive: 0x2DA39A, emissiveIntensity: 1.0,
      roughness: 0.25, metalness: 0.4,
    });
    const invitation = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 24), invMat);
    invitationGroup.add(invitation);
    const invRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.04, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x2DA39A, transparent: true, opacity: 0.6 })
    );
    invRing.rotation.x = Math.PI / 2 + 0.3;
    invitationGroup.add(invRing);
    const invRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.02, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0x2DA39A, transparent: true, opacity: 0.3 })
    );
    invRing2.rotation.x = Math.PI / 2 - 0.4;
    invitationGroup.add(invRing2);
    // Sparks orbiting the invitation
    const invParts = [];
    for (let i = 0; i < 18; i++) {
      invParts.push(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ));
    }
    const invPoints = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(invParts),
      new THREE.PointsMaterial({
        color: 0x2DA39A, size: 0.1, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    invitationGroup.add(invPoints);
    invitationGroup.position.set(13, -7, 8);
    invitationGroup.scale.setScalar(0);
    scene.add(invitationGroup);
    invitation.userData = { isInvitation: true };
    interactables.push(invitation);
    const invLight = new THREE.PointLight(0x2DA39A, 0, 14);
    invLight.position.copy(invitationGroup.position);
    scene.add(invLight);

    const invLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        invitationGroup.position.clone(),
      ]),
      new THREE.LineDashedMaterial({
        color: 0x2DA39A, dashSize: 0.4, gapSize: 0.3,
        transparent: true, opacity: 0,
      })
    );
    invLine.computeLineDistances();
    scene.add(invLine);

    // Ambient stars
    const STARS = 220;
    const starPos = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 100;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0x88aaff, size: 0.07, transparent: true, opacity: 0.4,
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

    // ─── Interaction ────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hovered = null;
    let rayDirty = false;
    let lastMouseX = 0, lastMouseY = 0;

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      rayDirty = true;
    };

    const setHover = (mesh) => {
      if (hovered === mesh) return;
      // Reset
      if (hovered) {
        if (hovered.userData.isHub) {
          hubRing.material.opacity = 0.5;
          hubRing2.material.opacity = 0.3;
          hubLines.forEach(h => h.mat.opacity = 0.45);
        } else if (hovered.userData.isInvitation) {
          invitationGroup.scale.setScalar(1);
        } else {
          for (const c of clusters) {
            c.centreMat.emissiveIntensity = c.centre.userData.baseEmissive;
            c.roleNodes.forEach(n => {
              n.material.emissiveIntensity = n.userData.baseEmissive;
              n.material.opacity = 1;
              n.material.transparent = false;
            });
            c.intraLines.forEach(l => l.mat.opacity = 0.35);
          }
          hubLines.forEach(h => h.mat.opacity = 0.45);
        }
      }
      hovered = mesh;
      if (!mesh) {
        controls.autoRotate = true;
        renderer.domElement.style.cursor = 'default';
        setTooltip(t => ({ ...t, visible: false }));
        return;
      }
      controls.autoRotate = false;
      renderer.domElement.style.cursor = 'pointer';
      const u = mesh.userData;
      const lang = i18n.language;

      if (u.isHub) {
        hubRing.material.opacity = 0.9;
        hubRing2.material.opacity = 0.7;
        hubLines.forEach(h => h.mat.opacity = 0.85);
        setTooltip({
          visible: true,
          text: lang === 'en' ? 'Sergey Maklakov' : 'Сергей Маклаков',
          sub: lang === 'en' ? 'Founder' : 'Основатель',
          x: lastMouseX, y: lastMouseY,
        });
      } else if (u.isInvitation) {
        invitationGroup.scale.setScalar(1.18);
        setTooltip({
          visible: true,
          text: lang === 'en' ? 'Open position' : 'Открытая позиция',
          sub: lang === 'en'
            ? 'Got an interesting task? Drop a line.'
            : 'Есть интересная задача? Напишите.',
          x: lastMouseX, y: lastMouseY,
        });
      } else if (u.group) {
        const targetGroupId = u.group.id;
        for (const c of clusters) {
          const same = c.group.id === targetGroupId;
          c.centreMat.emissiveIntensity = same ? 1.2 : 0.15;
          c.roleNodes.forEach(n => {
            n.material.emissiveIntensity = same ? 1.0 : 0.1;
            n.material.transparent = !same;
            n.material.opacity = same ? 1 : 0.25;
          });
          c.intraLines.forEach(l => l.mat.opacity = same ? 0.85 : 0.05);
        }
        hubLines.forEach(h => {
          h.mat.opacity = h.cluster.group.id === targetGroupId ? 0.95 : 0.1;
        });
        const groupName = lang === 'en' ? u.group.en : u.group.ru;
        const roleName = u.role ? (lang === 'en' ? u.role.en : u.role.ru) : null;
        setTooltip({
          visible: true,
          text: roleName || groupName,
          sub: roleName ? groupName : (lang === 'en' ? 'Group' : 'Группа'),
          x: lastMouseX, y: lastMouseY,
        });
      }
    };

    const doRaycast = () => {
      if (!rayDirty) return;
      rayDirty = false;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactables);
      if (hits.length > 0) {
        setHover(hits[0].object);
        if (hovered) setTooltip(prev => ({ ...prev, x: lastMouseX, y: lastMouseY }));
      } else {
        setHover(null);
      }
    };

    const onClick = () => {
      if (hovered?.userData.isInvitation) {
        window.location.href = 'mailto:s.maklakov@armk.pro';
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    const onLangChanged = () => {
      if (hovered) {
        const u = hovered.userData;
        const lang = i18n.language;
        if (u.isHub) {
          setTooltip(prev => ({
            ...prev,
            text: lang === 'en' ? 'Sergey Maklakov' : 'Сергей Маклаков',
            sub: lang === 'en' ? 'Founder' : 'Основатель',
          }));
        } else if (u.isInvitation) {
          setTooltip(prev => ({
            ...prev,
            text: lang === 'en' ? 'Open position' : 'Открытая позиция',
            sub: lang === 'en'
              ? 'Got an interesting task? Drop a line.'
              : 'Есть интересная задача? Напишите.',
          }));
        } else if (u.group) {
          const groupName = lang === 'en' ? u.group.en : u.group.ru;
          const roleName = u.role ? (lang === 'en' ? u.role.en : u.role.ru) : null;
          setTooltip(prev => ({
            ...prev, text: roleName || groupName,
            sub: roleName ? groupName : (lang === 'en' ? 'Group' : 'Группа'),
          }));
        }
      }
    };
    i18n.on('languageChanged', onLangChanged);

    // ─── Animation timeline ────────────────────────────
    const T_GENESIS    = 3.0;
    const T_FORMATION  = 4.0;
    const T_CONNECT    = 3.0;
    const T_INVITATION = 3.0;
    const T_HOLD       = 3.0;
    const T1 = T_GENESIS;
    const T2 = T1 + T_FORMATION;
    const T3 = T2 + T_CONNECT;
    const T4 = T3 + T_INVITATION;
    const TOTAL = T4 + T_HOLD;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;

    const camFrames = [
      { t: 0,        pos: [0, 6, 32],  look: [0, 0, 0] },
      { t: T1,       pos: [4, 4, 30],  look: [0, 0, 0] },
      { t: T2,       pos: [20, 5, 22], look: [0, 0, 0] },
      { t: T3,       pos: [22, 8, 28], look: [0, 0, 0] },
      { t: T4 - 0.5, pos: [22, -2, 22], look: [4, -2, 4] },
      { t: T4,       pos: [22, 0, 24], look: [3, -1, 4] },
      { t: TOTAL,    pos: [10, 8, 34], look: [0, 0, 0] },
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
      controls.target.set(
        lerp(a.look[0], b.look[0], p),
        lerp(a.look[1], b.look[1], p),
        lerp(a.look[2], b.look[2], p)
      );
    };

    clusters.forEach((c, idx) => {
      c.appearTime = T1 + (idx / clusters.length) * (T_FORMATION * 0.6);
      c.fromPos = new THREE.Vector3(0, 0, 0);
      c.toPos = new THREE.Vector3(...c.group.pos);
    });

    let rolesBursted = new Set();
    let invitationStarted = false;

    const clock = new THREE.Clock();
    let animId, isInView = false;
    let lastSpawnAt = -Infinity;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isInView) return;
      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();
      const time = elapsed % TOTAL;
      lerpCam(time);
      controls.update();

      // Hub breathing
      hub.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.04);
      hub.material.emissiveIntensity = 0.7 + Math.sin(elapsed * 1.5) * 0.15;
      hubRing.rotation.z = elapsed * 0.2;
      hubRing2.rotation.y = elapsed * 0.15;
      hubPoints.rotation.y = elapsed * 0.05;
      hubLight.intensity = 1.0 + Math.sin(elapsed * 1.5) * 0.3;

      // GENESIS
      if (time < T1) {
        setPhase('genesis');
        clusters.forEach(c => { c.clusterGroup.visible = false; });
        hubLines.forEach(h => h.mat.opacity = 0);
        invitationGroup.scale.setScalar(0);
        invLine.material.opacity = 0;
        invLight.intensity = 0;
        rolesBursted = new Set();
        invitationStarted = false;
      }
      // FORMATION
      else if (time < T2) {
        setPhase('formation');
        clusters.forEach((c, idx) => {
          if (time >= c.appearTime) {
            const localT = Math.min(1, (time - c.appearTime) / 0.8);
            const eT = easeOut(localT);
            c.clusterGroup.visible = true;
            c.clusterGroup.position.lerpVectors(c.fromPos, c.toPos, eT);
            if (eT >= 1 && !rolesBursted.has(idx)) {
              rolesBursted.add(idx);
              c.roleNodes.forEach((n, i) => {
                gsap.to(n.position, {
                  x: n.userData.targetPos.x,
                  y: n.userData.targetPos.y,
                  z: n.userData.targetPos.z,
                  duration: 0.7,
                  delay: i * 0.05,
                  ease: 'back.out(1.7)',
                });
              });
            }
          }
        });
        hubLines.forEach(h => h.mat.opacity = 0);
      }
      // CONNECT
      else if (time < T3) {
        setPhase('connect');
        const phaseT = (time - T2) / T_CONNECT;
        clusters.forEach(c => {
          c.clusterGroup.position.copy(c.toPos);
          c.clusterGroup.visible = true;
        });
        hubLines.forEach((h, idx) => {
          const localT = Math.max(0, Math.min(1, (phaseT - idx * 0.12) / 0.5));
          h.mat.opacity = lerp(0, 0.45, localT);
        });
        clusters.forEach(c => {
          c.intraLines.forEach(l => { l.mat.opacity = lerp(0, 0.35, phaseT); });
        });
        if (elapsed - lastSpawnAt > 0.45) {
          spawnPulse(clusters[Math.floor(Math.random() * clusters.length)]);
          lastSpawnAt = elapsed;
        }
      }
      // INVITATION
      else if (time < T4) {
        setPhase('invitation');
        const phaseT = (time - T3) / T_INVITATION;
        if (!invitationStarted) {
          invitationStarted = true;
          gsap.fromTo(invitationGroup.scale,
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 1, z: 1, duration: 1.0, ease: 'back.out(2)' }
          );
        }
        invLine.material.opacity = lerp(0, 0.4, phaseT);
        invLight.intensity = lerp(0, 1.2, phaseT);
        if (elapsed - lastSpawnAt > 0.4) {
          spawnPulse(clusters[Math.floor(Math.random() * clusters.length)]);
          lastSpawnAt = elapsed;
        }
      }
      // HOLD
      else {
        setPhase('hold');
        if (elapsed - lastSpawnAt > 0.5) {
          spawnPulse(clusters[Math.floor(Math.random() * clusters.length)]);
          lastSpawnAt = elapsed;
        }
        invLight.intensity = 1.0 + Math.sin(elapsed * 2) * 0.3;
      }

      // Cluster ambient breathing + role drift
      clusters.forEach((c, idx) => {
        if (!c.clusterGroup.visible) return;
        c.clusterGroup.rotation.y = elapsed * 0.06 + idx * 0.5;
        if (hovered?.userData?.group?.id !== c.group.id) {
          c.centreMat.emissiveIntensity = c.centre.userData.baseEmissive +
            Math.sin(elapsed * 1.4 + idx) * 0.12;
        }
        c.roleNodes.forEach((n, i) => {
          if (rolesBursted.has(idx)) {
            const tx = n.userData.targetPos.x + Math.sin(elapsed * 0.8 + i) * 0.05;
            const ty = n.userData.targetPos.y + Math.cos(elapsed * 0.7 + i * 0.7) * 0.05;
            const tz = n.userData.targetPos.z + Math.sin(elapsed * 0.6 + i * 0.3) * 0.05;
            n.position.set(tx, ty, tz);
            const li = c.intraLines[i];
            if (li) {
              const pos = li.line.geometry.attributes.position;
              pos.array[3] = tx;
              pos.array[4] = ty;
              pos.array[5] = tz;
              pos.needsUpdate = true;
            }
          }
        });
      });

      // Invitation rings
      if (invitationGroup.scale.x > 0.05) {
        invRing.rotation.z = elapsed * 0.6;
        invRing2.rotation.z = -elapsed * 0.45;
        invMat.emissiveIntensity = 1.0 + Math.sin(elapsed * 2.4) * 0.4;
        invPoints.rotation.y = elapsed * 0.35;
        invPoints.rotation.x = elapsed * 0.25;
      }

      // Pulses along hub→cluster lines
      pulses.forEach(p => {
        if (!p.active) return;
        p.t += delta / p.duration;
        if (p.t >= 1.0) {
          p.active = false;
          p.mesh.visible = false;
          return;
        }
        const start = new THREE.Vector3(0, 0, 0);
        const end = p.cluster.clusterGroup.position;
        p.mesh.position.lerpVectors(start, end, p.t);
        p.mesh.material.opacity = 1 - p.t * 0.5;
      });

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
      allRoleMeshes.forEach(n => {
        gsap.killTweensOf(n.position);
        gsap.killTweensOf(n.material);
      });
      gsap.killTweensOf(invitationGroup.scale);
      controls.dispose();
      composer.dispose();
      disposeScene(scene, renderer);
    };
  }, []);

  const lang = i18n.language;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {tooltip.visible && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y - 40,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(13,13,26,0.94)', color: 'white',
          padding: '8px 14px', borderRadius: 8, fontSize: 13,
          fontFamily: 'var(--font-display), sans-serif',
          pointerEvents: 'none', zIndex: 1000,
          border: '1px solid rgba(45,163,154,0.4)',
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(45,163,154,0.15)',
        }}>
          <div style={{ fontWeight: 700 }}>{tooltip.text}</div>
          {tooltip.sub && (
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{tooltip.sub}</div>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute', top: 14, left: 16,
        background: 'rgba(13,13,26,0.78)',
        border: '1px solid rgba(107,79,160,0.35)',
        borderRadius: 8, padding: '6px 12px',
        fontFamily: 'monospace', fontSize: 11, color: '#a78bfa',
        pointerEvents: 'none', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 9, opacity: 0.65, letterSpacing: '0.6px' }}>
          {lang === 'en' ? 'TEAM' : 'КОМАНДА'}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: 'white' }}>
          {phase === 'genesis'    && (lang === 'en' ? 'Centre formed'   : 'Ядро создано')}
          {phase === 'formation'  && (lang === 'en' ? 'Groups arriving' : 'Группы собираются')}
          {phase === 'connect'    && (lang === 'en' ? 'Connecting'      : 'Связи формируются')}
          {phase === 'invitation' && (lang === 'en' ? 'Open seat'       : 'Открытая позиция')}
          {phase === 'hold'       && (lang === 'en' ? 'Team active'     : 'Команда работает')}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(13,13,26,0.78)',
        border: '1px solid rgba(107,79,160,0.3)',
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
              borderRadius: '50%',
              boxShadow: '0 0 6px #' + g.color.toString(16).padStart(6, '0'),
              alignSelf: 'center',
            }} />
            <span>{lang === 'en' ? g.en : g.ru}</span>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 14, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)', fontSize: 12,
        fontFamily: 'var(--font-display)',
        pointerEvents: 'none', whiteSpace: 'nowrap',
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>{t('creator.s6Title')}</div>
    </div>
  );
}
