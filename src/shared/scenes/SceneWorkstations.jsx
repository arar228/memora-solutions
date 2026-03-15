import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Build a detailed PC model from primitives
function buildPC() {
  const pc = new THREE.Group();

  // === CASE (tower) ===
  const caseGeo = new THREE.BoxGeometry(4, 8, 7);
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.7 });
  const pcCase = new THREE.Mesh(caseGeo, caseMat);
  pcCase.position.y = 4;
  pc.add(pcCase);

  // Case front panel (darker)
  const frontGeo = new THREE.BoxGeometry(4.05, 8.05, 0.1);
  const frontMat = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.5 });
  const front = new THREE.Mesh(frontGeo, frontMat);
  front.position.set(0, 4, 3.5);
  pc.add(front);

  // Power button (small circle on front)
  const btnGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
  const btnMat = new THREE.MeshBasicMaterial({ color: 0x2da39a });
  const btn = new THREE.Mesh(btnGeo, btnMat);
  btn.rotation.x = Math.PI / 2;
  btn.position.set(0, 7.2, 3.6);
  pc.add(btn);

  // USB ports on front
  for (let i = 0; i < 2; i++) {
    const usbGeo = new THREE.BoxGeometry(0.3, 0.15, 0.1);
    const usbMat = new THREE.MeshStandardMaterial({ color: 0x333355 });
    const usb = new THREE.Mesh(usbGeo, usbMat);
    usb.position.set(-0.3 + i * 0.6, 6.8, 3.6);
    pc.add(usb);
  }

  // Glass side panel
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a3e, transparent: true, opacity: 0.3,
    roughness: 0.1, metalness: 0.9
  });
  const sideGeo = new THREE.BoxGeometry(0.05, 7.5, 6.5);
  const sidePanel = new THREE.Mesh(sideGeo, sideMat);
  sidePanel.position.set(2.02, 4, 0);
  pc.add(sidePanel);

  // Case edges (wireframe)
  const caseEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(caseGeo),
    new THREE.LineBasicMaterial({ color: 0x3a3a6a, transparent: true, opacity: 0.6 })
  );
  caseEdges.position.y = 4;
  pc.add(caseEdges);

  // === MOTHERBOARD ===
  const mbGeo = new THREE.BoxGeometry(3.2, 5.5, 0.15);
  const mbMat = new THREE.MeshStandardMaterial({ color: 0x1a472a, roughness: 0.6, metalness: 0.3 });
  const mb = new THREE.Mesh(mbGeo, mbMat);
  mb.position.set(0, 4.2, -0.5);
  pc.add(mb);

  // MB circuits (thin lines on the board)
  const circuitMat = new THREE.LineBasicMaterial({ color: 0x2da39a, transparent: true, opacity: 0.4 });
  for (let i = 0; i < 8; i++) {
    const pts = [
      new THREE.Vector3(-1.2 + Math.random() * 2.4, 1.8 + i * 0.6, 0),
      new THREE.Vector3(-0.5 + Math.random() * 1.0, 1.8 + i * 0.6, 0),
      new THREE.Vector3(-0.5 + Math.random() * 1.0, 2.0 + i * 0.6, 0)
    ];
    const cGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const circuit = new THREE.Line(cGeo, circuitMat);
    circuit.position.z = -0.35;
    pc.add(circuit);
  }

  // === CPU (square with heatsink) ===
  const cpuGeo = new THREE.BoxGeometry(0.9, 0.9, 0.1);
  const cpuMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.2, metalness: 0.8 });
  const cpu = new THREE.Mesh(cpuGeo, cpuMat);
  cpu.position.set(0, 5.5, -0.3);
  pc.add(cpu);

  // CPU cooler (tower heatsink)
  const hsGeo = new THREE.BoxGeometry(1.1, 1.4, 1.2);
  const hsMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.6 });
  const heatsink = new THREE.Mesh(hsGeo, hsMat);
  heatsink.position.set(0, 5.5, 0.4);
  pc.add(heatsink);

  // Heatsink fins
  for (let i = 0; i < 6; i++) {
    const finGeo = new THREE.BoxGeometry(1.1, 0.02, 1.2);
    const fin = new THREE.Mesh(finGeo, hsMat.clone());
    fin.position.set(0, 5.0 + i * 0.2, 0.4);
    pc.add(fin);
  }

  // CPU fan
  const fanGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16);
  const fanMat = new THREE.MeshStandardMaterial({ color: 0x222244, roughness: 0.4 });
  const fan = new THREE.Mesh(fanGeo, fanMat);
  fan.rotation.x = Math.PI / 2;
  fan.position.set(0, 5.5, 1.1);
  pc.add(fan);

  // Fan blades
  for (let i = 0; i < 4; i++) {
    const bladeGeo = new THREE.BoxGeometry(0.08, 0.45, 0.02);
    const blade = new THREE.Mesh(bladeGeo, new THREE.MeshBasicMaterial({ color: 0x4444aa }));
    blade.rotation.z = (i / 4) * Math.PI;
    blade.position.set(0, 5.5, 1.15);
    blade.userData.isFanBlade = true;
    blade.userData.bladeIndex = i;
    pc.add(blade);
  }

  // === GPU ===
  const gpuGeo = new THREE.BoxGeometry(2.8, 0.4, 1.8);
  const gpuMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a, roughness: 0.3, metalness: 0.6 });
  const gpu = new THREE.Mesh(gpuGeo, gpuMat);
  gpu.position.set(0, 3.3, 0.5);
  pc.add(gpu);

  // GPU fans (dual)
  for (let fx = -0.6; fx <= 0.6; fx += 1.2) {
    const gfGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
    const gf = new THREE.Mesh(gfGeo, fanMat.clone());
    gf.rotation.x = Math.PI / 2;
    gf.position.set(fx, 3.5, 0.5);
    pc.add(gf);
    // GPU fan blades
    for (let b = 0; b < 3; b++) {
      const gb = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.3, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x6B4FA0 })
      );
      gb.rotation.z = (b / 3) * Math.PI;
      gb.position.set(fx, 3.5, 0.55);
      gb.userData.isFanBlade = true;
      gb.userData.bladeIndex = b;
      gb.userData.fanOffset = fx;
      pc.add(gb);
    }
  }

  // GPU backplate
  const bpGeo = new THREE.BoxGeometry(2.8, 0.06, 1.8);
  const bpMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.4, metalness: 0.7 });
  const backplate = new THREE.Mesh(bpGeo, bpMat);
  backplate.position.set(0, 3.1, 0.5);
  pc.add(backplate);

  // === RAM (4 sticks) ===
  for (let i = 0; i < 4; i++) {
    const ramGeo = new THREE.BoxGeometry(0.1, 2.2, 0.4);
    const ramMat = new THREE.MeshStandardMaterial({
      color: i < 2 ? 0x2da39a : 0x6B4FA0,
      emissive: i < 2 ? 0x1a6060 : 0x3b2060,
      emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.5
    });
    const ram = new THREE.Mesh(ramGeo, ramMat);
    ram.position.set(1.0 + i * 0.18, 5.5, -0.3);
    pc.add(ram);
  }

  // === PSU ===
  const psuGeo = new THREE.BoxGeometry(3, 1.6, 3.2);
  const psuMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.5, metalness: 0.5 });
  const psu = new THREE.Mesh(psuGeo, psuMat);
  psu.position.set(0, 1, 0);
  pc.add(psu);

  // PSU fan grille
  const psuFanGeo = new THREE.RingGeometry(0.4, 0.6, 16);
  const psuFanMat = new THREE.MeshBasicMaterial({ color: 0x333355, side: THREE.DoubleSide });
  const psuFan = new THREE.Mesh(psuFanGeo, psuFanMat);
  psuFan.position.set(0, 1, -1.65);
  pc.add(psuFan);

  // === STORAGE (2 SSDs) ===
  for (let i = 0; i < 2; i++) {
    const ssdGeo = new THREE.BoxGeometry(0.8, 0.12, 1.2);
    const ssdMat = new THREE.MeshStandardMaterial({ color: 0x222240, roughness: 0.4, metalness: 0.5 });
    const ssd = new THREE.Mesh(ssdGeo, ssdMat);
    ssd.position.set(-1.3, 2.2 + i * 0.25, 0.5);
    pc.add(ssd);
  }

  // === CABLES (simplified as lines) ===
  const cableMat = new THREE.LineBasicMaterial({ color: 0x444444 });
  const cables = [
    [[0, 1.8, 0], [0, 3, -0.4]],   // PSU to MB
    [[1, 1.8, 0], [1, 3.3, 0.5]],   // PSU to GPU
    [[0.5, 1.8, 0], [0.5, 5, -0.3]] // PSU to CPU
  ];
  cables.forEach(([a, b]) => {
    const mid = [(a[0]+b[0])/2 + 0.3, (a[1]+b[1])/2, (a[2]+b[2])/2 + 0.5];
    const pts = [new THREE.Vector3(...a), new THREE.Vector3(...mid), new THREE.Vector3(...b)];
    const curve = new THREE.QuadraticBezierCurve3(pts[0], pts[1], pts[2]);
    const cGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
    pc.add(new THREE.Line(cGeo, cableMat));
  });

  // === REAR I/O ===
  for (let i = 0; i < 5; i++) {
    const ioGeo = new THREE.BoxGeometry(0.4, 0.2, 0.05);
    const ioMat = new THREE.MeshStandardMaterial({ color: 0x555577 });
    const io = new THREE.Mesh(ioGeo, ioMat);
    io.position.set(-1.2 + i * 0.6, 7, -3.5);
    pc.add(io);
  }

  // === LED strip at bottom ===
  const ledGeo = new THREE.BoxGeometry(3.8, 0.08, 0.08);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x2da39a });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0, 0.2, 3.3);
  led.userData.isLED = true;
  pc.add(led);

  return pc;
}

