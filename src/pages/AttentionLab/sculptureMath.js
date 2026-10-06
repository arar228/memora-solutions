export const TUNNEL_LENGTH = 180;

export function unit(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
export function scrollProgress(top, height, viewportHeight, headerHeight = 0) {
  if (![top, height, viewportHeight, headerHeight].every(Number.isFinite)) return 0;
  const distance = height - Math.max(1, viewportHeight - headerHeight);
  return distance > 0 ? unit((headerHeight - top) / distance) : 0;
}
export function tunnelPath(distance) {
  const d = Math.min(TUNNEL_LENGTH + 28, Math.max(-12, Number.isFinite(distance) ? distance : 0));
  return { x: Math.sin(d * .055) * 1.1, y: Math.sin(d * .037) * .8, z: -d };
}
export function flightPose(progress, pointerX = 0, pointerY = 0, compact = false) {
  const distance = unit(progress) * TUNNEL_LENGTH;
  const path = tunnelPath(distance);
  const aim = tunnelPath(distance + 10);
  const x = Number.isFinite(pointerX) ? Math.max(-1, Math.min(1, pointerX)) : 0;
  const y = Number.isFinite(pointerY) ? Math.max(-1, Math.min(1, pointerY)) : 0;
  const strength = compact ? .22 : .55;
  return { x: path.x + x * strength, y: path.y + y * strength, z: path.z + 5, aimX: aim.x + x * .6, aimY: aim.y + y * .6, aimZ: aim.z };
}
export function damp(current, target, seconds, speed = 7) {
  const dt = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, 1 / 30));
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}
export function pixelRatioFor(width, ratio) {
  const compact = width < 700;
  return Math.min(Math.max(Number.isFinite(ratio) ? ratio : 1, compact ? 1 : 1.25), compact ? 1.5 : 2);
}
// Keep both postprocessing buffers at canvas resolution within a bounded GPU budget.
export function renderQualityFor(width, height, ratio, maxSamples) {
  const w = Number.isFinite(width) && width > 0 ? width : 1;
  const h = Number.isFinite(height) && height > 0 ? height : 1;
  const compact = w < 700;
  const budget = compact ? 1_000_000 : 4_000_000;
  return {
    ratio: Math.min(pixelRatioFor(w, ratio), Math.sqrt(budget / (w * h))),
    samples: Math.min(compact ? 2 : 4, Math.max(0, Math.floor(Number.isFinite(maxSamples) ? maxSamples : 0))),
  };
}
