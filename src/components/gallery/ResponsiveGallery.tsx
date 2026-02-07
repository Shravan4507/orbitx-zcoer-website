/**
 * ResponsiveGallery - Shows DomeGallery on desktop, MobileGallery on mobile
 * 
 * This is the SINGLE SOURCE OF TRUTH for member data.
 * Fetches member data from Firestore via useMembersData hook.
 * Both DomeGallery and MobileGallery receive data from here.
 */

import { useState, useEffect, useMemo } from 'react';
import DomeGallery from './DomeGallery';
import MobileGallery from './MobileGallery';
import { useMembersData, type MemberData } from '../../hooks/useMembersData';

// Transform MemberData to ImageItem format for DomeGallery
const transformMembersToImages = (members: MemberData[]) => {
    return members
        .filter(m => m.firstName && m.lastName)
        .map(member => {
            // Image URL comes directly from Firestore (Firebase Storage URL)
            // No need to transform - it's already a full URL
            const imageSrc = member.image || '';

            return {
                src: imageSrc,
                alt: `${member.firstName} ${member.lastName}`,
                name: `${member.firstName} ${member.lastName}`,
                role: member.position,
                team: member.team,
                bio: '',
                academics: member.academics,
                socialLinks: member.socialLinks,
                dateOfBirth: member.dateOfBirth
            };
        });
};

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
    showExploreMore?: boolean;
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
    maxItems,
    showExploreMore = false
}: ResponsiveGalleryProps) {
    const [isMobile, setIsMobile] = useState(false);

    // Fetch member data from Firestore (single source of truth)
    const { members, isLoading } = useMembersData();

    // Transform members to images for DomeGallery
    const images = useMemo(() => transformMembersToImages(members), [members]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Show loading state
    if (isLoading && members.length === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                color: 'rgba(255,255,255,0.5)'
            }}>
                Loading members...
            </div>
        );
    }

    if (isMobile) {
        return (
            <MobileGallery
                members={members}
                searchQuery={searchQuery}
                teamFilter={teamFilter}
                maxItems={maxItems}
                showExploreMore={showExploreMore}
            />
        );
    }

    return (
        <DomeGallery
            images={images}
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
