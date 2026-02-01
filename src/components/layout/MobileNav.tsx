import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRecruitment } from '../../contexts/RecruitmentContext';
import './MobileNav.css';

// Navigation items with their icons (SVG paths)
const NAV_ITEMS = [
    {
        id: 'home',
        label: 'Home',
        path: '/',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
        )
    },
    {
        id: 'about',
        label: 'About',
        path: '/about',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        )
    },
    {
        id: 'events',
        label: 'Events',
        path: '/events',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
        )
    },
    {
        id: 'members',
        label: 'Members',
        path: '/members',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        )
    },
    {
        id: 'join',
        label: 'Join',
        path: '/join',
        requiresRecruitment: true,
        fallbackPath: '/contact',
        fallbackLabel: 'Contact',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
        ),
        fallbackIcon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
        )
    },
    {
        id: 'merch',
        label: 'Merch',
        path: '/merch',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
        )
    },
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/user-dashboard',
        requiresAuth: true,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
        )
    }
];

// Auto-hide delay in ms
const AUTO_HIDE_DELAY = 3000;
// Scroll threshold in pixels to trigger hide/show
const SCROLL_THRESHOLD = 10;

export default function MobileNav() {
    const location = useLocation();
    const { user } = useAuth();
    const { isRecruitmentOpen } = useRecruitment();
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [isInteracting, setIsInteracting] = useState(false);

    const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastScrollY = useRef(0);
    const navRef = useRef<HTMLElement>(null);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Reset auto-hide timer
    const resetAutoHideTimer = useCallback(() => {
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
        }

        // Only start auto-hide if nav is visible and not being interacted with
        if (isVisible && !isInteracting) {
            autoHideTimerRef.current = setTimeout(() => {
                setIsVisible(false);
            }, AUTO_HIDE_DELAY);
        }
    }, [isVisible, isInteracting]);

    // Handle scroll behavior
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            // Don't hide if user is interacting with the navbar
            if (isInteracting) return;

            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY.current;

            // Scrolling down (page going up) - hide navbar
            if (scrollDelta > SCROLL_THRESHOLD) {
                setIsVisible(false);
            }
            // Scrolling up (page going down) - show navbar
            else if (scrollDelta < -SCROLL_THRESHOLD) {
                setIsVisible(true);
                resetAutoHideTimer();
            }

            lastScrollY.current = currentScrollY;
        };

        // Throttle scroll handler
        let ticking = false;
        const throttledScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', throttledScroll, { passive: true });
        return () => window.removeEventListener('scroll', throttledScroll);
    }, [isMobile, isInteracting, resetAutoHideTimer]);

    // Handle focus/blur (tab visibility)
    useEffect(() => {
        if (!isMobile) return;

        const handleVisibilityChange = () => {
            if (document.hidden && !isInteracting) {
                // Tab lost focus - hide navbar (only if not interacting)
                setIsVisible(false);
            } else if (!document.hidden) {
                // Tab gained focus - show navbar briefly
                setIsVisible(true);
                resetAutoHideTimer();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isMobile, isInteracting, resetAutoHideTimer]);

    // Start auto-hide timer on mount
    useEffect(() => {
        if (isMobile) {
            resetAutoHideTimer();
        }

        return () => {
            if (autoHideTimerRef.current) {
                clearTimeout(autoHideTimerRef.current);
            }
        };
    }, [isMobile, resetAutoHideTimer]);

    // Touch anywhere on screen shows navbar
    useEffect(() => {
        if (!isMobile) return;

        const handleTouch = () => {
            if (!isVisible) {
                setIsVisible(true);
            }
            resetAutoHideTimer();
        };

        window.addEventListener('touchstart', handleTouch, { passive: true });
        return () => window.removeEventListener('touchstart', handleTouch);
    }, [isMobile, isVisible, resetAutoHideTimer]);

    // Handle nav interaction (pause auto-hide while touching nav)
    const handleNavTouchStart = () => {
        setIsInteracting(true);
        if (autoHideTimerRef.current) {
            clearTimeout(autoHideTimerRef.current);
        }
    };

    const handleNavTouchEnd = () => {
        setIsInteracting(false);
        resetAutoHideTimer();
    };

    // Handle long press for tooltip
    const handleTouchStart = (id: string) => {
        handleNavTouchStart();
        touchTimerRef.current = setTimeout(() => {
            setActiveTooltip(id);
        }, 500); // Show tooltip after 500ms hold
    };

    const handleTouchEnd = () => {
        handleNavTouchEnd();
        if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
        }
        // Hide tooltip after a short delay
        setTimeout(() => setActiveTooltip(null), 1500);
    };

    // Don't render on desktop
    if (!isMobile) return null;

    // Filter items based on auth state
    const visibleItems = NAV_ITEMS.filter(item => {
        if (item.requiresAuth && !user) return false;
        return true;
    });

    return (
        <nav
            ref={navRef}
            className={`mobile-nav ${isVisible ? 'mobile-nav--visible' : 'mobile-nav--hidden'}`}
            onTouchStart={handleNavTouchStart}
            onTouchEnd={handleNavTouchEnd}
        >
            <div className="mobile-nav__container">
                {visibleItems.map((item) => {
                    // Handle recruitment-dependent items
                    const path = item.requiresRecruitment && !isRecruitmentOpen
                        ? item.fallbackPath || item.path
                        : item.path;
                    const label = item.requiresRecruitment && !isRecruitmentOpen
                        ? item.fallbackLabel || item.label
                        : item.label;
                    const icon = item.requiresRecruitment && !isRecruitmentOpen && item.fallbackIcon
                        ? item.fallbackIcon
                        : item.icon;

                    const isActive = location.pathname === path ||
                        (path === '/' && location.pathname === '/');

                    return (
                        <Link
                            key={item.id}
                            to={path}
                            className={`mobile-nav__item ${isActive ? 'mobile-nav__item--active' : ''}`}
                            onTouchStart={() => handleTouchStart(item.id)}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                        >
                            <span className="mobile-nav__icon">
                                {icon}
                            </span>
                            {activeTooltip === item.id && (
                                <span className="mobile-nav__tooltip">
                                    {label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
