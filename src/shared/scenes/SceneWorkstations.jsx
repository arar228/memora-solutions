import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function SceneWorkstations() {
    const mountRef = useRef(null);
    const [count, setCount] = useState(0);

    // Using a ref to expose a restart method to the React UI button
    const restartAnimationRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SETUP ---
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        const camera = new THREE.PerspectiveCamera(30, width / height, 1, 1000);
        camera.position.set(0, 150, 200);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.domElement.style.touchAction = 'pan-y';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.maxPolarAngle = Math.PI / 2.5;

        // --- LIGHTS ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 100, 50);
        scene.add(dirLight);

        // --- ENVIRONMENT ---
        // Grid helper
        const grid = new THREE.GridHelper(200, 50, 0x2A2A4A, 0x2A2A4A);
        scene.add(grid);

        // Dark floor plane
        const planeGeo = new THREE.PlaneGeometry(200, 200);
        const planeMat = new THREE.MeshBasicMaterial({ color: 0x050510, transparent: true, opacity: 0.8 });
        const floor = new THREE.Mesh(planeGeo, planeMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        scene.add(floor);

        // --- INSTANCED MESH FOR 1200 PCs ---
        const TOTAL_PCS = 1200;
        const geo = new THREE.BoxGeometry(1, 1.2, 0.4);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xD0D0D0,
            emissive: 0xffffff,
            emissiveIntensity: 0
        });

        const instancedMesh = new THREE.InstancedMesh(geo, mat, TOTAL_PCS);
        scene.add(instancedMesh);

        // Calculate positions in a grid
        const cols = 40;
        const rows = 30;
        const spacingX = 2;
        const spacingZ = 1.5;

        const pcData = []; // Store state for each instance
        const dummy = new THREE.Object3D();
        const colorObject = new THREE.Color();
        const baseColor = new THREE.Color(0xD0D0D0);
        const emissiveColor = new THREE.Color(0xffffff);

        for (let i = 0; i < TOTAL_PCS; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;

            const x = (col - cols / 2) * spacingX;
            const z = (row - rows / 2) * spacingZ;

            pcData.push({
                x, z,
                delay: (col * 0.05) + (row * 0.05) + Math.random() * 0.1, // Wave left-to-right & front-to-back
                visible: false,
                flashT: 0
            });

            // Initially set scale to 0 (hidden)
            dummy.position.set(x, 0.6, z);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
            instancedMesh.setColorAt(i, baseColor);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;

        // --- ANIMATION CONTROLS ---
        let animationId;
        const clock = new THREE.Clock();
        let isVisible = false;
        let animationStartTime = 0;
        let isAnimatingIn = false;

        const startAnimation = () => {
            animationStartTime = clock.getElapsedTime();
            isAnimatingIn = true;

            // Reset all
            pcData.forEach((pc, i) => {
                pc.visible = false;
                pc.flashT = 0;
                dummy.scale.set(0, 0, 0);
                dummy.position.set(pc.x, 0.6, pc.z);
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(i, dummy.matrix);
                instancedMesh.setColorAt(i, baseColor);
            });
            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.instanceColor.needsUpdate = true;
            setCount(0);
        };

        restartAnimationRef.current = startAnimation;

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            const delta = clock.getDelta();
            const time = clock.getElapsedTime();
            controls.update();

            if (isAnimatingIn) {
                let currentVisibleCount = 0;
                const animTime = time - animationStartTime;
                let matricesUpdated = false;
                let colorsUpdated = false;

                for (let i = 0; i < TOTAL_PCS; i++) {
                    const pc = pcData[i];

                    if (!pc.visible && animTime > pc.delay) {
                        // Pop in
                        pc.visible = true;
                        pc.flashT = 1.0; // trigger flash effect

                        dummy.position.set(pc.x, 0.6, pc.z);
                        dummy.scale.set(1, 1, 1);
                        dummy.updateMatrix();
                        instancedMesh.setMatrixAt(i, dummy.matrix);
                        matricesUpdated = true;
                    }

                    if (pc.visible) {
                        currentVisibleCount++;

                        // Handle flash effect decay
                        if (pc.flashT > 0) {
                            pc.flashT -= delta * 3; // decay over ~0.33s
                            if (pc.flashT < 0) pc.flashT = 0;

                            // Blend color to simulate emissive flash
                            colorObject.copy(baseColor).lerp(emissiveColor, pc.flashT * 0.5);
                            instancedMesh.setColorAt(i, colorObject);
                            colorsUpdated = true;
                        }
                    }
                }

                if (matricesUpdated) instancedMesh.instanceMatrix.needsUpdate = true;
                if (colorsUpdated) instancedMesh.instanceColor.needsUpdate = true;

                setCount(currentVisibleCount);
                if (currentVisibleCount === TOTAL_PCS) {
                    isAnimatingIn = false;
                }
            }

            renderer.render(scene, camera);
        };

        // --- OBSERVER ---
        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible && !isAnimatingIn && count === 0) {
                startAnimation();
            }
        }, { threshold: 0.3 });

        observer.observe(mountRef.current);
        tick();

        // --- CLEANUP ---
        const handleResize = () => {
            const w = mountRef.current?.clientWidth || window.innerWidth;
            const h = mountRef.current?.clientHeight || window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            observer.disconnect();
            controls.dispose();
            geo.dispose(); mat.dispose();
            planeGeo.dispose(); planeMat.dispose();
            grid.dispose();
            renderer.dispose();

            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />

            {/* UI Overlay */}
            <div style={{
                position: 'absolute',
                top: 20,
                right: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 16
            }}>
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: '18px',
                    color: '#6B4FA0',
                    background: 'rgba(13, 13, 26, 0.8)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(107, 79, 160, 0.3)',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    {count} / 1200
                </div>
                {count === 1200 && (
                    <button
                        onClick={() => restartAnimationRef.current?.()}
                        style={{
                            background: 'transparent',
                            color: '#2DA39A',
                            border: '1px solid rgba(45, 163, 154, 0.5)',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = 'rgba(45, 163, 154, 0.1)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'transparent';
                        }}
                    >
                        Сбросить
                    </button>
                )}
            </div>
        </div>
    );
}
