import * as THREE from 'three';
import { LATTICE, latticeNoise, latticePoint, wallWeights } from './latticeMath.js';
import { tunnelPath } from './sculptureMath.js';

const TAU = Math.PI * 2;
const outlines = {
  panels: [[.09, 0], [.91, 0], [1, .09], [1, .91], [.91, 1], [.09, 1], [0, .91], [0, .09]],
  portals: [[.25, 0], [.75, 0], [1, .3], [1, .7], [.75, 1], [.25, 1], [0, .7], [0, .3]],
  facets: [[.48, 0], [.58, .05], [1, .48], [.95, .58], [.52, 1], [.42, .95], [0, .52], [.05, .42]],
  ribbons: Array.from({ length: 48 }, (_, i) => {
    const angle = -Math.PI / 2 + i / 48 * TAU;
    return [.5 + Math.cos(angle) * .5, .5 + Math.sin(angle) * .5];
  }),
};

// Recessed architectural cassettes share the corridor's actual profile. Open
// bays reveal the secondary wall forms instead of covering them with a skin.
export function createShellLayout() {
  const cells = [];
  for (let section = 0; section < LATTICE.sections; section++) {
    const distance = -4 + section * LATTICE.spacing;
    const chapter = wallWeights(distance);
    for (let side = 0; side < LATTICE.sides; side++) {
      const seed = section * 67 + side * 17;
      const opening = (section + side) % 7 === 0 || (chapter.ribbons > .5 && side % 3 === 0);
      if (opening) continue;
      const choice = latticeNoise(seed + 2);
      let cumulative = 0, family = 'ribbons';
      for (const [name, weight] of Object.entries(chapter)) {
        cumulative += weight;
        if (choice < cumulative) { family = name; break; }
      }
      cells.push({
        distance, angle: side / LATTICE.sides * TAU, family,
        depth: .32 + latticeNoise(seed) * .24,
        shade: .72 + latticeNoise(seed + 1) * .28,
      });
    }
  }
  return cells;
}

export function shellAnchor(cell, u, v, inset = false) {
  const span = TAU / LATTICE.sides;
  return {
    u, v,
    distance: cell.distance + .17 + v * (LATTICE.spacing - .34),
    angle: cell.angle + .018 + u * (span - .036),
    offset: .28 + (inset ? cell.depth : 0),
  };
}

