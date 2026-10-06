import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createTunnelGeometries() {
  const panelOutline = new THREE.Shape();
  panelOutline.moveTo(-.5, -.5);
  for (const [x, y] of [[.35, -.5], [.5, -.35], [.5, .25], [.2, .5], [-.5, .5]]) panelOutline.lineTo(x, y);
  panelOutline.closePath();
  const panel = new THREE.ExtrudeGeometry(panelOutline, { depth: 1, steps: 1, bevelEnabled: true, bevelSegments: 1, bevelSize: .035, bevelThickness: .025 });
  panel.translate(0, 0, -.5);
  // An architectural unit, a continuous original sculpture and sparse dust.
  const geometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.TorusKnotGeometry(.64, .13, 160, 20, 2, 3),
    new THREE.IcosahedronGeometry(.16, 2),
    // Main structural edges catch a restrained highlight; fine strips stay lightweight.
    new RoundedBoxGeometry(1, 1, 1, 1, .025),
    panel,
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TorusGeometry(.82, .065, 8, 6),
    new THREE.TorusGeometry(1, .07, 8, 32, Math.PI * 1.35),
  ];
  geometries.forEach(geometry => geometry.computeBoundingSphere());
  return geometries;
}
