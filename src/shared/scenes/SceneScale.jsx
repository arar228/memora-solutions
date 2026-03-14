import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const PROJECTS = [
    { id: 1, size: 7, x: -4, z: -6, delay: 0, title: 'Учебные лаборатории', value: '500+ млн\u00A0₽',
      desc: 'Проектирование и оснащение лабораторных комплексов для университетов и колледжей',
      color: 0x6B4FA0, emissive: 0x3b2060, edgeColor: 0x9b7fd0 },
    { id: 2, size: 5, x: 5, z: -4, delay: 0.15, title: 'IT-инфраструктура', value: '200+ млн\u00A0₽',
      desc: 'Серверные, СКС, Wi-Fi, системы хранения данных',
      color: 0x2196F3, emissive: 0x0d47a1, edgeColor: 0x64b5f6 },
    { id: 3, size: 3.5, x: -6, z: 4, delay: 0.3, title: 'Мощные компьютеры', value: '80+ млн\u00A0₽',
      desc: 'Графические станции, 3D-моделирование, рендер-фермы',
      color: 0x2da39a, emissive: 0x1a6060, edgeColor: 0x4dd0c8 },
    { id: 4, size: 3, x: 7, z: 3, delay: 0.45, title: 'VR-оборудование', value: '45+ млн\u00A0₽',
      desc: 'Шлемы, контроллеры, трекинг, VR-классы',
      color: 0xF44336, emissive: 0x8b1a11, edgeColor: 0xff7961 },
    { id: 5, size: 2.5, x: 0, z: 6, delay: 0.6, title: 'Интерактивные комплексы', value: '20+ млн\u00A0₽',
      desc: 'Панели, доски, проекционные системы',
      color: 0xFFC107, emissive: 0x8a6800, edgeColor: 0xfff350 },
    { id: 6, size: 2, x: -2, z: 8, delay: 0.75, title: 'Системы ВКС', value: '15+ млн\u00A0₽',
      desc: 'Видеоконференцсвязь, конференц-залы, гибридные аудитории',
      color: 0xFF5722, emissive: 0x8b2f00, edgeColor: 0xff8a65 }
];

