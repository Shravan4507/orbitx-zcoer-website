import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRecruitment } from '../../contexts/RecruitmentContext';
import './MobileHeader.css';

// Menu items for the hamburger menu
const MENU_ITEMS = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'about', label: 'About', path: '/about' },
    { id: 'events', label: 'Events', path: '/events' },
    { id: 'members', label: 'Members', path: '/members' },
    { id: 'join', label: 'Join OrbitX', path: '/join', requiresRecruitment: true, fallbackPath: '/contact', fallbackLabel: 'Contact Us' },
    { id: 'merch', label: 'Merchandise', path: '/merch' },
];

export default function MobileHeader() {
    const location = useLocation();
    const { isAuthenticated, logout } = useAuth();
    const { isRecruitmentOpen } = useRecruitment();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMenuOpen]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleLogout = async () => {
        await logout();
        setIsMenuOpen(false);
    };

    // Don't render on desktop
    if (!isMobile) return null;

    return (
        <>
            {/* Floating Hamburger Button */}
            <button
                className={`mobile-hamburger ${isMenuOpen ? 'mobile-hamburger--open' : ''}`}
                onClick={toggleMenu}
                aria-label="Toggle menu"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Fullscreen Menu Overlay */}
            <div className={`mobile-menu ${isMenuOpen ? 'mobile-menu--open' : ''}`}>
                <div className="mobile-menu__content">
                    <nav className="mobile-menu__nav">
                        {MENU_ITEMS.map((item) => {
                            // Handle recruitment-dependent items
                            const path = item.requiresRecruitment && !isRecruitmentOpen
                                ? item.fallbackPath || item.path
                                : item.path;
                            const label = item.requiresRecruitment && !isRecruitmentOpen
                                ? item.fallbackLabel || item.label
                                : item.label;

                            const isActive = location.pathname === path;

                            return (
                                <Link
                                    key={item.id}
                                    to={path}
                                    className={`mobile-menu__link ${isActive ? 'mobile-menu__link--active' : ''}`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Auth Section */}
                    <div className="mobile-menu__auth">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/user-dashboard"
                                    className="mobile-menu__auth-btn mobile-menu__auth-btn--primary"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <button
                                    className="mobile-menu__auth-btn mobile-menu__auth-btn--secondary"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="mobile-menu__auth-btn mobile-menu__auth-btn--primary"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Login / Sign Up
                            </Link>
                        )}
                    </div>

                    {/* Social Links */}
                    <div className="mobile-menu__social">
                        <a href="https://www.instagram.com/orbitx_zcoer/" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </a>
                        <a href="https://www.linkedin.com/company/orbitx-zcoer/" target="_blank" rel="noopener noreferrer">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                        </a>
                        <a href="mailto:contact@orbitxzcoer.club">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
