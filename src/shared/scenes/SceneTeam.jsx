import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as d3Force from 'd3-force';
import { gsap } from 'gsap';

export default function SceneTeam() {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

    useEffect(() => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(0, 0, 300); // 2D flat view conceptually, using perspective for depth

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.domElement.style.touchAction = 'pan-y';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enableRotate = false; // keep it flat as requested, let simulation do the work
        controls.enablePan = false;

        // --- GRAPH DATA & D3 SIMULATION ---
        const nodesData = [];
        const linksData = [];

        // 1 Central Node (Sergey)
        const centerNode = { id: 0, group: 0, role: 'Memora Solutions', baseScale: 1.5, x: 0, y: 0, z: 0 };
        nodesData.push(centerNode);

        // Peripheral roles — specific, prestigious titles
        const roles = [
            { count: 2, name: 'Руководитель проектов', group: 1 },
            { count: 1, name: 'Аккаунт-менеджер', group: 1 },
            { count: 1, name: 'Менеджер по закупкам', group: 1 },
            { count: 2, name: 'Инженер слаботочных систем', group: 2 },
            { count: 1, name: 'BIM-инженер', group: 2 },
            { count: 1, name: 'Инженер-проектировщик ОВиК', group: 2 },
            { count: 1, name: 'Инженер-наладчик АСУ ТП', group: 2 },
            { count: 1, name: 'Сетевой инженер (CCNA)', group: 2 },
            { count: 1, name: 'Frontend-архитектор', group: 3 },
            { count: 1, name: 'Fullstack-разработчик', group: 3 },
            { count: 1, name: 'Backend-разработчик (Node.js)', group: 3 },
            { count: 1, name: 'DevOps-инженер', group: 3 },
            { count: 1, name: 'Проектировщик КЖ / КМ', group: 4 },
            { count: 1, name: 'Архитектор ИТ-решений', group: 4 },
            { count: 1, name: 'Сметчик-экономист', group: 4 },
            { count: 1, name: 'Логист по ВЭД', group: 5 },
            { count: 1, name: 'Координатор поставок', group: 5 },
            { count: 1, name: 'Инженер СКС', group: 6 },
            { count: 1, name: 'Монтажник-высотник', group: 6 },
            { count: 1, name: 'Техник по видеонаблюдению', group: 7 },
            { count: 1, name: 'Специалист по СКУД/ОПС', group: 7 },
            { count: 1, name: 'Инженер по пожарной безопасности', group: 7 },
            { count: 1, name: 'Диспетчер объектов', group: 7 }
        ];

        let idCounter = 1;
        roles.forEach(role => {
            for (let i = 0; i < role.count; i++) {
                nodesData.push({
                    id: idCounter,
                    group: role.group,
                    role: role.name,
                    baseScale: 0.8 + Math.random() * 0.4,
                    // initial randomized layout around center
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                    z: (Math.random() - 0.5) * 50 // some Z depth
                });
                // Link every peripheral node directly to the center
                linksData.push({ source: idCounter, target: 0 });

                // Add some intra-cluster connections (connect to previous node in same group)
                if (i > 0) {
                    linksData.push({ source: idCounter, target: idCounter - 1 });
                }

                idCounter++;
            }
        });

        // Add the special interactive "CTA reader" node manually at the end
        const readerNode = { id: 999, group: 99, role: 'Есть интересная задача? Напишите.', baseScale: 1.2, x: 100, y: -100, z: 20 };
        nodesData.push(readerNode);
        linksData.push({ source: 999, target: 0 });

        // Force simulation
        const simulation = d3Force.forceSimulation(nodesData)
            .force('link', d3Force.forceLink(linksData).id(d => d.id).distance(60))
            .force('charge', d3Force.forceManyBody().strength(-200)) // Repulsion
            .force('center', d3Force.forceCenter(0, 0)) // Keep around origin
            //.force('z', d3Force.forceZ(0).strength(0.05)) // keep Z flat mostly
            .velocityDecay(0.08); // Equivalent to damping 0.92 = 1.0 - 0.08

        simulation.alphaMin(0.01);

        // --- MESH COMPONENTS ---
        const sphereGeo = new THREE.SphereGeometry(6, 16, 16);
        const nodeMeshes = [];
        const groupMatCache = {
            0: new THREE.MeshBasicMaterial({ color: 0x6B4FA0 }), // Center Violet
            99: new THREE.MeshBasicMaterial({ color: 0x2DA39A }), // Reader Teal
            // Others white-ish
            default: new THREE.MeshBasicMaterial({ color: 0xbbbbff })
        };
        const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Bright hover

        nodesData.forEach(d => {
            const mat = d.group === 0 ? groupMatCache[0] : (d.group === 99 ? groupMatCache[99] : groupMatCache.default);
            const mesh = new THREE.Mesh(sphereGeo, mat.clone());
            mesh.scale.set(d.baseScale, d.baseScale, d.baseScale);
            // Will position in loop from simulation
            mesh.userData = { ...d, originalMat: mat };
            scene.add(mesh);
            nodeMeshes.push(mesh);
        });

        const lineGeo = new THREE.BufferGeometry();
        // Multiply by 3 for XYZ, * 2 points per line
        const linePos = new Float32Array(linksData.length * 6);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
        const lineMat = new THREE.LineBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.4 });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        scene.add(lines);

        // --- INTERACTION ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredMesh = null;

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(nodeMeshes);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                if (hoveredMesh !== object) {
                    if (hoveredMesh) resetHover(hoveredMesh);

                    document.body.style.cursor = 'pointer';
                    hoveredMesh = object;
                    hoveredMesh.material.copy(hoverMat);
                    gsap.to(hoveredMesh.scale, {
                        x: hoveredMesh.userData.baseScale * 1.5,
                        y: hoveredMesh.userData.baseScale * 1.5,
                        z: hoveredMesh.userData.baseScale * 1.5,
                        duration: 0.2
                    });

                    // Specific logic for center
                    if (hoveredMesh.userData.id === 0) {
                        lines.material.opacity = 1.0;
                        lines.material.color.setHex(0xffffff);
                    }

                    // Special tooltip for +1 node
                    const text = hoveredMesh.userData.id === 999
                        ? hoveredMesh.userData.role
                        : hoveredMesh.userData.id === 0 ? 'Memora Solutions' : hoveredMesh.userData.role;

                    setTooltip({
                        visible: true,
                        text,
                        x: event.clientX,
                        y: event.clientY
                    });
                } else {
                    setTooltip(t => ({ ...t, x: event.clientX, y: event.clientY }));
                }
            } else {
                if (hoveredMesh) {
                    resetHover(hoveredMesh);
                    hoveredMesh = null;
                    document.body.style.cursor = 'default';
                    setTooltip(t => ({ ...t, visible: false }));
                }
            }
        };

        const resetHover = (mesh) => {
            mesh.material.copy(mesh.userData.originalMat);
            gsap.to(mesh.scale, {
                x: mesh.userData.baseScale,
                y: mesh.userData.baseScale,
                z: mesh.userData.baseScale,
                duration: 0.2
            });
            lines.material.opacity = 0.4;
            lines.material.color.setHex(0x6B4FA0);
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);

        // --- ANIMATION LOOP ---
        let animationId;
        let isVisible = false;
        const clock = new THREE.Clock();

        // Initial setup for entrance animation
        let hasTriggeredIn = false;
        // set all meshes to origin initially, invisible
        nodeMeshes.forEach(m => { m.visible = false; m.position.set(0, 0, 0); });

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            const time = clock.getElapsedTime();

            // Run simulation 1 tick
            simulation.tick();

            // Update mesh positions from D3 + entrance animation GSAP
            if (hasTriggeredIn) {
                // Update Lines (Wait until entrance animation distributes them)
                const positions = lines.geometry.attributes.position.array;

                nodesData.forEach((d, i) => {
                    const mesh = nodeMeshes[i];

                    // Add "breathing" effect
                    const breathe = 1.0 + Math.sin(time * 2 + d.id) * 0.05;
                    if (hoveredMesh !== mesh) {
                        mesh.scale.set(d.baseScale * breathe, d.baseScale * breathe, d.baseScale * breathe);
                    }
                });

                linksData.forEach((link, i) => {
                    const sourceMesh = nodeMeshes.find(m => m.userData.id === link.source.id);
                    const targetMesh = nodeMeshes.find(m => m.userData.id === link.target.id);

                    if (sourceMesh && targetMesh) {
                        positions[i * 6] = sourceMesh.position.x;
                        positions[i * 6 + 1] = sourceMesh.position.y;
                        positions[i * 6 + 2] = sourceMesh.position.z;
                        positions[i * 6 + 3] = targetMesh.position.x;
                        positions[i * 6 + 4] = targetMesh.position.y;
                        positions[i * 6 + 5] = targetMesh.position.z;
                    }
                });
                lines.geometry.attributes.position.needsUpdate = true;

                // Keep the +1 node blinking gently
                const readerMesh = nodeMeshes.find(m => m.userData.id === 999);
                if (readerMesh && hoveredMesh !== readerMesh) {
                    readerMesh.material.opacity = 0.5 + Math.sin(time * 4) * 0.5;
                    readerMesh.material.transparent = true;
                }
            }

            renderer.render(scene, camera);
        };

        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible && !hasTriggeredIn) {
                // Trigger entrance
                hasTriggeredIn = true;
                // Run simulation entirely to get end positions, then animate to them
                for (let i = 0; i < 300; i++) simulation.tick();

                nodeMeshes.forEach(mesh => {
                    mesh.visible = true;
                    gsap.to(mesh.position, {
                        x: mesh.userData.x,
                        y: mesh.userData.y,
                        z: mesh.userData.z,
                        duration: 1.2,
                        ease: "power2.out",
                        onUpdate: () => {
                            // Link to D3 force object so physics can take over after
                            mesh.userData.x = mesh.position.x;
                            mesh.userData.y = mesh.position.y;
                            mesh.userData.z = mesh.position.z;
                        }
                    });
                });
                clock.start();
            }
        }, { threshold: 0.3 });

        observer.observe(mountRef.current);
        tick();

        return () => {
            window.removeEventListener('resize', () => { });
            cancelAnimationFrame(animationId);
            observer.disconnect();
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            document.body.style.cursor = 'default';

            simulation.stop();
            controls.dispose();
            sphereGeo.dispose();
            Object.values(groupMatCache).forEach(m => m.dispose());
            hoverMat.dispose();
            lineGeo.dispose(); lineMat.dispose();
            renderer.dispose();

            if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            {tooltip.visible && (
                <div
                    style={{
                        position: 'fixed',
                        left: tooltip.x,
                        top: tooltip.y - 30,
                        transform: 'translate(-50%, -100%)',
                        background: 'rgba(13, 13, 26, 0.9)',
                        color: 'white',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(4px)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {tooltip.text}
                </div>
            )}

            {/* Custom Label for the +1 Node to ensure it's noticed */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                color: '#2DA39A',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: '14px',
                pointerEvents: 'none'
            }}>
                +1?
            </div>
        </div>
    );
}