export default function SceneScale() {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
    const [detail, setDetail] = useState(null);

    useEffect(() => {
        if (!mountRef.current) return;
        const W = mountRef.current.clientWidth;
        const H = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');
        scene.fog = new THREE.FogExp2('#0D0D1A', 0.015);

        const aspect = W / H;
        const d = 15;
        const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        camera.position.set(20, 20, 20);
        camera.lookAt(scene.position);
        const originalCamPos = camera.position.clone();
        const originalLookAt = new THREE.Vector3(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(W, H);
        renderer.domElement.style.touchAction = 'pan-y';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);

        // === LIGHTS ===
        scene.add(new THREE.AmbientLight(0x4444aa, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(15, 25, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 60;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        scene.add(dirLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0x2da39a, 0.4);
        rimLight.position.set(-10, 5, -10);
        scene.add(rimLight);

        // Point light for dramatic under-glow
        const pointLight = new THREE.PointLight(0x6B4FA0, 0.6, 30);
        pointLight.position.set(0, -2, 0);
        scene.add(pointLight);

        // === FLOOR ===
        // Grid
        const gridHelper = new THREE.GridHelper(40, 40, 0x1a1a3a, 0x0f0f20);
        gridHelper.position.y = -0.5;
        scene.add(gridHelper);

        // Reflective plane
        const planeGeo = new THREE.PlaneGeometry(40, 40);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a18,
            roughness: 0.4,
            metalness: 0.6,
            transparent: true,
            opacity: 0.7
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.5;
        plane.receiveShadow = true;
        scene.add(plane);

        // === PARTICLES ===
        const particleCount = 80;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 40;
            pPos[i * 3 + 1] = Math.random() * 20;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ color: 0x6B4FA0, size: 0.12, transparent: true, opacity: 0.5 });
        const particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // === CUBES ===
        const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        const edgeGeo = new THREE.EdgesGeometry(cubeGeo);
        const meshes = [];

        PROJECTS.forEach(p => {
            const group = new THREE.Group();

            // Solid cube with glass-like material
            const mat = new THREE.MeshStandardMaterial({
                color: p.color,
                emissive: p.emissive,
                emissiveIntensity: 0.3,
                roughness: 0.2,
                metalness: 0.5,
                transparent: true,
                opacity: 0.85
            });
            const mesh = new THREE.Mesh(cubeGeo, mat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);

            // Glowing wireframe edges
            const edgeMat = new THREE.LineBasicMaterial({ color: p.edgeColor, transparent: true, opacity: 0.8 });
            const edges = new THREE.LineSegments(edgeGeo, edgeMat);
            group.add(edges);

            group.scale.set(p.size, 0.01, p.size);
            group.position.set(p.x, 0, p.z);

            group.userData = {
                targetScaleY: p.size,
                delay: p.delay,
                animatingIn: false,
                isHovered: false,
                phaseOffset: Math.random() * Math.PI * 2,
                title: p.title,
                value: p.value,
                desc: p.desc,
                baseY: p.size / 2 - 0.5,
                origColor: p.color,
                origEmissive: p.emissive,
                edgeColor: p.edgeColor,
                solidMesh: mesh,
                solidMat: mat,
                edgeMat: edgeMat,
                origSize: p.size
            };

            scene.add(group);
            meshes.push(group);
        });

        // === INTERACTION ===
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredMesh = null;
        const mouseScreen = { x: 0, y: 0 };
        let focusedMesh = null;
        let isZooming = false;
        let zoomProgress = 0;
        let zoomDir = 0;
        let zoomTarget = { pos: new THREE.Vector3(), lookAt: new THREE.Vector3() };
        const ZOOM_SPEED = 2.5;

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            mouseScreen.x = event.clientX - rect.left;
            mouseScreen.y = event.clientY - rect.top;
        };

        // Collect solid meshes for raycasting
        const solidMeshes = meshes.map(g => g.userData.solidMesh);

        const onClick = () => {
            if (isZooming) return;
            if (focusedMesh) {
                zoomDir = -1; zoomProgress = 1; isZooming = true;
                setDetail(null);
                const u = focusedMesh.userData;
                u.solidMat.color.setHex(u.origColor);
                u.solidMat.emissive.setHex(u.origEmissive);
                u.solidMat.emissiveIntensity = 0.3;
                focusedMesh = null;
                return;
            }
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(solidMeshes);
            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                // Find parent group
                const group = meshes.find(g => g.userData.solidMesh === hitMesh);
                if (!group) return;
                focusedMesh = group;
                group.userData.solidMat.color.setHex(0x2da39a);
                group.userData.solidMat.emissive.setHex(0x2da39a);
                group.userData.solidMat.emissiveIntensity = 0.6;

                const pos = new THREE.Vector3();
                group.getWorldPosition(pos);
                pos.y = group.userData.baseY;
                zoomTarget.lookAt.copy(pos);
                zoomTarget.pos.set(pos.x + 10, pos.y + 12, pos.z + 10);
                zoomDir = 1; zoomProgress = 0; isZooming = true;
                setTooltip(t => ({ ...t, visible: false }));
                setTimeout(() => {
                    setDetail({ title: group.userData.title, value: group.userData.value, desc: group.userData.desc });
                }, 300);
            }
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onClick);

        // === ANIMATION ===
        let clock = new THREE.Clock();
        let animationId, isVisible = false, hasTriggeredIn = false;

        const elasticOut = (t) => Math.sin(-13.0 * (t + 1.0) * Math.PI / 2) * Math.pow(2.0, -10.0 * t) + 1.0;
        const easeInOutCubic = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;
            const time = clock.getElapsedTime();
            const delta = clock.getDelta();

            // Particles drift
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3 + 1] += Math.sin(time + i) * 0.005;
                positions[i * 3] += Math.cos(time * 0.5 + i * 0.3) * 0.003;
            }
            particles.geometry.attributes.position.needsUpdate = true;
            pMat.opacity = 0.3 + Math.sin(time * 0.8) * 0.15;

            // Zoom
            if (isZooming) {
                zoomProgress += delta * ZOOM_SPEED * zoomDir;
                zoomProgress = Math.max(0, Math.min(1, zoomProgress));
                const t = easeInOutCubic(zoomProgress);
                camera.position.lerpVectors(originalCamPos, zoomTarget.pos, t);
                const la = new THREE.Vector3().lerpVectors(originalLookAt, zoomTarget.lookAt, t);
                camera.lookAt(la);
                const zoomD = THREE.MathUtils.lerp(d, d * 0.5, t);
                const a = (mountRef.current?.clientWidth || W) / (mountRef.current?.clientHeight || H);
                camera.left = -zoomD * a; camera.right = zoomD * a;
                camera.top = zoomD; camera.bottom = -zoomD;
                camera.updateProjectionMatrix();
                if ((zoomDir === 1 && zoomProgress >= 1) || (zoomDir === -1 && zoomProgress <= 0)) {
                    isZooming = false;
                    if (zoomDir === -1) {
                        camera.position.copy(originalCamPos);
                        camera.lookAt(originalLookAt);
                        camera.left = -d * a; camera.right = d * a;
                        camera.top = d; camera.bottom = -d;
                        camera.updateProjectionMatrix();
                    }
                }
            }

            // Raycaster
            if (!focusedMesh && !isZooming) {
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(solidMeshes);
                if (intersects.length > 0) {
                    const hitMesh = intersects[0].object;
                    const group = meshes.find(g => g.userData.solidMesh === hitMesh);
                    if (group && hoveredMesh !== group) {
                        if (hoveredMesh) {
                            const hu = hoveredMesh.userData;
                            hu.solidMat.color.setHex(hu.origColor);
                            hu.solidMat.emissive.setHex(hu.origEmissive);
                            hu.solidMat.emissiveIntensity = 0.3;
                            hu.edgeMat.opacity = 0.8;
                            hu.isHovered = false;
                        }
                        hoveredMesh = group;
                        const u = hoveredMesh.userData;
                        u.solidMat.color.setHex(0x2da39a);
                        u.solidMat.emissive.setHex(0x1a6060);
                        u.solidMat.emissiveIntensity = 0.5;
                        u.edgeMat.color.setHex(0x4dd0c8);
                        u.edgeMat.opacity = 1.0;
                        u.isHovered = true;
                        renderer.domElement.style.cursor = 'pointer';
                    }
                    if (hoveredMesh) {
                        setTooltip({ visible: true, text: `${hoveredMesh.userData.title} / ${hoveredMesh.userData.value}`, x: mouseScreen.x, y: mouseScreen.y });
                    }
                } else if (hoveredMesh) {
                    const hu = hoveredMesh.userData;
                    hu.solidMat.color.setHex(hu.origColor);
                    hu.solidMat.emissive.setHex(hu.origEmissive);
                    hu.solidMat.emissiveIntensity = 0.3;
                    hu.edgeMat.color.setHex(hu.edgeColor);
                    hu.edgeMat.opacity = 0.8;
                    hu.isHovered = false;
                    hoveredMesh = null;
                    renderer.domElement.style.cursor = 'default';
                    setTooltip(t => ({ ...t, visible: false }));
                }
            }

            // Animate cubes
            meshes.forEach(group => {
                const u = group.userData;
                if (u.animatingIn) {
                    const t = Math.min((time - u.startTime) / 1.5, 1.0);
                    if (t > 0) {
                        const easeT = elasticOut(t);
                        group.scale.y = Math.max(0.01, u.targetScaleY * easeT);
                        group.position.y = (group.scale.y / 2) - 0.5;
                        u.baseY = group.position.y;
                    }
                    if (t === 1.0) u.animatingIn = false;
                }
                if (!u.animatingIn && hasTriggeredIn) {
                    // Edge glow pulse
                    u.edgeMat.opacity = 0.6 + Math.sin(time * 2 + u.phaseOffset) * 0.25;

                    if (focusedMesh === group) {
                        u.solidMat.emissiveIntensity = 0.5 + Math.sin(time * 3) * 0.2;
                        group.position.y = THREE.MathUtils.lerp(group.position.y, u.baseY + 1.0, 0.05);
                    } else if (focusedMesh) {
                        u.solidMat.opacity = 0.25;
                        u.edgeMat.opacity = 0.2;
                    } else {
                        u.solidMat.opacity = 0.85;
                        if (u.isHovered) {
                            group.position.y = THREE.MathUtils.lerp(group.position.y, u.baseY + 1.5, 0.1);
                        } else {
                            const targetY = u.baseY + Math.sin(time * 1.5 + u.phaseOffset) * 0.2;
                            group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.1);
                        }
                    }
                }
            });

            // Under-glow pulse
            pointLight.intensity = 0.4 + Math.sin(time * 1.5) * 0.2;
            pointLight.color.setHSL(0.75 + Math.sin(time * 0.3) * 0.05, 0.8, 0.5);

            renderer.render(scene, camera);
        };

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

        const handleResize = () => {
            const w = mountRef.current?.clientWidth || window.innerWidth;
            const h = mountRef.current?.clientHeight || window.innerHeight;
            const a = w / h;
            camera.left = -d * a; camera.right = d * a;
            camera.top = d; camera.bottom = -d;
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
            cubeGeo.dispose(); edgeGeo.dispose();
            planeGeo.dispose(); planeMat.dispose();
            pGeo.dispose(); pMat.dispose();
            renderer.dispose();
            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            {tooltip.visible && !detail && (
                <div style={{
                    position: 'absolute', left: tooltip.x, top: tooltip.y - 40,
                    transform: 'translate(-50%, -100%)',
                    background: 'rgba(13, 13, 26, 0.92)', color: 'white',
                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px',
                    fontFamily: 'monospace', pointerEvents: 'none', zIndex: 1000,
                    border: '1px solid rgba(45, 163, 154, 0.4)',
                    backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 20px rgba(45,163,154,0.15)'
                }}>{tooltip.text}</div>
            )}
            {detail && (
                <div style={{
                    position: 'absolute', top: 20, right: 20, maxWidth: 260,
                    background: 'rgba(13, 13, 26, 0.94)',
                    border: '1px solid rgba(45, 163, 154, 0.4)',
                    borderRadius: '12px', padding: '20px', color: 'white',
                    zIndex: 1000, backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(45,163,154,0.08)',
                    animation: 'fadeSlideIn 0.35s ease-out'
                }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#2da39a', marginBottom: 6, fontFamily: 'var(--font-display)' }}>{detail.value}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{detail.title}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{detail.desc}</div>
                    <div style={{ marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Кликните чтобы вернуться</div>
                </div>
            )}
            <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
        </div>
    );
}
