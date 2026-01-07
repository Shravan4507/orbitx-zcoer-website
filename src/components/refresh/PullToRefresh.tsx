import { useState, useRef, useCallback, type ReactNode } from 'react';
import './PullToRefresh.css';

type PullToRefreshProps = {
    children: ReactNode;
    onRefresh: () => Promise<void>;
    threshold?: number;
};

export default function PullToRefresh({
    children,
    onRefresh,
    threshold = 80
}: PullToRefreshProps) {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const startY = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0) {
            startY.current = e.touches[0].clientY;
            setIsPulling(true);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling || isRefreshing) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - startY.current;

        if (diff > 0 && containerRef.current?.scrollTop === 0) {
            setPullDistance(Math.min(diff * 0.5, threshold * 1.5));
        }
    }, [isPulling, isRefreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling) return;

        setIsPulling(false);

        if (pullDistance >= threshold && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(threshold * 0.75);

            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

    const progress = Math.min(pullDistance / threshold, 1);

    return (
        <div
            ref={containerRef}
            className="pull-to-refresh"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className={`pull-to-refresh__indicator ${isRefreshing ? 'pull-to-refresh__indicator--refreshing' : ''}`}
                style={{
                    opacity: progress,
                    transform: `translateY(${pullDistance - 40}px) rotate(${progress * 180}deg)`
                }}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
            </div>
            <div
                className="pull-to-refresh__content"
                style={{ transform: `translateY(${pullDistance}px)` }}
            >
                {children}
            </div>
        </div>
    );
}
