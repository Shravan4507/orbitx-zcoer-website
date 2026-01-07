/**
 * Performance Detection Hook
 * Silently detects device capability and returns appropriate performance tier.
 * All detection happens in the background - user sees nothing.
 */

export type PerformanceTier = 'high' | 'medium' | 'low';

interface PerformanceMetrics {
    tier: PerformanceTier;
    cpuCores: number;
    deviceMemory: number | null;
    isMobile: boolean;
    isLowEndGPU: boolean;
}

// Cached result to avoid re-detection
let cachedMetrics: PerformanceMetrics | null = null;

/**
 * Detect if device has a low-end GPU based on WebGL renderer string
 */
function detectLowEndGPU(): boolean {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return true; // No WebGL = definitely low-end

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return false;

        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

        // Known low-end GPU indicators
        const lowEndIndicators = [
            'intel hd graphics',
            'intel uhd graphics',
            'intel(r) hd graphics',
            'intel(r) uhd graphics',
            'mali-4',
            'mali-t',
            'adreno 3',
            'adreno 4',
            'adreno 5',
            'powervr',
            'videocore',
            'swiftshader', // Software rendering
            'llvmpipe',    // Software rendering
            'mesa',
            'microsoft basic render'
        ];

        return lowEndIndicators.some(indicator => renderer.includes(indicator));
    } catch {
        return false;
    }
}

/**
 * Detect if device is mobile
 */
function detectMobile(): boolean {
    // Check user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

    // Check touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Check screen size
    const isSmallScreen = window.innerWidth <= 768;

    return isMobileUA || (hasTouch && isSmallScreen);
}

/**
 * Get device memory in GB (if available)
 */
function getDeviceMemory(): number | null {
    // @ts-ignore - deviceMemory is not in all TypeScript definitions
    return navigator.deviceMemory || null;
}

/**
 * Get CPU core count
 */
function getCPUCores(): number {
    return navigator.hardwareConcurrency || 4;
}

/**
 * Calculate performance tier based on all metrics
 */
function calculateTier(
    cpuCores: number,
    deviceMemory: number | null,
    isMobile: boolean,
    isLowEndGPU: boolean
): PerformanceTier {
    let score = 0;

    // CPU scoring (0-3 points)
    if (cpuCores >= 8) score += 3;
    else if (cpuCores >= 4) score += 2;
    else if (cpuCores >= 2) score += 1;

    // Memory scoring (0-3 points)
    if (deviceMemory !== null) {
        if (deviceMemory >= 8) score += 3;
        else if (deviceMemory >= 4) score += 2;
        else if (deviceMemory >= 2) score += 1;
    } else {
        // Unknown memory, assume medium
        score += 2;
    }

    // GPU penalty
    if (isLowEndGPU) score -= 2;

    // Mobile penalty (mobile GPUs are generally weaker)
    if (isMobile) score -= 1;

    // Determine tier
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
}

/**
 * Detect device performance metrics
 * Results are cached after first detection
 */
export function detectPerformance(): PerformanceMetrics {
    if (cachedMetrics) return cachedMetrics;

    const cpuCores = getCPUCores();
    const deviceMemory = getDeviceMemory();
    const isMobile = detectMobile();
    const isLowEndGPU = detectLowEndGPU();
    const tier = calculateTier(cpuCores, deviceMemory, isMobile, isLowEndGPU);

    cachedMetrics = {
        tier,
        cpuCores,
        deviceMemory,
        isMobile,
        isLowEndGPU
    };

    // Silent console log for debugging (only in development)
    if (import.meta.env.DEV) {
        console.log('[Performance] Device tier:', tier, {
            cpuCores,
            deviceMemory: deviceMemory ? `${deviceMemory}GB` : 'unknown',
            isMobile,
            isLowEndGPU
        });
    }

    return cachedMetrics;
}

/**
 * Get performance tier only
 */
export function getPerformanceTier(): PerformanceTier {
    return detectPerformance().tier;
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
    return detectPerformance().tier === 'low';
}

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
    return detectPerformance().isMobile;
}
