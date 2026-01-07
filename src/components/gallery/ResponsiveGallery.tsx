/**
 * ResponsiveGallery - Shows DomeGallery on desktop, MobileGallery on mobile
 */

import { useState, useEffect } from 'react';
import DomeGallery from './DomeGallery';
import MobileGallery from './MobileGallery';

interface ResponsiveGalleryProps {
    // DomeGallery props
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    grayscale?: boolean;
    maxVerticalRotationDeg?: number;
    overlayBlurColor?: string;
    imageBorderRadius?: string;
    openedImageBorderRadius?: string;
    fit?: number;
    minRadius?: number;
    // Common props
    searchQuery?: string;
    teamFilter?: string;
    // Mobile-specific
    maxItems?: number;
}

export default function ResponsiveGallery({
    autoRotate = false,
    autoRotateSpeed = 0.15,
    grayscale = true,
    maxVerticalRotationDeg = 5,
    overlayBlurColor = '#060010',
    imageBorderRadius = '30px',
    openedImageBorderRadius = '30px',
    fit = 0.5,
    minRadius = 600,
    searchQuery = '',
    teamFilter = '',
    maxItems
}: ResponsiveGalleryProps) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (isMobile) {
        return (
            <MobileGallery
                searchQuery={searchQuery}
                teamFilter={teamFilter}
                maxItems={maxItems}
            />
        );
    }

    return (
        <DomeGallery
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            grayscale={grayscale}
            maxVerticalRotationDeg={maxVerticalRotationDeg}
            overlayBlurColor={overlayBlurColor}
            imageBorderRadius={imageBorderRadius}
            openedImageBorderRadius={openedImageBorderRadius}
            fit={fit}
            minRadius={minRadius}
            searchQuery={searchQuery}
            teamFilter={teamFilter}
        />
    );
}
