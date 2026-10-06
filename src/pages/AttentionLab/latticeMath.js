import { TUNNEL_LENGTH, tunnelPath, unit } from './sculptureMath.js';

export const LATTICE = Object.freeze({ sections: 52, sides: 16, spacing: 4.25, radius: 5.4 });
const TAU = Math.PI * 2;
export function smoothRange(start, end, value) {
  const t = unit((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export function tunnelMood(progress) {
  const p = unit(progress);
  const spiral = smoothRange(.2, .72, p);
  const arrival = smoothRange(.88, 1, p);
  return {
    progress: p, spiral, arrival,
    glow: smoothRange(.18, .7, p) * (1 - arrival * .75),
    twist: spiral * (1 - arrival * .55),
    roll: Math.sin(p * Math.PI) * .09 + Math.sin(p * Math.PI * 3) * spiral * .15,
  };
}
// A lamp approaching the camera tapers gently instead of filling the edge with glare.
export function lampGain(distanceAhead) {
  return .18 + smoothRange(1, 13, Number.isFinite(distanceAhead) ? distanceAhead : 0) * .82;
}
// Deterministic detail placement: reloads and resting frames retain the composition.
export function latticeNoise(seed) {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}
// Spatial chapters overlap at their boundaries, so travelling reveals new forms.
export function wallWeights(distance) {
  const p = unit(distance / TUNNEL_LENGTH);
  const first = smoothRange(.18, .3, p), second = smoothRange(.43, .55, p), third = smoothRange(.68, .8, p);
  return { panels: 1 - first, portals: first * (1 - second), facets: second * (1 - third), ribbons: third };
}
export function latticePoint(anchor, mood) {
  const { distance, angle, offset = 0 } = anchor;
  const path = tunnelPath(distance);
  const squareRadius = LATTICE.radius / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
  const weights = wallWeights(distance);
  const sector = TAU / 6;
  const hexRadius = LATTICE.radius / Math.cos(((angle % sector + sector) % sector) - sector / 2);
  const triangleSector = TAU / 3;
  const triangleRadius = LATTICE.radius / Math.cos(((angle % triangleSector + triangleSector) % triangleSector) - triangleSector / 2);
  const roundRadius = LATTICE.radius + Math.sin(angle * 3 + distance * .07) * .22;
  const chapterRadius = squareRadius * weights.panels + hexRadius * weights.portals + triangleRadius * weights.facets + roundRadius * weights.ribbons;
  const blend = .8 + mood.spiral * .2;
  // Spacious chambers alternate with tighter passages; the final room opens
  // around the sculpture. These volumes are authored in space, not time.
  const p = unit(distance / TUNNEL_LENGTH);
  const chamber = Math.sin(Math.PI * smoothRange(.26, .46, p)) ** 2 * .65
    + Math.sin(Math.PI * smoothRange(.52, .72, p)) ** 2 * .9
    + smoothRange(.86, 1, p) * 1.3;
  const radius = squareRadius * (1 - blend) + chapterRadius * blend + chamber + offset;
  const theta = angle + distance * .055 * mood.twist;
  return { x: path.x + Math.cos(theta) * radius, y: path.y + Math.sin(theta) * radius, z: -distance };
}
export function createLatticeLayout() {
  const beams = [], details = [], lamps = [];
  for (let section = 0; section < LATTICE.sections; section++) {
    const distance = -4 + section * LATTICE.spacing;
    for (let side = 0; side < LATTICE.sides; side++) {
      const angle = side / LATTICE.sides * TAU;
      const seed = section * 31 + side;
      const a = { distance, angle }, b = { distance, angle: angle + TAU / LATTICE.sides };
      const c = { distance: distance + LATTICE.spacing, angle };
      beams.push({ a, b, width: .09 + latticeNoise(seed) * .075 });
      beams.push({ a, b: c, width: .065 + latticeNoise(seed + 1) * .065 });
      if ((section + side) % 2 === 0) beams.push({ a, b: { ...c, angle: b.angle }, width: .035 });
      for (let detail = 0; detail < 2; detail++) {
        const detailSeed = seed * 7 + detail;
        const d = distance + .2 + latticeNoise(detailSeed + 4) * 3.7;
        // The service layer sits behind the cassette returns, visible in bays.
        const start = { distance: d, angle, offset: 1.15 + latticeNoise(detailSeed + 9) * .55 };
        const end = detail % 2 === 0
          ? { ...start, angle: angle + .08 + latticeNoise(detailSeed + 7) * .32 }
          : { ...start, distance: d + .3 + latticeNoise(detailSeed + 7) * 2.5 };
        details.push({ a: start, b: end, width: .035 + latticeNoise(detailSeed + 5) * .14, thickness: .035 });
      }
      if ((section + side) % 2 === 0) {
        const start = { distance: distance + .5 + latticeNoise(seed + 10) * 3, angle, offset: -.055 };
        lamps.push({ a: start, b: { ...start, distance: start.distance + .1 + latticeNoise(seed + 11) * .48 }, width: .06 + latticeNoise(seed + 12) * .045, color: (section + side) % 5 });
      }
    }
  }
  return { beams, details, lamps };
}

export function createWallLayout() {
  const layout = { panels: [], portals: [], facets: [], ribbons: [] };
  for (let section = 0; section < LATTICE.sections; section++) {
    const distance = -4 + (section + .5) * LATTICE.spacing;
    const weights = wallWeights(distance);
    for (let side = 0; side < 8; side++) {
      const seed = section * 97 + side * 13;
      const choice = latticeNoise(seed + 1);
      let cumulative = 0, family = 'ribbons';
      for (const [name, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (choice < cumulative) { family = name; break; }
      }
      const n = latticeNoise(seed + 2), m = latticeNoise(seed + 3);
      const scale = {
        panels: [1.45 + n * .5, 1.8 + m * .3, .3 + n * .25],
        portals: [1.1 + n * .35, 1.1 + m * .35, 1],
        facets: [.85 + n * .35, 1.1 + m * .25, .6 + n * .3],
        ribbons: [1.4 + n * .2, 1.25 + m * .25, 1],
      }[family];
      layout[family].push({
        anchor: { distance, angle: (side + .5 + (section % 2) * .15) / 8 * TAU, offset: family === 'panels' ? 3.8 : 3.5 },
        scale, tilt: (n - .5) * .25, roll: (m - .5) * .6 + (family === 'ribbons' ? section * .35 : 0),
      });
    }
  }
  return layout;
}
export function wallPose(module, mood) {
  return { ...latticePoint(module.anchor, mood), angle: module.anchor.angle + module.anchor.distance * .055 * mood.twist };
}
