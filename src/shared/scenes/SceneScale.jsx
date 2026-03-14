import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function SceneScale() {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
    const [detail, setDetail] = useState(null); // { title, value, desc }

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SETUP ---
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        const aspect = width / height;
        const d = 15;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        camera.position.set(20, 20, 20);
        camera.lookAt(scene.position);

        // Store original camera position for zoom-back
        const originalCamPos = camera.position.clone();
        const originalLookAt = new THREE.Vector3(0, 0, 0);

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

        // Cubes (Projects) — biggest at back (negative x/z), smallest in front
        const projects = [
            { id: 1, size: 7, x: -4, z: -6, delay: 0, title: 'Учебные лаборатории', value: '500+ млн\u00A0₽',
              desc: 'Проектирование и оснащение лабораторных комплексов для университетов и колледжей' },
            { id: 2, size: 5, x: 5, z: -4, delay: 0.15, title: 'IT-инфраструктура', value: '200+ млн\u00A0₽',
              desc: 'Серверные, СКС, Wi-Fi, системы хранения данных' },
            { id: 3, size: 3.5, x: -6, z: 4, delay: 0.3, title: 'Мощные компьютеры', value: '80+ млн\u00A0₽',
              desc: 'Графические станции, 3D-моделирование, рендер-фермы' },
            { id: 4, size: 3, x: 7, z: 3, delay: 0.45, title: 'VR-оборудование', value: '45+ млн\u00A0₽',
              desc: 'Шлемы, контроллеры, трекинг, VR-классы' },
            { id: 5, size: 2.5, x: 0, z: 6, delay: 0.6, title: 'Интерактивные комплексы', value: '20+ млн\u00A0₽',
              desc: 'Панели, доски, проекционные системы' },
            { id: 6, size: 2, x: -2, z: 8, delay: 0.75, title: 'Системы ВКС', value: '15+ млн\u00A0₽',
              desc: 'Видеоконференцсвязь, конференц-залы, гибридные аудитории' }
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

        const clickMat = new THREE.MeshStandardMaterial({
            color: 0x2da39a,
            emissive: 0x2da39a,
            emissiveIntensity: 0.6
        });

        const meshes = [];

        projects.forEach(p => {
            const mesh = new THREE.Mesh(cubeGeo, baseMat.clone());
            mesh.scale.set(p.size, 0.01, p.size);
            mesh.position.set(p.x, 0, p.z);

            mesh.userData = {
                targetScaleY: p.size,
                targetY: p.size / 2 - 0.5,
                delay: p.delay,
                animatingIn: false,
                isHovered: false,
                phaseOffset: Math.random() * Math.PI * 2,
                title: p.title,
                value: p.value,
                desc: p.desc,
                baseY: p.size / 2 - 0.5,
                origX: p.x,
                origZ: p.z,
                origSize: p.size
            };

            scene.add(mesh);
            meshes.push(mesh);
        });

        // --- INTERACTION STATE ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredMesh = null;
        const mouseScreen = { x: 0, y: 0 };

        // Zoom/click state
        let focusedMesh = null;
        let isZooming = false;
        let zoomProgress = 0;
        let zoomDir = 0; // 1 = zoom in, -1 = zoom out
        let zoomTarget = { pos: new THREE.Vector3(), lookAt: new THREE.Vector3() };
        const ZOOM_SPEED = 2.5;

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            mouseScreen.x = event.clientX - rect.left;
            mouseScreen.y = event.clientY - rect.top;
        };

        const onClick = () => {
            if (isZooming) return;

            if (focusedMesh) {
                // Zoom out
                zoomDir = -1;
                zoomProgress = 1;
                isZooming = true;
                setDetail(null);
                // Reset focused mesh material
                focusedMesh.material.copy(baseMat);
                focusedMesh = null;
                return;
            }

            // Check if hovering a cube
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(meshes);
            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                focusedMesh = mesh;
                mesh.material.copy(clickMat);

                // Calculate camera target: closer to the cube
                const cubeWorldPos = new THREE.Vector3();
                mesh.getWorldPosition(cubeWorldPos);
                cubeWorldPos.y = mesh.userData.baseY;

                zoomTarget.lookAt.copy(cubeWorldPos);
                zoomTarget.pos.set(
                    cubeWorldPos.x + 10,
                    cubeWorldPos.y + 12,
                    cubeWorldPos.z + 10
                );

                zoomDir = 1;
                zoomProgress = 0;
                isZooming = true;
                setTooltip(t => ({ ...t, visible: false }));

                // Show detail panel after slight delay
                setTimeout(() => {
                    setDetail({
                        title: mesh.userData.title,
                        value: mesh.userData.value,
                        desc: mesh.userData.desc
                    });
                }, 300);
            }
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onClick);

        // --- ANIMATION LOOP ---
        let clock = new THREE.Clock();
        let animationId;
        let isVisible = false;
        let hasTriggeredIn = false;

        const elasticOut = (t) => {
            return Math.sin(-13.0 * (t + 1.0) * Math.PI / 2) * Math.pow(2.0, -10.0 * t) + 1.0;
        };

        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            const time = clock.getElapsedTime();
            const delta = clock.getDelta();

            // --- ZOOM ANIMATION ---
            if (isZooming) {
                zoomProgress += delta * ZOOM_SPEED * zoomDir;
                zoomProgress = Math.max(0, Math.min(1, zoomProgress));
                const t = easeInOutCubic(zoomProgress);

                camera.position.lerpVectors(originalCamPos, zoomTarget.pos, t);
                const lookAtTarget = new THREE.Vector3().lerpVectors(originalLookAt, zoomTarget.lookAt, t);
                camera.lookAt(lookAtTarget);

                // Adjust camera frustum for zoom feel
                const zoomD = THREE.MathUtils.lerp(d, d * 0.5, t);
                const currentAspect = (mountRef.current?.clientWidth || width) / (mountRef.current?.clientHeight || height);
                camera.left = -zoomD * currentAspect;
                camera.right = zoomD * currentAspect;
                camera.top = zoomD;
                camera.bottom = -zoomD;
                camera.updateProjectionMatrix();

                if ((zoomDir === 1 && zoomProgress >= 1) || (zoomDir === -1 && zoomProgress <= 0)) {
                    isZooming = false;
                    if (zoomDir === -1) {
                        // Reset camera
                        camera.position.copy(originalCamPos);
                        camera.lookAt(originalLookAt);
                        camera.left = -d * currentAspect;
                        camera.right = d * currentAspect;
                        camera.top = d;
                        camera.bottom = -d;
                        camera.updateProjectionMatrix();
                    }
                }
            }

            // --- RAYCASTER (only when not focused) ---
            if (!focusedMesh && !isZooming) {
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(meshes);

                if (intersects.length > 0) {
                    const object = intersects[0].object;
                    if (hoveredMesh !== object) {
                        if (hoveredMesh) {
                            hoveredMesh.material.copy(baseMat);
                            hoveredMesh.userData.isHovered = false;
                        }
                        hoveredMesh = object;
                        hoveredMesh.material.copy(hoverMat);
                        hoveredMesh.userData.isHovered = true;
                        renderer.domElement.style.cursor = 'pointer';
                    }
                    setTooltip({
                        visible: true,
                        text: `${hoveredMesh.userData.title} / ${hoveredMesh.userData.value}`,
                        x: mouseScreen.x,
                        y: mouseScreen.y
                    });
                } else {
                    if (hoveredMesh) {
                        hoveredMesh.material.copy(baseMat);
                        hoveredMesh.userData.isHovered = false;
                        hoveredMesh = null;
                        renderer.domElement.style.cursor = 'default';
                        setTooltip(t => ({ ...t, visible: false }));
                    }
                }
            }

            // --- ANIMATE MESHES ---
            meshes.forEach(mesh => {
                const u = mesh.userData;

                // In-Animation (Growth)
                if (u.animatingIn) {
                    const t = Math.min((time - u.startTime) / 1.5, 1.0);
                    if (t > 0) {
                        const easeT = elasticOut(t);
                        mesh.scale.y = Math.max(0.01, u.targetScaleY * easeT);
                        mesh.position.y = (mesh.scale.y / 2) - 0.5;
                        u.baseY = mesh.position.y;
                    }
                    if (t === 1.0) u.animatingIn = false;
                }

                // Idle / Hover / Focus Animation
                if (!u.animatingIn && hasTriggeredIn) {
                    if (focusedMesh === mesh) {
                        // Glow pulse on focused cube
                        const pulse = 0.3 + Math.sin(time * 3) * 0.15;
                        mesh.material.emissiveIntensity = pulse + 0.3;
                        mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, u.baseY + 1.0, 0.05);
                    } else if (focusedMesh) {
                        // Dim other cubes when one is focused
                        mesh.material.opacity = 0.3;
                        mesh.material.transparent = true;
                    } else {
                        // Reset opacity
                        mesh.material.opacity = 1.0;
                        mesh.material.transparent = false;

                        if (u.isHovered) {
                            mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, u.baseY + 1.5, 0.1);
                        } else {
                            const targetY = u.baseY + Math.sin(time * 1.5 + u.phaseOffset) * 0.2;
                            mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, 0.1);
                        }
                    }
                }
            });

            renderer.render(scene, camera);
        };

        // --- OBSERVER ---
        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible && !hasTriggeredIn) {
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
            renderer.domElement.removeEventListener('click', onClick);

            planeGeo.dispose();
            planeMat.dispose();
            cubeGeo.dispose();
            baseMat.dispose();
            hoverMat.dispose();
            clickMat.dispose();
            renderer.dispose();

            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

            {/* Hover tooltip */}
            {tooltip.visible && !detail && (
                <div
                    style={{
                        position: 'absolute',
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

            {/* Detail panel on click */}
            {detail && (
                <div
                    style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        maxWidth: 260,
                        background: 'rgba(13, 13, 26, 0.92)',
                        border: '1px solid rgba(45, 163, 154, 0.4)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'white',
                        zIndex: 1000,
                        backdropFilter: 'blur(8px)',
                        animation: 'fadeSlideIn 0.35s ease-out'
                    }}
                >
                    <div style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#2da39a',
                        marginBottom: 6,
                        fontFamily: 'var(--font-display)'
                    }}>
                        {detail.value}
                    </div>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        marginBottom: 8
                    }}>
                        {detail.title}
                    </div>
                    <div style={{
                        fontSize: '12px',
                        lineHeight: 1.6,
                        color: 'rgba(255,255,255,0.7)'
                    }}>
                        {detail.desc}
                    </div>
                    <div style={{
                        marginTop: 12,
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.35)',
                        textAlign: 'center'
                    }}>
                        Кликните чтобы вернуться
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
