import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';

export default function SceneDomatrix() {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

    // Expose pulse trigger to a button if needed (UI overlay)
    const triggerPulseRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        // Slight isometric angle 20 deg
        camera.position.set(40, 20, 100);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        // Limit rotation significantly
        controls.minAzimuthAngle = -Math.PI / 8;
        controls.maxAzimuthAngle = Math.PI / 4;
        controls.maxPolarAngle = Math.PI / 2 + 0.1;
        controls.minPolarAngle = Math.PI / 3;

        // --- BACKGROUND / BUILDING CONTOUR ---
        const buildingWidth = 80;
        const buildingHeight = 60;
        const buildingDepth = 20;

        const bGeo = new THREE.BoxGeometry(buildingWidth, buildingHeight, buildingDepth);
        // Floor lines
        const floors = 4;
        const group = new THREE.Group();

        // Main Outline
        const edges = new THREE.EdgesGeometry(bGeo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x3A3A6A, linewidth: 1 });
        const outline = new THREE.LineSegments(edges, lineMat);
        group.add(outline);

        // Floor separators
        for (let i = 1; i < floors; i++) {
            const y = -buildingHeight / 2 + (buildingHeight / floors) * i;
            const fGeo = new THREE.PlaneGeometry(buildingWidth, buildingDepth);
            const fEdges = new THREE.EdgesGeometry(fGeo);
            const fOutline = new THREE.LineSegments(fEdges, lineMat);
            fOutline.rotation.x = Math.PI / 2;
            fOutline.position.y = y;
            group.add(fOutline);
        }
        scene.add(group);

        // --- NODES ---
        const categories = [
            { id: 'hvac', color: 0x2196F3, name: 'Климат-контроль' },
            { id: 'electro', color: 0xFFC107, name: 'Электрика и освещение' },
            { id: 'security', color: 0xF44336, name: 'Контроль доступа (СКУД)' },
            { id: 'it', color: 0x6B4FA0, name: 'IT-инфраструктура' },
            { id: 'water', color: 0x00BCD4, name: 'Водоснабжение (ВК)' },
            { id: 'fire', color: 0xFF5722, name: 'Пожарная сигнализация' }
        ];

        const nodes = [];
        const nodeGeo = new THREE.SphereGeometry(2, 16, 16);

        // Distribute ~24 nodes
        const nodesPerFloor = 6;
        for (let f = 0; f < floors; f++) {
            const y = -buildingHeight / 2 + (buildingHeight / floors) * f + (buildingHeight / floors) / 2;

            for (let i = 0; i < nodesPerFloor; i++) {
                const cat = categories[Math.floor(Math.random() * categories.length)];
                const mat = new THREE.MeshBasicMaterial({ color: cat.color, transparent: true, opacity: 0.8 });
                const mesh = new THREE.Mesh(nodeGeo, mat);

                // Random position within the floor limits
                const limitX = buildingWidth / 2 - 4;
                const limitZ = buildingDepth / 2 - 4;
                mesh.position.set(
                    (Math.random() * limitX * 2) - limitX,
                    y + (Math.random() * 4 - 2), // small Y offset
                    (Math.random() * limitZ * 2) - limitZ
                );

                mesh.userData = {
                    category: cat.name,
                    color: cat.color,
                    baseMat: mat,
                    connections: []
                };

                group.add(mesh);
                nodes.push(mesh);
            }
        }

        // --- CONNECTIONS ("Nerves") ---
        const connections = [];
        const connMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
        // Connect each node to 2-3 other nodes randomly
        nodes.forEach((n1, i) => {
            const targets = [
                nodes[Math.floor(Math.random() * nodes.length)],
                nodes[Math.floor(Math.random() * nodes.length)]
            ];

            targets.forEach(n2 => {
                if (n1 !== n2) {
                    const cGeo = new THREE.BufferGeometry().setFromPoints([n1.position, n2.position]);
                    const clMat = connMat.clone();
                    const line = new THREE.Line(cGeo, clMat);
                    group.add(line);

                    const connection = { n1, n2, line, progress: 0, isPulsing: false };
                    connections.push(connection);

                    n1.userData.connections.push(connection);
                    n2.userData.connections.push(connection); // undirected conceptually
                }
            });
        });

        // --- INTERACTION ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredNode = null;

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(nodes);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                if (hoveredNode !== object) {
                    document.body.style.cursor = 'pointer';

                    // Reset prev
                    if (hoveredNode) resetHover(hoveredNode);

                    hoveredNode = object;
                    // Apply hover effect
                    hoveredNode.scale.set(1.5, 1.5, 1.5);
                    hoveredNode.material.opacity = 1.0;

                    // Dim others
                    nodes.forEach(n => {
                        if (n !== hoveredNode) n.material.opacity = 0.2;
                    });

                    // Highlight immediate connections
                    hoveredNode.userData.connections.forEach(c => {
                        c.line.material.opacity = 0.8;
                        c.line.material.color.setHex(hoveredNode.userData.color); // Color line by node
                    });

                    setTooltip({
                        visible: true,
                        text: hoveredNode.userData.category,
                        x: event.clientX,
                        y: event.clientY
                    });
                } else {
                    setTooltip(t => ({ ...t, x: event.clientX, y: event.clientY }));
                }
            } else {
                if (hoveredNode) {
                    resetHover(hoveredNode);
                    hoveredNode = null;
                    document.body.style.cursor = 'default';
                    setTooltip(t => ({ ...t, visible: false }));
                }
            }
        };

        const resetHover = (node) => {
            node.scale.set(1, 1, 1);
            nodes.forEach(n => n.material.opacity = 0.8);
            node.userData.connections.forEach(c => {
                c.line.material.opacity = 0.1;
                c.line.material.color.setHex(0xffffff);
            });
        };

        const onClick = () => {
            if (hoveredNode) {
                // Pulse from hovered node to immediate neighbors
                hoveredNode.userData.connections.forEach(startPulse);
            }
        };

        const startPulse = (conn) => {
            conn.isPulsing = true;
            conn.progress = 0;
            conn.line.material.color.setHex(0xffffff); // Bright flash
            conn.line.material.opacity = 1.0;
        };

        // EXPOSED ALL-PULSE
        triggerPulseRef.current = () => {
            connections.forEach(c => {
                if (Math.random() > 0.5) startPulse(c);
            });
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onClick);

        // --- ANIMATION LOOP ---
        let animationId;
        let isVisible = false;
        const clock = new THREE.Clock();

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            const delta = clock.getDelta();
            const time = clock.getElapsedTime();
            controls.update();

            // Very slow group rotation
            group.rotation.y = Math.sin(time * 0.2) * 0.1;

            // Update pulses on lines
            connections.forEach(c => {
                if (c.isPulsing) {
                    c.progress += delta * 3; // speed
                    if (c.progress >= 1.0) {
                        c.isPulsing = false;
                        c.line.material.opacity = (hoveredNode && hoveredNode.userData.connections.includes(c)) ? 0.8 : 0.1;
                        if (hoveredNode && hoveredNode.userData.connections.includes(c)) {
                            c.line.material.color.setHex(hoveredNode.userData.color);
                        } else {
                            c.line.material.color.setHex(0xffffff);
                        }
                    } else {
                        // Fade out progress
                        c.line.material.opacity = 1.0 - c.progress;
                    }
                }
            });

            // Occasional random background pulse
            if (!hoveredNode && Math.random() < 0.05) {
                const rConn = connections[Math.floor(Math.random() * connections.length)];
                if (!rConn.isPulsing) startPulse(rConn);
            }

            renderer.render(scene, camera);
        };

        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) clock.getDelta(); // reset delta
        }, { threshold: 0.3 });

        observer.observe(mountRef.current);
        tick();

        return () => {
            window.removeEventListener('resize', () => { });
            cancelAnimationFrame(animationId);
            observer.disconnect();
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('click', onClick);
            document.body.style.cursor = 'default';

            controls.dispose();
            bGeo.dispose(); edges.dispose(); lineMat.dispose();
            nodeGeo.dispose();
            nodes.forEach(n => n.material.dispose());
            connMat.dispose();
            connections.forEach(c => { c.line.geometry.dispose(); c.line.material.dispose(); });
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

            {/* UI Overlay */}
            <div style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                display: 'flex',
                gap: 16
            }}>
                <button
                    onClick={() => triggerPulseRef.current?.()}
                    style={{
                        background: 'rgba(107, 79, 160, 0.2)',
                        color: '#bbbbff',
                        border: '1px solid rgba(107, 79, 160, 0.5)',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(107, 79, 160, 0.4)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(107, 79, 160, 0.2)'}
                >
                    Показать все связи
                </button>
            </div>
        </div>
    );
}
