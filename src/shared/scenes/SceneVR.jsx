import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';
import i18n from '../../i18n/i18n';
import { disposeScene } from './_shared/disposeScene';

export default function SceneVR() {
    // useTranslation is used for the JSX caption (re-renders on language
    // change). Inside the long-running useEffect we read i18n.t directly
    // — it always pulls the current language without requiring deps.
    const { t } = useTranslation();
    const mountRef = useRef(null);
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

    useEffect(() => {
        if (!mountRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#0D0D1A');

        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        camera.position.set(0, 50, 150);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.domElement.style.touchAction = 'pan-y';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = true;
        controls.minDistance = 80;
        controls.maxDistance = 200;

        // --- LIGHTS ---
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const pLight = new THREE.PointLight(0xffffff, 1, 200);
        pLight.position.set(0, 0, 0);
        scene.add(pLight);

        // --- OBJECTS ---
        // 1. Main Transparent Sphere
        const mainGeo = new THREE.SphereGeometry(40, 32, 32);
        const mainMat = new THREE.MeshPhongMaterial({
            color: 0x6B4FA0,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const mainSphere = new THREE.Mesh(mainGeo, mainMat);
        scene.add(mainSphere);

        // 2. Inner Particles
        const particleCount = 300;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(particleCount * 3);
        const pInitial = new Float32Array(particleCount * 3);
        const pVelocities = [];

        for (let i = 0; i < particleCount; i++) {
            // Random point inside the sphere
            const r = Math.random() * 38;
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = r * Math.sin(phi) * Math.cos(theta);
            const y = r * Math.sin(phi) * Math.sin(theta);
            const z = r * Math.cos(phi);

            pPos[i * 3] = x;
            pPos[i * 3 + 1] = y;
            pPos[i * 3 + 2] = z;

            pInitial[i * 3] = x;
            pInitial[i * 3 + 1] = y;
            pInitial[i * 3 + 2] = z;

            pVelocities.push({
                x: (Math.random() - 0.5) * 40,
                y: (Math.random() - 0.5) * 40,
                z: (Math.random() - 0.5) * 40
            });
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({ color: 0xbbbbff, size: 0.8, transparent: true, opacity: 0.8 });
        const particles = new THREE.Points(pGeo, pMat);
        scene.add(particles);

        // 3. Orbits & Avatars
        const avatarCount = 6;
        const avatars = [];
        const lines = [];
        const avatarGroup = new THREE.Group();
        scene.add(avatarGroup);

        const avatarGeo = new THREE.SphereGeometry(3, 16, 16);
        const avatarMatBase = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const avatarMatHover = new THREE.MeshBasicMaterial({ color: 0x2DA39A });

        const orbitRadius = 60;

        for (let i = 0; i < avatarCount; i++) {
            const angle = (i / avatarCount) * Math.PI * 2;
            const x = Math.cos(angle) * orbitRadius;
            const z = Math.sin(angle) * orbitRadius;
            // add some vertical variance
            const y = Math.sin(angle * 3) * 10;

            const mesh = new THREE.Mesh(avatarGeo, avatarMatBase.clone());
            mesh.position.set(x, y, z);
            mesh.userData = { id: i + 1, isHovered: false, baseScale: 1, angle };
            avatarGroup.add(mesh);
            avatars.push(mesh);

            // Line connecting to center
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                mesh.position.clone()
            ]);
            const lineMat = new THREE.LineBasicMaterial({ color: 0x6B4FA0, transparent: true, opacity: 0.3 });
            const line = new THREE.Line(lineGeo, lineMat);
            avatarGroup.add(line);
            lines.push(line);
        }

        // --- INTERACTION ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredAvatar = null;
        let isExploding = false;

        const onMouseMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([mainSphere, ...avatars]);

            if (intersects.length > 0) {
                const object = intersects[0].object;

                if (object === mainSphere) {
                    document.body.style.cursor = 'pointer';
                    setTooltip(t => ({ ...t, visible: false }));
                    if (hoveredAvatar) {
                        gsap.to(hoveredAvatar.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
                        hoveredAvatar.material.copy(avatarMatBase);
                        hoveredAvatar = null;
                    }
                } else if (avatars.includes(object)) {
                    document.body.style.cursor = 'default';
                    if (hoveredAvatar !== object) {
                        if (hoveredAvatar) {
                            gsap.to(hoveredAvatar.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
                            hoveredAvatar.material.copy(avatarMatBase);
                        }
                        hoveredAvatar = object;
                        gsap.to(hoveredAvatar.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.2 });
                        hoveredAvatar.material.copy(avatarMatHover);

                        setTooltip({
                            visible: true,
                            text: i18n.t('creator.scene.vrMember', { n: object.userData.id }),
                            x: event.clientX,
                            y: event.clientY
                        });
                    } else {
                        setTooltip(t => ({ ...t, x: event.clientX, y: event.clientY }));
                    }
                }
            } else {
                document.body.style.cursor = 'default';
                setTooltip(t => ({ ...t, visible: false }));
                if (hoveredAvatar) {
                    gsap.to(hoveredAvatar.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
                    hoveredAvatar.material.copy(avatarMatBase);
                    hoveredAvatar = null;
                }
            }
        };

        const onClick = () => {
            if (isExploding) return;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects([mainSphere]);
            if (intersects.length > 0) {
                triggerExplosion();
            }
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onClick);

        // --- EXPLOSION ANIMATION (GSAP manually integrated) ---
        const explodeObj = { t: 0 };
        const triggerExplosion = () => {
            isExploding = true;
            explodeObj.t = 0;
            const positions = particles.geometry.attributes.position.array;

            // Animate out
            gsap.to(explodeObj, {
                t: 1,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: () => {
                    for (let i = 0; i < particleCount; i++) {
                        positions[i * 3] = pInitial[i * 3] + pVelocities[i].x * explodeObj.t;
                        positions[i * 3 + 1] = pInitial[i * 3 + 1] + pVelocities[i].y * explodeObj.t;
                        positions[i * 3 + 2] = pInitial[i * 3 + 2] + pVelocities[i].z * explodeObj.t;
                    }
                    particles.geometry.attributes.position.needsUpdate = true;
                },
                onComplete: () => {
                    // Animate back in
                    gsap.to(explodeObj, {
                        t: 0,
                        duration: 1.0,
                        ease: "power3.inOut",
                        onUpdate: () => {
                            for (let i = 0; i < particleCount; i++) {
                                positions[i * 3] = pInitial[i * 3] + pVelocities[i].x * explodeObj.t;
                                positions[i * 3 + 1] = pInitial[i * 3 + 1] + pVelocities[i].y * explodeObj.t;
                                positions[i * 3 + 2] = pInitial[i * 3 + 2] + pVelocities[i].z * explodeObj.t;
                            }
                            particles.geometry.attributes.position.needsUpdate = true;
                        },
                        onComplete: () => { isExploding = false; }
                    });
                }
            });
        };

        // --- ANIMATION LOOP ---
        let animationId;
        let isVisible = false;

        const tick = () => {
            animationId = requestAnimationFrame(tick);
            if (!isVisible) return;

            controls.update();

            // Rotate main sphere slowly
            mainSphere.rotation.y += 0.001;

            // Rotate avatars
            avatarGroup.rotation.y -= 0.003;

            // Update lines so they connect center to avatars (because avatars are grouped, their local pos hasn't changed, but just to be safe)
            avatars.forEach((avatar, i) => {
                const line = lines[i];
                if (hoveredAvatar === avatar) {
                    line.material.opacity = 0.8;
                    line.material.color.setHex(0x2DA39A);
                } else {
                    line.material.opacity = 0.3;
                    line.material.color.setHex(0x6B4FA0);
                }
            });

            // Very slow drift for default particles
            if (!isExploding) {
                const positions = particles.geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    pInitial[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.02;
                    pInitial[i * 3 + 1] += Math.cos(Date.now() * 0.001 + i) * 0.02;
                    pInitial[i * 3 + 2] += Math.sin(Date.now() * 0.002 + i) * 0.02;

                    positions[i * 3] = pInitial[i * 3];
                    positions[i * 3 + 1] = pInitial[i * 3 + 1];
                    positions[i * 3 + 2] = pInitial[i * 3 + 2];
                }
                particles.geometry.attributes.position.needsUpdate = true;
            }

            renderer.render(scene, camera);
        };

        const observer = new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting;
        }, { threshold: 0.3 });

        observer.observe(mountRef.current);
        tick();

        return () => {
            cancelAnimationFrame(animationId);
            observer.disconnect();
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('click', onClick);
            document.body.style.cursor = 'default';
            controls.dispose();
            // Kill any pending tweens on objects we created.
            gsap.killTweensOf(explodeObj);
            avatars.forEach(a => gsap.killTweensOf(a.scale));
            // Walk the scene and dispose every geometry/material/texture.
            disposeScene(scene, renderer);
        };
    }, []);

    return (
        <>
            <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
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
            <div style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                pointerEvents: 'none'
            }}>{t('creator.scene.vrCaption')}</div>
        </>
    );
}
