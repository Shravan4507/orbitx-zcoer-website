import { useMemo } from 'react';
import Galaxy from './Galaxy';
import { detectPerformance } from '../../utils/performanceDetection';
import type { PerformanceTier } from '../../utils/performanceDetection';
import './Galaxy.css';

/**
 * Galaxy settings optimized for different performance tiers
 */
const PERFORMANCE_PRESETS: Record<PerformanceTier, {
    density: number;
    glowIntensity: number;
    twinkleIntensity: number;
    rotationSpeed: number;
    speed: number;
    mouseInteraction: boolean;
    mouseRepulsion: boolean;
    disabled: boolean;
}> = {
    high: {
        // Full quality for high-end devices
        density: 0.6,
        glowIntensity: 0.1,
        twinkleIntensity: 0.1,
        rotationSpeed: 0.1,
        speed: 0.8,
        mouseInteraction: false,
        mouseRepulsion: false,
        disabled: false
    },
    medium: {
        // Reduced quality for mid-range devices
        density: 0.35,
        glowIntensity: 0.08,
        twinkleIntensity: 0.05,
        rotationSpeed: 0.05,
        speed: 0.5,
        mouseInteraction: false,
        mouseRepulsion: false,
        disabled: false
    },
    low: {
        // Minimal quality for low-end devices
        density: 0.15,
        glowIntensity: 0.05,
        twinkleIntensity: 0,
        rotationSpeed: 0.02,
        speed: 0.3,
        mouseInteraction: false,
        mouseRepulsion: false,
        disabled: false
    }
};

interface AdaptiveGalaxyProps {
    // Allow overriding specific settings if needed
    forceHighQuality?: boolean;
    forceLowQuality?: boolean;
}

/**
 * AdaptiveGalaxy Component
 * Automatically adjusts Galaxy settings based on device performance.
 * All detection happens silently - users only see smooth performance.
 */
export default function AdaptiveGalaxy({
    forceHighQuality = false,
    forceLowQuality = false
}: AdaptiveGalaxyProps) {
    // Detect performance tier (cached after first call)
    const settings = useMemo(() => {
        // Handle forced modes
        if (forceHighQuality) return PERFORMANCE_PRESETS.high;
        if (forceLowQuality) return PERFORMANCE_PRESETS.low;

        // Auto-detect
        const { tier } = detectPerformance();
        return PERFORMANCE_PRESETS[tier];
    }, [forceHighQuality, forceLowQuality]);

    // If disabled for very low-end devices, show static fallback
    if (settings.disabled) {
        return <div className="galaxy-container galaxy-container--static" />;
    }

    return (
        <Galaxy
            density={settings.density}
            glowIntensity={settings.glowIntensity}
            twinkleIntensity={settings.twinkleIntensity}
            rotationSpeed={settings.rotationSpeed}
            speed={settings.speed}
            mouseInteraction={settings.mouseInteraction}
            mouseRepulsion={settings.mouseRepulsion}
            saturation={0.2}
            hueShift={360}
            repulsionStrength={2}
            autoCenterRepulsion={0}
            starSpeed={0.4}
            transparent={false}
        />
    );
}
