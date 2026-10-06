import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { TUNNEL_LENGTH, tunnelPath, flightPose, damp, renderQualityFor, unit } from './sculptureMath';
import { createTunnelGeometries } from './sculptureGeometry';
import { createTunnelShell } from './tunnelShell';
import { createLatticeLayout, createWallLayout, wallPose, latticePoint, latticeNoise, tunnelMood, lampGain } from './latticeMath';

const atmosphereShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec2 edge=vUv-.5;
      vec3 color=texture2D(tDiffuse,vUv).rgb;
      color*=1.-smoothstep(.25,.75,length(edge))*.32;
      gl_FragColor=vec4(max(color,vec3(0.)),1.);
    }`,
};
let lightingInitialized = false;

// Original authored architecture; scroll choreographs its shape, light and camera.
export async function createSculpture(host, { reduced, onError }) {
  // Keep the immutable lighting lookup tables in a separately cached lazy chunk.
  // Await them before allocating a canvas or starting any graphics lifecycle.
  const { RectAreaLightUniformsLib } = await import('three/addons/lights/RectAreaLightUniformsLib.js');
  // Three's LTC textures are shared globals, retained once across route visits.
  if (!lightingInitialized) { RectAreaLightUniformsLib.init(); lightingInitialized = true; }
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#020408');
  scene.fog = new THREE.FogExp2('#020408', .019);
  const camera = new THREE.PerspectiveCamera(62, 1, .15, 150);
  const room = new RoomEnvironment();
  // Long softboxes give the metal a legible reflected shape, rather than a
  // collection of tiny sparkling points. These are original generated assets.
  for (const [x, color] of [[-7, '#bde9ee'], [7, '#d9c9eb']]) {
    const softbox = new THREE.Mesh(new THREE.BoxGeometry(.1, 7, 2), new THREE.MeshBasicMaterial({ color }));
    softbox.position.set(x, 4, -3); room.add(softbox);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .03);
  scene.environment = environment.texture;
  scene.environmentIntensity = .32;
  room.dispose(); pmrem.dispose();

  const light = new THREE.PointLight('#bcffff', 90, 42, 2);
  const rim = new THREE.PointLight('#c1dfff', 65, 42, 2);
  const coreLight = new THREE.PointLight('#ffffff', 18, 26, 2);
  const keySoftbox = new THREE.RectAreaLight('#c8f0f2', .8, 5, 9);
  const fillSoftbox = new THREE.RectAreaLight('#bdd8ef', .55, 4, 8);
  scene.add(light, rim, coreLight, keySoftbox, fillSoftbox, new THREE.HemisphereLight('#647d8c', '#090714', .18));
  const geometries = createTunnelGeometries();
  const metal = new THREE.MeshStandardMaterial({ color: '#53636d', metalness: .88, roughness: .36 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#26323a', metalness: .8, roughness: .42 });
  const panelMaterial = new THREE.MeshStandardMaterial({ color: '#899cac', metalness: .85, roughness: .32 });
  const portalMaterial = new THREE.MeshStandardMaterial({ color: '#91b6be', metalness: .9, roughness: .28, emissive: '#365666', emissiveIntensity: .18 });
  const facetMaterial = new THREE.MeshPhysicalMaterial({ color: '#8293ad', metalness: .88, roughness: .26, clearcoat: .3, clearcoatRoughness: .3 });
  const ribbonMaterial = new THREE.MeshStandardMaterial({ color: '#a3c0c5', metalness: .9, roughness: .32 });
  const coreMaterial = new THREE.MeshPhysicalMaterial({ color: '#91a1b1', metalness: .9, roughness: .28, clearcoat: .45, clearcoatRoughness: .28 });
  const nucleusMaterial = new THREE.MeshStandardMaterial({ color: '#d7fff5', emissive: '#b3fff0', emissiveIntensity: .25 });
  const lampMaterials = [0, 1, 2, 3, 4].map(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  const shellMaterials = [
    new THREE.MeshPhysicalMaterial({ color: '#566873', metalness: .86, roughness: .42, anisotropy: .35, vertexColors: true }),
    new THREE.MeshPhysicalMaterial({ color: '#8599a7', metalness: .9, roughness: .34, anisotropy: .55, anisotropyRotation: Math.PI / 2, vertexColors: true }),
    new THREE.MeshStandardMaterial({ color: '#263541', metalness: .78, roughness: .48, vertexColors: true }),
  ];
  let shell = createTunnelShell(undefined, host.clientWidth < 700 ? 24 : 48);
  const enclosure = new THREE.Mesh(shell.geometry, shellMaterials);
  enclosure.frustumCulled = false; scene.add(enclosure);
  const layout = createLatticeLayout();
  function instances(items, material, geometry = geometries[0]) {
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, items };
  }
  const structure = instances(layout.beams, metal, geometries[3]);
  const detail = instances(layout.details, darkMetal);
  const wallLayout = createWallLayout();
  const walls = [
    instances(wallLayout.panels, panelMaterial, geometries[4]),
    instances(wallLayout.portals, portalMaterial, geometries[6]),
    instances(wallLayout.facets, facetMaterial, geometries[5]),
    instances(wallLayout.ribbons, ribbonMaterial, geometries[7]),
  ];
  const lamps = lampMaterials.map((material, color) => instances(layout.lamps.filter(item => item.color === color), material));
  const lampColor = new THREE.Color();
  for (const batch of lamps) {
    batch.items.forEach((_, index) => batch.mesh.setColorAt(index, lampColor));
    batch.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  const dummy = new THREE.Object3D();
  const from = new THREE.Vector3(), to = new THREE.Vector3(), direction = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3(), radial = new THREE.Vector3(), depthAxis = new THREE.Vector3(0, 0, 1);
  const basis = new THREE.Matrix4(), localRotation = new THREE.Quaternion(), localEuler = new THREE.Euler();
  let lastArchitecture = -1;
  function updateArchitecture(mood) {
    if (Math.abs(lastArchitecture - mood.progress) < .00001) return;
    lastArchitecture = mood.progress;
    shell.update(mood);
    for (const batch of [structure, detail, ...lamps]) {
      batch.items.forEach(({ a, b, width, thickness = width }, index) => {
        const p = latticePoint(a, mood), q = latticePoint(b, mood);
        from.set(p.x, p.y, p.z); to.set(q.x, q.y, q.z);
        direction.subVectors(to, from);
        dummy.position.copy(from).add(to).multiplyScalar(.5);
        const length = direction.length();
        dummy.quaternion.setFromUnitVectors(up, direction.normalize());
        dummy.scale.set(width, length, thickness);
        dummy.updateMatrix(); batch.mesh.setMatrixAt(index, dummy.matrix);
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const batch of walls) {
      batch.items.forEach((module, index) => {
        const pose = wallPose(module, mood);
        radial.set(Math.cos(pose.angle), Math.sin(pose.angle), 0);
        tangent.set(-radial.y, radial.x, 0);
        basis.makeBasis(tangent, depthAxis, radial);
        dummy.position.set(pose.x, pose.y, pose.z);
        dummy.quaternion.setFromRotationMatrix(basis);
        localRotation.setFromEuler(localEuler.set(module.tilt, 0, module.roll));
        dummy.quaternion.multiply(localRotation);
        dummy.scale.set(...module.scale);
        dummy.updateMatrix(); batch.mesh.setMatrixAt(index, dummy.matrix);
      });
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const batch of lamps) {
      batch.items.forEach(({ a }, index) => {
        const gain = lampGain(a.distance + 5 - mood.progress * TUNNEL_LENGTH);
        batch.mesh.setColorAt(index, lampColor.setRGB(gain, gain, gain));
      });
      batch.mesh.instanceColor.needsUpdate = true;
    }
  }

  const sculpture = new THREE.Group();
  const core = new THREE.Mesh(geometries[1], coreMaterial);
  const nucleus = new THREE.Mesh(geometries[2], nucleusMaterial);
  sculpture.add(core, nucleus); scene.add(sculpture);
  const points = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const distance = latticeNoise(i + 20) * (TUNNEL_LENGTH + 35);
    const path = tunnelPath(distance), angle = i * 2.399963;
    const radius = 4.2 + latticeNoise(i + 80) * 2;
    points[i * 3] = path.x + Math.cos(angle) * radius;
    points[i * 3 + 1] = path.y + Math.sin(angle) * radius;
    points[i * 3 + 2] = -distance;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: '#a9dce8', size: .018, transparent: true, opacity: .4, depthWrite: false });
  scene.add(new THREE.Points(dustGeometry, dustMaterial));

  // Canvas antialiasing alone does not cover an offscreen postprocessing buffer.
  const quality = renderQualityFor(host.clientWidth, host.clientHeight, window.devicePixelRatio, renderer.capabilities.maxSamples);
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality.samples });
  const composer = new EffectComposer(renderer, renderTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .45, .25, 1.15);
  const atmosphere = new ShaderPass(atmosphereShader);
  const output = new OutputPass();
  const antialias = new ShaderPass({
    ...FXAAShader,
    // Composer textures have no mip chain. Explicit LOD keeps edge-search sampling
    // defined inside divergent FXAA loops on Windows/ANGLE drivers.
    fragmentShader: FXAAShader.fragmentShader.replace('return texture( tex2D, uv );', 'return textureLod( tex2D, uv, 0.0 );'),
  });
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(atmosphere); composer.addPass(output); composer.addPass(antialias);
  let targetProgress = 0, progress = 0;
  let pointerX = 0, pointerY = 0, lookX = 0, lookY = 0;
  let frame = 0, lastTime = 0, elapsed = 0;
  let alive = true, visible = true, compact = false;
  let settleSeconds = 1;

  function requestDraw() { if (alive && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw); }
  function draw(now) {
    frame = 0;
    if (!alive || !visible || document.hidden) return;
    const dt = Math.min((now - (lastTime || now)) / 1000, 1 / 30);
    lastTime = now;
    const staticMode = reduced;
    if (!staticMode) elapsed += dt;
    settleSeconds = Math.max(0, settleSeconds - dt);
    progress = staticMode ? targetProgress : damp(progress, targetProgress, dt, 7);
    lookX = staticMode ? 0 : damp(lookX, pointerX, dt, 4);
    lookY = staticMode ? 0 : damp(lookY, pointerY, dt, 4);
    const mood = tunnelMood(progress);
    // Reduced motion retains the opening architecture and fixed camera.
    updateArchitecture(reduced ? tunnelMood(0) : mood);
    const pose = flightPose(reduced ? 0 : progress, lookX, lookY, compact);
    const fov = (compact ? 76 : 62) + Math.sin(progress * Math.PI) * 3 - mood.arrival * 4;
    if (!reduced && Math.abs(camera.fov - fov) > .005) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.position.set(pose.x, pose.y, pose.z);
    camera.lookAt(pose.aimX, pose.aimY, pose.aimZ);
    if (!reduced) camera.rotateZ(mood.roll + lookX * .025);
    light.position.set(pose.x - 2.8, pose.y + 2.5, pose.z - 8);
    rim.position.set(pose.x + 3, pose.y - 2.8, pose.z - 16);
    keySoftbox.position.set(pose.x - 4.5, pose.y + 1.8, pose.z - 10);
    fillSoftbox.position.set(pose.x + 4.5, pose.y - 1.5, pose.z - 17);
    keySoftbox.lookAt(pose.aimX, pose.aimY, pose.z - 12);
    fillSoftbox.lookAt(pose.aimX, pose.aimY, pose.z - 19);
    keySoftbox.color.setRGB(.55, .82 - mood.glow * .2, 1);
    fillSoftbox.color.setRGB(.55 + mood.glow * .4, .72 - mood.glow * .4, .9);
    keySoftbox.intensity = .8 - mood.arrival * .2;
    fillSoftbox.intensity = .55 + mood.glow * .15;
    light.color.setRGB(.45 - mood.glow * .35, .85 - mood.glow * .35, 1 + mood.glow * .25);
    rim.color.setRGB(.5 + mood.glow * .7, .9 - mood.glow * .85, 1 - mood.glow * .65);
    const palette = [[.75, 1, 1], [.08, .6, 2], [1, .95, 1], [2, .07, .3], [.55, .2, 1]];
    lampMaterials.forEach((material, index) => {
      const rgb = palette[index];
      const colorful = index > 2 ? mood.glow : 1;
      const pulse = .96 + Math.sin(elapsed * .5 + index) * .04;
      const brightness = (1.1 + mood.glow * 1.5) * (1 - mood.arrival * .65) * pulse;
      material.color.setRGB((.8 * (1 - colorful) + rgb[0] * colorful) * brightness, (1 - colorful + rgb[1] * colorful) * brightness, (1 - colorful + rgb[2] * colorful) * brightness);
    });
    const coreDistance = (reduced ? 0 : progress * TUNNEL_LENGTH) + 15 - (reduced ? 0 : mood.arrival * 4);
    const corePath = tunnelPath(coreDistance);
    sculpture.position.set(corePath.x + Math.sin(elapsed * .4) * .08, corePath.y + Math.cos(elapsed * .3) * .08 + (reduced ? 0 : mood.arrival * .9), corePath.z);
    sculpture.rotation.set(.3 + Math.sin(elapsed * .15) * .15, elapsed * .15 + (reduced ? 0 : progress * 4.5), .4 + (reduced ? 0 : mood.spiral));
    sculpture.scale.setScalar(1 + (reduced ? 0 : mood.arrival * 1.4));
    coreLight.position.set(sculpture.position.x - 1.4, sculpture.position.y + 2, sculpture.position.z + 3);
    bloom.strength = ((compact ? .25 : .32) + mood.glow * (compact ? .2 : .3)) * (1 - mood.arrival * .35);
    try { composer.render(dt); }
    catch { alive = false; onError(); return; }
    // Interaction drives the animation. After a short settling tail, the scene
    // rests until the next scroll/pointer event, without a perpetual ambient loop.
    if (!staticMode && (Math.abs(progress - targetProgress) > .0001 || Math.abs(lookX - pointerX) > .001 || Math.abs(lookY - pointerY) > .001 || settleSeconds > 0)) requestDraw();
  }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    compact = width < 700;
    const curveSegments = compact ? 24 : 48;
    if (shell.curveSegments !== curveSegments) {
      const previous = shell;
      shell = createTunnelShell(previous.cells, curveSegments);
      enclosure.geometry = shell.geometry; previous.geometry.dispose();
      lastArchitecture = -1;
    }
    const { ratio, samples } = renderQualityFor(width, height, window.devicePixelRatio, renderer.capabilities.maxSamples);
    if (composer.renderTarget1.samples !== samples) {
      for (const target of [composer.renderTarget1, composer.renderTarget2]) {
        target.dispose(); target.samples = samples;
      }
    }
    renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio); composer.setSize(width, height);
    antialias.uniforms.resolution.value.set(1 / Math.max(1, Math.floor(width * ratio)), 1 / Math.max(1, Math.floor(height * ratio)));
    detail.mesh.visible = !compact;
    camera.aspect = width / height; camera.fov = compact ? 76 : 62; camera.updateProjectionMatrix();
    dustGeometry.setDrawRange(0, compact ? 300 : 600);
    lastTime = 0; settleSeconds = 1; requestDraw();
  }
  function onMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
    pointerY = Math.max(-1, Math.min(1, -(event.clientY - rect.top) / rect.height * 2 + 1));
    settleSeconds = 1; requestDraw();
  }
  function onLeave() { pointerX = 0; pointerY = 0; settleSeconds = 1; requestDraw(); }
  function onVisibility() {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestDraw();
  }
  function onContextLost(event) { event.preventDefault(); cancelAnimationFrame(frame); frame = 0; alive = false; onError(); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; lastTime = 0;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else requestDraw();
  });
  intersection.observe(host);
  canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('webglcontextlost', onContextLost); document.addEventListener('visibilitychange', onVisibility);
  resize();
  return {
    setProgress(value) { targetProgress = unit(value); settleSeconds = 1; requestDraw(); },
    destroy() {
      alive = false; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      [structure, detail, ...walls, ...lamps].forEach(({ mesh }) => mesh.dispose());
      geometries.forEach(geometry => geometry.dispose());
      shell.geometry.dispose(); shellMaterials.forEach(material => material.dispose());
      [metal, darkMetal, panelMaterial, portalMaterial, facetMaterial, ribbonMaterial, coreMaterial, nucleusMaterial, dustMaterial, ...lampMaterials].forEach(material => material.dispose());
      dustGeometry.dispose(); environment.dispose();
      bloom.dispose(); atmosphere.dispose(); output.dispose(); antialias.dispose(); composer.dispose();
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
