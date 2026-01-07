import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Automatically scrolls to the top of the page on route changes.
 * Also handles browser refresh to start from top.
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll to top on route change
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
        });
    }, [pathname]);

    // Also handle page refresh - scroll to top immediately
    useEffect(() => {
        if ('scrollRestoration' in history) {
            // Prevent browser from restoring scroll position
            history.scrollRestoration = 'manual';
        }

        // Scroll to top on initial mount (handles refresh)
        window.scrollTo(0, 0);

        return () => {
            // Restore default behavior when component unmounts
            if ('scrollRestoration' in history) {
                history.scrollRestoration = 'auto';
            }
        };
    }, []);

    return null;
}
