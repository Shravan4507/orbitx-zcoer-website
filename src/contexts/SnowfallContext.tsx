import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import Snowfall from 'react-snowfall';

// Storage key for holiday session
const SNOW_HOLIDAY_SHOWN_KEY = 'orbitx-snow-holiday-shown';

// Check if current date is in holiday season (Dec 20 - Jan 5)
function isHolidaySeason(): boolean {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();

    // December 20-31 OR January 1-5
    return (month === 11 && day >= 20) || (month === 0 && day <= 5);
}

// Context types
interface SnowfallContextType {
    isSnowing: boolean;
    toggleSnow: () => void;
    triggerSnow: () => void;
}

const SnowfallContext = createContext<SnowfallContextType | null>(null);

// Custom hook to use snowfall
export function useSnowfall() {
    const context = useContext(SnowfallContext);
    if (!context) {
        throw new Error('useSnowfall must be used within a SnowfallProvider');
    }
    return context;
}

// Provider component
interface SnowfallProviderProps {
    children: ReactNode;
}

export function SnowfallProvider({ children }: SnowfallProviderProps) {
    const [isSnowing, setIsSnowing] = useState(false);

    // Holiday season auto-trigger (only shows for ~10 seconds on first visit per session)
    useEffect(() => {
        if (isHolidaySeason()) {
            const alreadyShown = sessionStorage.getItem(SNOW_HOLIDAY_SHOWN_KEY);

            if (!alreadyShown) {
                // Show snow for the holiday season
                setIsSnowing(true);
                sessionStorage.setItem(SNOW_HOLIDAY_SHOWN_KEY, 'true');

                // Auto-stop after 10 seconds
                setTimeout(() => {
                    setIsSnowing(false);
                }, 10000);
            }
        }
    }, []);

    // Shake detection for mobile
    useEffect(() => {
        let lastX = 0, lastY = 0, lastZ = 0;
        let shakeThreshold = 15;
        let shakeCount = 0;
        let lastShakeTime = 0;

        const handleMotion = (event: DeviceMotionEvent) => {
            const acceleration = event.accelerationIncludingGravity;
            if (!acceleration) return;

            const x = acceleration.x || 0;
            const y = acceleration.y || 0;
            const z = acceleration.z || 0;

            const deltaX = Math.abs(x - lastX);
            const deltaY = Math.abs(y - lastY);
            const deltaZ = Math.abs(z - lastZ);

            const now = Date.now();

            if ((deltaX > shakeThreshold || deltaY > shakeThreshold || deltaZ > shakeThreshold)) {
                if (now - lastShakeTime > 100) { // Debounce
                    shakeCount++;
                    lastShakeTime = now;

                    // Require 3 shakes within 2 seconds
                    if (shakeCount >= 3) {
                        setIsSnowing(true);
                        shakeCount = 0;
                    }
                }
            }

            // Reset shake count if too much time has passed
            if (now - lastShakeTime > 2000) {
                shakeCount = 0;
            }

            lastX = x;
            lastY = y;
            lastZ = z;
        };

        // Only add listener if DeviceMotionEvent is supported
        if (typeof DeviceMotionEvent !== 'undefined') {
            window.addEventListener('devicemotion', handleMotion);
        }

        return () => {
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, []);

    const toggleSnow = useCallback(() => {
        setIsSnowing(prev => !prev);
    }, []);

    const triggerSnow = useCallback(() => {
        setIsSnowing(true);
    }, []);

    return (
        <SnowfallContext.Provider value={{ isSnowing, toggleSnow, triggerSnow }}>
            {children}
            {isSnowing && (
                <Snowfall
                    snowflakeCount={150}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        pointerEvents: 'none'
                    }}
                />
            )}
        </SnowfallContext.Provider>
    );
}
