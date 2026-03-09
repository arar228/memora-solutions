import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function SceneLogistics() {
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

    useEffect(() => {
        if (!mountRef.current) return;

        // --- SETUP ---
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(0, 400, 300);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;
        controls.minAzimuthAngle = -Math.PI / 6; // -30 deg
        controls.maxAzimuthAngle = Math.PI / 6;  // +30 deg
        controls.maxPolarAngle = Math.PI / 2.5;  // Limiting vertical
        controls.minPolarAngle = Math.PI / 4;

        // --- LIGHTS ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 100);
        scene.add(dirLight);

        // --- MAP BASE (Stylized Russia) ---
        // Simplified polygon shape for visual representation
        const shape = new THREE.Shape();
        shape.moveTo(-150, 50);
        shape.lineTo(150, 80);
        shape.lineTo(200, 0);
        shape.lineTo(100, -80);
        shape.lineTo(-50, -50);
        shape.lineTo(-180, -20);
        shape.lineTo(-150, 50);

        const extrudeSettings = { depth: 3, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 1, bevelThickness: 1 };
        const mapGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mapMat = new THREE.MeshStandardMaterial({ color: 0x1A1A2E, roughness: 0.9 });
        const mapMesh = new THREE.Mesh(mapGeo, mapMat);
        mapMesh.rotation.x = Math.PI / 2;
        mapMesh.position.y = -3;
        scene.add(mapMesh);

        // --- LOGISTICS POINTS ---
        // Chelyabinsk (Orange) & SPb (Violet)
        const p1 = new THREE.Vector3(60, 0, 20); // Chelyabinsk approx
        const p2 = new THREE.Vector3(-120, 0, -40); // SPb approx

        const markerGeo = new THREE.SphereGeometry(4, 16, 16);
        const matChed = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
        const matSPb = new THREE.MeshBasicMaterial({ color: 0x6B4FA0 });

        const mChed = new THREE.Mesh(markerGeo, matChed);
        mChed.position.copy(p1);
        mChed.userData = { title: 'Челябинск: Изготовлен на заказ' };
        scene.add(mChed);

        const mSPb = new THREE.Mesh(markerGeo, matSPb);
        mSPb.position.copy(p2);
        mSPb.userData = { title: 'Санкт-Петербург: Доставлен и смонтирован' };
        scene.add(mSPb);

        // --- THE ROUTE (Curve) ---
        // Bezier curve arching over the map
        const heightDef = 120;
        const midPoint = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
        midPoint.y += heightDef;

        const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
        const curvePoints = curve.getPoints(100);
        const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);

        const lineMat = new THREE.LineBasicMaterial({
            color: 0x2DA39A,
            transparent: true,
            opacity: 0.8,
            linewidth: 2 // note: WebGL lines are always 1px, but works conceptually
        });
        const archLine = new THREE.Line(lineGeo, lineMat);
        archLine.geometry.setDrawRange(0, 0); // Hide initially
        scene.add(archLine);

        // Moving dot
        const dotGeo = new THREE.SphereGeometry(3, 16, 16);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const movingDot = new THREE.Mesh(dotGeo, dotMat);
        movingDot.visible = false;
        scene.add(movingDot);

        // --- INTERACTION ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([mChed, mSPb]);

            if (intersects.length > 0) {
                const object = intersects[0].object;
                setTooltip({
                    visible: true,
                    text: object.userData.title,
                    x: event.clientX,
                    y: event.clientY
                });
                document.body.style.cursor = 'pointer';
            } else {
                setTooltip(t => ({ ...t, visible: false }));
                document.body.style.cursor = 'default';
            }
        };
        renderer.domElement.addEventListener('mousemove', onMouseMove);

        // --- ANIMATION LOOP ---
        let animationId;
        let isVisible = false;
        let animProgress = 0;
        let isDrawing = true;
        let isPaused = false;
        let pauseTimer = 0;

        const clock = new THREE.Clock();

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            const delta = clock.getDelta();
            controls.update();

            // Pulsating markers
            const time = Date.now() * 0.005;
            mChed.scale.setScalar(1 + Math.sin(time) * 0.2);
            mSPb.scale.setScalar(1 + Math.cos(time) * 0.2);

            // Line Drawing Animation
            if (isDrawing && !isPaused) {
                animProgress += delta / 2.5; // 2.5 seconds to complete

                if (animProgress >= 1) {
                    animProgress = 1;
                    isPaused = true;
                    pauseTimer = 1.0; // 1 second pause
                }

                // Update drawn line
                const drawCount = Math.ceil(animProgress * 100);
                archLine.geometry.setDrawRange(0, drawCount);

                // Update moving dot
                if (animProgress > 0) {
                    movingDot.visible = true;
                    const pos = curve.getPointAt(animProgress);
                    movingDot.position.copy(pos);

                    // Color blend from orange to violet
                    const c1 = new THREE.Color(0xFFA500);
                    const c2 = new THREE.Color(0x6B4FA0);
                    dotMat.color.copy(c1).lerp(c2, animProgress);
                } else {
                    movingDot.visible = false;
                }
            }

            if (isPaused) {
                pauseTimer -= delta;
                if (pauseTimer <= 0) {
                    isPaused = false;
                    animProgress = 0; // Restart loop
                    archLine.geometry.setDrawRange(0, 0);
                    movingDot.visible = false;
                }
            }

            renderer.render(scene, camera);
        };

        // --- OBSERVER ---
        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
            if (isVisible) clock.getDelta(); // reset delta on entry
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
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            document.body.style.cursor = 'default';

            controls.dispose();
            mapGeo.dispose(); mapMat.dispose();
            markerGeo.dispose(); matChed.dispose(); matSPb.dispose();
            lineGeo.dispose(); lineMat.dispose();
            dotGeo.dispose(); dotMat.dispose();
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
        </>
    );
}