// Labels for each component that flies in
const COMPONENTS = [
  { name: 'Корпус', delay: 0, indices: [0,1,2,3,4,5,6,7] },
  { name: 'Материнская плата', delay: 0.8 },
  { name: 'Процессор + Охлаждение', delay: 1.8 },
  { name: 'Видеокарта', delay: 3.0 },
  { name: 'Оперативная память', delay: 4.0 },
  { name: 'Блок питания', delay: 5.0 },
  { name: 'Накопители + Кабели', delay: 5.8 },
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
    scene.add(new THREE.AmbientLight(0x4444aa, 0.5));
    const dL = new THREE.DirectionalLight(0xffffff, 1.0);
    dL.position.set(10, 20, 15);
    dL.castShadow = true;
    scene.add(dL);
    const rimL = new THREE.DirectionalLight(0x2da39a, 0.3);
    rimL.position.set(-10, 5, -10);
    scene.add(rimL);

    // Floor
    const gridHelper = new THREE.GridHelper(300, 60, 0x1a1a3a, 0x0f0f20);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);
    const floorGeo = new THREE.PlaneGeometry(300, 300);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // === BUILD DETAILED PC (Phase 1) ===
    const pcModel = buildPC();
    scene.add(pcModel);

    // Collect children for assembly animation
    const pcParts = [];
    pcModel.traverse(child => {
      if (child.isMesh || child.isLine || child.isLineSegments) {
        const origPos = child.position.clone();
        // Scatter parts far away initially
        const scatter = new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          15 + Math.random() * 20,
          (Math.random() - 0.5) * 30
        );
        child.userData.origPos = origPos;
        child.userData.scatterPos = scatter;
        child.position.copy(scatter);
        child.userData.assembled = false;
        pcParts.push(child);
      }
    });

    // === INSTANCED MESH for Phase 2 (1200 PCs) ===
    const TOTAL_PCS = 1200;
    const instGeo = new THREE.BoxGeometry(1, 2, 1.5);
    const instMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e, emissive: 0x2da39a, emissiveIntensity: 0
    });
    const instEdgeGeo = new THREE.EdgesGeometry(instGeo);

    const instancedMesh = new THREE.InstancedMesh(instGeo, instMat, TOTAL_PCS);
    instancedMesh.visible = false;
    scene.add(instancedMesh);

    const cols = 40, rows = 30, spX = 2.5, spZ = 2;
    const pcData = [];
    const dummy = new THREE.Object3D();
    const baseColor = new THREE.Color(0x1a1a2e);
    const flashColor = new THREE.Color(0x2da39a);

    for (let i = 0; i < TOTAL_PCS; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      const x = (col - cols / 2) * spX, z = (row - rows / 2) * spZ;
      pcData.push({ x, z, delay: col * 0.04 + row * 0.04 + Math.random() * 0.08, visible: false, flashT: 0 });
      dummy.position.set(x, 1, z);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, baseColor);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;

    // === ANIMATION ===
    const clock = new THREE.Clock();
    let animId, isVisible = false;

    // Phase timing
    const ASSEMBLY_DUR = 7;     // seconds for PC assembly
    const TRANSITION_DUR = 3;   // camera zoom out
    const SPAWN_DUR = 8;        // 1200 PCs appearing
    const TOTAL_LOOP = ASSEMBLY_DUR + TRANSITION_DUR + SPAWN_DUR + 3; // +3s hold

    // Camera keyframes
    const camAssembly = { pos: new THREE.Vector3(8, 8, 14), look: new THREE.Vector3(0, 4, 0) };
    const camZoomOut = { pos: new THREE.Vector3(0, 120, 160), look: new THREE.Vector3(0, 0, 0) };

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

    const tick = () => {
      animId = requestAnimationFrame(tick);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const time = clock.elapsedTime;
      const loopT = time % TOTAL_LOOP;

      const T1 = ASSEMBLY_DUR;
      const T2 = T1 + TRANSITION_DUR;
      const T3 = T2 + SPAWN_DUR;

      // === PHASE 1: Assembly ===
      if (loopT < T1) {
        // Camera orbits around the PC
        const angle = loopT * 0.3;
        const radius = 14;
        camera.position.set(
          Math.sin(angle) * radius,
          6 + Math.sin(loopT * 0.5) * 2,
          Math.cos(angle) * radius
        );
        camera.lookAt(0, 4, 0);

        // Animate parts flying to their positions
        pcParts.forEach((part, i) => {
          const partDelay = (i / pcParts.length) * (T1 - 1.5);
          if (loopT > partDelay) {
            const t = easeOut(Math.min(1, (loopT - partDelay) / 1.2));
            part.position.lerpVectors(part.userData.scatterPos, part.userData.origPos, t);
            part.userData.assembled = t >= 1;
          } else {
            part.position.copy(part.userData.scatterPos);
          }
        });

        // Labels
        const phase = Math.min(6, Math.floor(loopT / (T1 / 7)));
        if (phase < COMPONENTS.length) setLabel(COMPONENTS[phase].name);

        // Fan spinning (for assembled parts)
        pcModel.traverse(child => {
          if (child.userData.isFanBlade && child.userData.assembled) {
            child.rotation.z = time * 8 + (child.userData.bladeIndex || 0) * Math.PI / 2;
          }
          if (child.userData.isLED) {
            child.material.color.setHSL(0.48, 1, 0.4 + Math.sin(time * 4) * 0.2);
          }
        });

        pcModel.visible = true;
        instancedMesh.visible = false;
        setCount(0);
      }

      // === PHASE 2: Transition (zoom out) ===
      if (loopT >= T1 && loopT < T2) {
        const p = easeInOut((loopT - T1) / TRANSITION_DUR);
        camera.position.lerpVectors(camAssembly.pos, camZoomOut.pos, p);
        camera.lookAt(
          THREE.MathUtils.lerp(camAssembly.look.x, camZoomOut.look.x, p),
          THREE.MathUtils.lerp(camAssembly.look.y, camZoomOut.look.y, p),
          THREE.MathUtils.lerp(camAssembly.look.z, camZoomOut.look.z, p)
        );

        // Fade out detailed PC, show instanced
        if (p > 0.5) {
          pcModel.visible = false;
          instancedMesh.visible = true;
          // Show first PC in center
          dummy.position.set(0, 1, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
          instancedMesh.setMatrixAt(0, dummy.matrix);
          instancedMesh.setColorAt(0, flashColor);
          pcData[0].visible = true;
          instancedMesh.instanceMatrix.needsUpdate = true;
          instancedMesh.instanceColor.needsUpdate = true;
        }

        setLabel('');
      }

      // === PHASE 3: 1200 PCs spawning ===
      if (loopT >= T2 && loopT < T3) {
        camera.position.copy(camZoomOut.pos);
        camera.lookAt(camZoomOut.look);

        pcModel.visible = false;
        instancedMesh.visible = true;

        const spawnTime = loopT - T2;
        let visCount = 0;
        let matUp = false, colUp = false;
        const colorObj = new THREE.Color();

        for (let i = 0; i < TOTAL_PCS; i++) {
          const pc = pcData[i];
          if (!pc.visible && spawnTime > pc.delay) {
            pc.visible = true; pc.flashT = 1;
            dummy.position.set(pc.x, 1, pc.z); dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
            matUp = true;
          }
          if (pc.visible) {
            visCount++;
            if (pc.flashT > 0) {
              pc.flashT -= delta * 3;
              if (pc.flashT < 0) pc.flashT = 0;
              colorObj.copy(baseColor).lerp(flashColor, pc.flashT);
              instancedMesh.setColorAt(i, colorObj);
              colUp = true;
            }
          }
        }
        if (matUp) instancedMesh.instanceMatrix.needsUpdate = true;
        if (colUp) instancedMesh.instanceColor.needsUpdate = true;
        setCount(visCount);
      }

      // === PHASE 4: Hold ===
      if (loopT >= T3) {
        camera.position.copy(camZoomOut.pos);
        camera.lookAt(camZoomOut.look);
        setCount(TOTAL_PCS);
      }

      // Reset for next loop
      if (loopT < 0.1) {
        pcData.forEach((pc, i) => {
          pc.visible = false; pc.flashT = 0;
          dummy.scale.set(0, 0, 0); dummy.position.set(pc.x, 1, pc.z);
          dummy.updateMatrix();
          instancedMesh.setMatrixAt(i, dummy.matrix);
          instancedMesh.setColorAt(i, baseColor);
        });
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;
        pcModel.visible = true; instancedMesh.visible = false;
        // Re-scatter parts
        pcParts.forEach(part => part.position.copy(part.userData.scatterPos));
      }

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
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Component label */}
      {label && (
        <div style={{
          position: 'absolute', bottom: 30, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(13, 13, 26, 0.9)',
          border: '1px solid rgba(45, 163, 154, 0.4)',
          borderRadius: '10px', padding: '10px 24px',
          color: '#2da39a', fontSize: 14, fontWeight: 600,
          fontFamily: 'var(--font-display)',
          backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          animation: 'labelFade 0.3s ease-out',
          boxShadow: '0 4px 20px rgba(45,163,154,0.12)'
        }}>
          🔧 {label}
        </div>
      )}

      {/* Counter */}
      {count > 0 && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          fontFamily: 'monospace', fontSize: 20, color: '#2da39a',
          background: 'rgba(13, 13, 26, 0.85)',
          padding: '8px 18px', borderRadius: '8px',
          border: '1px solid rgba(45, 163, 154, 0.3)',
          fontWeight: 'bold',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          {count} / 1200
        </div>
      )}

      <style>{`
        @keyframes labelFade {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
