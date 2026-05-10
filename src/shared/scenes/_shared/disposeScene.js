// Walk a Three.js scene and dispose every geometry, material, and texture
// it owns. Use in the cleanup of useEffect to avoid GPU memory leaks when
// the component unmounts and the scene is no longer reachable.

function disposeMaterial(material) {
    if (!material) return;
    for (const key in material) {
        const value = material[key];
        if (value && typeof value === 'object' && 'minFilter' in value && typeof value.dispose === 'function') {
            value.dispose();
        }
    }
    if (typeof material.dispose === 'function') material.dispose();
}

export function disposeScene(scene, renderer) {
    if (scene) {
        scene.traverse((obj) => {
            if (obj.geometry && typeof obj.geometry.dispose === 'function') {
                obj.geometry.dispose();
            }
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(disposeMaterial);
                } else {
                    disposeMaterial(obj.material);
                }
            }
            if (obj.isSprite && obj.material?.map) {
                obj.material.map.dispose();
            }
        });
        // Detach children so GC can collect.
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }
    if (renderer) {
        renderer.dispose();
        if (typeof renderer.forceContextLoss === 'function') {
            try { renderer.forceContextLoss(); } catch { /* ignore */ }
        }
        if (renderer.domElement?.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }
}
