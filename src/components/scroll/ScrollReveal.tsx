import { useEffect, useRef, useState, type ReactNode } from 'react';
import './ScrollReveal.css';

type ScrollRevealProps = {
    children: ReactNode;
    direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
    delay?: number;
    duration?: number;
    threshold?: number;
    className?: string;
};

export default function ScrollReveal({
    children,
    direction = 'up',
    delay = 0,
    duration = 0.6,
    threshold = 0.1,
    className = ''
}: ScrollRevealProps) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [threshold]);

    const style = {
        '--reveal-delay': `${delay}s`,
        '--reveal-duration': `${duration}s`
    } as React.CSSProperties;

    return (
        <div
            ref={ref}
            className={`scroll-reveal scroll-reveal--${direction} ${isVisible ? 'scroll-reveal--visible' : ''} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
