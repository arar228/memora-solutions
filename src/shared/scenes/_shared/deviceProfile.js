// Centralised mobile/desktop tuning for Three.js scenes.
//
// Each scene imports `getProfile()` once and uses the values when wiring up
// renderer / post-processing / heavy materials. That way mobile-specific
// fallbacks live in one place, and we don't drift between scenes.

const isMobileUA = () => {
    if (typeof navigator === 'undefined') return false;
    // Match common mobile UAs without trying to be exhaustive — the
    // narrow-screen check below catches the rest.
    return /Android|iPhone|iPad|iPod|Mobile|Phone/i.test(navigator.userAgent);
};

const isNarrowScreen = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 820;
};

export function isMobile() {
    return isMobileUA() || isNarrowScreen();
}

// Single source of truth — call once at scene setup.
export function getProfile() {
    const mobile = isMobile();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return {
        mobile,
        // Cap pixel ratio aggressively on mobile so retina screens don't
        // render at 3x resolution.
        pixelRatio: mobile ? Math.min(dpr, 1.5) : Math.min(dpr, 2),
        // MSAA on top of bloom is overkill on phones; bloom already softens edges.
        antialias: !mobile,
        // Bloom is the single most expensive pass — lighter strength + smaller
        // resolution on mobile keeps frame time under 16ms.
        bloomStrength: mobile ? 0.4 : 0.65,
        bloomRadius: mobile ? 0.35 : 0.55,
        bloomThreshold: 0.0,
        // MeshPhysicalMaterial transmission and Reflector each add a
        // full-scene render pass; we drop them on mobile.
        useTransmission: !mobile,
        useReflector: !mobile,
        // Shadow maps are off across the project, but if a scene flips them
        // on, expose a flag so it can branch.
        shadows: false,
    };
}
