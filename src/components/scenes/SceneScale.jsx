import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function SceneScale() {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SETUP ---
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        // Isometric Camera (45° horiz, 30° vert approx)
        const aspect = width / height;
        const d = 15;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

        // Math.atan(1/Math.sqrt(2)) is approx 35.264 degrees for true isometric, but spec says 30/45
        camera.position.set(20, 20, 20);
        camera.lookAt(scene.position);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.domElement.style.touchAction = 'pan-y';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        // --- LIGHTS ---
        const ambientLight = new THREE.AmbientLight(0x6b4fa0, 0.4);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);

        // --- OBJECTS ---
        // Table Plane
        const planeGeo = new THREE.PlaneGeometry(40, 40);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0x0d0d1a,
            roughness: 0.8,
            metalness: 0.2
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.5;
        scene.add(plane);

        // Cubes (Projects)
        const projects = [
            { id: 1, size: 8, x: 0, z: 0, delay: 0, title: 'Учебные лаборатории', value: '700+ млн ₽' },
            { id: 2, size: 4, x: -7, z: -5, delay: 0.2, title: 'Рабочие станции и серверы', value: '80+ млн ₽' },
            { id: 3, size: 3, x: 6, z: -6, delay: 0.4, title: 'VR-оборудование', value: '45+ млн ₽' },
            { id: 4, size: 2.5, x: -5, z: 6, delay: 0.6, title: 'Интерактивные комплексы', value: '20+ млн ₽' },
            { id: 5, size: 2, x: 7, z: 5, delay: 0.8, title: 'Системы ВКС', value: '15+ млн ₽' }
        ];

        const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x6b4fa0,
            emissive: 0x3b2060,
            emissiveIntensity: 0.3
        });

        const hoverMat = new THREE.MeshStandardMaterial({
            color: 0x2da39a,
            emissive: 0x1a6060,
            emissiveIntensity: 0.3
        });

        const meshes = [];

        projects.forEach(p => {
            const mesh = new THREE.Mesh(cubeGeo, baseMat.clone());
            mesh.scale.set(p.size, 0.01, p.size); // Start flat for animation
            mesh.position.set(p.x, 0, p.z);

            // Custom data properties
            mesh.userData = {
                targetScaleY: p.size,
                targetY: p.size / 2 - 0.5,
                delay: p.delay,
                animatingIn: false,
                isHovered: false,
                phaseOffset: Math.random() * Math.PI * 2,
                title: p.title,
                value: p.value,
                baseY: p.size / 2 - 0.5 // Keep track of base Y after animation
            };

            scene.add(mesh);
            meshes.push(mesh);
        });

        // --- INTERACTION ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredMesh = null;

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

            // Optional: update tooltip position if visible
            if (hoveredMesh) {
                setTooltip(t => ({ ...t, x: event.clientX, y: event.clientY }));
            }
        };
        renderer.domElement.addEventListener('mousemove', onMouseMove);

        // --- ANIMATION LOOP ---
        let clock = new THREE.Clock();
        let animationId;
        let isVisible = false;
        let hasTriggeredIn = false;

        // Custom elastic out easing function
        const elasticOut = (t) => {
            return Math.sin(-13.0 * (t + 1.0) * Math.PI / 2) * Math.pow(2.0, -10.0 * t) + 1.0;
        };

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            const time = clock.getElapsedTime();
            const delta = clock.getDelta();

            // Raycaster
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(meshes);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                if (hoveredMesh !== object) {
                    // Mouse enter
                    if (hoveredMesh) {
                        hoveredMesh.material.copy(baseMat);
                        hoveredMesh.userData.isHovered = false;
                    }
                    hoveredMesh = object;
                    hoveredMesh.material.copy(hoverMat);
                    hoveredMesh.userData.isHovered = true;
                    // Show Tooltip - approximate screen pos from rect (mousemove catches actual)
                }
            } else {
                if (hoveredMesh) {
                    // Mouse leave
                    hoveredMesh.material.copy(baseMat);
                    hoveredMesh.userData.isHovered = false;
                    hoveredMesh = null;
                    setTooltip(t => ({ ...t, visible: false }));
                }
            }

            // Animate meshes
            meshes.forEach(mesh => {
                const u = mesh.userData;

                // 1. In-Animation (Growth)
                if (u.animatingIn) {
                    const t = Math.min((time - u.startTime) / 1.5, 1.0); // 1.5s duration
                    if (t > 0) {
                        const easeT = elasticOut(t);
                        mesh.scale.y = Math.max(0.01, u.targetScaleY * easeT);
                        mesh.position.y = (mesh.scale.y / 2) - 0.5;
                        u.baseY = mesh.position.y;
                    }
                    if (t === 1.0) u.animatingIn = false;
                }

                // 2. Idle / Hover Animation
                if (!u.animatingIn && hasTriggeredIn) {
                    if (u.isHovered) {
                        // Hover: lift 15px up (approx 1 unit in orthographic projection)
                        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, u.baseY + 1.5, 0.1);
                        if (!tooltip.visible) {
                            // First frame of hover, mouse position will be close enough
                            setTooltip({
                                visible: true,
                                text: `${u.title} / ${u.value}`,
                                x: tooltip.x || 0,
                                y: tooltip.y || 0
                            });
                        }
                    } else {
                        // Idle bobbing
                        const targetY = u.baseY + Math.sin(time * 1.5 + u.phaseOffset) * 0.2;
                        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.1);
                    }
                }
            });

            renderer.render(scene, camera);
        };

        // --- OBSERVER ---
        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible && !hasTriggeredIn) {
                // Start entrance animations
                clock.start();
                meshes.forEach(m => {
                    m.userData.animatingIn = true;
                    m.userData.startTime = clock.getElapsedTime() + m.userData.delay;
                });
                hasTriggeredIn = true;
            }
        }, { threshold: 0.3 });

        observer.observe(mountRef.current);
        tick();

        // --- CLEANUP ---
        const handleResize = () => {
            const w = mountRef.current?.clientWidth || window.innerWidth;
            const h = mountRef.current?.clientHeight || window.innerHeight;
            const aspect = w / h;
            camera.left = -d * aspect;
            camera.right = d * aspect;
            camera.top = d;
            camera.bottom = -d;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            observer.disconnect();
            renderer.domElement.removeEventListener('mousemove', onMouseMove);

            // Dispose Three.js resources
            planeGeo.dispose();
            planeMat.dispose();
            cubeGeo.dispose();
            baseMat.dispose();
            hoverMat.dispose();
            renderer.dispose();

            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            {tooltip.visible && (
                <div
                    style={{
                        position: 'fixed',
                        left: tooltip.x,
                        top: tooltip.y - 40,
                        transform: 'translate(-50%, -100%)',
                        background: 'rgba(13, 13, 26, 0.9)',
                        color: 'white',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        border: '1px solid rgba(45, 163, 154, 0.3)',
                        backdropFilter: 'blur(4px)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </>
    );
}