// Three contiguous groups: machined rim, bevel return, inset plate. Their
// different roughness values provide depth without high-frequency noise.
export function createTunnelShell(cells = createShellLayout(), curveSegments = 48) {
  const segments = curveSegments === 24 ? 24 : 48;
  const faces = [[], [], []];
  const anchors = [];
  const register = anchor => { anchors.push(anchor); return anchors.length - 1; };
  for (const cell of cells) {
    const outline = cell.family === 'ribbons'
      ? outlines.ribbons.filter((_, index) => index % (48 / segments) === 0)
      : outlines[cell.family];
    const outer = outline.map(([u, v]) => register(shellAnchor(cell, u, v)));
    const lip = outline.map(([u, v]) => register(shellAnchor(cell, .1 + u * .8, .055 + v * .89)));
    const inner = outline.map(([u, v]) => register(shellAnchor(cell, .13 + u * .74, .075 + v * .85, true)));
    const quad = (group, a, b, c, d) => {
      const surface = { shade: cell.shade, group, smooth: cell.family === 'ribbons' };
      faces[group].push({ ...surface, indices: [a, b, c] }, { ...surface, indices: [a, c, d] });
    };
    for (let i = 0; i < outline.length; i++) {
      const next = (i + 1) % outline.length;
      quad(0, outer[i], outer[next], lip[next], lip[i]);
      quad(1, lip[i], lip[next], inner[next], inner[i]);
    }
    if (cell.family !== 'ribbons') {
      const center = register(shellAnchor(cell, .5, .5, true));
      for (let i = 0; i < outline.length; i++) faces[2].push({ indices: [center, inner[i], inner[(i + 1) % outline.length]], shade: cell.shade });
    }
  }
  const triangles = faces.flat();
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(triangles.length * 9);
  const normals = new Float32Array(positions.length);
  const colors = new Float32Array(positions.length);
  const uvs = new Float32Array(triangles.length * 6);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
  triangles.forEach(({ shade }, index) => colors.fill(shade, index * 9, index * 9 + 9));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  triangles.forEach(({ indices }, index) => indices.forEach((vertex, corner) => {
    uvs[index * 6 + corner * 2] = anchors[vertex].u;
    uvs[index * 6 + corner * 2 + 1] = anchors[vertex].v;
  }));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  let start = 0;
  faces.forEach((group, material) => { geometry.addGroup(start, group.length * 3, material); start += group.length * 3; });
  // The radius interpolates linearly between its two authored profiles. Cache
  // those profiles once: each shared corner needs one rotation per update.
  const frames = anchors.map(anchor => {
    const path = tunnelPath(anchor.distance);
    const opening = latticePoint(anchor, { spiral: 0, twist: 0 });
    const spiral = latticePoint(anchor, { spiral: 1, twist: 0 });
    return { ...anchor, ...path, radius: Math.hypot(opening.x - path.x, opening.y - path.y),
      delta: Math.hypot(spiral.x - path.x, spiral.y - path.y) - Math.hypot(opening.x - path.x, opening.y - path.y) };
  });
  const world = new Float64Array(anchors.length * 3);
  const curvedNormals = new Float64Array(anchors.length * 9);
  const curvedFaces = triangles.map((triangle, index) => ({ ...triangle, index })).filter(face => face.smooth);
  const curvedCorners = [...new Set(curvedFaces.flatMap(face => face.indices.map(vertex => vertex * 9 + face.group * 3)))];
  function update(mood) {
    curvedNormals.fill(0);
    for (let index = 0; index < frames.length; index++) {
      const frame = frames[index];
      const angle = frame.angle + frame.distance * .055 * mood.twist;
      const radius = frame.radius + frame.delta * mood.spiral;
      world[index * 3] = frame.x + Math.cos(angle) * radius;
      world[index * 3 + 1] = frame.y + Math.sin(angle) * radius;
      world[index * 3 + 2] = -frame.distance;
    }
    for (let index = 0; index < triangles.length; index++) {
      const { indices, group, smooth } = triangles[index];
      const a = indices[0] * 3, b = indices[1] * 3, c = indices[2] * 3;
      const bx = world[b] - world[a], by = world[b + 1] - world[a + 1], bz = world[b + 2] - world[a + 2];
      const cx = world[c] - world[a], cy = world[c + 1] - world[a + 1], cz = world[c + 2] - world[a + 2];
      const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
      const length = Math.hypot(nx, ny, nz) || 1;
      for (let corner = 0; corner < 3; corner++) {
        const vertex = indices[corner];
        const offset = index * 9 + corner * 3;
        const source = vertex * 3;
        positions[offset] = world[source]; positions[offset + 1] = world[source + 1]; positions[offset + 2] = world[source + 2];
        normals[offset] = nx / length; normals[offset + 1] = ny / length; normals[offset + 2] = nz / length;
        if (smooth) {
          const sum = vertex * 9 + group * 3;
          curvedNormals[sum] += nx; curvedNormals[sum + 1] += ny; curvedNormals[sum + 2] += nz;
        }
      }
    }
    // Curved loops shade continuously around the circumference, while rim/
    // return boundaries and the machined corners of other families stay crisp.
    for (const sum of curvedCorners) {
      const length = Math.hypot(curvedNormals[sum], curvedNormals[sum + 1], curvedNormals[sum + 2]) || 1;
      curvedNormals[sum] /= length; curvedNormals[sum + 1] /= length; curvedNormals[sum + 2] /= length;
    }
    for (const { indices, group, index } of curvedFaces) {
      for (let corner = 0; corner < 3; corner++) {
        const sum = indices[corner] * 9 + group * 3, offset = index * 9 + corner * 3;
        normals[offset] = curvedNormals[sum];
        normals[offset + 1] = curvedNormals[sum + 1];
        normals[offset + 2] = curvedNormals[sum + 2];
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
  }
  return { geometry, cells, curveSegments: segments, update };
}
