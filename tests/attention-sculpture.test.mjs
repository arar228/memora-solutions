import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { Triangle, Vector3 } from 'three';
import { TUNNEL_LENGTH, unit, scrollProgress, tunnelPath, flightPose, damp, pixelRatioFor, renderQualityFor } from '../src/pages/AttentionLab/sculptureMath.js';
import { createTunnelGeometries } from '../src/pages/AttentionLab/sculptureGeometry.js';
import { LATTICE, smoothRange, tunnelMood, latticeNoise, latticePoint, createLatticeLayout, createWallLayout, wallWeights, wallPose, lampGain } from '../src/pages/AttentionLab/latticeMath.js';
import { createShellLayout, createTunnelShell, shellAnchor } from '../src/pages/AttentionLab/tunnelShell.js';

test('native scroll maps the sticky track to a bounded reversible journey', () => {
  assert.equal(scrollProgress(60, 6200, 1000, 60), 0);
  assert.equal(scrollProgress(60 - (6200 - 940) / 2, 6200, 1000, 60), .5);
  assert.equal(scrollProgress(60 - (6200 - 940), 6200, 1000, 60), 1);
  assert.equal(scrollProgress(0, 7600, 1000, 0), 0);
  assert.equal(scrollProgress(-3300, 7600, 1000, 0), .5);
  assert.equal(scrollProgress(-6600, 7600, 1000, 0), 1);
  assert.equal(scrollProgress(-9000, 6200, 1000, 60), 1);
  assert.equal(scrollProgress(800, 6200, 1000, 60), 0);
  assert.equal(scrollProgress(0, 400, 1000, 60), 0);
  for (const value of [NaN, Infinity, undefined]) assert.equal(scrollProgress(value, 6200, 1000, 60), 0);
});

test('flight depth follows scroll without compulsory click stages', () => {
  let lastZ = Infinity;
  for (let i = 0; i <= 100; i++) {
    const pose = flightPose(i / 100);
    assert.ok(pose.z <= lastZ); lastZ = pose.z;
    assert.ok(pose.aimZ < pose.z);
  }
  assert.equal(flightPose(0).z - flightPose(1).z, TUNNEL_LENGTH);
  assert.deepEqual(flightPose(0), flightPose(-1));
  assert.deepEqual(flightPose(1), flightPose(100));
});

test('camera and pointer offsets stay finite and inside the tunnel', () => {
  for (const progress of [0, .2, .8, 1, NaN, Infinity]) for (const compact of [false, true]) {
    for (const pointer of [-100, -1, 0, 1, 100, NaN, Infinity]) {
      const pose = flightPose(progress, pointer, pointer, compact);
      assert.ok(Object.values(pose).every(Number.isFinite));
      assert.ok(Math.abs(pose.x) < 2 && Math.abs(pose.y) < 2);
    }
  }
  assert.ok(Math.abs(flightPose(0, 1, 1, true).x) < Math.abs(flightPose(0, 1, 1, false).x));
  for (const value of [NaN, Infinity, undefined]) assert.deepEqual(tunnelPath(value), tunnelPath(0));
});

test('scroll choreography progresses from a square corridor through a spiral to arrival', () => {
  assert.equal(tunnelMood(0).spiral, 0);
  assert.equal(tunnelMood(.72).spiral, 1);
  assert.equal(tunnelMood(.88).arrival, 0);
  assert.equal(tunnelMood(1).arrival, 1);
  assert.ok(Math.abs(smoothRange(.1, .5, .3) - .5) < 1e-12);
  let lastSpiral = 0, lastArrival = 0;
  for (let i = 0; i <= 100; i++) {
    const mood = tunnelMood(i / 100);
    assert.ok(Object.values(mood).every(Number.isFinite));
    assert.ok(mood.spiral >= lastSpiral && mood.arrival >= lastArrival);
    lastSpiral = mood.spiral; lastArrival = mood.arrival;
    assert.ok(mood.glow >= 0 && mood.glow <= 1 && Math.abs(mood.roll) <= .24);
  }
  assert.ok(tunnelMood(.72).glow > tunnelMood(1).glow);
  assert.deepEqual(tunnelMood(NaN), tunnelMood(0));
});

