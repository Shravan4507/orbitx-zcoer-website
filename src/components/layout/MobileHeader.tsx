import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRecruitment } from '../../contexts/RecruitmentContext';
import StaggeredMenu from '../menu/StaggeredMenu';
import type { StaggeredMenuItem, StaggeredMenuSocialItem } from '../menu/StaggeredMenu';
import logo from '../../assets/logo/Logo_name.png';
import zcoerLogo from '../../assets/logo/ZCOER-Logo-White.png';

export default function MobileHeader() {
    const { isAuthenticated } = useAuth();
    const { isRecruitmentOpen } = useRecruitment();
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

    // Don't render on desktop
    if (!isMobile) return null;

    // Prepare Menu Items based on context
    const menuItems: StaggeredMenuItem[] = [
        { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
        { label: 'About', ariaLabel: 'Learn about us', link: '/about' },
        { label: 'Events', ariaLabel: 'View our events', link: '/events' },
        { label: 'Members', ariaLabel: 'Our team members', link: '/members' },
        {
            label: isRecruitmentOpen ? 'Join OrbitX' : 'Contact Us',
            ariaLabel: isRecruitmentOpen ? 'Join our team' : 'Get in touch',
            link: isRecruitmentOpen ? '/join' : '/contact'
        },
        { label: 'Merchandise', ariaLabel: 'Shop OrbitX gear', link: '/merch' },
    ];

    // Add Auth items
    if (isAuthenticated) {
        menuItems.push({ label: 'Dashboard', ariaLabel: 'Your dashboard', link: '/user-dashboard' });
        // Handling logout as a link is tricky with StaggeredMenu as it uses <Link>, 
        // but it will just navigate and we can handle it. 
        // Actually, let's keep it simple for now or modify StaggeredMenu to accept onClick.
    } else {
        menuItems.push({ label: 'Login', ariaLabel: 'Login to your account', link: '/login' });
    }

    const socialItems: StaggeredMenuSocialItem[] = [
        { label: 'Instagram', link: 'https://www.instagram.com/orbitx_zcoer/' },
        { label: 'LinkedIn', link: 'https://www.linkedin.com/company/orbitx-zcoer/' },
        { label: 'Mail', link: 'mailto:contact@orbitxzcoer.club' }
    ];

    return (
        <StaggeredMenu
            items={menuItems}
            socialItems={socialItems}
            displaySocials
            displayItemNumbering={true}
            logoUrl={logo}
            secondaryLogoUrl={zcoerLogo}
            colors={['#a855f7', '#0ea5e9']}
            accentColor="#a855f7"
            isFixed={true}
            onMenuOpen={() => {
                document.body.style.overflow = 'hidden';
            }}
            onMenuClose={() => {
                document.body.style.overflow = '';
            }}
        />
    );
}