test('camera damping converges and clamps long or invalid frame times', () => {
  let value = 0;
  for (let i = 0; i < 120; i++) value = damp(value, 1, 1 / 60);
  assert.ok(Math.abs(value - 1) < .00001);
  assert.equal(damp(0, 1, 300), damp(0, 1, 1 / 30));
  for (const seconds of [NaN, Infinity, -1]) assert.equal(damp(0, 1, seconds), 0);
  for (const value of [NaN, Infinity, undefined, -100]) assert.equal(unit(value), 0);
});

test('tunnel resolution is bounded for desktop and mobile GPUs', () => {
  assert.equal(pixelRatioFor(390, 3), 1.5);
  assert.equal(pixelRatioFor(1280, 3), 2);
  assert.equal(pixelRatioFor(1280, NaN), 1.25);
  assert.equal(pixelRatioFor(390, .2), 1);
});

test('supersampling and offscreen MSAA honor viewport budgets and driver limits', () => {
  assert.deepEqual(renderQualityFor(1280, 720, 1, 8), { ratio: 1.25, samples: 4 });
  assert.deepEqual(renderQualityFor(390, 844, 3, 4), { ratio: 1.5, samples: 2 });
  for (const [width, height] of [[390, 844], [600, 2000], [1280, 720], [1920, 1080], [3840, 2160], [7680, 4320]]) {
    for (const samples of [0, 1, 2, 4, 8, NaN, Infinity, -1]) {
      const quality = renderQualityFor(width, height, 4, samples);
      assert.ok(quality.ratio > 0 && Number.isFinite(quality.ratio));
      assert.ok(width * height * quality.ratio ** 2 <= (width < 700 ? 1_000_000 : 4_000_000) + .001);
      assert.ok(quality.samples >= 0 && quality.samples <= 4 && Number.isInteger(quality.samples));
      if (Number.isFinite(samples) && samples >= 0) assert.ok(quality.samples <= samples);
    }
  }
  assert.deepEqual(renderQualityFor(NaN, Infinity, NaN, NaN), { ratio: 1, samples: 0 });
});

test('near-camera lamps taper smoothly while distant accents retain their light', () => {
  assert.equal(lampGain(0), .18);
  assert.equal(lampGain(20), 1);
  let previous = 0;
  for (let distance = -5; distance < 25; distance += .1) {
    const gain = lampGain(distance);
    assert.ok(gain >= previous && gain <= 1); previous = gain;
  }
  for (const invalid of [NaN, Infinity, undefined]) assert.equal(lampGain(invalid), .18);
});

test('extended journey keeps native scrolling and the short reduced-motion path', () => {
  const css = readFileSync(new URL('../src/pages/AttentionLab/AttentionJourney.css', import.meta.url), 'utf8');
  assert.match(css, /height: 2400svh/);
  assert.match(css, /height: 1800svh/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*height: 240svh/);
  assert.equal(scrollProgress(-11500, 24000, 1000), .5);
  assert.equal(scrollProgress(-23000, 24000, 1000), 1);
  assert.equal(scrollProgress(-8500, 18000, 1000), .5);
  assert.equal(TUNNEL_LENGTH, 180);
});

test('clean postprocessing uses full-resolution MSAA and output-space FXAA with disposal', () => {
  const renderer = readFileSync(new URL('../src/pages/AttentionLab/sculptureRenderer.js', import.meta.url), 'utf8');
  assert.match(renderer, /WebGLRenderTarget\(1, 1, \{ type: THREE.HalfFloatType, samples: quality.samples \}\)/);
  assert.match(renderer, /new EffectComposer\(renderer, renderTarget\)/);
  assert.match(renderer, /composer.setPixelRatio\(ratio\)/);
  assert.match(renderer, /addPass\(output\); composer.addPass\(antialias\)/);
  assert.match(renderer, /antialias.uniforms.resolution.value.set/);
  assert.match(renderer, /antialias.dispose\(\)/);
  assert.ok(FXAAShader.fragmentShader.includes('return texture( tex2D, uv );'));
  assert.match(renderer, /return textureLod\( tex2D, uv, 0.0 \);/);
  assert.match(renderer, /target.dispose\(\); target.samples = samples/);
  assert.doesNotMatch(renderer, /color\.[rb]=texture2D|floor\(time|uniform float time|noise\(vUv/);
});

test('the original focal sculpture uses a smooth shared continuous surface', () => {
  const geometries = createTunnelGeometries();
  try {
    assert.ok(geometries[1].parameters.tubularSegments >= 160);
    assert.ok(geometries[1].parameters.radialSegments >= 20);
    assert.ok(geometries[1].boundingSphere.radius < 1.3);
    assert.equal(geometries[3].type, 'RoundedBoxGeometry');
    assert.equal(geometries[3].parameters.radius, .025);
    assert.ok(geometries[3].attributes.position.count / 3 <= 108);
    assert.ok([...geometries[3].attributes.position.array].every(value => Math.abs(value) <= .50001));
    assert.equal(geometries[4].type, 'ExtrudeGeometry');
    assert.ok(geometries[4].parameters.options.bevelEnabled);
    for (const geometry of geometries) {
      assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
      assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
    }
  } finally { geometries.forEach(geometry => geometry.dispose()); }
});

test('architecture and light positions are reproducible and bounded in complexity', () => {
  const first = createLatticeLayout(), second = createLatticeLayout();
  assert.deepEqual(first, second);
  assert.equal(first.beams.length, LATTICE.sections * LATTICE.sides * 2.5);
  assert.ok(first.beams.length < 2200 && first.details.length < 1800 && first.lamps.length < 450);
  assert.ok(Math.max(...first.beams.map(item => item.b.distance)) > TUNNEL_LENGTH + 20);
  for (let i = 0; i < 100; i++) assert.ok(latticeNoise(i) >= 0 && latticeNoise(i) < 1);
});

test('spatial chapters blend four distinct wall families along the entire longer tunnel', () => {
  assert.deepEqual(wallWeights(0), { panels: 1, portals: 0, facets: 0, ribbons: 0 });
  assert.equal(wallWeights(TUNNEL_LENGTH * .35).portals, 1);
  assert.equal(wallWeights(TUNNEL_LENGTH * .6).facets, 1);
  assert.equal(wallWeights(TUNNEL_LENGTH).ribbons, 1);
  for (let i = -10; i < TUNNEL_LENGTH + 40; i += .5) {
    const weights = Object.values(wallWeights(i));
    assert.ok(weights.every(value => value >= 0 && value <= 1));
    assert.ok(Math.abs(weights.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
  }
  assert.deepEqual(wallWeights(NaN), wallWeights(0));
  const distance = TUNNEL_LENGTH * .6, path = tunnelPath(distance);
  const radius = angle => {
    const point = latticePoint({ distance, angle }, tunnelMood(.6));
    return Math.hypot(point.x - path.x, point.y - path.y);
  };
  assert.ok(radius(0) > 9 && radius(0) - radius(Math.PI / 3) > 4);
  const layout = createWallLayout();
  assert.deepEqual(layout, createWallLayout());
  assert.equal(Object.values(layout).flat().length, LATTICE.sections * 8);
  assert.ok(Object.values(layout).every(items => items.length > 60));
  for (const [family, items] of Object.entries(layout)) for (const item of items) {
    assert.ok(wallWeights(item.anchor.distance)[family] > 0);
    assert.ok(item.scale.every(value => Number.isFinite(value) && value > 0));
  }
});

test('all added wall forms retain clearance and gaps between neighboring modules', () => {
  const layout = createWallLayout(), geometries = createTunnelGeometries();
  const geometryIndex = { panels: 4, portals: 6, facets: 5, ribbons: 7 };
  try {
    const modules = Object.entries(layout).flatMap(([family, items]) => items.map(item => ({
      item, bound: geometries[geometryIndex[family]].boundingSphere.radius * Math.max(...item.scale),
    })));
    for (let step = 0; step <= 20; step++) {
      const mood = tunnelMood(step / 20);
      const poses = modules.map(({ item, bound }) => ({ ...wallPose(item, mood), bound }));
      for (const pose of poses) {
        assert.ok(Object.values(pose).every(Number.isFinite));
        const path = tunnelPath(-pose.z);
        assert.ok(Math.hypot(pose.x - path.x, pose.y - path.y) - pose.bound > 4.65);
      }
      for (let a = 0; a < poses.length; a++) for (let b = a + 1; b < poses.length; b++) {
        const first = poses[a], second = poses[b];
        if (Math.abs(first.z - second.z) > first.bound + second.bound) continue;
        assert.ok(Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z) > first.bound + second.bound + .05);
      }
    }
  } finally { geometries.forEach(geometry => geometry.dispose()); }
});

test('all interpolated struts preserve a clear corridor throughout the morph', () => {
  const { beams, details, lamps } = createLatticeLayout();
  for (let step = 0; step <= 20; step++) {
    const mood = tunnelMood(step / 20);
    for (const beam of [...beams, ...details, ...lamps]) {
      const a = latticePoint(beam.a, mood), b = latticePoint(beam.b, mood);
      for (let t = 0; t <= 1; t += .25) {
        const x = a.x * (1 - t) + b.x * t, y = a.y * (1 - t) + b.y * t, z = a.z * (1 - t) + b.z * t;
        assert.ok([x, y, z].every(Number.isFinite));
        const path = tunnelPath(-z);
        assert.ok(Math.hypot(x - path.x, y - path.y) - beam.width > 4.5);
      }
    }
  }
});

test('recessed wall cassettes retain finite surfaces, normals and a clear corridor', () => {
  const cells = createShellLayout();
  assert.deepEqual(cells, createShellLayout());
  assert.ok(cells.length > 500 && cells.length < 700);
  assert.deepEqual([...new Set(cells.map(cell => cell.family))].sort(), ['facets', 'panels', 'portals', 'ribbons']);
  const shell = createTunnelShell(cells);
  try {
    const geometry = shell.geometry;
    assert.equal(geometry.groups.length, 3);
    assert.ok(geometry.attributes.position.count / 3 < 55_000);
    assert.ok([...geometry.attributes.uv.array].every(value => value >= 0 && value <= 1));
    for (let step = 0; step <= 10; step++) {
      const mood = tunnelMood(step / 10);
      shell.update(mood);
      const positions = geometry.attributes.position.array, normals = geometry.attributes.normal.array;
      for (let i = 0; i < positions.length; i += 3) {
        assert.ok(Number.isFinite(positions[i]) && Number.isFinite(positions[i + 1]) && Number.isFinite(positions[i + 2]));
        assert.ok(Math.abs(Math.hypot(normals[i], normals[i + 1], normals[i + 2]) - 1) < .00001);
        const path = tunnelPath(-positions[i + 2]);
        assert.ok(Math.hypot(positions[i] - path.x, positions[i + 1] - path.y) > 5.3);
      }
      // Triangle centers cover the surfaces between vertices, including returns.
      for (let i = 0; i < positions.length; i += 9) {
        const x = (positions[i] + positions[i + 3] + positions[i + 6]) / 3;
        const y = (positions[i + 1] + positions[i + 4] + positions[i + 7]) / 3;
        const z = (positions[i + 2] + positions[i + 5] + positions[i + 8]) / 3;
        const path = tunnelPath(-z);
        assert.ok(Math.hypot(x - path.x, y - path.y) > 5.1);
      }
    }
    // The first rim corner has an exact cached-coordinate counterpart.
    shell.update(tunnelMood(.5));
    const expected = latticePoint(shellAnchor(cells[0], .09, 0), tunnelMood(.5));
    for (const [axis, index] of [['x', 0], ['y', 1], ['z', 2]]) {
      assert.ok(Math.abs(geometry.attributes.position.array[index] - expected[axis]) < .00001);
    }
  } finally { shell.geometry.dispose(); }
});

test('architectural rooms and soft lighting preserve interaction-driven rendering and cleanup', () => {
  const renderer = readFileSync(new URL('../src/pages/AttentionLab/sculptureRenderer.js', import.meta.url), 'utf8');
  assert.match(renderer, /RectAreaLightUniformsLib.init\(\)/);
  assert.equal((renderer.match(/new THREE.RectAreaLight\(/g) || []).length, 2);
  assert.match(renderer, /anisotropy: \.35/);
  assert.match(renderer, /shell.update\(mood\)/);
  assert.match(renderer, /shell.geometry.dispose\(\); shellMaterials.forEach\(material => material.dispose\(\)\)/);
  assert.match(renderer, /enclosure.frustumCulled = false/);
  assert.match(renderer, /if \(!lightingInitialized\) \{ RectAreaLightUniformsLib.init\(\); lightingInitialized = true/);
  assert.match(renderer, /await import\('three\/addons\/lights\/RectAreaLightUniformsLib.js'\)/);
  const component = readFileSync(new URL('../src/pages/AttentionLab/AttentionSculpture.jsx', import.meta.url), 'utf8');
  assert.match(component, /const created = await createSculpture/);
  assert.match(component, /if \(cancelled\) \{ created.destroy\(\); return; \}/);
  assert.match(renderer, /Math.abs\(lastArchitecture - mood.progress\) < .00001/);
  assert.match(renderer, /camera.updateProjectionMatrix\(\)/);
  assert.match(renderer, /const curveSegments = compact \? 24 : 48/);
  assert.match(renderer, /enclosure.geometry = shell.geometry; previous.geometry.dispose\(\)/);
  // Final room is larger, while the opening keeps its previous profile.
  const radius = distance => {
    const point = latticePoint({ distance, angle: Math.PI / 2 }, tunnelMood(1));
    const path = tunnelPath(distance);
    return Math.hypot(point.x - path.x, point.y - path.y);
  };
  assert.ok(radius(TUNNEL_LENGTH) - radius(0) > 1);
});

test('narrow layouts retain every wall chapter with fewer curved surface triangles', () => {
  const cells = createShellLayout(), desktop = createTunnelShell(cells), compact = createTunnelShell(cells, 24);
  try {
    assert.deepEqual(desktop.cells, compact.cells);
    assert.equal(desktop.curveSegments, 48); assert.equal(compact.curveSegments, 24);
    assert.ok(compact.geometry.attributes.position.count < desktop.geometry.attributes.position.count * .7);
    compact.update(tunnelMood(.85));
    assert.ok([...compact.geometry.attributes.position.array].every(Number.isFinite));
    assert.ok([...compact.geometry.attributes.normal.array].every(Number.isFinite));
  } finally { desktop.geometry.dispose(); compact.geometry.dispose(); }
});

test('secondary wall sculptures stay separated from the new cassette surfaces', () => {
  const shell = createTunnelShell(), geometries = createTunnelGeometries();
  const indices = { panels: 4, portals: 6, facets: 5, ribbons: 7 };
  const modules = Object.entries(createWallLayout()).flatMap(([family, items]) => items.map(item => ({
    item, bound: geometries[indices[family]].boundingSphere.radius * Math.max(...item.scale),
  })));
  const triangle = new Triangle(), center = new Vector3(), closest = new Vector3();
  try {
    for (let step = 0; step <= 4; step++) {
      const mood = tunnelMood(step / 4);
      shell.update(mood);
      const positions = shell.geometry.attributes.position;
      for (const { item, bound } of modules) {
        const pose = wallPose(item, mood);
        center.set(pose.x, pose.y, pose.z);
        for (let i = 0; i < positions.count; i += 3) {
          if (Math.abs(positions.getZ(i) - pose.z) > bound + LATTICE.spacing) continue;
          triangle.a.fromBufferAttribute(positions, i);
          triangle.b.fromBufferAttribute(positions, i + 1);
          triangle.c.fromBufferAttribute(positions, i + 2);
          triangle.closestPointToPoint(center, closest);
          assert.ok(closest.distanceTo(center) > bound + .25);
        }
      }
    }
  } finally { shell.geometry.dispose(); geometries.forEach(geometry => geometry.dispose()); }
});

test('single focal sculpture retains room for its final enlargement and camera approach', () => {
  const geometries = createTunnelGeometries();
  try {
    const bound = geometries[1].boundingSphere.radius;
    assert.ok(4.5 - (bound * 2.4 + .9 + .12) > .5);
    for (let step = 0; step <= 100; step++) {
      const mood = tunnelMood(step / 100);
      const objectDepth = step / 100 * TUNNEL_LENGTH + 15 - mood.arrival * 4;
      assert.ok(objectDepth + flightPose(step / 100).z >= 16);
    }
  } finally { geometries.forEach(geometry => geometry.dispose()); }
});

test('tunnel preserves native scroll, motion safeguards and GPU/postprocessing cleanup', () => {
  const read = name => readFileSync(new URL(`../src/pages/AttentionLab/${name}`, import.meta.url), 'utf8');
  const component = read('AttentionSculpture.jsx'), renderer = read('sculptureRenderer.js'), page = read('AttentionLabPage.jsx');
  assert.match(component, /import\('\.\/sculptureRenderer'\)/);
  assert.match(component, /cancelled = true/);
  assert.match(component, /engine\?\.destroy\(\)/);
  assert.match(component, /passive: true/);
  assert.match(component, /Number.isFinite\(headerValue\)/);
  assert.match(component, /removeEventListener\('scroll'/);
  assert.match(renderer, /const staticMode = reduced/);
  assert.match(renderer, /Math.abs\(progress - targetProgress\) > .0001/);
  assert.doesNotMatch(renderer, /progress < .995|setPaused|mode.paused/);
  assert.match(renderer, /reduced \? 0 : progress/);
  assert.match(renderer, /reduced \? tunnelMood\(0\) : mood/);
  for (const safeguard of ['IntersectionObserver', 'document.hidden', 'cancelAnimationFrame', 'environment.dispose()', 'bloom.dispose()', 'composer.dispose()', 'mesh.dispose()']) assert.ok(renderer.includes(safeguard));
  assert.match(renderer, /detail.mesh.visible = !compact/);
  assert.match(renderer, /\.\.\.walls, \.\.\.lamps\].forEach/);
  const disposedMaterials = renderer.match(/\[metal, darkMetal,[^\n]*\.forEach\(material => material.dispose\(\)\)/)?.[0];
  for (const material of ['panelMaterial', 'portalMaterial', 'facetMaterial', 'ribbonMaterial']) {
    assert.ok(disposedMaterials?.includes(material));
  }
  assert.doesNotMatch(renderer, /addEventListener\('wheel'|setPointerCapture|pointerdown/);
  assert.doesNotMatch(page, /fieldset|type="range"|sculpture-steps|useReducer/);
  assert.match(page, /hidden=\{!\(arrived \|\| failed\)\}/);
  assert.match(page, /className="tunnel-skip"/);
  assert.doesNotMatch(page, /tunnel-pause|setPaused|Pause|Play/);
  assert.doesNotMatch(component, /setPaused|pauseRef|rendererRef/);
  assert.match(page, /to="\/\?labGoal=act#contact"/);
  assert.doesNotMatch(read('AttentionJourney.css'), /font-size\s*:/);
});
